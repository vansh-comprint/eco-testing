"""Enterprise repository for database operations"""

from typing import Optional, List, Tuple
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enterprise import (
    Enterprise,
    EnterpriseStatus,
    EnterpriseApplication,
    EnterpriseApplicationStatus,
)


class EnterpriseRepository:
    """Repository for Enterprise database operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, enterprise_id: str) -> Optional[Enterprise]:
        """Get enterprise by ID"""
        result = await self.db.execute(select(Enterprise).where(Enterprise.id == enterprise_id))
        return result.scalar_one_or_none()

    async def get_by_gst(self, gst_number: str) -> Optional[Enterprise]:
        """Get enterprise by GST number"""
        result = await self.db.execute(
            select(Enterprise).where(Enterprise.gst_number == gst_number)
        )
        return result.scalar_one_or_none()

    async def get_by_pan(self, pan_number: str) -> Optional[Enterprise]:
        """Get enterprise by PAN number"""
        result = await self.db.execute(
            select(Enterprise).where(Enterprise.pan_number == pan_number)
        )
        return result.scalar_one_or_none()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[EnterpriseStatus] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[Enterprise], int]:
        """Get all enterprises with filters and pagination"""
        query = select(Enterprise)
        count_query = select(func.count(Enterprise.id))

        # Apply filters
        if status:
            query = query.where(Enterprise.status == status.value)
            count_query = count_query.where(Enterprise.status == status.value)

        if search:
            search_filter = or_(
                Enterprise.name.ilike(f"%{search}%"),
                Enterprise.legal_name.ilike(f"%{search}%"),
                Enterprise.gst_number.ilike(f"%{search}%"),
                Enterprise.contact_email.ilike(f"%{search}%"),
            )
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)

        # Get total count
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply pagination and ordering
        query = query.order_by(Enterprise.name).offset(skip).limit(limit)

        result = await self.db.execute(query)
        enterprises = list(result.scalars().all())

        return enterprises, total

    async def create(self, enterprise: Enterprise) -> Enterprise:
        """Create a new enterprise"""
        self.db.add(enterprise)
        await self.db.commit()
        await self.db.refresh(enterprise)
        return enterprise

    async def update(self, enterprise: Enterprise) -> Enterprise:
        """Update an enterprise"""
        await self.db.commit()
        await self.db.refresh(enterprise)
        return enterprise

    async def delete(self, enterprise_id: str) -> bool:
        """Delete an enterprise"""
        enterprise = await self.get_by_id(enterprise_id)
        if enterprise:
            await self.db.delete(enterprise)
            await self.db.commit()
            return True
        return False

    async def count_all(self) -> int:
        """Count all enterprises"""
        result = await self.db.execute(select(func.count(Enterprise.id)))
        return result.scalar() or 0


class EnterpriseApplicationRepository:
    """Repository for EnterpriseApplication database operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, application_id: str) -> Optional[EnterpriseApplication]:
        """Get application by ID"""
        result = await self.db.execute(
            select(EnterpriseApplication).where(EnterpriseApplication.id == application_id)
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[EnterpriseApplication]:
        """Get application by org admin email"""
        result = await self.db.execute(
            select(EnterpriseApplication).where(EnterpriseApplication.org_admin_email == email)
        )
        return result.scalar_one_or_none()

    async def get_by_ref(self, application_ref: str) -> Optional[EnterpriseApplication]:
        """Get application by reference number"""
        result = await self.db.execute(
            select(EnterpriseApplication).where(
                EnterpriseApplication.application_ref == application_ref
            )
        )
        return result.scalar_one_or_none()

    async def get_by_gst(self, gst_number: str) -> Optional[EnterpriseApplication]:
        """Get application by GST number"""
        result = await self.db.execute(
            select(EnterpriseApplication).where(
                EnterpriseApplication.gst_number == gst_number
            )
        )
        return result.scalar_one_or_none()

    async def get_by_pan(self, pan_number: str) -> Optional[EnterpriseApplication]:
        """Get application by PAN number"""
        result = await self.db.execute(
            select(EnterpriseApplication).where(
                EnterpriseApplication.pan_number == pan_number
            )
        )
        return result.scalar_one_or_none()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[EnterpriseApplicationStatus] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[EnterpriseApplication], int]:
        """Get all applications with filters and pagination"""
        query = select(EnterpriseApplication)
        count_query = select(func.count(EnterpriseApplication.id))

        # Apply filters
        if status:
            query = query.where(EnterpriseApplication.status == status.value)
            count_query = count_query.where(EnterpriseApplication.status == status.value)

        if search:
            search_filter = or_(
                EnterpriseApplication.company_name.ilike(f"%{search}%"),
                EnterpriseApplication.org_admin_email.ilike(f"%{search}%"),
                EnterpriseApplication.org_admin_name.ilike(f"%{search}%"),
                EnterpriseApplication.application_ref.ilike(f"%{search}%"),
            )
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)

        # Get total count
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply pagination and ordering (newest first)
        query = query.order_by(EnterpriseApplication.created_at.desc()).offset(skip).limit(limit)

        result = await self.db.execute(query)
        applications = list(result.scalars().all())

        return applications, total

    async def create(self, application: EnterpriseApplication) -> EnterpriseApplication:
        """Create a new application"""
        self.db.add(application)
        await self.db.commit()
        await self.db.refresh(application)
        return application

    async def update(self, application: EnterpriseApplication) -> EnterpriseApplication:
        """Update an application"""
        await self.db.commit()
        await self.db.refresh(application)
        return application

    async def delete(self, application_id: str) -> bool:
        """Delete an application"""
        application = await self.get_by_id(application_id)
        if application:
            await self.db.delete(application)
            await self.db.commit()
            return True
        return False

    async def count_pending(self) -> int:
        """Count pending applications"""
        result = await self.db.execute(
            select(func.count(EnterpriseApplication.id)).where(
                EnterpriseApplication.status == EnterpriseApplicationStatus.PENDING.value
            )
        )
        return result.scalar() or 0
