"""Batch service for business logic"""

import uuid
from datetime import datetime, timezone
from typing import Optional, List, Tuple
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.batch import Batch, BatchStatus
from app.models.asset import AssetStatus
from app.models.logistics import PickupRequest, PickupStatus
from app.models.user import User, UserRole
from app.repositories.asset_repository import AssetRepository
from app.repositories.batch_repository import BatchRepository
from app.repositories.branch_repository import BranchRepository
from app.repositories.pickup_repository import PickupRepository, PickupLocationRepository
from app.schemas.batch import (
    BatchCreate,
    BatchUpdate,
    BatchResponse,
    BatchProgressStats,
    BatchSubmitForApproval,
    BatchApprovalAction,
)
from app.utils.exceptions import NotFoundError, ValidationError, AuthorizationError
from app.utils.state_machine import validate_batch_transition, StateTransitionError
from app.services.audit_service import AuditService


# =============================================================================
# ROLE-BASED STATUS TRANSITION RESTRICTIONS
# =============================================================================

# Statuses that can ONLY be set through specific workflow endpoints
# These cannot be directly set via update_batch()
PROTECTED_STATUSES = {
    BatchStatus.APPROVED.value,      # Must use process_approval endpoint
    BatchStatus.REJECTED.value,      # Must use process_approval endpoint
    BatchStatus.PENDING_APPROVAL.value,  # Must use submit_for_approval endpoint
    BatchStatus.COMPLETED.value,     # Must complete full workflow
}

# Statuses that require specific roles to transition TO
STATUS_ROLE_REQUIREMENTS = {
    # Only ops can mark as completed
    BatchStatus.COMPLETED.value: [
        UserRole.SUPER_ADMIN.value,
        UserRole.OPS_ADMIN.value,
    ],
}


class BatchService:
    """Service for Batch business logic"""

    # Mapping from raw asset statuses to progress buckets
    STATUS_BUCKETS = {
        "pending_assignment": "pending_assignment",
        "assigned": "assigned",
        "check_in_started": "assigned",
        "submitted": "in_review",
        "remote_review": "in_review",
        "conditionally_accepted": "verified",
        "ready_for_pickup": "verified",
        "pickup_requested": "in_pickup",
        "pickup_scheduled": "in_pickup",
        "pickup_failed_qc": "in_pickup",
        "picked_up": "picked_up",
        "in_transit": "picked_up",
        "facility_qc": "picked_up",
        "final_accepted": "completed",
        "payout_pending": "completed",
        "completed": "completed",
        "remote_rejected": "rejected",
        "final_rejected": "rejected",
        "disputed": "in_review",
    }

    def __init__(self, db: AsyncSession):
        self.repository = BatchRepository(db)
        self.asset_repository = AssetRepository(db)
        self.db = db

    @classmethod
    def _build_progress(cls, status_counts: dict) -> BatchProgressStats:
        """Build BatchProgressStats from raw status counts"""
        stats = BatchProgressStats()
        for status, count in status_counts.items():
            bucket = cls.STATUS_BUCKETS.get(status)
            if bucket:
                setattr(stats, bucket, getattr(stats, bucket) + count)
            stats.total += count
        return stats

    async def get_batch(self, batch_id: str) -> BatchResponse:
        """Get batch by ID"""
        batch = await self.repository.get_by_id(batch_id)
        if not batch:
            raise NotFoundError("Batch", batch_id)
        response = BatchResponse.model_validate(batch)
        status_counts = await self.asset_repository.get_asset_status_counts(batch_id)
        response.progress = self._build_progress(status_counts)
        return response

    async def list_batches(
        self,
        skip: int = 0,
        limit: int = 100,
        enterprise_id: Optional[str] = None,
        branch_id: Optional[str] = None,
        branch_ids: Optional[List[str]] = None,
        status: Optional[BatchStatus] = None,
        created_by: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[BatchResponse], int]:
        """List batches with filters and pagination"""
        batches, total = await self.repository.get_all(
            skip=skip,
            limit=limit,
            enterprise_id=enterprise_id,
            branch_id=branch_id,
            branch_ids=branch_ids,
            status=status,
            created_by=created_by,
            search=search,
        )
        responses = [BatchResponse.model_validate(b) for b in batches]

        # Bulk fetch progress stats to avoid N+1
        batch_ids = [b.id for b in batches]
        bulk_counts = await self.asset_repository.get_bulk_asset_status_counts(batch_ids)
        for resp in responses:
            resp.progress = self._build_progress(bulk_counts.get(resp.id, {}))

        return responses, total

    async def list_pending_approval(
        self,
        enterprise_id: Optional[str] = None,
        branch_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[BatchResponse], int]:
        """List batches pending Org Admin approval"""
        batches, total = await self.repository.get_pending_approval(
            enterprise_id=enterprise_id,
            branch_id=branch_id,
            skip=skip,
            limit=limit,
        )
        responses = [BatchResponse.model_validate(b) for b in batches]

        batch_ids = [b.id for b in batches]
        bulk_counts = await self.asset_repository.get_bulk_asset_status_counts(batch_ids)
        for resp in responses:
            resp.progress = self._build_progress(bulk_counts.get(resp.id, {}))

        return responses, total

    async def create_batch(self, batch_data: BatchCreate, created_by: str) -> BatchResponse:
        """Create a new batch"""
        if not batch_data.enterprise_id:
            raise ValidationError("Enterprise ID is required")

        batch = Batch(
            id=str(uuid4()),
            name=batch_data.name,
            description=batch_data.description,
            enterprise_id=batch_data.enterprise_id,
            branch_id=batch_data.branch_id,
            created_by=created_by,
            status=BatchStatus.DRAFT.value,
            updated_by=created_by,
        )

        batch = await self.repository.create(batch)
        return BatchResponse.model_validate(batch)

    async def update_batch(
        self,
        batch_id: str,
        batch_data: BatchUpdate,
        updated_by: str,
        actor: Optional[User] = None,
    ) -> BatchResponse:
        """
        Update an existing batch with state machine validation and audit logging.

        SECURITY: Enforces role-based restrictions on status transitions.
        - Protected statuses (approved, rejected, completed, pending_approval) cannot
          be set directly; they must go through workflow endpoints.
        - Certain transitions require specific roles.

        Args:
            batch_id: ID of batch to update
            batch_data: Update data
            updated_by: User ID performing the update
            actor: User object for role-based validation

        Raises:
            ValidationError: If status transition is invalid
            AuthorizationError: If user lacks permission for the transition
        """
        batch = await self.repository.get_by_id(batch_id)
        if not batch:
            raise NotFoundError("Batch", batch_id)

        update_data = batch_data.model_dump(exclude_unset=True)
        status_changed = False
        old_status = None
        new_status = None

        # Validate status transition if status is being changed
        if "status" in update_data and update_data["status"]:
            new_status = update_data["status"].value
            old_status = batch.status

            if old_status != new_status:
                status_changed = True

                # SECURITY: Block direct updates to protected statuses
                if new_status in PROTECTED_STATUSES:
                    raise ValidationError(
                        f"Cannot directly set status to '{new_status}'. "
                        f"Use the appropriate workflow endpoint instead."
                    )

                # SECURITY: Check role requirements for target status
                if actor and new_status in STATUS_ROLE_REQUIREMENTS:
                    allowed_roles = STATUS_ROLE_REQUIREMENTS[new_status]
                    if actor.role not in allowed_roles:
                        raise AuthorizationError(
                            f"Your role ({actor.role}) cannot set batch status to '{new_status}'. "
                            f"Required roles: {', '.join(allowed_roles)}"
                        )

                try:
                    validate_batch_transition(old_status, new_status)
                except StateTransitionError as e:
                    raise ValidationError(str(e))

            update_data["status"] = new_status

        # Handle other enum conversions
        for field in ["preferred_pickup_slot", "pickup_priority"]:
            if field in update_data and update_data[field]:
                update_data[field] = update_data[field].value

        for key, value in update_data.items():
            setattr(batch, key, value)

        batch.updated_by = updated_by
        batch = await self.repository.update(batch)

        # Log status change to audit trail
        if status_changed:
            audit = AuditService(self.db)
            await audit.log_status_change(
                entity_type="batch",
                entity_id=batch_id,
                old_status=old_status,
                new_status=new_status,
                user_id=updated_by,
                enterprise_id=batch.enterprise_id,
                branch_id=batch.branch_id,
                metadata={
                    "batch_name": batch.name,
                }
            )

        # Refresh batch to load server-computed fields (updated_at via onupdate=func.now())
        await self.db.refresh(batch)
        return BatchResponse.model_validate(batch)

    async def submit_for_approval(
        self, batch_id: str, data: BatchSubmitForApproval, submitted_by: str
    ) -> BatchResponse:
        """Submit batch for Org Admin approval with audit logging"""
        batch = await self.repository.get_by_id(batch_id)
        if not batch:
            raise NotFoundError("Batch", batch_id)

        if batch.status != BatchStatus.DRAFT.value:
            raise ValidationError("Only draft batches can be submitted for approval")

        # Validate batch has at least one verified asset before allowing submission
        verified_statuses = [
            AssetStatus.CONDITIONALLY_ACCEPTED.value,
            AssetStatus.READY_FOR_PICKUP.value,
        ]
        verified_assets = await self.asset_repository.get_assets_by_batch_and_statuses(
            batch_id, verified_statuses
        )
        if not verified_assets:
            raise ValidationError(
                "Cannot submit batch for approval: no verified assets. "
                "Assets must be reviewed and accepted before submitting."
            )

        old_status = batch.status
        batch.status = BatchStatus.PENDING_APPROVAL.value
        batch.requires_approval = True
        batch.submitted_for_approval_at = datetime.now(timezone.utc)
        batch.pickup_location_override = data.pickup_location_override
        batch.preferred_pickup_date = data.preferred_pickup_date
        batch.preferred_pickup_slot = data.preferred_pickup_slot.value
        batch.pickup_priority = data.pickup_priority.value
        batch.it_admin_notes = data.it_admin_notes
        batch.logistics_instructions = data.logistics_instructions
        batch.updated_by = submitted_by

        batch = await self.repository.update(batch)

        # Log submission to audit trail
        audit = AuditService(self.db)
        await audit.log_status_change(
            entity_type="batch",
            entity_id=batch_id,
            old_status=old_status,
            new_status=BatchStatus.PENDING_APPROVAL.value,
            user_id=submitted_by,
            enterprise_id=batch.enterprise_id,
            branch_id=batch.branch_id,
            details="Batch submitted for Org Admin approval",
            metadata={
                "batch_name": batch.name,
                "preferred_pickup_date": str(batch.preferred_pickup_date) if batch.preferred_pickup_date else None,
            }
        )

        # Refresh batch to load server-computed fields (updated_at via onupdate=func.now())
        await self.db.refresh(batch)
        return BatchResponse.model_validate(batch)

    async def process_approval(
        self, batch_id: str, action_data: BatchApprovalAction, processed_by: str
    ) -> BatchResponse:
        """Process Org Admin approval/rejection with audit logging.

        On approval, automatically creates a pickup request for all verified
        assets in the batch (no manual pickup step needed).
        """
        batch = await self.repository.get_by_id(batch_id)
        if not batch:
            raise NotFoundError("Batch", batch_id)

        if batch.status != BatchStatus.PENDING_APPROVAL.value:
            raise ValidationError("Batch is not pending approval")

        old_status = batch.status
        now = datetime.now(timezone.utc)

        if action_data.action == "approve":
            batch.status = BatchStatus.APPROVED.value
            batch.approved_by = processed_by
            batch.approved_at = now
            batch.org_admin_notes = action_data.org_admin_notes
            action_details = "Batch approved by Org Admin"
        else:
            batch.status = BatchStatus.REJECTED.value
            batch.rejected_by = processed_by
            batch.rejected_at = now
            batch.rejection_reason = action_data.rejection_reason
            action_details = f"Batch rejected by Org Admin: {action_data.rejection_reason or 'No reason provided'}"

        batch.updated_by = processed_by
        batch = await self.repository.update(batch)

        # Log approval/rejection to audit trail
        audit = AuditService(self.db)
        await audit.log_status_change(
            entity_type="batch",
            entity_id=batch_id,
            old_status=old_status,
            new_status=batch.status,
            user_id=processed_by,
            enterprise_id=batch.enterprise_id,
            branch_id=batch.branch_id,
            details=action_details,
            metadata={
                "batch_name": batch.name,
                "action": action_data.action,
            }
        )

        # --- On approval: transition verified assets to ready_for_pickup, then auto-create pickup ---
        if action_data.action == "approve":
            # Promote conditionally_accepted assets to ready_for_pickup
            verified_assets = await self.asset_repository.get_assets_by_batch_and_statuses(
                batch_id, [AssetStatus.CONDITIONALLY_ACCEPTED.value]
            )
            for asset in verified_assets:
                asset.status = AssetStatus.READY_FOR_PICKUP.value
                asset.updated_by = processed_by
            if verified_assets:
                await self.db.flush()

            await self._auto_create_pickup(batch, processed_by)

        # Refresh batch to load server-computed fields (updated_at via onupdate=func.now())
        await self.db.refresh(batch)
        response = BatchResponse.model_validate(batch)
        # Attach progress stats
        status_counts = await self.asset_repository.get_asset_status_counts(batch_id)
        response.progress = self._build_progress(status_counts)
        return response

    async def _auto_create_pickup(self, batch: Batch, approved_by: str) -> None:
        """Auto-create a pickup request for verified assets after batch approval.

        Finds verified assets, resolves a pickup location, creates the pickup
        request, transitions asset statuses to pickup_requested, and advances
        the batch to pickup_in_progress.
        """
        PICKUPABLE_STATUSES = {
            AssetStatus.READY_FOR_PICKUP.value,
        }

        # 1. Get all verified assets in this batch
        status_counts = await self.asset_repository.get_asset_status_counts(batch.id)
        verified_count = sum(
            count for status, count in status_counts.items()
            if status in PICKUPABLE_STATUSES
        )
        if verified_count == 0:
            return  # Nothing to pick up

        # Get actual asset records
        verified_assets = await self.asset_repository.get_assets_by_batch_and_statuses(
            batch.id, list(PICKUPABLE_STATUSES)
        )
        if not verified_assets:
            return

        asset_ids = [a.id for a in verified_assets]

        # 2. Resolve pickup location from branch
        location_repo = PickupLocationRepository(self.db)
        if batch.branch_id:
            branch_repo = BranchRepository(self.db)
            branch = await branch_repo.get_by_id(batch.branch_id)
            if branch:
                location = await location_repo.get_or_create_from_branch(branch)
            else:
                location = None
        else:
            # Fallback: use default enterprise location if no branch set
            location = await location_repo.get_default_for_enterprise(batch.enterprise_id)
            if not location:
                locations, _ = await location_repo.list_by_enterprise(batch.enterprise_id)
                location = locations[0] if locations else None
        if not location:
            # No branch or pickup location — batch stays approved, pickup must
            # be created manually once a branch/location is set up.
            return

        # 3. Build assets summary
        assets_summary = [
            {
                "id": a.id,
                "serial_number": a.serial_number,
                "brand": a.brand,
                "model": a.model,
            }
            for a in verified_assets
        ]

        # 4. Create pickup request
        pickup_repo = PickupRepository(self.db)
        pickup = PickupRequest(
            id=f"pr-{uuid.uuid4()}",
            enterprise_id=batch.enterprise_id,
            location_id=location.id,
            batch_id=batch.id,
            asset_ids=asset_ids,
            assets=assets_summary,
            preferred_date=batch.preferred_pickup_date,
            preferred_time_slot=batch.preferred_pickup_slot or "morning",
            special_instructions=batch.logistics_instructions,
            status=PickupStatus.PENDING.value,
        )
        await pickup_repo.create(pickup)

        # 5. Transition asset statuses to pickup_requested
        for asset in verified_assets:
            asset.status = AssetStatus.PICKUP_REQUESTED.value

        # 6. Advance batch to pickup_in_progress
        batch.status = BatchStatus.PICKUP_IN_PROGRESS.value
        await self.db.flush()

        # Log auto-pickup creation
        audit = AuditService(self.db)
        await audit.log_status_change(
            entity_type="pickup_request",
            entity_id=pickup.id,
            old_status="(new)",
            new_status=PickupStatus.PENDING.value,
            user_id=approved_by,
            enterprise_id=batch.enterprise_id,
            branch_id=batch.branch_id,
            details=f"Auto-created pickup for {len(asset_ids)} verified assets on batch approval",
            metadata={
                "batch_id": batch.id,
                "batch_name": batch.name,
                "asset_count": len(asset_ids),
            }
        )

    async def delete_batch(
        self,
        batch_id: str,
        delete_assets: bool = False,
        delete_sub_users: bool = False,
    ) -> bool:
        """Delete a batch, optionally cascading to assets and employee users.

        Args:
            batch_id: ID of batch to delete
            delete_assets: If True, delete all assets in this batch
            delete_sub_users: If True, delete employee users assigned to batch assets
        """
        from sqlalchemy import select, delete as sql_delete
        from app.models.asset import Asset
        from app.models.user import User

        batch = await self.repository.get_by_id(batch_id)
        if not batch:
            raise NotFoundError("Batch", batch_id)

        # Get assets in this batch (needed for sub-user deletion and asset deletion)
        assets = []
        if delete_assets or delete_sub_users:
            result = await self.db.execute(
                select(Asset).where(Asset.batch_id == batch_id)
            )
            assets = list(result.scalars().all())

        # Delete employee users assigned to these assets
        if delete_sub_users and assets:
            employee_ids = {
                a.assigned_to_user_id for a in assets
                if a.assigned_to_user_id
            }
            if employee_ids:
                # Unassign assets first to avoid FK issues
                for asset in assets:
                    asset.assigned_to_user_id = None
                await self.db.flush()

                # Delete employee users
                await self.db.execute(
                    sql_delete(User).where(
                        User.id.in_(employee_ids),
                        User.role == "employee",
                    )
                )

        # Delete assets in this batch
        if delete_assets and assets:
            for asset in assets:
                await self.db.delete(asset)

        # Delete any pickup requests tied to this batch
        result = await self.db.execute(
            select(PickupRequest).where(PickupRequest.batch_id == batch_id)
        )
        for pickup in result.scalars().all():
            await self.db.delete(pickup)

        # Delete the batch itself
        await self.db.delete(batch)
        await self.db.commit()
        return True

