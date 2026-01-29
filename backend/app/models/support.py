"""Support models for notifications, disputes, audit logs, and QC"""

from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON, Boolean, ARRAY
from sqlalchemy.orm import relationship
import enum

from app.models.base import BaseModel


class NotificationType(str, enum.Enum):
    """Notification type enumeration"""

    INFO = "info"
    WARNING = "warning"
    SUCCESS = "success"
    ERROR = "error"
    ALERT = "alert"


class DisputeStatus(str, enum.Enum):
    """Dispute status enumeration"""

    OPEN = "open"
    UNDER_REVIEW = "under_review"
    RESOLVED = "resolved"
    REJECTED = "rejected"
    ESCALATED = "escalated"


class DisputeType(str, enum.Enum):
    """Dispute type enumeration"""

    GRADING = "grading"
    PRICING = "pricing"
    CONDITION = "condition"
    MISSING_PARTS = "missing_parts"
    DAMAGE = "damage"
    OTHER = "other"


class QCStatus(str, enum.Enum):
    """QC status enumeration"""

    PASSED = "passed"
    FAILED = "failed"
    CONDITIONAL = "conditional"


class Notification(BaseModel):
    """
    Notification model for user alerts.

    All user types (admins, employees, logistics) use the unified users table.
    """

    __tablename__ = "notifications"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Foreign Key - unified users table
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Notification Details
    type = Column(String, nullable=False, default=NotificationType.INFO.value)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)

    # Status
    is_read = Column(Boolean, nullable=False, default=False, server_default="false")
    read_at = Column(DateTime(timezone=True), nullable=True)

    # Additional Data
    action_url = Column(String, nullable=True)
    extra_data = Column(JSON, nullable=True)

    # Relationships
    user = relationship("User", back_populates="notifications")

    def __repr__(self) -> str:
        return f"<Notification(id={self.id}, title={self.title}, is_read={self.is_read})>"


class Dispute(BaseModel):
    """
    Dispute model for handling asset evaluation disputes.

    Created when an employee (User with role=EMPLOYEE) disagrees with grading/pricing.
    """

    __tablename__ = "disputes"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Foreign Keys - all point to unified users table
    asset_id = Column(
        String, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    raised_by_user_id = Column(
        String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )  # User with role=EMPLOYEE who raised the dispute
    assigned_to_user_id = Column(
        String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )  # Admin user assigned to handle dispute

    # Dispute Details
    dispute_type = Column(String, nullable=False, index=True)
    status = Column(
        String,
        nullable=False,
        default=DisputeStatus.OPEN.value,
        server_default=DisputeStatus.OPEN.value,
        index=True,
    )

    # Content
    description = Column(Text, nullable=False)
    evidence_urls = Column(ARRAY(String), nullable=True)

    # Resolution
    resolution = Column(Text, nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by_user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Additional Data
    extra_data = Column(JSON, nullable=True)

    # Relationships
    asset = relationship("Asset", back_populates="disputes")
    raised_by_user = relationship(
        "User", foreign_keys=[raised_by_user_id], back_populates="raised_disputes"
    )
    assigned_to = relationship(
        "User", foreign_keys=[assigned_to_user_id], back_populates="assigned_disputes"
    )
    resolved_by = relationship(
        "User", foreign_keys=[resolved_by_user_id], back_populates="resolved_disputes"
    )

    def __repr__(self) -> str:
        return f"<Dispute(id={self.id}, asset_id={self.asset_id}, type={self.dispute_type}, status={self.status})>"


class OnSiteQC(BaseModel):
    """
    On-site QC model for quality checks during pickup.

    Performed by logistics user (User with role=LOGISTICS_USER) at pickup location.
    """

    __tablename__ = "on_site_qc"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Foreign Keys - all point to unified users table
    asset_id = Column(
        String, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    pickup_request_id = Column(
        String, ForeignKey("pickup_requests.id", ondelete="CASCADE"), nullable=False, index=True
    )
    performed_by_user_id = Column(
        String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )  # User with role=LOGISTICS_USER

    # QC Results
    status = Column(String, nullable=False, index=True)  # Validated by QCStatus enum

    # Checks
    physical_condition_ok = Column(Boolean, nullable=False)
    powers_on = Column(Boolean, nullable=False)
    screen_ok = Column(Boolean, nullable=False)
    keyboard_ok = Column(Boolean, nullable=False)
    ports_ok = Column(Boolean, nullable=False)

    # Evidence
    photo_urls = Column(ARRAY(String), nullable=True)
    notes = Column(Text, nullable=True)

    # Timestamps
    performed_at = Column(DateTime(timezone=True), nullable=False)

    # Additional Data
    extra_data = Column(JSON, nullable=True)

    # Relationships
    asset = relationship("Asset", back_populates="on_site_qc")
    pickup_request = relationship("PickupRequest", back_populates="on_site_qc_records")
    performed_by_user = relationship(
        "User", foreign_keys=[performed_by_user_id], back_populates="on_site_qc_records"
    )

    def __repr__(self) -> str:
        return f"<OnSiteQC(id={self.id}, asset_id={self.asset_id}, status={self.status})>"


class AuditLog(BaseModel):
    """
    Audit log model for tracking system actions and state transitions.

    Records all significant operations for compliance and debugging.
    All user types use the unified users table.
    """

    __tablename__ = "audit_logs"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Actor (who performed the action) - unified users table
    user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    user_email = Column(String, nullable=True)
    user_role = Column(String, nullable=True)

    # Action Details
    action = Column(String, nullable=False, index=True)
    entity_type = Column(String, nullable=False, index=True)
    entity_id = Column(String, nullable=False, index=True)

    # Changes
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)

    # Human-readable description
    details = Column(Text, nullable=True)

    # Timestamp (explicit for state changes)
    timestamp = Column(DateTime(timezone=True), nullable=True, index=True)

    # Context
    enterprise_id = Column(String, nullable=True, index=True)
    branch_id = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)

    # Additional Data
    extra_data = Column(JSON, nullable=True)

    # Relationships
    user = relationship("User", back_populates="audit_logs")

    def __repr__(self) -> str:
        return f"<AuditLog(id={self.id}, action={self.action}, entity_type={self.entity_type})>"
