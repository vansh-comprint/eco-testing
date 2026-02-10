"""Dashboard endpoints - badge counts and summary data"""

from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.services.dashboard_service import get_badge_counts, get_dashboard_stats
from app.utils.response import success_response

router = APIRouter()


@router.get("/badges", response_model=dict)
async def get_badges(
    branch_id: Optional[str] = Query(None, description="Filter badges by branch"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get role-specific pending action counts for sidebar badges.

    Returns only non-zero counts relevant to the current user's role.
    Efficiently uses COUNT(*) queries instead of fetching full entity lists.

    **Authentication:** Required (any authenticated user)
    """
    badges = await get_badge_counts(current_user, db, branch_id=branch_id)
    return success_response(data=badges)


@router.get("/stats", response_model=dict)
async def get_stats(
    branch_id: Optional[str] = Query(None, description="Filter stats by branch (IT Admin)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get role-specific dashboard statistics.

    Returns aggregated counts and financial summaries for the current user's
    dashboard using efficient COUNT/SUM queries.

    **Authentication:** Required (any authenticated user)
    """
    stats = await get_dashboard_stats(current_user, db, branch_id=branch_id)
    return success_response(data=stats)
