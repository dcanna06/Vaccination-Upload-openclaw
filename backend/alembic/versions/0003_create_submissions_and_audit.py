"""Create submission_batches, submission_records, and audit_log tables.

Revision ID: 0003
Revises: 0002
Create Date: 2026-02-10
"""

from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- submission_batches ---
    op.create_table(
        "submission_batches",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "organisation_id",
            sa.Integer(),
            sa.ForeignKey("organisations.id"),
            nullable=False,
        ),
        sa.Column(
            "user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False
        ),
        sa.Column(
            "location_id",
            sa.Integer(),
            sa.ForeignKey("locations.id"),
            nullable=True,
        ),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("total_records", sa.Integer(), server_default="0", nullable=False),
        sa.Column("successful", sa.Integer(), server_default="0", nullable=False),
        sa.Column("failed", sa.Integer(), server_default="0", nullable=False),
        sa.Column("warnings", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "pending_confirmation", sa.Integer(), server_default="0", nullable=False
        ),
        sa.Column(
            "status", sa.String(20), server_default="draft", nullable=False
        ),
        sa.Column("environment", sa.String(20), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
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
    op.create_index(
        "ix_submission_batches_user_id", "submission_batches", ["user_id"]
    )
    op.create_index(
        "ix_submission_batches_org_id", "submission_batches", ["organisation_id"]
    )
    op.create_index(
        "ix_submission_batches_status", "submission_batches", ["status"]
    )

    # --- submission_records ---
    op.create_table(
        "submission_records",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "batch_id",
            sa.Integer(),
            sa.ForeignKey("submission_batches.id"),
            nullable=False,
        ),
        sa.Column("row_number", sa.Integer(), nullable=False),
        sa.Column("request_payload", sa.JSON(), nullable=True),
        sa.Column("response_payload", sa.JSON(), nullable=True),
        sa.Column("air_status_code", sa.String(20), nullable=True),
        sa.Column("air_message", sa.Text(), nullable=True),
        sa.Column("claim_id", sa.String(50), nullable=True),
        sa.Column("claim_sequence_number", sa.String(10), nullable=True),
        sa.Column(
            "status", sa.String(20), server_default="pending", nullable=False
        ),
        sa.Column("confirmation_status", sa.String(20), nullable=True),
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
    op.create_index(
        "ix_submission_records_batch_id", "submission_records", ["batch_id"]
    )
    op.create_index(
        "ix_submission_records_status", "submission_records", ["status"]
    )

    # --- audit_log ---
    op.create_table(
        "audit_log",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True
        ),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("resource_type", sa.String(50), nullable=True),
        sa.Column("resource_id", sa.Integer(), nullable=True),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_audit_log_user_id", "audit_log", ["user_id"])
    op.create_index("ix_audit_log_action", "audit_log", ["action"])
    op.create_index("ix_audit_log_created_at", "audit_log", ["created_at"])


def downgrade() -> None:
    op.drop_table("audit_log")
    op.drop_table("submission_records")
    op.drop_table("submission_batches")
