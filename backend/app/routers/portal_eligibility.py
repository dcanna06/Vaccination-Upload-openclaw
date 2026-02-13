"""Eligibility aggregation and sync endpoints for the Aged Care Portal."""

from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.facility import Facility
from app.models.resident import Resident, ResidentEligibility
from app.models.user import User
from app.schemas.resident import EligibilityResponse

log = structlog.get_logger()

router = APIRouter(prefix="/api/v1/portals/eligibility", tags=["portal-eligibility"])


@router.get("", response_model=dict)
async def get_aggregated_eligibility(
    facility_id: int,
    vaccines: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Get aggregated eligibility data for a facility.

    Query params:
        facility_id: required
        vaccines: optional comma-separated vaccine codes to filter by
    """
    # Verify facility exists
    fac_result = await db.execute(
        select(Facility).where(Facility.id == facility_id)
    )
    if fac_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Facility not found")

    # Build base query: eligibility for active residents in this facility
    base = (
        select(ResidentEligibility)
        .join(Resident, ResidentEligibility.resident_id == Resident.id)
        .where(Resident.facility_id == facility_id, Resident.status == "active")
    )
    if vaccines:
        vaccine_list = [v.strip() for v in vaccines.split(",") if v.strip()]
        base = base.where(ResidentEligibility.vaccine_code.in_(vaccine_list))

    result = await db.execute(base)
    records = result.scalars().all()

    # Aggregate counts per vaccine_code
    summary: dict[str, dict] = {}
    for rec in records:
        entry = summary.setdefault(rec.vaccine_code, {
            "vaccine_code": rec.vaccine_code,
            "total": 0,
            "due": 0,
            "overdue": 0,
        })
        entry["total"] += 1
        if rec.is_due:
            entry["due"] += 1
        if rec.is_overdue:
            entry["overdue"] += 1

    # Also get total active residents in facility
    count_result = await db.execute(
        select(func.count(Resident.id)).where(
            Resident.facility_id == facility_id,
            Resident.status == "active",
        )
    )
    total_residents = count_result.scalar() or 0

    log.info(
        "eligibility.aggregated",
        facility_id=facility_id,
        vaccines=vaccines,
        total_residents=total_residents,
    )

    return {
        "facility_id": facility_id,
        "total_residents": total_residents,
        "vaccines": list(summary.values()),
        "records": [EligibilityResponse.model_validate(r) for r in records],
    }


@router.post("/sync/{facility_id}", response_model=dict)
async def sync_eligibility(
    facility_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Trigger an eligibility sync for a facility.

    In production this would call the AIR Catch-up Schedule API for
    each resident. For now it marks all existing records as synced.
    """
    # Verify facility exists
    fac_result = await db.execute(
        select(Facility).where(Facility.id == facility_id)
    )
    if fac_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Facility not found")

    # Get active residents
    residents_result = await db.execute(
        select(Resident.id).where(
            Resident.facility_id == facility_id,
            Resident.status == "active",
        )
    )
    resident_ids = [r for (r,) in residents_result.all()]

    if not resident_ids:
        return {"facility_id": facility_id, "synced": 0, "status": "no_residents"}

    # Update last_synced_at on all eligibility records
    now = datetime.now(timezone.utc)
    elig_result = await db.execute(
        select(ResidentEligibility).where(
            ResidentEligibility.resident_id.in_(resident_ids)
        )
    )
    records = elig_result.scalars().all()
    for rec in records:
        rec.last_synced_at = now

    await db.commit()

    log.info(
        "eligibility.synced",
        facility_id=facility_id,
        records_updated=len(records),
    )

    return {
        "facility_id": facility_id,
        "synced": len(records),
        "status": "complete",
        "synced_at": now.isoformat(),
    }
