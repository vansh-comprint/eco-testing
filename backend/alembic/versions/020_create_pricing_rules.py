"""create pricing_rules and condition_modifiers tables

Revision ID: 020_pricing_rules
Revises: 019_enterprise_applications
Create Date: 2026-01-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '020_pricing_rules'
down_revision: Union[str, None] = '019_enterprise_applications'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create pricing_rules table
    op.create_table('pricing_rules',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        # Device Targeting
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('brand', sa.String(100), nullable=True),
        sa.Column('model_pattern', sa.String(255), nullable=True),
        # Age Range
        sa.Column('age_min', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('age_max', sa.Integer(), nullable=True),
        # Pricing
        sa.Column('base_price', sa.Float(), nullable=False),
        sa.Column('grade_modifiers', sa.JSON(), nullable=False),
        # Priority and Status
        sa.Column('priority', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        # Audit columns
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.String(), nullable=True),
        sa.Column('updated_by', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_pricing_rules_id'), 'pricing_rules', ['id'], unique=False)
    op.create_index(op.f('ix_pricing_rules_category'), 'pricing_rules', ['category'], unique=False)
    op.create_index(op.f('ix_pricing_rules_brand'), 'pricing_rules', ['brand'], unique=False)
    op.create_index(op.f('ix_pricing_rules_is_active'), 'pricing_rules', ['is_active'], unique=False)
    
    # Create condition_modifiers table
    op.create_table('condition_modifiers',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('condition_name', sa.String(50), nullable=False),
        sa.Column('display_name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('modifier', sa.Float(), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        # Audit columns
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.String(), nullable=True),
        sa.Column('updated_by', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('condition_name'),
    )
    op.create_index(op.f('ix_condition_modifiers_id'), 'condition_modifiers', ['id'], unique=False)
    
    # Insert default condition modifiers
    op.execute("""
        INSERT INTO condition_modifiers (id, condition_name, display_name, description, modifier, sort_order, is_active)
        VALUES 
            ('cmod-excellent', 'excellent', 'Excellent', 'Like new, no signs of wear', 1.15, 1, true),
            ('cmod-good', 'good', 'Good', 'Minor cosmetic wear, fully functional', 1.0, 2, true),
            ('cmod-fair', 'fair', 'Fair', 'Moderate wear, functional', 0.75, 3, true),
            ('cmod-poor', 'poor', 'Poor', 'Significant wear, may have issues', 0.5, 4, true)
    """)
    
    # Insert default pricing rules
    op.execute("""
        INSERT INTO pricing_rules (id, name, category, brand, age_min, age_max, base_price, grade_modifiers, priority, is_active)
        VALUES 
            ('pr-laptop-dell-0-1', 'Dell Laptop 0-1 years', 'laptop', 'Dell', 0, 1, 35000, '{"A+": 1.0, "A": 0.85, "B": 0.70, "C": 0.50, "D": 0.30}', 10, true),
            ('pr-laptop-dell-1-2', 'Dell Laptop 1-2 years', 'laptop', 'Dell', 1, 2, 28000, '{"A+": 1.0, "A": 0.85, "B": 0.70, "C": 0.50, "D": 0.30}', 10, true),
            ('pr-laptop-hp-0-1', 'HP Laptop 0-1 years', 'laptop', 'HP', 0, 1, 32000, '{"A+": 1.0, "A": 0.85, "B": 0.70, "C": 0.50, "D": 0.30}', 10, true),
            ('pr-laptop-apple-0-1', 'Apple Laptop 0-1 years', 'laptop', 'Apple', 0, 1, 50000, '{"A+": 1.0, "A": 0.85, "B": 0.70, "C": 0.50, "D": 0.30}', 10, true),
            ('pr-laptop-lenovo-0-1', 'Lenovo Laptop 0-1 years', 'laptop', 'Lenovo', 0, 1, 30000, '{"A+": 1.0, "A": 0.85, "B": 0.70, "C": 0.50, "D": 0.30}', 10, true),
            ('pr-desktop-any-0-2', 'Desktop 0-2 years', 'desktop', NULL, 0, 2, 25000, '{"A+": 1.0, "A": 0.85, "B": 0.70, "C": 0.50, "D": 0.30}', 5, true),
            ('pr-monitor-any-0-3', 'Monitor 0-3 years', 'monitor', NULL, 0, 3, 8000, '{"A+": 1.0, "A": 0.85, "B": 0.70, "C": 0.50, "D": 0.30}', 5, true),
            ('pr-tablet-any-0-2', 'Tablet 0-2 years', 'tablet', NULL, 0, 2, 15000, '{"A+": 1.0, "A": 0.85, "B": 0.70, "C": 0.50, "D": 0.30}', 5, true)
    """)


def downgrade() -> None:
    op.drop_index(op.f('ix_condition_modifiers_id'), table_name='condition_modifiers')
    op.drop_table('condition_modifiers')
    
    op.drop_index(op.f('ix_pricing_rules_is_active'), table_name='pricing_rules')
    op.drop_index(op.f('ix_pricing_rules_brand'), table_name='pricing_rules')
    op.drop_index(op.f('ix_pricing_rules_category'), table_name='pricing_rules')
    op.drop_index(op.f('ix_pricing_rules_id'), table_name='pricing_rules')
    op.drop_table('pricing_rules')

