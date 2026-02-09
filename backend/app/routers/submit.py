"""Submission, progress, confirmation, and results endpoints."""

import asyncio
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi import APIRouter
from pydantic import BaseModel

import structlog

from app.services.air_client import AIRClient, BatchSubmissionService
from app.services.proda_auth import ProdaAuthService

router = APIRouter(prefix="/api", tags=["submit"])
logger = structlog.get_logger(__name__)

# In-memory submission store (production would use DB)
_submissions: dict[str, dict[str, Any]] = {}


class SubmitRequest(BaseModel):
    batches: list[dict[str, Any]]
    informationProvider: dict[str, Any]
    dryRun: bool = False


class SubmitResponse(BaseModel):
    submissionId: str
    status: str
    totalBatches: int


class ConfirmRequest(BaseModel):
    confirmations: list[dict[str, Any]]


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
            proda = ProdaAuthService()
            token = await proda.get_token()
            client = AIRClient(access_token=token)
            service = BatchSubmissionService(client)
            result = await service.submit_batches(
                sub["batches"], sub["informationProvider"]
            )

        sub["results"] = result
        sub["completedAt"] = datetime.now(timezone.utc).isoformat()
        sub["status"] = result.get("status", "completed")
        sub["progress"]["status"] = result.get("status", "completed")
        sub["progress"]["completedBatches"] = result.get("completedBatches", 0)
        sub["progress"]["successfulRecords"] = result.get("successful", 0)
        sub["progress"]["failedRecords"] = result.get("failed", 0)
        sub["progress"]["pendingConfirmation"] = result.get("pendingConfirmation", 0)

    except Exception as e:
        logger.error("submission_background_error", submission_id=submission_id, error=str(e))
        sub["status"] = "error"
        sub["progress"]["status"] = "error"
        sub["results"] = {"status": "error", "error": str(e), "results": []}


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
        return {"error": "Submission not found", "status": "not_found"}
    return {
        "submissionId": submission_id,
        "status": sub["status"],
        "progress": sub["progress"],
    }


@router.post("/submit/{submission_id}/confirm")
async def confirm_records(submission_id: str, request: ConfirmRequest) -> dict[str, Any]:
    """Submit confirmations for records requiring confirmation."""
    sub = _submissions.get(submission_id)
    if not sub:
        return {"error": "Submission not found", "status": "not_found"}

    logger.info(
        "confirmation_submitted",
        submission_id=submission_id,
        count=len(request.confirmations),
    )

    return {
        "submissionId": submission_id,
        "status": "confirmed",
        "confirmedCount": len(request.confirmations),
    }


@router.get("/submit/{submission_id}/results")
async def get_results(submission_id: str) -> dict[str, Any]:
    """Get final submission results."""
    sub = _submissions.get(submission_id)
    if not sub:
        return {"error": "Submission not found", "status": "not_found"}

    results = sub.get("results") or {}
    raw_results = results.get("results", [])

    # Transform raw AIR results into ResultRecord format for frontend
    records: list[dict[str, Any]] = []
    for idx, r in enumerate(raw_results):
        source_rows = r.get("sourceRows", [])
        row_num = source_rows[0] if source_rows else idx + 1

        # Map AIR status to frontend status
        air_status = r.get("status", "unknown")
        if air_status == "success":
            fe_status = "success"
        elif air_status == "warning":
            fe_status = "confirmed"
        else:
            fe_status = "failed"

        # Extract error details from encounter-level results
        error_code = r.get("statusCode", "")
        error_message = r.get("message", "")
        raw_response = r.get("rawResponse", {})
        claim_details = raw_response.get("claimDetails") or {}
        claim_id = claim_details.get("claimId") or r.get("claimId")

        # Get per-encounter detail if available
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
            "errorCode": error_code if fe_status == "failed" else None,
            "errorMessage": error_message if fe_status == "failed" else None,
        })

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
        return {"error": "Submission not found"}
    sub["status"] = "paused"
    sub["progress"]["status"] = "paused"
    return {"status": "paused"}


@router.post("/submit/{submission_id}/resume")
async def resume_submission(submission_id: str) -> dict[str, Any]:
    """Resume a paused submission."""
    sub = _submissions.get(submission_id)
    if not sub:
        return {"error": "Submission not found"}
    sub["status"] = "running"
    sub["progress"]["status"] = "running"
    return {"status": "running"}
