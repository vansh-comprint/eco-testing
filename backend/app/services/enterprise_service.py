"""Enterprise service for business logic"""

from datetime import datetime
from typing import Optional, List, Tuple
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enterprise import (
    Enterprise,
    EnterpriseStatus,
    EnterpriseApplication,
    EnterpriseApplicationStatus,
)
from app.models.user import User, UserRole, UserStatus
from app.repositories.enterprise_repository import (
    EnterpriseRepository,
    EnterpriseApplicationRepository,
)
from app.schemas.enterprise import (
    EnterpriseCreate,
    EnterpriseUpdate,
    EnterpriseResponse,
    EnterpriseApplicationCreate,
    EnterpriseApplicationUpdate,
    EnterpriseApplicationResponse,
)
from app.utils.exceptions import NotFoundError, ValidationError, ConflictError
from app.core.security import get_password_hash
from app.services.email_service import EmailService


class EnterpriseService:
    """Service for Enterprise business logic"""

    def __init__(self, db: AsyncSession):
        self.repository = EnterpriseRepository(db)
        self.db = db

    async def get_enterprise(self, enterprise_id: str) -> EnterpriseResponse:
        """Get enterprise by ID"""
        enterprise = await self.repository.get_by_id(enterprise_id)
        if not enterprise:
            raise NotFoundError("Enterprise", enterprise_id)
        return EnterpriseResponse.model_validate(enterprise)

    async def list_enterprises(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[EnterpriseStatus] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[EnterpriseResponse], int]:
        """List enterprises with filters and pagination"""
        enterprises, total = await self.repository.get_all(
            skip=skip,
            limit=limit,
            status=status,
            search=search,
        )
        return [EnterpriseResponse.model_validate(e) for e in enterprises], total

    async def create_enterprise(
        self, enterprise_data: EnterpriseCreate, created_by: str
    ) -> EnterpriseResponse:
        """Create a new enterprise"""
        # Check if GST number already exists
        if enterprise_data.gst_number:
            existing = await self.repository.get_by_gst(enterprise_data.gst_number)
            if existing:
                raise ConflictError(
                    f"Enterprise with GST number {enterprise_data.gst_number} already exists"
                )

        enterprise = Enterprise(
            id=str(uuid4()),
            name=enterprise_data.name,
            legal_name=enterprise_data.legal_name,
            gst_number=enterprise_data.gst_number,
            pan_number=enterprise_data.pan_number,
            address=enterprise_data.address,
            industry=enterprise_data.industry,
            employee_count=enterprise_data.employee_count,
            contact_person=enterprise_data.contact_person,
            contact_email=enterprise_data.contact_email,
            contact_phone=enterprise_data.contact_phone,
            status=EnterpriseStatus.ACTIVE.value,
            created_by=created_by,
            updated_by=created_by,
        )

        enterprise = await self.repository.create(enterprise)
        return EnterpriseResponse.model_validate(enterprise)

    async def update_enterprise(
        self, enterprise_id: str, enterprise_data: EnterpriseUpdate, updated_by: str
    ) -> EnterpriseResponse:
        """Update an existing enterprise"""
        enterprise = await self.repository.get_by_id(enterprise_id)
        if not enterprise:
            raise NotFoundError("Enterprise", enterprise_id)

        update_data = enterprise_data.model_dump(exclude_unset=True)

        # Handle enum conversion
        if "status" in update_data and update_data["status"]:
            update_data["status"] = update_data["status"].value

        # Check for GST conflict if updating
        if "gst_number" in update_data and update_data["gst_number"]:
            existing = await self.repository.get_by_gst(update_data["gst_number"])
            if existing and existing.id != enterprise_id:
                raise ConflictError(
                    f"Enterprise with GST number {update_data['gst_number']} already exists"
                )

        for key, value in update_data.items():
            setattr(enterprise, key, value)

        enterprise.updated_by = updated_by
        enterprise = await self.repository.update(enterprise)
        return EnterpriseResponse.model_validate(enterprise)

    async def delete_enterprise(self, enterprise_id: str) -> bool:
        """Delete an enterprise"""
        return await self.repository.delete(enterprise_id)


class EnterpriseApplicationService:
    """Service for EnterpriseApplication business logic"""

    def __init__(self, db: AsyncSession):
        self.repository = EnterpriseApplicationRepository(db)
        self.enterprise_repo = EnterpriseRepository(db)
        self.db = db

    def _generate_application_ref(self) -> str:
        """Generate a unique application reference"""
        now = datetime.utcnow()
        return f"ENT-{now.strftime('%Y')}-{str(uuid4())[:8].upper()}"

    async def get_application(self, application_id: str) -> EnterpriseApplicationResponse:
        """Get application by ID"""
        application = await self.repository.get_by_id(application_id)
        if not application:
            raise NotFoundError("EnterpriseApplication", application_id)
        return EnterpriseApplicationResponse.model_validate(application)

    async def list_applications(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[EnterpriseApplicationStatus] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[EnterpriseApplicationResponse], int]:
        """List applications with filters and pagination"""
        applications, total = await self.repository.get_all(
            skip=skip,
            limit=limit,
            status=status,
            search=search,
        )
        return [EnterpriseApplicationResponse.model_validate(a) for a in applications], total

    async def create_application(
        self, application_data: EnterpriseApplicationCreate
    ) -> EnterpriseApplicationResponse:
        """Create a new enterprise application"""
        # Check if email already has a pending application
        existing = await self.repository.get_by_email(application_data.org_admin_email)
        if existing and existing.status == EnterpriseApplicationStatus.PENDING.value:
            raise ConflictError(
                f"A pending application already exists for {application_data.org_admin_email}"
            )

        # SECURITY: Check if GST number already exists in enterprises or pending applications
        if application_data.gst_number:
            # Check existing enterprises
            existing_enterprise = await self.enterprise_repo.get_by_gst(application_data.gst_number)
            if existing_enterprise:
                raise ConflictError(
                    f"An enterprise with GST number {application_data.gst_number} already exists"
                )

            # Check pending applications
            pending_apps = await self.repository.get_by_gst(application_data.gst_number)
            if pending_apps and pending_apps.status == EnterpriseApplicationStatus.PENDING.value:
                raise ConflictError(
                    f"A pending application with GST number {application_data.gst_number} already exists"
                )

        # Hash password if provided
        password_hash = None
        if application_data.password:
            password_hash = get_password_hash(application_data.password)

        application = EnterpriseApplication(
            id=str(uuid4()),
            application_ref=self._generate_application_ref(),
            company_name=application_data.company_name,
            legal_name=application_data.legal_name,
            gst_number=application_data.gst_number,
            pan_number=application_data.pan_number,
            registered_address=application_data.registered_address,
            industry_type=application_data.industry_type,
            company_size=application_data.company_size,
            org_admin_name=application_data.org_admin_name,
            org_admin_email=application_data.org_admin_email,
            org_admin_phone=application_data.org_admin_phone,
            org_admin_designation=application_data.org_admin_designation,
            password_hash=password_hash,
            doc_gst_certificate=application_data.doc_gst_certificate,
            doc_pan_card=application_data.doc_pan_card,
            doc_incorporation_cert=application_data.doc_incorporation_cert,
            doc_signatory_id=application_data.doc_signatory_id,
            doc_address_proof=application_data.doc_address_proof,
            doc_company_logo=application_data.doc_company_logo,
            status=EnterpriseApplicationStatus.PENDING.value,
        )

        application = await self.repository.create(application)
        return EnterpriseApplicationResponse.model_validate(application)

    async def approve_application(
        self, application_id: str, reviewed_by: str, review_notes: Optional[str] = None
    ) -> EnterpriseApplicationResponse:
        """Approve an enterprise application and create enterprise + org admin user"""
        application = await self.repository.get_by_id(application_id)
        if not application:
            raise NotFoundError("EnterpriseApplication", application_id)

        if application.status != EnterpriseApplicationStatus.PENDING.value:
            raise ValidationError(f"Application is not pending (status: {application.status})")

        # Create the enterprise
        enterprise = Enterprise(
            id=str(uuid4()),
            name=application.company_name,
            legal_name=application.legal_name,
            gst_number=application.gst_number,
            pan_number=application.pan_number,
            industry=application.industry_type,
            status=EnterpriseStatus.ACTIVE.value,
            created_by=reviewed_by,
            updated_by=reviewed_by,
        )
        self.db.add(enterprise)

        # Create the org admin user
        org_admin = User(
            id=str(uuid4()),
            email=application.org_admin_email,
            name=application.org_admin_name,
            phone=application.org_admin_phone,
            password_hash=application.password_hash or get_password_hash("TempPass123!"),
            role=UserRole.ORG_ADMIN.value,
            status=UserStatus.ACTIVE.value,
            enterprise_id=enterprise.id,
            created_by=reviewed_by,
            updated_by=reviewed_by,
        )
        self.db.add(org_admin)

        # Update the application
        application.status = EnterpriseApplicationStatus.APPROVED.value
        application.reviewed_by = reviewed_by
        application.reviewed_at = datetime.utcnow().isoformat()
        application.review_notes = review_notes
        application.enterprise_id = enterprise.id

        await self.db.commit()
        await self.db.refresh(application)

        # Send approval email notification to the org admin
        try:
            EmailService.send_approval_notification(
                to_email=application.org_admin_email,
                company_name=application.company_name,
                org_admin_name=application.org_admin_name,
            )
        except Exception:
            # Don't fail the approval if email fails
            pass

        return EnterpriseApplicationResponse.model_validate(application)

    async def reject_application(
        self, application_id: str, reviewed_by: str, reason: str, review_notes: Optional[str] = None
    ) -> EnterpriseApplicationResponse:
        """Reject an enterprise application"""
        application = await self.repository.get_by_id(application_id)
        if not application:
            raise NotFoundError("EnterpriseApplication", application_id)

        if application.status != EnterpriseApplicationStatus.PENDING.value:
            raise ValidationError(f"Application is not pending (status: {application.status})")

        application.status = EnterpriseApplicationStatus.REJECTED.value
        application.reviewed_by = reviewed_by
        application.reviewed_at = datetime.utcnow().isoformat()
        application.review_notes = review_notes
        application.rejection_reason = reason

        application = await self.repository.update(application)

        # Send rejection email notification
        try:
            EmailService.send_rejection_notification(
                to_email=application.org_admin_email,
                company_name=application.company_name,
                org_admin_name=application.org_admin_name,
                reason=reason,
            )
        except Exception:
            # Don't fail the rejection if email fails
            pass

        return EnterpriseApplicationResponse.model_validate(application)

    async def request_more_info(
        self, application_id: str, reviewed_by: str, notes: str
    ) -> EnterpriseApplicationResponse:
        """Request more information for an enterprise application"""
        application = await self.repository.get_by_id(application_id)
        if not application:
            raise NotFoundError("EnterpriseApplication", application_id)

        if application.status not in [
            EnterpriseApplicationStatus.PENDING.value,
            EnterpriseApplicationStatus.MORE_INFO_REQUESTED.value,
        ]:
            raise ValidationError(f"Application cannot be updated (status: {application.status})")

        application.status = EnterpriseApplicationStatus.MORE_INFO_REQUESTED.value
        application.reviewed_by = reviewed_by
        application.reviewed_at = datetime.utcnow().isoformat()
        application.review_notes = notes

        application = await self.repository.update(application)
        return EnterpriseApplicationResponse.model_validate(application)
