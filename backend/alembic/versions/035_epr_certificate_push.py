"""Add EPR Certificate push/distribution support

Adds fields to track when EPR certificates are pushed/sent to another enterprise:
- sent_to_enterprise_id: FK to enterprises, nullable (NULL = not pushed)
- sent_at: DateTime, nullable (when the certificate was pushed)
- sent_by: String (user_id), nullable (who pushed it)

This enables OPS Admin to push certificates from one enterprise to another,
and Org Admin to view received certificates alongside their own.

Revision ID: 035_epr_certificate_push
Revises: 034_onsite_qc_constraints
Create Date: 2026-02-25
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "035_epr_certificate_push"
down_revision: Union[str, None] = "034_onsite_qc_constraints"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add push/distribution tracking columns
    op.add_column(
        "epr_certificates",
        sa.Column("sent_to_enterprise_id", sa.String(), nullable=True, index=True),
    )
    op.add_column(
        "epr_certificates",
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True, index=True),
    )
    op.add_column(
        "epr_certificates",
        sa.Column("sent_by", sa.String(), nullable=True),
    )

    # Create FK to enterprises for sent_to_enterprise_id
    op.create_foreign_key(
        "epr_certificates_sent_to_enterprise_id_fkey",
        "epr_certificates",
        "enterprises",
        ["sent_to_enterprise_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    # Drop FK
    op.drop_constraint(
        "epr_certificates_sent_to_enterprise_id_fkey",
        "epr_certificates",
        type_="foreignkey",
    )

    # Remove columns
    op.drop_column("epr_certificates", "sent_by")
    op.drop_column("epr_certificates", "sent_at")
    op.drop_column("epr_certificates", "sent_to_enterprise_id")
