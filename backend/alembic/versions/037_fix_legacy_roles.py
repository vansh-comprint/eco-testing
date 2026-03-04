"""Fix legacy role values and add CHECK constraint on users.role

Migrates Supabase-era role values to their canonical equivalents:
  main_admin  → ops_admin
  technician  → ops_admin
  sub_user    → employee

Then adds a CHECK constraint so no new invalid values can be inserted.

Revision ID: 037_fix_legacy_roles
Revises: 036_add_enterprise_pan_unique
Create Date: 2026-03-04
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = "037_fix_legacy_roles"
down_revision = "036_add_enterprise_pan_unique"
branch_labels = None
depends_on = None

_VALID_ROLES = (
    "super_admin",
    "ops_admin",
    "org_admin",
    "it_admin",
    "employee",
    "logistics_admin",
    "logistics_user",
)


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Rewrite legacy role values
    conn.execute(
        sa.text(
            "UPDATE users SET role = 'ops_admin' WHERE role IN ('main_admin', 'technician')"
        )
    )
    conn.execute(
        sa.text("UPDATE users SET role = 'employee' WHERE role = 'sub_user'")
    )

    # 2. Add CHECK constraint so future inserts are validated at DB level
    valid_roles_sql = ", ".join(f"'{r}'" for r in _VALID_ROLES)
    conn.execute(
        sa.text(
            f"ALTER TABLE users ADD CONSTRAINT ck_users_role_valid "
            f"CHECK (role IN ({valid_roles_sql}))"
        )
    )


def downgrade() -> None:
    # Drop the CHECK constraint only — intentionally do NOT revert role values
    conn = op.get_bind()
    conn.execute(
        sa.text("ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_role_valid")
    )
