"""Create organisations, locations, and location_providers tables.

Revision ID: 0001
Revises:
Create Date: 2026-02-10
"""

from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- organisations ---
    op.create_table(
        "organisations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("proda_org_id", sa.String(100), nullable=False, unique=True),
        sa.Column("minor_id_prefix", sa.String(50), server_default="", nullable=False),
        sa.Column("status", sa.String(20), server_default="active", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # Seed one default organisation
    op.execute(
        "INSERT INTO organisations (name, proda_org_id, minor_id_prefix, status) "
        "VALUES ('Default Organisation', '0', '', 'active')"
    )

    # --- locations ---
    op.create_table(
        "locations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "organisation_id",
            sa.Integer(),
            sa.ForeignKey("organisations.id"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("address_line_1", sa.String(255), server_default="", nullable=False),
        sa.Column("address_line_2", sa.String(255), server_default="", nullable=False),
        sa.Column("suburb", sa.String(100), server_default="", nullable=False),
        sa.Column("state", sa.String(10), server_default="", nullable=False),
        sa.Column("postcode", sa.String(10), server_default="", nullable=False),
        sa.Column("minor_id", sa.String(100), unique=True, nullable=False),
        sa.Column(
            "proda_link_status",
            sa.String(20),
            server_default="pending",
            nullable=False,
        ),
        sa.Column("status", sa.String(20), server_default="active", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # --- location_providers ---
    op.create_table(
        "location_providers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "location_id",
            sa.Integer(),
            sa.ForeignKey("locations.id"),
            nullable=False,
        ),
        sa.Column("provider_number", sa.String(20), nullable=False),
        sa.Column("provider_type", sa.String(50), server_default="", nullable=False),
        sa.Column(
            "hw027_status",
            sa.String(20),
            server_default="not_submitted",
            nullable=False,
        ),
        sa.Column("air_access_list", sa.JSON(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "location_id", "provider_number", name="uq_location_provider"
        ),
    )


def downgrade() -> None:
    op.drop_table("location_providers")
    op.drop_table("locations")
    op.drop_table("organisations")
