"""create pickup_locations table

Revision ID: 003_pickup_locations
Revises: 002_branches
Create Date: 2026-01-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '003_pickup_locations'
down_revision: Union[str, None] = '002_branches'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('pickup_locations',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('enterprise_id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('address', sa.Text(), nullable=False),
        sa.Column('city', sa.String(), nullable=True),
        sa.Column('state', sa.String(), nullable=True),
        sa.Column('pin_code', sa.String(), nullable=True),
        sa.Column('country', sa.String(), server_default='India', nullable=False),
        sa.Column('contact_person', sa.String(), nullable=True),
        sa.Column('contact_phone', sa.String(), nullable=True),
        sa.Column('operating_hours', sa.String(), nullable=True),
        sa.Column('special_instructions', sa.Text(), nullable=True),
        sa.Column('is_default', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Timestamp when record was created'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, comment='Timestamp when record was last updated'),
        sa.Column('created_by', sa.String(), nullable=True, comment='User ID who created the record'),
        sa.Column('updated_by', sa.String(), nullable=True, comment='User ID who last updated the record'),
        sa.ForeignKeyConstraint(['enterprise_id'], ['enterprises.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_pickup_locations_enterprise_id'), 'pickup_locations', ['enterprise_id'], unique=False)
    op.create_index(op.f('ix_pickup_locations_id'), 'pickup_locations', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_pickup_locations_id'), table_name='pickup_locations')
    op.drop_index(op.f('ix_pickup_locations_enterprise_id'), table_name='pickup_locations')
    op.drop_table('pickup_locations')

