"""Service layer for Submission business logic"""

import uuid
from datetime import datetime, timezone
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Submission, AssetStatus, User, UserRole
from app.repositories.submission_repository import SubmissionRepository
from app.repositories.asset_repository import AssetRepository
from app.schemas.submission import SubmissionCreate, SubmissionUpdate


class SubmissionService:
    """Service for handling submission business logic"""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = SubmissionRepository(session)
        self.asset_repo = AssetRepository(session)

    async def create_submission(
        self,
        data: SubmissionCreate,
        user: User,
    ) -> Submission:
        """Create a new submission for an asset"""
        # Verify asset exists and is assigned to this user
        asset = await self.asset_repo.get_by_id(data.asset_id)
        if not asset:
            raise ValueError("Asset not found")

        # Only employees can submit, and only for their assigned assets
        if user.role == UserRole.EMPLOYEE.value:
            if asset.assigned_to_user_id != user.id:
                raise ValueError("You can only submit for assets assigned to you")

        # Check if submission already exists for this asset
        existing = await self.repo.get_by_asset_id(data.asset_id)
        if existing:
            raise ValueError("Submission already exists for this asset")

        # Verify asset is in correct status
        valid_statuses = [AssetStatus.CHECK_IN_STARTED.value, AssetStatus.ASSIGNED.value]
        if asset.status not in valid_statuses:
            raise ValueError(f"Asset must be in {valid_statuses} status to submit")

        # Create submission
        submission = Submission(
            id=f"sub-{uuid.uuid4()}",
            asset_id=data.asset_id,
            user_id=user.id,
            device_confirmed=data.device_confirmed,
            photos=data.photos or {},
            functional_checks=data.functional_checks or {},
            cosmetic_checklist=data.cosmetic_checklist,
            accessories=data.accessories,
            location=data.location,
            declaration=data.declaration,
            submitted_at=datetime.now(timezone.utc),
        )

        await self.repo.create(submission)

        # Update asset status to submitted
        asset.status = AssetStatus.SUBMITTED.value
        await self.session.flush()

        return submission

    async def get_submission(self, submission_id: str) -> Optional[Submission]:
        """Get a submission by ID"""
        return await self.repo.get_by_id(submission_id)

    async def get_by_asset(self, asset_id: str) -> Optional[Submission]:
        """Get submission for an asset"""
        return await self.repo.get_by_asset_id(asset_id)

    async def update_submission(
        self,
        submission_id: str,
        data: SubmissionUpdate,
        user: User,
    ) -> Optional[Submission]:
        """Update a submission"""
        submission = await self.repo.get_by_id(submission_id)
        if not submission:
            return None

        # Only the submitter or admins can update
        if user.role == UserRole.EMPLOYEE.value and submission.user_id != user.id:
            raise ValueError("You can only update your own submissions")

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if value is not None:
                setattr(submission, key, value)

        await self.session.flush()
        return submission

    async def delete_submission(self, submission_id: str, user: User) -> bool:
        """Delete a submission (admin only)"""
        if user.role not in [UserRole.SUPER_ADMIN.value, UserRole.OPS_ADMIN.value]:
            raise ValueError("Only admins can delete submissions")

        return await self.repo.delete(submission_id)

    async def list_submissions(
        self,
        user: User,
        enterprise_id: Optional[str] = None,
        branch_id: Optional[str] = None,
        user_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[Submission], int]:
        """
        List submissions with role-based filtering.

        SECURITY: Enforces multi-tenant scoping based on user role.
        Logistics users cannot see submissions - they only see pickups.
        """
        # SECURITY: Block logistics users from arbitrary access
        if user.role in [UserRole.LOGISTICS_ADMIN.value, UserRole.LOGISTICS_USER.value]:
            # Logistics users should not have access to submissions list
            # They access assets through pickup requests
            raise ValueError(
                "Logistics users cannot access submissions directly. "
                "Use pickup requests to access assigned assets."
            )

        # Apply role-based scoping - IGNORE user-provided enterprise_id
        if user.role == UserRole.EMPLOYEE.value:
            user_id = user.id
            enterprise_id = None
            branch_id = None
        elif user.role == UserRole.IT_ADMIN.value:
            enterprise_id = user.enterprise_id
            branch_id = user.branch_id
        elif user.role == UserRole.ORG_ADMIN.value:
            enterprise_id = user.enterprise_id
            branch_id = branch_id  # Org admin can filter by branch within their enterprise
        # Super Admin and OPS Admin can see all

        return await self.repo.list_with_filters(
            enterprise_id=enterprise_id,
            branch_id=branch_id,
            user_id=user_id,
            skip=skip,
            limit=limit,
        )

    async def get_pending_review(
        self,
        user: User,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[Submission], int]:
        """Get submissions pending remote review"""
        enterprise_id = None
        if user.role not in [UserRole.SUPER_ADMIN.value, UserRole.OPS_ADMIN.value]:
            enterprise_id = user.enterprise_id

        return await self.repo.get_pending_review(
            enterprise_id=enterprise_id,
            skip=skip,
            limit=limit,
        )

