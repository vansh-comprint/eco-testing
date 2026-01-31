"""Authentication endpoints for unified user model"""

from fastapi import APIRouter, Depends, status, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_db
from app.core.security import async_blacklist_token
from app.schemas.auth import (
    LoginRequest,
    RefreshTokenRequest,
    EmployeeOTPRequest,
    EmployeeOTPVerifyRequest,
    LogoutRequest,
)
from app.schemas.user import UserResponse
from app.core.permission_checker import get_user_permissions
from app.services.auth_service import AuthService
from app.middleware.auth import get_current_user
from app.middleware.rate_limit import (
    rate_limit_login,
    rate_limit_otp,
    rate_limit_otp_send,
)
from app.utils.response import success_response

router = APIRouter()


@router.post("/login", response_model=dict, status_code=status.HTTP_200_OK)
async def login(
    request: LoginRequest,
    http_request: Request,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limit_login),
):
    """
    Login endpoint for admin users (password-based).

    Authenticates user with email and password, returns JWT tokens.
    Employees must use OTP-based login instead.

    Rate limited to 5 attempts per minute per IP address.

    **Roles:** All admin roles (Super Admin, OPS Admin, Org Admin, IT Admin,
    Logistics Admin, Logistics User)
    """
    auth_service = AuthService(db)
    access_token, refresh_token, user = await auth_service.login(request)

    response_data = {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(user),
    }

    return success_response(data=response_data, message="Login successful")


@router.post("/refresh", response_model=dict, status_code=status.HTTP_200_OK)
async def refresh_token(request: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    """
    Refresh access token using refresh token.

    SECURITY: Implements token rotation - returns a new refresh token.
    The old refresh token is invalidated after use.

    **Roles:** All authenticated users
    """
    auth_service = AuthService(db)
    access_token, new_refresh_token, user = await auth_service.refresh_access_token(
        request.refresh_token
    )

    response_data = {
        "access_token": access_token,
        "refresh_token": new_refresh_token,  # New refresh token for rotation
        "token_type": "bearer",
        "user": UserResponse.model_validate(user),
    }

    return success_response(data=response_data, message="Token refreshed successfully")


# ==================== Employee OTP Authentication ====================


@router.post("/employee/request-otp", response_model=dict, status_code=status.HTTP_200_OK)
async def request_employee_otp(
    request: EmployeeOTPRequest,
    http_request: Request,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limit_otp_send),
):
    """
    Request OTP for employee authentication.

    Sends a 6-digit OTP to the employee's email.
    Rate limited to 3 attempts per 5 minutes per IP address.

    **Roles:** Employees only
    """
    auth_service = AuthService(db)
    user = await auth_service.send_employee_otp(request)

    return success_response(
        data={"email": user.email}, message="OTP sent successfully to your email"
    )


@router.post("/employee/verify-otp", response_model=dict, status_code=status.HTTP_200_OK)
async def verify_employee_otp(
    request: EmployeeOTPVerifyRequest,
    http_request: Request,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limit_otp),
):
    """
    Verify OTP and login employee.

    Validates the OTP and returns JWT tokens.
    Rate limited to 10 attempts per minute per IP address.

    **Roles:** Employees only
    """
    auth_service = AuthService(db)
    access_token, refresh_token, user = await auth_service.verify_employee_otp(request)

    response_data = {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(user),
    }

    return success_response(data=response_data, message="Login successful")


# ==================== Current User ====================


@router.get("/me", response_model=dict, status_code=status.HTTP_200_OK)
async def get_current_user_info(
    current_user=Depends(get_current_user),
):
    """
    Get current authenticated user information with permissions.

    Returns user details along with their role-based permissions.

    **Roles:** All authenticated users
    """
    # Get user permissions
    permissions = get_user_permissions(current_user)
    permission_strings = [p.value for p in permissions]

    # Create response with permissions
    user_data = UserResponse.model_validate(current_user).model_dump()
    user_data["permissions"] = permission_strings

    return success_response(
        data=user_data,
        message="User information retrieved successfully",
    )


# ==================== Logout ====================


@router.post("/logout", response_model=dict, status_code=status.HTTP_200_OK)
async def logout(
    request: Optional[LogoutRequest] = None,
    authorization: Optional[str] = Header(None),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Logout user and invalidate tokens.

    Adds the current access token to a blacklist, preventing its reuse.
    Optionally accepts refresh_token in request body to invalidate it too.

    **Roles:** All authenticated users
    """
    # Blacklist the access token from header (DB-backed, cross-worker safe)
    if authorization and authorization.startswith("Bearer "):
        access_token = authorization[7:]
        await async_blacklist_token(access_token, db)

    # Blacklist refresh token if provided
    if request and request.refresh_token:
        await async_blacklist_token(request.refresh_token, db)

    return success_response(
        data=None,
        message="Successfully logged out",
    )


# ==================== Backward Compatibility (Deprecated) ====================


@router.post(
    "/sub-user/request-otp",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    deprecated=True,
)
async def request_sub_user_otp(
    request: EmployeeOTPRequest,
    http_request: Request,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limit_otp_send),
):
    """
    **DEPRECATED:** Use /employee/request-otp instead.

    Request OTP for employee authentication.
    """
    return await request_employee_otp(request, http_request, db, _)


@router.post(
    "/sub-user/verify-otp",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    deprecated=True,
)
async def verify_sub_user_otp(
    request: EmployeeOTPVerifyRequest,
    http_request: Request,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limit_otp),
):
    """
    **DEPRECATED:** Use /employee/verify-otp instead.

    Verify OTP and login employee.
    """
    return await verify_employee_otp(request, http_request, db, _)
