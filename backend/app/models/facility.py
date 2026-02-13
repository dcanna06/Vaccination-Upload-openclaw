"""Facility and UserFacility models for the Aged Care Portal."""

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Table, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


# Association table for many-to-many user <-> facility
user_facilities = Table(
    "user_facilities",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("facility_id", Integer, ForeignKey("facilities.id"), primary_key=True),
)


class Facility(TimestampMixin, Base):
    __tablename__ = "facilities"

    id: Mapped[int] = mapped_column(primary_key=True)
    organisation_id: Mapped[int] = mapped_column(
        ForeignKey("organisations.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    contact_person: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    pharmacy_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    pharmacist_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), server_default="active", nullable=False
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    organisation: Mapped["Organisation"] = relationship(  # noqa: F821
        lazy="selectin"
    )
    residents: Mapped[list["Resident"]] = relationship(  # noqa: F821
        back_populates="facility", lazy="selectin"
    )
    clinics: Mapped[list["Clinic"]] = relationship(  # noqa: F821
        back_populates="facility", lazy="selectin"
    )
    messages: Mapped[list["Message"]] = relationship(  # noqa: F821
        back_populates="facility", lazy="noload"
    )
    users: Mapped[list["User"]] = relationship(  # noqa: F821
        secondary=user_facilities, lazy="selectin"
    )
