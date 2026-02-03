"""Authentication schemas for unified user model"""

from typing import Optional
from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole


class LoginRequest(BaseModel):
    """Login request schema for password-based authentication"""

    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="User password")


class LoginResponse(BaseModel):
    """Login response schema"""

    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    user: "UserResponse"


class RefreshTokenRequest(BaseModel):
    """Refresh token request schema"""

    refresh_token: str = Field(..., description="JWT refresh token")


class RefreshTokenResponse(BaseModel):
    """Refresh token response schema"""

    access_token: str = Field(..., description="New JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    user: "UserResponse"


# Employee OTP-based authentication (replaces SubUser schemas)
class EmployeeOTPRequest(BaseModel):
    """Employee OTP request schema"""

    email: EmailStr = Field(..., description="Employee email address")


class EmployeeOTPVerifyRequest(BaseModel):
    """Employee OTP verification schema"""

    email: EmailStr = Field(..., description="Employee email address")
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit OTP")


class EmployeeLoginResponse(BaseModel):
    """Employee login response schema"""

    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    user: "UserResponse"


class LogoutRequest(BaseModel):
    """Logout request schema"""

    refresh_token: Optional[str] = Field(
        None, description="Optional refresh token to invalidate"
    )


class ChangePasswordRequest(BaseModel):
    """Change password request schema"""

    current_password: str = Field(..., min_length=6, description="Current password")
    new_password: str = Field(..., min_length=8, description="New password (min 8 characters)")


class ForgotPasswordRequest(BaseModel):
    """Forgot password request schema (sends reset link)"""

    email: EmailStr = Field(..., description="User email address")


class ResetPasswordWithTokenRequest(BaseModel):
    """Reset password with token schema (from email link)"""

    token: str = Field(..., description="Password reset token from email")
    new_password: str = Field(..., min_length=8, description="New password (min 8 characters)")


class ResetPasswordRequest(BaseModel):
    """Reset password request schema"""

    email: EmailStr = Field(..., description="User email address")


class TokenPayload(BaseModel):
    """JWT token payload schema"""

    sub: str = Field(..., description="User ID (subject)")
    role: str = Field(..., description="User role")
    enterprise_id: Optional[str] = Field(None, description="Enterprise ID")
    branch_id: Optional[str] = Field(None, description="Branch ID")
    parent_user_id: Optional[str] = Field(
        None, description="Parent user ID (for logistics hierarchy)"
    )
    exp: int = Field(..., description="Expiration timestamp")
    type: str = Field(..., description="Token type (access/refresh)")


# Backward compatibility aliases (deprecated)
SubUserOTPRequest = EmployeeOTPRequest
SubUserOTPVerifyRequest = EmployeeOTPVerifyRequest
SubUserLoginResponse = EmployeeLoginResponse


# Import here to avoid circular imports
from app.schemas.user import UserResponse

LoginResponse.model_rebuild()
RefreshTokenResponse.model_rebuild()
EmployeeLoginResponse.model_rebuild()
