"""
Role-based data scoping utilities.

This module provides utilities to automatically scope data access 
based on the current user's role and context.
"""

from typing import Optional, Dict, Any
from app.models.user import User, UserRole


def get_scoped_filters(current_user: User) -> Dict[str, Any]:
    """
    Get filter parameters based on current user's role.
    
    Scoping rules:
    - Super Admin / OPS Admin / Technician: No filter (access to all)
    - Org Admin: Filter by their enterprise_id
    - IT Admin: Filter by their enterprise_id and branch_id
    - Employee: Filter by their enterprise_id (and optionally branch_id)
    - Logistics Admin: Filter by parent_user_id (for their logistics users)
    - Logistics User: Only their own data
    
    Returns:
        Dict with filter parameters to apply to queries
    """
    filters: Dict[str, Any] = {}
    
    # Platform admins can see all
    if current_user.role in [
        UserRole.SUPER_ADMIN.value,
        UserRole.OPS_ADMIN.value,
        UserRole.TECHNICIAN.value,
    ]:
        return filters
    
    # Logistics Admin sees their logistics users
    if current_user.role == UserRole.LOGISTICS_ADMIN.value:
        filters["parent_user_id"] = current_user.id
        return filters
    
    # Logistics User can only see their own data
    if current_user.role == UserRole.LOGISTICS_USER.value:
        filters["user_id"] = current_user.id
        return filters
    
    # Enterprise users are scoped to their enterprise
    if current_user.enterprise_id:
        filters["enterprise_id"] = current_user.enterprise_id

    # Employee: only see assets assigned to them (not all branch/enterprise assets)
    if current_user.role == UserRole.EMPLOYEE.value:
        filters["assigned_to_user_id"] = current_user.id
        return filters

    # IT Admin is further scoped to their branch
    if current_user.role == UserRole.IT_ADMIN.value:
        if current_user.branch_id:
            filters["branch_id"] = current_user.branch_id

    return filters


def is_platform_admin(user: User) -> bool:
    """Check if user is a platform admin (Super Admin or OPS Admin)."""
    return user.role in [UserRole.SUPER_ADMIN.value, UserRole.OPS_ADMIN.value]


def is_enterprise_admin(user: User) -> bool:
    """Check if user is an enterprise admin (Org Admin or IT Admin)."""
    return user.role in [UserRole.ORG_ADMIN.value, UserRole.IT_ADMIN.value]


def can_access_enterprise(user: User, enterprise_id: str) -> bool:
    """
    Check if user can access data for a specific enterprise.
    
    Returns True if:
    - User is a platform admin (can access all)
    - User belongs to the specified enterprise
    """
    if is_platform_admin(user):
        return True
    return user.enterprise_id == enterprise_id


def can_access_branch(user: User, branch_id: str, enterprise_id: Optional[str] = None) -> bool:
    """
    Check if user can access data for a specific branch.
    
    Returns True if:
    - User is a platform admin (can access all)
    - User is an Org Admin for the enterprise
    - User belongs to the specified branch
    """
    if is_platform_admin(user):
        return True
    
    # Org Admin can access all branches in their enterprise
    if user.role == UserRole.ORG_ADMIN.value:
        if enterprise_id:
            return user.enterprise_id == enterprise_id
        return True  # Will need enterprise check elsewhere
    
    # IT Admin and employees can only access their branch
    return user.branch_id == branch_id


def auto_fill_context(
    user: User,
    enterprise_id: Optional[str] = None,
    branch_id: Optional[str] = None,
) -> tuple[Optional[str], Optional[str]]:
    """
    Auto-fill enterprise_id and branch_id from user context if not provided.
    
    Args:
        user: Current user
        enterprise_id: Provided enterprise_id (or None)
        branch_id: Provided branch_id (or None)
        
    Returns:
        Tuple of (enterprise_id, branch_id) with auto-filled values
    """
    if not enterprise_id and user.enterprise_id:
        enterprise_id = user.enterprise_id
    if not branch_id and user.branch_id:
        branch_id = user.branch_id
    return enterprise_id, branch_id

