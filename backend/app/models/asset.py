"""Asset model for IT devices"""

from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, String, Date, DateTime, ForeignKey, Numeric, JSON
from sqlalchemy.orm import relationship
import enum

from app.models.base import BaseModel


class AssetStatus(str, enum.Enum):
    """Asset status enumeration - complete workflow"""

    PENDING_ASSIGNMENT = "pending_assignment"
    ASSIGNED = "assigned"
    CHECK_IN_STARTED = "check_in_started"
    SUBMITTED = "submitted"
    REMOTE_REVIEW = "remote_review"
    CONDITIONALLY_ACCEPTED = "conditionally_accepted"
    REMOTE_REJECTED = "remote_rejected"
    DISPUTED = "disputed"
    # Pickup-related statuses
    READY_FOR_PICKUP = "ready_for_pickup"
    PICKUP_REQUESTED = "pickup_requested"
    PICKUP_SCHEDULED = "pickup_scheduled"
    PICKUP_FAILED_QC = "pickup_failed_qc"
    PICKED_UP = "picked_up"
    # Warehouse flow
    IN_TRANSIT = "in_transit"
    FACILITY_QC = "facility_qc"
    FINAL_ACCEPTED = "final_accepted"
    FINAL_REJECTED = "final_rejected"
    PAYOUT_PENDING = "payout_pending"
    COMPLETED = "completed"


class AssetGrade(str, enum.Enum):
    """Asset grade enumeration"""

    A = "A"
    B = "B"
    C = "C"
    D = "D"


class TreatmentOutcome(str, enum.Enum):
    """Treatment outcome for EPR compliance"""

    RECYCLED = "recycled"
    REFURBISHED = "refurbished"
    RESOLD = "resold"
    DISPOSED = "disposed"
    PENDING = "pending"


class Asset(BaseModel):
    """
    Asset model representing IT devices (laptops, desktops, etc.).

    Tracks the complete lifecycle from assignment to payout.
    """

    __tablename__ = "assets"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Foreign Keys
    enterprise_id = Column(
        String, ForeignKey("enterprises.id", ondelete="CASCADE"), nullable=False, index=True
    )
    branch_id = Column(
        String, ForeignKey("branches.id", ondelete="SET NULL"), nullable=True, index=True
    )
    batch_id = Column(
        String, ForeignKey("batches.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # Assigned employee (User with role=EMPLOYEE)
    assigned_to_user_id = Column(
        String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Device Identification
    serial_number = Column(String, unique=True, nullable=False, index=True)
    brand = Column(String, nullable=False)
    model = Column(String, nullable=False)
    asset_tag = Column(String, nullable=True)

    # Specifications (stored as JSONB)
    specs = Column(JSON, nullable=True)
    purchase_date = Column(Date, nullable=True)

    # Assignment
    assigned_at = Column(DateTime(timezone=True), nullable=True)

    # Status & Grading
    status = Column(
        String,
        nullable=False,
        default=AssetStatus.PENDING_ASSIGNMENT.value,
        server_default=AssetStatus.PENDING_ASSIGNMENT.value,
        index=True,
    )
    grade = Column(String, nullable=True)  # Stored as string, validated by Python enum

    # Pricing
    base_price = Column(Numeric(10, 2), nullable=True)
    final_price = Column(Numeric(10, 2), nullable=True)

    # Treatment/EPR
    treatment_outcome = Column(String, nullable=True)  # Stored as string, validated by Python enum
    treatment_date = Column(DateTime(timezone=True), nullable=True)
    recycler_partner_id = Column(String, nullable=True)
    weight_kg = Column(Numeric(8, 3), nullable=True)
    epr_certificate_id = Column(String, nullable=True)

    # QC Data (denormalized for performance)
    qc_report = Column(JSON, nullable=True)

    # Relationships
    enterprise = relationship("Enterprise", back_populates="assets")
    branch = relationship("Branch", back_populates="assets")
    batch = relationship("Batch", back_populates="assets")

    # Assigned employee (User with role=EMPLOYEE)
    assigned_user = relationship(
        "User", back_populates="assigned_assets", foreign_keys=[assigned_to_user_id]
    )

    submission = relationship("Submission", back_populates="asset", uselist=False)
    remote_review = relationship("RemoteReview", back_populates="asset", uselist=False)
    disputes = relationship("Dispute", back_populates="asset", cascade="all, delete-orphan")
    on_site_qc = relationship("OnSiteQC", back_populates="asset", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Asset(id={self.id}, serial={self.serial_number}, status={self.status})>"
