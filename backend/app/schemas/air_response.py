"""Pydantic models for AIR Record Encounter API response (TECH.SIS.AIR.02)."""

from pydantic import BaseModel


class EpisodeResultSchema(BaseModel):
    episodeId: str | None = None
    statusCode: str | None = None
    message: str | None = None


class EncounterResultSchema(BaseModel):
    encounterId: str | None = None
    statusCode: str | None = None
    message: str | None = None
    episodeResults: list[EpisodeResultSchema] | None = None


class ClaimDetailsSchema(BaseModel):
    claimId: str | None = None
    claimSequenceNumber: str | None = None


class AddEncounterResponseSchema(BaseModel):
    statusCode: str
    message: str
    claimDetails: ClaimDetailsSchema | None = None
    encounterResults: list[EncounterResultSchema] | None = None
