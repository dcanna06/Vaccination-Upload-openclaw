"""Location management endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.location import LocationCreate, LocationRead, LocationUpdate
from app.services.location_manager import LocationManager

router = APIRouter(prefix="/api/locations", tags=["locations"])


@router.post("", response_model=LocationRead, status_code=201)
async def create_location(
    body: LocationCreate,
    db: AsyncSession = Depends(get_db),
) -> LocationRead:
    """Create a new location with auto-assigned minor_id."""
    mgr = LocationManager(db)
    loc = await mgr.create(
        organisation_id=body.organisation_id,
        name=body.name,
        address_line_1=body.address_line_1,
        address_line_2=body.address_line_2,
        suburb=body.suburb,
        state=body.state,
        postcode=body.postcode,
    )
    return LocationRead.model_validate(loc)


@router.get("", response_model=list[LocationRead])
async def list_locations(
    organisation_id: int | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[LocationRead]:
    """List active locations."""
    mgr = LocationManager(db)
    locs = await mgr.list_active(organisation_id)
    return [LocationRead.model_validate(loc) for loc in locs]


@router.get("/{location_id}", response_model=LocationRead)
async def get_location(
    location_id: int,
    db: AsyncSession = Depends(get_db),
) -> LocationRead:
    """Get a single location by ID."""
    mgr = LocationManager(db)
    loc = await mgr.get(location_id)
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    return LocationRead.model_validate(loc)


@router.put("/{location_id}", response_model=LocationRead)
async def update_location(
    location_id: int,
    body: LocationUpdate,
    db: AsyncSession = Depends(get_db),
) -> LocationRead:
    """Update a location (minor_id is immutable)."""
    mgr = LocationManager(db)
    loc = await mgr.update(location_id, **body.model_dump(exclude_none=True))
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    return LocationRead.model_validate(loc)


@router.delete("/{location_id}", response_model=LocationRead)
async def deactivate_location(
    location_id: int,
    db: AsyncSession = Depends(get_db),
) -> LocationRead:
    """Soft-delete a location (sets status to inactive)."""
    mgr = LocationManager(db)
    loc = await mgr.deactivate(location_id)
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    return LocationRead.model_validate(loc)
