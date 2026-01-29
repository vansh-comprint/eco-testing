"""Enterprise schemas for unified enterprise model"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, ConfigDict, EmailStr

from app.models.enterprise import EnterpriseStatus, EnterpriseApplicationStatus


class EnterpriseCreate(BaseModel):
    """Schema for creating an enterprise"""

    name: str = Field(..., min_length=1, max_length=200)
    legal_name: Optional[str] = Field(None, max_length=200)
    gst_number: Optional[str] = Field(None, max_length=20)
    pan_number: Optional[str] = Field(None, max_length=20)

    # Address (stored as JSONB)
    address: Optional[Dict[str, Any]] = None

    # Business details
    industry: Optional[str] = Field(None, max_length=100)
    employee_count: Optional[int] = Field(None, ge=0)

    # Contact information
    contact_person: Optional[str] = Field(None, max_length=100)
    contact_email: Optional[str] = Field(None, max_length=200)
    contact_phone: Optional[str] = Field(None, max_length=20)


class EnterpriseUpdate(BaseModel):
    """Schema for updating an enterprise"""

    name: Optional[str] = Field(None, min_length=1, max_length=200)
    legal_name: Optional[str] = Field(None, max_length=200)
    gst_number: Optional[str] = Field(None, max_length=20)
    pan_number: Optional[str] = Field(None, max_length=20)

    # Address
    address: Optional[Dict[str, Any]] = None

    # Business details
    industry: Optional[str] = Field(None, max_length=100)
    employee_count: Optional[int] = Field(None, ge=0)

    # Contact information
    contact_person: Optional[str] = Field(None, max_length=100)
    contact_email: Optional[str] = Field(None, max_length=200)
    contact_phone: Optional[str] = Field(None, max_length=20)

    # Status
    status: Optional[EnterpriseStatus] = None


class EnterpriseResponse(BaseModel):
    """Schema for enterprise response"""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    legal_name: Optional[str] = None
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None

    # Address
    address: Optional[Dict[str, Any]] = None

    # Business details
    industry: Optional[str] = None
    employee_count: Optional[int] = None

    # Contact information
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None

    # Status
    status: str

    # Timestamps
    created_at: datetime
    updated_at: Optional[datetime] = None


class EnterpriseListResponse(BaseModel):
    """Schema for paginated enterprise list response"""

    enterprises: List[EnterpriseResponse]
    total: int


# ============================================================================
# ENTERPRISE APPLICATION SCHEMAS
# ============================================================================


class EnterpriseApplicationCreate(BaseModel):
    """Schema for creating an enterprise application (registration)"""

    # Company Information
    company_name: str = Field(..., min_length=1, max_length=255)
    legal_name: Optional[str] = Field(None, max_length=255)
    gst_number: Optional[str] = Field(None, max_length=15)
    pan_number: Optional[str] = Field(None, max_length=10)
    registered_address: Optional[str] = None
    industry_type: Optional[str] = Field(None, max_length=100)
    company_size: Optional[str] = Field(None, max_length=50)

    # Org Admin Details
    org_admin_name: str = Field(..., min_length=1, max_length=255)
    org_admin_email: EmailStr
    org_admin_phone: Optional[str] = Field(None, max_length=20)
    org_admin_designation: Optional[str] = Field(None, max_length=100)
    password: Optional[str] = Field(None, min_length=8)  # Will be hashed

    # Document paths (uploaded separately via files API)
    doc_gst_certificate: Optional[str] = None
    doc_pan_card: Optional[str] = None
    doc_incorporation_cert: Optional[str] = None
    doc_signatory_id: Optional[str] = None
    doc_address_proof: Optional[str] = None
    doc_company_logo: Optional[str] = None


class EnterpriseApplicationUpdate(BaseModel):
    """Schema for updating an enterprise application"""

    company_name: Optional[str] = Field(None, max_length=255)
    legal_name: Optional[str] = Field(None, max_length=255)
    gst_number: Optional[str] = Field(None, max_length=15)
    pan_number: Optional[str] = Field(None, max_length=10)
    registered_address: Optional[str] = None
    industry_type: Optional[str] = Field(None, max_length=100)
    company_size: Optional[str] = Field(None, max_length=50)

    org_admin_name: Optional[str] = Field(None, max_length=255)
    org_admin_phone: Optional[str] = Field(None, max_length=20)
    org_admin_designation: Optional[str] = Field(None, max_length=100)


class EnterpriseApplicationReview(BaseModel):
    """Schema for reviewing an enterprise application"""

    review_notes: Optional[str] = None


class EnterpriseApplicationReject(BaseModel):
    """Schema for rejecting an enterprise application"""

    reason: str = Field(..., min_length=1, max_length=1000)
    review_notes: Optional[str] = None


class EnterpriseApplicationRequestInfo(BaseModel):
    """Schema for requesting more info on an enterprise application"""

    notes: str = Field(..., min_length=1, max_length=2000)


class EnterpriseApplicationResponse(BaseModel):
    """Schema for enterprise application response"""

    model_config = ConfigDict(from_attributes=True)

    id: str
    application_ref: Optional[str] = None
    company_name: str
    legal_name: Optional[str] = None
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    registered_address: Optional[str] = None
    industry_type: Optional[str] = None
    company_size: Optional[str] = None

    org_admin_name: str
    org_admin_email: str
    org_admin_phone: Optional[str] = None
    org_admin_designation: Optional[str] = None

    # Documents
    doc_gst_certificate: Optional[str] = None
    doc_pan_card: Optional[str] = None
    doc_incorporation_cert: Optional[str] = None
    doc_signatory_id: Optional[str] = None
    doc_address_proof: Optional[str] = None
    doc_company_logo: Optional[str] = None

    # Review status
    status: str
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    review_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    enterprise_id: Optional[str] = None

    # Timestamps
    created_at: datetime
    updated_at: Optional[datetime] = None
