"""Pydantic models for AIR Exemption APIs (TECH.SIS.AIR.06).

Covers:
- API #5: Get Medical Contraindication History
- API #6: Get Natural Immunity History
- API #10: Record Medical Contraindication
- API #11: Record Natural Immunity
"""

from pydantic import BaseModel, Field


# ============================================================================
# Shared
# ============================================================================

class ExemptionInformationProvider(BaseModel):
    providerNumber: str = Field(..., min_length=6, max_length=8)


# ============================================================================
# API #5: Get Medical Contraindication History
# ============================================================================

class GetContraindicationHistoryRequest(BaseModel):
    individualIdentifier: str = Field(..., max_length=128)
    informationProvider: ExemptionInformationProvider


class ContraindicationEntry(BaseModel):
    antigenCode: str | None = None
    antigenDescription: str | None = None
    contraindicationCode: str | None = None
    contraindicationDescription: str | None = None
    startDate: str | None = None
    endDate: str | None = None
    providerNumber: str | None = None


class GetContraindicationHistoryResponse(BaseModel):
    status: str
    statusCode: str
    message: str
    contraindicationHistory: list[ContraindicationEntry] | None = None
    rawResponse: dict | None = None


# ============================================================================
# API #6: Get Natural Immunity History
# ============================================================================

class GetNaturalImmunityHistoryRequest(BaseModel):
    individualIdentifier: str = Field(..., max_length=128)
    informationProvider: ExemptionInformationProvider


class NaturalImmunityEntry(BaseModel):
    diseaseCode: str | None = None
    diseaseDescription: str | None = None
    evidenceDate: str | None = None
    providerNumber: str | None = None


class GetNaturalImmunityHistoryResponse(BaseModel):
    status: str
    statusCode: str
    message: str
    naturalImmunityHistory: list[NaturalImmunityEntry] | None = None
    rawResponse: dict | None = None


# ============================================================================
# API #10: Record Medical Contraindication
# ============================================================================

class RecordContraindicationRequest(BaseModel):
    individualIdentifier: str = Field(..., max_length=128)
    antigenCode: str = Field(..., min_length=1, max_length=10)
    contraindicationCode: str = Field(..., min_length=1, max_length=10)
    startDate: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    endDate: str | None = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    informationProvider: ExemptionInformationProvider


# ============================================================================
# API #11: Record Natural Immunity
# ============================================================================

class RecordNaturalImmunityRequest(BaseModel):
    individualIdentifier: str = Field(..., max_length=128)
    diseaseCode: str = Field(..., min_length=1, max_length=10)
    evidenceDate: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    informationProvider: ExemptionInformationProvider


class RecordExemptionResponse(BaseModel):
    status: str
    statusCode: str
    message: str
    rawResponse: dict | None = None
