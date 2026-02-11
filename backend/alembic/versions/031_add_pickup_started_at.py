"""Add started_at column to pickup_requests

Track when a logistics user actually starts a pickup so admins
can see activity timing and identify stalled pickups.

Revision ID: 031_pickup_started_at
Revises: 030_serial_enterprise
Create Date: 2026-02-11
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "031_pickup_started_at"
down_revision: Union[str, None] = "030_serial_enterprise"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "pickup_requests",
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("pickup_requests", "started_at")
