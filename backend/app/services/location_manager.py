"""Location CRUD service with atomic minor_id assignment."""

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.location import Location, LocationProvider
from app.models.organisation import Organisation

logger = structlog.get_logger(__name__)


class LocationManager:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def _assign_next_minor_id(self, organisation_id: int) -> str:
        """Atomically assign the next minor_id for the organisation.

        Uses SELECT FOR UPDATE on the organisation row to prevent races.
        Format: {prefix}-{sequence} or just {sequence} if no prefix.
        """
        stmt = (
            select(Organisation)
            .where(Organisation.id == organisation_id)
            .with_for_update()
        )
        result = await self._db.execute(stmt)
        org = result.scalar_one_or_none()
        if not org:
            raise ValueError(f"Organisation {organisation_id} not found")

        # Count existing locations for this org to determine next sequence
        count_stmt = (
            select(func.count())
            .select_from(Location)
            .where(Location.organisation_id == organisation_id)
        )
        count_result = await self._db.execute(count_stmt)
        next_seq = count_result.scalar_one() + 1

        prefix = org.minor_id_prefix.strip() if org.minor_id_prefix else ""
        minor_id = f"{prefix}-{next_seq:03d}" if prefix else f"{next_seq:03d}"

        logger.info(
            "minor_id_assigned",
            organisation_id=organisation_id,
            minor_id=minor_id,
        )
        return minor_id

    async def create(self, organisation_id: int, name: str, **fields: str) -> Location:
        """Create a new location with auto-assigned minor_id."""
        minor_id = await self._assign_next_minor_id(organisation_id)
        location = Location(
            organisation_id=organisation_id,
            name=name,
            minor_id=minor_id,
            **fields,
        )
        self._db.add(location)
        await self._db.commit()
        await self._db.refresh(location)
        logger.info("location_created", location_id=location.id, minor_id=minor_id)
        return location

    async def get(self, location_id: int) -> Location | None:
        """Get a single location by ID."""
        result = await self._db.execute(
            select(Location).where(Location.id == location_id)
        )
        return result.scalar_one_or_none()

    async def list_active(self, organisation_id: int | None = None) -> list[Location]:
        """List all active locations, optionally filtered by organisation."""
        stmt = select(Location).where(Location.status == "active")
        if organisation_id is not None:
            stmt = stmt.where(Location.organisation_id == organisation_id)
        stmt = stmt.order_by(Location.name)
        result = await self._db.execute(stmt)
        return list(result.scalars().all())

    async def update(self, location_id: int, **fields: str) -> Location | None:
        """Update a location. minor_id is immutable and silently stripped."""
        fields.pop("minor_id", None)
        location = await self.get(location_id)
        if not location:
            return None
        for key, value in fields.items():
            if value is not None and hasattr(location, key):
                setattr(location, key, value)
        await self._db.commit()
        await self._db.refresh(location)
        logger.info("location_updated", location_id=location_id)
        return location

    async def deactivate(self, location_id: int) -> Location | None:
        """Soft-delete a location by setting status to 'inactive'."""
        return await self.update(location_id, status="inactive")

    async def get_minor_id(self, location_id: int) -> str | None:
        """Resolve a location_id to its minor_id. Returns None if not found."""
        result = await self._db.execute(
            select(Location.minor_id).where(Location.id == location_id)
        )
        return result.scalar_one_or_none()

    async def verify_provider_linked(self, location_id: int, provider_number: str) -> bool:
        """Check if a provider is linked to the given location."""
        result = await self._db.execute(
            select(func.count())
            .select_from(LocationProvider)
            .where(
                LocationProvider.location_id == location_id,
                LocationProvider.provider_number == provider_number,
            )
        )
        return (result.scalar_one() or 0) > 0

    async def get_unlinked_providers(
        self, location_id: int, provider_numbers: list[str]
    ) -> list[str]:
        """Return provider numbers from the list that are NOT linked to the location."""
        if not provider_numbers:
            return []
        linked_stmt = (
            select(LocationProvider.provider_number)
            .where(
                LocationProvider.location_id == location_id,
                LocationProvider.provider_number.in_(provider_numbers),
            )
        )
        result = await self._db.execute(linked_stmt)
        linked = {row[0] for row in result.all()}
        return [p for p in provider_numbers if p not in linked]
