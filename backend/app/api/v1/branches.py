"""Branch management endpoints"""

from typing import Optional
from fastapi import APIRouter, Depends, status, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import require_permission
from app.core.permissions import Permission
from app.models.user import User, UserRole
from app.models.enterprise import BranchStatus
from app.schemas.branch import BranchCreate, BranchUpdate
from app.services.branch_service import BranchService
from app.utils.response import success_response, paginated_response
from app.utils.exceptions import NotFoundError, ValidationError, ConflictError
from app.utils.scoping import get_scoped_filters, auto_fill_context, is_platform_admin

router = APIRouter()


@router.get("", response_model=dict)
async def list_branches(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=1000, description="Number of records to return"),
    status: Optional[BranchStatus] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by name, code, or city"),
    enterprise_id: Optional[str] = Query(
        None, description="Filter by enterprise ID (Super Admin only)"
    ),
    it_admin_id: Optional[str] = Query(
        None, description="Filter by IT Admin ID"
    ),
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

    try:
        service = BranchService(db)
        branch = await service.create_branch(branch_data, current_user.id)
        return success_response(data=branch.model_dump(), message="Branch created successfully")
    except (ValidationError, ConflictError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


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
    try:
        service = BranchService(db)
        branch = await service.get_branch(branch_id)

        # Access control based on role
        if not is_platform_admin(current_user):
            if current_user.role == UserRole.ORG_ADMIN.value:
                if branch.enterprise_id != current_user.enterprise_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied: branch belongs to a different enterprise",
                    )
            elif current_user.role == UserRole.IT_ADMIN.value:
                if branch.it_admin_id != current_user.id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied: branch is not assigned to you",
                    )
            else:
                # Other roles: check enterprise match
                if current_user.enterprise_id and branch.enterprise_id != current_user.enterprise_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied",
                    )

        return success_response(data=branch.model_dump())
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


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
    try:
        service = BranchService(db)
        branch = await service.update_branch(branch_id, branch_data, current_user.id)
        return success_response(data=branch.model_dump(), message="Branch updated successfully")
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except (ValidationError, ConflictError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


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
    try:
        service = BranchService(db)
        await service.delete_branch(branch_id)
        return success_response(message="Branch deleted successfully")
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
