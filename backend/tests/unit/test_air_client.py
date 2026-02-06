"""Tests for AIR API client, confirmation, and batch submission services."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.exceptions import AIRApiError
from app.services.air_client import (
    AIRClient,
    BatchSubmissionService,
    ConfirmationService,
)


@pytest.fixture
def client() -> AIRClient:
    return AIRClient(access_token="test-token", correlation_id="urn:uuid:test-corr")


@pytest.fixture
def confirmation_service(client: AIRClient) -> ConfirmationService:
    return ConfirmationService(client)


@pytest.fixture
def batch_service(client: AIRClient) -> BatchSubmissionService:
    return BatchSubmissionService(client)


def _sample_payload() -> dict:
    return {
        "individual": {
            "personalDetails": {"dateOfBirth": "1990-01-15", "gender": "F"},
            "medicareCard": {"medicareCardNumber": "2123456701", "medicareIRN": "1"},
        },
        "encounters": [
            {
                "id": "1",
                "dateOfService": "2026-01-15",
                "episodes": [{"id": "1", "vaccineCode": "COMIRN", "vaccineDose": "1"}],
            }
        ],
        "informationProvider": {"providerNumber": "1234560V"},
    }


# ============================================================================
# AIRClient Header Tests
# ============================================================================

class TestAIRClientHeaders:
    """Test AIR API header construction."""

    def test_headers_include_authorization(self, client: AIRClient) -> None:
        headers = client._build_headers("15011990")
        assert headers["Authorization"] == "Bearer test-token"

    def test_headers_include_content_type(self, client: AIRClient) -> None:
        headers = client._build_headers("15011990")
        assert headers["Content-Type"] == "application/json"

    def test_headers_include_accept(self, client: AIRClient) -> None:
        headers = client._build_headers("15011990")
        assert headers["Accept"] == "application/json"

    def test_headers_include_message_id(self, client: AIRClient) -> None:
        headers = client._build_headers("15011990")
        assert headers["dhs-messageId"].startswith("urn:uuid:")

    def test_headers_include_correlation_id(self, client: AIRClient) -> None:
        headers = client._build_headers("15011990")
        assert headers["dhs-correlationId"] == "urn:uuid:test-corr"

    def test_headers_include_audit_id_type(self, client: AIRClient) -> None:
        headers = client._build_headers("15011990")
        assert headers["dhs-auditIdType"] == "Minor Id"

    def test_headers_include_subject_id(self, client: AIRClient) -> None:
        headers = client._build_headers("15011990")
        assert headers["dhs-subjectId"] == "15011990"

    def test_headers_include_subject_id_type(self, client: AIRClient) -> None:
        headers = client._build_headers("15011990")
        assert headers["dhs-subjectIdType"] == "Date of Birth"

    def test_unique_message_ids(self, client: AIRClient) -> None:
        h1 = client._build_headers("15011990")
        h2 = client._build_headers("15011990")
        assert h1["dhs-messageId"] != h2["dhs-messageId"]


class TestDOBConversion:
    """Test DOB format conversion for headers."""

    def test_yyyy_mm_dd_to_ddmmyyyy(self, client: AIRClient) -> None:
        assert client._dob_to_header_format("1990-01-15") == "15011990"

    def test_different_date(self, client: AIRClient) -> None:
        assert client._dob_to_header_format("2005-10-18") == "18102005"


# ============================================================================
# Response Parsing Tests
# ============================================================================

class TestResponseParsing:
    """Test AIR API response parsing."""

    def test_success_response(self, client: AIRClient) -> None:
        data = {"statusCode": "AIR-I-1007", "message": "All encounters recorded"}
        result = client._parse_response(data)
        assert result["status"] == "success"
        assert result["statusCode"] == "AIR-I-1007"

    def test_warning_w1004(self, client: AIRClient) -> None:
        data = {"statusCode": "AIR-W-1004", "message": "Individual not found"}
        result = client._parse_response(data)
        assert result["status"] == "warning"
        assert result["requiresConfirmation"] is True

    def test_warning_w1008(self, client: AIRClient) -> None:
        data = {"statusCode": "AIR-W-1008", "message": "Some encounters not recorded"}
        result = client._parse_response(data)
        assert result["status"] == "warning"
        assert result["requiresConfirmation"] is True

    def test_error_response(self, client: AIRClient) -> None:
        data = {"statusCode": "AIR-E-1005", "message": "Validation errors"}
        result = client._parse_response(data)
        assert result["status"] == "error"

    def test_claim_details_extracted(self, client: AIRClient) -> None:
        data = {
            "statusCode": "AIR-W-1004",
            "message": "Not found",
            "claimDetails": {"claimId": "WC297@+5", "claimSequenceNumber": "1"},
        }
        result = client._parse_response(data)
        assert result["claimId"] == "WC297@+5"
        assert result["claimSequenceNumber"] == "1"

    def test_raw_response_preserved(self, client: AIRClient) -> None:
        data = {"statusCode": "AIR-I-1007", "message": "OK", "extra": "field"}
        result = client._parse_response(data)
        assert result["rawResponse"] == data


# ============================================================================
# Confirmation Service Tests
# ============================================================================

class TestConfirmationService:
    """Test confirmation payload building."""

    def test_confirmation_includes_claim_id(self, confirmation_service: ConfirmationService) -> None:
        payload = confirmation_service.build_confirmation_payload(
            _sample_payload(), "WC297@+5"
        )
        assert payload["claimId"] == "WC297@+5"

    def test_confirmation_includes_accept_and_confirm(self, confirmation_service: ConfirmationService) -> None:
        payload = confirmation_service.build_confirmation_payload(
            _sample_payload(), "WC297@+5"
        )
        assert payload["encounters"][0]["acceptAndConfirm"] == "Y"

    def test_confirmation_preserves_individual(self, confirmation_service: ConfirmationService) -> None:
        original = _sample_payload()
        payload = confirmation_service.build_confirmation_payload(original, "WC297@+5")
        assert payload["individual"] == original["individual"]

    def test_confirmation_preserves_provider(self, confirmation_service: ConfirmationService) -> None:
        original = _sample_payload()
        payload = confirmation_service.build_confirmation_payload(original, "WC297@+5")
        assert payload["informationProvider"] == original["informationProvider"]

    def test_claim_sequence_number_included(self, confirmation_service: ConfirmationService) -> None:
        payload = confirmation_service.build_confirmation_payload(
            _sample_payload(), "WC297@+5", "1"
        )
        assert payload["claimSequenceNumber"] == "1"


# ============================================================================
# Batch Submission Tests
# ============================================================================

class TestBatchSubmission:
    """Test batch submission orchestration."""

    def _make_batch(self, idx: int = 0) -> dict:
        return {
            "batchIndex": idx,
            "encounterCount": 1,
            "sourceRows": [2],
            "encounters": [
                {
                    "id": "1",
                    "dateOfService": "2026-01-15",
                    "episodes": [{"id": "1", "vaccineCode": "COMIRN", "vaccineDose": "1"}],
                    "individual": {
                        "personalDetails": {"dateOfBirth": "1990-01-15", "gender": "F"},
                    },
                }
            ],
        }

    @pytest.mark.anyio
    async def test_submit_returns_results(self, batch_service: BatchSubmissionService) -> None:
        batch_service._client.record_encounter = AsyncMock(return_value={
            "statusCode": "AIR-I-1007",
            "status": "success",
            "message": "OK",
            "rawResponse": {},
            "encounterResults": [],
        })

        result = await batch_service.submit_batches(
            [self._make_batch()],
            {"providerNumber": "1234560V"},
        )

        assert result["totalBatches"] == 1
        assert result["completedBatches"] == 1
        assert result["status"] == "completed"

    @pytest.mark.anyio
    async def test_failed_batch_counted(self, batch_service: BatchSubmissionService) -> None:
        batch_service._client.record_encounter = AsyncMock(
            side_effect=AIRApiError("API Error")
        )

        result = await batch_service.submit_batches(
            [self._make_batch()],
            {"providerNumber": "1234560V"},
        )

        assert result["failed"] >= 1

    @pytest.mark.anyio
    async def test_multiple_batches_sequential(self, batch_service: BatchSubmissionService) -> None:
        call_count = 0

        async def mock_record(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            return {
                "statusCode": "AIR-I-1007",
                "status": "success",
                "message": "OK",
                "rawResponse": {},
                "encounterResults": [],
            }

        batch_service._client.record_encounter = mock_record

        batches = [self._make_batch(0), self._make_batch(1)]
        result = await batch_service.submit_batches(
            batches,
            {"providerNumber": "1234560V"},
        )

        assert call_count == 2
        assert result["completedBatches"] == 2

    def test_pause_sets_flag(self, batch_service: BatchSubmissionService) -> None:
        batch_service.pause()
        assert batch_service._paused is True

    def test_resume_clears_flag(self, batch_service: BatchSubmissionService) -> None:
        batch_service.pause()
        batch_service.resume()
        assert batch_service._paused is False
