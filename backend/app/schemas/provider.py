"""Pydantic schemas for provider-location linking."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ProviderLinkRequest(BaseModel):
    location_id: int
    provider_number: str = Field(..., min_length=1, max_length=20)
    provider_type: str = ""


class ProviderRead(BaseModel):
    id: int
    location_id: int
    provider_number: str
    provider_type: str
    hw027_status: str
    air_access_list: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class HW027StatusUpdate(BaseModel):
    hw027_status: str = Field(..., pattern="^(not_submitted|submitted|approved|rejected)$")
