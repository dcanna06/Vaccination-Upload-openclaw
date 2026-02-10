"""Pydantic schemas for Location CRUD."""

from datetime import datetime

from pydantic import BaseModel, Field


class LocationCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    organisation_id: int = 1
    address_line_1: str = ""
    address_line_2: str = ""
    suburb: str = ""
    state: str = ""
    postcode: str = ""


class LocationUpdate(BaseModel):
    name: str | None = None
    address_line_1: str | None = None
    address_line_2: str | None = None
    suburb: str | None = None
    state: str | None = None
    postcode: str | None = None
    proda_link_status: str | None = None
    status: str | None = None


class LocationRead(BaseModel):
    id: int
    organisation_id: int
    name: str
    address_line_1: str
    address_line_2: str
    suburb: str
    state: str
    postcode: str
    minor_id: str
    proda_link_status: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
