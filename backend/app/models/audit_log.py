"""Audit log model for tracking state transitions and important actions"""

from sqlalchemy import Column, String, DateTime, JSON, Text, Index
from sqlalchemy.sql import func

from app.models.base import BaseModel


class AuditLog(BaseModel):
    """
    Audit log for tracking state transitions and important actions.

    This provides a complete audit trail for compliance and debugging.
    """

    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, index=True)

    # What changed
    entity_type = Column(String(50), nullable=False, index=True)  # asset, batch, pickup, etc.
    entity_id = Column(String, nullable=False, index=True)

    # The action/event
    action = Column(String(100), nullable=False, index=True)  # status_change, created, deleted, etc.

    # Details of the change
    old_value = Column(JSON, nullable=True)  # For status changes: {"status": "pending_assignment"}
    new_value = Column(JSON, nullable=True)  # For status changes: {"status": "assigned"}

    # Additional context
    details = Column(Text, nullable=True)  # Human-readable description
    metadata = Column(JSON, nullable=True)  # Additional structured data

    # Who made the change
    user_id = Column(String, nullable=True, index=True)
    user_email = Column(String, nullable=True)
    user_role = Column(String, nullable=True)

    # When
    timestamp = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True
    )

    # Context
    enterprise_id = Column(String, nullable=True, index=True)
    branch_id = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)

    # Create composite indexes for common query patterns
    __table_args__ = (
        Index('ix_audit_entity', 'entity_type', 'entity_id'),
        Index('ix_audit_user_time', 'user_id', 'timestamp'),
        Index('ix_audit_enterprise_time', 'enterprise_id', 'timestamp'),
    )

    def __repr__(self) -> str:
        return f"<AuditLog({self.entity_type}:{self.entity_id} - {self.action})>"
