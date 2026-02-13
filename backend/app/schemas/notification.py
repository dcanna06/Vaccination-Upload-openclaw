"""Pydantic schemas for Notification endpoints."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    type: str
    title: str
    is_read: bool
    metadata: dict[str, Any] | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
