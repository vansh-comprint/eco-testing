"""Application configuration using Pydantic Settings"""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, PostgresDsn


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=False, extra="ignore"
    )

    # Database Configuration
    database_url: PostgresDsn = Field(
        default="postgresql+asyncpg://postgres:password@localhost:5432/ecotribe",
        description="PostgreSQL database URL",
    )
    database_pool_size: int = Field(default=20, description="Database connection pool size")
    database_max_overflow: int = Field(default=10, description="Max overflow connections")

    # JWT Configuration
    jwt_secret_key: str = Field(
        default="change-this-secret-key-in-production",
        description="Secret key for JWT token generation",
    )
    jwt_algorithm: str = Field(default="HS256", description="JWT algorithm")
    jwt_access_token_expire_minutes: int = Field(
        default=480, description="Access token expiration in minutes (8 hours)"
    )
    jwt_refresh_token_expire_days: int = Field(
        default=7, description="Refresh token expiration in days"
    )

    # Application Configuration
    app_name: str = Field(default="EcoTribe API", description="Application name")
    app_version: str = Field(default="1.0.0", description="Application version")
    debug: bool = Field(default=False, description="Debug mode")
    environment: str = Field(
        default="production", description="Environment (development/production)"
    )

    # API Configuration
    api_v1_prefix: str = Field(default="/api/v1", description="API v1 prefix")

    # CORS Configuration
    cors_origins: str = Field(
        default="http://localhost:3000,http://localhost:5173",
        description="Comma-separated list of allowed origins",
    )
    cors_allow_credentials: bool = Field(default=True, description="Allow credentials in CORS")

    # Logging
    log_level: str = Field(default="INFO", description="Logging level")
    log_format: str = Field(default="json", description="Log format (json/text)")

    # Pagination
    default_page_size: int = Field(default=20, description="Default page size for pagination")
    max_page_size: int = Field(default=100, description="Maximum page size for pagination")

    # File Upload
    max_upload_size_mb: int = Field(default=10, description="Maximum upload size in MB")
    upload_dir: str = Field(default="./uploads", description="Upload directory path")

    # Storage Configuration
    storage_type: str = Field(
        default="local", description="Storage backend type (local, s3, gcs, minio)"
    )

    # Local Storage
    local_storage_path: str = Field(default="./storage", description="Local storage base path")

    # AWS S3 Configuration
    aws_access_key_id: str = Field(default="", description="AWS access key ID")
    aws_secret_access_key: str = Field(default="", description="AWS secret access key")
    aws_region: str = Field(default="us-east-1", description="AWS region")
    aws_s3_bucket: str = Field(default="", description="Default S3 bucket name")
    aws_endpoint_url: str = Field(default="", description="Custom S3 endpoint (for MinIO)")

    # MinIO Configuration
    minio_endpoint: str = Field(default="", description="MinIO endpoint URL")
    minio_access_key: str = Field(default="", description="MinIO access key")
    minio_secret_key: str = Field(default="", description="MinIO secret key")
    minio_region: str = Field(default="us-east-1", description="MinIO region")
    minio_secure: bool = Field(default=True, description="Use HTTPS for MinIO")

    # Google Cloud Storage Configuration
    gcp_project_id: str = Field(default="", description="GCP project ID")
    google_application_credentials: str = Field(
        default="", description="Path to GCP service account JSON"
    )

    # Frontend URL (for password reset links etc.)
    frontend_url: str = Field(
        default="http://localhost:5173",
        description="Frontend application URL for email links",
    )

    # Email Configuration (SMTP)
    smtp_host: str = Field(default="", description="SMTP server host")
    smtp_port: int = Field(default=587, description="SMTP server port")
    smtp_username: str = Field(default="", description="SMTP username")
    smtp_password: str = Field(default="", description="SMTP password")
    smtp_from_email: str = Field(default="noreply@ecotribe.io", description="From email address")
    smtp_from_name: str = Field(default="EcoTribe", description="From display name")
    smtp_use_tls: bool = Field(default=True, description="Use TLS for SMTP")

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string"""
        return [origin.strip() for origin in self.cors_origins.split(",")]

    @property
    def max_upload_size_bytes(self) -> int:
        """Convert max upload size to bytes"""
        return self.max_upload_size_mb * 1024 * 1024


# Global settings instance
settings = Settings()
