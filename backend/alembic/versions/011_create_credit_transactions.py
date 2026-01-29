"""create credit_transactions table

Revision ID: 011_credit_transactions
Revises: 010_payouts
Create Date: 2026-01-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '011_credit_transactions'
down_revision: Union[str, None] = '010_payouts'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('credit_transactions',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('wallet_id', sa.String(), nullable=False),
        sa.Column('payout_id', sa.String(), nullable=True),
        # Transaction Details
        sa.Column('transaction_type', sa.String(), nullable=False),
        sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('balance_before', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('balance_after', sa.Numeric(precision=12, scale=2), nullable=False),
        # Additional Data
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('reference_id', sa.String(), nullable=True),
        sa.Column('extra_data', sa.JSON(), nullable=True),
        # Audit fields
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Timestamp when record was created'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, comment='Timestamp when record was last updated'),
        sa.Column('created_by', sa.String(), nullable=True, comment='User ID who created the record'),
        sa.Column('updated_by', sa.String(), nullable=True, comment='User ID who last updated the record'),
        # Foreign keys
        sa.ForeignKeyConstraint(['payout_id'], ['payouts.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['wallet_id'], ['enterprise_wallets.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_credit_transactions_id'), 'credit_transactions', ['id'], unique=False)
    op.create_index(op.f('ix_credit_transactions_payout_id'), 'credit_transactions', ['payout_id'], unique=False)
    op.create_index(op.f('ix_credit_transactions_reference_id'), 'credit_transactions', ['reference_id'], unique=False)
    op.create_index(op.f('ix_credit_transactions_transaction_type'), 'credit_transactions', ['transaction_type'], unique=False)
    op.create_index(op.f('ix_credit_transactions_wallet_id'), 'credit_transactions', ['wallet_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_credit_transactions_wallet_id'), table_name='credit_transactions')
    op.drop_index(op.f('ix_credit_transactions_transaction_type'), table_name='credit_transactions')
    op.drop_index(op.f('ix_credit_transactions_reference_id'), table_name='credit_transactions')
    op.drop_index(op.f('ix_credit_transactions_payout_id'), table_name='credit_transactions')
    op.drop_index(op.f('ix_credit_transactions_id'), table_name='credit_transactions')
    op.drop_table('credit_transactions')

