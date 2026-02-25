"""Add unique constraint to on_site_qc and change FK cascade to SET NULL

Prevents duplicate QC records for the same (asset, pickup) pair.
Changes pickup_request_id FK from CASCADE to SET NULL so QC records
are preserved as forensic evidence when a pickup is deleted/cancelled.
Also makes pickup_request_id and keyboard_ok nullable to match the ORM model.

Revision ID: 034_onsite_qc_constraints
Revises: 033_pickup_failure_tracking
Create Date: 2026-02-24
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "034_onsite_qc_constraints"
down_revision: Union[str, None] = "033_pickup_failure_tracking"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Make pickup_request_id nullable (required for SET NULL to work)
    op.alter_column(
        "on_site_qc",
        "pickup_request_id",
        existing_type=sa.String(),
        nullable=True,
    )

    # 2. Make keyboard_ok nullable (optional for non-laptop devices)
    op.alter_column(
        "on_site_qc",
        "keyboard_ok",
        existing_type=sa.Boolean(),
        nullable=True,
    )

    # 3. Change pickup_request_id FK from CASCADE to SET NULL
    op.drop_constraint("on_site_qc_pickup_request_id_fkey", "on_site_qc", type_="foreignkey")
    op.create_foreign_key(
        "on_site_qc_pickup_request_id_fkey",
        "on_site_qc",
        "pickup_requests",
        ["pickup_request_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # 4. Add unique constraint to prevent duplicate QC records per (asset, pickup)
    op.create_unique_constraint(
        "uq_on_site_qc_asset_pickup",
        "on_site_qc",
        ["asset_id", "pickup_request_id"],
    )


def downgrade() -> None:
    # 4. Remove unique constraint
    op.drop_constraint("uq_on_site_qc_asset_pickup", "on_site_qc", type_="unique")

    # 3. Revert FK from SET NULL back to CASCADE
    op.drop_constraint("on_site_qc_pickup_request_id_fkey", "on_site_qc", type_="foreignkey")
    op.create_foreign_key(
        "on_site_qc_pickup_request_id_fkey",
        "on_site_qc",
        "pickup_requests",
        ["pickup_request_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # 2. Backfill NULLs before reverting to non-nullable
    op.execute("UPDATE on_site_qc SET keyboard_ok = TRUE WHERE keyboard_ok IS NULL")
    op.alter_column(
        "on_site_qc",
        "keyboard_ok",
        existing_type=sa.Boolean(),
        nullable=False,
    )

    # 1. Remove rows with NULL pickup_request_id (orphaned by SET NULL), then revert to non-nullable
    op.execute("DELETE FROM on_site_qc WHERE pickup_request_id IS NULL")
    op.alter_column(
        "on_site_qc",
        "pickup_request_id",
        existing_type=sa.String(),
        nullable=False,
    )
