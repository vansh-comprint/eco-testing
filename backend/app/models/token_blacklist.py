"""Token blacklist model for DB-backed token invalidation"""

from sqlalchemy import Column, String, DateTime, func

from app.core.database import Base


class TokenBlacklistEntry(Base):
    """
    Stores hashed tokens that have been revoked (logout, token rotation).

    Uses token_hash as primary key (32-char SHA256 prefix).
    Entries are ephemeral — expired rows are cleaned up periodically.
    """

    __tablename__ = "token_blacklist"

    token_hash = Column(String(32), primary_key=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
