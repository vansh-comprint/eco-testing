"""create users table

Revision ID: 005_users
Revises: 004_enterprise_wallets
Create Date: 2026-01-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '005_users'
down_revision: Union[str, None] = '004_enterprise_wallets'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('users',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('enterprise_id', sa.String(), nullable=True),
        sa.Column('branch_id', sa.String(), nullable=True),
        sa.Column('parent_user_id', sa.String(), nullable=True),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('status', sa.String(), server_default='active', nullable=False),
        sa.Column('password_hash', sa.Text(), nullable=True),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('otp_token', sa.String(), nullable=True),
        sa.Column('otp_expires_at', sa.DateTime(timezone=True), nullable=True),
        # Employee-specific fields
        sa.Column('employee_id', sa.String(), nullable=True),
        sa.Column('department', sa.String(), nullable=True),
        sa.Column('designation', sa.String(), nullable=True),
        # Logistics Admin-specific fields
        sa.Column('company_name', sa.String(), nullable=True),
        sa.Column('contact_person', sa.String(), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('city', sa.String(), nullable=True),
        sa.Column('state', sa.String(), nullable=True),
        sa.Column('service_areas', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        # Logistics User-specific fields
        sa.Column('vehicle_type', sa.String(), nullable=True),
        sa.Column('vehicle_number', sa.String(), nullable=True),
        # Audit fields
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Timestamp when record was created'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, comment='Timestamp when record was last updated'),
        sa.Column('created_by', sa.String(), nullable=True, comment='User ID who created the record'),
        sa.Column('updated_by', sa.String(), nullable=True, comment='User ID who last updated the record'),
        # Foreign keys
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['enterprise_id'], ['enterprises.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['parent_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    # Indexes
    op.create_index(op.f('ix_users_branch_id'), 'users', ['branch_id'], unique=False)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_employee_id'), 'users', ['employee_id'], unique=False)
    op.create_index(op.f('ix_users_enterprise_id'), 'users', ['enterprise_id'], unique=False)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_otp_token'), 'users', ['otp_token'], unique=False)
    op.create_index(op.f('ix_users_parent_user_id'), 'users', ['parent_user_id'], unique=False)
    op.create_index(op.f('ix_users_role'), 'users', ['role'], unique=False)
    op.create_index(op.f('ix_users_status'), 'users', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_users_status'), table_name='users')
    op.drop_index(op.f('ix_users_role'), table_name='users')
    op.drop_index(op.f('ix_users_parent_user_id'), table_name='users')
    op.drop_index(op.f('ix_users_otp_token'), table_name='users')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_enterprise_id'), table_name='users')
    op.drop_index(op.f('ix_users_employee_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_index(op.f('ix_users_branch_id'), table_name='users')
    op.drop_table('users')

