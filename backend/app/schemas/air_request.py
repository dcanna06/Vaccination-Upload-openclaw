"""Pydantic models for AIR Record Encounter API request (TECH.SIS.AIR.02)."""

from typing import Literal

from pydantic import BaseModel, Field


class PersonalDetailsSchema(BaseModel):
    dateOfBirth: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    gender: Literal["F", "M", "I", "U", "X"] | None = None
    firstName: str | None = Field(None, max_length=40)
    lastName: str | None = Field(None, max_length=40)
    initial: str | None = Field(None, max_length=1)
    onlyNameIndicator: bool | None = None


class MedicareCardSchema(BaseModel):
    medicareCardNumber: str = Field(..., pattern=r"^\d{10}$")
    medicareIRN: str | None = Field(None, pattern=r"^[1-9]$")


class AddressSchema(BaseModel):
    addressLineOne: str | None = Field(None, max_length=40)
    addressLineTwo: str | None = Field(None, max_length=40)
    postCode: str | None = Field(None, pattern=r"^\d{4}$")
    locality: str | None = Field(None, max_length=40)


class IndividualIdentifierSchema(BaseModel):
    acceptAndConfirm: Literal["Y", "N"] | None = None
    personalDetails: PersonalDetailsSchema
    medicareCard: MedicareCardSchema | None = None
    address: AddressSchema | None = None
    atsiIndicator: Literal["Y", "N"] | None = None
    ihiNumber: str | None = Field(None, pattern=r"^\d{16}$")


class ProviderIdentifierSchema(BaseModel):
    providerNumber: str = Field(..., min_length=6, max_length=8)
    hpioNumber: str | None = Field(None, pattern=r"^\d{16}$")
    hpiiNumber: str | None = Field(None, pattern=r"^\d{16}$")


class EpisodeSchema(BaseModel):
    id: str = Field(..., pattern=r"^[1-5]$")
    vaccineCode: str = Field(..., min_length=1, max_length=6)
    vaccineDose: str = Field(..., pattern=r"^(B|[1-9]|1[0-9]|20)$")
    vaccineBatch: str | None = Field(None, max_length=15)
    vaccineType: Literal["NIP", "AEN", "OTH"] | None = None
    routeOfAdministration: Literal["IM", "SC", "ID", "OR", "IN", "NAS", "NS"] | None = None


class EncounterSchema(BaseModel):
    id: str = Field(..., pattern=r"^([1-9]|10)$")
    dateOfService: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    episodes: list[EpisodeSchema] = Field(..., min_length=1, max_length=5)
    immunisationProvider: ProviderIdentifierSchema | None = None
    schoolId: str | None = Field(None, pattern=r"^\d{1,9}$")
    administeredOverseas: bool | None = None
    countryCode: str | None = Field(None, min_length=3, max_length=3)
    antenatalIndicator: bool | None = None
    acceptAndConfirm: Literal["Y", "N"] | None = None
    claimSequenceNumber: str | None = None


class AddEncounterRequestSchema(BaseModel):
    individual: IndividualIdentifierSchema
    encounters: list[EncounterSchema] = Field(..., min_length=1, max_length=10)
    informationProvider: ProviderIdentifierSchema
    claimId: str | None = None
