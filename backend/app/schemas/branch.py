"""Branch schemas for unified branch model"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

from app.models.enterprise import BranchStatus


class BranchCreate(BaseModel):
    """Schema for creating a branch"""

    branch_name: str = Field(..., min_length=1, max_length=200)
    branch_code: str = Field(..., min_length=1, max_length=50)
    
    # Address
    address_line1: str = Field(..., min_length=1, max_length=500)
    address_line2: Optional[str] = Field(None, max_length=500)
    city: str = Field(..., min_length=1, max_length=100)
    state: str = Field(..., min_length=1, max_length=100)
    pin_code: str = Field(..., min_length=1, max_length=10)
    
    # Pickup details
    pickup_point_description: Optional[str] = None
    site_contact_person: Optional[str] = None
    site_contact_phone: Optional[str] = None
    operating_hours: Optional[str] = None
    special_instructions: Optional[str] = None
    
    # Context (auto-filled from current user if not provided)
    enterprise_id: Optional[str] = None


class BranchUpdate(BaseModel):
    """Schema for updating a branch"""

    branch_name: Optional[str] = Field(None, min_length=1, max_length=200)
    branch_code: Optional[str] = Field(None, min_length=1, max_length=50)
    
    # Address
    address_line1: Optional[str] = Field(None, min_length=1, max_length=500)
    address_line2: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, min_length=1, max_length=100)
    state: Optional[str] = Field(None, min_length=1, max_length=100)
    pin_code: Optional[str] = Field(None, min_length=1, max_length=10)
    
    # Pickup details
    pickup_point_description: Optional[str] = None
    site_contact_person: Optional[str] = None
    site_contact_phone: Optional[str] = None
    operating_hours: Optional[str] = None
    special_instructions: Optional[str] = None
    
    # Status
    status: Optional[BranchStatus] = None


class BranchResponse(BaseModel):
    """Schema for branch response"""

    model_config = ConfigDict(from_attributes=True)

    id: str
    enterprise_id: str
    branch_name: str
    branch_code: str
    
    # Address
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    pin_code: str
    
    # Pickup details
    pickup_point_description: Optional[str] = None
    site_contact_person: Optional[str] = None
    site_contact_phone: Optional[str] = None
    operating_hours: Optional[str] = None
    special_instructions: Optional[str] = None
    
    # Status
    status: str

    # Computed counts (populated by service layer)
    asset_count: int = 0
    user_count: int = 0

    # Timestamps
    created_at: datetime
    updated_at: Optional[datetime] = None


class BranchListResponse(BaseModel):
    """Schema for paginated branch list response"""

    branches: List[BranchResponse]
    total: int

