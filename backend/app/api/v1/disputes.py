"""API endpoints for Disputes"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import require_permission
from app.core.permissions import Permission
from app.models import User
from app.models.user import UserRole
from app.schemas.dispute import DisputeCreate, DisputeUpdate, DisputeResolve
from app.services.dispute_service import DisputeService
from app.utils.response import success_response, paginated_response

logger = logging.getLogger(__name__)

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


async def _check_dispute_access(db, dispute, current_user: User):
    """Verify user can access this dispute."""
    from app.utils.scoping import is_platform_admin, can_access_enterprise, can_access_branch_scoped
    from app.utils.exceptions import AuthorizationError
    from app.repositories.asset_repository import AssetRepository

    if is_platform_admin(current_user):
        return

    # Employees can see their own disputes
    if current_user.role == UserRole.EMPLOYEE.value:
        if dispute.raised_by_user_id == current_user.id:
            return
        raise AuthorizationError("You can only view your own disputes")

    # Check via asset's enterprise/branch
    asset_repo = AssetRepository(db)
    asset = await asset_repo.get_by_id(dispute.asset_id)
    if not asset:
        return

    if asset.enterprise_id and not can_access_enterprise(current_user, str(asset.enterprise_id)):
        raise AuthorizationError("You do not have access to this dispute")
    if asset.branch_id and current_user.role == UserRole.IT_ADMIN.value:
        if not await can_access_branch_scoped(db, current_user, str(asset.branch_id)):
            raise AuthorizationError("You do not have access to this dispute")


@router.get("")
async def list_disputes(
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page (max 100)"),
    status: str = Query(None, description="Filter by status: open, in_progress, resolved, escalated, closed"),
    dispute_type: str = Query(None, description="Filter by type: grading, valuation, damage, missing_item, other"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DISPUTE_VIEW)),
):
    """
    List disputes with role-based scoping.

    Super/OPS Admins see all disputes. Org/IT Admins see disputes for their enterprise.
    Employees see only their own disputes. Supports filtering by status and dispute type.

    **Required permission:** DISPUTE_VIEW
    """
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
        logger.error(f"Unexpected error: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail="An unexpected error occurred. Please try again.")


@router.get("/open")
async def list_open_disputes(
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page (max 100)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DISPUTE_MANAGE)),
):
    """
    List all open/unresolved disputes (admin only).

    Returns disputes that haven't been resolved yet, for admin triage and assignment.

    **Required permission:** DISPUTE_MANAGE
    """
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


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_dispute(
    data: DisputeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DISPUTE_CREATE)),
):
    """
    Create a dispute for an asset.

    Raises a dispute against an asset's review outcome, valuation, or condition assessment.
    The dispute is initially in 'open' status and can be assigned to an admin for resolution.
    Attach evidence URLs to support the claim.

    **Required permission:** DISPUTE_CREATE
    """
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
    """
    Get a dispute by ID.

    Returns full dispute details including type, status, description,
    evidence URLs, assignment info, and resolution details.

    **Required permission:** DISPUTE_VIEW
    """
    service = DisputeService(db)

    dispute = await service.get_dispute(dispute_id)
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")

    await _check_dispute_access(db, dispute, current_user)
    return success_response(data=_to_dict(dispute))


@router.put("/{dispute_id}")
async def update_dispute(
    dispute_id: str,
    data: DisputeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DISPUTE_MANAGE)),
):
    """
    Update a dispute's details.

    Allows modifying dispute description, evidence, status, or other metadata.
    Typically used by admins managing the dispute resolution process.

    **Required permission:** DISPUTE_MANAGE
    """
    service = DisputeService(db)

    # Access check before update
    existing = await service.get_dispute(dispute_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Dispute not found")
    await _check_dispute_access(db, existing, current_user)

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
    assigned_to_user_id: str = Query(..., description="User ID to assign the dispute to"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DISPUTE_MANAGE)),
):
    """
    Assign a dispute to a user for resolution.

    Assigns an open dispute to a specific admin or OPS user who will investigate
    and resolve it.

    **Required permission:** DISPUTE_MANAGE
    """
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
    """
    Resolve a dispute with a resolution description.

    Marks the dispute as resolved and records the resolution outcome.
    The resolver and timestamp are automatically recorded.

    **Required permission:** DISPUTE_MANAGE
    """
    service = DisputeService(db)

    try:
        dispute = await service.resolve_dispute(dispute_id, data, current_user)
        await db.commit()
        return success_response(data=_to_dict(dispute), message="Dispute resolved")
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
