"""Pydantic schemas for Resident CRUD."""

from datetime import date, datetime

from pydantic import BaseModel, Field


class ResidentCreate(BaseModel):
    facility_id: int
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    date_of_birth: date
    gender: str = Field("F", pattern="^[MFX]$")
    medicare_number: str | None = Field(None, max_length=20)
    ihi_number: str | None = Field(None, max_length=16)
    room: str | None = Field(None, max_length=50)
    wing: str | None = Field(None, max_length=50)
    gp_name: str | None = Field(None, max_length=255)
    allergies: list[str] | None = None


class ResidentBulkCreate(BaseModel):
    residents: list[ResidentCreate] = Field(..., min_length=1)


class ResidentUpdate(BaseModel):
    first_name: str | None = Field(None, min_length=1, max_length=100)
    last_name: str | None = Field(None, min_length=1, max_length=100)
    date_of_birth: date | None = None
    gender: str | None = Field(None, pattern="^[MFX]$")
    medicare_number: str | None = Field(None, max_length=20)
    ihi_number: str | None = Field(None, max_length=16)
    room: str | None = Field(None, max_length=50)
    wing: str | None = Field(None, max_length=50)
    gp_name: str | None = Field(None, max_length=255)
    allergies: list[str] | None = None


class ResidentResponse(BaseModel):
    id: int
    facility_id: int
    first_name: str
    last_name: str
    date_of_birth: date
    gender: str
    medicare_number: str | None = None
    ihi_number: str | None = None
    room: str | None = None
    wing: str | None = None
    gp_name: str | None = None
    allergies: list[str] | None = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ResidentStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(active|inactive|discharged)$")


class EligibilityResponse(BaseModel):
    id: int
    resident_id: int
    vaccine_code: str
    is_due: bool
    is_overdue: bool
    due_date: date | None = None
    dose_number: int | None = None
    last_synced_at: datetime | None = None

    model_config = {"from_attributes": True}
