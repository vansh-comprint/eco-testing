"""create branches table

Revision ID: 002_branches
Revises: 001_enterprises
Create Date: 2026-01-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '002_branches'
down_revision: Union[str, None] = '001_enterprises'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('branches',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('enterprise_id', sa.String(), nullable=False),
        sa.Column('branch_name', sa.String(), nullable=False),
        sa.Column('branch_code', sa.String(), nullable=False),
        sa.Column('address_line1', sa.String(), nullable=False),
        sa.Column('address_line2', sa.String(), nullable=True),
        sa.Column('city', sa.String(), nullable=False),
        sa.Column('state', sa.String(), nullable=False),
        sa.Column('pin_code', sa.String(), nullable=False),
        sa.Column('pickup_point_description', sa.Text(), nullable=True),
        sa.Column('site_contact_person', sa.String(), nullable=True),
        sa.Column('site_contact_phone', sa.String(), nullable=True),
        sa.Column('operating_hours', sa.String(), nullable=True),
        sa.Column('special_instructions', sa.Text(), nullable=True),
        sa.Column('status', sa.String(), server_default='active', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Timestamp when record was created'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, comment='Timestamp when record was last updated'),
        sa.Column('created_by', sa.String(), nullable=True, comment='User ID who created the record'),
        sa.Column('updated_by', sa.String(), nullable=True, comment='User ID who last updated the record'),
        sa.ForeignKeyConstraint(['enterprise_id'], ['enterprises.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_branches_enterprise_id'), 'branches', ['enterprise_id'], unique=False)
    op.create_index(op.f('ix_branches_id'), 'branches', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_branches_id'), table_name='branches')
    op.drop_index(op.f('ix_branches_enterprise_id'), table_name='branches')
    op.drop_table('branches')

