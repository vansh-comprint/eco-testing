"""Asset management endpoints"""

from typing import Optional
from fastapi import APIRouter, Depends, status, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import get_current_user, require_permission
from app.core.permissions import Permission
from app.models.user import User
from app.models.asset import AssetStatus
from app.schemas.asset import AssetCreate, AssetUpdate, AssetResponse, AssetBulkCreate
from app.services.asset_service import AssetService
from app.utils.response import success_response, paginated_response
from app.utils.exceptions import NotFoundError, ValidationError, ConflictError
from app.utils.scoping import get_scoped_filters, auto_fill_context
from app.utils.state_machine import get_allowed_asset_transitions, get_workflow_path

router = APIRouter()


@router.get("", response_model=dict)
async def list_assets(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=1000, description="Number of records to return"),
    batch_id: Optional[str] = Query(None, description="Filter by batch"),
    status: Optional[AssetStatus] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by serial number, brand, model"),
    current_user: User = Depends(require_permission(Permission.ASSET_READ)),
    db: AsyncSession = Depends(get_db),
):
    """
    List assets with automatic role-based scoping.

    Data is automatically scoped based on user's role:
    - Super Admin / OPS Admin: All assets
    - Org Admin: Assets in their enterprise
    - IT Admin: Assets in their branch
    - Employee: Assets assigned to them

    **Permissions:** ASSET_READ
    """
    # Get scoped filters based on current user's role
    scoped_filters = get_scoped_filters(current_user)

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

    try:
        service = AssetService(db)
        asset = await service.create_asset(asset_data, current_user.id)
        return success_response(data=asset.model_dump(), message="Asset created successfully")
    except (ValidationError, ConflictError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


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

    try:
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
    except (ValidationError, ConflictError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{asset_id}", response_model=dict)
async def get_asset(
    asset_id: str,
    current_user: User = Depends(require_permission(Permission.ASSET_READ)),
    db: AsyncSession = Depends(get_db),
):
    """
    Get asset by ID.

    **Permissions:** ASSET_READ
    """
    try:
        service = AssetService(db)
        asset = await service.get_asset(asset_id)
        return success_response(data=asset.model_dump())
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.put("/{asset_id}", response_model=dict)
async def update_asset(
    asset_id: str,
    asset_data: AssetUpdate,
    current_user: User = Depends(require_permission(Permission.ASSET_UPDATE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Update asset by ID.

    **Permissions:** ASSET_UPDATE
    """
    try:
        service = AssetService(db)
        asset = await service.update_asset(asset_id, asset_data, current_user.id)
        return success_response(data=asset.model_dump(), message="Asset updated successfully")
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{asset_id}", response_model=dict, status_code=status.HTTP_200_OK)
async def delete_asset(
    asset_id: str,
    current_user: User = Depends(require_permission(Permission.ASSET_DELETE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete asset by ID.

    **Permissions:** ASSET_DELETE
    """
    try:
        service = AssetService(db)
        await service.delete_asset(asset_id)
        return success_response(message="Asset deleted successfully")
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/{asset_id}/allowed-transitions", response_model=dict)
async def get_asset_allowed_transitions(
    asset_id: str,
    current_user: User = Depends(require_permission(Permission.ASSET_READ)),
    db: AsyncSession = Depends(get_db),
):
    """
    Get allowed status transitions for an asset.

    Returns the list of valid next statuses based on the current asset status.
    Useful for UI to show available actions.

    **Permissions:** ASSET_READ
    """
    try:
        service = AssetService(db)
        asset = await service.get_asset(asset_id)
        current_status = asset.status

        allowed = list(get_allowed_asset_transitions(current_status))

        return success_response(
            data={
                "asset_id": asset_id,
                "current_status": current_status,
                "allowed_transitions": sorted(allowed),
            }
        )
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


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
