"""EPR Certificate repository for database operations"""

from typing import Optional, List, Tuple
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.epr import EPRCertificate, EPRCertificateStatus


class EPRCertificateRepository:
    """Repository for EPR Certificate database operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, certificate_id: str) -> Optional[EPRCertificate]:
        """Get EPR certificate by ID"""
        result = await self.db.execute(
            select(EPRCertificate).where(EPRCertificate.id == certificate_id)
        )
        return result.scalar_one_or_none()

    async def get_by_certificate_number(self, certificate_number: str) -> Optional[EPRCertificate]:
        """Get EPR certificate by certificate number"""
        result = await self.db.execute(
            select(EPRCertificate).where(EPRCertificate.certificate_number == certificate_number)
        )
        return result.scalar_one_or_none()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        enterprise_id: Optional[str] = None,
        status: Optional[EPRCertificateStatus] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[EPRCertificate], int]:
        """Get all EPR certificates with filters and pagination"""
        query = select(EPRCertificate)
        count_query = select(func.count(EPRCertificate.id))

        # Apply filters
        if enterprise_id:
            query = query.where(EPRCertificate.enterprise_id == enterprise_id)
            count_query = count_query.where(EPRCertificate.enterprise_id == enterprise_id)

        if status:
            query = query.where(EPRCertificate.status == status.value)
            count_query = count_query.where(EPRCertificate.status == status.value)

        if search:
            search_filter = or_(
                EPRCertificate.certificate_number.ilike(f"%{search}%"),
                EPRCertificate.recycler_name.ilike(f"%{search}%"),
            )
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)

        # Get total count
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply pagination and ordering
        query = query.order_by(EPRCertificate.created_at.desc()).offset(skip).limit(limit)

        result = await self.db.execute(query)
        certificates = list(result.scalars().all())

        return certificates, total

    async def create(self, certificate: EPRCertificate) -> EPRCertificate:
        """Create a new EPR certificate"""
        self.db.add(certificate)
        await self.db.commit()
        await self.db.refresh(certificate)
        return certificate

    async def update(self, certificate: EPRCertificate) -> EPRCertificate:
        """Update an EPR certificate"""
        await self.db.commit()
        await self.db.refresh(certificate)
        return certificate

    async def delete(self, certificate_id: str) -> bool:
        """Delete an EPR certificate"""
        certificate = await self.get_by_id(certificate_id)
        if certificate:
            await self.db.delete(certificate)
            await self.db.commit()
            return True
        return False

    async def count_by_enterprise(self, enterprise_id: str) -> int:
        """Count EPR certificates by enterprise"""
        result = await self.db.execute(
            select(func.count(EPRCertificate.id)).where(
                EPRCertificate.enterprise_id == enterprise_id
            )
        )
        return result.scalar() or 0

    async def get_weight_totals(self, enterprise_id: str) -> dict:
        """Get total weights for an enterprise's EPR certificates"""
        result = await self.db.execute(
            select(
                func.coalesce(func.sum(EPRCertificate.total_weight_kg), 0).label("total_weight"),
                func.coalesce(func.sum(EPRCertificate.recycled_weight_kg), 0).label("recycled_weight"),
                func.coalesce(func.sum(EPRCertificate.disposed_weight_kg), 0).label("disposed_weight"),
            ).where(EPRCertificate.enterprise_id == enterprise_id)
        )
        row = result.one()
        return {
            "total_weight": float(row.total_weight),
            "recycled_weight": float(row.recycled_weight),
            "disposed_weight": float(row.disposed_weight),
        }
