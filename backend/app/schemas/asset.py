"""Asset schemas for unified asset model"""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, ConfigDict, field_validator

from app.models.asset import AssetStatus, AssetGrade


class AssetCreate(BaseModel):
    """Schema for creating an asset"""

    serial_number: str = Field(..., min_length=1, max_length=100)
    brand: str = Field(..., min_length=1, max_length=100)
    model: str = Field(..., min_length=1, max_length=100)
    asset_tag: Optional[str] = Field(None, max_length=50)
    specs: Optional[Dict[str, Any]] = None
    purchase_date: Optional[date] = None

    # Context (auto-filled from current user if not provided)
    enterprise_id: Optional[str] = None
    branch_id: Optional[str] = None
    batch_id: Optional[str] = None
    assigned_to_user_id: Optional[str] = None


class AssetBulkItem(BaseModel):
    """Individual asset item for bulk creation"""

    serial_number: str = Field(..., min_length=1, max_length=100)
    brand: str = Field(..., min_length=1, max_length=100)
    model: str = Field(..., min_length=1, max_length=100)
    asset_tag: Optional[str] = Field(None, max_length=50)
    specs: Optional[Dict[str, Any]] = None
    purchase_date: Optional[date] = None
    assigned_to_user_id: Optional[str] = None


class AssetBulkCreate(BaseModel):
    """Schema for bulk creating assets"""

    enterprise_id: Optional[str] = None
    branch_id: Optional[str] = None
    batch_id: Optional[str] = None
    assets: List[AssetBulkItem]


class AssetUpdate(BaseModel):
    """Schema for updating an asset"""

    brand: Optional[str] = Field(None, min_length=1, max_length=100)
    model: Optional[str] = Field(None, min_length=1, max_length=100)
    asset_tag: Optional[str] = Field(None, max_length=50)
    specs: Optional[Dict[str, Any]] = None
    purchase_date: Optional[date] = None
    batch_id: Optional[str] = None
    assigned_to_user_id: Optional[str] = None
    status: Optional[AssetStatus] = None
    grade: Optional[AssetGrade] = None
    base_price: Optional[Decimal] = None
    final_price: Optional[Decimal] = None

    @field_validator("base_price", "final_price")
    @classmethod
    def validate_prices_non_negative(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v < 0:
            return Decimal("0")
        return v


class AssetResponse(BaseModel):
    """Schema for asset response"""

    model_config = ConfigDict(from_attributes=True)

    id: str
    serial_number: str
    brand: str
    model: str
    asset_tag: Optional[str] = None
    specs: Optional[Dict[str, Any]] = None
    purchase_date: Optional[date] = None

    # Context
    enterprise_id: str
    enterprise_name: Optional[str] = None  # Populated from relationship
    branch_id: Optional[str] = None
    branch_name: Optional[str] = None  # Populated from relationship
    batch_id: Optional[str] = None
    assigned_to_user_id: Optional[str] = None
    assigned_at: Optional[datetime] = None

    # Status & Grading
    status: str
    grade: Optional[str] = None

    # Pricing
    base_price: Optional[Decimal] = None
    final_price: Optional[Decimal] = None

    # Timestamps
    created_at: datetime
    updated_at: Optional[datetime] = None


class AssetListResponse(BaseModel):
    """Schema for paginated asset list response"""

    assets: List[AssetResponse]
    total: int
