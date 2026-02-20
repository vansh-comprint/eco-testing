"""Asset service for business logic"""

from typing import Optional, List, Tuple
from uuid import uuid4
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.asset import Asset, AssetStatus
from app.repositories.asset_repository import AssetRepository
from app.repositories.branch_repository import BranchRepository
from app.schemas.asset import AssetCreate, AssetUpdate, AssetResponse, AssetBulkCreate
from app.utils.exceptions import NotFoundError, ValidationError, ConflictError
from app.utils.state_machine import validate_asset_transition, StateTransitionError
from app.services.audit_service import AuditService


class AssetService:
    """Service for Asset business logic"""

    def __init__(self, db: AsyncSession):
        self.repository = AssetRepository(db)
        self.db = db

    def _asset_to_response(self, asset) -> AssetResponse:
        """Convert Asset model to AssetResponse with relationship names"""
        response = AssetResponse.model_validate(asset)
        # Populate relationship names
        if asset.enterprise:
            response.enterprise_name = asset.enterprise.name
        if asset.branch:
            response.branch_name = asset.branch.branch_name  # Branch model uses branch_name field
        return response

    async def get_asset(self, asset_id: str) -> AssetResponse:
        """Get asset by ID"""
        asset = await self.repository.get_by_id(asset_id)
        if not asset:
            raise NotFoundError("Asset", asset_id)
        return self._asset_to_response(asset)

    async def list_assets(
        self,
        skip: int = 0,
        limit: int = 100,
        enterprise_id: Optional[str] = None,
        branch_id: Optional[str] = None,
        branch_ids: Optional[List[str]] = None,
        batch_id: Optional[str] = None,
        status: Optional[AssetStatus] = None,
        assigned_to_user_id: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[AssetResponse], int]:
        """List assets with filters and pagination"""
        assets, total = await self.repository.get_all(
            skip=skip,
            limit=limit,
            enterprise_id=enterprise_id,
            branch_id=branch_id,
            branch_ids=branch_ids,
            batch_id=batch_id,
            status=status,
            assigned_to_user_id=assigned_to_user_id,
            search=search,
        )
        return [self._asset_to_response(a) for a in assets], total

    async def create_asset(self, asset_data: AssetCreate, created_by: str) -> AssetResponse:
        """Create a new asset"""
        # Validate enterprise_id is provided
        if not asset_data.enterprise_id:
            raise ValidationError("Enterprise ID is required")

        # Validate branch_id is provided
        if not asset_data.branch_id:
            raise ValidationError("Branch ID is required. Please select a branch before adding assets.")

        # Check if serial number already exists within this enterprise
        existing = await self.repository.get_by_serial_number(
            asset_data.serial_number, enterprise_id=asset_data.enterprise_id
        )
        if existing:
            raise ConflictError(
                f"Asset with serial number {asset_data.serial_number} already exists in this enterprise"
            )

        # If assigned_to_user_id is provided, mark as assigned immediately
        if asset_data.assigned_to_user_id:
            initial_status = AssetStatus.ASSIGNED.value
            assigned_at = datetime.now(timezone.utc)
        else:
            initial_status = AssetStatus.PENDING_ASSIGNMENT.value
            assigned_at = None

        asset = Asset(
            id=str(uuid4()),
            serial_number=asset_data.serial_number,
            brand=asset_data.brand,
            model=asset_data.model,
            asset_tag=asset_data.asset_tag,
            specs=asset_data.specs,
            purchase_date=asset_data.purchase_date,
            enterprise_id=asset_data.enterprise_id,
            branch_id=asset_data.branch_id,
            batch_id=asset_data.batch_id,
            assigned_to_user_id=asset_data.assigned_to_user_id,
            assigned_at=assigned_at,
            status=initial_status,
            created_by=created_by,
            updated_by=created_by,
        )

        asset = await self.repository.create(asset)
        return AssetResponse.model_validate(asset)

    async def create_assets_bulk(
        self, bulk_data: AssetBulkCreate, created_by: str
    ) -> Tuple[List[AssetResponse], List[str]]:
        """Create multiple assets in bulk"""
        created_assets = []
        errors = []

        # Validate enterprise_id
        if not bulk_data.enterprise_id:
            raise ValidationError("Enterprise ID is required for bulk creation")

        # Validate branch_id
        if not bulk_data.branch_id:
            raise ValidationError("Branch ID is required. Please select a branch before adding assets.")

        for idx, item in enumerate(bulk_data.assets):
            try:
                # Check if serial number already exists within this enterprise
                existing = await self.repository.get_by_serial_number(
                    item.serial_number, enterprise_id=bulk_data.enterprise_id
                )
                if existing:
                    errors.append(
                        f"Row {idx + 1}: Serial number {item.serial_number} already exists in this enterprise"
                    )
                    continue

                # Auto-set status and assigned_at based on user assignment
                if item.assigned_to_user_id:
                    asset_status = AssetStatus.ASSIGNED.value
                    assigned_at = datetime.now(timezone.utc)
                else:
                    asset_status = AssetStatus.PENDING_ASSIGNMENT.value
                    assigned_at = None

                asset = Asset(
                    id=str(uuid4()),
                    serial_number=item.serial_number,
                    brand=item.brand,
                    model=item.model,
                    asset_tag=item.asset_tag,
                    specs=item.specs,
                    purchase_date=item.purchase_date,
                    enterprise_id=bulk_data.enterprise_id,
                    branch_id=bulk_data.branch_id,
                    batch_id=bulk_data.batch_id,
                    assigned_to_user_id=item.assigned_to_user_id,
                    assigned_at=assigned_at,
                    status=asset_status,
                    created_by=created_by,
                    updated_by=created_by,
                )
                created_assets.append(asset)

            except Exception as e:
                errors.append(f"Row {idx + 1}: {str(e)}")

        if created_assets:
            created_assets = await self.repository.create_bulk(created_assets)

        return [AssetResponse.model_validate(a) for a in created_assets], errors

    async def update_asset(
        self, asset_id: str, asset_data: AssetUpdate, updated_by: str
    ) -> AssetResponse:
        """
        Update an existing asset with state machine validation and audit logging.

        State transitions are strictly enforced - invalid transitions will raise
        StateTransitionError with details about allowed transitions.

        All status changes are logged to the audit trail for compliance.
        """
        asset = await self.repository.get_by_id(asset_id)
        if not asset:
            raise NotFoundError("Asset", asset_id)

        update_data = asset_data.model_dump(exclude_unset=True)
        status_changed = False
        old_status = None
        new_status = None
        branch_transferred = False
        old_branch_id = None

        # Validate branch transfer if branch_id is changing
        if "branch_id" in update_data and update_data["branch_id"] != asset.branch_id:
            new_branch_id = update_data["branch_id"]
            old_branch_id = asset.branch_id

            # Verify new branch exists
            branch_repo = BranchRepository(self.db)
            new_branch = await branch_repo.get_by_id(new_branch_id)
            if not new_branch:
                raise NotFoundError("Branch", new_branch_id)

            # Verify new branch is in same enterprise
            if new_branch.enterprise_id != asset.enterprise_id:
                raise ValidationError(
                    "Cannot transfer asset to a branch in a different enterprise"
                )

            # Verify asset is not in an active batch; auto-remove from draft batch on branch change
            if asset.batch_id:
                from app.models.batch import Batch
                from sqlalchemy import select
                result = await self.db.execute(
                    select(Batch.status).where(Batch.id == asset.batch_id)
                )
                batch_status = result.scalar_one_or_none()
                if batch_status and batch_status not in ("draft", "cancelled", "completed"):
                    raise ValidationError(
                        "Cannot transfer asset that is in an active batch. "
                        "Remove the asset from the batch first or wait until the batch is completed."
                    )
                # Auto-remove from batch on branch transfer (batch is branch-scoped)
                update_data["batch_id"] = None

            branch_transferred = True

        # Handle enum conversions
        if "status" in update_data and update_data["status"]:
            new_status = update_data["status"].value
            old_status = asset.status

            if old_status != new_status:
                status_changed = True

                # Validate state transition BEFORE applying
                try:
                    validate_asset_transition(
                        current_status=old_status,
                        target_status=new_status,
                        asset_data={
                            **update_data,
                            "assigned_to_user_id": update_data.get("assigned_to_user_id") or asset.assigned_to_user_id,
                            "grade": update_data.get("grade") or asset.grade,
                        }
                    )
                except StateTransitionError as e:
                    raise ValidationError(str(e))

            update_data["status"] = new_status

            # Auto-set timestamps based on status transitions
            if new_status == "assigned" and old_status == "pending_assignment":
                asset.assigned_at = datetime.now(timezone.utc)

        if "grade" in update_data and update_data["grade"]:
            update_data["grade"] = update_data["grade"].value

        for key, value in update_data.items():
            setattr(asset, key, value)

        asset.updated_by = updated_by
        asset = await self.repository.update(asset)

        # Log status change to audit trail
        if status_changed:
            audit = AuditService(self.db)
            await audit.log_status_change(
                entity_type="asset",
                entity_id=asset_id,
                old_status=old_status,
                new_status=new_status,
                user_id=updated_by,
                enterprise_id=asset.enterprise_id,
                branch_id=asset.branch_id,
                metadata={
                    "serial_number": asset.serial_number,
                    "grade": asset.grade,
                }
            )

        # Log branch transfer to audit trail
        if branch_transferred:
            audit = AuditService(self.db)
            await audit.log(
                entity_type="asset",
                entity_id=asset_id,
                action="branch_transfer",
                old_values={"branch_id": old_branch_id},
                new_values={"branch_id": asset.branch_id},
                details=f"Asset transferred from branch {old_branch_id} to branch {asset.branch_id}",
                user_id=updated_by,
                enterprise_id=asset.enterprise_id,
                branch_id=asset.branch_id,
                extra_data={"serial_number": asset.serial_number},
            )

        return AssetResponse.model_validate(asset)

    async def assign_asset(
        self, asset_id: str, assigned_to_user_id: str, updated_by: str
    ) -> AssetResponse:
        """
        Assign an asset to an employee.

        Validates:
        - Asset exists
        - Assigned user exists
        - Asset is in pending_assignment or assigned status
        - Transitions status to 'assigned' if currently pending_assignment
        """
        asset = await self.repository.get_by_id(asset_id)
        if not asset:
            raise NotFoundError("Asset", asset_id)

        # Validate the target user exists
        from app.models.user import User
        from sqlalchemy import select

        result = await self.db.execute(
            select(User.id).where(User.id == assigned_to_user_id)
        )
        if not result.scalar_one_or_none():
            raise NotFoundError("User", assigned_to_user_id)

        old_status = asset.status
        new_status = "assigned"

        # Only transition if currently pending_assignment
        if old_status == "pending_assignment":
            try:
                validate_asset_transition(
                    current_status=old_status,
                    target_status=new_status,
                    asset_data={"assigned_to_user_id": assigned_to_user_id},
                )
            except StateTransitionError as e:
                raise ValidationError(str(e))
            asset.status = new_status
        elif old_status != "assigned":
            raise ValidationError(
                f"Cannot assign asset in '{old_status}' status. "
                f"Asset must be in 'pending_assignment' or 'assigned' status."
            )

        asset.assigned_to_user_id = assigned_to_user_id
        asset.assigned_at = datetime.now(timezone.utc)
        asset.updated_by = updated_by
        asset = await self.repository.update(asset)

        # Log assignment to audit trail
        if old_status != new_status:
            audit = AuditService(self.db)
            await audit.log_status_change(
                entity_type="asset",
                entity_id=asset_id,
                old_status=old_status,
                new_status=new_status,
                user_id=updated_by,
                enterprise_id=asset.enterprise_id,
                branch_id=asset.branch_id,
                metadata={
                    "serial_number": asset.serial_number,
                    "assigned_to_user_id": assigned_to_user_id,
                    "action": "assign",
                },
            )

        return AssetResponse.model_validate(asset)

    async def unassign_asset(self, asset_id: str, updated_by: str) -> AssetResponse:
        """
        Unassign an asset from its current employee.

        Transitions status back to 'pending_assignment' if currently 'assigned'.
        """
        asset = await self.repository.get_by_id(asset_id)
        if not asset:
            raise NotFoundError("Asset", asset_id)

        old_status = asset.status
        if old_status != "assigned":
            raise ValidationError(
                f"Cannot unassign asset in '{old_status}' status. "
                f"Asset must be in 'assigned' status."
            )

        new_status = "pending_assignment"
        try:
            validate_asset_transition(
                current_status=old_status,
                target_status=new_status,
                asset_data={},
            )
        except StateTransitionError as e:
            raise ValidationError(str(e))

        asset.status = new_status
        asset.assigned_to_user_id = None
        asset.assigned_at = None
        asset.updated_by = updated_by
        asset = await self.repository.update(asset)

        # Log unassignment
        audit = AuditService(self.db)
        await audit.log_status_change(
            entity_type="asset",
            entity_id=asset_id,
            old_status=old_status,
            new_status=new_status,
            user_id=updated_by,
            enterprise_id=asset.enterprise_id,
            branch_id=asset.branch_id,
            metadata={
                "serial_number": asset.serial_number,
                "action": "unassign",
            },
        )

        return AssetResponse.model_validate(asset)

    async def delete_asset(self, asset_id: str) -> bool:
        """Delete an asset"""
        return await self.repository.delete(asset_id)
