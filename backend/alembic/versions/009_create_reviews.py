"""create remote_reviews and facility_qc tables

Revision ID: 009_reviews
Revises: 008_submissions
Create Date: 2026-01-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '009_reviews'
down_revision: Union[str, None] = '008_submissions'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create remote_reviews table
    op.create_table('remote_reviews',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('asset_id', sa.String(), nullable=False),
        sa.Column('submission_id', sa.String(), nullable=False),
        sa.Column('reviewer_id', sa.String(), nullable=True),
        # Review Details
        sa.Column('decision', sa.String(), nullable=False),
        sa.Column('grade', sa.String(), nullable=True),
        sa.Column('estimated_value', sa.Numeric(precision=10, scale=2), nullable=True),
        # Notes
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('checklist_results', sa.JSON(), nullable=True),
        # Timestamp
        sa.Column('reviewed_at', sa.DateTime(timezone=True), server_default='NOW()', nullable=False),
        # Audit fields
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Timestamp when record was created'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, comment='Timestamp when record was last updated'),
        sa.Column('created_by', sa.String(), nullable=True, comment='User ID who created the record'),
        sa.Column('updated_by', sa.String(), nullable=True, comment='User ID who last updated the record'),
        # Foreign keys
        sa.ForeignKeyConstraint(['asset_id'], ['assets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reviewer_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['submission_id'], ['submissions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_remote_reviews_asset_id'), 'remote_reviews', ['asset_id'], unique=True)
    op.create_index(op.f('ix_remote_reviews_id'), 'remote_reviews', ['id'], unique=False)
    op.create_index(op.f('ix_remote_reviews_reviewer_id'), 'remote_reviews', ['reviewer_id'], unique=False)
    op.create_index(op.f('ix_remote_reviews_submission_id'), 'remote_reviews', ['submission_id'], unique=False)

    # Create facility_qc table
    op.create_table('facility_qc',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('asset_id', sa.String(), nullable=False),
        sa.Column('technician_id', sa.String(), nullable=True),
        # QC Results
        sa.Column('decision', sa.String(), nullable=False),
        sa.Column('grade', sa.String(), nullable=True),
        sa.Column('final_value', sa.Numeric(precision=10, scale=2), nullable=True),
        # Detailed Checks
        sa.Column('functional_tests', sa.JSON(), nullable=True),
        sa.Column('cosmetic_assessment', sa.JSON(), nullable=True),
        sa.Column('hardware_tests', sa.JSON(), nullable=True),
        sa.Column('photos', sa.JSON(), nullable=True),
        # Notes
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        # Timestamp
        sa.Column('qc_completed_at', sa.DateTime(timezone=True), server_default='NOW()', nullable=False),
        # Audit fields
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Timestamp when record was created'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, comment='Timestamp when record was last updated'),
        sa.Column('created_by', sa.String(), nullable=True, comment='User ID who created the record'),
        sa.Column('updated_by', sa.String(), nullable=True, comment='User ID who last updated the record'),
        # Foreign keys
        sa.ForeignKeyConstraint(['asset_id'], ['assets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['technician_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_facility_qc_asset_id'), 'facility_qc', ['asset_id'], unique=True)
    op.create_index(op.f('ix_facility_qc_id'), 'facility_qc', ['id'], unique=False)
    op.create_index(op.f('ix_facility_qc_technician_id'), 'facility_qc', ['technician_id'], unique=False)


def downgrade() -> None:
    # Drop facility_qc
    op.drop_index(op.f('ix_facility_qc_technician_id'), table_name='facility_qc')
    op.drop_index(op.f('ix_facility_qc_id'), table_name='facility_qc')
    op.drop_index(op.f('ix_facility_qc_asset_id'), table_name='facility_qc')
    op.drop_table('facility_qc')
    # Drop remote_reviews
    op.drop_index(op.f('ix_remote_reviews_submission_id'), table_name='remote_reviews')
    op.drop_index(op.f('ix_remote_reviews_reviewer_id'), table_name='remote_reviews')
    op.drop_index(op.f('ix_remote_reviews_id'), table_name='remote_reviews')
    op.drop_index(op.f('ix_remote_reviews_asset_id'), table_name='remote_reviews')
    op.drop_table('remote_reviews')

