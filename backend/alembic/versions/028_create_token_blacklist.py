"""Create token_blacklist table for DB-backed token invalidation

Moves token blacklisting from in-memory dict to PostgreSQL for
multi-worker and multi-process safety.

Revision ID: 028_create_token_black
Revises: 027_simplify_batch_stat
Create Date: 2026-01-31
"""

from alembic import op
import sqlalchemy as sa

revision = "028_create_token_black"
down_revision = "027_simplify_batch_stat"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "token_blacklist",
        sa.Column("token_hash", sa.String(32), nullable=False),
        sa.Column(
            "expires_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("token_hash"),
    )
    op.create_index(
        "ix_token_blacklist_expires_at",
        "token_blacklist",
        ["expires_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_token_blacklist_expires_at", table_name="token_blacklist")
    op.drop_table("token_blacklist")
