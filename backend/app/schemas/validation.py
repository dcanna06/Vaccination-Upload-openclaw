"""Pydantic models for validation results."""

from pydantic import BaseModel


class ValidationErrorSchema(BaseModel):
    rowNumber: int
    field: str
    value: str
    errorCode: str
    message: str


class ValidationWarningSchema(BaseModel):
    rowNumber: int
    field: str
    value: str
    warningCode: str
    message: str


class ValidationResultSchema(BaseModel):
    isValid: bool
    totalRecords: int
    validRecords: int
    invalidRecords: int
    errors: list[ValidationErrorSchema]
    warnings: list[ValidationWarningSchema]


class ExcelRowSchema(BaseModel):
    rowNumber: int
    medicareCardNumber: str | None = None
    medicareIRN: str | None = None
    ihiNumber: str | None = None
    firstName: str | None = None
    lastName: str | None = None
    dateOfBirth: str | None = None
    gender: str | None = None
    postcode: str | None = None
    dateOfService: str | None = None
    vaccineCode: str | None = None
    vaccineDose: str | None = None
    vaccineBatch: str | None = None
    vaccineType: str | None = None
    routeOfAdministration: str | None = None
    administeredOverseas: str | None = None
    countryCode: str | None = None
    immunisingProviderNumber: str | None = None
    schoolId: str | None = None
    antenatalIndicator: str | None = None
