"""Batch management endpoints"""

from typing import Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import require_permission
from app.core.permissions import Permission
from app.models.user import User
from app.models.batch import BatchStatus
from app.schemas.batch import (
    BatchCreate,
    BatchUpdate,
    BatchSubmitForApproval,
    BatchApprovalAction,
)
from app.services.batch_service import BatchService
from app.utils.response import success_response, paginated_response
from app.utils.scoping import get_scoped_filters, auto_fill_context, is_platform_admin

router = APIRouter()


@router.get("", response_model=dict)
async def list_batches(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=100, description="Number of records to return"),
    status: Optional[BatchStatus] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by name or description"),
    enterprise_id: Optional[str] = Query(None, description="Filter by enterprise ID (platform admins only)"),
    branch_id: Optional[str] = Query(None, description="Filter by branch ID"),
    current_user: User = Depends(require_permission(Permission.BATCH_READ)),
    db: AsyncSession = Depends(get_db),
):
    """
    List batches with automatic role-based scoping.

    Data is automatically scoped based on user's role:
    - Super Admin / OPS Admin: Can filter by enterprise_id/branch_id
    - Org Admin: Batches in their enterprise
    - IT Admin: Batches in their branch

    **Permissions:** BATCH_READ
    """
    scoped_filters = get_scoped_filters(current_user)

    # Only platform admins can explicitly filter by enterprise/branch
    if is_platform_admin(current_user):
        if enterprise_id:
            scoped_filters["enterprise_id"] = enterprise_id
        if branch_id:
            scoped_filters["branch_id"] = branch_id

    service = BatchService(db)
    batches, total = await service.list_batches(
        skip=skip,
        limit=limit,
        status=status,
        search=search,
        **scoped_filters,
    )

    return paginated_response(
        data=[batch.model_dump() for batch in batches],
        total=total,
        page=(skip // limit) + 1,
        page_size=limit,
    )


@router.get("/pending-approval", response_model=dict)
async def list_pending_approval(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(require_permission(Permission.BATCH_APPROVE)),
    db: AsyncSession = Depends(get_db),
):
    """
    List batches pending Org Admin approval.

    **Permissions:** BATCH_APPROVE (Org Admin, OPS Admin, Super Admin)
    """
    scoped_filters = get_scoped_filters(current_user)
    enterprise_id = scoped_filters.get("enterprise_id")

    service = BatchService(db)
    batches, total = await service.list_pending_approval(
        enterprise_id=enterprise_id,
        skip=skip,
        limit=limit,
    )

    return paginated_response(
        data=[batch.model_dump() for batch in batches],
        total=total,
        page=(skip // limit) + 1,
        page_size=limit,
    )


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_batch(
    batch_data: BatchCreate,
    current_user: User = Depends(require_permission(Permission.BATCH_CREATE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new batch.

    Enterprise/branch context is automatically derived from current user's role.

    **Permissions:** BATCH_CREATE
    """
    filled_enterprise_id, filled_branch_id = auto_fill_context(
        current_user, batch_data.enterprise_id, batch_data.branch_id
    )
    # Create a copy with filled context values
    batch_data = batch_data.model_copy(update={
        "enterprise_id": filled_enterprise_id,
        "branch_id": filled_branch_id
    })

    service = BatchService(db)
    batch = await service.create_batch(batch_data, current_user.id)
    return success_response(data=batch.model_dump(), message="Batch created successfully")


@router.get("/{batch_id}", response_model=dict)
async def get_batch(
    batch_id: str,
    current_user: User = Depends(require_permission(Permission.BATCH_READ)),
    db: AsyncSession = Depends(get_db),
):
    """
    Get batch by ID.

    **Permissions:** BATCH_READ
    """
    service = BatchService(db)
    batch = await service.get_batch(batch_id)
    return success_response(data=batch.model_dump())


@router.put("/{batch_id}", response_model=dict)
async def update_batch(
    batch_id: str,
    batch_data: BatchUpdate,
    current_user: User = Depends(require_permission(Permission.BATCH_UPDATE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Update batch by ID.

    SECURITY: Status transitions are role-restricted.
    Protected statuses (approved, rejected, completed) must use workflow endpoints.

    **Permissions:** BATCH_UPDATE
    """
    service = BatchService(db)
    batch = await service.update_batch(
        batch_id, batch_data, current_user.id, actor=current_user
    )
    return success_response(data=batch.model_dump(), message="Batch updated successfully")


@router.post("/{batch_id}/submit-for-approval", response_model=dict)
async def submit_batch_for_approval(
    batch_id: str,
    data: BatchSubmitForApproval,
    current_user: User = Depends(require_permission(Permission.BATCH_UPDATE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit batch for Org Admin approval.

    IT Admin fills pickup details and submits for approval.

    **Permissions:** BATCH_UPDATE
    """
    service = BatchService(db)
    batch = await service.submit_for_approval(batch_id, data, current_user.id)
    return success_response(data=batch.model_dump(), message="Batch submitted for approval")


@router.post("/{batch_id}/approval", response_model=dict)
async def process_batch_approval(
    batch_id: str,
    action_data: BatchApprovalAction,
    current_user: User = Depends(require_permission(Permission.BATCH_APPROVE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Approve or reject a batch.

    Org Admin reviews and approves/rejects the batch.

    **Permissions:** BATCH_APPROVE
    """
    service = BatchService(db)
    batch = await service.process_approval(batch_id, action_data, current_user.id)
    action_msg = "approved" if action_data.action == "approve" else "rejected"
    return success_response(data=batch.model_dump(), message=f"Batch {action_msg}")


@router.delete("/{batch_id}", response_model=dict, status_code=status.HTTP_200_OK)
async def delete_batch(
    batch_id: str,
    delete_assets: bool = Query(False, description="Also delete assets in this batch"),
    delete_sub_users: bool = Query(False, description="Also delete employee users assigned to assets"),
    current_user: User = Depends(require_permission(Permission.BATCH_DELETE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete batch by ID, optionally cascading to assets and sub-users.

    **Permissions:** BATCH_DELETE
    """
    service = BatchService(db)
    await service.delete_batch(
        batch_id,
        delete_assets=delete_assets,
        delete_sub_users=delete_sub_users,
    )
    return success_response(message="Batch deleted successfully")
