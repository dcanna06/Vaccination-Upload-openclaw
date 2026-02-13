"""Add minor_id to location_providers table.

Minor IDs are now assigned per-provider (format: WRR{5 digits}).
When a provider number is linked, it receives a unique Minor ID
that is used as the dhs-auditId in AIR API calls.

Revision ID: 0006
Revises: 0005
Create Date: 2026-02-13
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None

MINOR_ID_PREFIX = "WRR"


def upgrade() -> None:
    # Step 1: Add minor_id column as nullable first
    op.add_column(
        "location_providers",
        sa.Column("minor_id", sa.String(20), nullable=True),
    )

    # Step 2: Backfill existing rows with sequential WRR##### IDs
    conn = op.get_bind()
    rows = conn.execute(
        text("SELECT id FROM location_providers ORDER BY id")
    ).fetchall()
    for i, row in enumerate(rows, start=1):
        minor_id = f"{MINOR_ID_PREFIX}{i:05d}"
        conn.execute(
            text("UPDATE location_providers SET minor_id = :mid WHERE id = :pid"),
            {"mid": minor_id, "pid": row[0]},
        )

    # Step 3: Make non-nullable and unique
    op.alter_column("location_providers", "minor_id", nullable=False)
    op.create_unique_constraint("uq_provider_minor_id", "location_providers", ["minor_id"])


def downgrade() -> None:
    op.drop_constraint("uq_provider_minor_id", "location_providers", type_="unique")
    op.drop_column("location_providers", "minor_id")
