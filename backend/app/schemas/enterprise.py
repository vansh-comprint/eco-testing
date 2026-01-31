"""Enterprise schemas for unified enterprise model"""

import re
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, ConfigDict, EmailStr, field_validator

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
    company_size: Optional[str] = Field(None, max_length=50)
    employee_count: Optional[int] = Field(None, ge=0)

    # Contact information
    contact_person: Optional[str] = Field(None, max_length=100)
    contact_email: Optional[str] = Field(None, max_length=200)
    contact_phone: Optional[str] = Field(None, max_length=20)

    @field_validator("contact_email")
    @classmethod
    def validate_contact_email(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v.strip():
            if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v.strip()):
                raise ValueError("Invalid email format")
        return v

    @field_validator("contact_phone")
    @classmethod
    def validate_contact_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v.strip():
            digits = re.sub(r"[\s\-\(\)\+]", "", v.strip())
            if len(digits) < 7 or not digits.isdigit():
                raise ValueError("Phone number must have at least 7 digits")
        return v

    @field_validator("gst_number")
    @classmethod
    def validate_gst_number(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v.strip():
            # Indian GST format: 2 digit state code + 10 char PAN + 1 char + Z + 1 check digit
            if not re.match(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$", v.strip().upper()):
                raise ValueError("Invalid GST number format (expected: 22AAAAA0000A1Z5)")
        return v

    @field_validator("pan_number")
    @classmethod
    def validate_pan_number(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v.strip():
            if not re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$", v.strip().upper()):
                raise ValueError("Invalid PAN number format (expected: AAAAA0000A)")
        return v


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
    company_size: Optional[str] = Field(None, max_length=50)
    employee_count: Optional[int] = Field(None, ge=0)

    # Contact information
    contact_person: Optional[str] = Field(None, max_length=100)
    contact_email: Optional[str] = Field(None, max_length=200)
    contact_phone: Optional[str] = Field(None, max_length=20)

    # Status
    status: Optional[EnterpriseStatus] = None

    @field_validator("contact_email")
    @classmethod
    def validate_contact_email(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v.strip():
            if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v.strip()):
                raise ValueError("Invalid email format")
        return v

    @field_validator("contact_phone")
    @classmethod
    def validate_contact_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v.strip():
            digits = re.sub(r"[\s\-\(\)\+]", "", v.strip())
            if len(digits) < 7 or not digits.isdigit():
                raise ValueError("Phone number must have at least 7 digits")
        return v

    @field_validator("gst_number")
    @classmethod
    def validate_gst_number(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v.strip():
            if not re.match(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$", v.strip().upper()):
                raise ValueError("Invalid GST number format (expected: 22AAAAA0000A1Z5)")
        return v

    @field_validator("pan_number")
    @classmethod
    def validate_pan_number(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v.strip():
            if not re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$", v.strip().upper()):
                raise ValueError("Invalid PAN number format (expected: AAAAA0000A)")
        return v


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
    company_size: Optional[str] = None
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

    @field_validator("org_admin_phone")
    @classmethod
    def validate_org_admin_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v.strip():
            digits = re.sub(r"[\s\-\(\)\+]", "", v.strip())
            if len(digits) < 7 or not digits.isdigit():
                raise ValueError("Phone number must have at least 7 digits")
        return v

    @field_validator("gst_number")
    @classmethod
    def validate_gst_number(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v.strip():
            if not re.match(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$", v.strip().upper()):
                raise ValueError("Invalid GST number format (expected: 22AAAAA0000A1Z5)")
        return v

    @field_validator("pan_number")
    @classmethod
    def validate_pan_number(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v.strip():
            if not re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$", v.strip().upper()):
                raise ValueError("Invalid PAN number format (expected: AAAAA0000A)")
        return v


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
