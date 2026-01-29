"""add database constraints for data integrity

Revision ID: 018_constraints
Revises: 017_create_epr_certificates
Create Date: 2026-01-21

This migration adds critical database constraints that were missing:
- CHECK constraints for amounts and grades (status constraints excluded for dev phase)
- Composite unique constraints
- Additional indexes for performance

Note: Status column constraints are intentionally excluded as the application
is still in development phase and status values may change.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "018_constraints"
down_revision: Union[str, None] = "017_epr_certificates"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ============================================================================
    # CHECK CONSTRAINTS - Data Validation
    # ============================================================================
    # NOTE: Status constraints are excluded during dev phase

    # Assets: Grade validation
    op.execute(
        """
        ALTER TABLE assets ADD CONSTRAINT check_asset_grade CHECK (
            grade IS NULL OR grade IN ('A', 'B', 'C', 'D')
        )
    """
    )

    # Assets: Prices must be non-negative
    op.execute(
        """
        ALTER TABLE assets ADD CONSTRAINT check_asset_prices CHECK (
            (base_price IS NULL OR base_price >= 0) AND
            (final_price IS NULL OR final_price >= 0)
        )
    """
    )

    # Batches: Counts must be non-negative
    op.execute(
        """
        ALTER TABLE batches ADD CONSTRAINT check_batch_counts_non_negative CHECK (
            asset_count >= 0 AND
            accepted_count >= 0 AND
            rejected_count >= 0 AND
            pending_count >= 0
        )
    """
    )

    # Batches: Count totals must match
    op.execute(
        """
        ALTER TABLE batches ADD CONSTRAINT check_batch_count_totals CHECK (
            asset_count = accepted_count + rejected_count + pending_count
        )
    """
    )

    # Batches: Values must be non-negative
    op.execute(
        """
        ALTER TABLE batches ADD CONSTRAINT check_batch_values CHECK (
            estimated_value >= 0 AND total_payout >= 0
        )
    """
    )

    # Payouts: Amount must be positive
    op.execute(
        """
        ALTER TABLE payouts ADD CONSTRAINT check_payout_amount_positive CHECK (
            amount > 0
        )
    """
    )

    # Enterprise Wallets: Balance must be non-negative
    op.execute(
        """
        ALTER TABLE enterprise_wallets ADD CONSTRAINT check_wallet_balance_non_negative CHECK (
            balance >= 0
        )
    """
    )

    # ============================================================================
    # COMPOSITE UNIQUE CONSTRAINTS
    # ============================================================================

    # Branches: Unique branch code per enterprise
    op.create_unique_constraint(
        "unique_branch_code_per_enterprise", "branches", ["enterprise_id", "branch_code"]
    )

    # Users: Unique employee ID per enterprise (where not null)
    op.execute(
        """
        CREATE UNIQUE INDEX unique_employee_id_per_enterprise 
        ON users(enterprise_id, employee_id) 
        WHERE employee_id IS NOT NULL
    """
    )

    # ============================================================================
    # PERFORMANCE INDEXES
    # ============================================================================

    # Composite indexes for common queries
    op.create_index("idx_assets_enterprise_status", "assets", ["enterprise_id", "status"])

    op.create_index("idx_assets_branch_status", "assets", ["branch_id", "status"])

    op.create_index("idx_batches_enterprise_status", "batches", ["enterprise_id", "status"])

    op.create_index("idx_users_enterprise_role", "users", ["enterprise_id", "role"])

    op.create_index("idx_users_branch_role", "users", ["branch_id", "role"])

    # Partial indexes for active records
    op.execute(
        """
        CREATE INDEX idx_active_branches
        ON branches(enterprise_id)
        WHERE status = 'active'
    """
    )

    op.execute(
        """
        CREATE INDEX idx_active_users
        ON users(enterprise_id)
        WHERE status = 'active'
    """
    )

    # Indexes on frequently filtered columns
    op.create_index(
        "idx_submissions_submitted_at",
        "submissions",
        ["submitted_at"],
        postgresql_ops={"submitted_at": "DESC"},
    )

    op.execute(
        """
        CREATE INDEX idx_payouts_completed_at
        ON payouts(completed_at DESC)
        WHERE status = 'completed'
    """
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index("idx_payouts_completed_at", table_name="payouts")
    op.drop_index("idx_submissions_submitted_at", table_name="submissions")
    op.drop_index("idx_active_users", table_name="users")
    op.drop_index("idx_active_branches", table_name="branches")
    op.drop_index("idx_users_branch_role", table_name="users")
    op.drop_index("idx_users_enterprise_role", table_name="users")
    op.drop_index("idx_batches_enterprise_status", table_name="batches")
    op.drop_index("idx_assets_branch_status", table_name="assets")
    op.drop_index("idx_assets_enterprise_status", table_name="assets")

    # Drop unique constraints
    op.drop_index("unique_employee_id_per_enterprise", table_name="users")
    op.drop_constraint("unique_branch_code_per_enterprise", "branches", type_="unique")

    # Drop check constraints
    op.execute(
        "ALTER TABLE enterprise_wallets DROP CONSTRAINT IF EXISTS check_wallet_balance_non_negative"
    )
    op.execute("ALTER TABLE payouts DROP CONSTRAINT IF EXISTS check_payout_amount_positive")
    op.execute("ALTER TABLE batches DROP CONSTRAINT IF EXISTS check_batch_values")
    op.execute("ALTER TABLE batches DROP CONSTRAINT IF EXISTS check_batch_count_totals")
    op.execute("ALTER TABLE batches DROP CONSTRAINT IF EXISTS check_batch_counts_non_negative")
    op.execute("ALTER TABLE assets DROP CONSTRAINT IF EXISTS check_asset_prices")
    op.execute("ALTER TABLE assets DROP CONSTRAINT IF EXISTS check_asset_grade")
