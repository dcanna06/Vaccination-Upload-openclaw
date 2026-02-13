"""Resident management endpoints for the Aged Care Portal."""

import io
from datetime import date

import structlog
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.resident import Resident, ResidentEligibility
from app.models.user import User
from app.schemas.resident import (
    EligibilityResponse,
    ResidentBulkCreate,
    ResidentCreate,
    ResidentResponse,
    ResidentStatusUpdate,
    ResidentUpdate,
)

log = structlog.get_logger()

router = APIRouter(prefix="/api/v1/portals/residents", tags=["portal-residents"])


@router.get("", response_model=list[ResidentResponse])
async def list_residents(
    facility_id: int | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ResidentResponse]:
    """List residents with optional filters."""
    stmt = select(Resident).order_by(Resident.last_name, Resident.first_name)
    if facility_id is not None:
        stmt = stmt.where(Resident.facility_id == facility_id)
    if status is not None:
        stmt = stmt.where(Resident.status == status)
    result = await db.execute(stmt)
    residents = result.scalars().all()
    log.info(
        "residents.listed",
        user_id=user.id,
        facility_id=facility_id,
        count=len(residents),
    )
    return [ResidentResponse.model_validate(r) for r in residents]


@router.post("", response_model=ResidentResponse, status_code=201)
async def create_resident(
    body: ResidentCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ResidentResponse:
    """Add a single resident."""
    resident = Resident(**body.model_dump())
    db.add(resident)
    await db.commit()
    await db.refresh(resident)
    log.info(
        "resident.created",
        resident_id=resident.id,
        facility_id=resident.facility_id,
    )
    return ResidentResponse.model_validate(resident)


@router.post("/bulk", response_model=list[ResidentResponse], status_code=201)
async def create_residents_bulk(
    body: ResidentBulkCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ResidentResponse]:
    """Add multiple residents at once."""
    created = []
    for item in body.residents:
        resident = Resident(**item.model_dump())
        db.add(resident)
        created.append(resident)
    await db.commit()
    for r in created:
        await db.refresh(r)
    log.info("residents.bulk_created", count=len(created), user_id=user.id)
    return [ResidentResponse.model_validate(r) for r in created]


@router.post("/upload", response_model=list[ResidentResponse], status_code=201)
async def upload_residents(
    facility_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ResidentResponse]:
    """Upload residents from an Excel file.

    Expected columns: first_name, last_name, date_of_birth, gender,
    medicare_number, ihi_number, room, wing, gp_name
    """
    if not file.filename or not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=400, detail="Only .xlsx or .xls files are accepted"
        )

    try:
        import openpyxl
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="openpyxl is required for Excel upload support",
        )

    contents = await file.read()
    wb = openpyxl.load_workbook(io.BytesIO(contents), read_only=True)
    ws = wb.active
    if ws is None:
        raise HTTPException(status_code=400, detail="Empty workbook")

    rows = list(ws.iter_rows(min_row=1, values_only=True))
    if len(rows) < 2:
        raise HTTPException(status_code=400, detail="No data rows found")

    # Map header names to column indices
    headers = [str(h).strip().lower() if h else "" for h in rows[0]]
    required = {"first_name", "last_name", "date_of_birth"}
    if not required.issubset(set(headers)):
        raise HTTPException(
            status_code=400,
            detail=f"Missing required columns: {required - set(headers)}",
        )

    col_map = {name: idx for idx, name in enumerate(headers) if name}
    created: list[Resident] = []

    for row_num, row in enumerate(rows[1:], start=2):
        try:
            first_name = str(row[col_map["first_name"]] or "").strip()
            last_name = str(row[col_map["last_name"]] or "").strip()
            dob_raw = row[col_map["date_of_birth"]]

            if not first_name or not last_name or not dob_raw:
                continue  # skip incomplete rows

            dob: date
            if isinstance(dob_raw, date):
                dob = dob_raw
            else:
                dob = date.fromisoformat(str(dob_raw).strip()[:10])

            resident = Resident(
                facility_id=facility_id,
                first_name=first_name,
                last_name=last_name,
                date_of_birth=dob,
                gender=str(row[col_map.get("gender", -1)] or "F").strip()[:1].upper() if col_map.get("gender") is not None and col_map["gender"] < len(row) else "F",
                medicare_number=str(row[col_map["medicare_number"]]).strip() if col_map.get("medicare_number") is not None and col_map["medicare_number"] < len(row) and row[col_map["medicare_number"]] else None,
                ihi_number=str(row[col_map["ihi_number"]]).strip() if col_map.get("ihi_number") is not None and col_map["ihi_number"] < len(row) and row[col_map["ihi_number"]] else None,
                room=str(row[col_map["room"]]).strip() if col_map.get("room") is not None and col_map["room"] < len(row) and row[col_map["room"]] else None,
                wing=str(row[col_map["wing"]]).strip() if col_map.get("wing") is not None and col_map["wing"] < len(row) and row[col_map["wing"]] else None,
                gp_name=str(row[col_map["gp_name"]]).strip() if col_map.get("gp_name") is not None and col_map["gp_name"] < len(row) and row[col_map["gp_name"]] else None,
            )
            db.add(resident)
            created.append(resident)
        except (ValueError, IndexError, KeyError) as exc:
            log.warning("residents.upload_row_error", row=row_num, error=str(exc))
            continue

    await db.commit()
    for r in created:
        await db.refresh(r)

    log.info("residents.uploaded", count=len(created), facility_id=facility_id)
    return [ResidentResponse.model_validate(r) for r in created]


@router.patch("/{resident_id}", response_model=ResidentResponse)
async def update_resident(
    resident_id: int,
    body: ResidentUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ResidentResponse:
    """Update a resident's details."""
    resident = await _get_resident_or_404(db, resident_id)
    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(resident, field, value)
    await db.commit()
    await db.refresh(resident)
    log.info("resident.updated", resident_id=resident.id, fields=list(updates.keys()))
    return ResidentResponse.model_validate(resident)


@router.patch("/{resident_id}/status", response_model=ResidentResponse)
async def update_resident_status(
    resident_id: int,
    body: ResidentStatusUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ResidentResponse:
    """Activate, deactivate, or discharge a resident."""
    resident = await _get_resident_or_404(db, resident_id)
    resident.status = body.status
    await db.commit()
    await db.refresh(resident)
    log.info(
        "resident.status_changed", resident_id=resident.id, status=body.status
    )
    return ResidentResponse.model_validate(resident)


@router.get("/{resident_id}/eligibility", response_model=list[EligibilityResponse])
async def get_resident_eligibility(
    resident_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[EligibilityResponse]:
    """Get vaccine eligibility data for a specific resident."""
    # Verify resident exists
    await _get_resident_or_404(db, resident_id)
    result = await db.execute(
        select(ResidentEligibility)
        .where(ResidentEligibility.resident_id == resident_id)
        .order_by(ResidentEligibility.vaccine_code)
    )
    records = result.scalars().all()
    return [EligibilityResponse.model_validate(r) for r in records]


# ── Helpers ──────────────────────────────────────────────────────────────


async def _get_resident_or_404(db: AsyncSession, resident_id: int) -> Resident:
    """Fetch a resident by ID or raise 404."""
    result = await db.execute(select(Resident).where(Resident.id == resident_id))
    resident = result.scalar_one_or_none()
    if resident is None:
        raise HTTPException(status_code=404, detail="Resident not found")
    return resident
