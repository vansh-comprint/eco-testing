"""Enterprise, Branch, and related models"""

from sqlalchemy import Column, String, Integer, Text, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
import enum

from app.models.base import BaseModel


class EnterpriseApplicationStatus(str, enum.Enum):
    """Enterprise application status enumeration"""

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    MORE_INFO_REQUESTED = "more_info_requested"


class EnterpriseApplication(BaseModel):
    """
    Enterprise application model for new enterprise registrations.

    When a company wants to join EcoTribe, they submit an application that
    gets reviewed by Super Admin or OPS Admin before the enterprise is created.
    """

    __tablename__ = "enterprise_applications"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Application Reference
    application_ref = Column(String, unique=True, nullable=True, index=True)

    # Company Information
    company_name = Column(String, nullable=False)
    legal_name = Column(String, nullable=True)
    gst_number = Column(String, nullable=True)
    pan_number = Column(String, nullable=True)
    registered_address = Column(Text, nullable=True)
    industry_type = Column(String, nullable=True)
    company_size = Column(String, nullable=True)

    # Org Admin Details (the person registering)
    org_admin_name = Column(String, nullable=False)
    org_admin_email = Column(String, nullable=False, index=True)
    org_admin_phone = Column(String, nullable=True)
    org_admin_designation = Column(String, nullable=True)
    password_hash = Column(String, nullable=True)  # Hashed password for later activation

    # Documents (storage paths - S3 or local)
    doc_gst_certificate = Column(String, nullable=True)
    doc_pan_card = Column(String, nullable=True)
    doc_incorporation_cert = Column(String, nullable=True)
    doc_signatory_id = Column(String, nullable=True)
    doc_address_proof = Column(String, nullable=True)
    doc_company_logo = Column(String, nullable=True)

    # Review Status
    status = Column(
        String,
        nullable=False,
        default=EnterpriseApplicationStatus.PENDING.value,
        server_default=EnterpriseApplicationStatus.PENDING.value,
        index=True,
    )
    reviewed_by = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(String, nullable=True)  # ISO datetime string
    review_notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)

    # Resulting enterprise (after approval)
    enterprise_id = Column(String, ForeignKey("enterprises.id", ondelete="SET NULL"), nullable=True)

    def __repr__(self) -> str:
        return f"<EnterpriseApplication(id={self.id}, company={self.company_name}, status={self.status})>"


class EnterpriseStatus(str, enum.Enum):
    """Enterprise status enumeration"""

    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING_VERIFICATION = "pending_verification"


class Enterprise(BaseModel):
    """
    Enterprise model representing a company/organization.

    Each enterprise can have multiple branches, users, and assets.
    """

    __tablename__ = "enterprises"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Company Information
    name = Column(String, nullable=False)
    legal_name = Column(String, nullable=True)
    gst_number = Column(String, unique=True, nullable=True, index=True)
    pan_number = Column(String, nullable=True)

    # Address (stored as JSONB for flexibility)
    address = Column(JSON, nullable=True)

    # Business Details
    industry = Column(String, nullable=True)
    employee_count = Column(Integer, nullable=True)

    # Contact Information
    contact_person = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)

    # Status
    status = Column(
        String,
        nullable=False,
        default=EnterpriseStatus.ACTIVE.value,
        server_default=EnterpriseStatus.ACTIVE.value,
        index=True,
    )

    # Relationships
    # All users (including employees) are in the unified users table
    users = relationship("User", back_populates="enterprise", cascade="all, delete-orphan")
    branches = relationship("Branch", back_populates="enterprise", cascade="all, delete-orphan")
    assets = relationship("Asset", back_populates="enterprise")
    batches = relationship("Batch", back_populates="enterprise")
    pickup_locations = relationship("PickupLocation", back_populates="enterprise")
    wallet = relationship(
        "EnterpriseWallet", back_populates="enterprise", uselist=False, cascade="all, delete-orphan"
    )
    payouts = relationship("Payout", back_populates="enterprise", cascade="all, delete-orphan")
    epr_certificates = relationship(
        "EPRCertificate", back_populates="enterprise", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Enterprise(id={self.id}, name={self.name}, status={self.status})>"


class BranchStatus(str, enum.Enum):
    """Branch status enumeration"""

    ACTIVE = "active"
    INACTIVE = "inactive"


class Branch(BaseModel):
    """
    Branch model representing a branch/office of an enterprise.

    V3: Each branch can have one or more IT Admins assigned to it.
    """

    __tablename__ = "branches"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Foreign Keys
    enterprise_id = Column(
        String, ForeignKey("enterprises.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Branch Information
    branch_name = Column(String, nullable=False)
    branch_code = Column(String, nullable=False)

    # Address
    address_line1 = Column(String, nullable=False)
    address_line2 = Column(String, nullable=True)
    city = Column(String, nullable=False)
    state = Column(String, nullable=False)
    pin_code = Column(String, nullable=False)

    # Pickup Location Details (default pickup point for this branch)
    pickup_point_description = Column(Text, nullable=True)
    site_contact_person = Column(String, nullable=True)
    site_contact_phone = Column(String, nullable=True)
    operating_hours = Column(String, nullable=True)
    special_instructions = Column(Text, nullable=True)

    # Status
    status = Column(
        String,
        nullable=False,
        default=BranchStatus.ACTIVE.value,
        server_default=BranchStatus.ACTIVE.value,
    )

    # Relationships
    enterprise = relationship("Enterprise", back_populates="branches")
    it_admins = relationship("User", back_populates="branch")
    batches = relationship("Batch", back_populates="branch")
    assets = relationship("Asset", back_populates="branch")

    def __repr__(self) -> str:
        return f"<Branch(id={self.id}, name={self.branch_name}, code={self.branch_code})>"


class PickupLocation(BaseModel):
    """
    Pickup location model for enterprise pickup points.

    Managed by IT Admin for scheduling device pickups.
    """

    __tablename__ = "pickup_locations"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Foreign Keys
    enterprise_id = Column(
        String, ForeignKey("enterprises.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Location Information
    name = Column(String, nullable=False)
    address = Column(Text, nullable=False)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    pin_code = Column(String, nullable=True)
    country = Column(String, nullable=False, default="India", server_default="India")

    # Contact Information
    contact_person = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    operating_hours = Column(String, nullable=True)
    special_instructions = Column(Text, nullable=True)

    # Flags
    is_default = Column(Boolean, nullable=False, default=False, server_default="false")
    is_active = Column(Boolean, nullable=False, default=True, server_default="true")

    # Relationships
    enterprise = relationship("Enterprise", back_populates="pickup_locations")
    pickup_requests = relationship("PickupRequest", back_populates="location")

    def __repr__(self) -> str:
        return (
            f"<PickupLocation(id={self.id}, name={self.name}, enterprise_id={self.enterprise_id})>"
        )
