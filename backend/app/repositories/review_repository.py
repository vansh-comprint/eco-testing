"""Repository for Review database operations"""

from typing import Optional, List, Tuple
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import RemoteReview, FacilityQC, Asset
from app.models.support import OnSiteQC
from app.repositories.base import BaseRepository


class RemoteReviewRepository(BaseRepository[RemoteReview]):
    """Repository for RemoteReview CRUD operations"""

    def __init__(self, session: AsyncSession):
        super().__init__(RemoteReview, session)

    async def get_by_asset_id(self, asset_id: str) -> Optional[RemoteReview]:
        """Get review by asset ID"""
        result = await self.session.execute(
            select(RemoteReview).where(RemoteReview.asset_id == asset_id)
        )
        return result.scalar_one_or_none()

    async def get_by_submission_id(self, submission_id: str) -> Optional[RemoteReview]:
        """Get review by submission ID"""
        result = await self.session.execute(
            select(RemoteReview).where(RemoteReview.submission_id == submission_id)
        )
        return result.scalar_one_or_none()

    async def list_with_filters(
        self,
        enterprise_id: Optional[str] = None,
        reviewer_id: Optional[str] = None,
        decision: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[RemoteReview], int]:
        """List reviews with filters"""
        base_query = select(RemoteReview).join(Asset, RemoteReview.asset_id == Asset.id)
        conditions = []

        if enterprise_id:
            conditions.append(Asset.enterprise_id == enterprise_id)
        if reviewer_id:
            conditions.append(RemoteReview.reviewer_id == reviewer_id)
        if decision:
            conditions.append(RemoteReview.decision == decision)

        if conditions:
            base_query = base_query.where(and_(*conditions))

        count_query = select(func.count()).select_from(base_query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar() or 0

        query = base_query.order_by(RemoteReview.reviewed_at.desc()).offset(skip).limit(limit)
        result = await self.session.execute(query)
        return list(result.scalars().all()), total


class FacilityQCRepository(BaseRepository[FacilityQC]):
    """Repository for FacilityQC CRUD operations"""

    def __init__(self, session: AsyncSession):
        super().__init__(FacilityQC, session)

    async def get_by_asset_id(self, asset_id: str) -> Optional[FacilityQC]:
        """Get QC by asset ID"""
        result = await self.session.execute(
            select(FacilityQC).where(FacilityQC.asset_id == asset_id)
        )
        return result.scalar_one_or_none()

    async def list_with_filters(
        self,
        enterprise_id: Optional[str] = None,
        technician_id: Optional[str] = None,
        decision: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[FacilityQC], int]:
        """List QC records with filters"""
        base_query = select(FacilityQC).join(Asset, FacilityQC.asset_id == Asset.id)
        conditions = []

        if enterprise_id:
            conditions.append(Asset.enterprise_id == enterprise_id)
        if technician_id:
            conditions.append(FacilityQC.technician_id == technician_id)
        if decision:
            conditions.append(FacilityQC.decision == decision)

        if conditions:
            base_query = base_query.where(and_(*conditions))

        count_query = select(func.count()).select_from(base_query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar() or 0

        query = base_query.order_by(FacilityQC.qc_completed_at.desc()).offset(skip).limit(limit)
        result = await self.session.execute(query)
        return list(result.scalars().all()), total


class OnSiteQCRepository(BaseRepository[OnSiteQC]):
    """Repository for OnSiteQC CRUD operations"""

    def __init__(self, session: AsyncSession):
        super().__init__(OnSiteQC, session)

    async def get_by_asset_id(self, asset_id: str) -> Optional[OnSiteQC]:
        """Get QC by asset ID"""
        result = await self.session.execute(
            select(OnSiteQC).where(OnSiteQC.asset_id == asset_id)
        )
        return result.scalar_one_or_none()

    async def get_by_pickup_request(self, pickup_request_id: str) -> List[OnSiteQC]:
        """Get all QC records for a pickup request"""
        result = await self.session.execute(
            select(OnSiteQC).where(OnSiteQC.pickup_request_id == pickup_request_id)
        )
        return list(result.scalars().all())

    async def list_with_filters(
        self,
        enterprise_id: Optional[str] = None,
        performed_by_user_id: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[OnSiteQC], int]:
        """List QC records with filters"""
        base_query = select(OnSiteQC).join(Asset, OnSiteQC.asset_id == Asset.id)
        conditions = []

        if enterprise_id:
            conditions.append(Asset.enterprise_id == enterprise_id)
        if performed_by_user_id:
            conditions.append(OnSiteQC.performed_by_user_id == performed_by_user_id)
        if status:
            conditions.append(OnSiteQC.status == status)

        if conditions:
            base_query = base_query.where(and_(*conditions))

        count_query = select(func.count()).select_from(base_query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar() or 0

        query = base_query.order_by(OnSiteQC.performed_at.desc()).offset(skip).limit(limit)
        result = await self.session.execute(query)
        return list(result.scalars().all()), total

