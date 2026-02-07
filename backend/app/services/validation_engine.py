"""Server-side AIR business rule validation engine.

Validates parsed records against AIR API requirements before submission.
Covers individual identification, encounter rules, and episode rules.
"""

import re
from datetime import datetime, timedelta
from typing import Any

import structlog

from app.utils.medicare_validator import validate_medicare_check_digit
from app.utils.provider_validator import validate_provider_number

logger = structlog.get_logger(__name__)

# Name validation: alpha, numeric, apostrophe, space, hyphen
# Must contain at least one alpha character
# No spaces immediately before or after apostrophes or hyphens
NAME_PATTERN = re.compile(
    r"^(?!.*\s[-'])(?!.*[-']\s)[A-Za-z0-9' \-]+$"
)

VALID_GENDERS = {"M", "F", "X"}
VALID_VACCINE_TYPES = {"NIP", "OTH"}
VALID_ROUTES = {"PO", "SC", "ID", "IM", "NS"}


class ValidationError:
    """Represents a single validation error."""

    def __init__(self, row: int, field: str, code: str, message: str, value: str = "") -> None:
        self.row = row
        self.field = field
        self.code = code
        self.message = message
        self.value = value

    def to_dict(self) -> dict[str, Any]:
        return {
            "rowNumber": self.row,
            "field": self.field,
            "errorCode": self.code,
            "message": self.message,
            "value": self.value,
        }


class IndividualValidator:
    """Validates individual identification fields per AIR minimum requirements."""

    def validate(self, record: dict[str, Any], row: int) -> list[ValidationError]:
        """Validate individual fields in a record.

        Checks identification scenarios, Medicare check digit, IHI format,
        name rules, date of birth, and gender.
        """
        errors: list[ValidationError] = []

        # Date of Birth - mandatory
        dob = record.get("dateOfBirth")
        if not dob:
            errors.append(ValidationError(row, "dateOfBirth", "AIR-E-1016", "Date of Birth is required"))
        else:
            dob_errors = self._validate_date_of_birth(dob, row)
            errors.extend(dob_errors)

        # Gender - mandatory
        gender = record.get("gender")
        if not gender:
            errors.append(ValidationError(row, "gender", "AIR-E-1016", "Gender is required"))
        elif gender not in VALID_GENDERS:
            errors.append(ValidationError(
                row, "gender", "AIR-E-1017",
                f"Invalid gender: '{gender}'. Must be F, M, or X", gender
            ))

        # Identification scenario check
        id_errors = self._validate_identification(record, row)
        errors.extend(id_errors)

        # Name validation
        for field in ("firstName", "lastName"):
            name = record.get(field)
            if name:
                name_errors = self._validate_name(name, field, row)
                errors.extend(name_errors)

        return errors

    def _validate_identification(self, record: dict[str, Any], row: int) -> list[ValidationError]:
        """Check that at least one identification scenario is satisfied."""
        medicare = record.get("medicareCardNumber")
        irn = record.get("medicareIRN")
        ihi = record.get("ihiNumber")
        first_name = record.get("firstName")
        last_name = record.get("lastName")
        postcode = record.get("postCode")
        dob = record.get("dateOfBirth")
        gender = record.get("gender")

        errors: list[ValidationError] = []

        # Scenario 1: Medicare + IRN + DOB + Gender
        if medicare:
            if not validate_medicare_check_digit(medicare):
                errors.append(ValidationError(
                    row, "medicareCardNumber", "AIR-E-1017",
                    "Invalid Medicare card number check digit", medicare
                ))
            if not irn:
                errors.append(ValidationError(
                    row, "medicareIRN", "AIR-E-1020",
                    "Medicare IRN is required when Medicare card number is provided"
                ))
            return errors

        # Scenario 2: IHI + DOB + Gender
        if ihi:
            if not re.match(r"^\d{16}$", ihi):
                errors.append(ValidationError(
                    row, "ihiNumber", "AIR-E-1016",
                    f"IHI must be exactly 16 digits, got '{ihi}'", ihi
                ))
            return errors

        # Scenario 3: firstName + lastName + DOB + Gender + Postcode
        if first_name and last_name and dob and gender and postcode:
            if not re.match(r"^\d{4}$", postcode):
                errors.append(ValidationError(
                    row, "postCode", "AIR-E-1016",
                    f"Postcode must be 4 digits, got '{postcode}'", postcode
                ))
            return errors

        # No identification scenario satisfied
        errors.append(ValidationError(
            row, "individual", "AIR-E-1026",
            "Insufficient identification: provide Medicare+IRN, IHI, or FirstName+LastName+DOB+Gender+Postcode"
        ))
        return errors

    def _validate_date_of_birth(self, dob: str, row: int) -> list[ValidationError]:
        """Validate date of birth format and range."""
        errors: list[ValidationError] = []
        try:
            dob_date = datetime.strptime(dob, "%Y-%m-%d")
            now = datetime.now()

            if dob_date > now:
                errors.append(ValidationError(
                    row, "dateOfBirth", "AIR-E-1018",
                    "Date of Birth must not be in the future", dob
                ))

            if dob_date < now - timedelta(days=130 * 365):
                errors.append(ValidationError(
                    row, "dateOfBirth", "AIR-E-1019",
                    "Date of Birth must not be more than 130 years ago", dob
                ))
        except ValueError:
            errors.append(ValidationError(
                row, "dateOfBirth", "AIR-E-1016",
                f"Invalid date format: '{dob}'. Expected yyyy-MM-dd", dob
            ))
        return errors

    def _validate_name(self, name: str, field: str, row: int) -> list[ValidationError]:
        """Validate name field (firstName or lastName)."""
        errors: list[ValidationError] = []

        if len(name) > 40:
            errors.append(ValidationError(
                row, field, "AIR-E-1016",
                f"{field} must be at most 40 characters", name
            ))

        if not NAME_PATTERN.match(name):
            errors.append(ValidationError(
                row, field, "AIR-E-1017",
                f"Invalid characters in {field}. Allowed: alpha, numeric, apostrophe, space, hyphen", name
            ))
        elif not any(c.isalpha() for c in name):
            errors.append(ValidationError(
                row, field, "AIR-E-1017",
                f"{field} must contain at least one alphabetic character", name
            ))

        return errors


class EncounterValidator:
    """Validates encounter-level fields per AIR business rules."""

    def validate(self, record: dict[str, Any], row: int) -> list[ValidationError]:
        """Validate encounter fields in a record."""
        errors: list[ValidationError] = []

        # Date of Service - mandatory
        dos = record.get("dateOfService")
        if not dos:
            errors.append(ValidationError(row, "dateOfService", "AIR-E-1022", "Date of Service is required"))
        else:
            dos_errors = self._validate_date_of_service(dos, record.get("dateOfBirth", ""), row)
            errors.extend(dos_errors)

        # Provider number
        provider = record.get("immunisingProviderNumber")
        if provider and not validate_provider_number(provider):
            errors.append(ValidationError(
                row, "immunisingProviderNumber", "AIR-E-1028",
                f"Invalid provider number: '{provider}'", provider
            ))

        # Overseas vaccination requirements
        overseas = record.get("administeredOverseas")
        if overseas and not record.get("countryCode"):
            errors.append(ValidationError(
                row, "countryCode", "AIR-E-1079",
                "Country code is required when vaccination is administered overseas"
            ))

        return errors

    def _validate_date_of_service(self, dos: str, dob: str, row: int) -> list[ValidationError]:
        """Validate date of service format and range."""
        errors: list[ValidationError] = []
        try:
            dos_date = datetime.strptime(dos, "%Y-%m-%d")
            now = datetime.now()

            if dos_date > now:
                errors.append(ValidationError(
                    row, "dateOfService", "AIR-E-1018",
                    "Date of Service must not be in the future", dos
                ))

            # Date must be after 1996-01-01
            min_date = datetime(1996, 1, 1)
            if dos_date < min_date:
                errors.append(ValidationError(
                    row, "dateOfService", "AIR-E-1022",
                    "Date of Service must be after 01/01/1996", dos
                ))

            # Date must be after DOB
            if dob:
                try:
                    dob_date = datetime.strptime(dob, "%Y-%m-%d")
                    if dos_date < dob_date:
                        errors.append(ValidationError(
                            row, "dateOfService", "AIR-E-1015",
                            "Date of Service must be after Date of Birth", dos
                        ))
                except ValueError:
                    pass  # DOB validation handled separately

        except ValueError:
            errors.append(ValidationError(
                row, "dateOfService", "AIR-E-1016",
                f"Invalid date format: '{dos}'. Expected yyyy-MM-dd", dos
            ))
        return errors


class EpisodeValidator:
    """Validates episode-level fields per AIR business rules."""

    def validate(self, record: dict[str, Any], row: int) -> list[ValidationError]:
        """Validate episode fields in a record."""
        errors: list[ValidationError] = []

        # Vaccine code - mandatory
        vaccine_code = record.get("vaccineCode")
        if not vaccine_code:
            errors.append(ValidationError(
                row, "vaccineCode", "AIR-E-1023", "Vaccine code is required"
            ))
        elif len(vaccine_code) > 6:
            errors.append(ValidationError(
                row, "vaccineCode", "AIR-E-1023",
                f"Vaccine code must be 1-6 characters, got '{vaccine_code}'", vaccine_code
            ))

        # Vaccine dose - mandatory
        dose = record.get("vaccineDose")
        if not dose:
            errors.append(ValidationError(
                row, "vaccineDose", "AIR-E-1024", "Vaccine dose is required"
            ))
        else:
            if not re.match(r"^(B|[1-9]|1[0-9]|20)$", str(dose)):
                errors.append(ValidationError(
                    row, "vaccineDose", "AIR-E-1024",
                    f"Invalid vaccine dose: '{dose}'. Must be 'B' or 1-20", str(dose)
                ))

        # Vaccine type
        vtype = record.get("vaccineType")
        if vtype and vtype not in VALID_VACCINE_TYPES:
            errors.append(ValidationError(
                row, "vaccineType", "AIR-E-1084",
                f"Invalid vaccine type: '{vtype}'. Must be NIP or OTH", vtype
            ))

        # Route of administration
        route = record.get("routeOfAdministration")
        if route and route not in VALID_ROUTES:
            errors.append(ValidationError(
                row, "routeOfAdministration", "AIR-E-1085",
                f"Invalid route: '{route}'. Must be PO, SC, ID, IM, or NS", route
            ))

        return errors


class ValidationOrchestrator:
    """Orchestrates all validators and aggregates results."""

    def __init__(self) -> None:
        self.individual_validator = IndividualValidator()
        self.encounter_validator = EncounterValidator()
        self.episode_validator = EpisodeValidator()

    def validate(self, records: list[dict[str, Any]]) -> dict[str, Any]:
        """Run all validation checks on a list of records.

        Returns a validation result summary.
        """
        all_errors: list[dict[str, Any]] = []
        valid_count = 0
        invalid_count = 0

        for record in records:
            row = record.get("rowNumber", 0)
            errors: list[ValidationError] = []

            errors.extend(self.individual_validator.validate(record, row))
            errors.extend(self.encounter_validator.validate(record, row))
            errors.extend(self.episode_validator.validate(record, row))

            if errors:
                invalid_count += 1
                all_errors.extend(e.to_dict() for e in errors)
            else:
                valid_count += 1

        result = {
            "isValid": invalid_count == 0,
            "totalRecords": len(records),
            "validRecords": valid_count,
            "invalidRecords": invalid_count,
            "errors": all_errors,
        }

        logger.info(
            "validation_complete",
            total=len(records),
            valid=valid_count,
            invalid=invalid_count,
            error_count=len(all_errors),
        )

        return result
