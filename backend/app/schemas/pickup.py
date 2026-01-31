"""Pydantic schemas for Pickup API"""

from datetime import datetime, date
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

from app.models.logistics import PickupStatus, PickupTimeSlot


# ============================================================================
# Pickup Request Schemas
# ============================================================================

class PickupRequestCreate(BaseModel):
    """Schema for creating a pickup request"""
    enterprise_id: Optional[str] = Field(None, description="Enterprise ID (auto-filled for scoped users)")
    location_id: str = Field(..., description="Pickup location ID")
    batch_id: str = Field(..., description="Batch ID (required — pickup must go through a batch)")
    asset_ids: List[str] = Field(..., description="List of asset IDs to pick up")
    preferred_date: Optional[date] = Field(None, description="Preferred pickup date")
    preferred_time_slot: str = Field(..., description="Preferred time slot")
    special_instructions: Optional[str] = Field(None, description="Special pickup instructions")


class PickupRequestUpdate(BaseModel):
    """Schema for updating a pickup request"""
    location_id: Optional[str] = None
    preferred_date: Optional[date] = None
    preferred_time_slot: Optional[str] = None
    special_instructions: Optional[str] = None
    logistics_notes: Optional[str] = None
    scheduled_date: Optional[datetime] = None


class PickupAssignToLogisticsAdmin(BaseModel):
    """Schema for assigning pickup to logistics admin"""
    logistics_admin_id: str = Field(..., description="Logistics admin user ID")


class PickupAssignToLogisticsUser(BaseModel):
    """Schema for assigning pickup to logistics user"""
    logistics_user_id: str = Field(..., description="Logistics user ID")
    scheduled_date: Optional[datetime] = Field(None, description="Scheduled pickup date/time")


class PickupComplete(BaseModel):
    """Schema for completing a pickup"""
    proof_of_pickup: Optional[Dict[str, Any]] = Field(None, description="Proof of pickup data")
    logistics_notes: Optional[str] = Field(None, description="Notes from logistics")


class PickupCancel(BaseModel):
    """Schema for cancelling a pickup"""
    reason: str = Field(..., description="Cancellation reason")


class PickupRequestResponse(BaseModel):
    """Schema for pickup request response"""
    id: str
    enterprise_id: str
    location_id: str
    batch_id: Optional[str] = None
    logistics_admin_id: Optional[str] = None
    logistics_user_id: Optional[str] = None
    asset_ids: List[str]
    assets: List[Dict[str, Any]]
    preferred_date: Optional[date] = None
    preferred_time_slot: str
    scheduled_date: Optional[datetime] = None
    assigned_at: Optional[datetime] = None
    assigned_by_id: Optional[str] = None
    status: str
    special_instructions: Optional[str] = None
    logistics_notes: Optional[str] = None
    completed_at: Optional[datetime] = None
    proof_of_pickup: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PickupListResponse(BaseModel):
    """Schema for list of pickups"""
    pickups: List[PickupRequestResponse]
    total: int
    page: int
    page_size: int


# ============================================================================
# Pickup Location Schemas
# ============================================================================


class PickupLocationCreate(BaseModel):
    """Schema for creating a pickup location"""
    enterprise_id: Optional[str] = Field(None, description="Enterprise ID (auto-filled for scoped users)")
    name: str = Field(..., min_length=1, max_length=255, description="Location name")
    address: str = Field(..., min_length=1, description="Full address")
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    pin_code: Optional[str] = Field(None, max_length=10)
    contact_person: Optional[str] = Field(None, max_length=255)
    contact_phone: Optional[str] = Field(None, max_length=20)
    operating_hours: Optional[str] = Field(None, max_length=255)
    special_instructions: Optional[str] = None
    is_default: bool = Field(False, description="Set as default location")


class PickupLocationUpdate(BaseModel):
    """Schema for updating a pickup location"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    address: Optional[str] = Field(None, min_length=1)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    pin_code: Optional[str] = Field(None, max_length=10)
    contact_person: Optional[str] = Field(None, max_length=255)
    contact_phone: Optional[str] = Field(None, max_length=20)
    operating_hours: Optional[str] = Field(None, max_length=255)
    special_instructions: Optional[str] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None


class PickupLocationResponse(BaseModel):
    """Schema for pickup location response"""
    id: str
    enterprise_id: str
    name: str
    address: str
    city: Optional[str] = None
    state: Optional[str] = None
    pin_code: Optional[str] = None
    country: str = "India"
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    operating_hours: Optional[str] = None
    special_instructions: Optional[str] = None
    is_default: bool = False
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PickupLocationListResponse(BaseModel):
    """Schema for list of pickup locations"""
    locations: List[PickupLocationResponse]
    total: int

