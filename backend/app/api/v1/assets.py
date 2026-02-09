"""Asset management endpoints"""

from typing import Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import require_permission
from app.core.permissions import Permission
from app.models.user import User
from app.models.asset import AssetStatus
from app.schemas.asset import AssetCreate, AssetUpdate, AssetBulkCreate
from app.services.asset_service import AssetService
from app.utils.response import success_response, paginated_response
from app.utils.scoping import get_scoped_filters, auto_fill_context, can_access_enterprise, can_access_branch, is_platform_admin
from app.utils.state_machine import get_allowed_asset_transitions, get_workflow_path
from app.utils.exceptions import AuthorizationError

router = APIRouter()


def _check_asset_access(asset_data, current_user: User):
    """Verify user has access to this asset's enterprise/branch (prevents cross-tenant IDOR)."""
    enterprise_id = getattr(asset_data, 'enterprise_id', None)
    branch_id = getattr(asset_data, 'branch_id', None)
    if enterprise_id and not can_access_enterprise(current_user, enterprise_id):
        raise AuthorizationError("You do not have access to this asset")
    if branch_id and not can_access_branch(current_user, branch_id, enterprise_id):
        raise AuthorizationError("You do not have access to this asset")


@router.get("", response_model=dict)
async def list_assets(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=10000, description="Number of records to return"),
    batch_id: Optional[str] = Query(None, description="Filter by batch"),
    status: Optional[AssetStatus] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by serial number, brand, model"),
    enterprise_id: Optional[str] = Query(None, description="Filter by enterprise ID (platform admins only)"),
    branch_id: Optional[str] = Query(None, description="Filter by branch ID"),
    current_user: User = Depends(require_permission(Permission.ASSET_READ)),
    db: AsyncSession = Depends(get_db),
):
    """
    List assets with automatic role-based scoping.

    Data is automatically scoped based on user's role:
    - Super Admin / OPS Admin: Can filter by enterprise_id/branch_id
    - Org Admin: Assets in their enterprise
    - IT Admin: Assets in their branch
    - Employee: Assets assigned to them

    **Permissions:** ASSET_READ
    """
    # Get scoped filters based on current user's role
    scoped_filters = get_scoped_filters(current_user)

    # Only platform admins can explicitly filter by enterprise/branch
    if is_platform_admin(current_user):
        if enterprise_id:
            scoped_filters["enterprise_id"] = enterprise_id
        if branch_id:
            scoped_filters["branch_id"] = branch_id

    service = AssetService(db)
    assets, total = await service.list_assets(
        skip=skip,
        limit=limit,
        batch_id=batch_id,
        status=status,
        search=search,
        **scoped_filters,
    )

    return paginated_response(
        data=[asset.model_dump() for asset in assets],
        total=total,
        page=(skip // limit) + 1,
        page_size=limit,
    )


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_asset(
    asset_data: AssetCreate,
    current_user: User = Depends(require_permission(Permission.ASSET_CREATE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new asset.

    Enterprise/branch context is automatically derived from current user's role.

    **Permissions:** ASSET_CREATE
    """
    # Auto-fill enterprise_id/branch_id from current user if not provided
    asset_data.enterprise_id, asset_data.branch_id = auto_fill_context(
        current_user, asset_data.enterprise_id, asset_data.branch_id
    )

    service = AssetService(db)
    asset = await service.create_asset(asset_data, current_user.id)
    return success_response(data=asset.model_dump(), message="Asset created successfully")


@router.post("/bulk", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_assets_bulk(
    bulk_data: AssetBulkCreate,
    current_user: User = Depends(require_permission(Permission.ASSET_CREATE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Create multiple assets in bulk.

    Enterprise/branch context is automatically derived from current user's role.

    **Permissions:** ASSET_CREATE
    """
    # Auto-fill enterprise_id/branch_id from current user if not provided
    bulk_data.enterprise_id, bulk_data.branch_id = auto_fill_context(
        current_user, bulk_data.enterprise_id, bulk_data.branch_id
    )

    service = AssetService(db)
    assets, errors = await service.create_assets_bulk(bulk_data, current_user.id)

    response_data = {
        "created": [asset.model_dump() for asset in assets],
        "errors": errors,
        "created_count": len(assets),
        "error_count": len(errors),
    }

    return success_response(
        data=response_data,
        message=f"{len(assets)} assets created successfully"
        + (f", {len(errors)} errors" if errors else ""),
    )


@router.get("/{asset_id}", response_model=dict)
async def get_asset(
    asset_id: str,
    current_user: User = Depends(require_permission(Permission.ASSET_READ)),
    db: AsyncSession = Depends(get_db),
):
    """
    Get asset by ID with ownership validation.

    **Permissions:** ASSET_READ
    """
    service = AssetService(db)
    asset = await service.get_asset(asset_id)
    _check_asset_access(asset, current_user)
    return success_response(data=asset.model_dump())


@router.put("/{asset_id}", response_model=dict)
async def update_asset(
    asset_id: str,
    asset_data: AssetUpdate,
    current_user: User = Depends(require_permission(Permission.ASSET_UPDATE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Update asset by ID with ownership validation.

    **Permissions:** ASSET_UPDATE
    """
    service = AssetService(db)
    # Verify ownership before update
    existing = await service.get_asset(asset_id)
    _check_asset_access(existing, current_user)
    asset = await service.update_asset(asset_id, asset_data, current_user.id)
    return success_response(data=asset.model_dump(), message="Asset updated successfully")


@router.delete("/{asset_id}", response_model=dict, status_code=status.HTTP_200_OK)
async def delete_asset(
    asset_id: str,
    current_user: User = Depends(require_permission(Permission.ASSET_DELETE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete asset by ID with ownership validation.

    **Permissions:** ASSET_DELETE
    """
    service = AssetService(db)
    # Verify ownership before delete
    existing = await service.get_asset(asset_id)
    _check_asset_access(existing, current_user)
    await service.delete_asset(asset_id)
    return success_response(message="Asset deleted successfully")


@router.post("/{asset_id}/assign", response_model=dict)
async def assign_asset(
    asset_id: str,
    assigned_to_user_id: str = Query(..., description="User ID to assign the asset to"),
    current_user: User = Depends(require_permission(Permission.ASSET_UPDATE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Assign an asset to an employee with ownership validation.

    Sets the assigned_to_user_id and transitions status to 'assigned'
    if the asset is currently in 'pending_assignment' status.

    **Permissions:** ASSET_UPDATE
    """
    service = AssetService(db)
    existing = await service.get_asset(asset_id)
    _check_asset_access(existing, current_user)
    asset = await service.assign_asset(asset_id, assigned_to_user_id, current_user.id)
    return success_response(data=asset.model_dump(), message="Asset assigned successfully")


@router.post("/{asset_id}/unassign", response_model=dict)
async def unassign_asset(
    asset_id: str,
    current_user: User = Depends(require_permission(Permission.ASSET_UPDATE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Unassign an asset from its current employee with ownership validation.

    Clears assigned_to_user_id and transitions status back to 'pending_assignment'
    if the asset is currently in 'assigned' status.

    **Permissions:** ASSET_UPDATE
    """
    service = AssetService(db)
    existing = await service.get_asset(asset_id)
    _check_asset_access(existing, current_user)
    asset = await service.unassign_asset(asset_id, current_user.id)
    return success_response(data=asset.model_dump(), message="Asset unassigned successfully")


@router.patch("/{asset_id}/status", response_model=dict)
async def transition_asset_status(
    asset_id: str,
    new_status: AssetStatus = Query(..., description="Target status"),
    current_user: User = Depends(require_permission(Permission.ASSET_UPDATE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Transition an asset to a new status with ownership validation.

    The transition is validated against the asset state machine.
    Only valid transitions are allowed (e.g., pending_assignment → assigned).

    **Permissions:** ASSET_UPDATE
    """
    service = AssetService(db)
    existing = await service.get_asset(asset_id)
    _check_asset_access(existing, current_user)
    asset_data = AssetUpdate(status=new_status)
    asset = await service.update_asset(asset_id, asset_data, current_user.id)
    return success_response(data=asset.model_dump(), message=f"Asset status changed to {new_status.value}")


@router.get("/{asset_id}/allowed-transitions", response_model=dict)
async def get_asset_allowed_transitions(
    asset_id: str,
    current_user: User = Depends(require_permission(Permission.ASSET_READ)),
    db: AsyncSession = Depends(get_db),
):
    """
    Get allowed status transitions for an asset with ownership validation.

    Returns the list of valid next statuses based on the current asset status.
    Useful for UI to show available actions.

    **Permissions:** ASSET_READ
    """
    service = AssetService(db)
    asset = await service.get_asset(asset_id)
    _check_asset_access(asset, current_user)
    current_status = asset.status

    allowed = list(get_allowed_asset_transitions(current_status))

    return success_response(
        data={
            "asset_id": asset_id,
            "current_status": current_status,
            "allowed_transitions": sorted(allowed),
        }
    )


@router.get("/workflow/path", response_model=dict)
async def get_workflow_path_endpoint(
    start: str = Query(..., description="Starting status"),
    end: str = Query(..., description="Target status"),
    current_user: User = Depends(require_permission(Permission.ASSET_READ)),
):
    """
    Get the workflow path between two asset statuses.

    Useful for understanding how an asset needs to progress through the workflow.

    **Permissions:** ASSET_READ
    """
    path = get_workflow_path("asset", start, end)

    if path is None:
        return success_response(
            data={
                "start": start,
                "end": end,
                "path": None,
                "reachable": False,
            },
            message=f"No path exists from '{start}' to '{end}'"
        )

    return success_response(
        data={
            "start": start,
            "end": end,
            "path": path,
            "steps": len(path) - 1,
            "reachable": True,
        }
    )
