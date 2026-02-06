"""Tests for TICKET-031/032: Error handling, AIR error code mapping, and PII masking."""

import pytest

from app.exceptions import (
    AIRApiError,
    AIR_ERROR_MESSAGES,
    AppError,
    AuthenticationError,
    FileProcessingError,
    ValidationError,
    get_air_user_message,
)
from app.utils.pii_masker import (
    mask_dob,
    mask_ihi,
    mask_log_message,
    mask_medicare,
    mask_name,
    mask_record,
)


# ============================================================================
# Error Classes
# ============================================================================


class TestAppError:
    def test_default_status_code(self) -> None:
        err = AppError("fail")
        assert err.status_code == 500

    def test_custom_status_code(self) -> None:
        err = AppError("fail", status_code=503)
        assert err.status_code == 503

    def test_message(self) -> None:
        err = AppError("something broke")
        assert err.message == "something broke"

    def test_detail(self) -> None:
        err = AppError("fail", detail={"key": "value"})
        assert err.detail == {"key": "value"}


class TestValidationError:
    def test_status_code_422(self) -> None:
        err = ValidationError("invalid")
        assert err.status_code == 422

    def test_inherits_app_error(self) -> None:
        err = ValidationError("invalid")
        assert isinstance(err, AppError)


class TestAuthenticationError:
    def test_status_code_401(self) -> None:
        err = AuthenticationError()
        assert err.status_code == 401

    def test_default_message(self) -> None:
        err = AuthenticationError()
        assert "Authentication" in err.message


class TestFileProcessingError:
    def test_status_code_400(self) -> None:
        err = FileProcessingError("bad file")
        assert err.status_code == 400


class TestAIRApiError:
    def test_default_status_code_502(self) -> None:
        err = AIRApiError("api fail")
        assert err.status_code == 502

    def test_custom_status_code(self) -> None:
        err = AIRApiError("unauthorized", status_code=401)
        assert err.status_code == 401


# ============================================================================
# AIR Error Code Mapping
# ============================================================================


class TestAIRErrorCodeMapping:
    def test_success_code_mapped(self) -> None:
        msg = get_air_user_message("AIR-I-1007")
        assert "success" in msg.lower()

    def test_warning_1004_mapped(self) -> None:
        msg = get_air_user_message("AIR-W-1004")
        assert "not found" in msg.lower()

    def test_warning_1008_mapped(self) -> None:
        msg = get_air_user_message("AIR-W-1008")
        assert "confirmation" in msg.lower()

    def test_error_1023_mapped(self) -> None:
        msg = get_air_user_message("AIR-E-1023")
        assert "vaccine code" in msg.lower()

    def test_error_1024_mapped(self) -> None:
        msg = get_air_user_message("AIR-E-1024")
        assert "dose" in msg.lower()

    def test_error_1026_mapped(self) -> None:
        msg = get_air_user_message("AIR-E-1026")
        assert "identification" in msg.lower()

    def test_error_1063_mapped(self) -> None:
        msg = get_air_user_message("AIR-E-1063")
        assert "authorised" in msg.lower()

    def test_error_1079_mapped(self) -> None:
        msg = get_air_user_message("AIR-E-1079")
        assert "country" in msg.lower()

    def test_unknown_code_returns_fallback(self) -> None:
        msg = get_air_user_message("AIR-X-9999")
        assert "AIR-X-9999" in msg

    def test_all_codes_have_nonempty_messages(self) -> None:
        for code, msg in AIR_ERROR_MESSAGES.items():
            assert len(msg) > 0, f"Empty message for {code}"

    def test_mapping_has_at_least_25_codes(self) -> None:
        assert len(AIR_ERROR_MESSAGES) >= 25


# ============================================================================
# PII Masking
# ============================================================================


class TestMaskMedicare:
    def test_masks_10_digit(self) -> None:
        assert mask_medicare("2123456701") == "********01"

    def test_short_value(self) -> None:
        assert mask_medicare("12") == "***"

    def test_empty_value(self) -> None:
        assert mask_medicare("") == "***"


class TestMaskIHI:
    def test_masks_16_digit(self) -> None:
        result = mask_ihi("8003608166690503")
        assert result == "************0503"
        assert len(result) == 16

    def test_short_value(self) -> None:
        assert mask_ihi("123") == "***"


class TestMaskName:
    def test_masks_name(self) -> None:
        assert mask_name("Jane") == "J***"

    def test_single_char(self) -> None:
        assert mask_name("J") == "J"

    def test_empty(self) -> None:
        assert mask_name("") == "***"


class TestMaskDOB:
    def test_masks_yyyy_mm_dd(self) -> None:
        assert mask_dob("1990-01-15") == "1990-**-**"

    def test_masks_ddmmyyyy(self) -> None:
        assert mask_dob("15011990") == "****1990"

    def test_empty(self) -> None:
        assert mask_dob("") == "***"


class TestMaskRecord:
    def test_masks_all_pii_fields(self) -> None:
        record = {
            "medicareCardNumber": "2123456701",
            "medicareIRN": "1",
            "ihiNumber": "8003608166690503",
            "firstName": "Jane",
            "lastName": "Smith",
            "dateOfBirth": "1990-01-15",
            "vaccineCode": "COMIRN",
        }
        masked = mask_record(record)
        assert masked["medicareCardNumber"] == "********01"
        assert masked["medicareIRN"] == "*"
        assert masked["ihiNumber"] == "************0503"
        assert masked["firstName"] == "J***"
        assert masked["lastName"] == "S****"
        assert masked["dateOfBirth"] == "1990-**-**"
        # Non-PII fields unchanged
        assert masked["vaccineCode"] == "COMIRN"

    def test_original_not_modified(self) -> None:
        record = {"firstName": "Jane"}
        masked = mask_record(record)
        assert record["firstName"] == "Jane"
        assert masked["firstName"] == "J***"

    def test_missing_fields_ok(self) -> None:
        record = {"vaccineCode": "COMIRN"}
        masked = mask_record(record)
        assert masked["vaccineCode"] == "COMIRN"


class TestMaskLogMessage:
    def test_masks_10_digit_medicare(self) -> None:
        msg = mask_log_message("Medicare: 2123456701")
        assert "2123456701" not in msg
        assert "01" in msg

    def test_masks_16_digit_ihi(self) -> None:
        msg = mask_log_message("IHI: 8003608166690503")
        assert "8003608166690503" not in msg
        assert "0503" in msg

    def test_preserves_non_pii(self) -> None:
        msg = mask_log_message("Vaccine COMIRN dose 1")
        assert msg == "Vaccine COMIRN dose 1"
