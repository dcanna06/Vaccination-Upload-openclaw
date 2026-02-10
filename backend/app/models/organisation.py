"""Organisation model — FK target for locations."""

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Organisation(TimestampMixin, Base):
    __tablename__ = "organisations"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    proda_org_id: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    minor_id_prefix: Mapped[str] = mapped_column(String(50), server_default="")
    status: Mapped[str] = mapped_column(String(20), server_default="active")

    # Relationships
    locations: Mapped[list["Location"]] = relationship(  # noqa: F821
        back_populates="organisation", lazy="selectin"
    )
