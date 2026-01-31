"""Asset repository for database operations"""

from typing import Optional, List, Tuple, Dict
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.asset import Asset, AssetStatus


class AssetRepository:
    """Repository for Asset database operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, asset_id: str) -> Optional[Asset]:
        """Get asset by ID with relationships"""
        result = await self.db.execute(
            select(Asset)
            .options(selectinload(Asset.enterprise), selectinload(Asset.branch))
            .where(Asset.id == asset_id)
        )
        return result.scalar_one_or_none()

    async def get_by_serial_number(self, serial_number: str) -> Optional[Asset]:
        """Get asset by serial number"""
        result = await self.db.execute(select(Asset).where(Asset.serial_number == serial_number))
        return result.scalar_one_or_none()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        enterprise_id: Optional[str] = None,
        branch_id: Optional[str] = None,
        batch_id: Optional[str] = None,
        status: Optional[AssetStatus] = None,
        assigned_to_user_id: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[Asset], int]:
        """Get all assets with filters and pagination"""
        query = select(Asset)
        count_query = select(func.count(Asset.id))

        # Apply filters
        if enterprise_id:
            query = query.where(Asset.enterprise_id == enterprise_id)
            count_query = count_query.where(Asset.enterprise_id == enterprise_id)

        if branch_id:
            query = query.where(Asset.branch_id == branch_id)
            count_query = count_query.where(Asset.branch_id == branch_id)

        if batch_id:
            query = query.where(Asset.batch_id == batch_id)
            count_query = count_query.where(Asset.batch_id == batch_id)

        if status:
            query = query.where(Asset.status == status.value)
            count_query = count_query.where(Asset.status == status.value)

        if assigned_to_user_id:
            query = query.where(Asset.assigned_to_user_id == assigned_to_user_id)
            count_query = count_query.where(Asset.assigned_to_user_id == assigned_to_user_id)

        if search:
            search_filter = or_(
                Asset.serial_number.ilike(f"%{search}%"),
                Asset.brand.ilike(f"%{search}%"),
                Asset.model.ilike(f"%{search}%"),
                Asset.asset_tag.ilike(f"%{search}%"),
            )
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)

        # Get total count
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply pagination and ordering
        query = query.order_by(Asset.created_at.desc()).offset(skip).limit(limit)

        # Eagerly load enterprise and branch for name display
        query = query.options(selectinload(Asset.enterprise), selectinload(Asset.branch))

        result = await self.db.execute(query)
        assets = list(result.scalars().all())

        return assets, total

    async def create(self, asset: Asset) -> Asset:
        """Create a new asset"""
        self.db.add(asset)
        await self.db.commit()
        await self.db.refresh(asset)
        return asset

    async def create_bulk(self, assets: List[Asset]) -> List[Asset]:
        """Create multiple assets"""
        self.db.add_all(assets)
        await self.db.commit()
        for asset in assets:
            await self.db.refresh(asset)
        return assets

    async def update(self, asset: Asset) -> Asset:
        """Update an asset"""
        await self.db.commit()
        await self.db.refresh(asset)
        return asset

    async def delete(self, asset_id: str) -> bool:
        """Delete an asset"""
        asset = await self.get_by_id(asset_id)
        if asset:
            await self.db.delete(asset)
            await self.db.commit()
            return True
        return False

    async def count_by_enterprise(self, enterprise_id: str) -> int:
        """Count assets by enterprise"""
        result = await self.db.execute(
            select(func.count(Asset.id)).where(Asset.enterprise_id == enterprise_id)
        )
        return result.scalar() or 0

    async def count_by_batch(self, batch_id: str) -> int:
        """Count assets by batch"""
        result = await self.db.execute(
            select(func.count(Asset.id)).where(Asset.batch_id == batch_id)
        )
        return result.scalar() or 0

    async def get_asset_status_counts(self, batch_id: str) -> Dict[str, int]:
        """Get asset status counts for a single batch"""
        result = await self.db.execute(
            select(Asset.status, func.count(Asset.id))
            .where(Asset.batch_id == batch_id)
            .group_by(Asset.status)
        )
        return {row[0]: row[1] for row in result.all()}

    async def get_bulk_asset_status_counts(self, batch_ids: List[str]) -> Dict[str, Dict[str, int]]:
        """Get asset status counts for multiple batches (avoids N+1)"""
        if not batch_ids:
            return {}
        result = await self.db.execute(
            select(Asset.batch_id, Asset.status, func.count(Asset.id))
            .where(Asset.batch_id.in_(batch_ids))
            .group_by(Asset.batch_id, Asset.status)
        )
        counts: Dict[str, Dict[str, int]] = {}
        for batch_id, status, count in result.all():
            if batch_id not in counts:
                counts[batch_id] = {}
            counts[batch_id][status] = count
        return counts

    async def get_assets_by_batch_and_statuses(
        self, batch_id: str, statuses: List[str]
    ) -> List[Asset]:
        """Get all assets in a batch that have one of the given statuses"""
        result = await self.db.execute(
            select(Asset).where(
                Asset.batch_id == batch_id,
                Asset.status.in_(statuses),
            )
        )
        return list(result.scalars().all())
