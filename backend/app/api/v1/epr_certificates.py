"""EPR Certificate management endpoints"""

from typing import Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import require_permission
from app.core.permissions import Permission
from app.models.user import User
from app.models.epr import EPRCertificateStatus
from app.schemas.epr import EPRCertificateCreate, EPRCertificateUpdate, EPRCertificatePush
from app.services.epr_service import EPRCertificateService
from app.utils.response import success_response, paginated_response
from app.utils.exceptions import ValidationError as EcoTribeValidationError, AuthorizationError
from app.utils.scoping import get_scoped_filters, auto_fill_context

router = APIRouter()


@router.get("", response_model=dict)
async def list_epr_certificates(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=100, description="Number of records to return"),
    status_filter: Optional[EPRCertificateStatus] = Query(
        None, alias="status", description="Filter by status"
    ),
    search: Optional[str] = Query(None, description="Search by certificate number or recycler"),
    current_user: User = Depends(require_permission(Permission.VIEW_EPR_CERTIFICATES)),
    db: AsyncSession = Depends(get_db),
):
    """
    List EPR certificates with automatic role-based scoping.

    Data is automatically scoped based on user's role:
    - Super Admin / OPS Admin: All certificates
    - Org Admin: Certificates in their enterprise

    **Permissions:** VIEW_EPR_CERTIFICATES
    """
    scoped_filters = get_scoped_filters(current_user)

    service = EPRCertificateService(db)
    certificates, total = await service.list_certificates(
        skip=skip,
        limit=limit,
        status=status_filter,
        search=search,
        **scoped_filters,
    )

    return paginated_response(
        data=[cert.model_dump() for cert in certificates],
        total=total,
        page=(skip // limit) + 1,
        page_size=limit,
    )


@router.get("/weight-totals", response_model=dict)
async def get_weight_totals(
    enterprise_id: Optional[str] = Query(None, description="Enterprise ID"),
    current_user: User = Depends(require_permission(Permission.VIEW_EPR_CERTIFICATES)),
    db: AsyncSession = Depends(get_db),
):
    """
    Get aggregate weight totals for EPR certificates.

    **Permissions:** VIEW_EPR_CERTIFICATES
    """
    eid = enterprise_id or current_user.enterprise_id
    if not eid:
        raise EcoTribeValidationError("Enterprise ID is required")

    service = EPRCertificateService(db)
    totals = await service.get_weight_totals(eid)
    return success_response(data=totals)


@router.get("/{certificate_id}", response_model=dict)
async def get_epr_certificate(
    certificate_id: str,
    current_user: User = Depends(require_permission(Permission.VIEW_EPR_CERTIFICATES)),
    db: AsyncSession = Depends(get_db),
):
    """
    Get EPR certificate by ID.

    **Permissions:** VIEW_EPR_CERTIFICATES
    """
    service = EPRCertificateService(db)
    certificate = await service.get_certificate(certificate_id)

    from app.utils.scoping import is_platform_admin, can_access_enterprise
    if not is_platform_admin(current_user):
        cert_enterprise = getattr(certificate, 'enterprise_id', None)
        if cert_enterprise and not can_access_enterprise(current_user, str(cert_enterprise)):
            from app.utils.exceptions import AuthorizationError
            raise AuthorizationError("You do not have access to this certificate")

    return success_response(data=certificate.model_dump())


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_epr_certificate(
    data: EPRCertificateCreate,
    current_user: User = Depends(require_permission(Permission.MANAGE_EPR_CERTIFICATES)),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new EPR certificate.

    Enterprise context is automatically derived from current user's role.

    **Permissions:** MANAGE_EPR_CERTIFICATES (Super Admin, OPS Admin)
    """
    filled_enterprise_id, _ = auto_fill_context(
        current_user, data.enterprise_id, None
    )
    data = data.model_copy(update={"enterprise_id": filled_enterprise_id})

    service = EPRCertificateService(db)
    certificate = await service.create_certificate(data, current_user.id)
    return success_response(
        data=certificate.model_dump(), message="EPR certificate created successfully"
    )


@router.put("/{certificate_id}", response_model=dict)
async def update_epr_certificate(
    certificate_id: str,
    data: EPRCertificateUpdate,
    current_user: User = Depends(require_permission(Permission.MANAGE_EPR_CERTIFICATES)),
    db: AsyncSession = Depends(get_db),
):
    """
    Update EPR certificate by ID.

    **Permissions:** MANAGE_EPR_CERTIFICATES (Super Admin, OPS Admin)
    """
    service = EPRCertificateService(db)
    certificate = await service.update_certificate(
        certificate_id, data, current_user.id
    )
    return success_response(
        data=certificate.model_dump(), message="EPR certificate updated successfully"
    )


@router.delete("/{certificate_id}", response_model=dict)
async def delete_epr_certificate(
    certificate_id: str,
    current_user: User = Depends(require_permission(Permission.MANAGE_EPR_CERTIFICATES)),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete EPR certificate by ID.

    **Permissions:** MANAGE_EPR_CERTIFICATES (Super Admin, OPS Admin)
    """
    service = EPRCertificateService(db)
    await service.delete_certificate(certificate_id)
    return success_response(message="EPR certificate deleted successfully")


@router.post("/push", response_model=dict)
async def push_epr_certificates(
    data: EPRCertificatePush,
    current_user: User = Depends(require_permission(Permission.MANAGE_EPR_CERTIFICATES)),
    db: AsyncSession = Depends(get_db),
):
    """
    Push/send EPR certificates to another enterprise.

    This endpoint allows OPS Admin to send EPR certificates generated from one enterprise
    to another enterprise's Org Admin, making them visible in the destination enterprise's
    EPR certificate view.

    **Permissions:** MANAGE_EPR_CERTIFICATES (Super Admin, OPS Admin only)
    """
    service = EPRCertificateService(db)
    certificates = await service.push_certificates(data, current_user.id)

    return success_response(
        data=[cert.model_dump() for cert in certificates],
        message=f"Pushed {len(certificates)} EPR certificate(s) to enterprise",
    )
