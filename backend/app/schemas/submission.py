"""Pydantic schemas for Submission API"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


# ============================================================================
# Nested Types
# ============================================================================

class PhotoSet(BaseModel):
    """Photo URLs for device images"""
    front: Optional[str] = None
    back: Optional[str] = None
    screen: Optional[str] = None
    keyboard: Optional[str] = None
    ports: Optional[str] = None
    damage: Optional[List[str]] = None


class FunctionalChecks(BaseModel):
    """Functional check results"""
    powers_on: Optional[bool] = None
    display_working: Optional[bool] = None
    keyboard_working: Optional[bool] = None
    trackpad_working: Optional[bool] = None
    ports_working: Optional[bool] = None
    camera_working: Optional[bool] = None
    speakers_working: Optional[bool] = None
    microphone_working: Optional[bool] = None
    wifi_working: Optional[bool] = None
    bluetooth_working: Optional[bool] = None
    battery_health: Optional[str] = None


class CosmeticChecklist(BaseModel):
    """Cosmetic condition checklist"""
    screen_scratches: Optional[str] = None
    body_scratches: Optional[str] = None
    dents: Optional[str] = None
    keyboard_wear: Optional[str] = None
    screen_condition: Optional[str] = None


class Accessories(BaseModel):
    """Accessory checklist"""
    charger: Optional[bool] = None
    original_box: Optional[bool] = None
    manual: Optional[bool] = None
    case: Optional[bool] = None
    other: Optional[List[str]] = None


class LocationData(BaseModel):
    """Location information"""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None


class Declaration(BaseModel):
    """Declaration and consent"""
    ownership_confirmed: bool = True
    data_wiped: bool = True
    consent_given: bool = True
    signature: Optional[str] = None


# ============================================================================
# Submission Schemas
# ============================================================================

class SubmissionCreate(BaseModel):
    """Schema for creating a new submission"""
    asset_id: str = Field(..., description="Asset ID for this submission")
    device_confirmed: bool = Field(True, description="Device identity confirmed")
    photos: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Photo URLs")
    functional_checks: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Functional check results")
    cosmetic_checklist: Optional[Dict[str, Any]] = Field(None, description="Cosmetic checklist")
    accessories: Optional[Dict[str, Any]] = Field(None, description="Accessories checklist")
    location: Optional[Dict[str, Any]] = Field(None, description="Location data")
    declaration: Dict[str, Any] = Field(..., description="Declaration and consent")


class SubmissionUpdate(BaseModel):
    """Schema for updating a submission"""
    device_confirmed: Optional[bool] = None
    photos: Optional[Dict[str, Any]] = None
    functional_checks: Optional[Dict[str, Any]] = None
    cosmetic_checklist: Optional[Dict[str, Any]] = None
    accessories: Optional[Dict[str, Any]] = None
    location: Optional[Dict[str, Any]] = None
    declaration: Optional[Dict[str, Any]] = None


class SubmissionResponse(BaseModel):
    """Schema for submission response"""
    id: str
    asset_id: str
    user_id: str
    device_confirmed: bool
    photos: Dict[str, Any]
    functional_checks: Dict[str, Any]
    cosmetic_checklist: Optional[Dict[str, Any]] = None
    accessories: Optional[Dict[str, Any]] = None
    location: Optional[Dict[str, Any]] = None
    declaration: Dict[str, Any]
    submitted_at: datetime
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SubmissionListResponse(BaseModel):
    """Schema for list of submissions"""
    submissions: List[SubmissionResponse]
    total: int
    page: int
    page_size: int

