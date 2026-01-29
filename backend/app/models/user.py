"""User models - Unified user table for all roles"""

from datetime import datetime
from typing import Optional
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Boolean, JSON
from sqlalchemy.orm import relationship
import enum

from app.models.base import BaseModel


class UserRole(str, enum.Enum):
    """
    User role enumeration for all user types in EcoTribe V3.

    Platform Roles:
    - SUPER_ADMIN: Platform oversight, pricing config
    - OPS_ADMIN: Operations management (was MAIN_ADMIN)
    - TECHNICIAN: Remote review and facility QC

    Enterprise Roles:
    - ORG_ADMIN: Enterprise admin, branches, finances, approvals (was CFO)
    - IT_ADMIN: Branch-level asset & batch management
    - EMPLOYEE: Enterprise employees who submit devices (was SUB_USER)

    Logistics Roles:
    - LOGISTICS_ADMIN: Logistics partner company admin
    - LOGISTICS_USER: Drivers/field agents who perform pickups
    """

    # Platform roles
    SUPER_ADMIN = "super_admin"
    OPS_ADMIN = "ops_admin"
    TECHNICIAN = "technician"

    # Enterprise roles
    ORG_ADMIN = "org_admin"
    IT_ADMIN = "it_admin"
    EMPLOYEE = "employee"

    # Logistics roles
    LOGISTICS_ADMIN = "logistics_admin"
    LOGISTICS_USER = "logistics_user"


class UserStatus(str, enum.Enum):
    """
    Unified user status enumeration.

    Merged from UserStatus and SubUserStatus.
    """

    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"  # Awaiting activation
    PENDING_INVITE = "pending_invite"  # Invited but not yet activated (employees)
    SUSPENDED = "suspended"  # Temporarily disabled


class User(BaseModel):
    """
    Unified User model for ALL user types in EcoTribe V3.

    Represents:
    - Platform: Super Admin, OPS Admin, Technician
    - Enterprise: Org Admin, IT Admin, Employee
    - Logistics: Logistics Admin, Logistics User

    Role-specific columns are nullable and only populated for relevant roles.
    """

    __tablename__ = "users"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # ==================== Core Foreign Keys ====================
    enterprise_id = Column(
        String,
        ForeignKey("enterprises.id", ondelete="CASCADE"),
        nullable=True,  # Null for platform roles (super_admin, ops_admin, technician)
        index=True,
    )
    branch_id = Column(
        String,
        ForeignKey("branches.id", ondelete="SET NULL"),
        nullable=True,  # For IT Admin and Employee roles
        index=True,
    )
    parent_user_id = Column(
        String,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,  # For logistics_user → logistics_admin hierarchy
        index=True,
    )

    # ==================== Core User Information ====================
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    role = Column(String, nullable=False, index=True)  # Stored as string, validated by Python enum
    status = Column(
        String,
        nullable=False,
        default=UserStatus.ACTIVE.value,
        server_default=UserStatus.ACTIVE.value,
        index=True,
    )

    # ==================== Authentication ====================
    password_hash = Column(Text, nullable=True)  # Null for OTP-only users (employees)
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    # OTP Authentication (for employees)
    otp_token = Column(String, nullable=True, index=True)
    otp_expires_at = Column(DateTime(timezone=True), nullable=True)

    # ==================== Employee-specific fields ====================
    # (role = EMPLOYEE)
    employee_id = Column(String, nullable=True, index=True)  # Company employee ID
    department = Column(String, nullable=True)
    designation = Column(String, nullable=True)

    # ==================== Logistics Admin-specific fields ====================
    # (role = LOGISTICS_ADMIN)
    company_name = Column(String, nullable=True)  # Logistics company name
    contact_person = Column(String, nullable=True)  # Primary contact
    address = Column(Text, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    service_areas = Column(JSON, nullable=True)  # Array of cities/regions served
    is_active = Column(Boolean, nullable=True, default=True)  # For logistics roles

    # ==================== Logistics User-specific fields ====================
    # (role = LOGISTICS_USER)
    vehicle_type = Column(String, nullable=True)
    vehicle_number = Column(String, nullable=True)

    # ==================== Relationships ====================
    # Enterprise relationships
    enterprise = relationship("Enterprise", back_populates="users")
    branch = relationship("Branch", back_populates="it_admins")

    # Self-referential for logistics hierarchy
    parent_user = relationship("User", remote_side=[id], backref="child_users")

    # Batch management
    created_batches = relationship(
        "Batch", back_populates="creator", foreign_keys="Batch.created_by"
    )

    # Notifications
    notifications = relationship(
        "Notification", back_populates="user", cascade="all, delete-orphan"
    )

    # Disputes
    assigned_disputes = relationship(
        "Dispute",
        foreign_keys="Dispute.assigned_to_user_id",
        back_populates="assigned_to",
        cascade="all, delete-orphan",
    )
    resolved_disputes = relationship(
        "Dispute", foreign_keys="Dispute.resolved_by_user_id", back_populates="resolved_by"
    )

    # Audit logs
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")

    # Employee-specific relationships (role = EMPLOYEE)
    assigned_assets = relationship(
        "Asset", back_populates="assigned_user", foreign_keys="Asset.assigned_to_user_id"
    )
    submissions = relationship(
        "Submission", back_populates="user", foreign_keys="Submission.user_id"
    )
    raised_disputes = relationship(
        "Dispute",
        foreign_keys="Dispute.raised_by_user_id",
        back_populates="raised_by_user",
    )

    # Logistics User-specific relationships (role = LOGISTICS_USER)
    pickup_requests = relationship(
        "PickupRequest",
        back_populates="logistics_user",
        foreign_keys="PickupRequest.logistics_user_id",
    )
    on_site_qc_records = relationship(
        "OnSiteQC", back_populates="performed_by_user", foreign_keys="OnSiteQC.performed_by_user_id"
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"

    @property
    def is_platform_role(self) -> bool:
        """Check if user has a platform role (no enterprise)."""
        return self.role in [
            UserRole.SUPER_ADMIN.value,
            UserRole.OPS_ADMIN.value,
            UserRole.TECHNICIAN.value,
        ]

    @property
    def is_enterprise_role(self) -> bool:
        """Check if user has an enterprise role."""
        return self.role in [
            UserRole.ORG_ADMIN.value,
            UserRole.IT_ADMIN.value,
            UserRole.EMPLOYEE.value,
        ]

    @property
    def is_logistics_role(self) -> bool:
        """Check if user has a logistics role."""
        return self.role in [UserRole.LOGISTICS_ADMIN.value, UserRole.LOGISTICS_USER.value]
