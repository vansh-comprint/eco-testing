"""Repository for pricing rules and condition modifiers"""

from typing import Optional, List, Tuple
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pricing import PricingRule, ConditionModifier
from app.repositories.base import BaseRepository


class PricingRuleRepository(BaseRepository[PricingRule]):
    """Repository for pricing rules"""

    def __init__(self, session: AsyncSession):
        super().__init__(PricingRule, session)

    async def list_with_filters(
        self,
        skip: int = 0,
        limit: int = 100,
        category: Optional[str] = None,
        brand: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> Tuple[List[PricingRule], int]:
        """List pricing rules with filters"""
        query = select(PricingRule)
        count_query = select(func.count()).select_from(PricingRule)

        conditions = []
        if category:
            conditions.append(PricingRule.category == category)
        if brand:
            conditions.append(PricingRule.brand == brand)
        if is_active is not None:
            conditions.append(PricingRule.is_active == is_active)

        if conditions:
            query = query.where(and_(*conditions))
            count_query = count_query.where(and_(*conditions))

        # Order by priority descending, then by category, brand
        query = query.order_by(
            PricingRule.priority.desc(),
            PricingRule.category,
            PricingRule.brand,
        )

        # Get total count
        total_result = await self.session.execute(count_query)
        total = total_result.scalar() or 0

        # Get paginated results
        query = query.offset(skip).limit(limit)
        result = await self.session.execute(query)
        rules = list(result.scalars().all())

        return rules, total

    async def find_matching_rule(
        self,
        category: str,
        brand: Optional[str],
        age_years: float,
    ) -> Optional[PricingRule]:
        """Find the best matching pricing rule for a device"""
        # Build conditions
        conditions = [
            PricingRule.is_active.is_(True),
            PricingRule.category == category,
            PricingRule.age_min <= age_years,
            or_(
                PricingRule.age_max.is_(None),
                PricingRule.age_max >= age_years,
            ),
        ]

        # Try to find exact brand match first
        if brand:
            brand_query = (
                select(PricingRule)
                .where(and_(*conditions, PricingRule.brand == brand))
                .order_by(PricingRule.priority.desc())
                .limit(1)
            )
            result = await self.session.execute(brand_query)
            rule = result.scalar_one_or_none()
            if rule:
                return rule

        # Fall back to generic (brand = null) rule
        generic_query = (
            select(PricingRule)
            .where(and_(*conditions, PricingRule.brand.is_(None)))
            .order_by(PricingRule.priority.desc())
            .limit(1)
        )
        result = await self.session.execute(generic_query)
        return result.scalar_one_or_none()

    async def get_categories(self) -> List[str]:
        """Get distinct categories"""
        query = select(PricingRule.category).distinct()
        result = await self.session.execute(query)
        return [row[0] for row in result.all() if row[0]]

    async def get_brands(self) -> List[str]:
        """Get distinct brands"""
        query = select(PricingRule.brand).where(PricingRule.brand.isnot(None)).distinct()
        result = await self.session.execute(query)
        return [row[0] for row in result.all() if row[0]]


class ConditionModifierRepository(BaseRepository[ConditionModifier]):
    """Repository for condition modifiers"""

    def __init__(self, session: AsyncSession):
        super().__init__(ConditionModifier, session)

    async def list_all(self, active_only: bool = True) -> List[ConditionModifier]:
        """List all condition modifiers"""
        query = select(ConditionModifier)
        if active_only:
            query = query.where(ConditionModifier.is_active.is_(True))
        query = query.order_by(ConditionModifier.sort_order)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_by_name(self, condition_name: str) -> Optional[ConditionModifier]:
        """Get condition modifier by name"""
        query = select(ConditionModifier).where(
            ConditionModifier.condition_name == condition_name.lower()
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

