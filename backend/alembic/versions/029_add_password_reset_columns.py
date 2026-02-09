"""Add dedicated password_reset_token columns to users table

Separates password reset tokens from OTP tokens to prevent token
collision between employee OTP login and admin password reset flows.

Revision ID: 029_add_pwd_reset_cols
Revises: 028_create_token_black
Create Date: 2026-02-08
"""

from alembic import op
import sqlalchemy as sa

revision = "029_add_pwd_reset_cols"
down_revision = "028_create_token_black"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("password_reset_token", sa.String(), nullable=True))
    op.add_column(
        "users", sa.Column("password_reset_expires_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.create_index("ix_users_password_reset_token", "users", ["password_reset_token"])


def downgrade() -> None:
    op.drop_index("ix_users_password_reset_token", table_name="users")
    op.drop_column("users", "password_reset_expires_at")
    op.drop_column("users", "password_reset_token")
