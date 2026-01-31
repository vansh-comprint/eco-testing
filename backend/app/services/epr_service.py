"""EPR Certificate service for business logic"""

from datetime import datetime, timezone, date
from typing import Optional, List, Tuple
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.epr import EPRCertificate, EPRCertificateStatus
from app.repositories.epr_repository import EPRCertificateRepository
from app.schemas.epr import (
    EPRCertificateCreate,
    EPRCertificateUpdate,
    EPRCertificateResponse,
)
from app.utils.exceptions import NotFoundError, ValidationError


class EPRCertificateService:
    """Service for EPR Certificate business logic"""

    def __init__(self, db: AsyncSession):
        self.repository = EPRCertificateRepository(db)
        self.db = db

    @staticmethod
    def _generate_certificate_number(enterprise_id: str) -> str:
        """Generate a unique EPR certificate number"""
        now = datetime.now(timezone.utc)
        short_id = uuid4().hex[:6].upper()
        return f"EPR-{now.strftime('%Y%m')}-{short_id}"

    async def get_certificate(self, certificate_id: str) -> EPRCertificateResponse:
        """Get EPR certificate by ID"""
        certificate = await self.repository.get_by_id(certificate_id)
        if not certificate:
            raise NotFoundError("EPR Certificate", certificate_id)
        return EPRCertificateResponse.model_validate(certificate)

    async def list_certificates(
        self,
        skip: int = 0,
        limit: int = 100,
        enterprise_id: Optional[str] = None,
        status: Optional[EPRCertificateStatus] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[EPRCertificateResponse], int]:
        """List EPR certificates with filters and pagination"""
        certificates, total = await self.repository.get_all(
            skip=skip,
            limit=limit,
            enterprise_id=enterprise_id,
            status=status,
            search=search,
        )
        responses = [EPRCertificateResponse.model_validate(c) for c in certificates]
        return responses, total

    async def create_certificate(
        self, data: EPRCertificateCreate, created_by: str
    ) -> EPRCertificateResponse:
        """Create a new EPR certificate"""
        if not data.enterprise_id:
            raise ValidationError("Enterprise ID is required")

        certificate_number = self._generate_certificate_number(data.enterprise_id)

        certificate = EPRCertificate(
            id=str(uuid4()),
            enterprise_id=data.enterprise_id,
            batch_id=data.batch_id,
            certificate_number=certificate_number,
            status=EPRCertificateStatus.PENDING.value,
            total_weight_kg=data.total_weight_kg,
            recycled_weight_kg=data.recycled_weight_kg,
            disposed_weight_kg=data.disposed_weight_kg,
            recycler_name=data.recycler_name,
            recycler_license_number=data.recycler_license_number,
            recycler_partner_id=data.recycler_partner_id,
            asset_ids=data.asset_ids,
            notes=data.notes,
            created_by=created_by,
            updated_by=created_by,
        )

        certificate = await self.repository.create(certificate)
        return EPRCertificateResponse.model_validate(certificate)

    async def update_certificate(
        self, certificate_id: str, data: EPRCertificateUpdate, updated_by: str
    ) -> EPRCertificateResponse:
        """Update an EPR certificate"""
        certificate = await self.repository.get_by_id(certificate_id)
        if not certificate:
            raise NotFoundError("EPR Certificate", certificate_id)

        update_data = data.model_dump(exclude_unset=True)

        # Handle status enum conversion
        if "status" in update_data and update_data["status"]:
            update_data["status"] = update_data["status"].value

            # Auto-set issue_date when status changes to issued
            if update_data["status"] == EPRCertificateStatus.ISSUED.value:
                if not certificate.issue_date and "issue_date" not in update_data:
                    update_data["issue_date"] = date.today()

        for key, value in update_data.items():
            setattr(certificate, key, value)

        certificate.updated_by = updated_by
        certificate = await self.repository.update(certificate)
        return EPRCertificateResponse.model_validate(certificate)

    async def delete_certificate(self, certificate_id: str) -> bool:
        """Delete an EPR certificate"""
        return await self.repository.delete(certificate_id)

    async def get_weight_totals(self, enterprise_id: str) -> dict:
        """Get aggregate weight totals for an enterprise"""
        return await self.repository.get_weight_totals(enterprise_id)
