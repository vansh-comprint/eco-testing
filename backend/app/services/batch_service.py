"""Batch service for business logic"""

from datetime import datetime, timezone
from typing import Optional, List, Tuple
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.batch import Batch, BatchStatus
from app.models.user import User, UserRole
from app.repositories.asset_repository import AssetRepository
from app.repositories.batch_repository import BatchRepository
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
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[BatchResponse], int]:
        """List batches pending Org Admin approval"""
        batches, total = await self.repository.get_pending_approval(
            enterprise_id=enterprise_id,
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

        return BatchResponse.model_validate(batch)

    async def process_approval(
        self, batch_id: str, action_data: BatchApprovalAction, processed_by: str
    ) -> BatchResponse:
        """Process Org Admin approval/rejection with audit logging"""
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

        return BatchResponse.model_validate(batch)

    async def delete_batch(self, batch_id: str) -> bool:
        """Delete a batch"""
        return await self.repository.delete(batch_id)

