"""make submission_id nullable in remote_reviews

Revision ID: 021_submission_nullable
Revises: 020_pricing_rules
Create Date: 2026-01-22

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '021_submission_nullable'
down_revision: Union[str, None] = '020_pricing_rules'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Make submission_id nullable in remote_reviews
    op.alter_column('remote_reviews', 'submission_id',
                    existing_type=sa.String(),
                    nullable=True)
    
    # Change foreign key from CASCADE to SET NULL
    op.drop_constraint('remote_reviews_submission_id_fkey', 'remote_reviews', type_='foreignkey')
    op.create_foreign_key(
        'remote_reviews_submission_id_fkey',
        'remote_reviews', 'submissions',
        ['submission_id'], ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    # Revert foreign key to CASCADE
    op.drop_constraint('remote_reviews_submission_id_fkey', 'remote_reviews', type_='foreignkey')
    op.create_foreign_key(
        'remote_reviews_submission_id_fkey',
        'remote_reviews', 'submissions',
        ['submission_id'], ['id'],
        ondelete='CASCADE'
    )
    
    # Make submission_id NOT NULL again (this may fail if there are NULL values)
    op.alter_column('remote_reviews', 'submission_id',
                    existing_type=sa.String(),
                    nullable=False)

