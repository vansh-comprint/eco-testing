"""Repository for Dispute database operations"""

from typing import Optional, List, Tuple
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Dispute, DisputeStatus
from app.repositories.base import BaseRepository


class DisputeRepository(BaseRepository[Dispute]):
    """Repository for Dispute CRUD operations"""

    def __init__(self, session: AsyncSession):
        super().__init__(Dispute, session)

    async def list_with_filters(
        self,
        enterprise_id: Optional[str] = None,
        branch_ids: Optional[List[str]] = None,
        raised_by_user_id: Optional[str] = None,
        assigned_to_user_id: Optional[str] = None,
        status: Optional[str] = None,
        resolution: Optional[str] = None,
        dispute_type: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[Dispute], int]:
        """List disputes with filters"""
        from app.models import Asset

        # Join with Asset for enterprise/branch filtering or search
        needs_asset_join = enterprise_id or branch_ids or search
        if needs_asset_join:
            base_query = select(Dispute).join(Asset, Dispute.asset_id == Asset.id)
        else:
            base_query = select(Dispute)
        conditions = []

        if enterprise_id:
            conditions.append(Asset.enterprise_id == enterprise_id)
        if branch_ids:
            conditions.append(Asset.branch_id.in_(branch_ids))
        if raised_by_user_id:
            conditions.append(Dispute.raised_by_user_id == raised_by_user_id)
        if assigned_to_user_id:
            conditions.append(Dispute.assigned_to_user_id == assigned_to_user_id)
        if status:
            conditions.append(Dispute.status == status)
        if resolution:
            conditions.append(Dispute.resolution == resolution)
        if dispute_type:
            conditions.append(Dispute.dispute_type == dispute_type)
        if search:
            pattern = f"%{search}%"
            conditions.append(or_(
                Asset.serial_number.ilike(pattern),
                Asset.brand.ilike(pattern),
                Asset.model.ilike(pattern),
                Dispute.description.ilike(pattern),
                Dispute.dispute_type.ilike(pattern),
            ))

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

