"""add company_size column to enterprises table

Revision ID: 023_add_company_size
Revises: 022_enhance_audit_logs
Create Date: 2026-01-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '023_add_company_size'
down_revision: Union[str, None] = '022_enhance_audit_logs'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('enterprises', sa.Column('company_size', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('enterprises', 'company_size')
