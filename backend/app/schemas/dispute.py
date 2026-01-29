"""Pydantic schemas for Dispute API"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

from app.models.support import DisputeStatus, DisputeType


# ============================================================================
# Dispute Schemas
# ============================================================================

class DisputeCreate(BaseModel):
    """Schema for creating a dispute"""
    asset_id: str = Field(..., description="Asset ID being disputed")
    dispute_type: str = Field(..., description="Type of dispute (grading, pricing, condition, etc.)")
    description: str = Field(..., description="Detailed description of the dispute")
    evidence_urls: Optional[List[str]] = Field(None, description="URLs to evidence files")


class DisputeUpdate(BaseModel):
    """Schema for updating a dispute"""
    status: Optional[str] = None
    assigned_to_user_id: Optional[str] = None
    resolution: Optional[str] = None


class DisputeResolve(BaseModel):
    """Schema for resolving a dispute"""
    resolution: str = Field(..., description="Resolution details")
    status: str = Field(default=DisputeStatus.RESOLVED.value, description="Final status")


class DisputeResponse(BaseModel):
    """Schema for dispute response"""
    id: str
    asset_id: str
    raised_by_user_id: Optional[str] = None
    assigned_to_user_id: Optional[str] = None
    dispute_type: str
    status: str
    description: str
    evidence_urls: Optional[List[str]] = None
    resolution: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolved_by_user_id: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DisputeListResponse(BaseModel):
    """Schema for list of disputes"""
    disputes: List[DisputeResponse]
    total: int
    page: int
    page_size: int

