"""ClinicResident join model for the Aged Care Portal."""

from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class ClinicResident(Base):
    __tablename__ = "clinic_residents"
    __table_args__ = (
        UniqueConstraint(
            "clinic_id", "resident_id", "vaccine_code", name="uq_clinic_resident_vaccine"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    clinic_id: Mapped[int] = mapped_column(
        ForeignKey("clinics.id", ondelete="CASCADE"), nullable=False
    )
    resident_id: Mapped[int] = mapped_column(
        ForeignKey("residents.id"), nullable=False
    )
    vaccine_code: Mapped[str] = mapped_column(String(50), nullable=False)
    is_eligible: Mapped[bool] = mapped_column(
        Boolean, server_default="true", nullable=False
    )
    consent_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    consented_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    administered: Mapped[bool] = mapped_column(
        Boolean, server_default="false", nullable=False
    )
    administered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    clinic: Mapped["Clinic"] = relationship(back_populates="clinic_residents")  # noqa: F821
    resident: Mapped["Resident"] = relationship(lazy="selectin")  # noqa: F821
