"""User management endpoints for unified user model"""

from typing import Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import get_current_user, require_permission
from app.core.permissions import Permission
from app.models.user import User, UserRole, UserStatus
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserBulkCreate, PasswordReset
from app.services.user_service import UserService
from app.utils.response import success_response, paginated_response

# Exceptions are handled by middleware - no need to import here
from app.utils.scoping import (
    get_scoped_filters,
    auto_fill_context,
    can_access_enterprise,
    is_platform_admin,
)

router = APIRouter()


def _get_required_permission(role: Optional[UserRole], action: str) -> Permission:
    """
    Determine the required permission based on role and action.

    - For employees: use EMPLOYEE_* permissions
    - For logistics users: use MANAGE_LOGISTICS_USERS (allows logistics admins to manage their users)
    - For other roles: use USER_* permissions
    """
    if role == UserRole.EMPLOYEE:
        return getattr(Permission, f"EMPLOYEE_{action}")
    if role == UserRole.LOGISTICS_USER:
        return Permission.MANAGE_LOGISTICS_USERS
    return getattr(Permission, f"USER_{action}")


# ============================================================================
# USER ENDPOINTS
# ============================================================================


@router.get("", response_model=dict)
async def list_users(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=100, description="Number of records to return"),
    role: Optional[UserRole] = Query(None, description="Filter by role (e.g., employee, it_admin)"),
    status: Optional[UserStatus] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by name, email, phone, or employee ID"),
    enterprise_id: Optional[str] = Query(
        None, description="Filter by enterprise ID (platform admins only)"
    ),
    branch_id: Optional[str] = Query(
        None, description="Filter by branch ID (platform/enterprise admins only)"
    ),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List users with optional filters and pagination.

    Data is automatically scoped based on user's role:
    - Super Admin / OPS Admin: Can filter by enterprise_id/branch_id
    - Org Admin: Users in their enterprise
    - IT Admin: Users in their branch
    - Logistics Admin: Their logistics users

    Use role filter to get specific user types:
    - `role=employee` - List employees
    - `role=it_admin` - List IT admins
    - `role=logistics_user` - List logistics users

    **Permissions:** USER_READ or EMPLOYEE_READ (based on role filter)
    """
    # Check appropriate permission based on role
    required_permission = _get_required_permission(role, "READ")
    await require_permission(required_permission)(current_user)

    # Get scoped filters based on current user's role
    scoped_filters = get_scoped_filters(current_user)

    # Only platform admins can explicitly filter by enterprise/branch
    # Non-platform admins are locked to their scoped_filters from get_scoped_filters()
    if is_platform_admin(current_user):
        if enterprise_id:
            scoped_filters["enterprise_id"] = enterprise_id
        if branch_id:
            scoped_filters["branch_id"] = branch_id

    service = UserService(db)
    users, total = await service.list_users(
        skip=skip,
        limit=limit,
        role=role,
        status=status,
        search=search,
        **scoped_filters,
    )

    return paginated_response(
        data=[user.model_dump() for user in users],
        total=total,
        page=(skip // limit) + 1,
        page_size=limit,
    )


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new user.

    - For employees (role=employee): Password defaults to 'password123' if not provided
    - For all other roles: Password is required

    Enterprise/branch context is automatically derived from current user's role
    unless explicitly provided (for platform admins).

    **Permissions:** USER_CREATE or EMPLOYEE_CREATE (based on role)
    """
    # Check appropriate permission based on role
    required_permission = _get_required_permission(user_data.role, "CREATE")
    await require_permission(required_permission)(current_user)

    # Auto-fill enterprise_id/branch_id from current user if not provided
    user_data.enterprise_id, user_data.branch_id = auto_fill_context(
        current_user, user_data.enterprise_id, user_data.branch_id
    )

    # Logistics admin can only create logistics users under themselves
    if current_user.role == UserRole.LOGISTICS_ADMIN.value:
        if user_data.role == UserRole.LOGISTICS_USER:
            user_data.parent_user_id = current_user.id  # Force to own ID
        else:
            from app.utils.exceptions import AuthorizationError

            raise AuthorizationError("Logistics admin can only create logistics users")

    service = UserService(db)
    user = await service.create_user(user_data, current_user.id)
    return success_response(data=user.model_dump(), message="User created successfully")


@router.get("/me", response_model=dict)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    """
    Get current user profile.

    **Permissions:** Authenticated user
    """
    return success_response(data=UserResponse.model_validate(current_user).model_dump())


@router.put("/me", response_model=dict)
async def update_current_user_profile(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update current user profile.

    **Permissions:** Authenticated user
    """
    service = UserService(db)
    user = await service.update_user(current_user.id, user_data, current_user.id)
    return success_response(data=user.model_dump(), message="Profile updated successfully")


@router.get("/it-admins", response_model=dict)
async def list_it_admins_with_branches(
    enterprise_id: str = Query(..., description="Enterprise ID to fetch IT admins for"),
    current_user: User = Depends(require_permission(Permission.USER_READ)),
    db: AsyncSession = Depends(get_db),
):
    """
    List IT admins for an enterprise with their assigned branch details.

    Returns each IT admin with branch_count and branches array.

    **Permissions:** USER_READ
    """
    # Verify current user has access to this enterprise
    if not can_access_enterprise(current_user, enterprise_id):
        from app.utils.exceptions import AuthorizationError

        raise AuthorizationError("You don't have access to users from this enterprise")

    service = UserService(db)
    data = await service.get_it_admins_with_branches(enterprise_id)

    return success_response(data=data)


@router.get("/{user_id}", response_model=dict)
async def get_user(
    user_id: str,
    current_user: User = Depends(require_permission(Permission.USER_READ)),
    db: AsyncSession = Depends(get_db),
):
    """
    Get user by ID.

    **Permissions:** USER_READ
    **Roles:** Super Admin, OPS Admin, Org Admin
    """
    service = UserService(db)
    user = await service.get_user(user_id)
    return success_response(data=user.model_dump())


@router.put("/{user_id}", response_model=dict)
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    current_user: User = Depends(require_permission(Permission.USER_UPDATE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Update user by ID.

    **Permissions:** USER_UPDATE
    **Roles:** Super Admin, OPS Admin

    Note: Users cannot modify users at or above their role hierarchy level.
    """
    service = UserService(db)
    user = await service.update_user(user_id, user_data, current_user.id, actor=current_user)
    return success_response(data=user.model_dump(), message="User updated successfully")


@router.delete("/{user_id}", response_model=dict, status_code=status.HTTP_200_OK)
async def delete_user(
    user_id: str,
    current_user: User = Depends(require_permission(Permission.USER_DELETE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete user by ID.

    **Permissions:** USER_DELETE
    **Roles:** Super Admin

    Note: Users cannot delete users at or above their role hierarchy level.
    """
    service = UserService(db)
    await service.delete_user(user_id, actor=current_user)
    return success_response(message="User deleted successfully")


# ============================================================================
# PASSWORD MANAGEMENT
# ============================================================================


@router.post("/{user_id}/reset-password", response_model=dict)
async def reset_user_password(
    user_id: str,
    password_data: PasswordReset,
    current_user: User = Depends(require_permission(Permission.USER_UPDATE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Reset a user's password (admin-initiated).

    This endpoint allows platform admins (Super Admin, OPS Admin) to reset
    passwords for other users. The user's existing sessions will be invalidated.

    **Permissions:** USER_UPDATE
    **Roles:** Super Admin, OPS Admin

    Note: Employees use OTP-based auth and cannot have passwords reset.
    """
    service = UserService(db)
    user = await service.reset_password(user_id, password_data.new_password, actor=current_user)
    return success_response(data=user.model_dump(), message="Password reset successfully")


# ============================================================================
# BULK USER CREATION
# ============================================================================


@router.post("/bulk", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_users_bulk(
    bulk_data: UserBulkCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create multiple users in bulk (typically employees).

    Enterprise/branch context is automatically derived from current user's role
    unless explicitly provided.

    **Permissions:** USER_CREATE or EMPLOYEE_CREATE (based on role)
    """
    # Check appropriate permission based on role
    required_permission = _get_required_permission(bulk_data.role, "CREATE")
    await require_permission(required_permission)(current_user)

    # Auto-fill enterprise_id/branch_id from current user if not provided
    bulk_data.enterprise_id, bulk_data.branch_id = auto_fill_context(
        current_user, bulk_data.enterprise_id, bulk_data.branch_id
    )

    service = UserService(db)
    users, errors = await service.create_users_bulk(bulk_data, current_user.id)

    response_data = {
        "created": [user.model_dump() for user in users],
        "errors": errors,
        "created_count": len(users),
        "error_count": len(errors),
    }

    return success_response(
        data=response_data,
        message=f"{len(users)} users created successfully"
        + (f", {len(errors)} errors" if errors else ""),
    )
