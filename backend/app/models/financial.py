"""Financial models for wallets, payouts, and transactions"""

from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric, Text, JSON
from sqlalchemy.orm import relationship
import enum

from app.models.base import BaseModel


class PayoutStatus(str, enum.Enum):
    """Payout status enumeration"""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class PayoutMethod(str, enum.Enum):
    """Payout method enumeration"""

    BANK_TRANSFER = "bank_transfer"
    UPI = "upi"
    CHEQUE = "cheque"
    WALLET_CREDIT = "wallet_credit"


class TransactionType(str, enum.Enum):
    """Credit transaction type enumeration"""

    CREDIT = "credit"
    DEBIT = "debit"
    REFUND = "refund"
    ADJUSTMENT = "adjustment"


class EnterpriseWallet(BaseModel):
    """
    Enterprise wallet model for credit management.

    Tracks available credits and transaction history.
    """

    __tablename__ = "enterprise_wallets"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Foreign Keys
    enterprise_id = Column(
        String,
        ForeignKey("enterprises.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # Wallet Balance
    balance = Column(Numeric(12, 2), nullable=False, default=0, server_default="0")
    credit_limit = Column(Numeric(12, 2), nullable=True)

    # Metadata
    currency = Column(String, nullable=False, default="INR", server_default="INR")

    # Relationships
    enterprise = relationship("Enterprise", back_populates="wallet")
    transactions = relationship(
        "CreditTransaction", back_populates="wallet", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<EnterpriseWallet(id={self.id}, enterprise_id={self.enterprise_id}, balance={self.balance})>"


class CreditTransaction(BaseModel):
    """
    Credit transaction model for wallet operations.

    Records all credit/debit operations on enterprise wallets.
    """

    __tablename__ = "credit_transactions"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Foreign Keys
    wallet_id = Column(
        String, ForeignKey("enterprise_wallets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    payout_id = Column(
        String, ForeignKey("payouts.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Transaction Details
    transaction_type = Column(
        String, nullable=False, index=True
    )  # Stored as string, validated by Python enum
    amount = Column(Numeric(12, 2), nullable=False)
    balance_before = Column(Numeric(12, 2), nullable=False)
    balance_after = Column(Numeric(12, 2), nullable=False)

    # Additional Data
    description = Column(Text, nullable=True)
    reference_id = Column(String, nullable=True, index=True)
    extra_data = Column(JSON, nullable=True)  # Renamed from metadata (reserved in SQLAlchemy)

    # Relationships
    wallet = relationship("EnterpriseWallet", back_populates="transactions")
    payout = relationship("Payout", back_populates="transactions")

    def __repr__(self) -> str:
        return (
            f"<CreditTransaction(id={self.id}, type={self.transaction_type}, amount={self.amount})>"
        )


class Payout(BaseModel):
    """
    Payout model for enterprise payments.

    Tracks payment processing for completed batches.
    """

    __tablename__ = "payouts"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Foreign Keys
    enterprise_id = Column(
        String, ForeignKey("enterprises.id", ondelete="CASCADE"), nullable=False, index=True
    )
    batch_id = Column(
        String, ForeignKey("batches.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Payout Details
    amount = Column(Numeric(12, 2), nullable=False)
    status = Column(
        String,
        nullable=False,
        default=PayoutStatus.PENDING.value,
        server_default=PayoutStatus.PENDING.value,
        index=True,
    )  # Stored as string, validated by Python enum
    method = Column(String, nullable=False)  # Stored as string, validated by Python enum

    # Payment Details
    bank_account_number = Column(String, nullable=True)
    bank_ifsc_code = Column(String, nullable=True)
    upi_id = Column(String, nullable=True)

    # Processing
    initiated_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    failed_at = Column(DateTime(timezone=True), nullable=True)
    failure_reason = Column(Text, nullable=True)

    # Reference
    transaction_reference = Column(String, nullable=True, unique=True, index=True)
    notes = Column(Text, nullable=True)
    extra_data = Column(JSON, nullable=True)  # Renamed from metadata (reserved in SQLAlchemy)

    # Relationships
    enterprise = relationship("Enterprise", back_populates="payouts")
    batch = relationship("Batch", back_populates="payout")
    transactions = relationship(
        "CreditTransaction", back_populates="payout", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Payout(id={self.id}, enterprise_id={self.enterprise_id}, amount={self.amount}, status={self.status})>"
