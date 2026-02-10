"""Add phone and ahpra_number columns to users table.

Revision ID: 0004
Revises: 0003
Create Date: 2026-02-10
"""

from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("phone", sa.String(20), nullable=True))
    op.add_column("users", sa.Column("ahpra_number", sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "ahpra_number")
    op.drop_column("users", "phone")
