"""create enterprise_applications table

Revision ID: 019_enterprise_applications
Revises: 018_constraints
Create Date: 2026-01-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '019_enterprise_applications'
down_revision: Union[str, None] = '018_constraints'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('enterprise_applications',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('application_ref', sa.String(), nullable=True),
        sa.Column('company_name', sa.String(255), nullable=False),
        sa.Column('legal_name', sa.String(255), nullable=True),
        sa.Column('gst_number', sa.String(15), nullable=True),
        sa.Column('pan_number', sa.String(10), nullable=True),
        sa.Column('registered_address', sa.Text(), nullable=True),
        sa.Column('industry_type', sa.String(100), nullable=True),
        sa.Column('company_size', sa.String(50), nullable=True),
        # Org Admin Details
        sa.Column('org_admin_name', sa.String(255), nullable=False),
        sa.Column('org_admin_email', sa.String(255), nullable=False),
        sa.Column('org_admin_phone', sa.String(20), nullable=True),
        sa.Column('org_admin_designation', sa.String(100), nullable=True),
        sa.Column('password_hash', sa.String(255), nullable=True),
        # Documents
        sa.Column('doc_gst_certificate', sa.String(500), nullable=True),
        sa.Column('doc_pan_card', sa.String(500), nullable=True),
        sa.Column('doc_incorporation_cert', sa.String(500), nullable=True),
        sa.Column('doc_signatory_id', sa.String(500), nullable=True),
        sa.Column('doc_address_proof', sa.String(500), nullable=True),
        sa.Column('doc_company_logo', sa.String(500), nullable=True),
        # Review Status
        sa.Column('status', sa.String(50), server_default='pending', nullable=False),
        sa.Column('reviewed_by', sa.String(), nullable=True),
        sa.Column('reviewed_at', sa.String(), nullable=True),
        sa.Column('review_notes', sa.Text(), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('enterprise_id', sa.String(), nullable=True),
        # Audit columns
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.String(), nullable=True),
        sa.Column('updated_by', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['enterprise_id'], ['enterprises.id'], ondelete='SET NULL'),
    )
    op.create_index(op.f('ix_enterprise_applications_id'), 'enterprise_applications', ['id'], unique=False)
    op.create_index(op.f('ix_enterprise_applications_application_ref'), 'enterprise_applications', ['application_ref'], unique=True)
    op.create_index(op.f('ix_enterprise_applications_org_admin_email'), 'enterprise_applications', ['org_admin_email'], unique=False)
    op.create_index(op.f('ix_enterprise_applications_status'), 'enterprise_applications', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_enterprise_applications_status'), table_name='enterprise_applications')
    op.drop_index(op.f('ix_enterprise_applications_org_admin_email'), table_name='enterprise_applications')
    op.drop_index(op.f('ix_enterprise_applications_application_ref'), table_name='enterprise_applications')
    op.drop_index(op.f('ix_enterprise_applications_id'), table_name='enterprise_applications')
    op.drop_table('enterprise_applications')

