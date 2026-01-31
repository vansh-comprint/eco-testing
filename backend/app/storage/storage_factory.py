"""Storage backend factory"""

from enum import Enum
from typing import Optional

from app.core.storage import StorageBackend
from app.storage.local import LocalStorageBackend
from app.core.config import settings


class StorageType(str, Enum):
    """Supported storage backend types"""
    LOCAL = "local"
    S3 = "s3"
    GCS = "gcs"
    MINIO = "minio"  # S3-compatible


def get_storage_backend(
    storage_type: Optional[StorageType] = None
) -> StorageBackend:
    """
    Get storage backend instance based on configuration.
    
    Args:
        storage_type: Type of storage backend (defaults to settings.STORAGE_TYPE)
        
    Returns:
        StorageBackend instance
        
    Raises:
        ValueError: If storage type is not supported
        
    Example:
        storage = get_storage_backend()
        url = await storage.upload(file, 'submissions', 'photo.jpg')
    """
    backend_type = storage_type or settings.storage_type
    
    if backend_type == StorageType.LOCAL:
        return LocalStorageBackend(
            base_path=settings.local_storage_path
        )
    
    elif backend_type == StorageType.S3:
        from app.storage.s3 import S3StorageBackend
        return S3StorageBackend(
            access_key_id=settings.AWS_ACCESS_KEY_ID,
            secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region=settings.AWS_REGION
        )
    
    elif backend_type == StorageType.MINIO:
        # MinIO uses S3 backend with custom endpoint
        from app.storage.s3 import S3StorageBackend
        return S3StorageBackend(
            access_key_id=settings.MINIO_ACCESS_KEY,
            secret_access_key=settings.MINIO_SECRET_KEY,
            region=settings.MINIO_REGION or 'us-east-1',
            endpoint_url=settings.MINIO_ENDPOINT
        )
    
    elif backend_type == StorageType.GCS:
        from app.storage.gcs import GCSStorageBackend
        return GCSStorageBackend(
            project_id=settings.GCP_PROJECT_ID,
            credentials_path=settings.GOOGLE_APPLICATION_CREDENTIALS
        )
    
    else:
        raise ValueError(f"Unsupported storage type: {backend_type}")


# Singleton instance
_storage_instance: Optional[StorageBackend] = None


def get_storage() -> StorageBackend:
    """
    Get singleton storage backend instance.
    
    Returns:
        StorageBackend instance
    """
    global _storage_instance
    
    if _storage_instance is None:
        _storage_instance = get_storage_backend()
    
    return _storage_instance


# Storage bucket names (from Supabase buckets)
class StorageBucket(str, Enum):
    """Storage bucket names for different file types"""
    SUBMISSIONS = "submissions"  # Device photos from employee submissions
    DOCUMENTS = "documents"  # Enterprise documents (GST, PAN, etc.)
    ON_SITE_QC = "on-site-qc"  # Pickup evidence photos
    EPR_CERTIFICATES = "epr-certificates"  # EPR compliance certificates
    AVATARS = "avatars"  # User profile pictures
    BATCH_EXPORTS = "batch-exports"  # Exported batch data

