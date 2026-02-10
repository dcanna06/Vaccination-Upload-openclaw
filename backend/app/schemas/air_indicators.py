"""Pydantic models for AIR Indicator & Indigenous Status APIs (TECH.SIS.AIR.05).

Covers:
- API #12: Add Additional Vaccine Indicator
- API #13: Remove Additional Vaccine Indicator
- API #14: Update Indigenous Status
"""

from typing import Literal

from pydantic import BaseModel, Field


class IndicatorInformationProvider(BaseModel):
    providerNumber: str = Field(..., min_length=6, max_length=8)


class AddVaccineIndicatorRequest(BaseModel):
    individualIdentifier: str = Field(..., max_length=128)
    vaccineIndicatorCode: str = Field(..., min_length=1, max_length=10)
    informationProvider: IndicatorInformationProvider


class RemoveVaccineIndicatorRequest(BaseModel):
    individualIdentifier: str = Field(..., max_length=128)
    vaccineIndicatorCode: str = Field(..., min_length=1, max_length=10)
    informationProvider: IndicatorInformationProvider


class UpdateIndigenousStatusRequest(BaseModel):
    individualIdentifier: str = Field(..., max_length=128)
    indigenousStatus: Literal["Y", "N"] = Field(...)
    informationProvider: IndicatorInformationProvider


class IndicatorResponse(BaseModel):
    status: str
    statusCode: str
    message: str
    rawResponse: dict | None = None
