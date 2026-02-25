"""Logistics models for pickup management"""

from sqlalchemy import Column, String, Text, DateTime, Date, ForeignKey, Integer, JSON, ARRAY
from sqlalchemy.orm import relationship
import enum

from app.models.base import BaseModel


class PickupStatus(str, enum.Enum):
    """Pickup request status enumeration"""

    PENDING = "pending"
    ASSIGNED_TO_LOGISTICS_ADMIN = "assigned_to_logistics_admin"
    ASSIGNED_TO_LOGISTICS_USER = "assigned_to_logistics_user"
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIAL = "partial"
    RESCHEDULED = "rescheduled"
    CANCELLED = "cancelled"


class PickupTimeSlot(str, enum.Enum):
    """Pickup time slot enumeration"""

    MORNING = "morning"
    AFTERNOON = "afternoon"
    EVENING = "evening"


class PickupRequest(BaseModel):
    """
    Pickup request model for scheduling device pickups.

    Created after batch approval, goes through 3-tier assignment:
    OPS Admin → Logistics Admin (User with role=LOGISTICS_ADMIN) → Logistics User (User with role=LOGISTICS_USER)
    """

    __tablename__ = "pickup_requests"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Foreign Keys
    enterprise_id = Column(
        String, ForeignKey("enterprises.id", ondelete="CASCADE"), nullable=False, index=True
    )
    location_id = Column(
        String, ForeignKey("pickup_locations.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    batch_id = Column(
        String, ForeignKey("batches.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Logistics assignment - both point to unified users table
    logistics_admin_id = Column(
        String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )  # User with role=LOGISTICS_ADMIN
    logistics_user_id = Column(
        String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )  # User with role=LOGISTICS_USER

    # Asset Information
    asset_ids = Column(ARRAY(String), nullable=False)
    assets = Column(JSON, nullable=False, default=list, server_default="[]")

    # Scheduling
    preferred_date = Column(Date, nullable=True)
    preferred_time_slot = Column(String, nullable=False)  # Validated by PickupTimeSlot enum
    scheduled_date = Column(DateTime(timezone=True), nullable=True)

    # Assignment Tracking
    assigned_at = Column(DateTime(timezone=True), nullable=True)
    assigned_by_id = Column(
        String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Status
    status = Column(
        String,
        nullable=False,
        default=PickupStatus.PENDING.value,
        server_default=PickupStatus.PENDING.value,
        index=True,
    )

    # Notes
    special_instructions = Column(Text, nullable=True)
    logistics_notes = Column(Text, nullable=True)

    # Progress tracking
    started_at = Column(DateTime(timezone=True), nullable=True)  # When logistics user started the pickup

    # Completion
    completed_at = Column(DateTime(timezone=True), nullable=True)
    proof_of_pickup = Column(JSON, nullable=True)  # Photos, signatures, etc.

    # Failure tracking
    failure_reason = Column(String, nullable=True)  # no_show, qc_failed, wrong_address, refused, device_mismatch, other
    attempt_count = Column(Integer, default=0, server_default="0", nullable=False)
    failed_at = Column(DateTime(timezone=True), nullable=True)

    # Per-asset outcome tracking (for partial pickups)
    picked_asset_ids = Column(ARRAY(String), nullable=True)  # Assets successfully collected
    failed_asset_ids = Column(ARRAY(String), nullable=True)   # Assets that failed

    # Relationships
    location = relationship("PickupLocation", back_populates="pickup_requests")
    batch = relationship("Batch", back_populates="pickup_request")

    # User relationships
    logistics_admin = relationship(
        "User", foreign_keys=[logistics_admin_id], backref="assigned_pickups_as_admin"
    )
    logistics_user = relationship(
        "User", foreign_keys=[logistics_user_id], back_populates="pickup_requests"
    )
    assigned_by = relationship("User", foreign_keys=[assigned_by_id], backref="pickups_assigned")

    on_site_qc_records = relationship(
        "OnSiteQC",
        back_populates="pickup_request",
        cascade="save-update, merge",  # Preserve QC records as forensic evidence when pickup is deleted
    )

    def __repr__(self) -> str:
        return f"<PickupRequest(id={self.id}, status={self.status}, batch_id={self.batch_id})>"
