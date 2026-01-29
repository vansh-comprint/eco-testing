"""File upload service"""

import uuid
from datetime import datetime
from typing import BinaryIO, Optional, List
from fastapi import UploadFile

from app.core.storage import generate_file_key, get_content_type, validate_file_extension
from app.storage.storage_factory import get_storage, StorageBucket
from app.schemas.file import FileUploadResponse, FileMetadata
from app.utils.exceptions import ValidationError


# =============================================================================
# FILE MAGIC BYTES FOR CONTENT-TYPE VALIDATION
# =============================================================================

# Magic bytes signatures for common file types
FILE_SIGNATURES = {
    # Images
    b'\x89PNG\r\n\x1a\n': 'image/png',
    b'\xff\xd8\xff': 'image/jpeg',
    b'GIF87a': 'image/gif',
    b'GIF89a': 'image/gif',
    b'RIFF': 'image/webp',  # WebP starts with RIFF...WEBP
    b'BM': 'image/bmp',

    # Documents
    b'%PDF': 'application/pdf',
    b'PK\x03\x04': 'application/zip',  # Also covers docx, xlsx, pptx

    # Video
    b'\x00\x00\x00\x1cftyp': 'video/mp4',
    b'\x00\x00\x00\x20ftyp': 'video/mp4',
}

# Extension to expected content types mapping
EXTENSION_CONTENT_TYPES = {
    '.png': ['image/png'],
    '.jpg': ['image/jpeg'],
    '.jpeg': ['image/jpeg'],
    '.gif': ['image/gif'],
    '.webp': ['image/webp'],
    '.bmp': ['image/bmp'],
    '.pdf': ['application/pdf'],
    '.doc': ['application/msword'],
    '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'],
    '.xls': ['application/vnd.ms-excel'],
    '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip'],
}


def detect_content_type_from_bytes(content: bytes) -> Optional[str]:
    """
    Detect content type from file magic bytes.

    Args:
        content: File content bytes

    Returns:
        Detected content type or None if unknown
    """
    for signature, content_type in FILE_SIGNATURES.items():
        if content.startswith(signature):
            # Special handling for WebP (RIFF....WEBP)
            if signature == b'RIFF' and len(content) >= 12:
                if content[8:12] == b'WEBP':
                    return 'image/webp'
                continue
            return content_type
    return None


def validate_content_type(content: bytes, filename: str, claimed_type: Optional[str] = None) -> str:
    """
    Validate file content type matches extension and detect actual type.

    SECURITY: Prevents uploading malicious files with fake extensions.

    Args:
        content: File content bytes
        filename: Original filename
        claimed_type: Content-Type header from upload

    Returns:
        Validated content type

    Raises:
        ValidationError: If content type doesn't match extension
    """
    import os

    ext = os.path.splitext(filename)[1].lower()
    detected_type = detect_content_type_from_bytes(content)

    # If we can detect the type, verify it matches the extension
    if detected_type and ext in EXTENSION_CONTENT_TYPES:
        expected_types = EXTENSION_CONTENT_TYPES[ext]
        if detected_type not in expected_types:
            raise ValidationError(
                f"File content doesn't match extension. "
                f"File appears to be {detected_type} but has extension {ext}"
            )

    # If claimed type provided, verify it's reasonable
    if claimed_type and detected_type:
        # Allow some flexibility (e.g., image/jpeg vs image/jpg)
        if detected_type.split('/')[0] != claimed_type.split('/')[0]:
            raise ValidationError(
                f"File content doesn't match claimed type. "
                f"Content is {detected_type} but claimed {claimed_type}"
            )

    return detected_type or claimed_type or get_content_type(filename)


class FileService:
    """Service for file upload operations"""

    def __init__(self):
        self.storage = get_storage()

    async def upload_file(
        self,
        file: UploadFile,
        bucket: str,
        user_id: str,
        prefix: Optional[str] = None,
        allowed_extensions: Optional[List[str]] = None,
        max_size: Optional[int] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
    ) -> FileUploadResponse:
        """
        Upload a single file.

        Args:
            file: Uploaded file
            bucket: Storage bucket name
            user_id: ID of user uploading the file
            prefix: Optional prefix for file key
            allowed_extensions: List of allowed file extensions
            max_size: Maximum file size in bytes
            entity_type: Type of entity this file belongs to
            entity_id: ID of the entity

        Returns:
            FileUploadResponse with upload details

        Raises:
            ValidationError: If file validation fails
        """
        # Validate file extension
        if allowed_extensions and not validate_file_extension(file.filename, allowed_extensions):
            raise ValidationError(f"Invalid file type. Allowed: {', '.join(allowed_extensions)}")

        # Read file content
        content = await file.read()
        file_size = len(content)

        # Validate file size
        if max_size and file_size > max_size:
            raise ValidationError(
                f"File too large. Maximum size: {max_size / (1024 * 1024):.1f} MB"
            )

        # SECURITY: Validate content type matches extension (magic byte check)
        content_type = validate_content_type(
            content, file.filename, file.content_type
        )

        # Generate file key
        file_key = generate_file_key(file.filename, prefix=prefix)

        # Upload to storage
        from io import BytesIO

        file_obj = BytesIO(content)

        metadata = {
            "original_filename": file.filename,
            "uploaded_by": user_id,
            "uploaded_at": datetime.utcnow().isoformat(),
        }

        if entity_type:
            metadata["entity_type"] = entity_type
        if entity_id:
            metadata["entity_id"] = entity_id

        url = await self.storage.upload(
            file=file_obj, bucket=bucket, key=file_key, content_type=content_type, metadata=metadata
        )

        # Create response
        file_id = str(uuid.uuid4())

        return FileUploadResponse(
            file_id=file_id,
            filename=file.filename,
            file_key=file_key,
            bucket=bucket,
            url=url,
            content_type=content_type,
            size=file_size,
            uploaded_at=datetime.utcnow(),
            uploaded_by=user_id,
        )

    async def upload_device_photo(
        self, file: UploadFile, user_id: str, submission_id: str
    ) -> FileUploadResponse:
        """Upload device photo for submission"""
        from app.core.storage import IMAGE_EXTENSIONS, MAX_IMAGE_SIZE

        prefix = f"submissions/{datetime.utcnow().strftime('%Y/%m')}"

        return await self.upload_file(
            file=file,
            bucket=StorageBucket.SUBMISSIONS,
            user_id=user_id,
            prefix=prefix,
            allowed_extensions=IMAGE_EXTENSIONS,
            max_size=MAX_IMAGE_SIZE,
            entity_type="submission",
            entity_id=submission_id,
        )

    async def upload_enterprise_document(
        self, file: UploadFile, user_id: str, enterprise_id: str, document_type: str
    ) -> FileUploadResponse:
        """Upload enterprise document (GST, PAN, etc.)"""
        from app.core.storage import DOCUMENT_EXTENSIONS, MAX_DOCUMENT_SIZE

        prefix = f"enterprises/{enterprise_id}/{document_type}"

        return await self.upload_file(
            file=file,
            bucket=StorageBucket.DOCUMENTS,
            user_id=user_id,
            prefix=prefix,
            allowed_extensions=DOCUMENT_EXTENSIONS,
            max_size=MAX_DOCUMENT_SIZE,
            entity_type="enterprise_document",
            entity_id=enterprise_id,
        )

    async def upload_pickup_evidence(
        self, file: UploadFile, user_id: str, pickup_id: str
    ) -> FileUploadResponse:
        """Upload pickup evidence photo"""
        from app.core.storage import IMAGE_EXTENSIONS, MAX_IMAGE_SIZE

        prefix = f"pickups/{datetime.utcnow().strftime('%Y/%m')}"

        return await self.upload_file(
            file=file,
            bucket=StorageBucket.ON_SITE_QC,
            user_id=user_id,
            prefix=prefix,
            allowed_extensions=IMAGE_EXTENSIONS,
            max_size=MAX_IMAGE_SIZE,
            entity_type="pickup",
            entity_id=pickup_id,
        )
