"""Repository for Submission database operations"""

from typing import Optional, List, Tuple
from datetime import datetime
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Submission
from app.repositories.base import BaseRepository


class SubmissionRepository(BaseRepository[Submission]):
    """Repository for Submission CRUD operations"""

    def __init__(self, session: AsyncSession):
        super().__init__(Submission, session)

    async def get_by_asset_id(self, asset_id: str) -> Optional[Submission]:
        """Get submission by asset ID (unique constraint)"""
        result = await self.session.execute(
            select(Submission).where(Submission.asset_id == asset_id)
        )
        return result.scalar_one_or_none()

    async def get_by_user_id(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[Submission], int]:
        """Get all submissions by a user"""
        base_query = select(Submission).where(Submission.user_id == user_id)

        # Get total count
        count_query = select(func.count()).select_from(base_query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar() or 0

        # Get paginated results
        query = base_query.order_by(Submission.submitted_at.desc()).offset(skip).limit(limit)
        result = await self.session.execute(query)
        return list(result.scalars().all()), total

    async def list_with_filters(
        self,
        enterprise_id: Optional[str] = None,
        branch_id: Optional[str] = None,
        branch_ids: Optional[List[str]] = None,
        user_id: Optional[str] = None,
        asset_id: Optional[str] = None,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[Submission], int]:
        """List submissions with filters and pagination"""
        from app.models import Asset

        # Build base query with join to Asset for enterprise/branch filtering
        base_query = select(Submission).join(Asset, Submission.asset_id == Asset.id)

        conditions = []

        if enterprise_id:
            conditions.append(Asset.enterprise_id == enterprise_id)
        if branch_ids:
            conditions.append(Asset.branch_id.in_(branch_ids))
        elif branch_id:
            conditions.append(Asset.branch_id == branch_id)
        if user_id:
            conditions.append(Submission.user_id == user_id)
        if asset_id:
            conditions.append(Submission.asset_id == asset_id)
        if from_date:
            conditions.append(Submission.submitted_at >= from_date)
        if to_date:
            conditions.append(Submission.submitted_at <= to_date)

        if conditions:
            base_query = base_query.where(and_(*conditions))

        # Get total count
        count_query = select(func.count()).select_from(base_query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar() or 0

        # Get paginated results
        query = base_query.order_by(Submission.submitted_at.desc()).offset(skip).limit(limit)
        result = await self.session.execute(query)
        return list(result.scalars().all()), total

    async def get_pending_review(
        self,
        enterprise_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[Submission], int]:
        """Get submissions that are pending remote review"""
        from app.models import Asset, RemoteReview

        # Submissions without a RemoteReview
        subquery = select(RemoteReview.submission_id)

        base_query = (
            select(Submission)
            .join(Asset, Submission.asset_id == Asset.id)
            .where(Submission.id.not_in(subquery))
        )

        if enterprise_id:
            base_query = base_query.where(Asset.enterprise_id == enterprise_id)

        # Get total count
        count_query = select(func.count()).select_from(base_query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar() or 0

        # Get paginated results
        query = base_query.order_by(Submission.submitted_at.asc()).offset(skip).limit(limit)
        result = await self.session.execute(query)
        return list(result.scalars().all()), total

