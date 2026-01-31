"""Batch schemas for unified batch model"""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

from app.models.batch import BatchStatus, PickupTimeSlot, PickupPriority


class BatchCreate(BaseModel):
    """Schema for creating a batch"""

    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    
    # Context (auto-filled from current user if not provided)
    enterprise_id: Optional[str] = None
    branch_id: Optional[str] = None


class BatchUpdate(BaseModel):
    """Schema for updating a batch"""

    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    status: Optional[BatchStatus] = None
    
    # Pickup details (IT Admin fills when submitting for approval)
    pickup_location_override: Optional[str] = None
    preferred_pickup_date: Optional[date] = None
    preferred_pickup_slot: Optional[PickupTimeSlot] = None
    pickup_priority: Optional[PickupPriority] = None
    it_admin_notes: Optional[str] = None
    logistics_instructions: Optional[str] = None


class BatchSubmitForApproval(BaseModel):
    """Schema for submitting batch for Org Admin approval"""

    pickup_location_override: Optional[str] = None
    preferred_pickup_date: date
    preferred_pickup_slot: PickupTimeSlot
    pickup_priority: PickupPriority = PickupPriority.NORMAL
    it_admin_notes: Optional[str] = None
    logistics_instructions: Optional[str] = None


class BatchApprovalAction(BaseModel):
    """Schema for Org Admin approval/rejection"""

    action: str = Field(..., pattern="^(approve|reject)$")
    org_admin_notes: Optional[str] = None
    rejection_reason: Optional[str] = None


class BatchProgressStats(BaseModel):
    """Progress breakdown of assets in a batch"""

    total: int = 0
    pending_assignment: int = 0
    assigned: int = 0          # assigned + check_in_started
    in_review: int = 0         # submitted + remote_review
    verified: int = 0          # conditionally_accepted + ready_for_pickup
    in_pickup: int = 0         # pickup_requested + pickup_scheduled
    picked_up: int = 0         # picked_up + in_transit + facility_qc
    completed: int = 0         # final_accepted + payout_pending + completed
    rejected: int = 0          # remote_rejected + final_rejected


class BatchResponse(BaseModel):
    """Schema for batch response"""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: Optional[str] = None
    status: str
    
    # Context
    enterprise_id: str
    branch_id: Optional[str] = None
    created_by: Optional[str] = None
    
    # Metrics
    asset_count: int = 0
    accepted_count: int = 0
    rejected_count: int = 0
    pending_count: int = 0
    estimated_value: Decimal = Decimal("0")
    total_payout: Decimal = Decimal("0")
    
    # Pickup details
    pickup_location_override: Optional[str] = None
    preferred_pickup_date: Optional[date] = None
    preferred_pickup_slot: Optional[str] = None
    pickup_priority: str = "normal"
    it_admin_notes: Optional[str] = None
    logistics_instructions: Optional[str] = None
    
    # Approval workflow
    requires_approval: bool = False
    submitted_for_approval_at: Optional[datetime] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    org_admin_notes: Optional[str] = None
    rejected_by: Optional[str] = None
    rejected_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    
    # Timestamps
    created_at: datetime
    updated_at: Optional[datetime] = None

    # Progress (computed, not from DB)
    progress: Optional[BatchProgressStats] = None


class BatchListResponse(BaseModel):
    """Schema for paginated batch list response"""

    batches: List[BatchResponse]
    total: int

