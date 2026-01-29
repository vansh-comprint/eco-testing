"""Submission model for employee device evaluations"""

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class Submission(BaseModel):
    """
    Submission model for employee self-evaluation of devices.

    Created when an employee (User with role=EMPLOYEE) completes the device check-in flow.
    """

    __tablename__ = "submissions"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Foreign Keys
    asset_id = Column(
        String, ForeignKey("assets.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    user_id = Column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )  # User with role=EMPLOYEE

    # Device Confirmation
    device_confirmed = Column(Boolean, nullable=False)

    # Photos (JSONB with URLs)
    # Format: {"front": "url", "back": "url", "screen": "url", ...}
    photos = Column(JSON, nullable=False, default=dict, server_default="{}")

    # Checklists (JSONB)
    # Format: {"power_on": true, "display_working": true, ...}
    functional_checks = Column(JSON, nullable=False, default=dict, server_default="{}")
    cosmetic_checklist = Column(JSON, nullable=True)
    accessories = Column(JSON, nullable=True)

    # Location & Declaration
    location = Column(JSON, nullable=True)
    declaration = Column(JSON, nullable=False)

    # Submission Timestamp
    submitted_at = Column(DateTime(timezone=True), nullable=False, server_default="NOW()")

    # Relationships
    asset = relationship("Asset", back_populates="submission")
    user = relationship("User", back_populates="submissions", foreign_keys=[user_id])

    def __repr__(self) -> str:
        return f"<Submission(id={self.id}, asset_id={self.asset_id}, user_id={self.user_id})>"
