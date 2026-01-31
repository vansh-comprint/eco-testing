"""EPR Certificate management endpoints"""

from typing import Optional
from fastapi import APIRouter, Depends, status, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import require_permission
from app.core.permissions import Permission
from app.models.user import User
from app.models.epr import EPRCertificateStatus
from app.schemas.epr import EPRCertificateCreate, EPRCertificateUpdate
from app.services.epr_service import EPRCertificateService
from app.utils.response import success_response, paginated_response
from app.utils.exceptions import NotFoundError, ValidationError
from app.utils.scoping import get_scoped_filters, auto_fill_context

router = APIRouter()


@router.get("", response_model=dict)
async def list_epr_certificates(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=1000, description="Number of records to return"),
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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Enterprise ID is required",
        )

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
    try:
        service = EPRCertificateService(db)
        certificate = await service.get_certificate(certificate_id)
        return success_response(data=certificate.model_dump())
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_epr_certificate(
    data: EPRCertificateCreate,
    current_user: User = Depends(require_permission(Permission.VIEW_EPR_CERTIFICATES)),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new EPR certificate.

    Enterprise context is automatically derived from current user's role.

    **Permissions:** VIEW_EPR_CERTIFICATES (Super Admin / OPS Admin typically create these)
    """
    filled_enterprise_id, _ = auto_fill_context(
        current_user, data.enterprise_id, None
    )
    data = data.model_copy(update={"enterprise_id": filled_enterprise_id})

    try:
        service = EPRCertificateService(db)
        certificate = await service.create_certificate(data, current_user.id)
        return success_response(
            data=certificate.model_dump(), message="EPR certificate created successfully"
        )
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/{certificate_id}", response_model=dict)
async def update_epr_certificate(
    certificate_id: str,
    data: EPRCertificateUpdate,
    current_user: User = Depends(require_permission(Permission.VIEW_EPR_CERTIFICATES)),
    db: AsyncSession = Depends(get_db),
):
    """
    Update EPR certificate by ID.

    **Permissions:** VIEW_EPR_CERTIFICATES
    """
    try:
        service = EPRCertificateService(db)
        certificate = await service.update_certificate(
            certificate_id, data, current_user.id
        )
        return success_response(
            data=certificate.model_dump(), message="EPR certificate updated successfully"
        )
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{certificate_id}", response_model=dict)
async def delete_epr_certificate(
    certificate_id: str,
    current_user: User = Depends(require_permission(Permission.VIEW_EPR_CERTIFICATES)),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete EPR certificate by ID.

    **Permissions:** VIEW_EPR_CERTIFICATES
    """
    try:
        service = EPRCertificateService(db)
        await service.delete_certificate(certificate_id)
        return success_response(message="EPR certificate deleted successfully")
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
