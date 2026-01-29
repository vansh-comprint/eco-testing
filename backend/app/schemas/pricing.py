"""Pydantic schemas for Pricing API"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, ConfigDict


# ============================================================================
# Pricing Rule Schemas
# ============================================================================

class PricingRuleBase(BaseModel):
    """Base schema for pricing rules"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category: str = Field(..., min_length=1, max_length=50)
    brand: Optional[str] = Field(None, max_length=100)
    model_pattern: Optional[str] = Field(None, max_length=255)
    age_min: int = Field(0, ge=0)
    age_max: Optional[int] = Field(None, ge=0)
    base_price: float = Field(..., gt=0)
    grade_modifiers: Dict[str, float] = Field(
        default_factory=lambda: {"A+": 1.0, "A": 0.85, "B": 0.70, "C": 0.50, "D": 0.30}
    )
    priority: int = Field(0, ge=0)
    is_active: bool = True


class PricingRuleCreate(PricingRuleBase):
    """Schema for creating a pricing rule"""
    pass


class PricingRuleUpdate(BaseModel):
    """Schema for updating a pricing rule"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = Field(None, min_length=1, max_length=50)
    brand: Optional[str] = Field(None, max_length=100)
    model_pattern: Optional[str] = Field(None, max_length=255)
    age_min: Optional[int] = Field(None, ge=0)
    age_max: Optional[int] = Field(None, ge=0)
    base_price: Optional[float] = Field(None, gt=0)
    grade_modifiers: Optional[Dict[str, float]] = None
    priority: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class PricingRuleResponse(PricingRuleBase):
    """Schema for pricing rule response"""
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Condition Modifier Schemas
# ============================================================================

class ConditionModifierBase(BaseModel):
    """Base schema for condition modifiers"""
    condition_name: str = Field(..., min_length=1, max_length=50)
    display_name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    modifier: float = Field(..., gt=0, le=2.0)
    sort_order: int = Field(0, ge=0)
    is_active: bool = True


class ConditionModifierCreate(ConditionModifierBase):
    """Schema for creating a condition modifier"""
    pass


class ConditionModifierUpdate(BaseModel):
    """Schema for updating a condition modifier"""
    condition_name: Optional[str] = Field(None, min_length=1, max_length=50)
    display_name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    modifier: Optional[float] = Field(None, gt=0, le=2.0)
    sort_order: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class ConditionModifierResponse(ConditionModifierBase):
    """Schema for condition modifier response"""
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Price Calculation Schemas
# ============================================================================

class PriceCalculationRequest(BaseModel):
    """Request to calculate price for a device"""
    category: str
    brand: Optional[str] = None
    model: Optional[str] = None
    age_years: float = Field(..., ge=0)
    grade: str = Field(..., description="Device grade: A+, A, B, C, D")
    condition: Optional[str] = Field(None, description="Condition: excellent, good, fair, poor")


class PriceCalculationResponse(BaseModel):
    """Response with calculated price"""
    base_price: float
    grade_modifier: float
    condition_modifier: float
    final_price: float
    pricing_rule_id: Optional[str] = None
    pricing_rule_name: Optional[str] = None
    breakdown: Dict[str, Any] = Field(default_factory=dict)


# ============================================================================
# Pricing Configuration Response
# ============================================================================

class PricingConfigResponse(BaseModel):
    """Complete pricing configuration"""
    pricing_rules: List[PricingRuleResponse]
    condition_modifiers: List[ConditionModifierResponse]
    categories: List[str]
    brands: List[str]

