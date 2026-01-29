"""
Storage abstraction layer for file uploads.

Supports multiple storage backends:
- Local filesystem (development)
- AWS S3 (production)
- Google Cloud Storage (alternative)
- MinIO (self-hosted S3-compatible)
"""

from abc import ABC, abstractmethod
from typing import Optional, BinaryIO, Dict
from datetime import datetime, timedelta
from pathlib import Path
import uuid
import mimetypes


class StorageBackend(ABC):
    """Abstract base class for storage backends"""
    
    @abstractmethod
    async def upload(
        self,
        file: BinaryIO,
        bucket: str,
        key: str,
        content_type: Optional[str] = None,
        metadata: Optional[Dict[str, str]] = None
    ) -> str:
        """
        Upload a file to storage.
        
        Args:
            file: File object to upload
            bucket: Bucket/container name
            key: File key/path
            content_type: MIME type of the file
            metadata: Additional metadata
            
        Returns:
            URL or path to the uploaded file
        """
        pass
    
    @abstractmethod
    async def download(self, bucket: str, key: str) -> bytes:
        """
        Download a file from storage.
        
        Args:
            bucket: Bucket/container name
            key: File key/path
            
        Returns:
            File content as bytes
        """
        pass
    
    @abstractmethod
    async def delete(self, bucket: str, key: str) -> bool:
        """
        Delete a file from storage.
        
        Args:
            bucket: Bucket/container name
            key: File key/path
            
        Returns:
            True if deleted successfully
        """
        pass
    
    @abstractmethod
    async def exists(self, bucket: str, key: str) -> bool:
        """
        Check if a file exists in storage.
        
        Args:
            bucket: Bucket/container name
            key: File key/path
            
        Returns:
            True if file exists
        """
        pass
    
    @abstractmethod
    async def get_presigned_url(
        self,
        bucket: str,
        key: str,
        expiration: int = 3600
    ) -> str:
        """
        Generate a presigned URL for temporary access.
        
        Args:
            bucket: Bucket/container name
            key: File key/path
            expiration: URL expiration time in seconds
            
        Returns:
            Presigned URL
        """
        pass


def generate_file_key(
    original_filename: str,
    prefix: Optional[str] = None,
    preserve_name: bool = False
) -> str:
    """
    Generate a unique file key for storage.
    
    Args:
        original_filename: Original filename
        prefix: Optional prefix (e.g., 'submissions/2024/01/')
        preserve_name: If True, preserve original filename with UUID prefix
        
    Returns:
        Generated file key
        
    Example:
        generate_file_key('photo.jpg', 'submissions/2024/01/')
        # Returns: 'submissions/2024/01/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg'
    """
    # Get file extension
    ext = Path(original_filename).suffix.lower()
    
    if preserve_name:
        # Preserve filename with UUID prefix
        name = Path(original_filename).stem
        safe_name = "".join(c for c in name if c.isalnum() or c in ('-', '_'))
        file_key = f"{uuid.uuid4()}-{safe_name}{ext}"
    else:
        # Use UUID as filename
        file_key = f"{uuid.uuid4()}{ext}"
    
    # Add prefix if provided
    if prefix:
        prefix = prefix.rstrip('/')
        file_key = f"{prefix}/{file_key}"
    
    return file_key


def get_content_type(filename: str) -> str:
    """
    Get MIME type from filename.
    
    Args:
        filename: Filename to check
        
    Returns:
        MIME type string
    """
    content_type, _ = mimetypes.guess_type(filename)
    return content_type or 'application/octet-stream'


def validate_file_extension(filename: str, allowed_extensions: list[str]) -> bool:
    """
    Validate file extension against allowed list.
    
    Args:
        filename: Filename to validate
        allowed_extensions: List of allowed extensions (e.g., ['.jpg', '.png'])
        
    Returns:
        True if extension is allowed
    """
    ext = Path(filename).suffix.lower()
    return ext in [e.lower() for e in allowed_extensions]


# File type configurations
IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx']
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_DOCUMENT_SIZE = 50 * 1024 * 1024  # 50 MB

