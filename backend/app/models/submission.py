"""Submission batch and record models for tracking AIR uploads."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class SubmissionBatch(TimestampMixin, Base):
    __tablename__ = "submission_batches"

    id: Mapped[int] = mapped_column(primary_key=True)
    organisation_id: Mapped[int] = mapped_column(
        ForeignKey("organisations.id"), nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )
    location_id: Mapped[int | None] = mapped_column(
        ForeignKey("locations.id"), nullable=True
    )
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    total_records: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    successful: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    failed: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    warnings: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    pending_confirmation: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="draft"
    )
    environment: Mapped[str | None] = mapped_column(String(20), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    records: Mapped[list["SubmissionRecord"]] = relationship(
        back_populates="batch", lazy="selectin"
    )


class SubmissionRecord(TimestampMixin, Base):
    __tablename__ = "submission_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    batch_id: Mapped[int] = mapped_column(
        ForeignKey("submission_batches.id"), nullable=False
    )
    row_number: Mapped[int] = mapped_column(Integer, nullable=False)
    request_payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    response_payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    air_status_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    air_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    claim_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    claim_sequence_number: Mapped[str | None] = mapped_column(String(10), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="pending"
    )
    confirmation_status: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Relationships
    batch: Mapped["SubmissionBatch"] = relationship(back_populates="records")
