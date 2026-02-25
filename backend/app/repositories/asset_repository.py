"""Asset repository for database operations"""

from datetime import datetime
from typing import Optional, List, Tuple, Dict
from sqlalchemy import select, func, or_, case
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

    async def get_by_serial_number(self, serial_number: str, enterprise_id: str | None = None) -> Optional[Asset]:
        """Get asset by serial number, optionally scoped to an enterprise"""
        query = select(Asset).where(Asset.serial_number == serial_number)
        if enterprise_id:
            query = query.where(Asset.enterprise_id == enterprise_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        enterprise_id: Optional[str] = None,
        branch_id: Optional[str] = None,
        branch_ids: Optional[List[str]] = None,
        batch_id: Optional[str] = None,
        status: Optional[AssetStatus] = None,
        statuses: Optional[List[str]] = None,
        assigned_to_user_id: Optional[str] = None,
        search: Optional[str] = None,
        sort_by: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> Tuple[List[Asset], int, float]:
        """Get all assets with filters and pagination. Returns (assets, total_count, total_value)."""
        query = select(Asset)
        count_query = select(func.count(Asset.id))
        value_query = select(func.coalesce(func.sum(func.coalesce(Asset.final_price, Asset.base_price)), 0))

        # Apply filters to all queries
        if enterprise_id:
            query = query.where(Asset.enterprise_id == enterprise_id)
            count_query = count_query.where(Asset.enterprise_id == enterprise_id)
            value_query = value_query.where(Asset.enterprise_id == enterprise_id)

        # branch_ids (plural) takes precedence — multi-branch IT Admin scoping
        if branch_ids:
            query = query.where(Asset.branch_id.in_(branch_ids))
            count_query = count_query.where(Asset.branch_id.in_(branch_ids))
            value_query = value_query.where(Asset.branch_id.in_(branch_ids))
        elif branch_id:
            query = query.where(Asset.branch_id == branch_id)
            count_query = count_query.where(Asset.branch_id == branch_id)
            value_query = value_query.where(Asset.branch_id == branch_id)

        if batch_id:
            query = query.where(Asset.batch_id == batch_id)
            count_query = count_query.where(Asset.batch_id == batch_id)
            value_query = value_query.where(Asset.batch_id == batch_id)

        if statuses:
            query = query.where(Asset.status.in_(statuses))
            count_query = count_query.where(Asset.status.in_(statuses))
            value_query = value_query.where(Asset.status.in_(statuses))
        elif status:
            query = query.where(Asset.status == status.value)
            count_query = count_query.where(Asset.status == status.value)
            value_query = value_query.where(Asset.status == status.value)

        if assigned_to_user_id:
            query = query.where(Asset.assigned_to_user_id == assigned_to_user_id)
            count_query = count_query.where(Asset.assigned_to_user_id == assigned_to_user_id)
            value_query = value_query.where(Asset.assigned_to_user_id == assigned_to_user_id)

        if search:
            search_filter = or_(
                Asset.serial_number.ilike(f"%{search}%"),
                Asset.brand.ilike(f"%{search}%"),
                Asset.model.ilike(f"%{search}%"),
                Asset.asset_tag.ilike(f"%{search}%"),
            )
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)
            value_query = value_query.where(search_filter)

        if date_from:
            query = query.where(Asset.created_at >= date_from)
            count_query = count_query.where(Asset.created_at >= date_from)
            value_query = value_query.where(Asset.created_at >= date_from)

        if date_to:
            query = query.where(Asset.created_at <= date_to)
            count_query = count_query.where(Asset.created_at <= date_to)
            value_query = value_query.where(Asset.created_at <= date_to)

        # Get total count and total value
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        value_result = await self.db.execute(value_query)
        total_value = float(value_result.scalar() or 0)

        # Apply ordering
        sort_map = {
            "oldest": Asset.created_at.asc(),
            "serial": Asset.serial_number.asc(),
            "brand": Asset.brand.asc(),
            "value": func.coalesce(Asset.final_price, Asset.base_price, 0).desc(),
        }
        order_clause = sort_map.get(sort_by, Asset.created_at.desc())  # default: newest
        query = query.order_by(order_clause).offset(skip).limit(limit)

        # Eagerly load enterprise and branch for name display
        query = query.options(selectinload(Asset.enterprise), selectinload(Asset.branch))

        result = await self.db.execute(query)
        assets = list(result.scalars().all())

        return assets, total, total_value

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
