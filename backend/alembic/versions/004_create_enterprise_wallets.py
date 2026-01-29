"""create enterprise_wallets table

Revision ID: 004_enterprise_wallets
Revises: 003_pickup_locations
Create Date: 2026-01-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '004_enterprise_wallets'
down_revision: Union[str, None] = '003_pickup_locations'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('enterprise_wallets',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('enterprise_id', sa.String(), nullable=False),
        sa.Column('balance', sa.Numeric(precision=12, scale=2), server_default='0', nullable=False),
        sa.Column('credit_limit', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('currency', sa.String(), server_default='INR', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Timestamp when record was created'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, comment='Timestamp when record was last updated'),
        sa.Column('created_by', sa.String(), nullable=True, comment='User ID who created the record'),
        sa.Column('updated_by', sa.String(), nullable=True, comment='User ID who last updated the record'),
        sa.ForeignKeyConstraint(['enterprise_id'], ['enterprises.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_enterprise_wallets_enterprise_id'), 'enterprise_wallets', ['enterprise_id'], unique=True)
    op.create_index(op.f('ix_enterprise_wallets_id'), 'enterprise_wallets', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_enterprise_wallets_id'), table_name='enterprise_wallets')
    op.drop_index(op.f('ix_enterprise_wallets_enterprise_id'), table_name='enterprise_wallets')
    op.drop_table('enterprise_wallets')

