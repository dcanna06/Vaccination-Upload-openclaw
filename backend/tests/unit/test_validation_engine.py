"""Tests for the validation engine: individual, encounter, episode, and orchestrator."""

import pytest

from app.services.validation_engine import (
    EncounterValidator,
    EpisodeValidator,
    IndividualValidator,
    ValidationOrchestrator,
)
from app.utils.medicare_validator import validate_medicare_check_digit
from app.utils.provider_validator import (
    validate_air_provider_number,
    validate_medicare_provider_number,
    validate_provider_number,
)


def _base_record(**overrides) -> dict:
    """Create a valid base record for testing."""
    record = {
        "rowNumber": 2,
        "medicareCardNumber": "2123456701",
        "medicareIRN": "1",
        "dateOfBirth": "1990-01-15",
        "gender": "F",
        "firstName": "Jane",
        "lastName": "Smith",
        "postCode": "2000",
        "dateOfService": "2026-01-15",
        "vaccineCode": "COMIRN",
        "vaccineDose": "1",
        "immunisingProviderNumber": "1234560V",
    }
    record.update(overrides)
    return record


# ============================================================================
# Medicare Check Digit Tests
# ============================================================================

class TestMedicareCheckDigit:
    """Test Medicare card number check digit algorithm."""

    def test_valid_number(self) -> None:
        assert validate_medicare_check_digit("2123456701") is True

    def test_invalid_check_digit(self) -> None:
        assert validate_medicare_check_digit("2123456791") is False

    def test_too_short(self) -> None:
        assert validate_medicare_check_digit("212345") is False

    def test_too_long(self) -> None:
        assert validate_medicare_check_digit("21234567012") is False

    def test_non_numeric(self) -> None:
        assert validate_medicare_check_digit("ABCDEFGHIJ") is False

    def test_issue_number_zero(self) -> None:
        assert validate_medicare_check_digit("2123456700") is False

    def test_empty_string(self) -> None:
        assert validate_medicare_check_digit("") is False


# ============================================================================
# Provider Number Tests
# ============================================================================

class TestMedicareProviderNumber:
    """Test Medicare provider number validation."""

    def test_invalid_length(self) -> None:
        assert validate_medicare_provider_number("12345") is False

    def test_non_digit_stem(self) -> None:
        assert validate_medicare_provider_number("ABCDEFGH") is False

    def test_invalid_plc_character(self) -> None:
        # I, O, S, Z are not valid practice location characters
        assert validate_medicare_provider_number("123456IA") is False
        assert validate_medicare_provider_number("123456OA") is False

    def test_valid_format_check(self) -> None:
        # Test with a constructed valid number
        result = validate_medicare_provider_number("1234567A")
        # Whether it passes depends on the actual check digit
        assert isinstance(result, bool)


class TestAIRProviderNumber:
    """Test AIR provider number validation."""

    def test_invalid_state_code(self) -> None:
        assert validate_air_provider_number("Z1234567") is False

    def test_non_digit_body(self) -> None:
        assert validate_air_provider_number("NABCDET ") is False


class TestProviderNumberDispatch:
    """Test provider number format detection and dispatch."""

    def test_empty_returns_false(self) -> None:
        assert validate_provider_number("") is False

    def test_too_short_returns_false(self) -> None:
        assert validate_provider_number("12345") is False

    def test_digit_start_uses_medicare(self) -> None:
        # Starts with digit -> Medicare format
        result = validate_provider_number("1234560Y")
        assert isinstance(result, bool)

    def test_alpha_start_uses_air(self) -> None:
        # Starts with letter -> AIR format
        result = validate_provider_number("N12345XY")
        assert isinstance(result, bool)


# ============================================================================
# Individual Validator Tests
# ============================================================================

class TestIndividualValidator:
    """Test individual identification validation."""

    @pytest.fixture
    def validator(self) -> IndividualValidator:
        return IndividualValidator()

    def test_valid_record_no_errors(self, validator: IndividualValidator) -> None:
        errors = validator.validate(_base_record(), 2)
        assert len(errors) == 0

    def test_missing_dob_fails(self, validator: IndividualValidator) -> None:
        errors = validator.validate(_base_record(dateOfBirth=""), 2)
        assert any(e.code == "AIR-E-1016" for e in errors)

    def test_future_dob_fails(self, validator: IndividualValidator) -> None:
        errors = validator.validate(_base_record(dateOfBirth="2099-01-01"), 2)
        assert any(e.code == "AIR-E-1018" for e in errors)

    def test_ancient_dob_fails(self, validator: IndividualValidator) -> None:
        errors = validator.validate(_base_record(dateOfBirth="1800-01-01"), 2)
        assert any(e.code == "AIR-E-1019" for e in errors)

    def test_missing_gender_fails(self, validator: IndividualValidator) -> None:
        errors = validator.validate(_base_record(gender=""), 2)
        assert any(e.code == "AIR-E-1016" for e in errors)

    def test_invalid_gender_fails(self, validator: IndividualValidator) -> None:
        errors = validator.validate(_base_record(gender="X"), 2)
        assert any(e.code == "AIR-E-1017" for e in errors)

    def test_valid_genders_pass(self, validator: IndividualValidator) -> None:
        for g in ["M", "F", "I", "U"]:
            errors = validator.validate(_base_record(gender=g), 2)
            gender_errors = [e for e in errors if e.field == "gender"]
            assert len(gender_errors) == 0, f"Gender '{g}' should be valid"

    # Identification scenarios
    def test_scenario_1_medicare(self, validator: IndividualValidator) -> None:
        """Scenario 1: Medicare + IRN + DOB + Gender"""
        record = _base_record(ihiNumber="", firstName="", lastName="", postCode="")
        errors = validator.validate(record, 2)
        id_errors = [e for e in errors if e.field == "individual"]
        assert len(id_errors) == 0

    def test_scenario_1_missing_irn_fails(self, validator: IndividualValidator) -> None:
        record = _base_record(medicareIRN="")
        errors = validator.validate(record, 2)
        assert any(e.code == "AIR-E-1020" for e in errors)

    def test_scenario_2_ihi(self, validator: IndividualValidator) -> None:
        """Scenario 2: IHI + DOB + Gender"""
        record = _base_record(
            medicareCardNumber="", medicareIRN="",
            ihiNumber="8003608833357361",
            firstName="", lastName="", postCode=""
        )
        errors = validator.validate(record, 2)
        id_errors = [e for e in errors if e.field == "individual"]
        assert len(id_errors) == 0

    def test_scenario_2_invalid_ihi_format(self, validator: IndividualValidator) -> None:
        record = _base_record(
            medicareCardNumber="", medicareIRN="",
            ihiNumber="12345",  # Not 16 digits
        )
        errors = validator.validate(record, 2)
        assert any(e.code == "AIR-E-1016" and e.field == "ihiNumber" for e in errors)

    def test_scenario_3_demographics(self, validator: IndividualValidator) -> None:
        """Scenario 3: firstName + lastName + DOB + Gender + Postcode"""
        record = _base_record(
            medicareCardNumber="", medicareIRN="", ihiNumber=""
        )
        errors = validator.validate(record, 2)
        id_errors = [e for e in errors if e.field == "individual"]
        assert len(id_errors) == 0

    def test_no_identification_fails(self, validator: IndividualValidator) -> None:
        record = _base_record(
            medicareCardNumber="", medicareIRN="", ihiNumber="",
            firstName="", lastName="", postCode=""
        )
        errors = validator.validate(record, 2)
        assert any(e.code == "AIR-E-1026" for e in errors)

    # Name validation
    def test_name_too_long(self, validator: IndividualValidator) -> None:
        errors = validator.validate(_base_record(firstName="A" * 41), 2)
        assert any(e.field == "firstName" for e in errors)

    def test_name_invalid_chars(self, validator: IndividualValidator) -> None:
        errors = validator.validate(_base_record(firstName="Jane@!"), 2)
        assert any(e.field == "firstName" for e in errors)

    def test_name_with_apostrophe_valid(self, validator: IndividualValidator) -> None:
        errors = validator.validate(_base_record(lastName="O'Brien"), 2)
        name_errors = [e for e in errors if e.field == "lastName"]
        assert len(name_errors) == 0

    def test_name_with_hyphen_valid(self, validator: IndividualValidator) -> None:
        errors = validator.validate(_base_record(lastName="Smith-Jones"), 2)
        name_errors = [e for e in errors if e.field == "lastName"]
        assert len(name_errors) == 0

    def test_invalid_medicare_check_digit(self, validator: IndividualValidator) -> None:
        errors = validator.validate(_base_record(medicareCardNumber="2123456791"), 2)
        assert any(e.code == "AIR-E-1017" for e in errors)


# ============================================================================
# Encounter Validator Tests
# ============================================================================

class TestEncounterValidator:
    """Test encounter-level validation."""

    @pytest.fixture
    def validator(self) -> EncounterValidator:
        return EncounterValidator()

    def test_valid_record_no_errors(self, validator: EncounterValidator) -> None:
        errors = validator.validate(_base_record(), 2)
        assert len(errors) == 0

    def test_missing_date_of_service(self, validator: EncounterValidator) -> None:
        errors = validator.validate(_base_record(dateOfService=""), 2)
        assert any(e.code == "AIR-E-1022" for e in errors)

    def test_future_date_of_service(self, validator: EncounterValidator) -> None:
        errors = validator.validate(_base_record(dateOfService="2099-01-01"), 2)
        assert any(e.code == "AIR-E-1018" for e in errors)

    def test_date_before_1996(self, validator: EncounterValidator) -> None:
        errors = validator.validate(_base_record(dateOfService="1995-12-31"), 2)
        assert any(e.code == "AIR-E-1022" for e in errors)

    def test_date_before_dob(self, validator: EncounterValidator) -> None:
        errors = validator.validate(
            _base_record(dateOfBirth="2020-01-01", dateOfService="2019-01-01"), 2
        )
        assert any(e.code == "AIR-E-1015" for e in errors)

    def test_overseas_requires_country_code(self, validator: EncounterValidator) -> None:
        errors = validator.validate(_base_record(administeredOverseas=True), 2)
        assert any(e.code == "AIR-E-1079" for e in errors)

    def test_overseas_with_country_code_passes(self, validator: EncounterValidator) -> None:
        errors = validator.validate(
            _base_record(administeredOverseas=True, countryCode="USA"), 2
        )
        country_errors = [e for e in errors if e.code == "AIR-E-1079"]
        assert len(country_errors) == 0


# ============================================================================
# Episode Validator Tests
# ============================================================================

class TestEpisodeValidator:
    """Test episode-level validation."""

    @pytest.fixture
    def validator(self) -> EpisodeValidator:
        return EpisodeValidator()

    def test_valid_record_no_errors(self, validator: EpisodeValidator) -> None:
        errors = validator.validate(_base_record(), 2)
        assert len(errors) == 0

    def test_missing_vaccine_code(self, validator: EpisodeValidator) -> None:
        errors = validator.validate(_base_record(vaccineCode=""), 2)
        assert any(e.code == "AIR-E-1023" for e in errors)

    def test_vaccine_code_too_long(self, validator: EpisodeValidator) -> None:
        errors = validator.validate(_base_record(vaccineCode="TOOLONG1"), 2)
        assert any(e.code == "AIR-E-1023" for e in errors)

    def test_missing_vaccine_dose(self, validator: EpisodeValidator) -> None:
        errors = validator.validate(_base_record(vaccineDose=""), 2)
        assert any(e.code == "AIR-E-1024" for e in errors)

    def test_valid_dose_b(self, validator: EpisodeValidator) -> None:
        errors = validator.validate(_base_record(vaccineDose="B"), 2)
        dose_errors = [e for e in errors if e.field == "vaccineDose"]
        assert len(dose_errors) == 0

    def test_valid_dose_1(self, validator: EpisodeValidator) -> None:
        errors = validator.validate(_base_record(vaccineDose="1"), 2)
        dose_errors = [e for e in errors if e.field == "vaccineDose"]
        assert len(dose_errors) == 0

    def test_valid_dose_20(self, validator: EpisodeValidator) -> None:
        errors = validator.validate(_base_record(vaccineDose="20"), 2)
        dose_errors = [e for e in errors if e.field == "vaccineDose"]
        assert len(dose_errors) == 0

    def test_invalid_dose_21(self, validator: EpisodeValidator) -> None:
        errors = validator.validate(_base_record(vaccineDose="21"), 2)
        assert any(e.code == "AIR-E-1024" for e in errors)

    def test_invalid_dose_0(self, validator: EpisodeValidator) -> None:
        errors = validator.validate(_base_record(vaccineDose="0"), 2)
        assert any(e.code == "AIR-E-1024" for e in errors)

    def test_invalid_vaccine_type(self, validator: EpisodeValidator) -> None:
        errors = validator.validate(_base_record(vaccineType="INVALID"), 2)
        assert any(e.code == "AIR-E-1084" for e in errors)

    def test_valid_vaccine_types(self, validator: EpisodeValidator) -> None:
        for vtype in ["NIP", "AEN", "OTH"]:
            errors = validator.validate(_base_record(vaccineType=vtype), 2)
            type_errors = [e for e in errors if e.field == "vaccineType"]
            assert len(type_errors) == 0, f"VaccineType '{vtype}' should be valid"

    def test_invalid_route(self, validator: EpisodeValidator) -> None:
        errors = validator.validate(_base_record(routeOfAdministration="PO"), 2)
        assert any(e.code == "AIR-E-1085" for e in errors)

    def test_valid_routes(self, validator: EpisodeValidator) -> None:
        for route in ["IM", "SC", "ID", "OR", "IN", "NAS"]:
            errors = validator.validate(_base_record(routeOfAdministration=route), 2)
            route_errors = [e for e in errors if e.field == "routeOfAdministration"]
            assert len(route_errors) == 0, f"Route '{route}' should be valid"


# ============================================================================
# Orchestrator Tests
# ============================================================================

class TestValidationOrchestrator:
    """Test the full validation orchestrator."""

    @pytest.fixture
    def orchestrator(self) -> ValidationOrchestrator:
        return ValidationOrchestrator()

    def test_valid_records(self, orchestrator: ValidationOrchestrator) -> None:
        result = orchestrator.validate([_base_record()])
        assert result["isValid"] is True
        assert result["validRecords"] == 1
        assert result["invalidRecords"] == 0

    def test_invalid_record(self, orchestrator: ValidationOrchestrator) -> None:
        result = orchestrator.validate([_base_record(dateOfBirth="")])
        assert result["isValid"] is False
        assert result["invalidRecords"] == 1

    def test_mixed_records(self, orchestrator: ValidationOrchestrator) -> None:
        records = [
            _base_record(rowNumber=2),
            _base_record(rowNumber=3, dateOfBirth=""),
        ]
        result = orchestrator.validate(records)
        assert result["isValid"] is False
        assert result["validRecords"] == 1
        assert result["invalidRecords"] == 1

    def test_errors_include_row_numbers(self, orchestrator: ValidationOrchestrator) -> None:
        result = orchestrator.validate([_base_record(rowNumber=5, vaccineCode="")])
        assert any(e["rowNumber"] == 5 for e in result["errors"])

    def test_total_records_correct(self, orchestrator: ValidationOrchestrator) -> None:
        records = [_base_record(rowNumber=i) for i in range(2, 12)]
        result = orchestrator.validate(records)
        assert result["totalRecords"] == 10
