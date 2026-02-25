"""EPR Certificate schemas for request/response validation"""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

from app.models.epr import EPRCertificateStatus


class EPRCertificateCreate(BaseModel):
    """Schema for creating an EPR certificate"""

    enterprise_id: Optional[str] = None  # Auto-filled from user context
    batch_id: Optional[str] = None
    total_weight_kg: Optional[Decimal] = Field(None, gt=0, description="Total weight in kg — auto-calculated from asset_ids if not provided")
    recycled_weight_kg: Optional[Decimal] = Field(None, ge=0)
    disposed_weight_kg: Optional[Decimal] = Field(None, ge=0)
    recycler_name: Optional[str] = None
    recycler_license_number: Optional[str] = None
    recycler_partner_id: Optional[str] = None
    asset_ids: Optional[List[str]] = None
    notes: Optional[str] = None


class EPRCertificateUpdate(BaseModel):
    """Schema for updating an EPR certificate"""

    status: Optional[EPRCertificateStatus] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    total_weight_kg: Optional[Decimal] = Field(None, gt=0)
    recycled_weight_kg: Optional[Decimal] = Field(None, ge=0)
    disposed_weight_kg: Optional[Decimal] = Field(None, ge=0)
    recycler_name: Optional[str] = None
    recycler_license_number: Optional[str] = None
    recycler_partner_id: Optional[str] = None
    certificate_url: Optional[str] = None
    notes: Optional[str] = None


class EPRCertificatePush(BaseModel):
    """Schema for pushing/sending EPR certificates to an enterprise"""

    certificate_ids: List[str] = Field(..., description="List of certificate IDs to push")
    destination_enterprise_id: str = Field(..., description="Target enterprise ID to send certificates to")


class EPRCertificateResponse(BaseModel):
    """Schema for EPR certificate response"""

    model_config = ConfigDict(from_attributes=True)

    id: str
    enterprise_id: str
    batch_id: Optional[str] = None
    certificate_number: str
    status: str

    # Dates
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None

    # Weights
    total_weight_kg: Decimal
    recycled_weight_kg: Optional[Decimal] = None
    disposed_weight_kg: Optional[Decimal] = None

    # Asset coverage
    asset_ids: Optional[List[str]] = None

    # Recycler info
    recycler_partner_id: Optional[str] = None
    recycler_name: Optional[str] = None
    recycler_license_number: Optional[str] = None

    # Document
    certificate_url: Optional[str] = None

    # Push/Distribution
    sent_to_enterprise_id: Optional[str] = None
    sent_at: Optional[datetime] = None
    sent_by: Optional[str] = None

    # Additional
    notes: Optional[str] = None
    extra_data: Optional[dict] = None

    # Audit
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None
