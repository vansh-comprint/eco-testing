"""Analytics and reporting endpoints"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import require_permission
from app.core.permissions import Permission
from app.models.user import User
from app.services.analytics_service import AnalyticsService
from app.utils.response import success_response
from app.utils.scoping import get_scoped_filters

router = APIRouter()


@router.get("/platform-stats", response_model=dict)
async def get_platform_stats(
    current_user: User = Depends(require_permission(Permission.ANALYTICS_READ)),
    db: AsyncSession = Depends(get_db),
):
    """
    Get platform-wide statistics.

    **Permissions:** ANALYTICS_READ (Super Admin, OPS Admin)
    """
    from app.models.user import UserRole
    from app.utils.scoping import get_it_admin_scoped_filters

    if current_user.role == UserRole.IT_ADMIN.value:
        scoped = await get_it_admin_scoped_filters(db, current_user)
        enterprise_id = scoped.get("enterprise_id")
        branch_ids = scoped.get("branch_ids")
        branch_id = None
    else:
        scoped_filters = get_scoped_filters(current_user)
        enterprise_id = scoped_filters.get("enterprise_id")
        branch_id = scoped_filters.get("branch_id")
        branch_ids = None

    service = AnalyticsService(db)
    stats = await service.get_platform_stats(
        enterprise_id=enterprise_id,
        branch_id=branch_id,
        branch_ids=branch_ids,
    )

    return success_response(data=stats)


@router.get("/asset-distribution", response_model=dict)
async def get_asset_distribution(
    current_user: User = Depends(require_permission(Permission.ANALYTICS_READ)),
    db: AsyncSession = Depends(get_db),
):
    """
    Get asset count distribution by status.

    **Permissions:** ANALYTICS_READ
    """
    from app.models.user import UserRole
    from app.utils.scoping import get_it_admin_scoped_filters

    if current_user.role == UserRole.IT_ADMIN.value:
        scoped = await get_it_admin_scoped_filters(db, current_user)
        enterprise_id = scoped.get("enterprise_id")
        branch_ids = scoped.get("branch_ids")
        branch_id = None
    else:
        scoped_filters = get_scoped_filters(current_user)
        enterprise_id = scoped_filters.get("enterprise_id")
        branch_id = scoped_filters.get("branch_id")
        branch_ids = None

    service = AnalyticsService(db)
    distribution = await service.get_asset_distribution(
        enterprise_id=enterprise_id,
        branch_id=branch_id,
        branch_ids=branch_ids,
    )

    return success_response(data=distribution)


@router.get("/monthly-trends", response_model=dict)
async def get_monthly_trends(
    months: int = Query(6, ge=1, le=24, description="Number of months to retrieve"),
    current_user: User = Depends(require_permission(Permission.ANALYTICS_READ)),
    db: AsyncSession = Depends(get_db),
):
    """
    Get monthly trends for assets processed.

    **Permissions:** ANALYTICS_READ
    """
    from app.models.user import UserRole
    from app.utils.scoping import get_it_admin_scoped_filters

    if current_user.role == UserRole.IT_ADMIN.value:
        scoped = await get_it_admin_scoped_filters(db, current_user)
        enterprise_id = scoped.get("enterprise_id")
        branch_ids = scoped.get("branch_ids")
        branch_id = None
    else:
        scoped_filters = get_scoped_filters(current_user)
        enterprise_id = scoped_filters.get("enterprise_id")
        branch_id = scoped_filters.get("branch_id")
        branch_ids = None

    service = AnalyticsService(db)
    trends = await service.get_monthly_trends(
        months=months,
        enterprise_id=enterprise_id,
        branch_id=branch_id,
        branch_ids=branch_ids,
    )

    return success_response(data={"trends": trends})
