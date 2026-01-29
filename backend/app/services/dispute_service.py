"""Service layer for Dispute business logic"""

import uuid
from datetime import datetime, timezone
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Dispute, DisputeStatus, User, UserRole
from app.repositories.dispute_repository import DisputeRepository
from app.schemas.dispute import DisputeCreate, DisputeUpdate, DisputeResolve
from app.utils.security import (
    strip_dangerous_content,
    validate_url,
    validate_text_length,
    validate_no_injection,
)


# Valid dispute types
VALID_DISPUTE_TYPES = {
    "grading_dispute",
    "condition_dispute",
    "pricing_dispute",
    "missing_item",
    "damage_dispute",
    "other",
}


class DisputeService:
    """Service for handling dispute business logic"""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = DisputeRepository(session)

    async def create_dispute(self, data: DisputeCreate, user: User) -> Dispute:
        """
        Create a dispute with input validation.

        SECURITY: Validates and sanitizes all inputs to prevent:
        - Command injection via description
        - SSRF via evidence_urls
        - Invalid dispute types
        """
        # SECURITY: Validate dispute type
        dispute_type = data.dispute_type.lower() if data.dispute_type else None
        if dispute_type not in VALID_DISPUTE_TYPES:
            raise ValueError(
                f"Invalid dispute type: {data.dispute_type}. "
                f"Valid types: {', '.join(sorted(VALID_DISPUTE_TYPES))}"
            )

        # SECURITY: Validate and sanitize description
        description = None
        if data.description:
            validate_text_length(data.description, 5000, "description")
            validate_no_injection(data.description, "description")
            description = strip_dangerous_content(data.description)

        # SECURITY: Validate evidence URLs
        evidence_urls = []
        if data.evidence_urls:
            for url in data.evidence_urls:
                validate_url(url)  # Raises if URL is dangerous
                validate_no_injection(url, "evidence_url")  # Check for injection payloads
                evidence_urls.append(url)

        dispute = Dispute(
            id=f"dispute-{uuid.uuid4()}",
            asset_id=data.asset_id,
            raised_by_user_id=user.id,
            dispute_type=dispute_type,
            description=description,
            evidence_urls=evidence_urls,
            status=DisputeStatus.OPEN.value,
        )

        await self.repo.create(dispute)
        await self.session.flush()
        return dispute

    async def get_dispute(self, dispute_id: str) -> Optional[Dispute]:
        """Get a dispute by ID"""
        return await self.repo.get_by_id(dispute_id)

    async def update_dispute(
        self, dispute_id: str, data: DisputeUpdate, user: User
    ) -> Optional[Dispute]:
        """Update a dispute"""
        dispute = await self.repo.get_by_id(dispute_id)
        if not dispute:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if value is not None:
                setattr(dispute, key, value)

        await self.session.flush()
        return dispute

    async def assign_dispute(
        self, dispute_id: str, assigned_to_user_id: str, user: User
    ) -> Dispute:
        """Assign a dispute to a user"""
        dispute = await self.repo.get_by_id(dispute_id)
        if not dispute:
            raise ValueError("Dispute not found")

        dispute.assigned_to_user_id = assigned_to_user_id
        dispute.status = DisputeStatus.UNDER_REVIEW.value
        await self.session.flush()
        return dispute

    async def resolve_dispute(
        self, dispute_id: str, data: DisputeResolve, user: User
    ) -> Dispute:
        """
        Resolve a dispute with input validation.

        SECURITY: Validates resolution text to prevent injection.
        """
        dispute = await self.repo.get_by_id(dispute_id)
        if not dispute:
            raise ValueError("Dispute not found")

        if dispute.status in [DisputeStatus.RESOLVED.value, DisputeStatus.REJECTED.value]:
            raise ValueError("Dispute is already resolved")

        # SECURITY: Sanitize resolution text
        resolution = None
        if data.resolution:
            validate_text_length(data.resolution, 5000, "resolution")
            resolution = strip_dangerous_content(data.resolution)

        dispute.resolution = resolution
        dispute.status = data.status
        dispute.resolved_at = datetime.now(timezone.utc)
        dispute.resolved_by_user_id = user.id

        await self.session.flush()
        return dispute

    async def list_disputes(
        self,
        user: User,
        status: Optional[str] = None,
        dispute_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[Dispute], int]:
        """List disputes with role-based filtering"""
        raised_by_user_id = None
        assigned_to_user_id = None

        # Employees see only their disputes
        if user.role == UserRole.EMPLOYEE.value:
            raised_by_user_id = user.id
        # Technicians see disputes assigned to them
        elif user.role == UserRole.TECHNICIAN.value:
            assigned_to_user_id = user.id
        # Admins see all

        return await self.repo.list_with_filters(
            raised_by_user_id=raised_by_user_id,
            assigned_to_user_id=assigned_to_user_id,
            status=status,
            dispute_type=dispute_type,
            skip=skip,
            limit=limit,
        )

    async def get_open_disputes(
        self, user: User, skip: int = 0, limit: int = 100
    ) -> Tuple[List[Dispute], int]:
        """Get all open disputes (for admins)"""
        if user.role not in [
            UserRole.SUPER_ADMIN.value,
            UserRole.OPS_ADMIN.value,
            UserRole.TECHNICIAN.value,
        ]:
            raise ValueError("Only admins can view all open disputes")

        return await self.repo.get_open_disputes(skip=skip, limit=limit)

