"""Google Cloud Storage backend"""

from typing import Optional, BinaryIO, Dict
from datetime import timedelta
from google.cloud import storage
from google.cloud.exceptions import NotFound
import asyncio
from functools import partial

from app.core.storage import StorageBackend
from app.core.config import settings


class GCSStorageBackend(StorageBackend):
    """
    Google Cloud Storage backend.
    
    Requires GCP credentials to be configured via:
    - GOOGLE_APPLICATION_CREDENTIALS environment variable (path to service account JSON)
    - Or default application credentials
    """
    
    def __init__(
        self,
        project_id: Optional[str] = None,
        credentials_path: Optional[str] = None
    ):
        """
        Initialize GCS storage backend.
        
        Args:
            project_id: GCP project ID
            credentials_path: Path to service account JSON file
        """
        self.project_id = project_id or settings.GCP_PROJECT_ID
        
        if credentials_path or settings.GOOGLE_APPLICATION_CREDENTIALS:
            self.client = storage.Client.from_service_account_json(
                credentials_path or settings.GOOGLE_APPLICATION_CREDENTIALS,
                project=self.project_id
            )
        else:
            # Use default credentials
            self.client = storage.Client(project=self.project_id)
    
    async def _run_sync(self, func, *args, **kwargs):
        """Run synchronous GCS operations in thread pool"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, partial(func, *args, **kwargs))
    
    async def upload(
        self,
        file: BinaryIO,
        bucket: str,
        key: str,
        content_type: Optional[str] = None,
        metadata: Optional[Dict[str, str]] = None
    ) -> str:
        """
        Upload a file to GCS.
        
        Args:
            file: File object to upload
            bucket: GCS bucket name
            key: Object key/path
            content_type: MIME type of the file
            metadata: Additional metadata
            
        Returns:
            GCS URL to the uploaded file
        """
        def _upload():
            bucket_obj = self.client.bucket(bucket)
            blob = bucket_obj.blob(key)
            
            if content_type:
                blob.content_type = content_type
            
            if metadata:
                blob.metadata = metadata
            
            blob.upload_from_file(file, rewind=True)
            return blob.public_url
        
        return await self._run_sync(_upload)
    
    async def download(self, bucket: str, key: str) -> bytes:
        """
        Download a file from GCS.
        
        Args:
            bucket: GCS bucket name
            key: Object key/path
            
        Returns:
            File content as bytes
            
        Raises:
            FileNotFoundError: If file doesn't exist
        """
        def _download():
            try:
                bucket_obj = self.client.bucket(bucket)
                blob = bucket_obj.blob(key)
                return blob.download_as_bytes()
            except NotFound:
                raise FileNotFoundError(f"File not found: {bucket}/{key}")
        
        return await self._run_sync(_download)
    
    async def delete(self, bucket: str, key: str) -> bool:
        """
        Delete a file from GCS.
        
        Args:
            bucket: GCS bucket name
            key: Object key/path
            
        Returns:
            True if deleted successfully
        """
        def _delete():
            try:
                bucket_obj = self.client.bucket(bucket)
                blob = bucket_obj.blob(key)
                blob.delete()
                return True
            except NotFound:
                return False
        
        return await self._run_sync(_delete)
    
    async def exists(self, bucket: str, key: str) -> bool:
        """
        Check if a file exists in GCS.
        
        Args:
            bucket: GCS bucket name
            key: Object key/path
            
        Returns:
            True if file exists
        """
        def _exists():
            bucket_obj = self.client.bucket(bucket)
            blob = bucket_obj.blob(key)
            return blob.exists()
        
        return await self._run_sync(_exists)
    
    async def get_presigned_url(
        self,
        bucket: str,
        key: str,
        expiration: int = 3600
    ) -> str:
        """
        Generate a signed URL for temporary GCS access.
        
        Args:
            bucket: GCS bucket name
            key: Object key/path
            expiration: URL expiration time in seconds (default: 1 hour)
            
        Returns:
            Signed URL
        """
        def _generate_url():
            bucket_obj = self.client.bucket(bucket)
            blob = bucket_obj.blob(key)
            
            url = blob.generate_signed_url(
                version="v4",
                expiration=timedelta(seconds=expiration),
                method="GET"
            )
            return url
        
        return await self._run_sync(_generate_url)

