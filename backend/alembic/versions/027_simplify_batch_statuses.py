"""Simplify batch statuses — remap old statuses to new simplified set

Remaps: active, in_progress, pickup_scheduled, picked_up, in_transit → pickup_in_progress

Revision ID: 027_simplify_batch_stat
Revises: 026_add_branch_it_admin
Create Date: 2026-01-31
"""

from alembic import op

revision = "027_simplify_batch_stat"
down_revision = "026_add_branch_it_admin"
branch_labels = None
depends_on = None

# Old statuses that no longer exist → their new mapping
REMAP = {
    "active": "pickup_in_progress",
    "in_progress": "pickup_in_progress",
    "pickup_scheduled": "pickup_in_progress",
    "picked_up": "pickup_in_progress",
    "in_transit": "pickup_in_progress",
}


def upgrade() -> None:
    for old_status, new_status in REMAP.items():
        op.execute(
            f"UPDATE batches SET status = '{new_status}' WHERE status = '{old_status}'"
        )


def downgrade() -> None:
    # Best-effort reverse: pickup_in_progress → active
    op.execute(
        "UPDATE batches SET status = 'active' WHERE status = 'pickup_in_progress'"
    )
