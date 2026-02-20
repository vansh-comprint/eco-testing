"""Service layer for Pickup Location business logic"""

import uuid
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import PickupLocation, User, UserRole
from app.repositories.pickup_repository import PickupLocationRepository
from app.schemas.pickup import (
    PickupLocationCreate,
    PickupLocationUpdate,
)


class PickupLocationService:
    """Service for handling pickup location business logic"""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = PickupLocationRepository(session)

    async def create_location(
        self, data: PickupLocationCreate, user: User
    ) -> PickupLocation:
        """Create a pickup location"""
        # Auto-fill enterprise_id for scoped users
        enterprise_id = data.enterprise_id
        if user.role in [UserRole.ORG_ADMIN.value, UserRole.IT_ADMIN.value]:
            enterprise_id = user.enterprise_id

        if not enterprise_id:
            raise ValueError("Enterprise ID is required")

        location = PickupLocation(
            id=f"loc-{uuid.uuid4()}",
            enterprise_id=enterprise_id,
            name=data.name,
            address=data.address,
            city=data.city,
            state=data.state,
            pin_code=data.pin_code,
            contact_person=data.contact_person,
            contact_phone=data.contact_phone,
            operating_hours=data.operating_hours,
            special_instructions=data.special_instructions,
            is_default=data.is_default,
            is_active=True,
        )

        # If setting as default, clear other defaults first
        if data.is_default:
            await self.repo.clear_default_for_enterprise(enterprise_id)

        await self.repo.create(location)
        await self.session.flush()
        await self.session.refresh(location)
        return location

    async def get_location(self, location_id: str) -> Optional[PickupLocation]:
        """Get a pickup location by ID"""
        return await self.repo.get_by_id(location_id)

    async def update_location(
        self, location_id: str, data: PickupLocationUpdate, user: User
    ) -> Optional[PickupLocation]:
        """Update a pickup location"""
        location = await self.repo.get_by_id(location_id)
        if not location:
            return None

        # Check access for scoped users
        if user.role in [UserRole.ORG_ADMIN.value, UserRole.IT_ADMIN.value]:
            if location.enterprise_id != user.enterprise_id:
                raise ValueError("Cannot update location from another enterprise")

        # If setting as default, clear other defaults first
        if data.is_default:
            await self.repo.clear_default_for_enterprise(location.enterprise_id)

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if value is not None:
                setattr(location, key, value)

        await self.session.flush()
        await self.session.refresh(location)
        return location

    async def delete_location(self, location_id: str, user: User) -> bool:
        """Delete (soft delete) a pickup location"""
        location = await self.repo.get_by_id(location_id)
        if not location:
            return False

        # Check access for scoped users
        if user.role in [UserRole.ORG_ADMIN.value, UserRole.IT_ADMIN.value]:
            if location.enterprise_id != user.enterprise_id:
                raise ValueError("Cannot delete location from another enterprise")

        # Soft delete by setting is_active = False
        location.is_active = False
        await self.session.flush()
        return True

    async def set_default_location(
        self, location_id: str, user: User
    ) -> Optional[PickupLocation]:
        """Set a location as the default for an enterprise"""
        location = await self.repo.get_by_id(location_id)
        if not location:
            return None

        # Check access for scoped users
        if user.role in [UserRole.ORG_ADMIN.value, UserRole.IT_ADMIN.value]:
            if location.enterprise_id != user.enterprise_id:
                raise ValueError("Cannot modify location from another enterprise")

        location = await self.repo.set_as_default(location_id, location.enterprise_id)
        await self.session.flush()
        return location

    async def list_locations(
        self,
        enterprise_id: str,
        user: User,
        include_inactive: bool = False,
    ) -> Tuple[List[PickupLocation], int]:
        """List pickup locations for an enterprise"""
        # Scoped users can only see their enterprise's locations
        if user.role in [UserRole.ORG_ADMIN.value, UserRole.IT_ADMIN.value]:
            enterprise_id = user.enterprise_id

        return await self.repo.list_by_enterprise(
            enterprise_id=enterprise_id,
            include_inactive=include_inactive,
        )
