"""rename technician_id to reviewer_id in facility_qc and convert technician users to ops_admin

Renames the facility_qc.technician_id column to reviewer_id (and its index),
and converts any existing users with role='technician' to role='ops_admin'.

Revision ID: 025_rename_technician
Revises: 024_backfill_fields
Create Date: 2026-01-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '025_rename_technician'
down_revision: Union[str, None] = '024_backfill_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Rename facility_qc.technician_id -> reviewer_id
    op.alter_column('facility_qc', 'technician_id', new_column_name='reviewer_id')

    # Rename the index
    op.drop_index('ix_facility_qc_technician_id', table_name='facility_qc')
    op.create_index('ix_facility_qc_reviewer_id', 'facility_qc', ['reviewer_id'], unique=False)

    # Convert any existing technician users to ops_admin
    op.execute("UPDATE users SET role = 'ops_admin' WHERE role = 'technician'")


def downgrade() -> None:
    # Revert: rename reviewer_id back to technician_id
    op.alter_column('facility_qc', 'reviewer_id', new_column_name='technician_id')

    # Revert index
    op.drop_index('ix_facility_qc_reviewer_id', table_name='facility_qc')
    op.create_index('ix_facility_qc_technician_id', 'facility_qc', ['technician_id'], unique=False)

    # Note: Cannot reliably revert the user role conversion
