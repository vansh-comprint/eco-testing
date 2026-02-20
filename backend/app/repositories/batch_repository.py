"""Batch repository for database operations"""

from typing import Optional, List, Tuple
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.batch import Batch, BatchStatus


class BatchRepository:
    """Repository for Batch database operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, batch_id: str) -> Optional[Batch]:
        """Get batch by ID"""
        result = await self.db.execute(select(Batch).where(Batch.id == batch_id))
        return result.scalar_one_or_none()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        enterprise_id: Optional[str] = None,
        branch_id: Optional[str] = None,
        branch_ids: Optional[List[str]] = None,
        status: Optional[BatchStatus] = None,
        statuses: Optional[List[str]] = None,
        created_by: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[Batch], int]:
        """Get all batches with filters and pagination"""
        query = select(Batch)
        count_query = select(func.count(Batch.id))

        # Apply filters
        if enterprise_id:
            query = query.where(Batch.enterprise_id == enterprise_id)
            count_query = count_query.where(Batch.enterprise_id == enterprise_id)

        # branch_ids (plural) takes precedence — multi-branch IT Admin scoping
        if branch_ids:
            query = query.where(Batch.branch_id.in_(branch_ids))
            count_query = count_query.where(Batch.branch_id.in_(branch_ids))
        elif branch_id:
            query = query.where(Batch.branch_id == branch_id)
            count_query = count_query.where(Batch.branch_id == branch_id)

        if statuses:
            query = query.where(Batch.status.in_(statuses))
            count_query = count_query.where(Batch.status.in_(statuses))
        elif status:
            query = query.where(Batch.status == status.value)
            count_query = count_query.where(Batch.status == status.value)

        if created_by:
            query = query.where(Batch.created_by == created_by)
            count_query = count_query.where(Batch.created_by == created_by)

        if search:
            search_filter = or_(
                Batch.name.ilike(f"%{search}%"),
                Batch.description.ilike(f"%{search}%"),
            )
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)

        # Get total count
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply pagination and ordering
        query = query.order_by(Batch.created_at.desc()).offset(skip).limit(limit)

        result = await self.db.execute(query)
        batches = list(result.scalars().all())

        return batches, total

    async def get_pending_approval(
        self,
        enterprise_id: Optional[str] = None,
        branch_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[Batch], int]:
        """Get batches pending Org Admin approval"""
        query = select(Batch).where(Batch.status == BatchStatus.PENDING_APPROVAL.value)
        count_query = select(func.count(Batch.id)).where(
            Batch.status == BatchStatus.PENDING_APPROVAL.value
        )

        if enterprise_id:
            query = query.where(Batch.enterprise_id == enterprise_id)
            count_query = count_query.where(Batch.enterprise_id == enterprise_id)

        if branch_id:
            query = query.where(Batch.branch_id == branch_id)
            count_query = count_query.where(Batch.branch_id == branch_id)

        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        query = query.order_by(Batch.submitted_for_approval_at.desc()).offset(skip).limit(limit)

        result = await self.db.execute(query)
        batches = list(result.scalars().all())

        return batches, total

    async def create(self, batch: Batch) -> Batch:
        """Create a new batch"""
        self.db.add(batch)
        await self.db.commit()
        await self.db.refresh(batch)
        return batch

    async def update(self, batch: Batch) -> Batch:
        """Update a batch"""
        await self.db.commit()
        await self.db.refresh(batch)
        return batch

    async def delete(self, batch_id: str) -> bool:
        """Delete a batch"""
        batch = await self.get_by_id(batch_id)
        if batch:
            await self.db.delete(batch)
            await self.db.commit()
            return True
        return False

    async def count_by_enterprise(self, enterprise_id: str) -> int:
        """Count batches by enterprise"""
        result = await self.db.execute(
            select(func.count(Batch.id)).where(Batch.enterprise_id == enterprise_id)
        )
        return result.scalar() or 0

