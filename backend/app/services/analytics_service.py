"""Analytics service for business intelligence and reporting"""

from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any, Optional
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.asset import Asset, AssetStatus
from app.models.enterprise import Enterprise
from app.models.financial import Payout, PayoutStatus


class AnalyticsService:
    """Service for analytics and reporting business logic"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_platform_stats(
        self,
        enterprise_id: str | None = None,
        branch_id: str | None = None,
        branch_ids: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Get platform-wide statistics.

        Args:
            enterprise_id: Optional filter for specific enterprise
            branch_id: Optional filter for specific branch
            branch_ids: Optional filter for multiple branches (IT Admin multi-branch)

        Returns:
            Dictionary with total_enterprises, total_assets, total_users, monthly_revenue
        """
        # Total enterprises
        enterprise_query = select(func.count()).select_from(Enterprise)
        enterprise_result = await self.db.execute(enterprise_query)
        total_enterprises = enterprise_result.scalar() or 0

        # Total assets with scoping
        asset_query = select(func.count()).select_from(Asset)
        if enterprise_id:
            asset_query = asset_query.where(Asset.enterprise_id == enterprise_id)
        if branch_ids:
            asset_query = asset_query.where(Asset.branch_id.in_(branch_ids))
        elif branch_id:
            asset_query = asset_query.where(Asset.branch_id == branch_id)
        asset_result = await self.db.execute(asset_query)
        total_assets = asset_result.scalar() or 0

        # Total users (scoped)
        user_query = select(func.count()).select_from(User)
        if enterprise_id:
            user_query = user_query.where(User.enterprise_id == enterprise_id)
        user_result = await self.db.execute(user_query)
        total_users = user_result.scalar() or 0

        # Monthly revenue (last 30 days payouts)
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        revenue_query = select(func.sum(Payout.amount)).where(
            and_(
                Payout.status == PayoutStatus.COMPLETED.value,
                Payout.completed_at >= thirty_days_ago,
            )
        )
        revenue_result = await self.db.execute(revenue_query)
        monthly_revenue = revenue_result.scalar() or 0.0

        return {
            "total_enterprises": total_enterprises,
            "total_assets": total_assets,
            "total_users": total_users,
            "monthly_revenue": round(monthly_revenue, 2),
        }

    async def get_asset_distribution(
        self,
        enterprise_id: str | None = None,
        branch_id: str | None = None,
        branch_ids: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Get asset count distribution by status.

        Args:
            enterprise_id: Optional filter for specific enterprise
            branch_id: Optional filter for specific branch
            branch_ids: Optional filter for multiple branches (IT Admin multi-branch)

        Returns:
            Dictionary with distribution (categorized) and raw (all statuses)
        """
        # Build base query with scoping
        base_conditions = []
        if enterprise_id:
            base_conditions.append(Asset.enterprise_id == enterprise_id)
        if branch_ids:
            base_conditions.append(Asset.branch_id.in_(branch_ids))
        elif branch_id:
            base_conditions.append(Asset.branch_id == branch_id)

        # Status distribution
        status_query = select(Asset.status, func.count()).group_by(Asset.status)
        if base_conditions:
            status_query = status_query.where(and_(*base_conditions))
        status_result = await self.db.execute(status_query)
        status_distribution = {row[0]: row[1] for row in status_result.all()}

        # Aggregate by category
        categories = {
            "pending": status_distribution.get(AssetStatus.PENDING_ASSIGNMENT.value, 0),
            "assigned": status_distribution.get(AssetStatus.ASSIGNED.value, 0),
            "submitted": status_distribution.get(AssetStatus.SUBMITTED.value, 0),
            "in_review": status_distribution.get(AssetStatus.REMOTE_REVIEW.value, 0),
            "picked_up": status_distribution.get(AssetStatus.PICKED_UP.value, 0),
            "in_transit": status_distribution.get(AssetStatus.IN_TRANSIT.value, 0),
            "completed": status_distribution.get(AssetStatus.COMPLETED.value, 0),
        }

        return {"distribution": categories, "raw": status_distribution}

    async def get_monthly_trends(
        self,
        months: int = 6,
        enterprise_id: str | None = None,
        branch_id: str | None = None,
        branch_ids: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Get monthly trends for assets processed.

        Args:
            months: Number of months to retrieve (1-24)
            enterprise_id: Optional filter for specific enterprise
            branch_id: Optional filter for specific branch

        Returns:
            List of dictionaries with month and assets_processed count
        """
        trends = []
        now = datetime.now(timezone.utc)

        for i in range(months - 1, -1, -1):
            # Calculate month start and end
            month_date = now - timedelta(days=i * 30)
            month_start = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if month_date.month == 12:
                month_end = month_start.replace(year=month_start.year + 1, month=1)
            else:
                month_end = month_start.replace(month=month_start.month + 1)

            # Count assets created in this month
            asset_query = (
                select(func.count())
                .select_from(Asset)
                .where(and_(Asset.created_at >= month_start, Asset.created_at < month_end))
            )
            if enterprise_id:
                asset_query = asset_query.where(Asset.enterprise_id == enterprise_id)
            if branch_ids:
                asset_query = asset_query.where(Asset.branch_id.in_(branch_ids))
            elif branch_id:
                asset_query = asset_query.where(Asset.branch_id == branch_id)

            result = await self.db.execute(asset_query)
            count = result.scalar() or 0

            trends.append(
                {
                    "month": month_start.strftime("%b %Y"),
                    "assets_processed": count,
                }
            )

        return trends

