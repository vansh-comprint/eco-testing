"""Pydantic schemas for request/response validation"""

from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserBulkCreate,
)
from app.schemas.asset import (
    AssetCreate,
    AssetUpdate,
    AssetResponse,
    AssetBulkCreate,
)
from app.schemas.batch import (
    BatchCreate,
    BatchUpdate,
    BatchResponse,
    BatchSubmitForApproval,
    BatchApprovalAction,
)
from app.schemas.branch import (
    BranchCreate,
    BranchUpdate,
    BranchResponse,
)
from app.schemas.enterprise import (
    EnterpriseCreate,
    EnterpriseUpdate,
    EnterpriseResponse,
)
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RefreshTokenRequest,
    RefreshTokenResponse,
)

__all__ = [
    # User schemas
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "UserBulkCreate",
    # Asset schemas
    "AssetCreate",
    "AssetUpdate",
    "AssetResponse",
    "AssetBulkCreate",
    # Batch schemas
    "BatchCreate",
    "BatchUpdate",
    "BatchResponse",
    "BatchSubmitForApproval",
    "BatchApprovalAction",
    # Branch schemas
    "BranchCreate",
    "BranchUpdate",
    "BranchResponse",
    # Enterprise schemas
    "EnterpriseCreate",
    "EnterpriseUpdate",
    "EnterpriseResponse",
    # Auth schemas
    "LoginRequest",
    "LoginResponse",
    "RefreshTokenRequest",
    "RefreshTokenResponse",
]
