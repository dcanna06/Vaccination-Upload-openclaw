"""Indicator, Indigenous Status, and Catch-Up API routes.

Provides endpoints for APIs #12, #13, #14, #15.
"""

from typing import Any

import structlog
from fastapi import APIRouter, HTTPException

from app.schemas.air_indicators import (
    AddVaccineIndicatorRequest,
    RemoveVaccineIndicatorRequest,
    UpdateIndigenousStatusRequest,
)
from app.schemas.air_catchup import PlannedCatchUpRequest
from app.services.air_indicators import AIRIndicatorsClient
from app.services.proda_auth import ProdaAuthService

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/indicators", tags=["indicators"])


async def _get_client() -> AIRIndicatorsClient:
    from app.config import settings
    proda = ProdaAuthService()
    token = await proda.get_token()
    return AIRIndicatorsClient(access_token=token, minor_id=settings.PRODA_MINOR_ID)


@router.post("/vaccine/add")
async def add_vaccine_indicator(request: AddVaccineIndicatorRequest) -> dict[str, Any]:
    """Add an additional vaccine indicator (API #12)."""
    try:
        client = await _get_client()
        return await client.add_vaccine_indicator(
            individual_identifier=request.individualIdentifier,
            indicator_code=request.vaccineIndicatorCode,
            information_provider=request.informationProvider.model_dump(),
        )
    except Exception as e:
        logger.error("add_vaccine_indicator_failed", error=str(e))
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/vaccine/remove")
async def remove_vaccine_indicator(request: RemoveVaccineIndicatorRequest) -> dict[str, Any]:
    """Remove an additional vaccine indicator (API #13)."""
    try:
        client = await _get_client()
        return await client.remove_vaccine_indicator(
            individual_identifier=request.individualIdentifier,
            indicator_code=request.vaccineIndicatorCode,
            information_provider=request.informationProvider.model_dump(),
        )
    except Exception as e:
        logger.error("remove_vaccine_indicator_failed", error=str(e))
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/indigenous-status")
async def update_indigenous_status(request: UpdateIndigenousStatusRequest) -> dict[str, Any]:
    """Update indigenous status (API #14)."""
    try:
        client = await _get_client()
        return await client.update_indigenous_status(
            individual_identifier=request.individualIdentifier,
            indigenous_status=request.indigenousStatus,
            information_provider=request.informationProvider.model_dump(),
        )
    except Exception as e:
        logger.error("update_indigenous_status_failed", error=str(e))
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/catchup")
async def planned_catch_up_date(request: PlannedCatchUpRequest) -> dict[str, Any]:
    """Record a planned catch-up date (API #15). Does NOT use individualIdentifier."""
    try:
        client = await _get_client()
        return await client.planned_catch_up_date(
            medicare_card_number=request.medicareCardNumber,
            medicare_irn=request.medicareIRN,
            date_of_birth=request.dateOfBirth,
            gender=request.gender,
            planned_date=request.plannedCatchUpDate,
            information_provider=request.informationProvider.model_dump(),
        )
    except Exception as e:
        logger.error("planned_catch_up_failed", error=str(e))
        raise HTTPException(status_code=502, detail=str(e))
