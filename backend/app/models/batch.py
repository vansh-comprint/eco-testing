"""Batch model for grouping assets"""

from sqlalchemy import (
    Column,
    String,
    Text,
    Integer,
    Numeric,
    DateTime,
    Date,
    Boolean,
    ForeignKey,
)
from sqlalchemy.orm import relationship
import enum

from app.models.base import BaseModel


class BatchStatus(str, enum.Enum):
    """Batch status enumeration - simplified approval + pickup flow"""

    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    PICKUP_IN_PROGRESS = "pickup_in_progress"  # At least one pickup created
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class PickupTimeSlot(str, enum.Enum):
    """Pickup time slot enumeration"""

    MORNING = "morning"
    AFTERNOON = "afternoon"
    EVENING = "evening"


class PickupPriority(str, enum.Enum):
    """Pickup priority enumeration"""

    NORMAL = "normal"
    URGENT = "urgent"


class Batch(BaseModel):
    """
    Batch model for grouping assets together.

    V3: Includes pickup approval workflow (Org Admin approval).
    """

    __tablename__ = "batches"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Foreign Keys
    enterprise_id = Column(
        String, ForeignKey("enterprises.id", ondelete="CASCADE"), nullable=False, index=True
    )
    branch_id = Column(
        String, ForeignKey("branches.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_by = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Batch Information
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(
        String,
        nullable=False,
        default=BatchStatus.DRAFT.value,
        server_default=BatchStatus.DRAFT.value,
        index=True,
    )  # Stored as string, validated by Python enum

    # Computed Metrics (denormalized for performance)
    asset_count = Column(Integer, nullable=False, default=0, server_default="0")
    accepted_count = Column(Integer, nullable=False, default=0, server_default="0")
    rejected_count = Column(Integer, nullable=False, default=0, server_default="0")
    pending_count = Column(Integer, nullable=False, default=0, server_default="0")
    estimated_value = Column(Numeric(10, 2), nullable=False, default=0, server_default="0")
    total_payout = Column(Numeric(10, 2), nullable=False, default=0, server_default="0")

    # V3: Pickup Details (IT Admin fills when submitting for approval)
    pickup_location_override = Column(Text, nullable=True)
    preferred_pickup_date = Column(Date, nullable=True)
    preferred_pickup_slot = Column(
        String, nullable=True
    )  # Stored as string, validated by Python enum
    pickup_priority = Column(
        String,
        nullable=False,
        default=PickupPriority.NORMAL.value,
        server_default=PickupPriority.NORMAL.value,
    )
    it_admin_notes = Column(Text, nullable=True)
    logistics_instructions = Column(Text, nullable=True)

    # V3: Approval Workflow (was CFO approval)
    requires_approval = Column(Boolean, nullable=False, default=False, server_default="false")
    submitted_for_approval_at = Column(DateTime(timezone=True), nullable=True)
    approved_by = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    org_admin_notes = Column(Text, nullable=True)
    rejected_by = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    rejected_at = Column(DateTime(timezone=True), nullable=True)
    rejection_reason = Column(Text, nullable=True)

    # EPR Tracking
    epr_certificate_id = Column(String, nullable=True)
    epr_status = Column(String, nullable=True)  # not_started, pending, issued

    # Tracking Timestamps
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    enterprise = relationship("Enterprise", back_populates="batches")
    branch = relationship("Branch", back_populates="batches")
    creator = relationship("User", back_populates="created_batches", foreign_keys=[created_by])
    assets = relationship("Asset", back_populates="batch")
    pickup_request = relationship("PickupRequest", back_populates="batch", uselist=False)
    payout = relationship(
        "Payout", back_populates="batch", uselist=False, cascade="all, delete-orphan"
    )
    epr_certificate = relationship(
        "EPRCertificate", back_populates="batch", uselist=False, cascade="save-update, merge"
    )

    def __repr__(self) -> str:
        return f"<Batch(id={self.id}, name={self.name}, status={self.status})>"
