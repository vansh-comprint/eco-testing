"""Base repository with common CRUD operations"""

from typing import TypeVar, Generic, Optional, List, Type
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

T = TypeVar("T")


class BaseRepository(Generic[T]):
    """
    Base repository providing common CRUD operations.
    
    Usage:
        class UserRepository(BaseRepository[User]):
            def __init__(self, session: AsyncSession):
                super().__init__(User, session)
    """

    def __init__(self, model: Type[T], session: AsyncSession):
        self.model = model
        self.session = session

    async def get_by_id(self, id: str) -> Optional[T]:
        """Get entity by ID"""
        result = await self.session.execute(
            select(self.model).where(self.model.id == id)
        )
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[T]:
        """Get all entities with pagination"""
        result = await self.session.execute(
            select(self.model).offset(skip).limit(limit)
        )
        return list(result.scalars().all())

    async def count(self) -> int:
        """Count all entities"""
        result = await self.session.execute(
            select(func.count()).select_from(self.model)
        )
        return result.scalar() or 0

    async def create(self, entity: T) -> T:
        """Create a new entity"""
        self.session.add(entity)
        return entity

    async def update(self, entity: T) -> T:
        """Update an entity (entity must be attached to session)"""
        return entity

    async def delete(self, entity: T) -> None:
        """Delete an entity"""
        await self.session.delete(entity)

    async def delete_by_id(self, id: str) -> bool:
        """Delete entity by ID, returns True if deleted"""
        entity = await self.get_by_id(id)
        if entity:
            await self.session.delete(entity)
            return True
        return False

