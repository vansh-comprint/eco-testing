"""API endpoints for Reviews (RemoteReview, FacilityQC, OnSiteQC)"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import require_permission
from app.core.permissions import Permission
from app.models import User
from app.models.user import UserRole
from app.schemas.review import (
    RemoteReviewCreate,
    RemoteReviewUpdate,
    FacilityQCCreate,
    OnSiteQCCreate,
)
from app.services.review_service import (
    RemoteReviewService,
    FacilityQCService,
    OnSiteQCService,
)
from app.utils.response import success_response, paginated_response

logger = logging.getLogger(__name__)

router = APIRouter()


async def _check_review_access(db, asset_id: str, current_user: User):
    """Verify user can access reviews for this asset."""
    from app.utils.scoping import is_platform_admin, can_access_enterprise, can_access_branch_scoped
    from app.utils.exceptions import AuthorizationError
    from app.repositories.asset_repository import AssetRepository

    if is_platform_admin(current_user):
        return

    asset_repo = AssetRepository(db)
    asset = await asset_repo.get_by_id(asset_id)
    if not asset:
        return

    if asset.enterprise_id and not can_access_enterprise(current_user, str(asset.enterprise_id)):
        raise AuthorizationError("You do not have access to this review")
    if asset.branch_id and current_user.role == UserRole.IT_ADMIN.value:
        if not await can_access_branch_scoped(db, current_user, str(asset.branch_id)):
            raise AuthorizationError("You do not have access to this review")


# ============================================================================
# Remote Review Endpoints
# ============================================================================


def _remote_review_to_dict(review) -> dict:
    return {
        "id": review.id,
        "asset_id": review.asset_id,
        "submission_id": review.submission_id,
        "reviewer_id": review.reviewer_id,
        "decision": review.decision,
        "grade": review.grade,
        "estimated_value": float(review.estimated_value) if review.estimated_value else None,
        "notes": review.notes,
        "rejection_reason": review.rejection_reason,
        "checklist_results": review.checklist_results,
        "reviewed_at": review.reviewed_at,
        "created_at": review.created_at,
        "updated_at": review.updated_at,
    }


@router.get("/remote")
async def list_remote_reviews(
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page (max 100)"),
    decision: str = Query(None, description="Filter by decision: conditionally_accepted, remote_rejected"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.REVIEW_VIEW)),
):
    """
    List remote reviews with role-based scoping.

    OPS Admins see all reviews. IT Admins see reviews for their branch assets.
    Supports filtering by review decision and pagination.

    **Required permission:** REVIEW_VIEW
    """
    service = RemoteReviewService(db)
    skip = (page - 1) * page_size

    try:
        reviews, total = await service.list_reviews(
            user=current_user,
            decision=decision,
            skip=skip,
            limit=page_size,
        )
        await db.commit()

        return paginated_response(
            data=[_remote_review_to_dict(r) for r in reviews],
            page=page,
            page_size=page_size,
            total=total,
        )
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail="An unexpected error occurred. Please try again.")


@router.post("/remote", status_code=status.HTTP_201_CREATED)
async def create_remote_review(
    data: RemoteReviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.REVIEW_CREATE)),
):
    """
    Create a remote review for a submitted asset.

    Evaluates the employee's self-assessment submission remotely. The reviewer assigns
    a decision (conditionally_accepted or remote_rejected), grade, and estimated value.
    This triggers the corresponding asset status transition.

    **Required permission:** REVIEW_CREATE
    """
    service = RemoteReviewService(db)

    try:
        review = await service.create_review(data, current_user)
        await db.commit()
        await db.refresh(review)
        return success_response(data=_remote_review_to_dict(review), message="Review created")
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail="An unexpected error occurred. Please try again.")


@router.get("/remote/{review_id}")
async def get_remote_review(
    review_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.REVIEW_VIEW)),
):
    """
    Get a remote review by ID.

    Returns the full review details including decision, grade, estimated value,
    checklist results, and reviewer notes.

    **Required permission:** REVIEW_VIEW
    """
    service = RemoteReviewService(db)

    review = await service.get_review(review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    await _check_review_access(db, review.asset_id, current_user)
    return success_response(data=_remote_review_to_dict(review))


@router.put("/remote/{review_id}")
async def update_remote_review(
    review_id: str,
    data: RemoteReviewUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.REVIEW_UPDATE)),
):
    """
    Update a remote review.

    Allows modifying review details such as decision, grade, estimated value, or notes.
    Only the reviewing user or admins can update a review.

    **Required permission:** REVIEW_UPDATE
    """
    service = RemoteReviewService(db)

    try:
        review = await service.update_review(review_id, data, current_user)
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        await db.commit()
        await db.refresh(review)
        return success_response(data=_remote_review_to_dict(review), message="Review updated")
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# Facility QC Endpoints
# ============================================================================


def _facility_qc_to_dict(qc) -> dict:
    return {
        "id": qc.id,
        "asset_id": qc.asset_id,
        "reviewer_id": qc.reviewer_id,
        "decision": qc.decision,
        "grade": qc.grade,
        "final_value": float(qc.final_value) if qc.final_value else None,
        "functional_tests": qc.functional_tests,
        "cosmetic_assessment": qc.cosmetic_assessment,
        "hardware_tests": qc.hardware_tests,
        "photos": qc.photos,
        "notes": qc.notes,
        "rejection_reason": qc.rejection_reason,
        "qc_completed_at": qc.qc_completed_at,
        "created_at": qc.created_at,
        "updated_at": qc.updated_at,
    }


@router.get("/facility")
async def list_facility_qc(
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page (max 100)"),
    decision: str = Query(None, description="Filter by QC decision: final_accepted, final_rejected"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.REVIEW_VIEW)),
):
    """
    List facility QC records with role-based scoping.

    Facility QC is the in-person quality check performed after pickup at the
    processing facility. Includes functional tests, cosmetic assessment, and
    hardware verification results.

    **Required permission:** REVIEW_VIEW
    """
    service = FacilityQCService(db)
    skip = (page - 1) * page_size

    try:
        qcs, total = await service.list_qc(
            user=current_user,
            decision=decision,
            skip=skip,
            limit=page_size,
        )
        await db.commit()

        return paginated_response(
            data=[_facility_qc_to_dict(q) for q in qcs],
            page=page,
            page_size=page_size,
            total=total,
        )
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail="An unexpected error occurred. Please try again.")


@router.post("/facility", status_code=status.HTTP_201_CREATED)
async def create_facility_qc(
    data: FacilityQCCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.REVIEW_CREATE)),
):
    """
    Create a facility QC record for a picked-up asset.

    Records the results of in-person quality checks including functional tests,
    cosmetic assessment, hardware tests, and final valuation. Sets the asset's
    final decision (final_accepted or final_rejected).

    **Required permission:** REVIEW_CREATE
    """
    service = FacilityQCService(db)

    try:
        qc = await service.create_qc(data, current_user)
        await db.commit()
        await db.refresh(qc)
        return success_response(data=_facility_qc_to_dict(qc), message="Facility QC created")
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/facility/{qc_id}")
async def get_facility_qc(
    qc_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.REVIEW_VIEW)),
):
    """
    Get a facility QC record by ID.

    Returns the full QC details including functional tests, cosmetic assessment,
    hardware tests, photos, final value, and reviewer notes.

    **Required permission:** REVIEW_VIEW
    """
    service = FacilityQCService(db)

    qc = await service.get_qc(qc_id)
    if not qc:
        raise HTTPException(status_code=404, detail="QC record not found")

    await _check_review_access(db, qc.asset_id, current_user)
    return success_response(data=_facility_qc_to_dict(qc))


# ============================================================================
# On-Site QC Endpoints
# ============================================================================


def _onsite_qc_to_dict(qc) -> dict:
    return {
        "id": qc.id,
        "asset_id": qc.asset_id,
        "pickup_request_id": qc.pickup_request_id,
        "performed_by_user_id": qc.performed_by_user_id,
        "status": qc.status,
        "physical_condition_ok": qc.physical_condition_ok,
        "powers_on": qc.powers_on,
        "screen_ok": qc.screen_ok,
        "keyboard_ok": qc.keyboard_ok,
        "ports_ok": qc.ports_ok,
        "photo_urls": qc.photo_urls,
        "notes": qc.notes,
        "performed_at": qc.performed_at,
        "extra_data": qc.extra_data,
        "created_at": qc.created_at,
        "updated_at": qc.updated_at,
    }


@router.get("/onsite")
async def list_onsite_qc(
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page (max 100)"),
    status: str = Query(None, description="Filter by QC status: pending, completed, failed"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.REVIEW_VIEW)),
):
    """
    List on-site QC records with role-based scoping.

    On-site QC is performed by logistics field users during device pickup.
    Checks physical condition, power-on, screen, keyboard, and ports.

    **Required permission:** REVIEW_VIEW
    """
    service = OnSiteQCService(db)
    skip = (page - 1) * page_size

    try:
        qcs, total = await service.list_qc(
            user=current_user,
            status=status,
            skip=skip,
            limit=page_size,
        )
        await db.commit()

        return paginated_response(
            data=[_onsite_qc_to_dict(q) for q in qcs],
            page=page,
            page_size=page_size,
            total=total,
        )
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail="An unexpected error occurred. Please try again.")


@router.post("/onsite", status_code=status.HTTP_201_CREATED)
async def create_onsite_qc(
    data: OnSiteQCCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.PICKUP_UPDATE)),
):
    """
    Create an on-site QC record during device pickup.

    Performed by logistics field users at the pickup location. Records physical
    condition checks (screen, keyboard, ports), power-on test, and photos.
    Linked to the pickup request for the asset.

    **Required permission:** PICKUP_UPDATE (logistics users)
    """
    service = OnSiteQCService(db)

    try:
        qc = await service.create_qc(data, current_user)
        await db.commit()
        await db.refresh(qc)
        return success_response(data=_onsite_qc_to_dict(qc), message="On-site QC created")
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/onsite/{qc_id}")
async def get_onsite_qc(
    qc_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.REVIEW_VIEW)),
):
    """
    Get an on-site QC record by ID.

    Returns the full on-site QC details including physical condition checks,
    power-on test, photo URLs, and performer notes.

    **Required permission:** REVIEW_VIEW
    """
    service = OnSiteQCService(db)

    qc = await service.get_qc(qc_id)
    if not qc:
        raise HTTPException(status_code=404, detail="QC record not found")

    await _check_review_access(db, qc.asset_id, current_user)
    return success_response(data=_onsite_qc_to_dict(qc))
