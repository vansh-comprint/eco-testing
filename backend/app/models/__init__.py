"""SQLAlchemy ORM models - Unified user architecture"""

from app.models.base import BaseModel, AuditMixin
from app.models.user import User, UserRole, UserStatus
from app.models.enterprise import (
    Enterprise,
    Branch,
    PickupLocation,
    EnterpriseStatus,
    EnterpriseApplication,
    EnterpriseApplicationStatus,
)
from app.models.asset import Asset, AssetStatus, AssetGrade, TreatmentOutcome
from app.models.batch import Batch, BatchStatus
from app.models.submission import Submission
from app.models.review import RemoteReview, FacilityQC, ReviewDecision
from app.models.logistics import PickupRequest, PickupStatus, PickupTimeSlot
from app.models.financial import (
    EnterpriseWallet,
    CreditTransaction,
    Payout,
    PayoutStatus,
    PayoutMethod,
    TransactionType,
)
from app.models.support import (
    Notification,
    Dispute,
    OnSiteQC,
    AuditLog,
    NotificationType,
    DisputeStatus,
    DisputeType,
    QCStatus,
)
from app.models.epr import EPRCertificate, EPRCertificateStatus
from app.models.pricing import PricingRule, ConditionModifier, DeviceCategory

__all__ = [
    # Base
    "BaseModel",
    "AuditMixin",
    # Users (unified - includes all roles: admin, employee, logistics)
    "User",
    "UserRole",
    "UserStatus",
    # Enterprise
    "Enterprise",
    "Branch",
    "PickupLocation",
    "EnterpriseStatus",
    "EnterpriseApplication",
    "EnterpriseApplicationStatus",
    # Assets
    "Asset",
    "AssetStatus",
    "AssetGrade",
    "TreatmentOutcome",
    # Batches
    "Batch",
    "BatchStatus",
    # Submissions
    "Submission",
    # Reviews
    "RemoteReview",
    "FacilityQC",
    "ReviewDecision",
    # Logistics
    "PickupRequest",
    "PickupStatus",
    "PickupTimeSlot",
    # Financial
    "EnterpriseWallet",
    "CreditTransaction",
    "Payout",
    "PayoutStatus",
    "PayoutMethod",
    "TransactionType",
    # Support
    "Notification",
    "Dispute",
    "OnSiteQC",
    "AuditLog",
    "NotificationType",
    "DisputeStatus",
    "DisputeType",
    "QCStatus",
    # EPR
    "EPRCertificate",
    "EPRCertificateStatus",
    # Pricing
    "PricingRule",
    "ConditionModifier",
    "DeviceCategory",
]
