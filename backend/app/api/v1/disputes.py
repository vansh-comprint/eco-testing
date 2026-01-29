"""API endpoints for Disputes"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import require_permission
from app.core.permissions import Permission
from app.models import User
from app.schemas.dispute import DisputeCreate, DisputeUpdate, DisputeResolve
from app.services.dispute_service import DisputeService
from app.utils.response import success_response, paginated_response

router = APIRouter()


def _to_dict(dispute) -> dict:
    return {
        "id": dispute.id,
        "asset_id": dispute.asset_id,
        "raised_by_user_id": dispute.raised_by_user_id,
        "assigned_to_user_id": dispute.assigned_to_user_id,
        "dispute_type": dispute.dispute_type,
        "status": dispute.status,
        "description": dispute.description,
        "evidence_urls": dispute.evidence_urls,
        "resolution": dispute.resolution,
        "resolved_at": dispute.resolved_at,
        "resolved_by_user_id": dispute.resolved_by_user_id,
        "extra_data": dispute.extra_data,
        "created_at": dispute.created_at,
        "updated_at": dispute.updated_at,
    }


@router.get("")
async def list_disputes(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str = Query(None),
    dispute_type: str = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DISPUTE_VIEW)),
):
    """List disputes with role-based filtering"""
    service = DisputeService(db)
    skip = (page - 1) * page_size

    try:
        disputes, total = await service.list_disputes(
            user=current_user,
            status=status,
            dispute_type=dispute_type,
            skip=skip,
            limit=page_size,
        )
        await db.commit()

        return paginated_response(
            data=[_to_dict(d) for d in disputes],
            page=page,
            page_size=page_size,
            total=total,
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/open")
async def list_open_disputes(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DISPUTE_MANAGE)),
):
    """List all open disputes (admin only)"""
    service = DisputeService(db)
    skip = (page - 1) * page_size

    try:
        disputes, total = await service.get_open_disputes(
            user=current_user,
            skip=skip,
            limit=page_size,
        )
        await db.commit()

        return paginated_response(
            data=[_to_dict(d) for d in disputes],
            page=page,
            page_size=page_size,
            total=total,
        )
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=403, detail=str(e))


@router.post("")
async def create_dispute(
    data: DisputeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DISPUTE_CREATE)),
):
    """Create a dispute"""
    service = DisputeService(db)

    try:
        dispute = await service.create_dispute(data, current_user)
        await db.commit()
        return success_response(data=_to_dict(dispute), message="Dispute created")
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{dispute_id}")
async def get_dispute(
    dispute_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DISPUTE_VIEW)),
):
    """Get a dispute by ID"""
    service = DisputeService(db)

    dispute = await service.get_dispute(dispute_id)
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")

    return success_response(data=_to_dict(dispute))


@router.put("/{dispute_id}")
async def update_dispute(
    dispute_id: str,
    data: DisputeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DISPUTE_MANAGE)),
):
    """Update a dispute"""
    service = DisputeService(db)

    try:
        dispute = await service.update_dispute(dispute_id, data, current_user)
        if not dispute:
            raise HTTPException(status_code=404, detail="Dispute not found")
        await db.commit()
        return success_response(data=_to_dict(dispute), message="Dispute updated")
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{dispute_id}/assign")
async def assign_dispute(
    dispute_id: str,
    assigned_to_user_id: str = Query(..., description="User ID to assign to"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DISPUTE_MANAGE)),
):
    """Assign a dispute to a user"""
    service = DisputeService(db)

    try:
        dispute = await service.assign_dispute(dispute_id, assigned_to_user_id, current_user)
        await db.commit()
        return success_response(data=_to_dict(dispute), message="Dispute assigned")
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{dispute_id}/resolve")
async def resolve_dispute(
    dispute_id: str,
    data: DisputeResolve,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DISPUTE_MANAGE)),
):
    """Resolve a dispute"""
    service = DisputeService(db)

    try:
        dispute = await service.resolve_dispute(dispute_id, data, current_user)
        await db.commit()
        return success_response(data=_to_dict(dispute), message="Dispute resolved")
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
