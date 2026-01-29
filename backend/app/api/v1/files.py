"""File upload endpoints"""

from fastapi import APIRouter, Depends, UploadFile, File, Form, status
from typing import List

from app.middleware.auth import get_current_user, require_permission
from app.core.permissions import Permission
from app.models.user import User
from app.schemas.file import FileUploadResponse, PresignedUrlRequest, PresignedUrlResponse
from app.services.file_service import FileService
from app.storage.storage_factory import get_storage, StorageBucket
from app.utils.response import success_response
from datetime import datetime, timedelta

router = APIRouter()


@router.post("/upload/device-photo", response_model=dict, status_code=status.HTTP_201_CREATED)
async def upload_device_photo(
    file: UploadFile = File(..., description="Device photo"),
    submission_id: str = Form(..., description="Submission ID"),
    current_user: User = Depends(require_permission(Permission.SUBMIT_DEVICE_EVALUATION)),
):
    """
    Upload device photo for submission.

    **Allowed formats**: JPG, JPEG, PNG, GIF, WEBP
    **Max size**: 10 MB
    **Bucket**: submissions
    **Permissions**: submit_device_evaluation
    """
    file_service = FileService()
    result = await file_service.upload_device_photo(
        file=file, user_id=current_user.id, submission_id=submission_id
    )

    return success_response(data=result, message="Device photo uploaded successfully")


@router.post(
    "/upload/enterprise-document", response_model=dict, status_code=status.HTTP_201_CREATED
)
async def upload_enterprise_document(
    file: UploadFile = File(..., description="Enterprise document"),
    enterprise_id: str = Form(..., description="Enterprise ID"),
    document_type: str = Form(..., description="Document type (gst, pan, incorporation, etc.)"),
    current_user: User = Depends(require_permission(Permission.MANAGE_ENTERPRISE_SETTINGS)),
):
    """
    Upload enterprise document (GST, PAN, Incorporation Certificate, etc.).

    **Allowed formats**: PDF, DOC, DOCX, XLS, XLSX
    **Max size**: 50 MB
    **Bucket**: documents
    **Permissions**: manage_enterprise_settings
    """
    file_service = FileService()
    result = await file_service.upload_enterprise_document(
        file=file, user_id=current_user.id, enterprise_id=enterprise_id, document_type=document_type
    )

    return success_response(data=result, message="Enterprise document uploaded successfully")


@router.post("/upload/pickup-evidence", response_model=dict, status_code=status.HTTP_201_CREATED)
async def upload_pickup_evidence(
    file: UploadFile = File(..., description="Pickup evidence photo"),
    pickup_id: str = Form(..., description="Pickup request ID"),
    current_user: User = Depends(require_permission(Permission.UPLOAD_PICKUP_PROOF)),
):
    """
    Upload pickup evidence photo (on-site QC).

    **Allowed formats**: JPG, JPEG, PNG, GIF, WEBP
    **Max size**: 10 MB
    **Bucket**: on-site-qc
    **Permissions**: upload_pickup_proof
    """
    file_service = FileService()
    result = await file_service.upload_pickup_evidence(
        file=file, user_id=current_user.id, pickup_id=pickup_id
    )

    return success_response(data=result, message="Pickup evidence uploaded successfully")


@router.post("/upload/epr-certificate", response_model=dict, status_code=status.HTTP_201_CREATED)
async def upload_epr_certificate(
    file: UploadFile = File(..., description="EPR certificate"),
    enterprise_id: str = Form(..., description="Enterprise ID"),
    current_user: User = Depends(require_permission(Permission.VIEW_EPR_CERTIFICATES)),
):
    """
    Upload EPR compliance certificate.

    **Allowed formats**: PDF
    **Max size**: 50 MB
    **Bucket**: epr-certificates
    **Permissions**: view_epr_certificates
    """
    from app.core.storage import MAX_DOCUMENT_SIZE

    file_service = FileService()
    prefix = f"enterprises/{enterprise_id}"

    result = await file_service.upload_file(
        file=file,
        bucket=StorageBucket.EPR_CERTIFICATES,
        user_id=current_user.id,
        prefix=prefix,
        allowed_extensions=[".pdf"],
        max_size=MAX_DOCUMENT_SIZE,
        entity_type="epr_certificate",
        entity_id=enterprise_id,
    )

    return success_response(data=result, message="EPR certificate uploaded successfully")


@router.post("/presigned-url", response_model=dict, status_code=status.HTTP_200_OK)
async def get_presigned_url(
    request: PresignedUrlRequest, current_user: User = Depends(get_current_user)
):
    """
    Generate a presigned URL for temporary file access.

    **Permissions**: All authenticated users (with appropriate access to the file)
    """
    storage = get_storage()

    url = await storage.get_presigned_url(
        bucket=request.bucket, key=request.file_key, expiration=request.expiration
    )

    expires_at = datetime.utcnow() + timedelta(seconds=request.expiration)

    response_data = PresignedUrlResponse(url=url, expires_at=expires_at)

    return success_response(data=response_data, message="Presigned URL generated successfully")
