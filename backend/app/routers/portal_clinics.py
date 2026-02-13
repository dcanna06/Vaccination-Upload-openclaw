"""Clinic management endpoints for the Aged Care Portal."""

from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.clinic import Clinic
from app.models.clinic_resident import ClinicResident
from app.models.facility import Facility
from app.models.resident import Resident
from app.models.user import User
from app.schemas.clinic import (
    ClinicCreate,
    ClinicResidentAssign,
    ClinicResidentResponse,
    ClinicResponse,
    ClinicUpdate,
    ConsentUpdate,
    RunSheetEntry,
    RunSheetResponse,
)

log = structlog.get_logger()

router = APIRouter(prefix="/api/v1/portals/clinics", tags=["portal-clinics"])


@router.get("", response_model=list[ClinicResponse])
async def list_clinics(
    facility_id: int | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ClinicResponse]:
    """List clinics with optional filters."""
    stmt = select(Clinic).order_by(Clinic.clinic_date.desc())
    if facility_id is not None:
        stmt = stmt.where(Clinic.facility_id == facility_id)
    if status is not None:
        stmt = stmt.where(Clinic.status == status)
    result = await db.execute(stmt)
    clinics = result.scalars().all()
    log.info("clinics.listed", user_id=user.id, count=len(clinics))
    return [ClinicResponse.model_validate(c) for c in clinics]


@router.post("", response_model=ClinicResponse, status_code=201)
async def create_clinic(
    body: ClinicCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ClinicResponse:
    """Create a new vaccination clinic."""
    clinic = Clinic(
        facility_id=body.facility_id,
        name=body.name,
        clinic_date=body.clinic_date,
        time_range=body.time_range,
        location=body.location,
        pharmacist_name=body.pharmacist_name,
        vaccines=body.vaccines,
        status=body.status,
        created_by=user.id,
    )
    db.add(clinic)
    await db.commit()
    await db.refresh(clinic)
    log.info("clinic.created", clinic_id=clinic.id, facility_id=clinic.facility_id)
    return ClinicResponse.model_validate(clinic)


@router.patch("/{clinic_id}", response_model=ClinicResponse)
async def update_clinic(
    clinic_id: int,
    body: ClinicUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ClinicResponse:
    """Update a clinic's details."""
    clinic = await _get_clinic_or_404(db, clinic_id)
    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(clinic, field, value)
    await db.commit()
    await db.refresh(clinic)
    log.info("clinic.updated", clinic_id=clinic.id, fields=list(updates.keys()))
    return ClinicResponse.model_validate(clinic)


@router.post(
    "/{clinic_id}/residents",
    response_model=list[ClinicResidentResponse],
    status_code=201,
)
async def assign_residents(
    clinic_id: int,
    body: ClinicResidentAssign,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ClinicResidentResponse]:
    """Assign residents to a clinic for a specific vaccine."""
    clinic = await _get_clinic_or_404(db, clinic_id)
    created: list[ClinicResident] = []

    for resident_id in body.resident_ids:
        # Verify resident exists
        res = await db.execute(
            select(Resident).where(Resident.id == resident_id)
        )
        if res.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=404,
                detail=f"Resident {resident_id} not found",
            )

        # Check for duplicate assignment
        existing = await db.execute(
            select(ClinicResident).where(
                ClinicResident.clinic_id == clinic_id,
                ClinicResident.resident_id == resident_id,
                ClinicResident.vaccine_code == body.vaccine_code,
            )
        )
        if existing.scalar_one_or_none() is not None:
            continue  # skip duplicates

        cr = ClinicResident(
            clinic_id=clinic_id,
            resident_id=resident_id,
            vaccine_code=body.vaccine_code,
        )
        db.add(cr)
        created.append(cr)

    await db.commit()
    for cr in created:
        await db.refresh(cr)

    log.info(
        "clinic.residents_assigned",
        clinic_id=clinic_id,
        count=len(created),
        vaccine_code=body.vaccine_code,
    )
    return [ClinicResidentResponse.model_validate(cr) for cr in created]


@router.patch(
    "/{clinic_id}/residents/{resident_id}/consent",
    response_model=ClinicResidentResponse,
)
async def update_consent(
    clinic_id: int,
    resident_id: int,
    body: ConsentUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ClinicResidentResponse:
    """Update consent status for a clinic resident."""
    result = await db.execute(
        select(ClinicResident).where(
            ClinicResident.clinic_id == clinic_id,
            ClinicResident.resident_id == resident_id,
        )
    )
    cr = result.scalar_one_or_none()
    if cr is None:
        raise HTTPException(
            status_code=404,
            detail="Clinic-resident assignment not found",
        )
    cr.consent_status = body.consent_status
    cr.consented_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(cr)
    log.info(
        "clinic.consent_updated",
        clinic_id=clinic_id,
        resident_id=resident_id,
        consent_status=body.consent_status,
    )
    return ClinicResidentResponse.model_validate(cr)


@router.get("/{clinic_id}/runsheet", response_model=RunSheetResponse)
async def get_runsheet(
    clinic_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> RunSheetResponse:
    """Get the printable run sheet for a clinic."""
    clinic = await _get_clinic_or_404(db, clinic_id)

    # Get facility name
    fac_result = await db.execute(
        select(Facility).where(Facility.id == clinic.facility_id)
    )
    facility = fac_result.scalar_one_or_none()
    facility_name = facility.name if facility else "Unknown"

    # Get all assignments with resident details
    result = await db.execute(
        select(ClinicResident, Resident)
        .join(Resident, ClinicResident.resident_id == Resident.id)
        .where(ClinicResident.clinic_id == clinic_id)
        .order_by(Resident.last_name, Resident.first_name)
    )
    rows = result.all()

    entries = [
        RunSheetEntry(
            resident_id=resident.id,
            first_name=resident.first_name,
            last_name=resident.last_name,
            date_of_birth=resident.date_of_birth,
            room=resident.room,
            wing=resident.wing,
            vaccine_code=cr.vaccine_code,
            consent_status=cr.consent_status,
            is_eligible=cr.is_eligible,
            administered=cr.administered,
        )
        for cr, resident in rows
    ]

    return RunSheetResponse(
        clinic_id=clinic.id,
        clinic_name=clinic.name,
        clinic_date=clinic.clinic_date,
        facility_name=facility_name,
        pharmacist_name=clinic.pharmacist_name,
        entries=entries,
    )


# ── Helpers ──────────────────────────────────────────────────────────────


async def _get_clinic_or_404(db: AsyncSession, clinic_id: int) -> Clinic:
    """Fetch a clinic by ID or raise 404."""
    result = await db.execute(select(Clinic).where(Clinic.id == clinic_id))
    clinic = result.scalar_one_or_none()
    if clinic is None:
        raise HTTPException(status_code=404, detail="Clinic not found")
    return clinic
