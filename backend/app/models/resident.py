"""Resident and ResidentEligibility models for the Aged Care Portal."""

from datetime import date, datetime

from sqlalchemy import (
    ARRAY,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Resident(TimestampMixin, Base):
    __tablename__ = "residents"

    id: Mapped[int] = mapped_column(primary_key=True)
    facility_id: Mapped[int] = mapped_column(
        ForeignKey("facilities.id"), nullable=False
    )
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    date_of_birth: Mapped[date] = mapped_column(Date, nullable=False)
    gender: Mapped[str] = mapped_column(String(1), server_default="F", nullable=False)
    medicare_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    ihi_number: Mapped[str | None] = mapped_column(String(16), nullable=True)
    room: Mapped[str | None] = mapped_column(String(50), nullable=True)
    wing: Mapped[str | None] = mapped_column(String(50), nullable=True)
    gp_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    allergies: Mapped[list[str] | None] = mapped_column(ARRAY(Text), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), server_default="active", nullable=False
    )

    # Relationships
    facility: Mapped["Facility"] = relationship(  # noqa: F821
        back_populates="residents"
    )
    eligibility: Mapped[list["ResidentEligibility"]] = relationship(
        back_populates="resident", lazy="selectin", cascade="all, delete-orphan"
    )


class ResidentEligibility(TimestampMixin, Base):
    __tablename__ = "resident_eligibility"
    __table_args__ = (
        UniqueConstraint("resident_id", "vaccine_code", name="uq_resident_vaccine"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    resident_id: Mapped[int] = mapped_column(
        ForeignKey("residents.id", ondelete="CASCADE"), nullable=False
    )
    vaccine_code: Mapped[str] = mapped_column(String(50), nullable=False)
    is_due: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    is_overdue: Mapped[bool] = mapped_column(
        Boolean, server_default="false", nullable=False
    )
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    dose_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_synced_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    resident: Mapped["Resident"] = relationship(back_populates="eligibility")
