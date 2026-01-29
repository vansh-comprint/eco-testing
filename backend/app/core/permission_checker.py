"""
Permission checking utilities for RBAC.

Provides functions to check if a user has specific permissions
and to compare role hierarchies.
"""

from typing import List, Optional, Union
from app.models.user import User, UserRole
from app.core.permissions import Permission, ROLE_PERMISSIONS, ROLE_HIERARCHY
from app.utils.exceptions import AuthorizationError


def _get_user_role(role: Union[str, UserRole, None]) -> Optional[UserRole]:
    """
    Convert a role (string or enum) to UserRole enum.

    The database stores roles as strings, but ROLE_PERMISSIONS uses enum keys.
    This helper ensures consistent enum usage throughout permission checks.
    """
    if role is None:
        return None
    if isinstance(role, UserRole):
        return role
    try:
        return UserRole(role)
    except ValueError:
        return None


def has_permission(user: User, permission: Permission) -> bool:
    """
    Check if a user has a specific permission.

    Args:
        user: User object
        permission: Permission to check

    Returns:
        True if user has the permission, False otherwise

    Example:
        if has_permission(user, Permission.MANAGE_ASSETS):
            # User can manage assets
    """
    if not user or not user.role:
        return False

    user_role = _get_user_role(user.role)
    if not user_role:
        return False

    user_permissions = ROLE_PERMISSIONS.get(user_role, set())

    # Super admin has all permissions
    if Permission.ALL in user_permissions:
        return True

    return permission in user_permissions


def has_any_permission(user: User, permissions: List[Permission]) -> bool:
    """
    Check if a user has any of the specified permissions.
    
    Args:
        user: User object
        permissions: List of permissions to check
        
    Returns:
        True if user has at least one permission, False otherwise
    """
    return any(has_permission(user, perm) for perm in permissions)


def has_all_permissions(user: User, permissions: List[Permission]) -> bool:
    """
    Check if a user has all of the specified permissions.
    
    Args:
        user: User object
        permissions: List of permissions to check
        
    Returns:
        True if user has all permissions, False otherwise
    """
    return all(has_permission(user, perm) for perm in permissions)


def require_permission(user: User, permission: Permission) -> None:
    """
    Require a user to have a specific permission, raise exception if not.
    
    Args:
        user: User object
        permission: Required permission
        
    Raises:
        AuthorizationError: If user doesn't have the permission
    """
    if not has_permission(user, permission):
        raise AuthorizationError(
            f"Access denied. Required permission: {permission.value}"
        )


def require_any_permission(user: User, permissions: List[Permission]) -> None:
    """
    Require a user to have at least one of the specified permissions.
    
    Args:
        user: User object
        permissions: List of permissions (user needs at least one)
        
    Raises:
        AuthorizationError: If user doesn't have any of the permissions
    """
    if not has_any_permission(user, permissions):
        perm_names = [p.value for p in permissions]
        raise AuthorizationError(
            f"Access denied. Required one of: {', '.join(perm_names)}"
        )


def require_all_permissions(user: User, permissions: List[Permission]) -> None:
    """
    Require a user to have all of the specified permissions.
    
    Args:
        user: User object
        permissions: List of permissions (user needs all)
        
    Raises:
        AuthorizationError: If user doesn't have all permissions
    """
    if not has_all_permissions(user, permissions):
        perm_names = [p.value for p in permissions]
        raise AuthorizationError(
            f"Access denied. Required all of: {', '.join(perm_names)}"
        )


def get_user_permissions(user: User) -> List[Permission]:
    """
    Get all permissions for a user.

    Args:
        user: User object

    Returns:
        List of permissions the user has
    """
    if not user or not user.role:
        return []

    user_role = _get_user_role(user.role)
    if not user_role:
        return []

    user_permissions = ROLE_PERMISSIONS.get(user_role, set())

    # If user has wildcard, return all permissions
    if Permission.ALL in user_permissions:
        return list(Permission)

    return list(user_permissions)


def has_higher_or_equal_role(user: User, target_role: UserRole) -> bool:
    """
    Check if user's role is higher or equal in hierarchy to target role.

    Args:
        user: User object
        target_role: Role to compare against

    Returns:
        True if user's role is >= target role in hierarchy

    Example:
        # Check if user can manage IT Admins
        if has_higher_or_equal_role(user, UserRole.IT_ADMIN):
            # User's role is higher than IT Admin
    """
    if not user or not user.role:
        return False

    user_role = _get_user_role(user.role)
    if not user_role:
        return False

    user_level = ROLE_HIERARCHY.get(user_role, 0)
    target_level = ROLE_HIERARCHY.get(target_role, 0)

    return user_level >= target_level


def can_manage_user(manager: User, target_user: User) -> bool:
    """
    Check if a manager can manage a target user based on role hierarchy.

    Args:
        manager: User who wants to manage
        target_user: User to be managed

    Returns:
        True if manager can manage target user

    Rules:
        - Super admin can manage anyone
        - Users can only manage users with lower hierarchy level
        - Org Admin can manage IT Admins in their enterprise
        - IT Admin cannot manage other IT Admins
    """
    if not manager or not target_user:
        return False

    manager_role = _get_user_role(manager.role)
    target_role = _get_user_role(target_user.role)

    if not manager_role or not target_role:
        return False

    # Super admin can manage anyone
    if manager_role == UserRole.SUPER_ADMIN:
        return True

    manager_level = ROLE_HIERARCHY.get(manager_role, 0)
    target_level = ROLE_HIERARCHY.get(target_role, 0)

    # Manager must have higher hierarchy level
    if manager_level <= target_level:
        return False

    # Enterprise-level checks
    if manager.enterprise_id and target_user.enterprise_id:
        # Must be in same enterprise
        if manager.enterprise_id != target_user.enterprise_id:
            return False

    return True

