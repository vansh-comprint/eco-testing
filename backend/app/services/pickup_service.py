"""Service layer for Pickup business logic"""

import uuid
from datetime import datetime, timezone
from typing import Optional, List, Tuple
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import PickupRequest, PickupStatus, AssetStatus, User, UserRole
from app.models.asset import Asset

logger = logging.getLogger(__name__)
from app.models.batch import BatchStatus
from app.repositories.batch_repository import BatchRepository
from app.repositories.branch_repository import BranchRepository
from app.repositories.pickup_repository import PickupRepository, PickupLocationRepository
from app.repositories.asset_repository import AssetRepository
from app.schemas.pickup import (
    PickupRequestCreate,
    PickupRequestUpdate,
    PickupAssignToLogisticsAdmin,
    PickupAssignToLogisticsUser,
    PickupComplete,
    PickupFail,
    PickupPartial,
    PickupReschedule,
)
from app.services.audit_service import AuditService


class PickupService:
    """Service for handling pickup request business logic"""

    # Asset statuses eligible for pickup
    PICKUPABLE_STATUSES = {"conditionally_accepted", "ready_for_pickup"}

    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = PickupRepository(session)
        self.asset_repo = AssetRepository(session)
        self.batch_repo = BatchRepository(session)
        self.branch_repo = BranchRepository(session)
        self.location_repo = PickupLocationRepository(session)

    async def create_pickup(self, data: PickupRequestCreate, user: User) -> PickupRequest:
        """Create a pickup request — batch is mandatory and must be approved"""
        # Auto-fill enterprise_id for scoped users
        enterprise_id = data.enterprise_id
        if user.role in [UserRole.ORG_ADMIN.value, UserRole.IT_ADMIN.value]:
            enterprise_id = user.enterprise_id

        if not enterprise_id:
            raise ValueError("Enterprise ID is required")

        # --- Branch → Pickup Location resolution ---
        branch = await self.branch_repo.get_by_id(data.branch_id)
        if not branch:
            raise ValueError(f"Branch '{data.branch_id}' not found")
        location = await self.location_repo.get_or_create_from_branch(branch)

        # --- Batch validation ---
        batch = await self.batch_repo.get_by_id(data.batch_id)
        if not batch:
            raise ValueError(f"Batch '{data.batch_id}' not found")

        if batch.status != BatchStatus.APPROVED.value:
            raise ValueError(
                f"Batch must be approved before pickup. Current status: '{batch.status}'"
            )

        # --- Asset validation ---
        assets_summary = []
        errors = []
        for asset_id in data.asset_ids:
            asset = await self.asset_repo.get_by_id(asset_id)
            if not asset:
                errors.append(f"Asset '{asset_id}' not found")
                continue
            if asset.batch_id != data.batch_id:
                errors.append(
                    f"Asset '{asset_id}' does not belong to batch '{data.batch_id}'"
                )
                continue
            if asset.status not in self.PICKUPABLE_STATUSES:
                errors.append(
                    f"Asset '{asset_id}' is not eligible for pickup (status: '{asset.status}')"
                )
                continue
            assets_summary.append(
                {
                    "id": asset.id,
                    "serial_number": asset.serial_number,
                    "brand": asset.brand,
                    "model": asset.model,
                    "status": asset.status,
                }
            )

        if errors:
            raise ValueError("; ".join(errors))

        pickup = PickupRequest(
            id=f"pr-{uuid.uuid4()}",
            enterprise_id=enterprise_id,
            location_id=location.id,
            batch_id=data.batch_id,
            asset_ids=data.asset_ids,
            assets=assets_summary,
            preferred_date=data.preferred_date,
            preferred_time_slot=data.preferred_time_slot,
            special_instructions=data.special_instructions,
            status=PickupStatus.PENDING.value,
        )

        await self.repo.create(pickup)

        # Update asset statuses to pickup_requested
        for asset_id in data.asset_ids:
            asset = await self.asset_repo.get_by_id(asset_id)
            if asset:
                asset.status = AssetStatus.PICKUP_REQUESTED.value

        # Auto-advance batch to pickup_in_progress if still approved
        if batch.status == BatchStatus.APPROVED.value:
            batch.status = BatchStatus.PICKUP_IN_PROGRESS.value
            await self.session.flush()
        else:
            await self.session.flush()

        return pickup

    async def get_pickup(self, pickup_id: str) -> Optional[PickupRequest]:
        """Get a pickup request by ID"""
        return await self.repo.get_by_id(pickup_id)

    async def update_pickup(
        self, pickup_id: str, data: PickupRequestUpdate, user: User
    ) -> Optional[PickupRequest]:
        """Update a pickup request"""
        pickup = await self.repo.get_by_id(pickup_id)
        if not pickup:
            return None

        # Only pending pickups can be updated by IT Admin
        if user.role == UserRole.IT_ADMIN.value:
            if pickup.status != PickupStatus.PENDING.value:
                raise ValueError("Can only update pending pickup requests")

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if value is not None:
                setattr(pickup, key, value)

        await self.session.flush()
        return pickup

    async def assign_to_logistics_admin(
        self, pickup_id: str, data: PickupAssignToLogisticsAdmin, user: User
    ) -> PickupRequest:
        """Assign pickup to logistics admin (OPS Admin action) with audit logging"""
        if user.role not in [UserRole.SUPER_ADMIN.value, UserRole.OPS_ADMIN.value]:
            raise ValueError("Only OPS Admin can assign to logistics admin")

        pickup = await self.repo.get_by_id(pickup_id)
        if not pickup:
            raise ValueError("Pickup request not found")

        # Allow assign for pending pickups, and reassign for already-assigned pickups
        assignable_statuses = {
            PickupStatus.PENDING.value,
            PickupStatus.ASSIGNED_TO_LOGISTICS_ADMIN.value,
        }
        if pickup.status not in assignable_statuses:
            raise ValueError("Can only assign pending or reassign logistics-admin-assigned pickup requests")

        old_status = pickup.status
        is_reassign = pickup.status == PickupStatus.ASSIGNED_TO_LOGISTICS_ADMIN.value
        old_admin_id = pickup.logistics_admin_id if is_reassign else None

        pickup.logistics_admin_id = data.logistics_admin_id
        pickup.status = PickupStatus.ASSIGNED_TO_LOGISTICS_ADMIN.value
        pickup.assigned_at = datetime.now(timezone.utc)
        pickup.assigned_by_id = user.id

        await self.session.flush()

        # Log to audit trail
        audit = AuditService(self.session)
        detail_msg = (
            f"Reassigned from logistics admin {old_admin_id} to {data.logistics_admin_id}"
            if is_reassign
            else f"Assigned to logistics admin {data.logistics_admin_id}"
        )
        await audit.log_status_change(
            entity_type="pickup_request",
            entity_id=pickup_id,
            old_status=old_status,
            new_status=pickup.status,
            user_id=user.id,
            enterprise_id=pickup.enterprise_id,
            details=detail_msg,
            metadata={"logistics_admin_id": data.logistics_admin_id, "reassigned": is_reassign}
        )

        return pickup

    async def assign_to_logistics_user(
        self, pickup_id: str, data: PickupAssignToLogisticsUser, user: User
    ) -> PickupRequest:
        """Assign pickup to logistics user (Logistics Admin action) with audit logging"""
        if user.role not in [
            UserRole.SUPER_ADMIN.value,
            UserRole.OPS_ADMIN.value,
            UserRole.LOGISTICS_ADMIN.value,
        ]:
            raise ValueError("Only Logistics Admin can assign to logistics user")

        pickup = await self.repo.get_by_id(pickup_id)
        if not pickup:
            raise ValueError("Pickup request not found")

        # Logistics admin can only assign their own pickups
        if user.role == UserRole.LOGISTICS_ADMIN.value:
            if pickup.logistics_admin_id != user.id:
                raise ValueError("Can only assign pickups assigned to you")

        # Allow first-time assignment (from logistics admin) and reassignment (from logistics user/scheduled)
        allowed_statuses = [
            PickupStatus.ASSIGNED_TO_LOGISTICS_ADMIN.value,
            PickupStatus.ASSIGNED_TO_LOGISTICS_USER.value,
            PickupStatus.SCHEDULED.value,
        ]
        if pickup.status not in allowed_statuses:
            raise ValueError("Pickup must be assigned to logistics admin first")

        # Verify the logistics user exists and belongs to this logistics admin
        from app.repositories.user_repository import UserRepository
        user_repo = UserRepository(self.session)
        target_user = await user_repo.get_by_id(data.logistics_user_id)
        if not target_user:
            raise ValueError("Logistics user not found")
        if target_user.role != UserRole.LOGISTICS_USER.value:
            raise ValueError("Target user is not a logistics user")
        if user.role == UserRole.LOGISTICS_ADMIN.value:
            if target_user.parent_user_id != user.id:
                raise ValueError("This logistics user does not belong to you")

        old_status = pickup.status
        is_reassign = pickup.status in (
            PickupStatus.ASSIGNED_TO_LOGISTICS_USER.value,
            PickupStatus.SCHEDULED.value,
        )
        old_logistics_user_id = pickup.logistics_user_id if is_reassign else None

        pickup.logistics_user_id = data.logistics_user_id
        pickup.status = PickupStatus.ASSIGNED_TO_LOGISTICS_USER.value
        if data.scheduled_date:
            pickup.scheduled_date = data.scheduled_date
            pickup.status = PickupStatus.SCHEDULED.value

        await self.session.flush()

        # Log to audit trail
        audit = AuditService(self.session)
        detail_msg = (
            f"Reassigned from logistics user {old_logistics_user_id} to {data.logistics_user_id}"
            if is_reassign
            else f"Assigned to logistics user {data.logistics_user_id}"
        )
        await audit.log_status_change(
            entity_type="pickup_request",
            entity_id=pickup_id,
            old_status=old_status,
            new_status=pickup.status,
            user_id=user.id,
            enterprise_id=pickup.enterprise_id,
            details=detail_msg,
            metadata={
                "logistics_user_id": data.logistics_user_id,
                "old_logistics_user_id": old_logistics_user_id,
                "reassigned": is_reassign,
                "scheduled_date": str(data.scheduled_date) if data.scheduled_date else None
            }
        )

        return pickup

    async def start_pickup(self, pickup_id: str, user: User) -> PickupRequest:
        """Start a pickup (Logistics User action) with audit logging"""
        pickup = await self.repo.get_by_id(pickup_id)
        if not pickup:
            raise ValueError("Pickup request not found")

        if user.role == UserRole.LOGISTICS_USER.value:
            if pickup.logistics_user_id != user.id:
                raise ValueError("This pickup is not assigned to you")

        valid_statuses = [
            PickupStatus.ASSIGNED_TO_LOGISTICS_USER.value,
            PickupStatus.SCHEDULED.value,
        ]
        if pickup.status not in valid_statuses:
            raise ValueError("Pickup must be assigned or scheduled to start")

        old_status = pickup.status
        pickup.status = PickupStatus.IN_PROGRESS.value
        pickup.started_at = datetime.now(timezone.utc)
        await self.session.flush()

        # Log to audit trail
        audit = AuditService(self.session)
        await audit.log_status_change(
            entity_type="pickup_request",
            entity_id=pickup_id,
            old_status=old_status,
            new_status=pickup.status,
            user_id=user.id,
            enterprise_id=pickup.enterprise_id,
            details="Pickup started by logistics user"
        )

        return pickup

    async def complete_pickup(
        self, pickup_id: str, data: PickupComplete, user: User
    ) -> PickupRequest:
        """Complete a pickup (Logistics User action) with audit logging"""
        pickup = await self.repo.get_by_id(pickup_id)
        if not pickup:
            raise ValueError("Pickup request not found")

        if user.role == UserRole.LOGISTICS_USER.value:
            if pickup.logistics_user_id != user.id:
                raise ValueError("This pickup is not assigned to you")

        if pickup.status != PickupStatus.IN_PROGRESS.value:
            raise ValueError("Pickup must be in progress to complete")

        old_status = pickup.status
        pickup.status = PickupStatus.COMPLETED.value
        pickup.completed_at = datetime.now(timezone.utc)
        pickup.proof_of_pickup = data.proof_of_pickup
        if data.logistics_notes:
            pickup.logistics_notes = data.logistics_notes

        # Update asset statuses to in_transit (picked up and heading to QC facility)
        for asset_id in pickup.asset_ids:
            asset = await self.asset_repo.get_by_id(asset_id)
            if asset:
                asset.status = AssetStatus.IN_TRANSIT.value

        await self.session.flush()

        # Log to audit trail
        audit = AuditService(self.session)
        await audit.log_status_change(
            entity_type="pickup_request",
            entity_id=pickup_id,
            old_status=old_status,
            new_status=pickup.status,
            user_id=user.id,
            enterprise_id=pickup.enterprise_id,
            details="Pickup completed",
            metadata={
                "asset_count": len(pickup.asset_ids),
                "has_proof": bool(data.proof_of_pickup)
            }
        )

        return pickup

    # Asset statuses that should be reverted when a pickup is cancelled.
    # Only revert assets that haven't been physically collected yet.
    PICKUP_REVERTABLE_ASSET_STATUSES = {
        AssetStatus.PICKUP_REQUESTED.value,
        AssetStatus.PICKUP_SCHEDULED.value,
    }

    async def cancel_pickup(self, pickup_id: str, reason: str, user: User) -> PickupRequest:
        """
        Cancel a pickup request with asset reversion and audit logging.

        Reverts assets in pre-collection statuses (pickup_requested, pickup_scheduled)
        back to conditionally_accepted. Assets already picked_up or in_transit are NOT
        reverted — those require manual handling since they're physically in possession.
        """
        pickup = await self.repo.get_by_id(pickup_id)
        if not pickup:
            raise ValueError("Pickup request not found")

        # Reject if already in a terminal state
        if pickup.status in (PickupStatus.CANCELLED.value, PickupStatus.COMPLETED.value):
            raise ValueError(
                f"Cannot cancel pickup: already in terminal state '{pickup.status}'"
            )

        # Check permissions
        if user.role == UserRole.IT_ADMIN.value:
            if pickup.status != PickupStatus.PENDING.value:
                raise ValueError("Can only cancel pending pickup requests")
        elif user.role == UserRole.LOGISTICS_USER.value:
            if pickup.logistics_user_id != user.id:
                raise ValueError("This pickup is not assigned to you")

        old_status = pickup.status
        pickup.status = PickupStatus.CANCELLED.value
        pickup.logistics_notes = f"Cancelled: {reason}"

        # --- Revert asset statuses for assets not yet physically collected ---
        assets_reverted = 0
        assets_physical = 0

        if pickup.asset_ids:
            asset_result = await self.session.execute(
                select(Asset).where(Asset.id.in_(pickup.asset_ids))
            )
            assets = asset_result.scalars().all()

            for asset in assets:
                if asset.status in self.PICKUP_REVERTABLE_ASSET_STATUSES:
                    asset.status = AssetStatus.CONDITIONALLY_ACCEPTED.value
                    assets_reverted += 1
                elif asset.status in (
                    AssetStatus.PICKED_UP.value,
                    AssetStatus.IN_TRANSIT.value,
                ):
                    # Asset is physically with logistics — cannot auto-revert
                    assets_physical += 1

            if assets_physical > 0:
                logger.warning(
                    "Pickup %s cancelled but %d assets are physically collected "
                    "(picked_up/in_transit) — manual intervention required",
                    pickup_id,
                    assets_physical,
                )

        await self.session.flush()

        # Log to audit trail
        audit = AuditService(self.session)
        await audit.log_status_change(
            entity_type="pickup_request",
            entity_id=pickup_id,
            old_status=old_status,
            new_status=pickup.status,
            user_id=user.id,
            enterprise_id=pickup.enterprise_id,
            details=f"Pickup cancelled: {reason}",
            metadata={
                "cancellation_reason": reason,
                "assets_reverted": assets_reverted,
                "assets_physical_warning": assets_physical,
            },
        )

        logger.info(
            "Pickup %s cancelled: %d assets reverted to conditionally_accepted, "
            "%d assets in physical possession (manual handling needed)",
            pickup_id,
            assets_reverted,
            assets_physical,
        )

        return pickup

    async def fail_pickup(self, pickup_id: str, data: PickupFail, user: User) -> PickupRequest:
        """
        Mark a pickup as failed (Logistics User action) with asset reversion and audit logging.

        Reverts assets in pre-collection statuses back to conditionally_accepted.
        Increments attempt_count so repeated failure attempts are tracked.
        """
        pickup = await self.repo.get_by_id(pickup_id)
        if not pickup:
            raise ValueError("Pickup request not found")

        if user.role == UserRole.LOGISTICS_USER.value:
            if pickup.logistics_user_id != user.id:
                raise ValueError("This pickup is not assigned to you")

        if pickup.status != PickupStatus.IN_PROGRESS.value:
            raise ValueError("Pickup must be in progress to mark as failed")

        old_status = pickup.status
        pickup.status = PickupStatus.FAILED.value
        pickup.failure_reason = data.failure_reason
        pickup.failed_at = datetime.now(timezone.utc)
        pickup.attempt_count = (pickup.attempt_count or 0) + 1
        if data.logistics_notes:
            pickup.logistics_notes = data.logistics_notes

        # --- Revert asset statuses for assets not yet physically collected ---
        assets_reverted = 0
        assets_physical = 0

        if pickup.asset_ids:
            asset_result = await self.session.execute(
                select(Asset).where(Asset.id.in_(pickup.asset_ids))
            )
            assets = asset_result.scalars().all()

            for asset in assets:
                if asset.status in self.PICKUP_REVERTABLE_ASSET_STATUSES:
                    asset.status = AssetStatus.CONDITIONALLY_ACCEPTED.value
                    assets_reverted += 1
                elif asset.status in (
                    AssetStatus.PICKED_UP.value,
                    AssetStatus.IN_TRANSIT.value,
                ):
                    # Asset is physically with logistics — cannot auto-revert
                    assets_physical += 1
                else:
                    logger.warning(
                        "Pickup %s fail: asset %s has unexpected status '%s' — skipped",
                        pickup_id,
                        asset.id,
                        asset.status,
                    )

            if assets_physical > 0:
                logger.warning(
                    "Pickup %s failed but %d assets are physically collected "
                    "(picked_up/in_transit) — manual intervention required",
                    pickup_id,
                    assets_physical,
                )

        await self.session.flush()

        audit = AuditService(self.session)
        await audit.log_status_change(
            entity_type="pickup_request",
            entity_id=pickup_id,
            old_status=old_status,
            new_status=pickup.status,
            user_id=user.id,
            enterprise_id=pickup.enterprise_id,
            details=f"Pickup failed: {data.failure_reason}",
            metadata={
                "failure_reason": data.failure_reason,
                "attempt_count": pickup.attempt_count,
                "assets_reverted": assets_reverted,
                "assets_physical_warning": assets_physical,
            },
        )

        logger.info(
            "Pickup %s failed (attempt %d): %d assets reverted to conditionally_accepted, "
            "%d assets in physical possession (manual handling needed)",
            pickup_id,
            pickup.attempt_count,
            assets_reverted,
            assets_physical,
        )

        return pickup

    async def partial_pickup(self, pickup_id: str, data: PickupPartial, user: User) -> PickupRequest:
        """
        Record a partial pickup — some assets collected, some failed (Logistics User action).

        Picked assets → in_transit.
        Failed assets → pickup_failed_qc.
        Unaccounted assets (in pickup.asset_ids but not in either list) → conditionally_accepted.
        """
        pickup = await self.repo.get_by_id(pickup_id)
        if not pickup:
            raise ValueError("Pickup request not found")

        if user.role == UserRole.LOGISTICS_USER.value:
            if pickup.logistics_user_id != user.id:
                raise ValueError("This pickup is not assigned to you")

        if pickup.status != PickupStatus.IN_PROGRESS.value:
            raise ValueError("Pickup must be in progress to record partial collection")

        # --- Validate asset ID sets BEFORE any writes ---
        picked_set = set(data.picked_asset_ids)
        failed_set = set(data.failed_asset_ids)
        all_set = set(pickup.asset_ids or [])

        overlap = picked_set & failed_set
        if overlap:
            raise ValueError(
                f"Asset IDs cannot appear in both picked and failed lists: {sorted(overlap)}"
            )

        submitted = picked_set | failed_set
        if not submitted.issubset(all_set):
            unknown = submitted - all_set
            raise ValueError(
                f"Asset IDs must belong to this pickup request: {sorted(unknown)}"
            )

        if not picked_set and not failed_set:
            raise ValueError("At least one asset must be picked or failed")

        old_status = pickup.status
        pickup.status = PickupStatus.PARTIAL.value
        pickup.picked_asset_ids = data.picked_asset_ids
        pickup.failed_asset_ids = data.failed_asset_ids
        pickup.attempt_count = (pickup.attempt_count or 0) + 1
        if data.failure_reason:
            pickup.failure_reason = data.failure_reason
        if data.logistics_notes:
            pickup.logistics_notes = data.logistics_notes
        if data.proof_of_pickup:
            pickup.proof_of_pickup = data.proof_of_pickup

        # --- Update individual asset statuses ---
        if pickup.asset_ids:
            asset_result = await self.session.execute(
                select(Asset).where(Asset.id.in_(pickup.asset_ids))
            )
            assets = asset_result.scalars().all()

            for asset in assets:
                if asset.id in picked_set and asset.status in self.PICKUP_REVERTABLE_ASSET_STATUSES:
                    # Successfully collected — heading to facility
                    asset.status = AssetStatus.IN_TRANSIT.value
                elif asset.id in failed_set and asset.status in self.PICKUP_REVERTABLE_ASSET_STATUSES:
                    # On-site QC failure
                    asset.status = AssetStatus.PICKUP_FAILED_QC.value
                elif (
                    asset.id not in picked_set
                    and asset.id not in failed_set
                    and asset.status in self.PICKUP_REVERTABLE_ASSET_STATUSES
                ):
                    # Unaccounted asset — revert to conditionally_accepted
                    asset.status = AssetStatus.CONDITIONALLY_ACCEPTED.value
                elif asset.status not in self.PICKUP_REVERTABLE_ASSET_STATUSES:
                    logger.warning(
                        "Pickup %s partial: asset %s has unexpected status '%s', skipping status update",
                        pickup_id,
                        asset.id,
                        asset.status,
                    )

        await self.session.flush()

        audit = AuditService(self.session)
        await audit.log_status_change(
            entity_type="pickup_request",
            entity_id=pickup_id,
            old_status=old_status,
            new_status=pickup.status,
            user_id=user.id,
            enterprise_id=pickup.enterprise_id,
            details=f"Partial pickup recorded: {len(picked_set)} picked, {len(failed_set)} failed",
            metadata={
                "picked_count": len(picked_set),
                "failed_count": len(failed_set),
                "failure_reason": data.failure_reason,
                "attempt_count": pickup.attempt_count,
            },
        )

        logger.info(
            "Pickup %s partial (attempt %d): %d assets in_transit, %d assets pickup_failed_qc, "
            "%d assets reverted to conditionally_accepted",
            pickup_id,
            pickup.attempt_count,
            len(picked_set),
            len(failed_set),
            len(all_set - submitted),
        )

        return pickup

    async def reschedule_pickup(self, pickup_id: str, data: PickupReschedule, user: User) -> PickupRequest:
        """
        Reschedule a failed or partial pickup to a new date (OPS/Admin action).

        Valid source states: failed, partial, rescheduled.
        Does NOT touch asset_ids, picked_asset_ids, or failed_asset_ids — history is preserved.
        Assets already in_transit from a partial pickup remain in_transit.
        """
        pickup = await self.repo.get_by_id(pickup_id)
        if not pickup:
            raise ValueError("Pickup request not found")

        # Rescheduling is an OPS/Admin action — logistics users cannot reschedule
        if user.role not in (UserRole.SUPER_ADMIN.value, UserRole.OPS_ADMIN.value):
            raise ValueError("Only OPS Admin or Super Admin can reschedule pickups")

        valid_statuses = [
            PickupStatus.FAILED.value,
            PickupStatus.PARTIAL.value,
            PickupStatus.RESCHEDULED.value,
        ]
        if pickup.status not in valid_statuses:
            raise ValueError(
                f"Pickup must be in failed, partial, or rescheduled state to reschedule. "
                f"Current status: '{pickup.status}'"
            )

        old_status = pickup.status
        pickup.status = PickupStatus.RESCHEDULED.value
        pickup.scheduled_date = data.scheduled_date
        if data.logistics_notes:
            pickup.logistics_notes = data.logistics_notes

        # Reset failure marker fields — a fresh attempt is being arranged
        pickup.failure_reason = None
        pickup.failed_at = None

        # NOTE: Do NOT modify asset_ids, picked_asset_ids, or failed_asset_ids.
        # Assets already in_transit (from a partial) remain so. Only unresolved assets
        # are expected to be re-attempted on the next pickup execution.

        await self.session.flush()

        audit = AuditService(self.session)
        await audit.log_status_change(
            entity_type="pickup_request",
            entity_id=pickup_id,
            old_status=old_status,
            new_status=pickup.status,
            user_id=user.id,
            enterprise_id=pickup.enterprise_id,
            details=f"Pickup rescheduled to {data.scheduled_date}",
            metadata={
                "scheduled_date": str(data.scheduled_date),
                "rescheduled_from": old_status,
            },
        )

        logger.info(
            "Pickup %s rescheduled from '%s' to %s",
            pickup_id,
            old_status,
            data.scheduled_date,
        )

        return pickup

    async def list_pickups(
        self,
        user: User,
        enterprise_id: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[PickupRequest], int]:
        """List pickups with role-based filtering"""
        logistics_admin_id = None
        logistics_user_id = None

        if user.role == UserRole.LOGISTICS_USER.value:
            logistics_user_id = user.id
        elif user.role == UserRole.LOGISTICS_ADMIN.value:
            logistics_admin_id = user.id
        elif user.role == UserRole.ORG_ADMIN.value:
            enterprise_id = user.enterprise_id
        elif user.role == UserRole.IT_ADMIN.value:
            enterprise_id = user.enterprise_id
            from app.utils.scoping import get_it_admin_branch_ids
            branch_ids = await get_it_admin_branch_ids(self.session, user.id)
            if user.branch_id and user.branch_id not in branch_ids:
                branch_ids.append(user.branch_id)
        # Super/OPS admins see all

        return await self.repo.list_with_filters(
            enterprise_id=enterprise_id,
            branch_ids=branch_ids if user.role == UserRole.IT_ADMIN.value else None,
            logistics_admin_id=logistics_admin_id,
            logistics_user_id=logistics_user_id,
            status=status,
            search=search,
            skip=skip,
            limit=limit,
        )

    async def get_pending_assignment(
        self,
        user: User,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[PickupRequest], int]:
        """Get pickups pending OPS admin assignment"""
        if user.role not in [UserRole.SUPER_ADMIN.value, UserRole.OPS_ADMIN.value]:
            raise ValueError("Only OPS Admin can view pending assignments")

        return await self.repo.get_pending_assignment(skip=skip, limit=limit)

    async def get_my_assignments(
        self,
        user: User,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[PickupRequest], int]:
        """Get pickups assigned to current user"""
        if user.role == UserRole.LOGISTICS_ADMIN.value:
            return await self.repo.get_assigned_to_admin(user.id, skip=skip, limit=limit)
        elif user.role == UserRole.LOGISTICS_USER.value:
            return await self.repo.get_assigned_to_user(user.id, skip=skip, limit=limit)
        else:
            raise ValueError("Only logistics users can view their assignments")
