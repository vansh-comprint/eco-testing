"""AWS S3 storage backend"""

from typing import Optional, BinaryIO, Dict
from datetime import timedelta
import aioboto3
from botocore.exceptions import ClientError

from app.core.storage import StorageBackend
from app.core.config import settings


class S3StorageBackend(StorageBackend):
    """
    AWS S3 storage backend for production.
    
    Requires AWS credentials to be configured via environment variables:
    - AWS_ACCESS_KEY_ID
    - AWS_SECRET_ACCESS_KEY
    - AWS_REGION
    - AWS_S3_BUCKET (optional, can be overridden per upload)
    """
    
    def __init__(
        self,
        access_key_id: Optional[str] = None,
        secret_access_key: Optional[str] = None,
        region: Optional[str] = None,
        endpoint_url: Optional[str] = None  # For MinIO compatibility
    ):
        """
        Initialize S3 storage backend.
        
        Args:
            access_key_id: AWS access key ID
            secret_access_key: AWS secret access key
            region: AWS region
            endpoint_url: Custom endpoint URL (for MinIO)
        """
        self.access_key_id = access_key_id or settings.AWS_ACCESS_KEY_ID
        self.secret_access_key = secret_access_key or settings.AWS_SECRET_ACCESS_KEY
        self.region = region or settings.AWS_REGION or 'us-east-1'
        self.endpoint_url = endpoint_url or settings.AWS_ENDPOINT_URL
        
        self.session = aioboto3.Session(
            aws_access_key_id=self.access_key_id,
            aws_secret_access_key=self.secret_access_key,
            region_name=self.region
        )
    
    async def upload(
        self,
        file: BinaryIO,
        bucket: str,
        key: str,
        content_type: Optional[str] = None,
        metadata: Optional[Dict[str, str]] = None
    ) -> str:
        """
        Upload a file to S3.
        
        Args:
            file: File object to upload
            bucket: S3 bucket name
            key: Object key/path
            content_type: MIME type of the file
            metadata: Additional metadata
            
        Returns:
            S3 URL to the uploaded file
        """
        extra_args = {}
        
        if content_type:
            extra_args['ContentType'] = content_type
        
        if metadata:
            extra_args['Metadata'] = metadata
        
        # Set ACL to private by default
        extra_args['ACL'] = 'private'
        
        async with self.session.client('s3', endpoint_url=self.endpoint_url) as s3:
            await s3.upload_fileobj(
                file,
                bucket,
                key,
                ExtraArgs=extra_args
            )
        
        # Return S3 URL
        if self.endpoint_url:
            # MinIO or custom endpoint
            return f"{self.endpoint_url}/{bucket}/{key}"
        else:
            # Standard S3 URL
            return f"https://{bucket}.s3.{self.region}.amazonaws.com/{key}"
    
    async def download(self, bucket: str, key: str) -> bytes:
        """
        Download a file from S3.
        
        Args:
            bucket: S3 bucket name
            key: Object key/path
            
        Returns:
            File content as bytes
            
        Raises:
            FileNotFoundError: If file doesn't exist
        """
        try:
            async with self.session.client('s3', endpoint_url=self.endpoint_url) as s3:
                response = await s3.get_object(Bucket=bucket, Key=key)
                async with response['Body'] as stream:
                    return await stream.read()
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                raise FileNotFoundError(f"File not found: {bucket}/{key}")
            raise
    
    async def delete(self, bucket: str, key: str) -> bool:
        """
        Delete a file from S3.
        
        Args:
            bucket: S3 bucket name
            key: Object key/path
            
        Returns:
            True if deleted successfully
        """
        try:
            async with self.session.client('s3', endpoint_url=self.endpoint_url) as s3:
                await s3.delete_object(Bucket=bucket, Key=key)
            return True
        except ClientError:
            return False
    
    async def exists(self, bucket: str, key: str) -> bool:
        """
        Check if a file exists in S3.
        
        Args:
            bucket: S3 bucket name
            key: Object key/path
            
        Returns:
            True if file exists
        """
        try:
            async with self.session.client('s3', endpoint_url=self.endpoint_url) as s3:
                await s3.head_object(Bucket=bucket, Key=key)
            return True
        except ClientError:
            return False
    
    async def get_presigned_url(
        self,
        bucket: str,
        key: str,
        expiration: int = 3600
    ) -> str:
        """
        Generate a presigned URL for temporary S3 access.
        
        Args:
            bucket: S3 bucket name
            key: Object key/path
            expiration: URL expiration time in seconds (default: 1 hour)
            
        Returns:
            Presigned URL
        """
        async with self.session.client('s3', endpoint_url=self.endpoint_url) as s3:
            url = await s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': bucket, 'Key': key},
                ExpiresIn=expiration
            )
        return url

