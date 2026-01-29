"""Pricing service for business logic"""

from typing import Optional, List, Tuple
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pricing import PricingRule, ConditionModifier
from app.repositories.pricing_repository import PricingRuleRepository, ConditionModifierRepository
from app.schemas.pricing import (
    PricingRuleCreate,
    PricingRuleUpdate,
    PricingRuleResponse,
    ConditionModifierCreate,
    ConditionModifierUpdate,
    ConditionModifierResponse,
    PriceCalculationRequest,
    PriceCalculationResponse,
    PricingConfigResponse,
)
from app.utils.exceptions import NotFoundError, ValidationError


# =============================================================================
# VALID GRADES AND CONDITIONS
# =============================================================================

VALID_GRADES = {"A", "B", "C", "D", "F"}
VALID_CONDITIONS = {
    "excellent",
    "good",
    "fair",
    "poor",
    "damaged",
    "non_functional",
}


class PricingService:
    """Service for Pricing business logic"""

    def __init__(self, db: AsyncSession):
        self.rule_repo = PricingRuleRepository(db)
        self.modifier_repo = ConditionModifierRepository(db)
        self.db = db

    # ========================================================================
    # Pricing Rules
    # ========================================================================

    async def list_pricing_rules(
        self,
        skip: int = 0,
        limit: int = 100,
        category: Optional[str] = None,
        brand: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> Tuple[List[PricingRuleResponse], int]:
        """List pricing rules with filters"""
        rules, total = await self.rule_repo.list_with_filters(
            skip=skip, limit=limit, category=category, brand=brand, is_active=is_active
        )
        return [PricingRuleResponse.model_validate(r) for r in rules], total

    async def get_pricing_rule(self, rule_id: str) -> PricingRuleResponse:
        """Get pricing rule by ID"""
        rule = await self.rule_repo.get_by_id(rule_id)
        if not rule:
            raise NotFoundError("PricingRule", rule_id)
        return PricingRuleResponse.model_validate(rule)

    async def create_pricing_rule(
        self, data: PricingRuleCreate, created_by: Optional[str] = None
    ) -> PricingRuleResponse:
        """Create a new pricing rule"""
        rule = PricingRule(
            id=str(uuid4()),
            name=data.name,
            description=data.description,
            category=data.category.lower(),
            brand=data.brand,
            model_pattern=data.model_pattern,
            age_min=data.age_min,
            age_max=data.age_max,
            base_price=data.base_price,
            grade_modifiers=data.grade_modifiers,
            priority=data.priority,
            is_active=data.is_active,
            created_by=created_by,
        )
        await self.rule_repo.create(rule)
        await self.db.commit()
        await self.db.refresh(rule)
        return PricingRuleResponse.model_validate(rule)

    async def update_pricing_rule(
        self, rule_id: str, data: PricingRuleUpdate, updated_by: Optional[str] = None
    ) -> PricingRuleResponse:
        """Update a pricing rule"""
        rule = await self.rule_repo.get_by_id(rule_id)
        if not rule:
            raise NotFoundError("PricingRule", rule_id)

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if key == "category" and value:
                value = value.lower()
            setattr(rule, key, value)
        rule.updated_by = updated_by

        await self.db.commit()
        await self.db.refresh(rule)
        return PricingRuleResponse.model_validate(rule)

    async def delete_pricing_rule(self, rule_id: str) -> bool:
        """Delete a pricing rule"""
        deleted = await self.rule_repo.delete_by_id(rule_id)
        if not deleted:
            raise NotFoundError("PricingRule", rule_id)
        await self.db.commit()
        return True

    # ========================================================================
    # Condition Modifiers
    # ========================================================================

    async def list_condition_modifiers(
        self, active_only: bool = True
    ) -> List[ConditionModifierResponse]:
        """List all condition modifiers"""
        modifiers = await self.modifier_repo.list_all(active_only=active_only)
        return [ConditionModifierResponse.model_validate(m) for m in modifiers]

    async def update_condition_modifier(
        self, modifier_id: str, data: ConditionModifierUpdate, updated_by: Optional[str] = None
    ) -> ConditionModifierResponse:
        """Update a condition modifier"""
        modifier = await self.modifier_repo.get_by_id(modifier_id)
        if not modifier:
            raise NotFoundError("ConditionModifier", modifier_id)

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(modifier, key, value)
        modifier.updated_by = updated_by

        await self.db.commit()
        await self.db.refresh(modifier)
        return ConditionModifierResponse.model_validate(modifier)

    # ========================================================================
    # Price Calculation
    # ========================================================================

    async def calculate_price(self, request: PriceCalculationRequest) -> PriceCalculationResponse:
        """
        Calculate price for a device based on pricing rules.

        SECURITY: Validates grade and condition values to prevent
        bypassing pricing rules with invalid inputs.

        Args:
            request: Price calculation request with device details

        Returns:
            PriceCalculationResponse with calculated price

        Raises:
            ValidationError: If grade or condition is invalid
        """
        # SECURITY: Validate grade value
        grade = request.grade.upper() if request.grade else None
        if grade and grade not in VALID_GRADES:
            raise ValidationError(
                f"Invalid grade '{request.grade}'. Valid grades: {', '.join(sorted(VALID_GRADES))}"
            )

        # SECURITY: Validate condition value
        condition = request.condition.lower() if request.condition else None
        if condition and condition not in VALID_CONDITIONS:
            raise ValidationError(
                f"Invalid condition '{request.condition}'. "
                f"Valid conditions: {', '.join(sorted(VALID_CONDITIONS))}"
            )

        # Find matching pricing rule
        rule = await self.rule_repo.find_matching_rule(
            category=request.category.lower(),
            brand=request.brand,
            age_years=request.age_years,
        )

        if not rule:
            raise ValidationError(f"No pricing rule found for category={request.category}")

        base_price = rule.base_price
        grade_modifiers = rule.grade_modifiers or {}

        # SECURITY: Require grade to exist in modifiers, don't default to 1.0
        if grade:
            if grade not in grade_modifiers:
                raise ValidationError(
                    f"Grade '{grade}' not configured for pricing rule '{rule.name}'. "
                    f"Available grades: {', '.join(sorted(grade_modifiers.keys()))}"
                )
            grade_modifier = grade_modifiers[grade]
        else:
            grade_modifier = 1.0

        # Get condition modifier
        condition_modifier = 1.0
        if condition:
            cmod = await self.modifier_repo.get_by_name(condition)
            if not cmod:
                raise ValidationError(
                    f"Condition '{condition}' not found in condition modifiers"
                )
            condition_modifier = cmod.modifier

        final_price = base_price * grade_modifier * condition_modifier

        return PriceCalculationResponse(
            base_price=base_price,
            grade_modifier=grade_modifier,
            condition_modifier=condition_modifier,
            final_price=round(final_price, 2),
            pricing_rule_id=rule.id,
            pricing_rule_name=rule.name,
            breakdown={
                "category": request.category,
                "brand": request.brand,
                "age_years": request.age_years,
                "grade": grade,
                "condition": condition,
            },
        )

    # ========================================================================
    # Pricing Configuration
    # ========================================================================

    async def get_pricing_config(self) -> PricingConfigResponse:
        """Get complete pricing configuration"""
        rules, _ = await self.rule_repo.list_with_filters(is_active=True, limit=1000)
        modifiers = await self.modifier_repo.list_all(active_only=True)
        categories = await self.rule_repo.get_categories()
        brands = await self.rule_repo.get_brands()

        return PricingConfigResponse(
            pricing_rules=[PricingRuleResponse.model_validate(r) for r in rules],
            condition_modifiers=[ConditionModifierResponse.model_validate(m) for m in modifiers],
            categories=categories,
            brands=brands,
        )
