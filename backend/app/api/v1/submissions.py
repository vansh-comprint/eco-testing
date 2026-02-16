"""API endpoints for Submissions"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import require_permission
from app.core.permissions import Permission
from app.models import User
from app.schemas.submission import (
    SubmissionCreate,
    SubmissionUpdate,
)
from app.services.submission_service import SubmissionService
from app.utils.response import success_response, paginated_response

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
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page (max 100)"),
    enterprise_id: str = Query(None, description="Filter by enterprise ID"),
    branch_id: str = Query(None, description="Filter by branch ID"),
    user_id: str = Query(None, description="Filter by submitting user ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.SUBMISSION_VIEW)),
):
    """
    List submissions with role-based scoping.

    Employee self-evaluation submissions for device trade-in. Each submission
    contains device confirmation, photos, functional checks, cosmetic checklist,
    accessories, and employee declaration. Auto-scoped by role: employees see
    only their own; IT Admins see their branch; Org Admins see their enterprise.

    **Required permission:** SUBMISSION_VIEW
    """
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
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page (max 100)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.SUBMISSION_VIEW)),
):
    """
    List submissions pending remote review.

    Returns submissions that have been completed by employees but not yet
    reviewed by an OPS Admin. Used by reviewers to pick up work items
    from the review queue.

    **Required permission:** SUBMISSION_VIEW
    """
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


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_submission(
    data: SubmissionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.SUBMISSION_CREATE)),
):
    """
    Create a new device self-evaluation submission.

    Employees submit their device's condition including photos, functional checks,
    cosmetic checklist, and accessories. This transitions the asset status to
    'submitted' and queues it for remote review.

    **Required permission:** SUBMISSION_CREATE
    """
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
    """
    Get a submission by asset ID.

    Looks up the self-evaluation submission linked to a specific asset.
    Useful for reviewers who need to see the employee's assessment before
    performing their own review.

    **Required permission:** SUBMISSION_VIEW
    """
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
    """
    Get a submission by ID.

    Returns the full submission details including device confirmation, photos,
    functional checks, cosmetic checklist, accessories, location, and declaration.

    **Required permission:** SUBMISSION_VIEW
    """
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
    """
    Update a submission.

    Allows modifying submission details before review. Only the submitting employee
    or admins can update. Cannot be modified after review has started.

    **Required permission:** SUBMISSION_UPDATE
    """
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
