"""Submission, progress, confirmation, and results endpoints."""

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


@router.post("/submit", response_model=SubmitResponse)
async def start_submission(request: SubmitRequest) -> SubmitResponse:
    """Start a batch submission to AIR."""
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

    if request.dryRun:
        # Populate mock results so the user sees meaningful feedback
        total_records = sum(len(b.get("encounters", [])) for b in request.batches)
        result = {
            "status": "completed",
            "completedBatches": len(request.batches),
            "successful": total_records,
            "failed": 0,
            "pendingConfirmation": 0,
            "results": [
                {"batchIndex": i, "status": "success_dry_run", "message": "Dry run — not submitted to AIR"}
                for i in range(len(request.batches))
            ],
        }
    else:
        proda = ProdaAuthService()
        token = await proda.get_token()
        client = AIRClient(access_token=token)
        service = BatchSubmissionService(client)
        result = await service.submit_batches(
            request.batches, request.informationProvider
        )

    _submissions[submission_id]["results"] = result
    _submissions[submission_id]["completedAt"] = datetime.now(timezone.utc).isoformat()
    _submissions[submission_id]["status"] = result.get("status", "completed")
    _submissions[submission_id]["progress"]["status"] = result.get("status", "completed")
    _submissions[submission_id]["progress"]["completedBatches"] = result.get("completedBatches", 0)
    _submissions[submission_id]["progress"]["successfulRecords"] = result.get("successful", 0)
    _submissions[submission_id]["progress"]["failedRecords"] = result.get("failed", 0)
    _submissions[submission_id]["progress"]["pendingConfirmation"] = result.get("pendingConfirmation", 0)

    logger.info(
        "submission_started",
        submission_id=submission_id,
        total_batches=len(request.batches),
        dry_run=request.dryRun,
    )

    return SubmitResponse(
        submissionId=submission_id,
        status=_submissions[submission_id]["status"],
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
    return {
        "submissionId": submission_id,
        "completedAt": sub.get("completedAt", ""),
        "totalRecords": results.get("successful", 0) + results.get("failed", 0),
        "successful": results.get("successful", 0),
        "failed": results.get("failed", 0),
        "confirmed": results.get("pendingConfirmation", 0),
        "results": results.get("results", []),
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
