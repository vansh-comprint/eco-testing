"""create assets table

Revision ID: 007_assets
Revises: 006_batches
Create Date: 2026-01-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '007_assets'
down_revision: Union[str, None] = '006_batches'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('assets',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('enterprise_id', sa.String(), nullable=False),
        sa.Column('branch_id', sa.String(), nullable=True),
        sa.Column('batch_id', sa.String(), nullable=True),
        sa.Column('assigned_to_user_id', sa.String(), nullable=True),
        # Device Identification
        sa.Column('serial_number', sa.String(), nullable=False),
        sa.Column('brand', sa.String(), nullable=False),
        sa.Column('model', sa.String(), nullable=False),
        sa.Column('asset_tag', sa.String(), nullable=True),
        # Specifications
        sa.Column('specs', sa.JSON(), nullable=True),
        sa.Column('purchase_date', sa.Date(), nullable=True),
        sa.Column('assigned_at', sa.DateTime(timezone=True), nullable=True),
        # Status & Grading
        sa.Column('status', sa.String(), server_default='pending_assignment', nullable=False),
        sa.Column('grade', sa.String(), nullable=True),
        # Pricing
        sa.Column('base_price', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('final_price', sa.Numeric(precision=10, scale=2), nullable=True),
        # Treatment/EPR
        sa.Column('treatment_outcome', sa.String(), nullable=True),
        sa.Column('treatment_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('recycler_partner_id', sa.String(), nullable=True),
        sa.Column('weight_kg', sa.Numeric(precision=8, scale=3), nullable=True),
        sa.Column('epr_certificate_id', sa.String(), nullable=True),
        # QC Data
        sa.Column('qc_report', sa.JSON(), nullable=True),
        # Audit fields
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Timestamp when record was created'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, comment='Timestamp when record was last updated'),
        sa.Column('created_by', sa.String(), nullable=True, comment='User ID who created the record'),
        sa.Column('updated_by', sa.String(), nullable=True, comment='User ID who last updated the record'),
        # Foreign keys
        sa.ForeignKeyConstraint(['assigned_to_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['batch_id'], ['batches.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['enterprise_id'], ['enterprises.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_assets_assigned_to_user_id'), 'assets', ['assigned_to_user_id'], unique=False)
    op.create_index(op.f('ix_assets_batch_id'), 'assets', ['batch_id'], unique=False)
    op.create_index(op.f('ix_assets_branch_id'), 'assets', ['branch_id'], unique=False)
    op.create_index(op.f('ix_assets_enterprise_id'), 'assets', ['enterprise_id'], unique=False)
    op.create_index(op.f('ix_assets_id'), 'assets', ['id'], unique=False)
    op.create_index(op.f('ix_assets_serial_number'), 'assets', ['serial_number'], unique=True)
    op.create_index(op.f('ix_assets_status'), 'assets', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_assets_status'), table_name='assets')
    op.drop_index(op.f('ix_assets_serial_number'), table_name='assets')
    op.drop_index(op.f('ix_assets_id'), table_name='assets')
    op.drop_index(op.f('ix_assets_enterprise_id'), table_name='assets')
    op.drop_index(op.f('ix_assets_branch_id'), table_name='assets')
    op.drop_index(op.f('ix_assets_batch_id'), table_name='assets')
    op.drop_index(op.f('ix_assets_assigned_to_user_id'), table_name='assets')
    op.drop_table('assets')

