"""Pydantic schemas for Facility CRUD."""

from datetime import datetime

from pydantic import BaseModel, Field


class FacilityCreate(BaseModel):
    organisation_id: int
    name: str = Field(..., min_length=1, max_length=255)
    address: str | None = Field(None, max_length=500)
    contact_person: str | None = Field(None, max_length=255)
    contact_phone: str | None = Field(None, max_length=50)
    contact_email: str | None = Field(None, max_length=255)
    pharmacy_name: str | None = Field(None, max_length=255)
    pharmacist_name: str | None = Field(None, max_length=255)


class FacilityUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    address: str | None = Field(None, max_length=500)
    contact_person: str | None = Field(None, max_length=255)
    contact_phone: str | None = Field(None, max_length=50)
    contact_email: str | None = Field(None, max_length=255)
    pharmacy_name: str | None = Field(None, max_length=255)
    pharmacist_name: str | None = Field(None, max_length=255)


class FacilityResponse(BaseModel):
    id: int
    organisation_id: int
    name: str
    address: str | None = None
    contact_person: str | None = None
    contact_phone: str | None = None
    contact_email: str | None = None
    pharmacy_name: str | None = None
    pharmacist_name: str | None = None
    status: str
    joined_at: datetime
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FacilityStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(active|inactive)$")
