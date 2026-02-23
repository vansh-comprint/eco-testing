"""Service layer for Pickup business logic"""

import uuid
from datetime import datetime, timezone
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import PickupRequest, PickupStatus, AssetStatus, User, UserRole
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

    async def cancel_pickup(self, pickup_id: str, reason: str, user: User) -> PickupRequest:
        """Cancel a pickup request with audit logging"""
        pickup = await self.repo.get_by_id(pickup_id)
        if not pickup:
            raise ValueError("Pickup request not found")

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
            metadata={"cancellation_reason": reason}
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
