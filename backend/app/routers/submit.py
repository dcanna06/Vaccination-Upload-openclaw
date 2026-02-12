"""Submission, progress, confirmation, results, and download endpoints."""

import asyncio
import csv
import io
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

import structlog

from app.services.air_client import AIRClient, BatchSubmissionService
from app.services.proda_auth import ProdaAuthService
from app.services.submission_store import SubmissionStore

router = APIRouter(prefix="/api", tags=["submit"])
logger = structlog.get_logger(__name__)

# Persistent JSON store — loads previous submissions on import
_store = SubmissionStore()
_submissions: dict[str, dict[str, Any]] = _store.load_all_metadata()


def _persist(submission_id: str) -> None:
    """Save current in-memory state to disk."""
    sub = _submissions.get(submission_id)
    if sub:
        _store.save_metadata(submission_id, sub)


class SubmitRequest(BaseModel):
    batches: list[dict[str, Any]]
    informationProvider: dict[str, Any]
    dryRun: bool = False
    locationId: int | None = None


class SubmitResponse(BaseModel):
    submissionId: str
    status: str
    totalBatches: int


class ConfirmRequest(BaseModel):
    confirmations: list[dict[str, Any]]


async def _resolve_location_minor_id(location_id: int | None) -> str | None:
    """Resolve a locationId to its minor_id from the database. Returns None if not found or not provided."""
    if location_id is None:
        return None
    from app.database import async_session_factory
    from app.services.location_manager import LocationManager

    async with async_session_factory() as session:
        mgr = LocationManager(session)
        return await mgr.get_minor_id(location_id)


async def _resolve_default_provider(location_id: int | None) -> str | None:
    """Resolve the default provider number for a location. Returns None if not found."""
    if location_id is None:
        return None
    from app.database import async_session_factory
    from app.services.location_manager import LocationManager

    async with async_session_factory() as session:
        mgr = LocationManager(session)
        return await mgr.get_default_provider(location_id)


async def _update_proda_link_status(location_id: int | None, status: str) -> None:
    """Update the PRODA link status for a location after a successful AIR call."""
    if location_id is None:
        return
    from app.database import async_session_factory
    from app.services.location_manager import LocationManager

    async with async_session_factory() as session:
        mgr = LocationManager(session)
        await mgr.update_proda_link_status(location_id, status)


async def _check_provider_location_links(
    location_id: int | None, batches: list[dict[str, Any]]
) -> list[str]:
    """Check that all providers in the batches are linked to the location.

    Returns list of unlinked provider numbers (empty if all linked or no location specified).
    """
    if location_id is None:
        return []
    from app.database import async_session_factory
    from app.services.location_manager import LocationManager

    provider_numbers: set[str] = set()
    for batch in batches:
        for encounter in batch.get("encounters", []):
            prov = encounter.get("immunisationProvider", {})
            pn = prov.get("providerNumber")
            if pn:
                provider_numbers.add(pn)

    if not provider_numbers:
        return []

    async with async_session_factory() as session:
        mgr = LocationManager(session)
        return await mgr.get_unlinked_providers(location_id, list(provider_numbers))


async def _run_submission(submission_id: str) -> None:
    """Background task that performs PRODA auth + AIR API calls."""
    sub = _submissions[submission_id]
    try:
        if sub["dryRun"]:
            total_records = sum(len(b.get("encounters", [])) for b in sub["batches"])
            result = {
                "status": "completed",
                "completedBatches": len(sub["batches"]),
                "successful": total_records,
                "failed": 0,
                "pendingConfirmation": 0,
                "results": [
                    {"batchIndex": i, "status": "success_dry_run", "message": "Dry run — not submitted to AIR"}
                    for i in range(len(sub["batches"]))
                ],
            }
        else:
            # Resolve per-location minor_id (falls back to config if None)
            location_minor_id = await _resolve_location_minor_id(sub.get("locationId"))

            # Auto-resolve informationProvider from location if empty
            info_provider = dict(sub["informationProvider"])
            if not info_provider.get("providerNumber") and sub.get("locationId"):
                resolved_provider = await _resolve_default_provider(sub["locationId"])
                if resolved_provider:
                    info_provider["providerNumber"] = resolved_provider
                    logger.info(
                        "provider_auto_resolved",
                        submission_id=submission_id,
                        location_id=sub["locationId"],
                        provider_number=resolved_provider,
                    )

            # Warn if providers are not linked to the selected location
            unlinked = await _check_provider_location_links(
                sub.get("locationId"), sub["batches"]
            )
            if unlinked:
                logger.warning(
                    "unlinked_providers_in_submission",
                    submission_id=submission_id,
                    unlinked_providers=unlinked,
                    location_id=sub.get("locationId"),
                )
                sub["warnings"] = sub.get("warnings", [])
                sub["warnings"].append(
                    f"Providers not linked to location: {', '.join(unlinked)}"
                )

            proda = ProdaAuthService()
            token = await proda.get_token()
            client = AIRClient(access_token=token, location_minor_id=location_minor_id)
            service = BatchSubmissionService(
                client, submission_id=submission_id, store=_store
            )
            result = await service.submit_batches(
                sub["batches"], info_provider
            )

            # Phase 2: Auto-update PRODA link status on first success
            if location_minor_id and result.get("successful", 0) > 0:
                await _update_proda_link_status(sub["locationId"], "linked")

        sub["results"] = result
        sub["completedAt"] = datetime.now(timezone.utc).isoformat()
        sub["status"] = result.get("status", "completed")
        sub["progress"]["status"] = result.get("status", "completed")
        sub["progress"]["completedBatches"] = result.get("completedBatches", 0)
        sub["progress"]["successfulRecords"] = result.get("successful", 0)
        sub["progress"]["failedRecords"] = result.get("failed", 0)
        sub["progress"]["pendingConfirmation"] = result.get("pendingConfirmation", 0)

        # Build confirmation records array from results with warning status
        pending_records = []
        for idx, r in enumerate(result.get("results", [])):
            if r.get("status") == "warning":
                raw_resp = r.get("rawResponse", {})
                claim = raw_resp.get("claimDetails", {})
                pending_records.append({
                    "recordId": f"r-{idx + 1}",
                    "rowNumber": r.get("sourceRows", [idx + 1])[0] if r.get("sourceRows") else idx + 1,
                    "reason": r.get("statusCode", ""),
                    "airMessage": r.get("message", raw_resp.get("message", "")),
                    "claimId": claim.get("claimId", ""),
                    "claimSequenceNumber": claim.get("claimSequenceNumber"),
                })
        sub["pendingConfirmationRecords"] = pending_records

    except Exception as e:
        logger.error("submission_background_error", submission_id=submission_id, error=str(e))
        sub["status"] = "error"
        sub["progress"]["status"] = "error"
        sub["results"] = {"status": "error", "error": str(e), "results": []}

    _persist(submission_id)


@router.post("/submit", response_model=SubmitResponse)
async def start_submission(request: SubmitRequest) -> SubmitResponse:
    """Start a batch submission to AIR (returns immediately, work runs in background)."""
    submission_id = str(uuid4())

    _submissions[submission_id] = {
        "status": "running",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "batches": request.batches,
        "informationProvider": request.informationProvider,
        "dryRun": request.dryRun,
        "locationId": request.locationId,
        "progress": {
            "totalBatches": len(request.batches),
            "completedBatches": 0,
            "successfulRecords": 0,
            "failedRecords": 0,
            "pendingConfirmation": 0,
            "currentBatch": 0,
            "status": "running",
        },
        "results": None,
    }

    _persist(submission_id)

    # Fire-and-forget: run submission in background so the HTTP response returns immediately
    asyncio.create_task(_run_submission(submission_id))

    logger.info(
        "submission_started",
        submission_id=submission_id,
        total_batches=len(request.batches),
        dry_run=request.dryRun,
    )

    return SubmitResponse(
        submissionId=submission_id,
        status="running",
        totalBatches=len(request.batches),
    )


@router.get("/submit/{submission_id}/progress")
async def get_progress(submission_id: str) -> dict[str, Any]:
    """Get submission progress."""
    sub = _submissions.get(submission_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    return {
        "submissionId": submission_id,
        "status": sub["status"],
        "progress": sub["progress"],
        "pendingConfirmation": sub.get("pendingConfirmationRecords", []),
    }


@router.post("/submit/{submission_id}/confirm")
async def confirm_records(submission_id: str, request: ConfirmRequest) -> dict[str, Any]:
    """Submit confirmations for records requiring confirmation.

    Delegates to the real confirmation service in submission_results router.
    Each confirmation must include recordId (matching a row with pending confirmation).
    """
    sub = _submissions.get(submission_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    from app.routers.submission_results import _store as results_store, _load_payload
    from app.services.air_resubmit import ConfirmService
    from app.services.air_client import AIRClient
    from app.services.proda_auth import ProdaAuthService

    results_data = sub.get("results", {})
    raw_results = results_data.get("results", [])
    confirmed_count = 0
    errors: list[dict[str, Any]] = []

    for conf in request.confirmations:
        record_id = conf.get("recordId", "")
        # Extract index from recordId format "r-N"
        try:
            idx = int(record_id.split("-")[1]) - 1
        except (IndexError, ValueError):
            errors.append({"recordId": record_id, "error": "Invalid recordId format"})
            continue

        if idx < 0 or idx >= len(raw_results):
            errors.append({"recordId": record_id, "error": "Record not found"})
            continue

        r = raw_results[idx]
        if r.get("status") != "warning":
            errors.append({"recordId": record_id, "error": "Record does not require confirmation"})
            continue

        raw_response = r.get("rawResponse", {})
        claim_details = raw_response.get("claimDetails", {})
        claim_id = claim_details.get("claimId")
        claim_seq = claim_details.get("claimSequenceNumber")

        if not claim_id:
            errors.append({"recordId": record_id, "error": "No claimId available for confirmation"})
            continue

        # Load original request payload
        original_payload = _load_payload(submission_id, idx + 1, "request")
        if not original_payload:
            errors.append({"recordId": record_id, "error": "Original payload not found"})
            continue

        # Extract DOB for header
        personal = original_payload.get("individual", {}).get("personalDetails", {})
        dob_raw = personal.get("dateOfBirth", "")
        if len(dob_raw) == 8 and dob_raw.isdigit():
            dob_iso = f"{dob_raw[4:8]}-{dob_raw[2:4]}-{dob_raw[0:2]}"
        else:
            dob_iso = dob_raw

        try:
            # Resolve location minor_id from original submission for confirmation
            confirm_minor_id = await _resolve_location_minor_id(sub.get("locationId"))
            proda = ProdaAuthService()
            token = await proda.get_token()
            air_client = AIRClient(access_token=token, location_minor_id=confirm_minor_id)
            confirm_service = ConfirmService(air_client)
            result = await confirm_service.confirm_record(
                original_payload, claim_id, claim_seq, dob_iso
            )

            if result.get("status") == "SUCCESS":
                r["status"] = "success"
                confirmed_count += 1
            else:
                errors.append({
                    "recordId": record_id,
                    "error": result.get("air_message", "Confirmation failed"),
                })
        except Exception as e:
            logger.error("confirm_record_error", record_id=record_id, error=str(e))
            errors.append({"recordId": record_id, "error": str(e)})

    # Update pending confirmation records
    sub["pendingConfirmationRecords"] = [
        rec for rec in sub.get("pendingConfirmationRecords", [])
        if rec["recordId"] not in [c.get("recordId") for c in request.confirmations if c.get("recordId") not in [e["recordId"] for e in errors]]
    ]
    _persist(submission_id)

    logger.info(
        "confirmation_submitted",
        submission_id=submission_id,
        confirmed=confirmed_count,
        errors=len(errors),
    )

    return {
        "submissionId": submission_id,
        "status": "confirmed",
        "confirmedCount": confirmed_count,
        "errors": errors,
    }


def _build_result_records(sub: dict[str, Any]) -> list[dict[str, Any]]:
    """Transform raw AIR results into ResultRecord format."""
    results = sub.get("results") or {}
    raw_results = results.get("results", [])

    records: list[dict[str, Any]] = []
    for idx, r in enumerate(raw_results):
        source_rows = r.get("sourceRows", [])
        row_num = source_rows[0] if source_rows else idx + 1

        air_status = r.get("status", "unknown")
        if air_status == "success":
            fe_status = "success"
        elif air_status == "warning":
            fe_status = "confirmed"
        else:
            fe_status = "failed"

        error_code = r.get("statusCode", "")
        error_message = r.get("message", "")
        raw_response = r.get("rawResponse", {})
        claim_details = raw_response.get("claimDetails") or {}
        claim_id = claim_details.get("claimId") or r.get("claimId")

        enc_list = claim_details.get("encounters") or []
        if enc_list:
            enc_info = enc_list[0].get("information", {})
            if enc_info.get("code"):
                error_code = enc_info["code"]
                error_message = enc_info.get("text", error_message)

        records.append({
            "recordId": f"r-{idx + 1}",
            "originalRow": row_num,
            "status": fe_status,
            "claimId": claim_id,
            "errorCode": error_code or None,
            "errorMessage": error_message or None,
        })

    return records


@router.get("/submit/{submission_id}/results")
async def get_results(submission_id: str) -> dict[str, Any]:
    """Get final submission results."""
    sub = _submissions.get(submission_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    records = _build_result_records(sub)
    results = sub.get("results") or {}

    successful = results.get("successful", 0)
    failed = results.get("failed", 0)
    confirmed = results.get("pendingConfirmation", 0)

    return {
        "submissionId": submission_id,
        "completedAt": sub.get("completedAt", ""),
        "totalRecords": successful + failed + confirmed,
        "successful": successful,
        "failed": failed,
        "confirmed": confirmed,
        "results": records,
    }


@router.get("/submit/{submission_id}/download")
async def download_report(submission_id: str) -> StreamingResponse:
    """Download a CSV report for a submission."""
    sub = _submissions.get(submission_id)
    if not sub:
        return StreamingResponse(
            iter(["Submission not found\n"]),
            media_type="text/plain",
            status_code=404,
        )

    records = _build_result_records(sub)
    results = sub.get("results") or {}

    successful = results.get("successful", 0)
    failed = results.get("failed", 0)
    confirmed = results.get("pendingConfirmation", 0)
    total = successful + failed + confirmed

    buf = io.StringIO()
    writer = csv.writer(buf)

    # Header section
    writer.writerow(["AIR Submission Report"])
    writer.writerow(["Submission ID", submission_id])
    writer.writerow(["Created", sub.get("createdAt", "")])
    writer.writerow(["Completed", sub.get("completedAt", "")])
    writer.writerow(["Dry Run", "Yes" if sub.get("dryRun") else "No"])
    writer.writerow([])
    writer.writerow(["Total", "Successful", "Failed", "Confirmed"])
    writer.writerow([total, successful, failed, confirmed])
    writer.writerow([])

    # Detail rows
    writer.writerow(["Row", "Status", "Status Code", "Message", "Claim ID"])
    for rec in records:
        writer.writerow([
            rec["originalRow"],
            rec["status"],
            rec.get("errorCode") or "",
            rec.get("errorMessage") or "",
            rec.get("claimId") or "",
        ])

    buf.seek(0)

    filename = f"air-submission-{submission_id[:8]}.csv"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/submissions")
async def list_submissions() -> dict[str, Any]:
    """List all submissions with summary info."""
    submissions = []
    for sid, sub in _submissions.items():
        results = sub.get("results") or {}
        submissions.append({
            "submissionId": sid,
            "status": sub["status"],
            "createdAt": sub.get("createdAt", ""),
            "completedAt": sub.get("completedAt", ""),
            "totalBatches": sub["progress"]["totalBatches"],
            "successfulRecords": results.get("successful", 0),
            "failedRecords": results.get("failed", 0),
            "dryRun": sub.get("dryRun", False),
        })
    return {"submissions": submissions}


@router.post("/submit/{submission_id}/pause")
async def pause_submission(submission_id: str) -> dict[str, Any]:
    """Pause a running submission."""
    sub = _submissions.get(submission_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    sub["status"] = "paused"
    sub["progress"]["status"] = "paused"
    _persist(submission_id)
    return {"status": "paused"}


@router.post("/submit/{submission_id}/resume")
async def resume_submission(submission_id: str) -> dict[str, Any]:
    """Resume a paused submission."""
    sub = _submissions.get(submission_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    sub["status"] = "running"
    sub["progress"]["status"] = "running"
    _persist(submission_id)
    return {"status": "running"}
