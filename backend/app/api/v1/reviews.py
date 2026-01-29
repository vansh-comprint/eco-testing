"""API endpoints for Reviews (RemoteReview, FacilityQC, OnSiteQC)"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import require_permission
from app.core.permissions import Permission
from app.models import User
from app.schemas.review import (
    RemoteReviewCreate,
    RemoteReviewUpdate,
    RemoteReviewResponse,
    FacilityQCCreate,
    FacilityQCResponse,
    OnSiteQCCreate,
    OnSiteQCResponse,
)
from app.services.review_service import (
    RemoteReviewService,
    FacilityQCService,
    OnSiteQCService,
)
from app.utils.response import success_response, paginated_response

router = APIRouter()


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
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    decision: str = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.REVIEW_VIEW)),
):
    """List remote reviews"""
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
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/remote")
async def create_remote_review(
    data: RemoteReviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.REVIEW_CREATE)),
):
    """Create a remote review"""
    service = RemoteReviewService(db)

    try:
        review = await service.create_review(data, current_user)
        await db.commit()
        return success_response(data=_remote_review_to_dict(review), message="Review created")
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/remote/{review_id}")
async def get_remote_review(
    review_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.REVIEW_VIEW)),
):
    """Get a remote review by ID"""
    service = RemoteReviewService(db)

    review = await service.get_review(review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    return success_response(data=_remote_review_to_dict(review))


@router.put("/remote/{review_id}")
async def update_remote_review(
    review_id: str,
    data: RemoteReviewUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.REVIEW_UPDATE)),
):
    """Update a remote review"""
    service = RemoteReviewService(db)

    try:
        review = await service.update_review(review_id, data, current_user)
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        await db.commit()
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
        "technician_id": qc.technician_id,
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
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    decision: str = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.REVIEW_VIEW)),
):
    """List facility QC records"""
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
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/facility")
async def create_facility_qc(
    data: FacilityQCCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.REVIEW_CREATE)),
):
    """Create a facility QC record"""
    service = FacilityQCService(db)

    try:
        qc = await service.create_qc(data, current_user)
        await db.commit()
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
    """Get a facility QC record by ID"""
    service = FacilityQCService(db)

    qc = await service.get_qc(qc_id)
    if not qc:
        raise HTTPException(status_code=404, detail="QC record not found")

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
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.REVIEW_VIEW)),
):
    """List on-site QC records"""
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
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/onsite")
async def create_onsite_qc(
    data: OnSiteQCCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.PICKUP_UPDATE)),  # Logistics users can create
):
    """Create an on-site QC record"""
    service = OnSiteQCService(db)

    try:
        qc = await service.create_qc(data, current_user)
        await db.commit()
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
    """Get an on-site QC record by ID"""
    service = OnSiteQCService(db)

    qc = await service.get_qc(qc_id)
    if not qc:
        raise HTTPException(status_code=404, detail="QC record not found")

    return success_response(data=_onsite_qc_to_dict(qc))
