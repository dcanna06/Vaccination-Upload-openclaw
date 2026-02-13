"""Pydantic schemas for Clinic CRUD."""

from datetime import date, datetime

from pydantic import BaseModel, Field


class ClinicCreate(BaseModel):
    facility_id: int
    name: str = Field(..., min_length=1, max_length=255)
    clinic_date: date
    time_range: str | None = Field(None, max_length=100)
    location: str | None = Field(None, max_length=255)
    pharmacist_name: str | None = Field(None, max_length=255)
    vaccines: list[str] = Field(..., min_length=1)
    status: str = "upcoming"


class ClinicUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    clinic_date: date | None = None
    time_range: str | None = Field(None, max_length=100)
    location: str | None = Field(None, max_length=255)
    pharmacist_name: str | None = Field(None, max_length=255)
    vaccines: list[str] | None = None
    status: str | None = None


class ClinicResponse(BaseModel):
    id: int
    facility_id: int
    name: str
    clinic_date: date
    time_range: str | None = None
    location: str | None = None
    pharmacist_name: str | None = None
    vaccines: list[str]
    status: str
    created_by: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ClinicResidentAssign(BaseModel):
    resident_ids: list[int] = Field(..., min_length=1)
    vaccine_code: str = Field(..., min_length=1, max_length=50)


class ConsentUpdate(BaseModel):
    consent_status: str = Field(..., pattern="^(consented|refused|withdrawn)$")


class ClinicResidentResponse(BaseModel):
    id: int
    clinic_id: int
    resident_id: int
    vaccine_code: str
    is_eligible: bool
    consent_status: str | None = None
    consented_at: datetime | None = None
    administered: bool
    administered_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class RunSheetEntry(BaseModel):
    resident_id: int
    first_name: str
    last_name: str
    date_of_birth: date
    room: str | None = None
    wing: str | None = None
    vaccine_code: str
    consent_status: str | None = None
    is_eligible: bool
    administered: bool


class RunSheetResponse(BaseModel):
    clinic_id: int
    clinic_name: str
    clinic_date: date
    facility_name: str
    pharmacist_name: str | None = None
    entries: list[RunSheetEntry]
