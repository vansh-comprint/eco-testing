"""Review models for remote and facility QC"""

from decimal import Decimal
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Numeric, JSON
from sqlalchemy.orm import relationship
import enum

from app.models.base import BaseModel


class ReviewDecision(str, enum.Enum):
    """Review decision enumeration"""

    ACCEPTED = "accepted"
    REJECTED = "rejected"
    CONDITIONALLY_ACCEPTED = "conditionally_accepted"
    NEEDS_FACILITY_QC = "needs_facility_qc"


class RemoteReview(BaseModel):
    """
    Remote review model for OPS Admin review of submissions.

    Reviewers assess photos and checklists to make initial assessment.
    """

    __tablename__ = "remote_reviews"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Foreign Keys
    asset_id = Column(
        String, ForeignKey("assets.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    submission_id = Column(
        String, ForeignKey("submissions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    reviewer_id = Column(
        String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Review Details
    decision = Column(String, nullable=False)  # Stored as string, validated by Python enum
    grade = Column(String, nullable=True)  # A, B, C, D
    estimated_value = Column(Numeric(10, 2), nullable=True)

    # Review Notes
    notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)

    # Checklist Results (JSONB)
    checklist_results = Column(JSON, nullable=True)

    # Timestamps
    reviewed_at = Column(DateTime(timezone=True), nullable=False, server_default="NOW()")

    # Relationships
    asset = relationship("Asset", back_populates="remote_review")
    reviewer = relationship("User")

    def __repr__(self) -> str:
        return f"<RemoteReview(id={self.id}, asset_id={self.asset_id}, decision={self.decision})>"


class FacilityQC(BaseModel):
    """
    Facility QC model for final quality check at warehouse.

    Performed after device is picked up and arrives at facility.
    """

    __tablename__ = "facility_qc"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Foreign Keys
    asset_id = Column(
        String, ForeignKey("assets.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    reviewer_id = Column(
        String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # QC Results
    decision = Column(String, nullable=False)  # Stored as string, validated by Python enum
    grade = Column(String, nullable=True)  # A, B, C, D
    final_value = Column(Numeric(10, 2), nullable=True)

    # Detailed Checks (JSONB)
    functional_tests = Column(JSON, nullable=True)
    cosmetic_assessment = Column(JSON, nullable=True)
    hardware_tests = Column(JSON, nullable=True)

    # Photos (JSONB with URLs)
    photos = Column(JSON, nullable=True)

    # Notes
    notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)

    # Timestamps
    qc_completed_at = Column(DateTime(timezone=True), nullable=False, server_default="NOW()")

    # Relationships
    reviewer = relationship("User")

    def __repr__(self) -> str:
        return f"<FacilityQC(id={self.id}, asset_id={self.asset_id}, decision={self.decision})>"
