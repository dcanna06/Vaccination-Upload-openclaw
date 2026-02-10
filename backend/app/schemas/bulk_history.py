"""Pydantic models for Bulk Immunisation History Request feature.

Covers the upload, validation, processing, and download workflow
for fetching immunisation histories for multiple individuals via AIR API.
"""

from pydantic import BaseModel, Field
from typing import Any


# ============================================================================
# Individual Record (from Excel upload)
# ============================================================================

class BulkHistoryRecord(BaseModel):
    """A single individual record parsed from the uploaded Excel file."""
    rowNumber: int
    medicareCardNumber: str | None = None
    medicareIRN: str | None = None
    ihiNumber: str | None = None
    firstName: str | None = None
    lastName: str | None = None
    dateOfBirth: str | None = None
    gender: str | None = None
    postCode: str | None = None


# ============================================================================
# Validate Request / Response
# ============================================================================

class BulkHistoryValidateRequest(BaseModel):
    """Request body for the validate endpoint."""
    records: list[dict[str, Any]]
    providerNumber: str = Field(..., min_length=6, max_length=8)


class BulkHistoryValidateResponse(BaseModel):
    """Response from the validate endpoint."""
    isValid: bool
    totalRecords: int
    validRecords: int
    invalidRecords: int
    errors: list[dict[str, Any]]
    records: list[dict[str, Any]]


# ============================================================================
# Process Request / Response
# ============================================================================

class BulkHistoryProcessRequest(BaseModel):
    """Request body to start bulk history processing."""
    records: list[dict[str, Any]]
    providerNumber: str = Field(..., min_length=6, max_length=8)


class BulkHistoryProcessResponse(BaseModel):
    """Response from starting the bulk history process."""
    requestId: str
    status: str
    totalRecords: int


# ============================================================================
# Progress
# ============================================================================

class BulkHistoryProgress(BaseModel):
    """Progress of bulk history processing."""
    requestId: str
    status: str
    totalRecords: int
    processedRecords: int
    successfulRecords: int
    failedRecords: int
    currentRecord: int


# ============================================================================
# Result Records
# ============================================================================

class HistoryResultEntry(BaseModel):
    """A single vaccination history entry for an individual."""
    dateOfService: str | None = None
    vaccineCode: str | None = None
    vaccineDescription: str | None = None
    vaccineDose: str | None = None
    routeOfAdministration: str | None = None
    status: str | None = None
    informationCode: str | None = None
    informationText: str | None = None


class DueVaccineEntry(BaseModel):
    """A vaccine due for an individual."""
    antigenCode: str | None = None
    doseNumber: str | None = None
    dueDate: str | None = None


class IndividualHistoryResult(BaseModel):
    """History result for a single individual."""
    rowNumber: int
    status: str  # success, error, skipped
    statusCode: str | None = None
    message: str | None = None
    firstName: str | None = None
    lastName: str | None = None
    dateOfBirth: str | None = None
    medicareCardNumber: str | None = None
    immunisationHistory: list[HistoryResultEntry] = []
    vaccineDueDetails: list[DueVaccineEntry] = []
