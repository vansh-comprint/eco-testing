"""Authentication middleware and dependencies"""

from typing import List, Callable, Optional
from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
try:
    from redis.asyncio import Redis
except ImportError:
    Redis = None

from app.core.database import get_db
from app.core.redis_client import get_redis
from app.core.security import decode_token, is_token_in_whitelist
from app.core.config import settings
from app.core.permissions import Permission
from app.core.permission_checker import (
    require_permission as check_permission,
    require_any_permission as check_any_permission,
    require_all_permissions as check_all_permissions,
)
from app.models.user import User, UserRole
from app.utils.exceptions import AuthenticationError, AuthorizationError

# HTTP Bearer token scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
    redis: Optional[Redis] = Depends(get_redis),
) -> User:
    """
    Dependency to get the current authenticated user from JWT token.

    Validation order (optimized for performance):
    1. JWT signature validation (0.1ms, CPU only) - filters out 99% of invalid requests
    2. Token type check (0.001ms, CPU only)
    3. Expiry check (0.001ms, CPU only)
    4. Redis whitelist check (1-2ms, I/O) - only if Redis is enabled
    5. User lookup (5ms, database I/O)

    Args:
        credentials: HTTP Bearer token credentials
        db: Database session
        redis: Redis client (None if Redis is disabled)

    Returns:
        User: Current authenticated user

    Raises:
        AuthenticationError: If token is invalid or user not found

    Example:
        @router.get("/profile")
        async def get_profile(current_user: User = Depends(get_current_user)):
            return current_user
    """
    token = credentials.credentials

    # STEP 1: JWT signature validation (0.1ms, CPU only)
    # This filters out 99% of invalid requests before any I/O
    payload = decode_token(token)
    if not payload:
        raise AuthenticationError("Invalid or expired token")

    # STEP 2: Token type check (0.001ms, CPU only)
    if payload.get("type") != "access":
        raise AuthenticationError("Invalid token type")

    # STEP 3: Expiry check (redundant but explicit, already checked in decode_token)
    # JWT library already validates expiry, but we can add explicit check if needed

    # STEP 4: Redis whitelist check (soft fallback)
    # Try Redis whitelist if available, but fall back to stateless JWT if Redis
    # is unavailable or token isn't in whitelist (e.g. Redis was restarted).
    user_id = payload.get("sub")
    if not user_id:
        raise AuthenticationError("Invalid token payload")

    if redis and settings.use_redis_sessions:
        try:
            user_id_from_redis = await is_token_in_whitelist(redis, token, "access")
            if user_id_from_redis:
                user_id = user_id_from_redis
            # If not in whitelist, fall through to stateless JWT (user_id from payload)
        except Exception:
            pass  # Redis error — fall back to stateless JWT

    # STEP 5: User lookup (5ms, database I/O)
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        raise AuthenticationError("User not found")

    if user.status != "active":
        raise AuthenticationError("User account is inactive")

    return user


async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency to get current active user.

    Args:
        current_user: Current user from get_current_user

    Returns:
        User: Current active user

    Raises:
        AuthenticationError: If user is inactive
    """
    if current_user.status != "active":
        raise AuthenticationError("User account is inactive")
    return current_user


def require_roles(allowed_roles: List[UserRole]):
    """
    Dependency factory to require specific roles.

    Args:
        allowed_roles: List of allowed user roles

    Returns:
        Dependency function that checks user role

    Example:
        @router.get("/admin-only")
        async def admin_endpoint(
            current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN]))
        ):
            return {"message": "Admin access granted"}
    """
    allowed_values = {role.value for role in allowed_roles}

    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_values:
            raise AuthorizationError(
                f"Access denied. Required roles: {[role.value for role in allowed_roles]}"
            )
        return current_user

    return role_checker


# Convenience dependencies for common role checks
async def require_super_admin(
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN])),
) -> User:
    """Require Super Admin role"""
    return current_user


async def require_ops_admin(
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN]))
) -> User:
    """Require OPS Admin or higher"""
    return current_user


async def require_org_admin(
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]))
) -> User:
    """Require Org Admin or Super Admin"""
    return current_user


async def require_it_admin(
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.IT_ADMIN]))
) -> User:
    """Require IT Admin or Super Admin"""
    return current_user


async def require_logistics_admin(
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.LOGISTICS_ADMIN]))
) -> User:
    """Require Logistics Admin or Super Admin"""
    return current_user


async def require_logistics_user(
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.LOGISTICS_USER]))
) -> User:
    """Require Logistics User or Super Admin"""
    return current_user


def check_enterprise_access(user: User, enterprise_id: str) -> None:
    """
    Check if user has access to a specific enterprise.

    Args:
        user: Current user
        enterprise_id: Enterprise ID to check access for

    Raises:
        AuthorizationError: If user doesn't have access
    """
    # Super admin and ops admin have access to all enterprises
    if user.role in [UserRole.SUPER_ADMIN.value, UserRole.OPS_ADMIN.value]:
        return

    # Other users must belong to the enterprise
    if user.enterprise_id != enterprise_id:
        raise AuthorizationError("You don't have access to this enterprise")


# ============================================================================
# Permission-Based Access Control Dependencies
# ============================================================================


def require_permission(permission: Permission) -> Callable:
    """
    Dependency factory to require a specific permission.

    Args:
        permission: Required permission

    Returns:
        Dependency function that checks user permission

    Example:
        @router.post("/assets")
        async def create_asset(
            current_user: User = Depends(require_permission(Permission.MANAGE_ASSETS))
        ):
            return {"message": "Asset created"}
    """

    async def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        check_permission(current_user, permission)
        return current_user

    return permission_checker


def require_any_permission(permissions: List[Permission]) -> Callable:
    """
    Dependency factory to require any of the specified permissions.

    Args:
        permissions: List of permissions (user needs at least one)

    Returns:
        Dependency function that checks user permissions

    Example:
        @router.get("/reviews")
        async def list_reviews(
            current_user: User = Depends(require_any_permission([
                Permission.REMOTE_REVIEW,
                Permission.FACILITY_QC
            ]))
        ):
            return {"reviews": []}
    """

    async def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        check_any_permission(current_user, permissions)
        return current_user

    return permission_checker


def require_all_permissions(permissions: List[Permission]) -> Callable:
    """
    Dependency factory to require all of the specified permissions.

    Args:
        permissions: List of permissions (user needs all)

    Returns:
        Dependency function that checks user permissions

    Example:
        @router.post("/high-value-approval")
        async def approve_high_value(
            current_user: User = Depends(require_all_permissions([
                Permission.APPROVE_PICKUPS,
                Permission.APPROVE_HIGH_VALUE
            ]))
        ):
            return {"message": "Approved"}
    """

    async def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        check_all_permissions(current_user, permissions)
        return current_user

    return permission_checker


# ============================================================================
# Convenience Permission Dependencies
# ============================================================================


# Asset Management
async def can_manage_assets(
    current_user: User = Depends(require_permission(Permission.MANAGE_ASSETS)),
) -> User:
    """Require permission to manage assets"""
    return current_user


async def can_view_all_assets(
    current_user: User = Depends(require_permission(Permission.VIEW_ALL_ASSETS)),
) -> User:
    """Require permission to view all assets"""
    return current_user


# Batch Management
async def can_manage_batches(
    current_user: User = Depends(require_permission(Permission.MANAGE_BATCHES)),
) -> User:
    """Require permission to manage batches"""
    return current_user


async def can_approve_pickups(
    current_user: User = Depends(require_permission(Permission.APPROVE_PICKUPS)),
) -> User:
    """Require permission to approve pickups"""
    return current_user


# Review & QC
async def can_remote_review(
    current_user: User = Depends(require_permission(Permission.REMOTE_REVIEW)),
) -> User:
    """Require permission to perform remote reviews"""
    return current_user


async def can_facility_qc(
    current_user: User = Depends(require_permission(Permission.FACILITY_QC)),
) -> User:
    """Require permission to perform facility QC"""
    return current_user


# Financial
async def can_view_financial_reports(
    current_user: User = Depends(require_permission(Permission.VIEW_FINANCIAL_REPORTS)),
) -> User:
    """Require permission to view financial reports"""
    return current_user


# Enterprise Management
async def can_manage_enterprises(
    current_user: User = Depends(require_permission(Permission.MANAGE_ENTERPRISES)),
) -> User:
    """Require permission to manage enterprises"""
    return current_user
