"""API endpoints for Pickup Requests"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import require_permission
from app.core.permissions import Permission
from app.models import User
from app.schemas.pickup import (
    PickupRequestCreate,
    PickupRequestUpdate,
    PickupAssignToLogisticsAdmin,
    PickupAssignToLogisticsUser,
    PickupComplete,
    PickupCancel,
    PickupLocationCreate,
    PickupLocationUpdate,
    PickupLocationResponse,
)
from app.services.pickup_service import PickupService
from app.services.pickup_location_service import PickupLocationService
from app.utils.response import success_response, paginated_response

router = APIRouter()


def _to_response(pickup) -> dict:
    """Convert pickup model to response dict"""
    return {
        "id": pickup.id,
        "enterprise_id": pickup.enterprise_id,
        "location_id": pickup.location_id,
        "batch_id": pickup.batch_id,
        "logistics_admin_id": pickup.logistics_admin_id,
        "logistics_user_id": pickup.logistics_user_id,
        "asset_ids": pickup.asset_ids,
        "assets": pickup.assets,
        "preferred_date": pickup.preferred_date,
        "preferred_time_slot": pickup.preferred_time_slot,
        "scheduled_date": pickup.scheduled_date,
        "assigned_at": pickup.assigned_at,
        "assigned_by_id": pickup.assigned_by_id,
        "status": pickup.status,
        "special_instructions": pickup.special_instructions,
        "logistics_notes": pickup.logistics_notes,
        "completed_at": pickup.completed_at,
        "proof_of_pickup": pickup.proof_of_pickup,
        "created_at": pickup.created_at,
        "updated_at": pickup.updated_at,
    }


@router.get("")
async def list_pickups(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.PICKUP_VIEW)),
):
    """List pickup requests with role-based filtering"""
    service = PickupService(db)
    skip = (page - 1) * page_size

    try:
        pickups, total = await service.list_pickups(
            user=current_user,
            status=status,
            skip=skip,
            limit=page_size,
        )
        await db.commit()

        return paginated_response(
            data=[_to_response(p) for p in pickups],
            page=page,
            page_size=page_size,
            total=total,
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pending-assignment")
async def list_pending_assignment(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.PICKUP_ASSIGN)),
):
    """List pickups pending OPS admin assignment"""
    service = PickupService(db)
    skip = (page - 1) * page_size

    try:
        pickups, total = await service.get_pending_assignment(
            user=current_user,
            skip=skip,
            limit=page_size,
        )
        await db.commit()

        return paginated_response(
            data=[_to_response(p) for p in pickups],
            page=page,
            page_size=page_size,
            total=total,
        )
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=403, detail=str(e))


@router.get("/my-assignments")
async def list_my_assignments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.PICKUP_VIEW)),
):
    """List pickups assigned to current user (logistics admin/user)"""
    service = PickupService(db)
    skip = (page - 1) * page_size

    try:
        pickups, total = await service.get_my_assignments(
            user=current_user,
            skip=skip,
            limit=page_size,
        )
        await db.commit()

        return paginated_response(
            data=[_to_response(p) for p in pickups],
            page=page,
            page_size=page_size,
            total=total,
        )
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=403, detail=str(e))


@router.post("")
async def create_pickup(
    data: PickupRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.PICKUP_CREATE)),
):
    """Create a pickup request"""
    service = PickupService(db)

    try:
        pickup = await service.create_pickup(data, current_user)
        await db.commit()
        return success_response(data=_to_response(pickup), message="Pickup request created")
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{pickup_id}")
async def get_pickup(
    pickup_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.PICKUP_VIEW)),
):
    """Get a pickup request by ID"""
    service = PickupService(db)

    pickup = await service.get_pickup(pickup_id)
    if not pickup:
        raise HTTPException(status_code=404, detail="Pickup request not found")

    return success_response(data=_to_response(pickup))


@router.put("/{pickup_id}")
async def update_pickup(
    pickup_id: str,
    data: PickupRequestUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.PICKUP_UPDATE)),
):
    """Update a pickup request"""
    service = PickupService(db)

    try:
        pickup = await service.update_pickup(pickup_id, data, current_user)
        if not pickup:
            raise HTTPException(status_code=404, detail="Pickup request not found")
        await db.commit()
        return success_response(data=_to_response(pickup), message="Pickup updated")
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{pickup_id}/assign-admin")
async def assign_to_logistics_admin(
    pickup_id: str,
    data: PickupAssignToLogisticsAdmin,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.PICKUP_ASSIGN)),
):
    """Assign pickup to logistics admin (OPS Admin action)"""
    service = PickupService(db)

    try:
        pickup = await service.assign_to_logistics_admin(pickup_id, data, current_user)
        await db.commit()
        return success_response(data=_to_response(pickup), message="Assigned to logistics admin")
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{pickup_id}/assign-user")
async def assign_to_logistics_user(
    pickup_id: str,
    data: PickupAssignToLogisticsUser,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.PICKUP_ASSIGN)),
):
    """Assign pickup to logistics user (Logistics Admin action)"""
    service = PickupService(db)

    try:
        pickup = await service.assign_to_logistics_user(pickup_id, data, current_user)
        await db.commit()
        return success_response(data=_to_response(pickup), message="Assigned to logistics user")
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{pickup_id}/start")
async def start_pickup(
    pickup_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.PICKUP_UPDATE)),
):
    """Start a pickup (Logistics User action)"""
    service = PickupService(db)

    try:
        pickup = await service.start_pickup(pickup_id, current_user)
        await db.commit()
        return success_response(data=_to_response(pickup), message="Pickup started")
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{pickup_id}/complete")
async def complete_pickup(
    pickup_id: str,
    data: PickupComplete,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.PICKUP_UPDATE)),
):
    """Complete a pickup (Logistics User action)"""
    service = PickupService(db)

    try:
        pickup = await service.complete_pickup(pickup_id, data, current_user)
        await db.commit()
        return success_response(data=_to_response(pickup), message="Pickup completed")
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{pickup_id}/cancel")
async def cancel_pickup(
    pickup_id: str,
    data: PickupCancel,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.PICKUP_UPDATE)),
):
    """Cancel a pickup request"""
    service = PickupService(db)

    try:
        pickup = await service.cancel_pickup(pickup_id, data.reason, current_user)
        await db.commit()
        return success_response(data=_to_response(pickup), message="Pickup cancelled")
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# PICKUP LOCATIONS
# ============================================================================


def _location_to_response(location) -> dict:
    """Convert pickup location model to response dict"""
    return {
        "id": location.id,
        "enterprise_id": location.enterprise_id,
        "name": location.name,
        "address": location.address,
        "city": location.city,
        "state": location.state,
        "pin_code": location.pin_code,
        "country": location.country,
        "contact_person": location.contact_person,
        "contact_phone": location.contact_phone,
        "operating_hours": location.operating_hours,
        "special_instructions": location.special_instructions,
        "is_default": location.is_default,
        "is_active": location.is_active,
        "created_at": location.created_at,
        "updated_at": location.updated_at,
    }


@router.get("/locations")
async def list_pickup_locations(
    enterprise_id: str = Query(..., description="Enterprise ID"),
    include_inactive: bool = Query(False, description="Include inactive locations"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.PICKUP_VIEW)),
):
    """List pickup locations for an enterprise"""
    service = PickupLocationService(db)

    try:
        locations, total = await service.list_locations(
            enterprise_id=enterprise_id,
            user=current_user,
            include_inactive=include_inactive,
        )
        await db.commit()

        return success_response(
            data={
                "locations": [_location_to_response(loc) for loc in locations],
                "total": total,
            }
        )
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/locations")
async def create_pickup_location(
    data: PickupLocationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.PICKUP_CREATE)),
):
    """Create a pickup location"""
    service = PickupLocationService(db)

    try:
        location = await service.create_location(data, current_user)
        await db.commit()
        return success_response(
            data=_location_to_response(location),
            message="Pickup location created"
        )
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/locations/{location_id}")
async def get_pickup_location(
    location_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.PICKUP_VIEW)),
):
    """Get a pickup location by ID"""
    service = PickupLocationService(db)

    location = await service.get_location(location_id)
    if not location:
        raise HTTPException(status_code=404, detail="Pickup location not found")

    return success_response(data=_location_to_response(location))


@router.put("/locations/{location_id}")
async def update_pickup_location(
    location_id: str,
    data: PickupLocationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.PICKUP_UPDATE)),
):
    """Update a pickup location"""
    service = PickupLocationService(db)

    try:
        location = await service.update_location(location_id, data, current_user)
        if not location:
            raise HTTPException(status_code=404, detail="Pickup location not found")
        await db.commit()
        return success_response(
            data=_location_to_response(location),
            message="Pickup location updated"
        )
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/locations/{location_id}")
async def delete_pickup_location(
    location_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.PICKUP_UPDATE)),
):
    """Delete a pickup location (soft delete)"""
    service = PickupLocationService(db)

    try:
        success = await service.delete_location(location_id, current_user)
        if not success:
            raise HTTPException(status_code=404, detail="Pickup location not found")
        await db.commit()
        return success_response(message="Pickup location deleted")
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/locations/{location_id}/set-default")
async def set_default_pickup_location(
    location_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.PICKUP_UPDATE)),
):
    """Set a pickup location as the default for its enterprise"""
    service = PickupLocationService(db)

    try:
        location = await service.set_default_location(location_id, current_user)
        if not location:
            raise HTTPException(status_code=404, detail="Pickup location not found")
        await db.commit()
        return success_response(
            data=_location_to_response(location),
            message="Default location updated"
        )
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
