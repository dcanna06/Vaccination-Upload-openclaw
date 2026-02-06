"""Validation endpoint for parsed vaccination records."""

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

import structlog

from app.services.validation_engine import ValidationOrchestrator
from app.services.batch_grouping import BatchGroupingService

router = APIRouter(prefix="/api", tags=["validate"])
logger = structlog.get_logger(__name__)


class ValidateRequest(BaseModel):
    records: list[dict[str, Any]]


class ValidateResponse(BaseModel):
    isValid: bool
    totalRecords: int
    validRecords: int
    invalidRecords: int
    errors: list[dict[str, Any]]
    groupedBatches: list[dict[str, Any]]


@router.post("/validate", response_model=ValidateResponse)
async def validate_records(request: ValidateRequest) -> ValidateResponse:
    """Run full validation suite on parsed records and group into batches."""
    orchestrator = ValidationOrchestrator()
    result = orchestrator.validate(request.records)

    grouped_batches: list[dict[str, Any]] = []
    if result["isValid"]:
        grouping_service = BatchGroupingService()
        grouped_batches = grouping_service.group(request.records)

    logger.info(
        "validation_endpoint",
        total=result["totalRecords"],
        valid=result["validRecords"],
        invalid=result["invalidRecords"],
        batches=len(grouped_batches),
    )

    return ValidateResponse(
        isValid=result["isValid"],
        totalRecords=result["totalRecords"],
        validRecords=result["validRecords"],
        invalidRecords=result["invalidRecords"],
        errors=result["errors"],
        groupedBatches=grouped_batches,
    )
