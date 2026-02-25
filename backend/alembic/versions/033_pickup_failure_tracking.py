"""Add failure tracking columns to pickup_requests

Supports the pickup failure flow: failure_reason, attempt_count, failed_at,
and per-asset outcome tracking for partial pickups (picked_asset_ids, failed_asset_ids).

Revision ID: 033_pickup_failure_tracking
Revises: 032_payout_batch_unique
Create Date: 2026-02-24
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "033_pickup_failure_tracking"
down_revision: Union[str, None] = "032_payout_batch_unique"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "pickup_requests",
        sa.Column("failure_reason", sa.String(), nullable=True),
    )
    op.add_column(
        "pickup_requests",
        sa.Column(
            "attempt_count",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
    )
    op.add_column(
        "pickup_requests",
        sa.Column("failed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "pickup_requests",
        sa.Column("picked_asset_ids", postgresql.ARRAY(sa.String()), nullable=True),
    )
    op.add_column(
        "pickup_requests",
        sa.Column("failed_asset_ids", postgresql.ARRAY(sa.String()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("pickup_requests", "failed_asset_ids")
    op.drop_column("pickup_requests", "picked_asset_ids")
    op.drop_column("pickup_requests", "failed_at")
    op.drop_column("pickup_requests", "attempt_count")
    op.drop_column("pickup_requests", "failure_reason")
