"""Facility management endpoints for the Aged Care Portal."""

import structlog
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.facility import Facility, user_facilities
from app.models.user import User
from app.schemas.facility import (
    FacilityCreate,
    FacilityResponse,
    FacilityStatusUpdate,
    FacilityUpdate,
)

log = structlog.get_logger()

router = APIRouter(prefix="/api/v1/portals/facilities", tags=["portal-facilities"])


@router.get("", response_model=list[FacilityResponse])
async def list_facilities(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[FacilityResponse]:
    """List facilities the current user has access to."""
    # Super admins and org admins see all org facilities
    if user.role in ("super_admin", "org_admin"):
        stmt = (
            select(Facility)
            .where(Facility.organisation_id == user.organisation_id)
            .order_by(Facility.name)
        )
    else:
        # Other users see only assigned facilities
        stmt = (
            select(Facility)
            .join(user_facilities, user_facilities.c.facility_id == Facility.id)
            .where(user_facilities.c.user_id == user.id)
            .order_by(Facility.name)
        )
    result = await db.execute(stmt)
    facilities = result.scalars().all()
    log.info("facilities.listed", user_id=user.id, count=len(facilities))
    return [FacilityResponse.model_validate(f) for f in facilities]


@router.post("", response_model=FacilityResponse, status_code=201)
async def create_facility(
    body: FacilityCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("super_admin", "org_admin", "nurse_manager")),
) -> FacilityResponse:
    """Create a new facility."""
    facility = Facility(
        organisation_id=body.organisation_id,
        name=body.name,
        address=body.address,
        contact_person=body.contact_person,
        contact_phone=body.contact_phone,
        contact_email=body.contact_email,
        pharmacy_name=body.pharmacy_name,
        pharmacist_name=body.pharmacist_name,
    )
    db.add(facility)
    await db.commit()
    await db.refresh(facility)
    log.info("facility.created", facility_id=facility.id, name=facility.name)
    return FacilityResponse.model_validate(facility)


@router.get("/{facility_id}", response_model=FacilityResponse)
async def get_facility(
    facility_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FacilityResponse:
    """Get a single facility by ID."""
    facility = await _get_facility_or_404(db, facility_id)
    await _check_facility_access(db, user, facility)
    return FacilityResponse.model_validate(facility)


@router.patch("/{facility_id}", response_model=FacilityResponse)
async def update_facility(
    facility_id: int,
    body: FacilityUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("super_admin", "org_admin", "nurse_manager")),
) -> FacilityResponse:
    """Update a facility's details."""
    facility = await _get_facility_or_404(db, facility_id)
    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(facility, field, value)
    await db.commit()
    await db.refresh(facility)
    log.info("facility.updated", facility_id=facility.id, fields=list(updates.keys()))
    return FacilityResponse.model_validate(facility)


@router.patch("/{facility_id}/status", response_model=FacilityResponse)
async def update_facility_status(
    facility_id: int,
    body: FacilityStatusUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("super_admin", "org_admin")),
) -> FacilityResponse:
    """Activate or deactivate a facility."""
    facility = await _get_facility_or_404(db, facility_id)
    facility.status = body.status
    await db.commit()
    await db.refresh(facility)
    log.info("facility.status_changed", facility_id=facility.id, status=body.status)
    return FacilityResponse.model_validate(facility)


# ── Helpers ──────────────────────────────────────────────────────────────


async def _get_facility_or_404(db: AsyncSession, facility_id: int) -> Facility:
    """Fetch a facility by ID or raise 404."""
    result = await db.execute(select(Facility).where(Facility.id == facility_id))
    facility = result.scalar_one_or_none()
    if facility is None:
        raise HTTPException(status_code=404, detail="Facility not found")
    return facility


async def _check_facility_access(
    db: AsyncSession, user: User, facility: Facility
) -> None:
    """Ensure the user has access to this facility."""
    if user.role in ("super_admin", "org_admin"):
        if facility.organisation_id != user.organisation_id:
            raise HTTPException(status_code=403, detail="Access denied")
        return
    # Check user_facilities link
    result = await db.execute(
        select(user_facilities).where(
            user_facilities.c.user_id == user.id,
            user_facilities.c.facility_id == facility.id,
        )
    )
    if result.first() is None:
        raise HTTPException(status_code=403, detail="Access denied")
