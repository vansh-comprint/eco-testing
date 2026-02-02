"""Branch service for business logic"""

from typing import Optional, List, Tuple
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload

from app.models.enterprise import Branch, BranchStatus
from app.models.user import User
from app.models.asset import Asset
from app.models.batch import Batch
from app.repositories.branch_repository import BranchRepository
from app.schemas.branch import BranchCreate, BranchUpdate, BranchResponse, BranchBulkCreate, ITAdminInfo
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
                result = await self.db.execute(
                    select(User).where(User.id == branch.it_admin_id)
                )
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

    async def get_branch(self, branch_id: str) -> BranchResponse:
        """Get branch by ID with eager-loaded IT admin."""
        result = await self.db.execute(
            select(Branch)
            .options(joinedload(Branch.it_admin))
            .where(Branch.id == branch_id)
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
        enriched = [await self._enrich_branch_response(b) for b in branches]
        return enriched, total

    async def create_branch(
        self, branch_data: BranchCreate, created_by: str
    ) -> BranchResponse:
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
            status=BranchStatus.ACTIVE.value,
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

        # Check for branch code conflict if updating
        if "branch_code" in update_data:
            existing = await self.repository.get_by_code(
                branch.enterprise_id, update_data["branch_code"]
            )
            if existing and existing.id != branch_id:
                raise ConflictError(
                    f"Branch with code {update_data['branch_code']} already exists"
                )

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
                    errors.append({
                        "index": idx,
                        "error": f"Branch code '{item.branch_code}' already exists",
                    })
                    continue

                # Resolve IT admin by email if provided
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
                        errors.append({
                            "index": idx,
                            "error": f"IT admin with email '{item.it_admin_email}' not found",
                        })
                        continue

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
                    status=BranchStatus.ACTIVE.value,
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

        enriched = [await self._enrich_branch_response(b) for b in created_branches]
        return enriched, errors

