"""Repository for Dispute database operations"""

from typing import Optional, List, Tuple
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Dispute, DisputeStatus
from app.repositories.base import BaseRepository


class DisputeRepository(BaseRepository[Dispute]):
    """Repository for Dispute CRUD operations"""

    def __init__(self, session: AsyncSession):
        super().__init__(Dispute, session)

    async def list_with_filters(
        self,
        raised_by_user_id: Optional[str] = None,
        assigned_to_user_id: Optional[str] = None,
        status: Optional[str] = None,
        dispute_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[Dispute], int]:
        """List disputes with filters"""
        base_query = select(Dispute)
        conditions = []

        if raised_by_user_id:
            conditions.append(Dispute.raised_by_user_id == raised_by_user_id)
        if assigned_to_user_id:
            conditions.append(Dispute.assigned_to_user_id == assigned_to_user_id)
        if status:
            conditions.append(Dispute.status == status)
        if dispute_type:
            conditions.append(Dispute.dispute_type == dispute_type)

        if conditions:
            base_query = base_query.where(and_(*conditions))

        count_query = select(func.count()).select_from(base_query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar() or 0

        query = base_query.order_by(Dispute.created_at.desc()).offset(skip).limit(limit)
        result = await self.session.execute(query)
        return list(result.scalars().all()), total

    async def get_by_asset_id(self, asset_id: str) -> List[Dispute]:
        """Get all disputes for an asset"""
        result = await self.session.execute(
            select(Dispute)
            .where(Dispute.asset_id == asset_id)
            .order_by(Dispute.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_open_disputes(
        self,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[Dispute], int]:
        """Get all open disputes"""
        open_statuses = [DisputeStatus.OPEN.value, DisputeStatus.UNDER_REVIEW.value]
        base_query = select(Dispute).where(Dispute.status.in_(open_statuses))

        count_query = select(func.count()).select_from(base_query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar() or 0

        query = base_query.order_by(Dispute.created_at.asc()).offset(skip).limit(limit)
        result = await self.session.execute(query)
        return list(result.scalars().all()), total

