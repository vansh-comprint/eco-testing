"""create disputes table

Revision ID: 014_disputes
Revises: 013_notifications
Create Date: 2026-01-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '014_disputes'
down_revision: Union[str, None] = '013_notifications'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('disputes',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('asset_id', sa.String(), nullable=False),
        sa.Column('raised_by_user_id', sa.String(), nullable=True),
        sa.Column('assigned_to_user_id', sa.String(), nullable=True),
        # Dispute Details
        sa.Column('dispute_type', sa.String(), nullable=False),
        sa.Column('status', sa.String(), server_default='open', nullable=False),
        # Content
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('evidence_urls', sa.ARRAY(sa.String()), nullable=True),
        # Resolution
        sa.Column('resolution', sa.Text(), nullable=True),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('resolved_by_user_id', sa.String(), nullable=True),
        # Additional Data
        sa.Column('extra_data', sa.JSON(), nullable=True),
        # Audit fields
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Timestamp when record was created'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, comment='Timestamp when record was last updated'),
        sa.Column('created_by', sa.String(), nullable=True, comment='User ID who created the record'),
        sa.Column('updated_by', sa.String(), nullable=True, comment='User ID who last updated the record'),
        # Foreign keys
        sa.ForeignKeyConstraint(['asset_id'], ['assets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assigned_to_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['raised_by_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['resolved_by_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_disputes_asset_id'), 'disputes', ['asset_id'], unique=False)
    op.create_index(op.f('ix_disputes_assigned_to_user_id'), 'disputes', ['assigned_to_user_id'], unique=False)
    op.create_index(op.f('ix_disputes_dispute_type'), 'disputes', ['dispute_type'], unique=False)
    op.create_index(op.f('ix_disputes_id'), 'disputes', ['id'], unique=False)
    op.create_index(op.f('ix_disputes_raised_by_user_id'), 'disputes', ['raised_by_user_id'], unique=False)
    op.create_index(op.f('ix_disputes_status'), 'disputes', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_disputes_status'), table_name='disputes')
    op.drop_index(op.f('ix_disputes_raised_by_user_id'), table_name='disputes')
    op.drop_index(op.f('ix_disputes_id'), table_name='disputes')
    op.drop_index(op.f('ix_disputes_dispute_type'), table_name='disputes')
    op.drop_index(op.f('ix_disputes_assigned_to_user_id'), table_name='disputes')
    op.drop_index(op.f('ix_disputes_asset_id'), table_name='disputes')
    op.drop_table('disputes')

