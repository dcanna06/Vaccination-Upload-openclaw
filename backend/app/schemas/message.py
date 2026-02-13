"""Pydantic schemas for Message endpoints."""

from datetime import datetime

from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    facility_id: int
    body: str = Field(..., min_length=1)


class MessageResponse(BaseModel):
    id: int
    facility_id: int
    sender_id: int
    sender_role: str
    sender_name: str
    body: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ThreadResponse(BaseModel):
    facility_id: int
    facility_name: str
    last_message: str
    last_message_at: datetime
    unread_count: int = 0
