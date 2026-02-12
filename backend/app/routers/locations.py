"""Location management endpoints."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.location import LocationProvider
from app.models.user import User
from app.schemas.location import LocationCreate, LocationRead, LocationUpdate
from app.schemas.provider import ProviderRead
from app.services.location_manager import LocationManager

router = APIRouter(prefix="/api/locations", tags=["locations"])


@router.post("", response_model=LocationRead, status_code=201)
async def create_location(
    body: LocationCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
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
    user: User = Depends(get_current_user),
) -> list[LocationRead]:
    """List active locations."""
    mgr = LocationManager(db)
    locs = await mgr.list_active(organisation_id)
    return [LocationRead.model_validate(loc) for loc in locs]


@router.get("/{location_id}", response_model=LocationRead)
async def get_location(
    location_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
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
    user: User = Depends(get_current_user),
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
    user: User = Depends(get_current_user),
) -> LocationRead:
    """Soft-delete a location (sets status to inactive)."""
    mgr = LocationManager(db)
    loc = await mgr.deactivate(location_id)
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    return LocationRead.model_validate(loc)


@router.get("/{location_id}/setup-status")
async def get_setup_status(
    location_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Return complete setup status for a location.

    Includes location details, linked providers, HW027 statuses,
    PRODA link status, and provider verification results.
    """
    mgr = LocationManager(db)
    loc = await mgr.get(location_id)
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")

    # Fetch linked providers
    result = await db.execute(
        select(LocationProvider)
        .where(LocationProvider.location_id == location_id)
        .order_by(LocationProvider.created_at)
    )
    providers = [ProviderRead.model_validate(p) for p in result.scalars().all()]

    # Compute setup completeness
    has_location = True
    has_provider = len(providers) > 0
    any_hw027_approved = any(p.hw027_status == "approved" for p in providers)
    proda_linked = loc.proda_link_status == "linked"
    any_verified = any(p.air_access_list is not None for p in providers)

    return {
        "location": LocationRead.model_validate(loc).model_dump(),
        "providers": [p.model_dump() for p in providers],
        "setupComplete": has_location and has_provider and proda_linked,
        "steps": {
            "siteDetails": {"complete": has_location},
            "providerLinked": {"complete": has_provider},
            "hw027": {
                "complete": any_hw027_approved,
                "statuses": {p.provider_number: p.hw027_status for p in providers},
            },
            "prodaLink": {
                "complete": proda_linked,
                "status": loc.proda_link_status,
            },
            "providerVerified": {
                "complete": any_verified,
                "accessLists": {
                    p.provider_number: p.air_access_list
                    for p in providers
                    if p.air_access_list
                },
            },
        },
    }
