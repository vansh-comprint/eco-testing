"""User schemas for unified user model"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator

from app.models.user import UserRole, UserStatus


class UserBase(BaseModel):
    """Base user schema with common fields"""

    email: EmailStr
    name: str = Field(..., min_length=1, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)


# ==================== User Create Schema ====================


class UserCreate(UserBase):
    """
    Schema for creating any user type.

    - For admin users (password-based): provide password
    - For employees (OTP-based): omit password, role will be set to EMPLOYEE
    """

    role: UserRole
    password: Optional[str] = Field(
        None, min_length=8, description="Password (required for non-employee roles)"
    )
    enterprise_id: Optional[str] = None
    branch_id: Optional[str] = None
    parent_user_id: Optional[str] = Field(None, description="Parent user ID (for logistics users)")

    # Employee-specific fields
    employee_id: Optional[str] = Field(None, max_length=50)
    department: Optional[str] = Field(None, max_length=100)
    designation: Optional[str] = Field(None, max_length=100)

    # Logistics-specific fields
    company_name: Optional[str] = Field(None, max_length=255)
    contact_person: Optional[str] = Field(None, max_length=255)
    address: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    service_areas: Optional[List[str]] = None
    vehicle_type: Optional[str] = Field(None, max_length=50)
    vehicle_number: Optional[str] = Field(None, max_length=20)

    @field_validator("password", mode="before")
    @classmethod
    def validate_password(cls, v, info):
        """Validate password is provided for non-employee roles"""
        # This validator runs before other validations
        # Full validation happens in the service layer
        return v


class UserBulkCreate(BaseModel):
    """
    Schema for bulk creating users (typically employees).

    enterprise_id is optional - will be derived from current user's context if not provided.
    """

    enterprise_id: Optional[str] = None
    branch_id: Optional[str] = None
    role: UserRole = UserRole.EMPLOYEE
    users: List["UserBulkItem"]


class UserBulkItem(BaseModel):
    """Individual user item for bulk creation"""

    email: EmailStr
    name: str = Field(..., min_length=1, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    password: Optional[str] = Field(None, min_length=6, max_length=128)
    employee_id: Optional[str] = Field(None, max_length=50)
    department: Optional[str] = Field(None, max_length=100)
    designation: Optional[str] = Field(None, max_length=100)
    branch_id: Optional[str] = None


# ==================== Password Reset Schema ====================


class PasswordReset(BaseModel):
    """Schema for admin-initiated password reset"""

    new_password: str = Field(..., min_length=8, description="New password (min 8 characters)")


# ==================== User Update Schema ====================


class UserUpdate(BaseModel):
    """Schema for updating any user"""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None
    branch_id: Optional[str] = None

    # Employee-specific
    employee_id: Optional[str] = Field(None, max_length=50)
    department: Optional[str] = Field(None, max_length=100)
    designation: Optional[str] = Field(None, max_length=100)

    # Logistics-specific
    company_name: Optional[str] = Field(None, max_length=255)
    contact_person: Optional[str] = Field(None, max_length=255)
    address: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    service_areas: Optional[List[str]] = None
    is_active: Optional[bool] = None
    vehicle_type: Optional[str] = Field(None, max_length=50)
    vehicle_number: Optional[str] = Field(None, max_length=20)


# ==================== Response Schemas ====================


class UserResponse(UserBase):
    """Schema for user response"""

    model_config = ConfigDict(from_attributes=True)

    id: str
    role: str
    status: str
    enterprise_id: Optional[str] = None
    branch_id: Optional[str] = None
    parent_user_id: Optional[str] = None

    # Computed fields - populated from relations
    enterprise_name: Optional[str] = None
    branch_name: Optional[str] = None

    # Employee fields
    employee_id: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None

    # Logistics fields
    company_name: Optional[str] = None
    contact_person: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    is_active: Optional[bool] = None

    # Timestamps
    created_at: datetime
    last_login_at: Optional[datetime] = None


class UserWithPermissionsResponse(UserResponse):
    """Schema for user response with permissions"""

    permissions: List[str] = Field(default_factory=list, description="List of user permissions")


class UserListResponse(BaseModel):
    """Schema for paginated user list response"""

    users: List[UserResponse]
    total: int
