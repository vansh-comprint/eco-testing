"""Add partial unique index on payouts.batch_id for active payouts

Revision ID: 032_payout_batch_unique
Revises: 031_pickup_started_at
"""
from typing import Sequence, Union
from alembic import op

revision: str = "032_payout_batch_unique"
down_revision: Union[str, None] = "031_pickup_started_at"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE UNIQUE INDEX ix_payouts_batch_id_active
        ON payouts (batch_id)
        WHERE batch_id IS NOT NULL
          AND status NOT IN ('failed', 'cancelled')
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_payouts_batch_id_active")
