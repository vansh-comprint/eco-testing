"""Local filesystem storage backend"""

import os
import aiofiles
from pathlib import Path
from typing import Optional, BinaryIO, Dict
from datetime import datetime, timedelta

from app.core.storage import StorageBackend
from app.core.config import settings


class LocalStorageBackend(StorageBackend):
    """
    Local filesystem storage backend for development.
    
    Files are stored in a local directory structure:
    {base_path}/{bucket}/{key}
    """
    
    def __init__(self, base_path: Optional[str] = None):
        """
        Initialize local storage backend.
        
        Args:
            base_path: Base directory for file storage (defaults to ./storage)
        """
        self.base_path = Path(base_path or settings.local_storage_path or "./storage")
        self.base_path.mkdir(parents=True, exist_ok=True)
    
    def _get_file_path(self, bucket: str, key: str) -> Path:
        """Get full file path for bucket and key"""
        return self.base_path / bucket / key
    
    async def upload(
        self,
        file: BinaryIO,
        bucket: str,
        key: str,
        content_type: Optional[str] = None,
        metadata: Optional[Dict[str, str]] = None
    ) -> str:
        """
        Upload a file to local storage.
        
        Args:
            file: File object to upload
            bucket: Bucket/directory name
            key: File key/path
            content_type: MIME type (not used in local storage)
            metadata: Additional metadata (not used in local storage)
            
        Returns:
            Relative path to the uploaded file
        """
        file_path = self._get_file_path(bucket, key)
        
        # Create directory if it doesn't exist
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Write file
        async with aiofiles.open(file_path, 'wb') as f:
            content = file.read()
            await f.write(content)
        
        # Return relative path
        return f"/{bucket}/{key}"
    
    async def download(self, bucket: str, key: str) -> bytes:
        """
        Download a file from local storage.
        
        Args:
            bucket: Bucket/directory name
            key: File key/path
            
        Returns:
            File content as bytes
            
        Raises:
            FileNotFoundError: If file doesn't exist
        """
        file_path = self._get_file_path(bucket, key)
        
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {bucket}/{key}")
        
        async with aiofiles.open(file_path, 'rb') as f:
            return await f.read()
    
    async def delete(self, bucket: str, key: str) -> bool:
        """
        Delete a file from local storage.
        
        Args:
            bucket: Bucket/directory name
            key: File key/path
            
        Returns:
            True if deleted successfully
        """
        file_path = self._get_file_path(bucket, key)
        
        if file_path.exists():
            file_path.unlink()
            return True
        
        return False
    
    async def exists(self, bucket: str, key: str) -> bool:
        """
        Check if a file exists in local storage.
        
        Args:
            bucket: Bucket/directory name
            key: File key/path
            
        Returns:
            True if file exists
        """
        file_path = self._get_file_path(bucket, key)
        return file_path.exists()
    
    async def get_presigned_url(
        self,
        bucket: str,
        key: str,
        expiration: int = 3600
    ) -> str:
        """
        Generate a URL for local file access.
        
        For local storage, this returns a simple path.
        In production with a web server, this would be served via static files.
        
        Args:
            bucket: Bucket/directory name
            key: File key/path
            expiration: Not used in local storage
            
        Returns:
            URL path to the file
        """
        # In development, return path that can be served by FastAPI static files
        return f"/storage/{bucket}/{key}"
    
    async def list_files(self, bucket: str, prefix: Optional[str] = None) -> list[str]:
        """
        List files in a bucket with optional prefix.
        
        Args:
            bucket: Bucket/directory name
            prefix: Optional prefix to filter files
            
        Returns:
            List of file keys
        """
        bucket_path = self.base_path / bucket
        
        if not bucket_path.exists():
            return []
        
        files = []
        search_path = bucket_path / prefix if prefix else bucket_path
        
        if search_path.exists():
            for file_path in search_path.rglob('*'):
                if file_path.is_file():
                    # Get relative path from bucket
                    relative_path = file_path.relative_to(bucket_path)
                    files.append(str(relative_path))
        
        return files

