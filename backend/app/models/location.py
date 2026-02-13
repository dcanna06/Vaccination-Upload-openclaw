"""Location and LocationProvider models."""

from sqlalchemy import ForeignKey, JSON, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Location(TimestampMixin, Base):
    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(primary_key=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address_line_1: Mapped[str] = mapped_column(String(255), server_default="")
    address_line_2: Mapped[str] = mapped_column(String(255), server_default="")
    suburb: Mapped[str] = mapped_column(String(100), server_default="")
    state: Mapped[str] = mapped_column(String(10), server_default="")
    postcode: Mapped[str] = mapped_column(String(10), server_default="")
    minor_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    proda_link_status: Mapped[str] = mapped_column(String(20), server_default="pending")
    status: Mapped[str] = mapped_column(String(20), server_default="active")

    # Relationships
    organisation: Mapped["Organisation"] = relationship(  # noqa: F821
        back_populates="locations"
    )
    providers: Mapped[list["LocationProvider"]] = relationship(
        back_populates="location", lazy="selectin"
    )


class LocationProvider(TimestampMixin, Base):
    __tablename__ = "location_providers"
    __table_args__ = (
        UniqueConstraint("location_id", "provider_number", name="uq_location_provider"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id"), nullable=False)
    provider_number: Mapped[str] = mapped_column(String(20), nullable=False)
    provider_type: Mapped[str] = mapped_column(String(50), server_default="")
    minor_id: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    hw027_status: Mapped[str] = mapped_column(String(20), server_default="not_submitted")
    air_access_list: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Relationships
    location: Mapped["Location"] = relationship(back_populates="providers")
