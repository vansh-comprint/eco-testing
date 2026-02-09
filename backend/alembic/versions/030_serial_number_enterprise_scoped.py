"""Change serial number uniqueness from global to enterprise-scoped

Drop the global unique index on assets.serial_number and replace it with
a composite unique constraint on (enterprise_id, serial_number) so that
serial numbers only need to be unique within each enterprise.

Revision ID: 030_serial_enterprise
Revises: 029_add_pwd_reset_cols
Create Date: 2026-02-10
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "030_serial_enterprise"
down_revision: Union[str, None] = "029_add_pwd_reset_cols"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop global unique index on serial_number
    op.drop_index(op.f("ix_assets_serial_number"), table_name="assets")

    # Re-create as non-unique index (still needed for lookups)
    op.create_index(op.f("ix_assets_serial_number"), "assets", ["serial_number"], unique=False)

    # Add composite unique constraint: serial number unique per enterprise
    op.create_unique_constraint(
        "uq_assets_enterprise_serial", "assets", ["enterprise_id", "serial_number"]
    )


def downgrade() -> None:
    # Drop composite unique constraint
    op.drop_constraint("uq_assets_enterprise_serial", "assets", type_="unique")

    # Drop non-unique index
    op.drop_index(op.f("ix_assets_serial_number"), table_name="assets")

    # Re-create global unique index
    op.create_index(op.f("ix_assets_serial_number"), "assets", ["serial_number"], unique=True)
