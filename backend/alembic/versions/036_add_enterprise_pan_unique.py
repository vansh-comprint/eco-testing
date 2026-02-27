"""Add unique constraint and index on enterprises.pan_number

Prevents duplicate PAN numbers across enterprises, matching the existing
GST number uniqueness constraint.

Handles existing duplicates by appending a suffix to make them unique
before adding the constraint.

Revision ID: 036_add_enterprise_pan_unique
Revises: 035_epr_certificate_push
Create Date: 2026-02-27
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = "036_add_enterprise_pan_unique"
down_revision = "035_epr_certificate_push"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # First, deduplicate existing PAN numbers by appending a counter suffix
    # to all but the first occurrence (ordered by created_at)
    conn = op.get_bind()
    conn.execute(sa.text("""
        UPDATE enterprises SET pan_number = pan_number || '-DUP' || sub.rn::text
        FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY pan_number ORDER BY created_at) as rn
            FROM enterprises
            WHERE pan_number IS NOT NULL AND pan_number != ''
        ) sub
        WHERE enterprises.id = sub.id AND sub.rn > 1
    """))

    # Now add the unique index
    op.create_index("ix_enterprises_pan_number", "enterprises", ["pan_number"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_enterprises_pan_number", table_name="enterprises")
