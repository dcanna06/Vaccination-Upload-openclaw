"""Provider-location linking and AIR Authorisation API endpoints."""

from typing import Any

import structlog
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.location import Location, LocationProvider
from app.models.user import User
from app.schemas.provider import HW027StatusUpdate, ProviderLinkRequest, ProviderRead
from app.services.air_authorisation import AIRAuthorisationClient
from app.services.proda_auth import ProdaAuthService

router = APIRouter(prefix="/api/providers", tags=["providers"])
logger = structlog.get_logger(__name__)


@router.post("", response_model=ProviderRead, status_code=201)
async def link_provider(
    body: ProviderLinkRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProviderRead:
    """Link a provider to a location."""
    # Verify location exists
    loc_result = await db.execute(
        select(Location).where(Location.id == body.location_id)
    )
    if not loc_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Location not found")

    # Check for duplicate
    existing = await db.execute(
        select(LocationProvider).where(
            LocationProvider.location_id == body.location_id,
            LocationProvider.provider_number == body.provider_number,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409, detail="Provider already linked to this location"
        )

    provider = LocationProvider(
        location_id=body.location_id,
        provider_number=body.provider_number,
        provider_type=body.provider_type,
    )
    db.add(provider)
    await db.commit()
    await db.refresh(provider)
    logger.info(
        "provider_linked",
        location_id=body.location_id,
        provider_number=body.provider_number,
    )
    return ProviderRead.model_validate(provider)


@router.get("", response_model=list[ProviderRead])
async def list_providers(
    location_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ProviderRead]:
    """List providers, optionally filtered by location."""
    stmt = select(LocationProvider)
    if location_id is not None:
        stmt = stmt.where(LocationProvider.location_id == location_id)
    stmt = stmt.order_by(LocationProvider.provider_number)
    result = await db.execute(stmt)
    return [ProviderRead.model_validate(p) for p in result.scalars().all()]


@router.delete("/{provider_id}", status_code=204)
async def unlink_provider(
    provider_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    """Unlink a provider from a location (hard delete)."""
    result = await db.execute(
        select(LocationProvider).where(LocationProvider.id == provider_id)
    )
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider link not found")
    await db.delete(provider)
    await db.commit()
    logger.info("provider_unlinked", provider_id=provider_id)


@router.post("/{provider_id}/verify")
async def verify_provider(
    provider_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Verify a provider's AIR access list via the Authorisation API."""
    result = await db.execute(
        select(LocationProvider).where(LocationProvider.id == provider_id)
    )
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider link not found")

    # Get the location's minor_id for the API call
    loc_result = await db.execute(
        select(Location).where(Location.id == provider.location_id)
    )
    location = loc_result.scalar_one_or_none()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    proda = ProdaAuthService()
    token = await proda.get_token()
    auth_client = AIRAuthorisationClient(
        access_token=token, minor_id=location.minor_id
    )
    api_result = await auth_client.get_access_list(provider.provider_number)

    # Store access list in DB
    if api_result.get("status") == "success":
        provider.air_access_list = api_result.get("accessList")
        await db.commit()
        await db.refresh(provider)

    logger.info(
        "provider_verified",
        provider_id=provider_id,
        provider_number=provider.provider_number,
        result_status=api_result.get("status"),
    )
    return api_result


@router.patch("/{provider_id}/hw027", response_model=ProviderRead)
async def update_hw027_status(
    provider_id: int,
    body: HW027StatusUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProviderRead:
    """Update HW027 form submission status for a provider."""
    result = await db.execute(
        select(LocationProvider).where(LocationProvider.id == provider_id)
    )
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider link not found")

    provider.hw027_status = body.hw027_status
    await db.commit()
    await db.refresh(provider)
    logger.info(
        "hw027_status_updated",
        provider_id=provider_id,
        new_status=body.hw027_status,
    )
    return ProviderRead.model_validate(provider)
