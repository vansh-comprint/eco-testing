"""Enterprise management endpoints"""

import logging
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Body, Depends, status, Query, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import require_permission
from app.middleware.rate_limit import rate_limit_public_upload
from app.core.permissions import Permission
from app.models.user import User
from app.models.enterprise import EnterpriseStatus, EnterpriseApplicationStatus
from app.schemas.enterprise import (
    EnterpriseCreate,
    EnterpriseUpdate,
    EnterpriseApplicationCreate,
    EnterpriseApplicationReview,
    EnterpriseApplicationReject,
    EnterpriseApplicationRequestInfo,
)
from app.services.enterprise_service import EnterpriseService, EnterpriseApplicationService
from app.utils.response import success_response, paginated_response
from app.utils.exceptions import NotFoundError, ValidationError, ConflictError
from app.utils.scoping import get_scoped_filters, is_platform_admin, can_access_enterprise
from app.utils.exceptions import AuthorizationError as EcoTribeAuthorizationError

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("", response_model=dict)
async def list_enterprises(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=100, description="Number of records to return"),
    status: Optional[EnterpriseStatus] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by name, legal name, GST, or email"),
    current_user: User = Depends(require_permission(Permission.ENTERPRISE_READ)),
    db: AsyncSession = Depends(get_db),
):
    """
    List enterprises.

    Data is automatically scoped based on user's role:
    - Super Admin / OPS Admin: All enterprises
    - Org Admin / IT Admin: Only their enterprise

    **Permissions:** ENTERPRISE_READ
    """
    scoped_filters = get_scoped_filters(current_user)

    # If user is scoped to an enterprise, only return that enterprise
    enterprise_id = scoped_filters.get("enterprise_id")

    service = EnterpriseService(db)

    if enterprise_id:
        # Return only the user's enterprise
        try:
            enterprise = await service.get_enterprise(enterprise_id)
            return paginated_response(
                data=[enterprise.model_dump()],
                total=1,
                page=1,
                page_size=limit,
            )
        except NotFoundError:
            return paginated_response(data=[], total=0, page=1, page_size=limit)

    # Platform admins can see all enterprises
    enterprises, total = await service.list_enterprises(
        skip=skip,
        limit=limit,
        status=status,
        search=search,
    )

    return paginated_response(
        data=[enterprise.model_dump() for enterprise in enterprises],
        total=total,
        page=(skip // limit) + 1,
        page_size=limit,
    )


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_enterprise(
    enterprise_data: EnterpriseCreate,
    current_user: User = Depends(require_permission(Permission.ENTERPRISE_CREATE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new enterprise.

    Only platform admins can create enterprises.

    **Permissions:** ENTERPRISE_CREATE
    """
    try:
        service = EnterpriseService(db)
        enterprise = await service.create_enterprise(enterprise_data, current_user.id)
        return success_response(
            data=enterprise.model_dump(), message="Enterprise created successfully"
        )
    except (ValidationError, ConflictError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create enterprise: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create enterprise. Please try again or contact support.",
        )


# ============================================================================
# ENTERPRISE APPLICATIONS ENDPOINTS
# Note: These routes MUST come before /{enterprise_id} to avoid path conflicts
# ============================================================================


@router.get("/applications/stats", response_model=dict)
async def get_enterprise_application_stats(
    current_user: User = Depends(require_permission(Permission.MANAGE_ENTERPRISE_APPLICATIONS)),
    db: AsyncSession = Depends(get_db),
):
    """
    Get enterprise application counts by status.

    Returns counts for pending, approved, rejected, and more_info_requested.

    **Permissions:** MANAGE_ENTERPRISE_APPLICATIONS
    """
    from sqlalchemy import select, func
    from app.models.enterprise import EnterpriseApplication

    q = (
        select(EnterpriseApplication.status, func.count())
        .group_by(EnterpriseApplication.status)
    )
    result = await db.execute(q)
    counts = {row[0]: row[1] for row in result.all()}

    return success_response(data={
        "pending": counts.get("pending", 0),
        "approved": counts.get("approved", 0),
        "rejected": counts.get("rejected", 0),
        "more_info_requested": counts.get("more_info_requested", 0),
        "total": sum(counts.values()),
    })


@router.get("/applications", response_model=dict)
async def list_enterprise_applications(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=100, description="Number of records to return"),
    status: Optional[EnterpriseApplicationStatus] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by company name, email, or ref"),
    current_user: User = Depends(require_permission(Permission.MANAGE_ENTERPRISE_APPLICATIONS)),
    db: AsyncSession = Depends(get_db),
):
    """
    List enterprise applications.

    Only platform admins (Super Admin / OPS Admin) can view applications.

    **Permissions:** MANAGE_ENTERPRISE_APPLICATIONS
    """
    service = EnterpriseApplicationService(db)
    applications, total = await service.list_applications(
        skip=skip,
        limit=limit,
        status=status,
        search=search,
    )

    return paginated_response(
        data=[app.model_dump() for app in applications],
        total=total,
        page=(skip // limit) + 1,
        page_size=limit,
    )


@router.get("/applications/check-gst", response_model=dict)
async def check_gst_exists(
    gst_number: str = Query(..., description="GST number to check"),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limit_public_upload),
):
    """
    Check if a GST number already exists in enterprises or pending applications.
    Public endpoint - no authentication required. Rate-limited.
    """
    gst_upper = gst_number.strip().upper()
    if not gst_upper:
        return success_response(data={"exists": False})

    app_service = EnterpriseApplicationService(db)

    # Check existing enterprises
    existing_enterprise = await app_service.enterprise_repo.get_by_gst(gst_upper)
    if existing_enterprise:
        return success_response(data={"exists": True, "reason": "GST number is already registered"})

    # Check pending/active applications
    pending_app = await app_service.repository.get_by_gst(gst_upper)
    if pending_app and pending_app.status in [
        EnterpriseApplicationStatus.PENDING.value,
        EnterpriseApplicationStatus.MORE_INFO_REQUESTED.value,
    ]:
        return success_response(data={"exists": True, "reason": "A pending application with this GST already exists"})

    return success_response(data={"exists": False})


@router.get("/applications/check-email", response_model=dict)
async def check_email_exists(
    email: str = Query(..., description="Email to check"),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limit_public_upload),
):
    """
    Check if an email already exists in users or pending applications.
    Public endpoint - no authentication required. Rate-limited.
    """
    email_lower = email.strip().lower()
    if not email_lower:
        return success_response(data={"exists": False})

    app_service = EnterpriseApplicationService(db)

    # Check existing users
    existing_user = await app_service.user_repo.get_by_email(email_lower)
    if existing_user:
        return success_response(data={"exists": True, "reason": "This email is already registered"})

    # Check pending/active applications
    pending_app = await app_service.repository.get_by_email(email_lower)
    if pending_app and pending_app.status in [
        EnterpriseApplicationStatus.PENDING.value,
        EnterpriseApplicationStatus.MORE_INFO_REQUESTED.value,
    ]:
        return success_response(data={"exists": True, "reason": "A pending application with this email already exists"})

    return success_response(data={"exists": False})


@router.post("/applications/upload-document", response_model=dict, status_code=status.HTTP_201_CREATED)
async def upload_application_document(
    file: UploadFile = File(..., description="Document file (PDF, JPG, PNG)"),
    document_type: str = Form(..., description="Document type (gst, pan, incorporation, signatory_id, address_proof, logo)"),
    _: None = Depends(rate_limit_public_upload),
):
    """
    Upload a document for enterprise registration.

    This is a public endpoint - no authentication required.
    Used during the enterprise registration flow before an account exists.

    **Allowed formats**: PDF, JPG, JPEG, PNG
    **Max size**: 5 MB
    """
    from app.services.file_service import FileService, validate_content_type
    from app.storage.storage_factory import StorageBucket
    from app.core.storage import generate_file_key

    ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png']
    MAX_SIZE = 5 * 1024 * 1024  # 5 MB

    # Validate document type
    valid_types = ['gst', 'pan', 'incorporation', 'signatory_id', 'address_proof', 'logo']
    if document_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid document type. Must be one of: {', '.join(valid_types)}",
        )

    # Validate file extension
    import os
    ext = os.path.splitext(file.filename or '')[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Read and validate content
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {MAX_SIZE / (1024 * 1024):.0f} MB",
        )

    try:
        content_type = validate_content_type(content, file.filename, file.content_type)
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Upload to storage
    from io import BytesIO
    from datetime import datetime

    file_service = FileService()
    prefix = f"applications/{datetime.utcnow().strftime('%Y/%m')}/{document_type}"
    file_key = generate_file_key(file.filename, prefix=prefix)

    metadata = {
        "original_filename": file.filename,
        "uploaded_by": "public_registration",
        "uploaded_at": datetime.utcnow().isoformat(),
        "document_type": document_type,
    }

    url = await file_service.storage.upload(
        file=BytesIO(content),
        bucket=StorageBucket.DOCUMENTS,
        key=file_key,
        content_type=content_type,
        metadata=metadata,
    )

    return success_response(
        data={"file_url": url, "file_name": file.filename, "document_type": document_type},
        message="Document uploaded successfully",
    )


@router.post("/applications", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_enterprise_application(
    application_data: EnterpriseApplicationCreate,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limit_public_upload),
):
    """
    Create a new enterprise application (registration).

    This is a public endpoint - no authentication required.
    The application will be reviewed by platform admins.
    """
    try:
        service = EnterpriseApplicationService(db)
        application = await service.create_application(application_data)
        return success_response(
            data=application.model_dump(),
            message="Application submitted successfully. You will be notified once reviewed.",
        )
    except ConflictError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/applications/{application_id}", response_model=dict)
async def get_enterprise_application(
    application_id: str,
    current_user: User = Depends(require_permission(Permission.MANAGE_ENTERPRISE_APPLICATIONS)),
    db: AsyncSession = Depends(get_db),
):
    """
    Get enterprise application by ID.

    **Permissions:** MANAGE_ENTERPRISE_APPLICATIONS
    """
    try:
        service = EnterpriseApplicationService(db)
        application = await service.get_application(application_id)
        return success_response(data=application.model_dump())
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/applications/{application_id}/approve", response_model=dict)
async def approve_enterprise_application(
    application_id: str,
    review_data: EnterpriseApplicationReview,
    current_user: User = Depends(require_permission(Permission.MANAGE_ENTERPRISE_APPLICATIONS)),
    db: AsyncSession = Depends(get_db),
):
    """
    Approve an enterprise application.

    This creates the enterprise and org admin user.

    **Permissions:** MANAGE_ENTERPRISE_APPLICATIONS
    """
    try:
        service = EnterpriseApplicationService(db)
        application = await service.approve_application(
            application_id=application_id,
            reviewed_by=current_user.id,
            review_notes=review_data.review_notes,
        )
        return success_response(
            data=application.model_dump(),
            message="Application approved. Enterprise and Org Admin created.",
        )
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except ConflictError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to approve application {application_id}: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to approve application. Please try again or contact support.",
        )


@router.post("/applications/{application_id}/reject", response_model=dict)
async def reject_enterprise_application(
    application_id: str,
    reject_data: EnterpriseApplicationReject,
    current_user: User = Depends(require_permission(Permission.MANAGE_ENTERPRISE_APPLICATIONS)),
    db: AsyncSession = Depends(get_db),
):
    """
    Reject an enterprise application.

    **Permissions:** MANAGE_ENTERPRISE_APPLICATIONS
    """
    try:
        service = EnterpriseApplicationService(db)
        application = await service.reject_application(
            application_id=application_id,
            reviewed_by=current_user.id,
            reason=reject_data.reason,
            review_notes=reject_data.review_notes,
        )
        return success_response(
            data=application.model_dump(),
            message="Application rejected.",
        )
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/applications/{application_id}/request-info", response_model=dict)
async def request_more_info_enterprise_application(
    application_id: str,
    info_data: EnterpriseApplicationRequestInfo,
    current_user: User = Depends(require_permission(Permission.MANAGE_ENTERPRISE_APPLICATIONS)),
    db: AsyncSession = Depends(get_db),
):
    """
    Request more information for an enterprise application.

    **Permissions:** MANAGE_ENTERPRISE_APPLICATIONS
    """
    try:
        service = EnterpriseApplicationService(db)
        application = await service.request_more_info(
            application_id=application_id,
            reviewed_by=current_user.id,
            notes=info_data.notes,
        )
        return success_response(
            data=application.model_dump(),
            message="More information requested.",
        )
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ============================================================================
# ENTERPRISE CRUD BY ID (must come after /applications routes)
# ============================================================================


@router.get("/{enterprise_id}", response_model=dict)
async def get_enterprise(
    enterprise_id: str,
    current_user: User = Depends(require_permission(Permission.ENTERPRISE_READ)),
    db: AsyncSession = Depends(get_db),
):
    """
    Get enterprise by ID.

    **Permissions:** ENTERPRISE_READ
    """
    if not is_platform_admin(current_user):
        if not can_access_enterprise(current_user, enterprise_id):
            raise EcoTribeAuthorizationError("You do not have access to this enterprise")

    try:
        service = EnterpriseService(db)
        enterprise = await service.get_enterprise(enterprise_id)
        return success_response(data=enterprise.model_dump())
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.put("/{enterprise_id}", response_model=dict)
async def update_enterprise(
    enterprise_id: str,
    enterprise_data: EnterpriseUpdate,
    current_user: User = Depends(require_permission(Permission.ENTERPRISE_UPDATE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Update enterprise by ID.

    **Permissions:** ENTERPRISE_UPDATE
    """
    if not is_platform_admin(current_user):
        if not can_access_enterprise(current_user, enterprise_id):
            raise EcoTribeAuthorizationError("You do not have access to this enterprise")

    try:
        service = EnterpriseService(db)
        enterprise = await service.update_enterprise(
            enterprise_id, enterprise_data, current_user.id
        )
        return success_response(
            data=enterprise.model_dump(), message="Enterprise updated successfully"
        )
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except (ValidationError, ConflictError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{enterprise_id}/deactivation-preview", response_model=dict)
async def preview_enterprise_deactivation(
    enterprise_id: str,
    current_user: User = Depends(require_permission(Permission.ENTERPRISE_UPDATE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Preview the impact of deactivating an enterprise.

    Returns counts of users, batches, pickups, and branches that will be affected.
    Use this before calling the deactivate endpoint.

    **Permissions:** ENTERPRISE_UPDATE
    **Roles:** Super Admin, OPS Admin only
    """
    if not is_platform_admin(current_user):
        raise EcoTribeAuthorizationError("Only platform admins can deactivate enterprises")

    service = EnterpriseService(db)
    preview = await service.preview_deactivation(enterprise_id)
    return success_response(data=preview)


@router.post("/{enterprise_id}/deactivate", response_model=dict)
async def deactivate_enterprise(
    enterprise_id: str,
    reason: str = Body(..., embed=True),
    current_user: User = Depends(require_permission(Permission.ENTERPRISE_UPDATE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Deactivate an enterprise with full cascade cleanup.

    - Deactivates all users (triggering per-user cleanup: assets, branches, pickups, disputes)
    - Cancels all non-terminal batches
    - Cancels all non-terminal pickups
    - Sets enterprise status to INACTIVE

    Use the preview endpoint first to see the impact.

    **Permissions:** ENTERPRISE_UPDATE
    **Roles:** Super Admin, OPS Admin only
    """
    if not is_platform_admin(current_user):
        raise EcoTribeAuthorizationError("Only platform admins can deactivate enterprises")

    service = EnterpriseService(db)
    result = await service.deactivate_enterprise(enterprise_id, reason, current_user.id)
    return success_response(
        data=result,
        message=f"Enterprise deactivated: {result['users_deactivated']} users, "
                f"{result['batches_cancelled']} batches, {result['pickups_cancelled']} pickups affected",
    )


@router.delete("/{enterprise_id}", response_model=dict, status_code=status.HTTP_200_OK)
async def delete_enterprise(
    enterprise_id: str,
    current_user: User = Depends(require_permission(Permission.ENTERPRISE_DELETE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete enterprise by ID.

    Only allowed if the enterprise has no active users. Use the deactivate
    endpoint first to cascade-deactivate all dependencies, then delete.

    **Permissions:** ENTERPRISE_DELETE
    """
    if not is_platform_admin(current_user):
        if not can_access_enterprise(current_user, enterprise_id):
            raise EcoTribeAuthorizationError("You do not have access to this enterprise")

    try:
        service = EnterpriseService(db)
        await service.delete_enterprise(enterprise_id)
        return success_response(message="Enterprise deleted successfully")
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
