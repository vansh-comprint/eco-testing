"""create payouts table

Revision ID: 010_payouts
Revises: 009_reviews
Create Date: 2026-01-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '010_payouts'
down_revision: Union[str, None] = '009_reviews'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('payouts',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('enterprise_id', sa.String(), nullable=False),
        sa.Column('batch_id', sa.String(), nullable=True),
        # Payout Details
        sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('status', sa.String(), server_default='pending', nullable=False),
        sa.Column('method', sa.String(), nullable=False),
        # Payment Details
        sa.Column('bank_account_number', sa.String(), nullable=True),
        sa.Column('bank_ifsc_code', sa.String(), nullable=True),
        sa.Column('upi_id', sa.String(), nullable=True),
        # Processing timestamps
        sa.Column('initiated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('failed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('failure_reason', sa.Text(), nullable=True),
        # Reference
        sa.Column('transaction_reference', sa.String(), nullable=True),
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
    op.create_index(op.f('ix_payouts_batch_id'), 'payouts', ['batch_id'], unique=False)
    op.create_index(op.f('ix_payouts_enterprise_id'), 'payouts', ['enterprise_id'], unique=False)
    op.create_index(op.f('ix_payouts_id'), 'payouts', ['id'], unique=False)
    op.create_index(op.f('ix_payouts_status'), 'payouts', ['status'], unique=False)
    op.create_index(op.f('ix_payouts_transaction_reference'), 'payouts', ['transaction_reference'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_payouts_transaction_reference'), table_name='payouts')
    op.drop_index(op.f('ix_payouts_status'), table_name='payouts')
    op.drop_index(op.f('ix_payouts_id'), table_name='payouts')
    op.drop_index(op.f('ix_payouts_enterprise_id'), table_name='payouts')
    op.drop_index(op.f('ix_payouts_batch_id'), table_name='payouts')
    op.drop_table('payouts')

