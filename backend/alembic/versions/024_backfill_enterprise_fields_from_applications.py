"""backfill enterprise fields from applications

Copies industry, company_size, contact_person, contact_email,
contact_phone, and address from enterprise_applications to enterprises
for existing records where those fields are NULL.

Revision ID: 024_backfill_fields
Revises: 023_add_company_size
Create Date: 2026-01-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '024_backfill_fields'
down_revision: Union[str, None] = '023_add_company_size'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use raw SQL to backfill from enterprise_applications to enterprises.
    # Only update fields that are currently NULL on the enterprise.
    conn = op.get_bind()

    # Backfill industry from application.industry_type
    conn.execute(sa.text("""
        UPDATE enterprises e
        SET industry = ea.industry_type
        FROM enterprise_applications ea
        WHERE ea.enterprise_id = e.id
          AND ea.status = 'approved'
          AND e.industry IS NULL
          AND ea.industry_type IS NOT NULL
    """))

    # Backfill company_size from application.company_size
    conn.execute(sa.text("""
        UPDATE enterprises e
        SET company_size = ea.company_size
        FROM enterprise_applications ea
        WHERE ea.enterprise_id = e.id
          AND ea.status = 'approved'
          AND e.company_size IS NULL
          AND ea.company_size IS NOT NULL
    """))

    # Backfill contact_person from application.org_admin_name
    conn.execute(sa.text("""
        UPDATE enterprises e
        SET contact_person = ea.org_admin_name
        FROM enterprise_applications ea
        WHERE ea.enterprise_id = e.id
          AND ea.status = 'approved'
          AND e.contact_person IS NULL
          AND ea.org_admin_name IS NOT NULL
    """))

    # Backfill contact_email from application.org_admin_email
    conn.execute(sa.text("""
        UPDATE enterprises e
        SET contact_email = ea.org_admin_email
        FROM enterprise_applications ea
        WHERE ea.enterprise_id = e.id
          AND ea.status = 'approved'
          AND e.contact_email IS NULL
          AND ea.org_admin_email IS NOT NULL
    """))

    # Backfill contact_phone from application.org_admin_phone
    conn.execute(sa.text("""
        UPDATE enterprises e
        SET contact_phone = ea.org_admin_phone
        FROM enterprise_applications ea
        WHERE ea.enterprise_id = e.id
          AND ea.status = 'approved'
          AND e.contact_phone IS NULL
          AND ea.org_admin_phone IS NOT NULL
    """))

    # Backfill address from application.registered_address (as JSON with "full" key)
    conn.execute(sa.text("""
        UPDATE enterprises e
        SET address = jsonb_build_object('full', ea.registered_address)
        FROM enterprise_applications ea
        WHERE ea.enterprise_id = e.id
          AND ea.status = 'approved'
          AND e.address IS NULL
          AND ea.registered_address IS NOT NULL
    """))


def downgrade() -> None:
    # Data backfill is not reversible in a meaningful way.
    # The fields will retain their values; no destructive downgrade.
    pass
