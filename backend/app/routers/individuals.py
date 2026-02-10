"""Individual management API routes.

Provides endpoints for:
- Identify Individual (API #2)
- Get Immunisation History Details (API #3)
- Get Immunisation History Statement (API #4)
- Get Vaccine Trial History (API #7)
"""

from typing import Any

import structlog
from fastapi import APIRouter, HTTPException

from app.schemas.air_individual import (
    HistoryDetailsRequest,
    HistoryStatementRequest,
    IdentifyIndividualRequest,
    VaccineTrialHistoryRequest,
)
from app.services.air_individual import AIRIndividualClient
from app.services.proda_auth import ProdaAuthService

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/individuals", tags=["individuals"])


async def _get_client(minor_id: str = "") -> AIRIndividualClient:
    """Get an AIRIndividualClient with a valid PRODA token."""
    from app.config import settings

    proda = ProdaAuthService()
    access_token = await proda.get_token()
    location_minor_id = minor_id or settings.PRODA_MINOR_ID

    return AIRIndividualClient(
        access_token=access_token,
        minor_id=location_minor_id,
    )


@router.post("/identify")
async def identify_individual(request: IdentifyIndividualRequest) -> dict[str, Any]:
    """Identify an individual on the AIR.

    Calls API #2: POST /air/immunisation/v1.1/individual/details.
    Returns individualIdentifier on success (AIR-I-1001).
    """
    try:
        client = await _get_client()
        result = await client.identify_individual(request.model_dump(exclude_none=True))

        if result.get("status") == "error":
            return {
                "status": "error",
                "statusCode": result.get("statusCode", ""),
                "message": result.get("message", ""),
            }

        return {
            "status": "success",
            "statusCode": result.get("statusCode", ""),
            "message": result.get("message", ""),
            "individualIdentifier": result.get("individualIdentifier"),
            "personalDetails": result.get("personalDetails"),
        }

    except Exception as e:
        logger.error("identify_individual_failed", error=str(e))
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/history/details")
async def get_history_details(request: HistoryDetailsRequest) -> dict[str, Any]:
    """Get immunisation history details for an identified individual.

    Calls API #3: POST /air/immunisation/v1.3/individual/history/details.
    Requires individualIdentifier from a prior identify call.
    """
    try:
        client = await _get_client()
        result = await client.get_history_details(
            individual_identifier=request.individualIdentifier,
            information_provider=request.informationProvider.model_dump(),
        )

        return result

    except Exception as e:
        logger.error("get_history_details_failed", error=str(e))
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/history/statement")
async def get_history_statement(request: HistoryStatementRequest) -> dict[str, Any]:
    """Get immunisation history statement for an identified individual.

    Calls API #4: POST /air/immunisation/v1/individual/history/statement.
    Requires individualIdentifier from a prior identify call.
    """
    try:
        client = await _get_client()
        result = await client.get_history_statement(
            individual_identifier=request.individualIdentifier,
            information_provider=request.informationProvider.model_dump(),
        )

        return result

    except Exception as e:
        logger.error("get_history_statement_failed", error=str(e))
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/vaccinetrial/history")
async def get_vaccine_trial_history(request: VaccineTrialHistoryRequest) -> dict[str, Any]:
    """Get vaccine trial history for an identified individual.

    Calls API #7: POST /air/immunisation/v1/individual/vaccinetrial/history.
    Requires individualIdentifier from a prior identify call.
    """
    try:
        client = await _get_client()
        result = await client.get_vaccine_trial_history(
            individual_identifier=request.individualIdentifier,
            information_provider=request.informationProvider.model_dump(),
        )

        return result

    except Exception as e:
        logger.error("get_vaccine_trial_history_failed", error=str(e))
        raise HTTPException(status_code=502, detail=str(e))
