"""Submission results, resubmit, and confirm API endpoints.

Provides detailed per-record results for a submission, including
individual data, encounter data, AIR response details, episodes,
and error information.

DEV-001: API endpoint for submission results
DEV-006: Resubmit + Confirm endpoints
"""

from __future__ import annotations

import csv
import io
from typing import Any
from uuid import uuid4

import structlog
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.config import settings
from app.services.submission_store import SubmissionStore
from app.services.air_response_parser import parse_air_response
from app.services.air_resubmit import ResubmitService, ConfirmService
from app.services.air_client import AIRClient
from app.services.proda_auth import ProdaAuthService

router = APIRouter(prefix="/api", tags=["submission-results"])
logger = structlog.get_logger(__name__)

_store = SubmissionStore()


class SubmissionResultResponse(BaseModel):
    id: str
    completedAt: str
    submittedBy: str
    batchName: str
    environment: str
    counts: dict[str, int]
    records: list[dict[str, Any]]


def _build_individual_data(request_payload: dict[str, Any]) -> dict[str, Any]:
    """Extract individual data from the original request payload."""
    individual = request_payload.get("individual", {})
    personal = individual.get("personalDetails", {})
    medicare = individual.get("medicareCard", {})

    return {
        "firstName": personal.get("firstName", ""),
        "lastName": personal.get("lastName", ""),
        "dob": personal.get("dateOfBirth", ""),
        "gender": personal.get("gender", ""),
        "medicare": medicare.get("medicareCardNumber", ""),
        "irn": str(medicare.get("medicareIRN", "")),
        "ihiNumber": individual.get("ihiNumber", ""),
        "postCode": individual.get("address", {}).get("postCode", ""),
        "addressLineOne": individual.get("address", {}).get("addressLineOne", ""),
        "locality": individual.get("address", {}).get("locality", ""),
    }


def _build_encounter_data(request_payload: dict[str, Any]) -> dict[str, Any]:
    """Extract encounter data from the first encounter in the request payload."""
    encounters = request_payload.get("encounters", [])
    if not encounters:
        return {}

    enc = encounters[0]
    episodes = enc.get("episodes", [])
    ep = episodes[0] if episodes else {}

    return {
        "dateOfService": enc.get("dateOfService", ""),
        "vaccineCode": ep.get("vaccineCode", ""),
        "vaccineDose": ep.get("vaccineDose", ""),
        "vaccineBatch": ep.get("vaccineBatch", ""),
        "vaccineType": ep.get("vaccineType", ""),
        "routeOfAdministration": ep.get("routeOfAdministration", ""),
        "providerNumber": request_payload.get("informationProvider", {}).get("providerNumber", ""),
    }


def _build_record(
    row_number: int,
    request_payload: dict[str, Any],
    response_data: dict[str, Any],
    parsed: dict[str, Any],
    resubmit_count: int = 0,
) -> dict[str, Any]:
    """Build a single submission record for the results response."""
    individual = _build_individual_data(request_payload)
    encounter = _build_encounter_data(request_payload)

    # Map episode results with vaccine code from request
    episodes = []
    request_encounters = request_payload.get("encounters", [])
    for ep in parsed.get("air_episodes", []):
        # Find matching vaccine code from request
        vaccine = ""
        enc_id = ep.get("encounterId", "")
        ep_id = ep.get("id", "")
        for req_enc in request_encounters:
            if str(req_enc.get("id", "")) == enc_id:
                for req_ep in req_enc.get("episodes", []):
                    if str(req_ep.get("id", "")) == ep_id:
                        vaccine = req_ep.get("vaccineCode", "")
                        break
        episodes.append({
            "id": ep["id"],
            "vaccine": vaccine,
            "status": ep.get("status", ""),
            "code": ep.get("code", ""),
            "message": ep.get("message", ""),  # VERBATIM
        })

    # Map errors with verbatim messages
    errors = []
    for err in parsed.get("air_errors", []):
        errors.append({
            "code": err.get("code", ""),
            "field": err.get("field", ""),
            "message": err.get("message", ""),  # VERBATIM
        })

    return {
        "rowNumber": row_number,
        "individual": individual,
        "encounter": encounter,
        "status": parsed["status"],
        "airStatusCode": parsed["air_status_code"],
        "airMessage": parsed["air_message"],  # VERBATIM — never truncate
        "errors": errors,
        "episodes": episodes,
        "claimId": parsed.get("claim_id"),
        "claimSequenceNumber": parsed.get("claim_sequence_number"),
        "actionRequired": parsed["action_required"],
        "resubmitCount": resubmit_count,
    }


@router.get("/submissions/{submission_id}/results")
async def get_submission_results(
    submission_id: str,
    status_filter: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
) -> dict[str, Any]:
    """Get detailed results for a submission.

    Returns per-record results with individual data, encounter data,
    AIR status codes, verbatim messages, errors, and episodes.
    Supports filtering by status and pagination.
    """
    metadata = _store.load_metadata(submission_id)
    if not metadata:
        raise HTTPException(status_code=404, detail="Submission not found")

    results = metadata.get("results", {}) or {}
    raw_results = results.get("results", [])

    # Build detailed records from stored payloads
    records: list[dict[str, Any]] = []
    for idx, r in enumerate(raw_results):
        source_rows = r.get("sourceRows", [])
        row_num = source_rows[0] if source_rows else idx + 1

        # Load stored request/response payloads for this encounter
        request_payload = _load_payload(submission_id, idx + 1, "request")
        response_payload = _load_payload(submission_id, idx + 1, "response")

        # Parse the AIR response if we have one
        if response_payload:
            parsed = parse_air_response(response_payload, request_payload)
        else:
            # Fall back to the inline result data
            raw_response = r.get("rawResponse", {})
            if raw_response:
                parsed = parse_air_response(raw_response, request_payload)
            else:
                # Minimal fallback
                air_status = r.get("status", "unknown")
                if air_status == "success":
                    status = "SUCCESS"
                elif air_status == "warning":
                    status = "WARNING"
                else:
                    status = "ERROR"
                parsed = {
                    "status": status,
                    "air_status_code": r.get("statusCode", ""),
                    "air_message": r.get("message", ""),  # VERBATIM
                    "air_errors": [],
                    "air_episodes": [],
                    "air_encounters": [],
                    "claim_id": r.get("claimId"),
                    "claim_sequence_number": r.get("claimSequenceNumber"),
                    "action_required": "NONE",
                }

        if not request_payload:
            request_payload = {}

        record = _build_record(row_num, request_payload, response_payload or {}, parsed)
        records.append(record)

    # Count totals
    counts = {
        "total": len(records),
        "success": sum(1 for r in records if r["status"] == "SUCCESS"),
        "warning": sum(1 for r in records if r["status"] == "WARNING"),
        "error": sum(1 for r in records if r["status"] == "ERROR"),
    }

    # Filter by status if requested
    if status_filter and status_filter.upper() in ("SUCCESS", "WARNING", "ERROR"):
        records = [r for r in records if r["status"] == status_filter.upper()]

    # Pagination
    total_filtered = len(records)
    start = (page - 1) * page_size
    end = start + page_size
    paginated_records = records[start:end]

    return {
        "id": submission_id,
        "completedAt": metadata.get("completedAt", ""),
        "submittedBy": "",
        "batchName": "",
        "environment": metadata.get("environment", "VENDOR_TEST"),
        "counts": counts,
        "records": paginated_records,
        "pagination": {
            "page": page,
            "pageSize": page_size,
            "totalRecords": total_filtered,
            "totalPages": (total_filtered + page_size - 1) // page_size if total_filtered > 0 else 1,
        },
    }


def _load_payload(submission_id: str, encounter_index: int, kind: str) -> dict[str, Any] | None:
    """Load a request or response payload JSON file."""
    import json

    prefix = f"{encounter_index:03d}"
    path = _store._base / submission_id / "payloads" / f"{prefix}_{kind}.json"
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        # Remove internal timestamp
        data.pop("_timestamp", None)
        return data
    except (json.JSONDecodeError, OSError):
        return None


# --- DEV-006: Resubmit + Confirm endpoints ---


class ResubmitRequest(BaseModel):
    individual: dict[str, Any]
    encounter: dict[str, Any]


@router.post("/submissions/{submission_id}/records/{row}/resubmit")
async def resubmit_record(
    submission_id: str,
    row: int,
    data: ResubmitRequest,
) -> dict[str, Any]:
    """Build a fresh AddEncounterRequestType from edited data and send to AIR.

    Does NOT include claimId — this is a new submission.
    """
    metadata = _store.load_metadata(submission_id)
    if not metadata:
        raise HTTPException(status_code=404, detail="Submission not found")

    # Get PRODA token and create AIR client
    proda = ProdaAuthService()
    token = await proda.get_token()
    air_client = AIRClient(access_token=token)
    resubmit_service = ResubmitService(air_client)

    # Get information provider from submission metadata
    info_provider = metadata.get("informationProvider", {})
    if not info_provider.get("providerNumber"):
        info_provider = {"providerNumber": settings.AIR_PROVIDER_NUMBER}

    result = await resubmit_service.resubmit(
        individual=data.individual,
        encounter=data.encounter,
        information_provider=info_provider,
    )

    logger.info(
        "record_resubmitted",
        submission_id=submission_id,
        row=row,
        status=result["status"],
    )

    # Return the parsed result for the frontend
    return {
        "status": result["status"],
        "airStatusCode": result["air_status_code"],
        "airMessage": result["air_message"],  # VERBATIM
        "errors": result["air_errors"],
        "episodes": result["air_episodes"],
        "claimId": result.get("claim_id"),
        "actionRequired": result["action_required"],
    }


@router.post("/submissions/{submission_id}/records/{row}/confirm")
async def confirm_record(
    submission_id: str,
    row: int,
) -> dict[str, Any]:
    """Confirm a record that requires confirmation (AIR-W-1004, pended episodes).

    Uses stored claimId + claimSequenceNumber. Sets acceptAndConfirm=Y.
    Already-successful encounters MUST be excluded.
    """
    metadata = _store.load_metadata(submission_id)
    if not metadata:
        raise HTTPException(status_code=404, detail="Submission not found")

    # Find the encounter index for this row
    results = metadata.get("results", {}) or {}
    raw_results = results.get("results", [])

    encounter_index = None
    claim_id = None
    claim_seq = None
    dob_iso = None

    for idx, r in enumerate(raw_results):
        source_rows = r.get("sourceRows", [])
        row_num = source_rows[0] if source_rows else idx + 1
        if row_num == row:
            encounter_index = idx + 1
            raw_response = r.get("rawResponse", {})
            claim_details = raw_response.get("claimDetails", {}) or {}
            claim_id = claim_details.get("claimId") or r.get("claimId")
            claim_seq = claim_details.get("claimSequenceNumber") or r.get("claimSequenceNumber")
            break

    if encounter_index is None:
        raise HTTPException(status_code=404, detail="Record not found")

    if not claim_id:
        raise HTTPException(status_code=400, detail="No claimId for this record — cannot confirm")

    # Load original request payload
    request_payload = _load_payload(submission_id, encounter_index, "request")
    if not request_payload:
        raise HTTPException(status_code=400, detail="Original request payload not found")

    # Extract DOB from original payload
    personal = request_payload.get("individual", {}).get("personalDetails", {})
    dob_ddmmyyyy = personal.get("dateOfBirth", "")
    if len(dob_ddmmyyyy) == 8 and dob_ddmmyyyy.isdigit():
        dob_iso = f"{dob_ddmmyyyy[4:8]}-{dob_ddmmyyyy[2:4]}-{dob_ddmmyyyy[0:2]}"
    else:
        dob_iso = dob_ddmmyyyy

    # Get PRODA token and confirm
    proda = ProdaAuthService()
    token = await proda.get_token()
    air_client = AIRClient(access_token=token)
    confirm_service = ConfirmService(air_client)

    result = await confirm_service.confirm_record(
        original_payload=request_payload,
        claim_id=claim_id,
        claim_sequence_number=claim_seq,
        dob=dob_iso,
    )

    logger.info(
        "record_confirmed",
        submission_id=submission_id,
        row=row,
        claim_id=claim_id,
        status=result["status"],
    )

    return {
        "status": result["status"],
        "airStatusCode": result["air_status_code"],
        "airMessage": result["air_message"],  # VERBATIM
        "claimId": result.get("claim_id"),
    }


@router.post("/submissions/{submission_id}/confirm-all-warnings")
async def confirm_all_warnings(submission_id: str) -> dict[str, Any]:
    """Batch confirm all CONFIRM_OR_CORRECT records in a submission."""
    metadata = _store.load_metadata(submission_id)
    if not metadata:
        raise HTTPException(status_code=404, detail="Submission not found")

    results_data = metadata.get("results", {}) or {}
    raw_results = results_data.get("results", [])

    # Get PRODA token once for all confirmations
    proda = ProdaAuthService()
    token = await proda.get_token()
    air_client = AIRClient(access_token=token)
    confirm_service = ConfirmService(air_client)

    confirmed = 0
    failed = 0
    confirmation_results: list[dict[str, Any]] = []

    for idx, r in enumerate(raw_results):
        # Check if this result requires confirmation
        raw_response = r.get("rawResponse", {})
        status_code = raw_response.get("statusCode", r.get("statusCode", ""))

        if status_code not in ("AIR-W-1004", "AIR-W-1008", "AIR-W-1001"):
            continue

        source_rows = r.get("sourceRows", [])
        row_num = source_rows[0] if source_rows else idx + 1
        encounter_index = idx + 1

        claim_details = raw_response.get("claimDetails", {}) or {}
        claim_id = claim_details.get("claimId") or r.get("claimId")

        if not claim_id:
            confirmation_results.append({
                "row": row_num,
                "status": "ERROR",
                "message": "No claimId available",
            })
            failed += 1
            continue

        claim_seq = claim_details.get("claimSequenceNumber") or r.get("claimSequenceNumber")

        request_payload = _load_payload(submission_id, encounter_index, "request")
        if not request_payload:
            confirmation_results.append({
                "row": row_num,
                "status": "ERROR",
                "message": "Original payload not found",
            })
            failed += 1
            continue

        # Extract DOB
        personal = request_payload.get("individual", {}).get("personalDetails", {})
        dob_ddmmyyyy = personal.get("dateOfBirth", "")
        if len(dob_ddmmyyyy) == 8 and dob_ddmmyyyy.isdigit():
            dob_iso = f"{dob_ddmmyyyy[4:8]}-{dob_ddmmyyyy[2:4]}-{dob_ddmmyyyy[0:2]}"
        else:
            dob_iso = dob_ddmmyyyy

        try:
            result = await confirm_service.confirm_record(
                original_payload=request_payload,
                claim_id=claim_id,
                claim_sequence_number=claim_seq,
                dob=dob_iso,
            )
            confirmation_results.append({
                "row": row_num,
                "status": result["status"],
                "airStatusCode": result["air_status_code"],
                "airMessage": result["air_message"],  # VERBATIM
            })
            if result["status"] in ("SUCCESS", "WARNING"):
                confirmed += 1
            else:
                failed += 1
        except Exception as e:
            logger.error("confirm_all_single_failed", row=row_num, error=str(e))
            confirmation_results.append({
                "row": row_num,
                "status": "ERROR",
                "message": str(e),
            })
            failed += 1

    logger.info(
        "confirm_all_completed",
        submission_id=submission_id,
        confirmed=confirmed,
        failed=failed,
    )

    return {
        "confirmed": confirmed,
        "failed": failed,
        "results": confirmation_results,
    }


# --- DEV-010: Export results ---


@router.get("/submissions/{submission_id}/export")
async def export_results(
    submission_id: str,
    format: str = Query("csv", pattern="^(csv)$"),
) -> StreamingResponse:
    """Export detailed submission results as CSV.

    Includes per-record individual data, encounter data, AIR status,
    verbatim AIR messages, errors, and episode results.
    """
    metadata = _store.load_metadata(submission_id)
    if not metadata:
        raise HTTPException(status_code=404, detail="Submission not found")

    results = metadata.get("results", {}) or {}
    raw_results = results.get("results", [])

    # Build detailed records
    records: list[dict[str, Any]] = []
    for idx, r in enumerate(raw_results):
        source_rows = r.get("sourceRows", [])
        row_num = source_rows[0] if source_rows else idx + 1

        request_payload = _load_payload(submission_id, idx + 1, "request")
        response_payload = _load_payload(submission_id, idx + 1, "response")

        if response_payload:
            parsed = parse_air_response(response_payload, request_payload)
        else:
            raw_response = r.get("rawResponse", {})
            if raw_response:
                parsed = parse_air_response(raw_response, request_payload)
            else:
                air_status = r.get("status", "unknown")
                parsed = {
                    "status": "SUCCESS" if air_status == "success" else "WARNING" if air_status == "warning" else "ERROR",
                    "air_status_code": r.get("statusCode", ""),
                    "air_message": r.get("message", ""),
                    "air_errors": [],
                    "air_episodes": [],
                    "claim_id": r.get("claimId"),
                    "claim_sequence_number": r.get("claimSequenceNumber"),
                    "action_required": "NONE",
                }

        if not request_payload:
            request_payload = {}

        record = _build_record(row_num, request_payload, response_payload or {}, parsed)
        records.append(record)

    # Build CSV
    buf = io.StringIO()
    writer = csv.writer(buf)

    # Header section
    writer.writerow(["AIR Submission Results Report"])
    writer.writerow(["Submission ID", submission_id])
    writer.writerow(["Completed", metadata.get("completedAt", "")])
    writer.writerow(["Environment", metadata.get("environment", "VENDOR_TEST")])
    writer.writerow([])

    # Summary
    success_count = sum(1 for r in records if r["status"] == "SUCCESS")
    warning_count = sum(1 for r in records if r["status"] == "WARNING")
    error_count = sum(1 for r in records if r["status"] == "ERROR")
    writer.writerow(["Total", "Success", "Warning", "Error"])
    writer.writerow([len(records), success_count, warning_count, error_count])
    writer.writerow([])

    # Detail rows
    writer.writerow([
        "Row", "Status", "AIR Code", "AIR Message",
        "First Name", "Last Name", "DOB", "Gender",
        "Medicare", "IRN",
        "Date of Service", "Vaccine Code", "Vaccine Dose", "Vaccine Batch",
        "Vaccine Type", "Route", "Provider",
        "Claim ID", "Action Required",
        "Errors", "Episodes",
    ])

    for rec in records:
        ind = rec.get("individual", {})
        enc = rec.get("encounter", {})
        errors_str = "; ".join(
            f"{e['code']}: {e['message']}" for e in rec.get("errors", [])
        )
        episodes_str = "; ".join(
            f"{ep.get('vaccine', '')} ({ep['status']})" for ep in rec.get("episodes", [])
        )
        writer.writerow([
            rec["rowNumber"],
            rec["status"],
            rec["airStatusCode"],
            rec["airMessage"],  # VERBATIM
            ind.get("firstName", ""),
            ind.get("lastName", ""),
            ind.get("dob", ""),
            ind.get("gender", ""),
            ind.get("medicare", ""),
            ind.get("irn", ""),
            enc.get("dateOfService", ""),
            enc.get("vaccineCode", ""),
            enc.get("vaccineDose", ""),
            enc.get("vaccineBatch", ""),
            enc.get("vaccineType", ""),
            enc.get("routeOfAdministration", ""),
            enc.get("providerNumber", ""),
            rec.get("claimId", ""),
            rec["actionRequired"],
            errors_str,
            episodes_str,
        ])

    buf.seek(0)
    filename = f"air-results-{submission_id[:8]}.csv"

    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
