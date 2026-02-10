"""Pydantic models for AIR Planned Catch Up Date API (TECH.SIS.AIR.03).

API #15: Planned Catch Up Date
NOTE: This API does NOT use individualIdentifier.
"""

from pydantic import BaseModel, Field


class CatchUpInformationProvider(BaseModel):
    providerNumber: str = Field(..., min_length=6, max_length=8)


class PlannedCatchUpRequest(BaseModel):
    """Request for Planned Catch Up Date API.

    NOTE: This API uses individual identification directly
    (medicareCard or demographics), NOT individualIdentifier.
    """
    medicareCardNumber: str | None = Field(None, pattern=r"^\d{10}$")
    medicareIRN: str | None = Field(None, pattern=r"^[1-9]$")
    dateOfBirth: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    gender: str = Field(..., pattern=r"^[MFXIU]$")
    plannedCatchUpDate: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    informationProvider: CatchUpInformationProvider


class PlannedCatchUpResponse(BaseModel):
    status: str
    statusCode: str
    message: str
    rawResponse: dict | None = None
