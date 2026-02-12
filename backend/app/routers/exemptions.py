"""Exemptions API routes (Medical Contraindications + Natural Immunity).

Provides endpoints for APIs #5, #6, #10, #11.
"""

from typing import Any

import structlog
from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.air_exemptions import (
    GetContraindicationHistoryRequest,
    GetNaturalImmunityHistoryRequest,
    RecordContraindicationRequest,
    RecordNaturalImmunityRequest,
)
from app.services.air_exemptions import AIRExemptionsClient
from app.services.proda_auth import ProdaAuthService

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/exemptions", tags=["exemptions"])


async def _get_client() -> AIRExemptionsClient:
    from app.config import settings
    proda = ProdaAuthService()
    token = await proda.get_token()
    return AIRExemptionsClient(access_token=token, minor_id=settings.PRODA_MINOR_ID)


@router.post("/contraindication/history")
async def get_contraindication_history(request: GetContraindicationHistoryRequest, user: User = Depends(get_current_user)) -> dict[str, Any]:
    """Get medical contraindication history (API #5)."""
    try:
        client = await _get_client()
        return await client.get_contraindication_history(
            individual_identifier=request.individualIdentifier,
            information_provider=request.informationProvider.model_dump(),
        )
    except Exception as e:
        logger.error("get_contraindication_history_failed", error=str(e))
        raise HTTPException(status_code=502, detail="AIR API request failed")


@router.post("/naturalimmunity/history")
async def get_natural_immunity_history(request: GetNaturalImmunityHistoryRequest, user: User = Depends(get_current_user)) -> dict[str, Any]:
    """Get natural immunity history (API #6)."""
    try:
        client = await _get_client()
        return await client.get_natural_immunity_history(
            individual_identifier=request.individualIdentifier,
            information_provider=request.informationProvider.model_dump(),
        )
    except Exception as e:
        logger.error("get_natural_immunity_history_failed", error=str(e))
        raise HTTPException(status_code=502, detail="AIR API request failed")


@router.post("/contraindication/record")
async def record_contraindication(request: RecordContraindicationRequest, user: User = Depends(get_current_user)) -> dict[str, Any]:
    """Record a medical contraindication (API #10)."""
    try:
        client = await _get_client()
        return await client.record_contraindication(
            individual_identifier=request.individualIdentifier,
            antigen_code=request.antigenCode,
            contraindication_code=request.contraindicationCode,
            start_date=request.startDate,
            information_provider=request.informationProvider.model_dump(),
            end_date=request.endDate,
        )
    except Exception as e:
        logger.error("record_contraindication_failed", error=str(e))
        raise HTTPException(status_code=502, detail="AIR API request failed")


@router.post("/naturalimmunity/record")
async def record_natural_immunity(request: RecordNaturalImmunityRequest, user: User = Depends(get_current_user)) -> dict[str, Any]:
    """Record natural immunity (API #11)."""
    try:
        client = await _get_client()
        return await client.record_natural_immunity(
            individual_identifier=request.individualIdentifier,
            disease_code=request.diseaseCode,
            evidence_date=request.evidenceDate,
            information_provider=request.informationProvider.model_dump(),
        )
    except Exception as e:
        logger.error("record_natural_immunity_failed", error=str(e))
        raise HTTPException(status_code=502, detail="AIR API request failed")
