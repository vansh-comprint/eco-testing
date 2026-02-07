"""Pydantic schemas for Review API (RemoteReview, FacilityQC, OnSiteQC)"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field



# ============================================================================
# Remote Review Schemas
# ============================================================================


class RemoteReviewCreate(BaseModel):
    """Schema for creating a remote review"""

    asset_id: str = Field(..., description="Asset ID being reviewed")
    submission_id: Optional[str] = Field(
        None, description="Submission ID (auto-resolved from asset if not provided)"
    )
    decision: str = Field(..., description="Review decision")
    grade: Optional[str] = Field(None, description="Grade (A, B, C, D)")
    estimated_value: Optional[Decimal] = Field(None, description="Estimated residual value")
    notes: Optional[str] = Field(None, description="Review notes")
    rejection_reason: Optional[str] = Field(None, description="Reason for rejection")
    checklist_results: Optional[Dict[str, Any]] = Field(None, description="Checklist results")


class RemoteReviewUpdate(BaseModel):
    """Schema for updating a remote review"""

    decision: Optional[str] = None
    grade: Optional[str] = None
    estimated_value: Optional[Decimal] = None
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    checklist_results: Optional[Dict[str, Any]] = None


class RemoteReviewResponse(BaseModel):
    """Schema for remote review response"""

    id: str
    asset_id: str
    submission_id: Optional[str] = None
    reviewer_id: Optional[str] = None
    decision: str
    grade: Optional[str] = None
    estimated_value: Optional[Decimal] = None
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    checklist_results: Optional[Dict[str, Any]] = None
    reviewed_at: datetime
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================================================
# Facility QC Schemas
# ============================================================================


class FacilityQCCreate(BaseModel):
    """Schema for creating a facility QC record"""

    asset_id: str = Field(..., description="Asset ID being QC'd")
    decision: str = Field(..., description="QC decision")
    grade: Optional[str] = Field(None, description="Final grade")
    final_value: Optional[Decimal] = Field(None, description="Final residual value")
    functional_tests: Optional[Dict[str, Any]] = Field(None, description="Functional test results")
    cosmetic_assessment: Optional[Dict[str, Any]] = Field(None, description="Cosmetic assessment")
    hardware_tests: Optional[Dict[str, Any]] = Field(None, description="Hardware test results")
    photos: Optional[Dict[str, Any]] = Field(None, description="QC photos")
    notes: Optional[str] = Field(None, description="QC notes")
    rejection_reason: Optional[str] = Field(None, description="Reason for rejection")


class FacilityQCUpdate(BaseModel):
    """Schema for updating a facility QC record"""

    decision: Optional[str] = None
    grade: Optional[str] = None
    final_value: Optional[Decimal] = None
    functional_tests: Optional[Dict[str, Any]] = None
    cosmetic_assessment: Optional[Dict[str, Any]] = None
    hardware_tests: Optional[Dict[str, Any]] = None
    photos: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None


class FacilityQCResponse(BaseModel):
    """Schema for facility QC response"""

    id: str
    asset_id: str
    reviewer_id: Optional[str] = None
    decision: str
    grade: Optional[str] = None
    final_value: Optional[Decimal] = None
    functional_tests: Optional[Dict[str, Any]] = None
    cosmetic_assessment: Optional[Dict[str, Any]] = None
    hardware_tests: Optional[Dict[str, Any]] = None
    photos: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    qc_completed_at: datetime
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================================================
# On-Site QC Schemas
# ============================================================================


class OnSiteQCCreate(BaseModel):
    """Schema for creating an on-site QC record"""

    asset_id: str = Field(..., description="Asset ID being QC'd")
    pickup_request_id: str = Field(..., description="Pickup request ID")
    status: str = Field(..., description="QC status")
    physical_condition_ok: bool = Field(..., description="Physical condition check")
    powers_on: bool = Field(..., description="Powers on check")
    screen_ok: bool = Field(..., description="Screen check")
    keyboard_ok: bool = Field(..., description="Keyboard check")
    ports_ok: bool = Field(..., description="Ports check")
    photo_urls: Optional[List[str]] = Field(None, description="Photo URLs")
    notes: Optional[str] = Field(None, description="QC notes")
    extra_data: Optional[Dict[str, Any]] = Field(None, description="Additional data")


class OnSiteQCUpdate(BaseModel):
    """Schema for updating an on-site QC record"""

    status: Optional[str] = None
    physical_condition_ok: Optional[bool] = None
    powers_on: Optional[bool] = None
    screen_ok: Optional[bool] = None
    keyboard_ok: Optional[bool] = None
    ports_ok: Optional[bool] = None
    photo_urls: Optional[List[str]] = None
    notes: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None


class OnSiteQCResponse(BaseModel):
    """Schema for on-site QC response"""

    id: str
    asset_id: str
    pickup_request_id: str
    performed_by_user_id: Optional[str] = None
    status: str
    physical_condition_ok: bool
    powers_on: bool
    screen_ok: bool
    keyboard_ok: bool
    ports_ok: bool
    photo_urls: Optional[List[str]] = None
    notes: Optional[str] = None
    performed_at: datetime
    extra_data: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
