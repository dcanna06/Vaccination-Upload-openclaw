"""Encounter update API route.

Provides endpoint for:
- Update Encounter (API #9)
"""

from typing import Any

import structlog
from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.air_encounter_update import UpdateEncounterRequest
from app.services.air_encounter_update import AIREncounterUpdateClient
from app.services.proda_auth import ProdaAuthService

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/encounters", tags=["encounters"])


@router.post("/update")
async def update_encounter(request: UpdateEncounterRequest, user: User = Depends(get_current_user)) -> dict[str, Any]:
    """Update encounters on the AIR.

    Calls API #9: POST /air/immunisation/v1.3/encounters/update.
    Requires individualIdentifier from a prior Identify Individual call.
    Only encounters marked as editable in history details can be updated.
    """
    try:
        from app.config import settings

        proda = ProdaAuthService()
        access_token = await proda.get_token()
        minor_id = settings.PRODA_MINOR_ID

        client = AIREncounterUpdateClient(
            access_token=access_token,
            minor_id=minor_id,
        )

        encounters_data = [enc.model_dump(exclude_none=True) for enc in request.encounters]

        result = await client.update_encounter(
            individual_identifier=request.individualIdentifier,
            encounters=encounters_data,
            information_provider=request.informationProvider,
        )

        return result

    except Exception as e:
        logger.error("update_encounter_failed", error=str(e))
        raise HTTPException(status_code=502, detail="AIR API request failed")
