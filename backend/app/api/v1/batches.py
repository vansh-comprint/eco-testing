"""Batch management endpoints"""

from typing import Optional, List
from pydantic import BaseModel
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
from app.utils.exceptions import AuthorizationError

router = APIRouter()


async def _check_batch_access(db, batch_data, current_user: User):
    """Verify user has access to this batch's enterprise/branch (prevents cross-tenant IDOR)."""
    from app.utils.scoping import can_access_enterprise, can_access_branch_scoped

    if is_platform_admin(current_user):
        return

    enterprise_id = getattr(batch_data, 'enterprise_id', None)
    branch_id = getattr(batch_data, 'branch_id', None)

    if enterprise_id and not can_access_enterprise(current_user, str(enterprise_id)):
        raise AuthorizationError("You do not have access to this batch")
    if branch_id and not await can_access_branch_scoped(db, current_user, str(branch_id)):
        raise AuthorizationError("You do not have access to this batch")


@router.get("", response_model=dict)
async def list_batches(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=100, description="Number of records to return"),
    status: Optional[BatchStatus] = Query(None, description="Filter by single status"),
    statuses: Optional[str] = Query(None, description="Filter by multiple statuses (comma-separated)"),
    search: Optional[str] = Query(None, description="Search by name or description"),
    enterprise_id: Optional[str] = Query(None, description="Filter by enterprise ID (platform admins)"),
    branch_id: Optional[str] = Query(None, description="Filter by branch ID"),
    current_user: User = Depends(require_permission(Permission.BATCH_READ)),
    db: AsyncSession = Depends(get_db),
):
    """
    List batches with automatic role-based scoping.

    Data is automatically scoped based on user's role:
    - Super Admin / OPS Admin: Can filter by enterprise_id/branch_id
    - Org Admin: Batches in their enterprise, can filter by branch
    - IT Admin: Batches in their managed branches (multi-branch)

    **Permissions:** BATCH_READ
    """
    from app.models.user import UserRole
    from app.utils.scoping import get_it_admin_scoped_filters

    service = BatchService(db)
    branch_ids = None
    effective_enterprise_id = None
    effective_branch_id = None

    if current_user.role == UserRole.IT_ADMIN.value:
        scoped = await get_it_admin_scoped_filters(db, current_user)
        effective_enterprise_id = scoped.get("enterprise_id")
        managed_branch_ids = scoped.get("branch_ids", [])

        if branch_id:
            if managed_branch_ids and str(branch_id) in [str(b) for b in managed_branch_ids]:
                effective_branch_id = branch_id
            else:
                raise AuthorizationError("You do not have access to this branch")
        else:
            branch_ids = managed_branch_ids if managed_branch_ids else None

    elif current_user.role == UserRole.ORG_ADMIN.value:
        effective_enterprise_id = current_user.enterprise_id
        if branch_id:
            effective_branch_id = branch_id

    elif is_platform_admin(current_user):
        effective_enterprise_id = enterprise_id
        effective_branch_id = branch_id

    else:
        scoped_filters = get_scoped_filters(current_user)
        effective_enterprise_id = scoped_filters.get("enterprise_id")
        effective_branch_id = scoped_filters.get("branch_id")

    # Parse comma-separated statuses into a list
    parsed_statuses = [s.strip() for s in statuses.split(",") if s.strip()] if statuses else None

    batches, total = await service.list_batches(
        skip=skip,
        limit=limit,
        status=status,
        statuses=parsed_statuses,
        search=search,
        enterprise_id=effective_enterprise_id,
        branch_id=effective_branch_id,
        branch_ids=branch_ids,
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
    branch_id: Optional[str] = Query(None, description="Filter by branch ID"),
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
        branch_id=branch_id,
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


class BatchAssetsRequest(BaseModel):
    asset_ids: List[str]


@router.post("/{batch_id}/assets", response_model=dict)
async def add_assets_to_batch(
    batch_id: str,
    data: BatchAssetsRequest,
    current_user: User = Depends(require_permission(Permission.BATCH_UPDATE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Add assets to a batch.

    **Permissions:** BATCH_UPDATE
    """
    service = BatchService(db)
    batch = await service.get_batch(batch_id)
    await _check_batch_access(db, batch, current_user)

    from app.services.asset_service import AssetService
    from app.schemas.asset import AssetUpdate

    asset_service = AssetService(db)
    for asset_id in data.asset_ids:
        asset = await asset_service.get_asset(asset_id)
        # Verify the asset belongs to the same enterprise
        if str(asset.enterprise_id) != str(batch.enterprise_id):
            raise AuthorizationError(f"Asset '{asset_id}' does not belong to this enterprise")
        await asset_service.update_asset(asset_id, AssetUpdate(batch_id=batch_id), current_user.id)

    updated_batch = await service.get_batch(batch_id)
    return success_response(data=updated_batch.model_dump(), message="Assets added to batch")


@router.delete("/{batch_id}/assets", response_model=dict)
async def remove_assets_from_batch(
    batch_id: str,
    data: BatchAssetsRequest,
    current_user: User = Depends(require_permission(Permission.BATCH_UPDATE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Remove assets from a batch.

    **Permissions:** BATCH_UPDATE
    """
    service = BatchService(db)
    batch = await service.get_batch(batch_id)
    await _check_batch_access(db, batch, current_user)

    from app.services.asset_service import AssetService
    from app.schemas.asset import AssetUpdate

    asset_service = AssetService(db)
    for asset_id in data.asset_ids:
        asset = await asset_service.get_asset(asset_id)
        if str(getattr(asset, 'batch_id', '')) == str(batch_id):
            await asset_service.update_asset(asset_id, AssetUpdate(batch_id=None), current_user.id)

    updated_batch = await service.get_batch(batch_id)
    return success_response(data=updated_batch.model_dump(), message="Assets removed from batch")


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
    await _check_batch_access(db, batch, current_user)
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
    # Verify access before update
    existing = await service.get_batch(batch_id)
    await _check_batch_access(db, existing, current_user)
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
    existing = await service.get_batch(batch_id)
    await _check_batch_access(db, existing, current_user)
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
    existing = await service.get_batch(batch_id)
    await _check_batch_access(db, existing, current_user)
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
    existing = await service.get_batch(batch_id)
    await _check_batch_access(db, existing, current_user)
    await service.delete_batch(
        batch_id,
        delete_assets=delete_assets,
        delete_sub_users=delete_sub_users,
    )
    return success_response(message="Batch deleted successfully")
