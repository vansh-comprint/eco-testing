"""create epr_certificates table

Revision ID: 017_epr_certificates
Revises: 016_audit_logs
Create Date: 2026-01-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '017_epr_certificates'
down_revision: Union[str, None] = '016_audit_logs'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('epr_certificates',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('enterprise_id', sa.String(), nullable=False),
        sa.Column('batch_id', sa.String(), nullable=True),
        # Certificate Details
        sa.Column('certificate_number', sa.String(), nullable=False),
        sa.Column('status', sa.String(), server_default='pending', nullable=False),
        # Dates
        sa.Column('issue_date', sa.Date(), nullable=True),
        sa.Column('expiry_date', sa.Date(), nullable=True),
        # Compliance Details
        sa.Column('total_weight_kg', sa.Numeric(precision=10, scale=3), nullable=False),
        sa.Column('recycled_weight_kg', sa.Numeric(precision=10, scale=3), nullable=True),
        sa.Column('disposed_weight_kg', sa.Numeric(precision=10, scale=3), nullable=True),
        # Asset IDs
        sa.Column('asset_ids', sa.ARRAY(sa.String()), nullable=True),
        # Recycler Information
        sa.Column('recycler_partner_id', sa.String(), nullable=True),
        sa.Column('recycler_name', sa.String(), nullable=True),
        sa.Column('recycler_license_number', sa.String(), nullable=True),
        # Document
        sa.Column('certificate_url', sa.String(), nullable=True),
        # Additional Data
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('extra_data', sa.JSON(), nullable=True),
        # Audit fields
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Timestamp when record was created'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, comment='Timestamp when record was last updated'),
        sa.Column('created_by', sa.String(), nullable=True, comment='User ID who created the record'),
        sa.Column('updated_by', sa.String(), nullable=True, comment='User ID who last updated the record'),
        # Foreign keys
        sa.ForeignKeyConstraint(['batch_id'], ['batches.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['enterprise_id'], ['enterprises.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_epr_certificates_batch_id'), 'epr_certificates', ['batch_id'], unique=False)
    op.create_index(op.f('ix_epr_certificates_certificate_number'), 'epr_certificates', ['certificate_number'], unique=True)
    op.create_index(op.f('ix_epr_certificates_enterprise_id'), 'epr_certificates', ['enterprise_id'], unique=False)
    op.create_index(op.f('ix_epr_certificates_id'), 'epr_certificates', ['id'], unique=False)
    op.create_index(op.f('ix_epr_certificates_status'), 'epr_certificates', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_epr_certificates_status'), table_name='epr_certificates')
    op.drop_index(op.f('ix_epr_certificates_id'), table_name='epr_certificates')
    op.drop_index(op.f('ix_epr_certificates_enterprise_id'), table_name='epr_certificates')
    op.drop_index(op.f('ix_epr_certificates_certificate_number'), table_name='epr_certificates')
    op.drop_index(op.f('ix_epr_certificates_batch_id'), table_name='epr_certificates')
    op.drop_table('epr_certificates')

