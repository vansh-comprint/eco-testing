"""Pricing management endpoints"""

from typing import Optional
from fastapi import APIRouter, Depends, status, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import require_permission
from app.core.permissions import Permission
from app.models.user import User
from app.schemas.pricing import (
    PricingRuleCreate,
    PricingRuleUpdate,
    ConditionModifierUpdate,
    PriceCalculationRequest,
)
from app.services.pricing_service import PricingService
from app.utils.response import success_response, paginated_response
from app.utils.exceptions import NotFoundError, ValidationError

router = APIRouter()


@router.get("", response_model=dict)
async def get_pricing_config(
    current_user: User = Depends(require_permission(Permission.PRICING_READ)),
    db: AsyncSession = Depends(get_db),
):
    """
    Get complete pricing configuration including rules, modifiers, categories, and brands.

    **Permissions:** PRICING_READ (Super Admin, OPS Admin)
    """
    service = PricingService(db)
    config = await service.get_pricing_config()
    return success_response(data=config.model_dump())


@router.get("/rules", response_model=dict)
async def list_pricing_rules(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=1000, description="Number of records to return"),
    category: Optional[str] = Query(None, description="Filter by category"),
    brand: Optional[str] = Query(None, description="Filter by brand"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    current_user: User = Depends(require_permission(Permission.PRICING_READ)),
    db: AsyncSession = Depends(get_db),
):
    """
    List pricing rules with filters.

    **Permissions:** PRICING_READ
    """
    service = PricingService(db)
    rules, total = await service.list_pricing_rules(
        skip=skip, limit=limit, category=category, brand=brand, is_active=is_active
    )
    return paginated_response(
        data=[r.model_dump() for r in rules],
        total=total,
        page=(skip // limit) + 1,
        page_size=limit,
    )


@router.get("/rules/{rule_id}", response_model=dict)
async def get_pricing_rule(
    rule_id: str,
    current_user: User = Depends(require_permission(Permission.PRICING_READ)),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific pricing rule by ID."""
    service = PricingService(db)
    rule = await service.get_pricing_rule(rule_id)
    return success_response(data=rule.model_dump())


@router.post("/rules", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_pricing_rule(
    data: PricingRuleCreate,
    current_user: User = Depends(require_permission(Permission.PRICING_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new pricing rule.

    **Permissions:** PRICING_MANAGE (Super Admin)
    """
    service = PricingService(db)
    rule = await service.create_pricing_rule(data, created_by=current_user.id)
    return success_response(data=rule.model_dump(), message="Pricing rule created successfully")


@router.put("/rules/{rule_id}", response_model=dict)
async def update_pricing_rule(
    rule_id: str,
    data: PricingRuleUpdate,
    current_user: User = Depends(require_permission(Permission.PRICING_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Update an existing pricing rule.

    **Permissions:** PRICING_MANAGE
    """
    service = PricingService(db)
    rule = await service.update_pricing_rule(rule_id, data, updated_by=current_user.id)
    return success_response(data=rule.model_dump(), message="Pricing rule updated successfully")


@router.delete("/rules/{rule_id}", response_model=dict)
async def delete_pricing_rule(
    rule_id: str,
    current_user: User = Depends(require_permission(Permission.PRICING_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    """Delete a pricing rule."""
    service = PricingService(db)
    await service.delete_pricing_rule(rule_id)
    return success_response(message="Pricing rule deleted successfully")


@router.get("/modifiers", response_model=dict)
async def list_condition_modifiers(
    active_only: bool = Query(True, description="Only show active modifiers"),
    current_user: User = Depends(require_permission(Permission.PRICING_READ)),
    db: AsyncSession = Depends(get_db),
):
    """List all condition modifiers."""
    service = PricingService(db)
    modifiers = await service.list_condition_modifiers(active_only=active_only)
    return success_response(data=[m.model_dump() for m in modifiers])


@router.put("/modifiers/{modifier_id}", response_model=dict)
async def update_condition_modifier(
    modifier_id: str,
    data: ConditionModifierUpdate,
    current_user: User = Depends(require_permission(Permission.PRICING_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    """Update a condition modifier."""
    service = PricingService(db)
    modifier = await service.update_condition_modifier(modifier_id, data, updated_by=current_user.id)
    return success_response(data=modifier.model_dump(), message="Condition modifier updated successfully")


@router.post("/calculate", response_model=dict)
async def calculate_price(
    request: PriceCalculationRequest,
    current_user: User = Depends(require_permission(Permission.PRICING_READ)),
    db: AsyncSession = Depends(get_db),
):
    """
    Calculate price for a device based on pricing rules.

    **Permissions:** PRICING_READ
    """
    service = PricingService(db)
    result = await service.calculate_price(request)
    return success_response(data=result.model_dump())

