"""API endpoints for Submissions"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import require_permission
from app.core.permissions import Permission
from app.models import User
from app.schemas.submission import (
    SubmissionCreate,
    SubmissionUpdate,
    SubmissionResponse,
    SubmissionListResponse,
)
from app.services.submission_service import SubmissionService
from app.utils.response import success_response, error_response, paginated_response

router = APIRouter()


def _to_response(submission) -> dict:
    """Convert submission model to response dict"""
    return {
        "id": submission.id,
        "asset_id": submission.asset_id,
        "user_id": submission.user_id,
        "device_confirmed": submission.device_confirmed,
        "photos": submission.photos or {},
        "functional_checks": submission.functional_checks or {},
        "cosmetic_checklist": submission.cosmetic_checklist,
        "accessories": submission.accessories,
        "location": submission.location,
        "declaration": submission.declaration,
        "submitted_at": submission.submitted_at,
        "created_at": submission.created_at,
        "updated_at": submission.updated_at,
    }


@router.get("")
async def list_submissions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    enterprise_id: str = Query(None),
    branch_id: str = Query(None),
    user_id: str = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.SUBMISSION_VIEW)),
):
    """List submissions with role-based filtering"""
    service = SubmissionService(db)
    skip = (page - 1) * page_size

    try:
        submissions, total = await service.list_submissions(
            user=current_user,
            enterprise_id=enterprise_id,
            branch_id=branch_id,
            user_id=user_id,
            skip=skip,
            limit=page_size,
        )
        await db.commit()

        return paginated_response(
            data=[_to_response(s) for s in submissions],
            page=page,
            page_size=page_size,
            total=total,
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pending-review")
async def list_pending_review(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.SUBMISSION_VIEW)),
):
    """List submissions pending remote review"""
    service = SubmissionService(db)
    skip = (page - 1) * page_size

    try:
        submissions, total = await service.get_pending_review(
            user=current_user,
            skip=skip,
            limit=page_size,
        )
        await db.commit()

        return paginated_response(
            data=[_to_response(s) for s in submissions],
            page=page,
            page_size=page_size,
            total=total,
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def create_submission(
    data: SubmissionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.SUBMISSION_CREATE)),
):
    """Create a new submission"""
    service = SubmissionService(db)

    try:
        submission = await service.create_submission(data, current_user)
        await db.commit()
        return success_response(data=_to_response(submission), message="Submission created")
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-asset/{asset_id}")
async def get_submission_by_asset(
    asset_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.SUBMISSION_VIEW)),
):
    """Get a submission by asset ID"""
    service = SubmissionService(db)

    submission = await service.get_by_asset(asset_id)
    if not submission:
        raise HTTPException(status_code=404, detail="No submission found for this asset")

    return success_response(data=_to_response(submission))


@router.get("/{submission_id}")
async def get_submission(
    submission_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.SUBMISSION_VIEW)),
):
    """Get a submission by ID"""
    service = SubmissionService(db)

    submission = await service.get_submission(submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    return success_response(data=_to_response(submission))


@router.put("/{submission_id}")
async def update_submission(
    submission_id: str,
    data: SubmissionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.SUBMISSION_UPDATE)),
):
    """Update a submission"""
    service = SubmissionService(db)

    try:
        submission = await service.update_submission(submission_id, data, current_user)
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found")
        await db.commit()
        return success_response(data=_to_response(submission), message="Submission updated")
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
