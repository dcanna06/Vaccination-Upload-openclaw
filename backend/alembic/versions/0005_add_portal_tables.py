"""Add portal tables: facilities, residents, eligibility, clinics, messages, notifications.

Revision ID: 0005
Revises: 0004
Create Date: 2026-02-13
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- facilities ---
    op.create_table(
        "facilities",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "organisation_id",
            sa.Integer(),
            sa.ForeignKey("organisations.id"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("address", sa.String(500), nullable=True),
        sa.Column("contact_person", sa.String(255), nullable=True),
        sa.Column("contact_phone", sa.String(50), nullable=True),
        sa.Column("contact_email", sa.String(255), nullable=True),
        sa.Column("pharmacy_name", sa.String(255), nullable=True),
        sa.Column("pharmacist_name", sa.String(255), nullable=True),
        sa.Column("status", sa.String(20), server_default="active", nullable=False),
        sa.Column(
            "joined_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
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
    op.create_index("idx_facilities_org", "facilities", ["organisation_id"])
    op.create_index("idx_facilities_status", "facilities", ["status"])

    # --- residents ---
    op.create_table(
        "residents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "facility_id",
            sa.Integer(),
            sa.ForeignKey("facilities.id"),
            nullable=False,
        ),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("date_of_birth", sa.Date(), nullable=False),
        sa.Column("gender", sa.String(1), server_default="F", nullable=False),
        sa.Column("medicare_number", sa.String(20), nullable=True),
        sa.Column("ihi_number", sa.String(16), nullable=True),
        sa.Column("room", sa.String(50), nullable=True),
        sa.Column("wing", sa.String(50), nullable=True),
        sa.Column("gp_name", sa.String(255), nullable=True),
        sa.Column("allergies", sa.ARRAY(sa.Text()), nullable=True),
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
    op.create_index("idx_residents_facility", "residents", ["facility_id"])
    op.create_index("idx_residents_status", "residents", ["status"])
    op.create_index("idx_residents_name", "residents", ["last_name", "first_name"])
    op.create_index("idx_residents_medicare", "residents", ["medicare_number"])

    # --- resident_eligibility ---
    op.create_table(
        "resident_eligibility",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "resident_id",
            sa.Integer(),
            sa.ForeignKey("residents.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("vaccine_code", sa.String(50), nullable=False),
        sa.Column("is_due", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("is_overdue", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("dose_number", sa.Integer(), nullable=True),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.UniqueConstraint("resident_id", "vaccine_code", name="uq_resident_vaccine"),
    )

    # --- clinics ---
    op.create_table(
        "clinics",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "facility_id",
            sa.Integer(),
            sa.ForeignKey("facilities.id"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("clinic_date", sa.Date(), nullable=False),
        sa.Column("time_range", sa.String(100), nullable=True),
        sa.Column("location", sa.String(255), nullable=True),
        sa.Column("pharmacist_name", sa.String(255), nullable=True),
        sa.Column("vaccines", sa.ARRAY(sa.Text()), nullable=False),
        sa.Column("status", sa.String(20), server_default="upcoming", nullable=False),
        sa.Column(
            "created_by",
            sa.Integer(),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
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
    op.create_index("idx_clinics_facility", "clinics", ["facility_id"])
    op.create_index("idx_clinics_date", "clinics", ["clinic_date"])
    op.create_index("idx_clinics_status", "clinics", ["status"])

    # --- clinic_residents ---
    op.create_table(
        "clinic_residents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "clinic_id",
            sa.Integer(),
            sa.ForeignKey("clinics.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "resident_id",
            sa.Integer(),
            sa.ForeignKey("residents.id"),
            nullable=False,
        ),
        sa.Column("vaccine_code", sa.String(50), nullable=False),
        sa.Column("is_eligible", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("consent_status", sa.String(20), nullable=True),
        sa.Column("consented_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "administered", sa.Boolean(), server_default="false", nullable=False
        ),
        sa.Column("administered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "clinic_id", "resident_id", "vaccine_code", name="uq_clinic_resident_vaccine"
        ),
    )

    # --- messages ---
    op.create_table(
        "messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "facility_id",
            sa.Integer(),
            sa.ForeignKey("facilities.id"),
            nullable=False,
        ),
        sa.Column(
            "sender_id",
            sa.Integer(),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("sender_role", sa.String(50), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "idx_messages_facility", "messages", ["facility_id", sa.text("created_at DESC")]
    )

    # --- notifications ---
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("is_read", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("metadata", JSONB(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "idx_notifications_user",
        "notifications",
        ["user_id", "is_read", sa.text("created_at DESC")],
    )

    # --- user_facilities ---
    op.create_table(
        "user_facilities",
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column(
            "facility_id",
            sa.Integer(),
            sa.ForeignKey("facilities.id"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("user_id", "facility_id"),
    )


def downgrade() -> None:
    op.drop_table("user_facilities")
    op.drop_table("notifications")
    op.drop_table("messages")
    op.drop_table("clinic_residents")
    op.drop_table("clinics")
    op.drop_table("resident_eligibility")
    op.drop_table("residents")
    op.drop_table("facilities")
