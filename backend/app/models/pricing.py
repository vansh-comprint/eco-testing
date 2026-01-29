"""Pricing models for RV calculation and pricing rules"""

from enum import Enum
from sqlalchemy import Column, String, Float, Integer, Text, JSON, Boolean
from app.models.base import BaseModel


class DeviceCategory(str, Enum):
    """Device categories for pricing"""
    LAPTOP = "laptop"
    DESKTOP = "desktop"
    TABLET = "tablet"
    PHONE = "phone"
    MONITOR = "monitor"
    PRINTER = "printer"
    OTHER = "other"


class PricingRule(BaseModel):
    """
    Pricing rules for calculating Residual Value (RV) of devices.
    
    Each rule defines base price and modifiers for a specific
    device category, brand, and age range combination.
    """
    
    __tablename__ = "pricing_rules"
    
    # Primary Key
    id = Column(String, primary_key=True, index=True)
    
    # Rule Identification
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Device Targeting
    category = Column(String(50), nullable=False, index=True)  # laptop, desktop, etc.
    brand = Column(String(100), nullable=True, index=True)  # Dell, HP, Apple, or null for 'any'
    model_pattern = Column(String(255), nullable=True)  # Optional model pattern match
    
    # Age Range (in years)
    age_min = Column(Integer, nullable=False, default=0)  # Minimum age in years
    age_max = Column(Integer, nullable=True)  # Maximum age in years (null = no limit)
    
    # Pricing
    base_price = Column(Float, nullable=False)  # Base price in INR
    
    # Grade Modifiers (stored as JSON)
    # Format: {"A+": 1.0, "A": 0.85, "B": 0.70, "C": 0.50, "D": 0.30}
    grade_modifiers = Column(JSON, nullable=False, default=dict)
    
    # Rule Priority (higher = more specific)
    priority = Column(Integer, nullable=False, default=0)
    
    # Status
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    
    def __repr__(self):
        return f"<PricingRule(id={self.id}, category={self.category}, brand={self.brand})>"


class ConditionModifier(BaseModel):
    """
    Global condition modifiers that apply to all pricing rules.
    
    These modifiers adjust the final price based on device condition.
    """
    
    __tablename__ = "condition_modifiers"
    
    # Primary Key
    id = Column(String, primary_key=True, index=True)
    
    # Condition Details
    condition_name = Column(String(50), nullable=False, unique=True)  # Excellent, Good, Fair, Poor
    display_name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    
    # Modifier Value
    modifier = Column(Float, nullable=False)  # Multiplier: 1.15, 1.0, 0.75, 0.5
    
    # Display Order
    sort_order = Column(Integer, nullable=False, default=0)
    
    # Status
    is_active = Column(Boolean, nullable=False, default=True)
    
    def __repr__(self):
        return f"<ConditionModifier(condition={self.condition_name}, modifier={self.modifier})>"

