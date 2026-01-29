"""create batches table

Revision ID: 006_batches
Revises: 005_users
Create Date: 2026-01-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '006_batches'
down_revision: Union[str, None] = '005_users'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('batches',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('enterprise_id', sa.String(), nullable=False),
        sa.Column('branch_id', sa.String(), nullable=True),
        sa.Column('created_by', sa.String(), nullable=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(), server_default='draft', nullable=False),
        # Computed Metrics
        sa.Column('asset_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('accepted_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('rejected_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('pending_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('estimated_value', sa.Numeric(precision=10, scale=2), server_default='0', nullable=False),
        sa.Column('total_payout', sa.Numeric(precision=10, scale=2), server_default='0', nullable=False),
        # Pickup Details
        sa.Column('pickup_location_override', sa.Text(), nullable=True),
        sa.Column('preferred_pickup_date', sa.Date(), nullable=True),
        sa.Column('preferred_pickup_slot', sa.String(), nullable=True),
        sa.Column('pickup_priority', sa.String(), server_default='normal', nullable=False),
        sa.Column('it_admin_notes', sa.Text(), nullable=True),
        sa.Column('logistics_instructions', sa.Text(), nullable=True),
        # Approval Workflow
        sa.Column('requires_approval', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('submitted_for_approval_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('approved_by', sa.String(), nullable=True),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('org_admin_notes', sa.Text(), nullable=True),
        sa.Column('rejected_by', sa.String(), nullable=True),
        sa.Column('rejected_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        # EPR Tracking
        sa.Column('epr_certificate_id', sa.String(), nullable=True),
        sa.Column('epr_status', sa.String(), nullable=True),
        # Timestamps
        sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        # Audit fields
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Timestamp when record was created'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, comment='Timestamp when record was last updated'),
        sa.Column('updated_by', sa.String(), nullable=True, comment='User ID who last updated the record'),
        # Foreign keys
        sa.ForeignKeyConstraint(['approved_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['enterprise_id'], ['enterprises.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['rejected_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_batches_branch_id'), 'batches', ['branch_id'], unique=False)
    op.create_index(op.f('ix_batches_enterprise_id'), 'batches', ['enterprise_id'], unique=False)
    op.create_index(op.f('ix_batches_id'), 'batches', ['id'], unique=False)
    op.create_index(op.f('ix_batches_status'), 'batches', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_batches_status'), table_name='batches')
    op.drop_index(op.f('ix_batches_id'), table_name='batches')
    op.drop_index(op.f('ix_batches_enterprise_id'), table_name='batches')
    op.drop_index(op.f('ix_batches_branch_id'), table_name='batches')
    op.drop_table('batches')

