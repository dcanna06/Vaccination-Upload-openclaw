"""Submission results API endpoints.

Provides detailed per-record results for a submission, including
individual data, encounter data, AIR response details, episodes,
and error information.

DEV-001: API endpoint for submission results
"""

from __future__ import annotations

from typing import Any
from uuid import uuid4

import structlog
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services.submission_store import SubmissionStore
from app.services.air_response_parser import parse_air_response

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
