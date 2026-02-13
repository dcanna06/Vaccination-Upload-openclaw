"""Clinic model for the Aged Care Portal."""

from datetime import date

from sqlalchemy import ARRAY, Date, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Clinic(TimestampMixin, Base):
    __tablename__ = "clinics"

    id: Mapped[int] = mapped_column(primary_key=True)
    facility_id: Mapped[int] = mapped_column(
        ForeignKey("facilities.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    clinic_date: Mapped[date] = mapped_column(Date, nullable=False)
    time_range: Mapped[str | None] = mapped_column(String(100), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    pharmacist_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    vaccines: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), server_default="upcoming", nullable=False
    )
    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )

    # Relationships
    facility: Mapped["Facility"] = relationship(  # noqa: F821
        back_populates="clinics"
    )
    clinic_residents: Mapped[list["ClinicResident"]] = relationship(  # noqa: F821
        back_populates="clinic", lazy="selectin", cascade="all, delete-orphan"
    )
    creator: Mapped["User"] = relationship(lazy="selectin")  # noqa: F821
