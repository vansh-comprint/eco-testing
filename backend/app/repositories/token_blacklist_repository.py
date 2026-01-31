"""Repository for DB-backed token blacklist"""

from datetime import datetime, timezone
from sqlalchemy import select, delete
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.token_blacklist import TokenBlacklistEntry


class TokenBlacklistRepository:
    """Data access layer for the token_blacklist table."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def is_blacklisted(self, token_hash: str) -> bool:
        """Check if a token hash exists and hasn't expired."""
        result = await self.session.execute(
            select(TokenBlacklistEntry.token_hash).where(
                TokenBlacklistEntry.token_hash == token_hash,
                TokenBlacklistEntry.expires_at > datetime.now(timezone.utc),
            )
        )
        return result.scalar_one_or_none() is not None

    async def add(self, token_hash: str, expires_at: datetime) -> None:
        """Insert a token hash into the blacklist (upsert to handle duplicates)."""
        stmt = pg_insert(TokenBlacklistEntry).values(
            token_hash=token_hash,
            expires_at=expires_at,
        ).on_conflict_do_nothing(index_elements=["token_hash"])
        await self.session.execute(stmt)

    async def cleanup_expired(self) -> int:
        """Delete expired entries. Returns count of deleted rows."""
        result = await self.session.execute(
            delete(TokenBlacklistEntry).where(
                TokenBlacklistEntry.expires_at < datetime.now(timezone.utc)
            )
        )
        return result.rowcount
