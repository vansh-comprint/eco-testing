"""Add it_admin_id column to branches table

Adds a nullable foreign key `it_admin_id` on branches pointing to users,
establishing the "1 Branch → 1 IT Admin" relationship. Also populates
it_admin_id from existing User.branch_id relationships.

Revision ID: 026_add_branch_it_admin
Revises: 025_rename_technician
Create Date: 2026-01-30

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "026_add_branch_it_admin"
down_revision: Union[str, None] = "025_rename_technician"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add it_admin_id column to branches
    op.add_column(
        "branches",
        sa.Column("it_admin_id", sa.String(), nullable=True),
    )
    op.create_foreign_key(
        "fk_branches_it_admin_id",
        "branches",
        "users",
        ["it_admin_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_branches_it_admin_id", "branches", ["it_admin_id"])

    # Backfill: For each user with role='it_admin' and branch_id set,
    # set the branch's it_admin_id to that user's id.
    # If multiple IT admins share a branch, the last one wins (edge case).
    op.execute("""
        UPDATE branches
        SET it_admin_id = u.id
        FROM users u
        WHERE u.branch_id = branches.id
          AND u.role = 'it_admin'
          AND u.status = 'active'
    """)


def downgrade() -> None:
    op.drop_index("ix_branches_it_admin_id", table_name="branches")
    op.drop_constraint("fk_branches_it_admin_id", "branches", type_="foreignkey")
    op.drop_column("branches", "it_admin_id")
