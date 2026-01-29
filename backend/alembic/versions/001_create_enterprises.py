"""create enterprises table

Revision ID: 001_enterprises
Revises: 
Create Date: 2026-01-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_enterprises'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('enterprises',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('legal_name', sa.String(), nullable=True),
        sa.Column('gst_number', sa.String(), nullable=True),
        sa.Column('pan_number', sa.String(), nullable=True),
        sa.Column('address', sa.JSON(), nullable=True),
        sa.Column('industry', sa.String(), nullable=True),
        sa.Column('employee_count', sa.Integer(), nullable=True),
        sa.Column('contact_person', sa.String(), nullable=True),
        sa.Column('contact_email', sa.String(), nullable=True),
        sa.Column('contact_phone', sa.String(), nullable=True),
        sa.Column('status', sa.String(), server_default='active', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Timestamp when record was created'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, comment='Timestamp when record was last updated'),
        sa.Column('created_by', sa.String(), nullable=True, comment='User ID who created the record'),
        sa.Column('updated_by', sa.String(), nullable=True, comment='User ID who last updated the record'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_enterprises_gst_number'), 'enterprises', ['gst_number'], unique=True)
    op.create_index(op.f('ix_enterprises_id'), 'enterprises', ['id'], unique=False)
    op.create_index(op.f('ix_enterprises_status'), 'enterprises', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_enterprises_status'), table_name='enterprises')
    op.drop_index(op.f('ix_enterprises_id'), table_name='enterprises')
    op.drop_index(op.f('ix_enterprises_gst_number'), table_name='enterprises')
    op.drop_table('enterprises')

