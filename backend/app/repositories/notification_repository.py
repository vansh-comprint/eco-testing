"""Repository for Notification database operations"""

from typing import Optional, List, Tuple
from sqlalchemy import select, func, and_, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Notification
from app.repositories.base import BaseRepository


class NotificationRepository(BaseRepository[Notification]):
    """Repository for Notification CRUD operations"""

    def __init__(self, session: AsyncSession):
        super().__init__(Notification, session)

    async def list_for_user(
        self,
        user_id: str,
        is_read: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[Notification], int]:
        """List notifications for a user"""
        base_query = select(Notification).where(Notification.user_id == user_id)

        if is_read is not None:
            base_query = base_query.where(Notification.is_read == is_read)

        count_query = select(func.count()).select_from(base_query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar() or 0

        query = base_query.order_by(Notification.created_at.desc()).offset(skip).limit(limit)
        result = await self.session.execute(query)
        return list(result.scalars().all()), total

    async def get_unread_count(self, user_id: str) -> int:
        """Get count of unread notifications for a user"""
        result = await self.session.execute(
            select(func.count()).where(
                and_(
                    Notification.user_id == user_id,
                    Notification.is_read.is_(False),
                )
            )
        )
        return result.scalar() or 0

    async def mark_all_read(self, user_id: str) -> int:
        """Mark all notifications as read for a user"""
        from datetime import datetime, timezone

        result = await self.session.execute(
            update(Notification)
            .where(
                and_(
                    Notification.user_id == user_id,
                    Notification.is_read.is_(False),
                )
            )
            .values(is_read=True, read_at=datetime.now(timezone.utc))
        )
        return result.rowcount

