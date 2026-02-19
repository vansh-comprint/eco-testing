"""Branch management endpoints"""

from typing import Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import require_permission
from app.core.permissions import Permission
from app.models.user import User, UserRole
from app.models.enterprise import BranchStatus
from app.schemas.branch import BranchCreate, BranchUpdate, BranchBulkCreate
from app.services.branch_service import BranchService
from app.utils.response import success_response, paginated_response
from app.utils.exceptions import AuthorizationError
from app.utils.scoping import (
    get_scoped_filters,
    auto_fill_context,
    is_platform_admin,
    can_access_enterprise,
)

router = APIRouter()


@router.get("", response_model=dict)
async def list_branches(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=100, description="Number of records to return"),
    status: Optional[BranchStatus] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by name, code, or city"),
    enterprise_id: Optional[str] = Query(
        None, description="Filter by enterprise ID (Super Admin only)"
    ),
    it_admin_id: Optional[str] = Query(None, description="Filter by IT Admin ID"),
    current_user: User = Depends(require_permission(Permission.BRANCH_READ)),
    db: AsyncSession = Depends(get_db),
):
    """
    List branches with automatic role-based scoping.

    Data is automatically scoped based on user's role:
    - Super Admin / OPS Admin: All branches (can filter by enterprise_id, it_admin_id)
    - Org Admin: Branches in their enterprise
    - IT Admin: Only branches assigned to them (via it_admin_id)

    **Permissions:** BRANCH_READ
    """
    scoped_filters = get_scoped_filters(current_user)

    # Use explicit enterprise_id if provided (for Super Admin), otherwise use scoped filter
    filter_enterprise_id = enterprise_id or scoped_filters.get("enterprise_id")

    # For IT Admin: auto-scope to their branches via it_admin_id
    filter_it_admin_id = it_admin_id
    if current_user.role == UserRole.IT_ADMIN.value and not filter_it_admin_id:
        filter_it_admin_id = current_user.id

    service = BranchService(db)
    branches, total = await service.list_branches(
        skip=skip,
        limit=limit,
        enterprise_id=filter_enterprise_id,
        it_admin_id=filter_it_admin_id,
        status=status,
        search=search,
    )

    return paginated_response(
        data=[branch.model_dump() for branch in branches],
        total=total,
        page=(skip // limit) + 1,
        page_size=limit,
    )


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_branch(
    branch_data: BranchCreate,
    current_user: User = Depends(require_permission(Permission.BRANCH_CREATE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new branch.

    Enterprise context is automatically derived from current user's role.
    For IT Admin creators, it_admin_id is auto-set to their own ID.

    **Permissions:** BRANCH_CREATE
    """
    # Auto-fill enterprise_id from current user if not provided
    branch_data.enterprise_id, _ = auto_fill_context(current_user, branch_data.enterprise_id, None)

    # IT Admin creating a branch: auto-assign to themselves
    if current_user.role == UserRole.IT_ADMIN.value:
        branch_data.it_admin_id = current_user.id

    service = BranchService(db)
    branch = await service.create_branch(branch_data, current_user.id)
    return success_response(data=branch.model_dump(), message="Branch created successfully")


@router.get("/summary", response_model=dict)
async def get_branches_summary(
    enterprise_id: str = Query(..., description="Enterprise ID"),
    current_user: User = Depends(require_permission(Permission.BRANCH_READ)),
    db: AsyncSession = Depends(get_db),
):
    """
    Get branch summary with aggregated statistics for an enterprise.

    Returns each branch with asset counts and IT admin count.

    **Permissions:** BRANCH_READ
    """
    # Verify current user has access to this enterprise
    if not can_access_enterprise(current_user, enterprise_id):
        raise AuthorizationError("You don't have access to branches from this enterprise")

    service = BranchService(db)
    data = await service.get_branches_summary(enterprise_id)

    return success_response(data=data)


@router.post("/bulk", response_model=dict, status_code=status.HTTP_201_CREATED)
async def bulk_create_branches(
    bulk_data: BranchBulkCreate,
    enterprise_id: str = Query(..., description="Enterprise ID"),
    current_user: User = Depends(require_permission(Permission.BRANCH_CREATE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Bulk create branches for an enterprise.

    Accepts a list of branches with optional IT admin email for auto-assignment.
    Returns created branches and any errors.

    **Permissions:** BRANCH_CREATE
    """
    # Verify current user has access to this enterprise
    if not can_access_enterprise(current_user, enterprise_id):
        raise AuthorizationError("You don't have access to create branches for this enterprise")

    bulk_data.enterprise_id = enterprise_id

    service = BranchService(db)
    branches, errors = await service.bulk_create_branches(bulk_data, current_user.id)

    response_data = {
        "created": [b.model_dump() for b in branches],
        "errors": errors,
        "created_count": len(branches),
        "error_count": len(errors),
    }

    return success_response(
        data=response_data,
        message=f"{len(branches)} branches created successfully"
        + (f", {len(errors)} errors" if errors else ""),
    )


@router.get("/{branch_id}", response_model=dict)
async def get_branch(
    branch_id: str,
    current_user: User = Depends(require_permission(Permission.BRANCH_READ)),
    db: AsyncSession = Depends(get_db),
):
    """
    Get branch by ID with access control.

    - Platform admins: can access any branch
    - Org Admin: can access branches in their enterprise
    - IT Admin: can only access branches assigned to them

    **Permissions:** BRANCH_READ
    """
    service = BranchService(db)
    branch = await service.get_branch(branch_id)

    # Access control based on role
    if not is_platform_admin(current_user):
        if current_user.role == UserRole.ORG_ADMIN.value:
            if branch.enterprise_id != current_user.enterprise_id:
                raise AuthorizationError("Access denied: branch belongs to a different enterprise")
        elif current_user.role == UserRole.IT_ADMIN.value:
            if branch.it_admin_id != current_user.id:
                raise AuthorizationError("Access denied: branch is not assigned to you")
        else:
            # Other roles: check enterprise match
            if current_user.enterprise_id and branch.enterprise_id != current_user.enterprise_id:
                raise AuthorizationError("Access denied")

    return success_response(data=branch.model_dump())


@router.put("/{branch_id}", response_model=dict)
async def update_branch(
    branch_id: str,
    branch_data: BranchUpdate,
    current_user: User = Depends(require_permission(Permission.BRANCH_UPDATE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Update branch by ID.

    **Permissions:** BRANCH_UPDATE
    """
    service = BranchService(db)

    # Access control (same as get_branch)
    existing = await service.get_branch(branch_id)
    if not is_platform_admin(current_user):
        if current_user.role == UserRole.ORG_ADMIN.value:
            if existing.enterprise_id != current_user.enterprise_id:
                raise AuthorizationError("Access denied: branch belongs to a different enterprise")
        elif current_user.role == UserRole.IT_ADMIN.value:
            if existing.it_admin_id != current_user.id:
                raise AuthorizationError("Access denied: branch is not assigned to you")

    branch = await service.update_branch(branch_id, branch_data, current_user.id)
    return success_response(data=branch.model_dump(), message="Branch updated successfully")


@router.delete("/{branch_id}", response_model=dict, status_code=status.HTTP_200_OK)
async def delete_branch(
    branch_id: str,
    current_user: User = Depends(require_permission(Permission.BRANCH_DELETE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete branch by ID.

    **Permissions:** BRANCH_DELETE
    """
    service = BranchService(db)

    # Access control (same as get_branch)
    existing = await service.get_branch(branch_id)
    if not is_platform_admin(current_user):
        if current_user.role == UserRole.ORG_ADMIN.value:
            if existing.enterprise_id != current_user.enterprise_id:
                raise AuthorizationError("Access denied: branch belongs to a different enterprise")
        elif current_user.role == UserRole.IT_ADMIN.value:
            if existing.it_admin_id != current_user.id:
                raise AuthorizationError("Access denied: branch is not assigned to you")

    await service.delete_branch(branch_id)
    return success_response(message="Branch deleted successfully")
