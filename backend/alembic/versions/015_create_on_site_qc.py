"""create on_site_qc table

Revision ID: 015_on_site_qc
Revises: 014_disputes
Create Date: 2026-01-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '015_on_site_qc'
down_revision: Union[str, None] = '014_disputes'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('on_site_qc',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('asset_id', sa.String(), nullable=False),
        sa.Column('pickup_request_id', sa.String(), nullable=False),
        sa.Column('performed_by_user_id', sa.String(), nullable=True),
        # QC Results
        sa.Column('status', sa.String(), nullable=False),
        # Checks
        sa.Column('physical_condition_ok', sa.Boolean(), nullable=False),
        sa.Column('powers_on', sa.Boolean(), nullable=False),
        sa.Column('screen_ok', sa.Boolean(), nullable=False),
        sa.Column('keyboard_ok', sa.Boolean(), nullable=False),
        sa.Column('ports_ok', sa.Boolean(), nullable=False),
        # Evidence
        sa.Column('photo_urls', sa.ARRAY(sa.String()), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        # Timestamps
        sa.Column('performed_at', sa.DateTime(timezone=True), nullable=False),
        # Additional Data
        sa.Column('extra_data', sa.JSON(), nullable=True),
        # Audit fields
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Timestamp when record was created'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, comment='Timestamp when record was last updated'),
        sa.Column('created_by', sa.String(), nullable=True, comment='User ID who created the record'),
        sa.Column('updated_by', sa.String(), nullable=True, comment='User ID who last updated the record'),
        # Foreign keys
        sa.ForeignKeyConstraint(['asset_id'], ['assets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['performed_by_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['pickup_request_id'], ['pickup_requests.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_on_site_qc_asset_id'), 'on_site_qc', ['asset_id'], unique=False)
    op.create_index(op.f('ix_on_site_qc_id'), 'on_site_qc', ['id'], unique=False)
    op.create_index(op.f('ix_on_site_qc_performed_by_user_id'), 'on_site_qc', ['performed_by_user_id'], unique=False)
    op.create_index(op.f('ix_on_site_qc_pickup_request_id'), 'on_site_qc', ['pickup_request_id'], unique=False)
    op.create_index(op.f('ix_on_site_qc_status'), 'on_site_qc', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_on_site_qc_status'), table_name='on_site_qc')
    op.drop_index(op.f('ix_on_site_qc_pickup_request_id'), table_name='on_site_qc')
    op.drop_index(op.f('ix_on_site_qc_performed_by_user_id'), table_name='on_site_qc')
    op.drop_index(op.f('ix_on_site_qc_id'), table_name='on_site_qc')
    op.drop_index(op.f('ix_on_site_qc_asset_id'), table_name='on_site_qc')
    op.drop_table('on_site_qc')

