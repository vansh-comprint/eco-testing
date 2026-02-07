"""Pydantic schemas for Payout and Wallet API"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field



# ============================================================================
# Wallet Schemas
# ============================================================================

class WalletResponse(BaseModel):
    """Schema for wallet response"""
    id: str
    enterprise_id: str
    balance: Decimal
    credit_limit: Optional[Decimal] = None
    currency: str = "INR"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WalletCredit(BaseModel):
    """Schema for crediting wallet"""
    amount: Decimal = Field(..., gt=0, description="Amount to credit")
    description: Optional[str] = Field(None, description="Transaction description")
    reference_id: Optional[str] = Field(None, description="External reference ID")


class WalletDebit(BaseModel):
    """Schema for debiting wallet"""
    amount: Decimal = Field(..., gt=0, description="Amount to debit")
    description: Optional[str] = Field(None, description="Transaction description")
    reference_id: Optional[str] = Field(None, description="External reference ID")


class TransactionResponse(BaseModel):
    """Schema for transaction response"""
    id: str
    wallet_id: str
    payout_id: Optional[str] = None
    transaction_type: str
    amount: Decimal
    balance_before: Decimal
    balance_after: Decimal
    description: Optional[str] = None
    reference_id: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================================================
# Payout Schemas
# ============================================================================

class PayoutCreate(BaseModel):
    """Schema for creating a payout"""
    enterprise_id: Optional[str] = Field(None, description="Enterprise ID (auto-filled for scoped users)")
    batch_id: Optional[str] = Field(None, description="Batch ID for this payout")
    amount: Decimal = Field(..., gt=0, description="Payout amount")
    method: str = Field(..., description="Payout method (bank_transfer, upi, cheque)")
    bank_account_number: Optional[str] = Field(None, description="Bank account number")
    bank_ifsc_code: Optional[str] = Field(None, description="Bank IFSC code")
    upi_id: Optional[str] = Field(None, description="UPI ID")
    notes: Optional[str] = Field(None, description="Additional notes")


class PayoutUpdate(BaseModel):
    """Schema for updating a payout"""
    status: Optional[str] = None
    transaction_reference: Optional[str] = None
    notes: Optional[str] = None
    failure_reason: Optional[str] = None


class PayoutProcess(BaseModel):
    """Schema for processing a payout"""
    action: str = Field(
        ...,
        description="Action to perform: 'complete' or 'fail'",
        pattern="^(complete|fail)$"
    )
    transaction_reference: Optional[str] = Field(
        None,
        description="Payment transaction reference (required when action=complete)"
    )
    failure_reason: Optional[str] = Field(
        None,
        description="Reason for failure (required when action=fail)"
    )


class PayoutResponse(BaseModel):
    """Schema for payout response"""
    id: str
    enterprise_id: str
    batch_id: Optional[str] = None
    amount: Decimal
    status: str
    method: str
    bank_account_number: Optional[str] = None
    bank_ifsc_code: Optional[str] = None
    upi_id: Optional[str] = None
    initiated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    failed_at: Optional[datetime] = None
    failure_reason: Optional[str] = None
    transaction_reference: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PayoutListResponse(BaseModel):
    """Schema for list of payouts"""
    payouts: List[PayoutResponse]
    total: int
    page: int
    page_size: int

