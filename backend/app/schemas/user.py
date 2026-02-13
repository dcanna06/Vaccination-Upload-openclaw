"""Pydantic models for user authentication and management."""

from typing import Literal

from pydantic import BaseModel, EmailStr, Field


UserRole = Literal[
    "super_admin",
    "org_admin",
    "provider",
    "reviewer",
    "read_only",
    "facility_staff",
    "pharmacist",
    "nurse_manager",
]
UserStatus = Literal["pending", "active", "locked", "inactive"]


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=12)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=12)
    first_name: str = Field(..., max_length=50)
    last_name: str = Field(..., max_length=50)
    phone: str | None = Field(None, max_length=20)
    ahpra_number: str | None = Field(None, max_length=20)
    role: UserRole = "provider"


class UserResponse(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    phone: str | None = None
    ahpra_number: str | None = None
    role: UserRole
    status: UserStatus

    model_config = {"from_attributes": True}
