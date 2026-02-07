"""EPR (Extended Producer Responsibility) compliance models"""

from sqlalchemy import Column, String, Date, ForeignKey, Numeric, Text, JSON, ARRAY
from sqlalchemy.orm import relationship
import enum

from app.models.base import BaseModel


class EPRCertificateStatus(str, enum.Enum):
    """EPR certificate status enumeration"""

    PENDING = "pending"
    ISSUED = "issued"
    EXPIRED = "expired"
    REVOKED = "revoked"


class EPRCertificate(BaseModel):
    """
    EPR certificate model for environmental compliance.

    Tracks EPR certificates issued for recycled/disposed assets.
    """

    __tablename__ = "epr_certificates"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Foreign Keys
    enterprise_id = Column(
        String, ForeignKey("enterprises.id", ondelete="CASCADE"), nullable=False, index=True
    )
    batch_id = Column(
        String, ForeignKey("batches.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Certificate Details
    certificate_number = Column(String, unique=True, nullable=False, index=True)
    status = Column(
        String,
        nullable=False,
        default=EPRCertificateStatus.PENDING.value,
        server_default=EPRCertificateStatus.PENDING.value,
        index=True,
    )

    # Dates
    issue_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True)

    # Compliance Details
    total_weight_kg = Column(Numeric(10, 3), nullable=False)
    recycled_weight_kg = Column(Numeric(10, 3), nullable=True)
    disposed_weight_kg = Column(Numeric(10, 3), nullable=True)

    # Asset IDs covered by this certificate
    asset_ids = Column(ARRAY(String), nullable=True)

    # Recycler Information
    recycler_partner_id = Column(String, nullable=True)
    recycler_name = Column(String, nullable=True)
    recycler_license_number = Column(String, nullable=True)

    # Document
    certificate_url = Column(String, nullable=True)

    # Additional Data
    notes = Column(Text, nullable=True)
    extra_data = Column(JSON, nullable=True)

    # Relationships
    enterprise = relationship("Enterprise", back_populates="epr_certificates")
    batch = relationship("Batch", back_populates="epr_certificate")

    def __repr__(self) -> str:
        return f"<EPRCertificate(id={self.id}, certificate_number={self.certificate_number}, status={self.status})>"
