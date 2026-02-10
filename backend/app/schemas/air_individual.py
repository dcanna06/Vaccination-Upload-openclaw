"""Pydantic models for AIR Individual APIs (TECH.SIS.AIR.05).

Covers:
- API #2: Identify Individual (POST /air/immunisation/v1.1/individual/details)
- API #3: Get Immunisation History Details (POST /air/immunisation/v1.3/individual/history/details)
- API #4: Get Immunisation History Statement (POST /air/immunisation/v1/individual/history/statement)
- API #7: Get Vaccine Trial History (POST /air/immunisation/v1/individual/vaccinetrial/history)
"""

from pydantic import BaseModel, Field


# ============================================================================
# Shared sub-schemas (reuse across APIs)
# ============================================================================

class PersonalDetails(BaseModel):
    dateOfBirth: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    gender: str | None = Field(None, pattern=r"^[MFXIU]$")
    firstName: str | None = Field(None, max_length=40)
    lastName: str | None = Field(None, max_length=40)


class MedicareCard(BaseModel):
    medicareCardNumber: str = Field(..., pattern=r"^\d{10}$")
    medicareIRN: str | None = Field(None, pattern=r"^[1-9]$")


class InformationProvider(BaseModel):
    providerNumber: str = Field(..., min_length=6, max_length=8)


# ============================================================================
# API #2: Identify Individual — Request / Response
# ============================================================================

class IdentifyIndividualRequest(BaseModel):
    """Request body for the Identify Individual API.

    At minimum, one of these identification combos is required:
    1. medicareCard + dateOfBirth + gender
    2. ihiNumber + dateOfBirth + gender
    3. firstName + lastName + dateOfBirth + gender + postCode
    """
    personalDetails: PersonalDetails
    medicareCard: MedicareCard | None = None
    ihiNumber: str | None = Field(None, pattern=r"^\d{16}$")
    postCode: str | None = Field(None, pattern=r"^\d{4}$")
    informationProvider: InformationProvider


class IdentifyIndividualResponse(BaseModel):
    """Parsed response from the Identify Individual API."""
    status: str  # success, error
    statusCode: str  # AIR-I-1100, AIR-E-1026, etc.
    message: str
    individualIdentifier: str | None = None
    personalDetails: dict | None = None
    rawResponse: dict | None = None


# ============================================================================
# API #3: Immunisation History Details — Request / Response
# ============================================================================

class HistoryDetailsRequest(BaseModel):
    """Request body for Get Immunisation History Details API."""
    individualIdentifier: str = Field(..., max_length=128)
    informationProvider: InformationProvider
    subjectDob: str | None = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")


class VaccineDueDetail(BaseModel):
    antigenCode: str | None = None
    antigenDescription: str | None = None
    dueDate: str | None = None
    doseNumber: str | None = None


class ImmunisationHistoryEntry(BaseModel):
    dateOfService: str | None = None
    vaccineCode: str | None = None
    vaccineDescription: str | None = None
    vaccineDose: str | None = None
    routeOfAdministration: str | None = None
    providerNumber: str | None = None
    editable: bool | None = None
    status: str | None = None
    informationCode: str | None = None
    informationText: str | None = None
    claimId: str | None = None
    claimSeqNum: int | None = None


class HistoryDetailsResponse(BaseModel):
    """Parsed response from the Get Immunisation History Details API."""
    status: str
    statusCode: str
    message: str
    vaccineDueDetails: list[VaccineDueDetail] | None = None
    immunisationHistory: list[ImmunisationHistoryEntry] | None = None
    rawResponse: dict | None = None


# ============================================================================
# API #4: History Statement — Request / Response
# ============================================================================

class HistoryStatementRequest(BaseModel):
    """Request body for Get Immunisation History Statement API."""
    individualIdentifier: str = Field(..., max_length=128)
    informationProvider: InformationProvider
    subjectDob: str | None = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")


class HistoryStatementResponse(BaseModel):
    """Parsed response from the Get Immunisation History Statement API."""
    status: str
    statusCode: str
    message: str
    statementData: dict | None = None
    rawResponse: dict | None = None


# ============================================================================
# API #7: Vaccine Trial History — Request / Response
# ============================================================================

class VaccineTrialHistoryRequest(BaseModel):
    """Request body for Get Vaccine Trial History API."""
    individualIdentifier: str = Field(..., max_length=128)
    informationProvider: InformationProvider
    subjectDob: str | None = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")


class VaccineTrialEntry(BaseModel):
    trialName: str | None = None
    vaccineCode: str | None = None
    vaccineDescription: str | None = None
    doseNumber: str | None = None
    dateAdministered: str | None = None


class VaccineTrialHistoryResponse(BaseModel):
    """Parsed response from the Get Vaccine Trial History API."""
    status: str
    statusCode: str
    message: str
    trialHistory: list[VaccineTrialEntry] | None = None
    rawResponse: dict | None = None
