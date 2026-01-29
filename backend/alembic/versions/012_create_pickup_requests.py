"""create pickup_requests table

Revision ID: 012_pickup_requests
Revises: 011_credit_transactions
Create Date: 2026-01-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '012_pickup_requests'
down_revision: Union[str, None] = '011_credit_transactions'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('pickup_requests',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('enterprise_id', sa.String(), nullable=False),
        sa.Column('location_id', sa.String(), nullable=False),
        sa.Column('batch_id', sa.String(), nullable=True),
        # Logistics assignment
        sa.Column('logistics_admin_id', sa.String(), nullable=True),
        sa.Column('logistics_user_id', sa.String(), nullable=True),
        # Asset Information
        sa.Column('asset_ids', sa.ARRAY(sa.String()), nullable=False),
        sa.Column('assets', sa.JSON(), server_default='[]', nullable=False),
        # Scheduling
        sa.Column('preferred_date', sa.Date(), nullable=True),
        sa.Column('preferred_time_slot', sa.String(), nullable=False),
        sa.Column('scheduled_date', sa.DateTime(timezone=True), nullable=True),
        # Assignment Tracking
        sa.Column('assigned_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('assigned_by_id', sa.String(), nullable=True),
        # Status
        sa.Column('status', sa.String(), server_default='pending', nullable=False),
        # Notes
        sa.Column('special_instructions', sa.Text(), nullable=True),
        sa.Column('logistics_notes', sa.Text(), nullable=True),
        # Completion
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('proof_of_pickup', sa.JSON(), nullable=True),
        # Audit fields
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Timestamp when record was created'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, comment='Timestamp when record was last updated'),
        sa.Column('created_by', sa.String(), nullable=True, comment='User ID who created the record'),
        sa.Column('updated_by', sa.String(), nullable=True, comment='User ID who last updated the record'),
        # Foreign keys
        sa.ForeignKeyConstraint(['assigned_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['batch_id'], ['batches.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['enterprise_id'], ['enterprises.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['location_id'], ['pickup_locations.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['logistics_admin_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['logistics_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_pickup_requests_assigned_by_id'), 'pickup_requests', ['assigned_by_id'], unique=False)
    op.create_index(op.f('ix_pickup_requests_batch_id'), 'pickup_requests', ['batch_id'], unique=False)
    op.create_index(op.f('ix_pickup_requests_enterprise_id'), 'pickup_requests', ['enterprise_id'], unique=False)
    op.create_index(op.f('ix_pickup_requests_id'), 'pickup_requests', ['id'], unique=False)
    op.create_index(op.f('ix_pickup_requests_location_id'), 'pickup_requests', ['location_id'], unique=False)
    op.create_index(op.f('ix_pickup_requests_logistics_admin_id'), 'pickup_requests', ['logistics_admin_id'], unique=False)
    op.create_index(op.f('ix_pickup_requests_logistics_user_id'), 'pickup_requests', ['logistics_user_id'], unique=False)
    op.create_index(op.f('ix_pickup_requests_status'), 'pickup_requests', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_pickup_requests_status'), table_name='pickup_requests')
    op.drop_index(op.f('ix_pickup_requests_logistics_user_id'), table_name='pickup_requests')
    op.drop_index(op.f('ix_pickup_requests_logistics_admin_id'), table_name='pickup_requests')
    op.drop_index(op.f('ix_pickup_requests_location_id'), table_name='pickup_requests')
    op.drop_index(op.f('ix_pickup_requests_id'), table_name='pickup_requests')
    op.drop_index(op.f('ix_pickup_requests_enterprise_id'), table_name='pickup_requests')
    op.drop_index(op.f('ix_pickup_requests_batch_id'), table_name='pickup_requests')
    op.drop_index(op.f('ix_pickup_requests_assigned_by_id'), table_name='pickup_requests')
    op.drop_table('pickup_requests')

