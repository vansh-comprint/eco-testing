"""enhance audit_logs table with additional columns for state tracking

Revision ID: 022_enhance_audit_logs
Revises: 021_make_submission_id_nullable
Create Date: 2026-01-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '022_enhance_audit_logs'
down_revision: Union[str, None] = '021_make_submission_id_nullable'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new columns for enhanced audit logging
    op.add_column('audit_logs', sa.Column('user_email', sa.String(), nullable=True))
    op.add_column('audit_logs', sa.Column('user_role', sa.String(), nullable=True))
    op.add_column('audit_logs', sa.Column('details', sa.Text(), nullable=True))
    op.add_column('audit_logs', sa.Column('timestamp', sa.DateTime(timezone=True), nullable=True))
    op.add_column('audit_logs', sa.Column('enterprise_id', sa.String(), nullable=True))
    op.add_column('audit_logs', sa.Column('branch_id', sa.String(), nullable=True))

    # Add indexes for common query patterns
    op.create_index(op.f('ix_audit_logs_enterprise_id'), 'audit_logs', ['enterprise_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_timestamp'), 'audit_logs', ['timestamp'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_audit_logs_timestamp'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_enterprise_id'), table_name='audit_logs')
    op.drop_column('audit_logs', 'branch_id')
    op.drop_column('audit_logs', 'enterprise_id')
    op.drop_column('audit_logs', 'timestamp')
    op.drop_column('audit_logs', 'details')
    op.drop_column('audit_logs', 'user_role')
    op.drop_column('audit_logs', 'user_email')
