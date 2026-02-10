"""Pydantic models for AIR Update Encounter API #9 (TECH.SIS.AIR.05).

POST /air/immunisation/v1.3/encounters/update
Requires individualIdentifier from a prior Identify Individual call.
"""

from typing import Literal

from pydantic import BaseModel, Field


class UpdateEpisode(BaseModel):
    id: str = Field(..., pattern=r"^[1-5]$")
    vaccineCode: str = Field(..., min_length=1, max_length=6)
    vaccineDose: str = Field(..., pattern=r"^(B|[1-9]|1[0-9]|20)$")
    vaccineBatch: str | None = Field(None, max_length=15)
    vaccineType: Literal["NIP", "OTH"] | None = None
    routeOfAdministration: Literal["PO", "SC", "ID", "IM", "NS"] | None = None


class UpdateEncounter(BaseModel):
    id: str = Field(..., pattern=r"^([1-9]|10)$")
    dateOfService: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    episodes: list[UpdateEpisode] = Field(..., min_length=1, max_length=5)
    immunisationProvider: dict | None = None
    schoolId: str | None = Field(None, pattern=r"^\d{1,9}$")
    administeredOverseas: bool | None = None
    countryCode: str | None = Field(None, min_length=3, max_length=3)
    antenatalIndicator: bool | None = None


class UpdateEncounterRequest(BaseModel):
    """Request body for the Update Encounter API.

    individualIdentifier is required — obtained from Identify Individual API.
    encounters contain the updated episode data (only editable fields).
    """
    individualIdentifier: str = Field(..., max_length=128)
    encounters: list[UpdateEncounter] = Field(..., min_length=1, max_length=10)
    informationProvider: dict = Field(...)


class UpdateEncounterResponse(BaseModel):
    """Parsed response from the Update Encounter API."""
    status: str
    statusCode: str
    message: str
    encounterResults: list[dict] | None = None
    rawResponse: dict | None = None
