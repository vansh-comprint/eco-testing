"""Repository for Pickup database operations"""

from uuid import uuid4
from typing import Optional, List, Tuple
from sqlalchemy import select, func, and_, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import PickupRequest, PickupStatus, PickupLocation
from app.models.enterprise import Branch
from app.repositories.base import BaseRepository


class PickupRepository(BaseRepository[PickupRequest]):
    """Repository for PickupRequest CRUD operations"""

    def __init__(self, session: AsyncSession):
        super().__init__(PickupRequest, session)

    async def get_by_batch_id(self, batch_id: str) -> Optional[PickupRequest]:
        """Get pickup request by batch ID"""
        result = await self.session.execute(
            select(PickupRequest).where(PickupRequest.batch_id == batch_id)
        )
        return result.scalar_one_or_none()

    async def list_with_filters(
        self,
        enterprise_id: Optional[str] = None,
        branch_ids: Optional[List[str]] = None,
        logistics_admin_id: Optional[str] = None,
        logistics_user_id: Optional[str] = None,
        status: Optional[str] = None,
        statuses: Optional[List[str]] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[PickupRequest], int]:
        """List pickup requests with filters"""
        from app.models.batch import Batch

        if branch_ids:
            base_query = select(PickupRequest).join(
                Batch, PickupRequest.batch_id == Batch.id
            )
        else:
            base_query = select(PickupRequest)
        conditions = []

        if enterprise_id:
            conditions.append(PickupRequest.enterprise_id == enterprise_id)
        if branch_ids:
            conditions.append(Batch.branch_id.in_(branch_ids))
        if logistics_admin_id:
            conditions.append(PickupRequest.logistics_admin_id == logistics_admin_id)
        if logistics_user_id:
            conditions.append(PickupRequest.logistics_user_id == logistics_user_id)
        if status:
            conditions.append(PickupRequest.status == status)
        if statuses:
            conditions.append(PickupRequest.status.in_(statuses))

        if conditions:
            base_query = base_query.where(and_(*conditions))

        count_query = select(func.count()).select_from(base_query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar() or 0

        query = base_query.order_by(PickupRequest.created_at.desc()).offset(skip).limit(limit)
        result = await self.session.execute(query)
        return list(result.scalars().all()), total

    async def get_pending_assignment(
        self,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[PickupRequest], int]:
        """Get pickups pending OPS admin assignment"""
        base_query = select(PickupRequest).where(
            PickupRequest.status == PickupStatus.PENDING.value
        )

        count_query = select(func.count()).select_from(base_query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar() or 0

        query = base_query.order_by(PickupRequest.created_at.asc()).offset(skip).limit(limit)
        result = await self.session.execute(query)
        return list(result.scalars().all()), total

    async def get_assigned_to_admin(
        self,
        logistics_admin_id: str,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[PickupRequest], int]:
        """Get pickups assigned to a logistics admin"""
        base_query = select(PickupRequest).where(
            and_(
                PickupRequest.logistics_admin_id == logistics_admin_id,
                PickupRequest.status == PickupStatus.ASSIGNED_TO_LOGISTICS_ADMIN.value,
            )
        )

        count_query = select(func.count()).select_from(base_query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar() or 0

        query = base_query.order_by(PickupRequest.assigned_at.desc()).offset(skip).limit(limit)
        result = await self.session.execute(query)
        return list(result.scalars().all()), total

    async def get_assigned_to_user(
        self,
        logistics_user_id: str,
        include_completed: bool = False,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[PickupRequest], int]:
        """Get pickups assigned to a logistics user"""
        conditions = [PickupRequest.logistics_user_id == logistics_user_id]

        if not include_completed:
            conditions.append(
                PickupRequest.status.in_([
                    PickupStatus.ASSIGNED_TO_LOGISTICS_USER.value,
                    PickupStatus.SCHEDULED.value,
                    PickupStatus.IN_PROGRESS.value,
                ])
            )

        base_query = select(PickupRequest).where(and_(*conditions))

        count_query = select(func.count()).select_from(base_query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar() or 0

        query = base_query.order_by(PickupRequest.scheduled_date.asc()).offset(skip).limit(limit)
        result = await self.session.execute(query)
        return list(result.scalars().all()), total


class PickupLocationRepository(BaseRepository[PickupLocation]):
    """Repository for PickupLocation CRUD operations"""

    def __init__(self, session: AsyncSession):
        super().__init__(PickupLocation, session)

    async def list_by_enterprise(
        self,
        enterprise_id: str,
        include_inactive: bool = False,
    ) -> Tuple[List[PickupLocation], int]:
        """List pickup locations for an enterprise"""
        conditions = [PickupLocation.enterprise_id == enterprise_id]

        if not include_inactive:
            conditions.append(PickupLocation.is_active.is_(True))

        base_query = select(PickupLocation).where(and_(*conditions))

        count_query = select(func.count()).select_from(base_query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar() or 0

        query = base_query.order_by(
            PickupLocation.is_default.desc(),  # Default first
            PickupLocation.name.asc()
        )
        result = await self.session.execute(query)
        return list(result.scalars().all()), total

    async def get_default_for_enterprise(
        self, enterprise_id: str
    ) -> Optional[PickupLocation]:
        """Get the default pickup location for an enterprise"""
        result = await self.session.execute(
            select(PickupLocation).where(
                and_(
                    PickupLocation.enterprise_id == enterprise_id,
                    PickupLocation.is_default.is_(True),
                    PickupLocation.is_active.is_(True),
                )
            )
        )
        return result.scalar_one_or_none()

    async def clear_default_for_enterprise(self, enterprise_id: str) -> None:
        """Clear the default flag for all locations of an enterprise"""
        await self.session.execute(
            update(PickupLocation)
            .where(PickupLocation.enterprise_id == enterprise_id)
            .values(is_default=False)
        )

    async def set_as_default(self, location_id: str, enterprise_id: str) -> Optional[PickupLocation]:
        """Set a location as the default for an enterprise"""
        # First clear existing defaults
        await self.clear_default_for_enterprise(enterprise_id)

        # Then set the new default
        await self.session.execute(
            update(PickupLocation)
            .where(PickupLocation.id == location_id)
            .values(is_default=True)
        )

        # Return the updated location
        return await self.get_by_id(location_id)

    async def get_or_create_from_branch(self, branch: Branch) -> PickupLocation:
        """Find or create a pickup location from a branch's address.

        Looks for an existing active location whose name matches the branch name.
        If none exists, creates one using the branch address fields.
        """
        result = await self.session.execute(
            select(PickupLocation).where(
                and_(
                    PickupLocation.enterprise_id == branch.enterprise_id,
                    PickupLocation.name == branch.branch_name,
                    PickupLocation.is_active.is_(True),
                )
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            return existing

        # Build address string from branch fields
        address_parts = [branch.address_line1]
        if branch.address_line2:
            address_parts.append(branch.address_line2)
        address = ", ".join(address_parts)

        location = PickupLocation(
            id=f"pl-{uuid4()}",
            enterprise_id=branch.enterprise_id,
            name=branch.branch_name,
            address=address,
            city=branch.city,
            state=branch.state,
            pin_code=branch.pin_code,
            contact_person=branch.site_contact_person,
            contact_phone=branch.site_contact_phone,
            operating_hours=branch.operating_hours,
            special_instructions=branch.special_instructions,
            is_default=False,
            is_active=True,
        )
        self.session.add(location)
        await self.session.flush()
        return location

