"""File upload schemas"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class FileUploadResponse(BaseModel):
    """Schema for file upload response"""
    
    file_id: str = Field(..., description="Unique file identifier")
    filename: str = Field(..., description="Original filename")
    file_key: str = Field(..., description="Storage key/path")
    bucket: str = Field(..., description="Storage bucket name")
    url: str = Field(..., description="File URL or path")
    content_type: str = Field(..., description="MIME type")
    size: int = Field(..., description="File size in bytes")
    uploaded_at: datetime = Field(..., description="Upload timestamp")
    uploaded_by: str = Field(..., description="User ID who uploaded the file")


class FileMetadata(BaseModel):
    """Schema for file metadata"""
    
    file_id: str
    filename: str
    file_key: str
    bucket: str
    content_type: str
    size: int
    uploaded_at: datetime
    uploaded_by: str
    entity_type: Optional[str] = None  # e.g., 'submission', 'enterprise', 'pickup'
    entity_id: Optional[str] = None  # ID of the related entity
    metadata: Optional[dict] = None  # Additional metadata


class PresignedUrlRequest(BaseModel):
    """Schema for presigned URL request"""
    
    file_key: str = Field(..., description="File key/path")
    bucket: str = Field(..., description="Storage bucket name")
    expiration: int = Field(
        default=3600,
        ge=60,
        le=86400,
        description="URL expiration in seconds (1 min to 24 hours)"
    )


class PresignedUrlResponse(BaseModel):
    """Schema for presigned URL response"""
    
    url: str = Field(..., description="Presigned URL")
    expires_at: datetime = Field(..., description="URL expiration timestamp")


class BulkUploadResponse(BaseModel):
    """Schema for bulk file upload response"""
    
    total: int = Field(..., description="Total files uploaded")
    successful: int = Field(..., description="Successfully uploaded files")
    failed: int = Field(..., description="Failed uploads")
    files: list[FileUploadResponse] = Field(default_factory=list, description="Uploaded file details")
    errors: list[dict] = Field(default_factory=list, description="Upload errors")

