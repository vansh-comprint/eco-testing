"""create submissions table

Revision ID: 008_submissions
Revises: 007_assets
Create Date: 2026-01-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '008_submissions'
down_revision: Union[str, None] = '007_assets'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('submissions',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('asset_id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        # Device Confirmation
        sa.Column('device_confirmed', sa.Boolean(), nullable=False),
        # Photos and Checklists
        sa.Column('photos', sa.JSON(), server_default='{}', nullable=False),
        sa.Column('functional_checks', sa.JSON(), server_default='{}', nullable=False),
        sa.Column('cosmetic_checklist', sa.JSON(), nullable=True),
        sa.Column('accessories', sa.JSON(), nullable=True),
        # Location & Declaration
        sa.Column('location', sa.JSON(), nullable=True),
        sa.Column('declaration', sa.JSON(), nullable=False),
        # Timestamp
        sa.Column('submitted_at', sa.DateTime(timezone=True), server_default='NOW()', nullable=False),
        # Audit fields
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Timestamp when record was created'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, comment='Timestamp when record was last updated'),
        sa.Column('created_by', sa.String(), nullable=True, comment='User ID who created the record'),
        sa.Column('updated_by', sa.String(), nullable=True, comment='User ID who last updated the record'),
        # Foreign keys
        sa.ForeignKeyConstraint(['asset_id'], ['assets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_submissions_asset_id'), 'submissions', ['asset_id'], unique=True)
    op.create_index(op.f('ix_submissions_id'), 'submissions', ['id'], unique=False)
    op.create_index(op.f('ix_submissions_user_id'), 'submissions', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_submissions_user_id'), table_name='submissions')
    op.drop_index(op.f('ix_submissions_id'), table_name='submissions')
    op.drop_index(op.f('ix_submissions_asset_id'), table_name='submissions')
    op.drop_table('submissions')

