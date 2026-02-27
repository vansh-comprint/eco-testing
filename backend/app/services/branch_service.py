"""Branch service for business logic"""

from typing import Optional, List, Tuple, Dict, Any
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload

from app.models.enterprise import Branch, BranchStatus
from app.models.user import User
from app.models.asset import Asset
from app.models.batch import Batch
from app.repositories.branch_repository import BranchRepository
from app.schemas.branch import (
    BranchCreate,
    BranchUpdate,
    BranchResponse,
    BranchBulkCreate,
    ITAdminInfo,
)
from app.utils.exceptions import NotFoundError, ValidationError, ConflictError


class BranchService:
    """Service for Branch business logic"""

    def __init__(self, db: AsyncSession):
        self.repository = BranchRepository(db)
        self.db = db

    async def _enrich_branch_response(self, branch) -> BranchResponse:
        """Convert branch model to response with computed counts and IT admin info."""
        response = BranchResponse.model_validate(branch)

        # Populate IT Admin info if assigned
        if branch.it_admin_id:
            admin = getattr(branch, "it_admin", None)
            if admin:
                response.it_admin = ITAdminInfo.model_validate(admin)
            else:
                # Fallback: load IT admin if not eagerly loaded
                result = await self.db.execute(select(User).where(User.id == branch.it_admin_id))
                admin = result.scalar_one_or_none()
                if admin:
                    response.it_admin = ITAdminInfo(
                        id=admin.id,
                        name=admin.name,
                        email=admin.email,
                        phone=admin.phone,
                    )

        # Count assets in this branch
        result = await self.db.execute(
            select(func.count(Asset.id)).where(Asset.branch_id == branch.id)
        )
        response.asset_count = result.scalar() or 0

        # Count users in this branch
        result = await self.db.execute(
            select(func.count(User.id)).where(User.branch_id == branch.id)
        )
        response.user_count = result.scalar() or 0

        return response

    async def _enrich_branches_batch(self, branches: List[Branch]) -> List[BranchResponse]:
        """
        Efficiently enrich multiple branches with counts in batch.
        Avoids N+1 queries by fetching all counts in 2 queries instead of 2*N queries.
        """
        if not branches:
            return []

        branch_ids = [b.id for b in branches]

        # Batch query for asset counts
        asset_counts_query = (
            select(Asset.branch_id, func.count(Asset.id).label("count"))
            .where(Asset.branch_id.in_(branch_ids))
            .group_by(Asset.branch_id)
        )
        asset_result = await self.db.execute(asset_counts_query)
        asset_counts = {row.branch_id: row.count for row in asset_result}

        # Batch query for user counts
        user_counts_query = (
            select(User.branch_id, func.count(User.id).label("count"))
            .where(User.branch_id.in_(branch_ids))
            .group_by(User.branch_id)
        )
        user_result = await self.db.execute(user_counts_query)
        user_counts = {row.branch_id: row.count for row in user_result}

        # Build responses
        responses = []
        for branch in branches:
            response = BranchResponse.model_validate(branch)

            # Populate IT Admin info if assigned (should be eager loaded)
            if branch.it_admin_id:
                admin = getattr(branch, "it_admin", None)
                if admin:
                    response.it_admin = ITAdminInfo.model_validate(admin)

            # Use pre-fetched counts
            response.asset_count = asset_counts.get(branch.id, 0)
            response.user_count = user_counts.get(branch.id, 0)

            responses.append(response)

        return responses

    async def get_branch(self, branch_id: str) -> BranchResponse:
        """Get branch by ID with eager-loaded IT admin."""
        result = await self.db.execute(
            select(Branch).options(joinedload(Branch.it_admin)).where(Branch.id == branch_id)
        )
        branch = result.unique().scalar_one_or_none()
        if not branch:
            raise NotFoundError("Branch", branch_id)
        return await self._enrich_branch_response(branch)

    async def list_branches(
        self,
        skip: int = 0,
        limit: int = 100,
        enterprise_id: Optional[str] = None,
        it_admin_id: Optional[str] = None,
        status: Optional[BranchStatus] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[BranchResponse], int]:
        """List branches with filters and pagination"""
        branches, total = await self.repository.get_all(
            skip=skip,
            limit=limit,
            enterprise_id=enterprise_id,
            it_admin_id=it_admin_id,
            status=status,
            search=search,
        )
        # Use batch enrichment to avoid N+1 queries
        enriched = await self._enrich_branches_batch(branches)
        return enriched, total

    async def create_branch(self, branch_data: BranchCreate, created_by: str) -> BranchResponse:
        """Create a new branch"""
        if not branch_data.enterprise_id:
            raise ValidationError("Enterprise ID is required")

        # Check if branch code already exists in this enterprise
        existing = await self.repository.get_by_code(
            branch_data.enterprise_id, branch_data.branch_code
        )
        if existing:
            raise ConflictError(
                f"Branch with code {branch_data.branch_code} already exists in this enterprise"
            )

        branch = Branch(
            id=str(uuid4()),
            enterprise_id=branch_data.enterprise_id,
            branch_name=branch_data.branch_name,
            branch_code=branch_data.branch_code,
            address_line1=branch_data.address_line1,
            address_line2=branch_data.address_line2,
            city=branch_data.city,
            state=branch_data.state,
            pin_code=branch_data.pin_code,
            pickup_point_description=branch_data.pickup_point_description,
            site_contact_person=branch_data.site_contact_person,
            site_contact_phone=branch_data.site_contact_phone,
            operating_hours=branch_data.operating_hours,
            special_instructions=branch_data.special_instructions,
            it_admin_id=branch_data.it_admin_id,
            status=(
                BranchStatus.ACTIVE.value
                if branch_data.it_admin_id
                else BranchStatus.NEEDS_ADMIN.value
            ),
            created_by=created_by,
            updated_by=created_by,
        )

        branch = await self.repository.create(branch)
        return await self._enrich_branch_response(branch)

    async def update_branch(
        self, branch_id: str, branch_data: BranchUpdate, updated_by: str
    ) -> BranchResponse:
        """Update an existing branch"""
        branch = await self.repository.get_by_id(branch_id)
        if not branch:
            raise NotFoundError("Branch", branch_id)

        update_data = branch_data.model_dump(exclude_unset=True)

        # Handle enum conversion
        if "status" in update_data and update_data["status"]:
            update_data["status"] = update_data["status"].value

        # Deactivation guard: prevent deactivating branch with dependents
        if "status" in update_data and update_data["status"] == BranchStatus.INACTIVE.value:
            from app.models.user import UserRole, UserStatus
            # Count employees
            emp_count_result = await self.db.execute(
                select(func.count(User.id)).where(
                    User.branch_id == branch_id,
                    User.role == UserRole.EMPLOYEE.value,
                    User.status == UserStatus.ACTIVE.value,
                )
            )
            emp_count = emp_count_result.scalar() or 0

            asset_count_result = await self.db.execute(
                select(func.count(Asset.id)).where(Asset.branch_id == branch_id)
            )
            asset_count = asset_count_result.scalar() or 0

            if emp_count > 0 or asset_count > 0:
                raise ValidationError(
                    f"Cannot deactivate branch with {emp_count} employee(s) and {asset_count} asset(s). "
                    "Transfer or remove them first."
                )

            # Handle IT admin re-pointing
            if branch.it_admin_id:
                admin_result = await self.db.execute(
                    select(User).where(User.id == branch.it_admin_id)
                )
                admin_user = admin_result.scalar_one_or_none()
                if admin_user and admin_user.branch_id == branch_id:
                    # Find another active branch managed by this admin
                    other_result = await self.db.execute(
                        select(Branch).where(
                            Branch.it_admin_id == branch.it_admin_id,
                            Branch.id != branch_id,
                            Branch.status == BranchStatus.ACTIVE.value,
                        ).limit(1)
                    )
                    other_branch = other_result.scalar_one_or_none()
                    admin_user.branch_id = other_branch.id if other_branch else None

        # Check for branch code conflict if updating
        if "branch_code" in update_data:
            existing = await self.repository.get_by_code(
                branch.enterprise_id, update_data["branch_code"]
            )
            if existing and existing.id != branch_id:
                raise ConflictError(f"Branch with code {update_data['branch_code']} already exists")

        # Auto-update status when it_admin_id changes (unless status is explicitly set)
        if "it_admin_id" in update_data and "status" not in update_data:
            if update_data["it_admin_id"] and branch.status == BranchStatus.NEEDS_ADMIN.value:
                update_data["status"] = BranchStatus.ACTIVE.value
            elif not update_data["it_admin_id"] and branch.status == BranchStatus.ACTIVE.value:
                update_data["status"] = BranchStatus.NEEDS_ADMIN.value

        # Sync user.branch_id when branch.it_admin_id changes (bidirectional sync)
        if "it_admin_id" in update_data:
            old_admin_id = branch.it_admin_id  # capture before setattr loop
            new_admin_id = update_data["it_admin_id"]

            if old_admin_id != new_admin_id:
                # Clear old admin's branch_id if it still points to this branch
                if old_admin_id:
                    result = await self.db.execute(select(User).where(User.id == old_admin_id))
                    old_admin = result.scalar_one_or_none()
                    if old_admin and old_admin.branch_id == branch_id:
                        old_admin.branch_id = None

                # Set new admin's branch_id to this branch
                if new_admin_id:
                    result = await self.db.execute(select(User).where(User.id == new_admin_id))
                    new_admin = result.scalar_one_or_none()
                    if new_admin:
                        new_admin.branch_id = branch_id

        for key, value in update_data.items():
            setattr(branch, key, value)

        branch.updated_by = updated_by
        branch = await self.repository.update(branch)
        return await self._enrich_branch_response(branch)

    async def delete_branch(self, branch_id: str) -> bool:
        """
        Delete a branch with dependency checks.

        SECURITY: Prevents deletion of branches with dependent records
        to avoid orphaned data.
        """
        branch = await self.repository.get_by_id(branch_id)
        if not branch:
            raise NotFoundError("Branch", branch_id)

        # Check for dependent users
        user_count = await self.db.execute(
            select(func.count(User.id)).where(User.branch_id == branch_id)
        )
        user_count = user_count.scalar() or 0
        if user_count > 0:
            raise ConflictError(
                f"Cannot delete branch: {user_count} user(s) are assigned to this branch. "
                "Please reassign or remove users first."
            )

        # Check for dependent assets
        asset_count = await self.db.execute(
            select(func.count(Asset.id)).where(Asset.branch_id == branch_id)
        )
        asset_count = asset_count.scalar() or 0
        if asset_count > 0:
            raise ConflictError(
                f"Cannot delete branch: {asset_count} asset(s) belong to this branch. "
                "Please move or delete assets first."
            )

        # Check for dependent batches
        batch_count = await self.db.execute(
            select(func.count(Batch.id)).where(Batch.branch_id == branch_id)
        )
        batch_count = batch_count.scalar() or 0
        if batch_count > 0:
            raise ConflictError(
                f"Cannot delete branch: {batch_count} batch(es) belong to this branch. "
                "Please move or delete batches first."
            )

        return await self.repository.delete(branch_id)

    async def bulk_create_branches(
        self, bulk_data: BranchBulkCreate, created_by: str
    ) -> Tuple[List[BranchResponse], List[dict]]:
        """Bulk create branches with optional IT admin assignment by email."""
        if not bulk_data.enterprise_id:
            raise ValidationError("Enterprise ID is required")

        created_branches = []
        errors = []

        for idx, item in enumerate(bulk_data.branches):
            try:
                # Check for duplicate branch code
                existing = await self.repository.get_by_code(
                    bulk_data.enterprise_id, item.branch_code
                )
                if existing:
                    errors.append(
                        {
                            "index": idx,
                            "error": f"Branch code '{item.branch_code}' already exists",
                        }
                    )
                    continue

                # Resolve IT admin by email if provided.
                # If no email is given, the branch is created with needs_admin status.
                # If an email is given but no matching user is found, that is an error.
                it_admin_id = None
                if item.it_admin_email:
                    result = await self.db.execute(
                        select(User).where(
                            User.email == item.it_admin_email,
                            User.enterprise_id == bulk_data.enterprise_id,
                        )
                    )
                    admin = result.scalar_one_or_none()
                    if admin:
                        it_admin_id = admin.id
                    else:
                        errors.append(
                            {
                                "index": idx,
                                "error": f"IT admin with email '{item.it_admin_email}' not found in this enterprise",
                            }
                        )
                        continue

                # Set status based on whether an IT admin is assigned
                branch_status = (
                    BranchStatus.ACTIVE.value if it_admin_id else BranchStatus.NEEDS_ADMIN.value
                )

                branch = Branch(
                    id=str(uuid4()),
                    enterprise_id=bulk_data.enterprise_id,
                    branch_name=item.branch_name,
                    branch_code=item.branch_code,
                    address_line1=item.address_line1,
                    address_line2=item.address_line2,
                    city=item.city,
                    state=item.state,
                    pin_code=item.pin_code,
                    pickup_point_description=item.pickup_point_description,
                    site_contact_person=item.site_contact_person,
                    site_contact_phone=item.site_contact_phone,
                    operating_hours=item.operating_hours,
                    special_instructions=item.special_instructions,
                    it_admin_id=it_admin_id,
                    status=branch_status,
                    created_by=created_by,
                    updated_by=created_by,
                )
                self.db.add(branch)
                await self.db.flush()
                created_branches.append(branch)

            except Exception as e:
                errors.append({"index": idx, "error": str(e)})

        if created_branches:
            await self.db.commit()
            # Refresh each branch after commit so ORM attributes are not expired
            # when _enrich_branches_batch accesses them (prevents greenlet_spawn crash).
            for branch in created_branches:
                await self.db.refresh(branch)

        # Use batch enrichment to avoid N+1 queries
        enriched = await self._enrich_branches_batch(created_branches)
        return enriched, errors

    async def get_branches_summary(self, enterprise_id: str) -> List[Dict[str, Any]]:
        """
        Get branch summary with aggregated statistics for an enterprise.

        Returns each branch with asset counts and IT admin count.

        Args:
            enterprise_id: Enterprise ID to fetch branches for

        Returns:
            List of branch dictionaries with aggregated statistics
        """
        # Query branches for this enterprise
        branches_query = (
            select(Branch).where(Branch.enterprise_id == enterprise_id).order_by(Branch.branch_name)
        )
        branches_result = await self.db.execute(branches_query)
        branches = branches_result.scalars().all()

        # Get asset counts per branch
        asset_counts_query = (
            select(
                Asset.branch_id,
                func.count(Asset.id).label("total"),
                func.count(Asset.id)
                .filter(
                    Asset.status.in_(
                        [
                            "pending_assignment",
                            "assigned",
                            "check_in_started",
                            "submitted",
                            "remote_review",
                            "conditionally_accepted",
                            "disputed",
                        ]
                    )
                )
                .label("pending"),
                func.count(Asset.id)
                .filter(
                    Asset.status.in_(
                        [
                            "final_accepted",
                            "payout_pending",
                            "completed",
                        ]
                    )
                )
                .label("completed"),
            )
            .where(Asset.enterprise_id == enterprise_id)
            .where(Asset.branch_id.isnot(None))
            .group_by(Asset.branch_id)
        )
        asset_result = await self.db.execute(asset_counts_query)
        asset_counts = {row.branch_id: row for row in asset_result}

        # Get batch counts per branch
        batch_counts_query = (
            select(
                Batch.branch_id,
                func.count(Batch.id).label("total"),
                func.count(Batch.id)
                .filter(
                    Batch.status.in_(
                        [
                            "draft",
                            "pending_approval",
                            "approved",
                            "pickup_in_progress",
                        ]
                    )
                )
                .label("active"),
            )
            .where(Batch.enterprise_id == enterprise_id)
            .where(Batch.branch_id.isnot(None))
            .group_by(Batch.branch_id)
        )
        batch_result = await self.db.execute(batch_counts_query)
        batch_counts = {row.branch_id: row for row in batch_result}

        # Build response
        data = []
        for branch in branches:
            ac = asset_counts.get(branch.id)
            bc = batch_counts.get(branch.id)
            data.append(
                {
                    "id": branch.id,
                    "branch_id": branch.id,
                    "enterprise_id": branch.enterprise_id,
                    "branch_name": branch.branch_name,
                    "branch_code": branch.branch_code,
                    "city": branch.city,
                    "state": branch.state,
                    "status": branch.status,
                    "it_admin_count": 1 if branch.it_admin_id else 0,
                    "asset_count": ac.total if ac else 0,
                    "pending_assets": ac.pending if ac else 0,
                    "completed_assets": ac.completed if ac else 0,
                    "total_batch_count": bc.total if bc else 0,
                    "active_batch_count": bc.active if bc else 0,
                }
            )

        return data

    async def preview_deactivation(self, branch_id: str) -> dict:
        """Preview what will happen when a branch is deactivated."""
        branch = await self.repository.get_by_id(branch_id)
        if not branch:
            raise NotFoundError("Branch", branch_id)

        # Count employees (sub_user role, active status)
        from app.models.user import UserRole, UserStatus
        employee_result = await self.db.execute(
            select(func.count(User.id)).where(
                User.branch_id == branch_id,
                User.role == UserRole.EMPLOYEE.value,
                User.status == UserStatus.ACTIVE.value,
            )
        )
        employee_count = employee_result.scalar() or 0

        # Count assets
        asset_result = await self.db.execute(
            select(func.count(Asset.id)).where(Asset.branch_id == branch_id)
        )
        asset_count = asset_result.scalar() or 0

        # Count active batches (non-terminal statuses)
        terminal_statuses = ['completed', 'cancelled']
        batch_result = await self.db.execute(
            select(func.count(Batch.id)).where(
                Batch.branch_id == branch_id,
                Batch.status.notin_(terminal_statuses),
            )
        )
        active_batch_count = batch_result.scalar() or 0

        # Check IT admin
        it_admin_name = None
        it_admin_has_other_branches = False
        if branch.it_admin_id:
            admin_result = await self.db.execute(select(User).where(User.id == branch.it_admin_id))
            admin = admin_result.scalar_one_or_none()
            if admin:
                it_admin_name = admin.name

            # Check if IT admin has other active branches
            other_branches_result = await self.db.execute(
                select(func.count(Branch.id)).where(
                    Branch.it_admin_id == branch.it_admin_id,
                    Branch.id != branch_id,
                    Branch.status == BranchStatus.ACTIVE.value,
                )
            )
            it_admin_has_other_branches = (other_branches_result.scalar() or 0) > 0

        # Determine if safe to deactivate
        can_deactivate = employee_count == 0 and asset_count == 0
        blocking_reasons = []
        if employee_count > 0:
            blocking_reasons.append(f"{employee_count} active employee(s) assigned to this branch")
        if asset_count > 0:
            blocking_reasons.append(f"{asset_count} asset(s) belong to this branch")
        if active_batch_count > 0:
            blocking_reasons.append(f"{active_batch_count} active batch(es) in progress")

        return {
            "branch_id": branch_id,
            "branch_name": branch.branch_name,
            "employee_count": employee_count,
            "asset_count": asset_count,
            "active_batch_count": active_batch_count,
            "it_admin_name": it_admin_name,
            "it_admin_has_other_branches": it_admin_has_other_branches,
            "can_deactivate": can_deactivate,
            "blocking_reasons": blocking_reasons,
        }

    async def transfer_dependents(
        self, branch_id: str, target_branch_id: str,
        transfer_employees: bool, transfer_assets: bool, updated_by: str
    ) -> dict:
        """Transfer employees and/or assets from one branch to another."""
        from app.models.user import UserRole, UserStatus

        # Validate source branch
        source = await self.repository.get_by_id(branch_id)
        if not source:
            raise NotFoundError("Branch", branch_id)

        # Validate target branch
        target = await self.repository.get_by_id(target_branch_id)
        if not target:
            raise NotFoundError("Target branch", target_branch_id)
        if target.enterprise_id != source.enterprise_id:
            raise ValidationError("Target branch must belong to the same enterprise")
        if target.status != BranchStatus.ACTIVE.value:
            raise ValidationError("Target branch must be active")

        employees_transferred = 0
        assets_transferred = 0
        assets_skipped = 0
        skipped_details = []

        if transfer_employees:
            # Get active employees in source branch
            emp_result = await self.db.execute(
                select(User).where(
                    User.branch_id == branch_id,
                    User.role == UserRole.EMPLOYEE.value,
                    User.status == UserStatus.ACTIVE.value,
                )
            )
            employees = emp_result.scalars().all()
            for emp in employees:
                emp.branch_id = target_branch_id
                emp.updated_by = updated_by
                employees_transferred += 1

        if transfer_assets:
            # Assets in safe statuses can be transferred
            in_flight_statuses = [
                'submitted', 'remote_review', 'conditionally_accepted',
                'pickup_requested', 'pickup_scheduled', 'picked_up',
                'in_transit', 'facility_qc',
            ]
            asset_result = await self.db.execute(
                select(Asset).where(Asset.branch_id == branch_id)
            )
            assets = asset_result.scalars().all()
            for asset in assets:
                if asset.status in in_flight_statuses:
                    assets_skipped += 1
                    skipped_details.append({
                        "asset_id": asset.id,
                        "serial_number": getattr(asset, 'serial_number', None),
                        "status": asset.status,
                        "reason": f"Asset is in '{asset.status}' status and cannot be transferred"
                    })
                else:
                    asset.branch_id = target_branch_id
                    asset.updated_by = updated_by
                    assets_transferred += 1

        # Update draft batches that now have zero remaining assets in source branch
        batches_updated = 0
        if transfer_assets and assets_transferred > 0:
            draft_batches_result = await self.db.execute(
                select(Batch).where(
                    Batch.branch_id == branch_id,
                    Batch.status == 'draft',
                )
            )
            draft_batches = draft_batches_result.scalars().all()
            for batch in draft_batches:
                # Check if any assets still remain in this batch under the source branch
                remaining = await self.db.execute(
                    select(func.count(Asset.id)).where(
                        Asset.batch_id == batch.id,
                        Asset.branch_id == branch_id,
                    )
                )
                if (remaining.scalar() or 0) == 0:
                    batch.branch_id = target_branch_id
                    batch.updated_by = updated_by
                    batches_updated += 1

        if employees_transferred > 0 or assets_transferred > 0:
            await self.db.commit()

        return {
            "employees_transferred": employees_transferred,
            "assets_transferred": assets_transferred,
            "assets_skipped": assets_skipped,
            "skipped_details": skipped_details,
            "batches_updated": batches_updated,
        }

    async def bulk_delete_dependents(
        self, branch_id: str, delete_employees: bool, delete_assets: bool, deleted_by: str
    ) -> dict:
        """Soft-deactivate employees and/or delete unassigned assets in a branch."""
        from app.models.user import UserRole, UserStatus

        branch = await self.repository.get_by_id(branch_id)
        if not branch:
            raise NotFoundError("Branch", branch_id)

        employees_deactivated = 0
        assets_deleted = 0
        assets_skipped = 0

        if delete_employees:
            emp_result = await self.db.execute(
                select(User).where(
                    User.branch_id == branch_id,
                    User.role == UserRole.EMPLOYEE.value,
                    User.status == UserStatus.ACTIVE.value,
                )
            )
            employees = emp_result.scalars().all()
            for emp in employees:
                emp.status = UserStatus.INACTIVE.value
                emp.branch_id = None
                emp.updated_by = deleted_by
                employees_deactivated += 1

        if delete_assets:
            # Unlink assets in pending_assignment status from this branch (soft removal).
            # Assets in other statuses are skipped — they're in-flight and must be handled
            # through the normal workflow.
            asset_result = await self.db.execute(
                select(Asset).where(Asset.branch_id == branch_id)
            )
            assets = asset_result.scalars().all()
            for asset in assets:
                if asset.status == 'pending_assignment':
                    asset.branch_id = None
                    asset.updated_by = deleted_by
                    assets_deleted += 1
                else:
                    assets_skipped += 1

        if employees_deactivated > 0 or assets_deleted > 0:
            await self.db.commit()

        return {
            "employees_deactivated": employees_deactivated,
            "assets_deleted": assets_deleted,
            "assets_skipped": assets_skipped,
        }
