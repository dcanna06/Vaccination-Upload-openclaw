"""Tests for AIR resubmit and confirm services (DEV-006)."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.air_resubmit import ResubmitService, ConfirmService


class TestResubmitService:
    """Tests for ResubmitService."""

    @pytest.fixture
    def mock_client(self):
        client = MagicMock()
        client.record_encounter = AsyncMock(return_value={
            "statusCode": "AIR-I-1007",
            "message": "All encounter(s) processed successfully.",
            "rawResponse": {
                "statusCode": "AIR-I-1007",
                "message": "All encounter(s) processed successfully.",
                "claimDetails": {
                    "claimId": "NEW123",
                    "encounters": [],
                },
            },
        })
        return client

    @pytest.mark.anyio
    async def test_resubmit_success(self, mock_client):
        service = ResubmitService(mock_client)
        result = await service.resubmit(
            individual={
                "firstName": "John",
                "lastName": "Smith",
                "dob": "01011990",
                "gender": "M",
                "medicare": "2950301611",
                "irn": "1",
            },
            encounter={
                "dateOfService": "01022026",
                "vaccineCode": "COVAST",
                "vaccineDose": "1",
                "vaccineBatch": "FL1234",
                "vaccineType": "NIP",
                "routeOfAdministration": "IM",
            },
            information_provider={"providerNumber": "2426621B"},
        )
        assert result["status"] == "SUCCESS"
        assert result["air_status_code"] == "AIR-I-1007"
        mock_client.record_encounter.assert_called_once()

    @pytest.mark.anyio
    async def test_resubmit_builds_correct_payload(self, mock_client):
        service = ResubmitService(mock_client)
        await service.resubmit(
            individual={"firstName": "Jane", "lastName": "Doe", "dob": "15031985", "gender": "F", "medicare": "1234567890", "irn": "2"},
            encounter={"dateOfService": "01022026", "vaccineCode": "INFLUVAC", "vaccineDose": "B"},
            information_provider={"providerNumber": "123456AB"},
        )
        call_args = mock_client.record_encounter.call_args
        payload = call_args[0][0]

        assert payload["individual"]["personalDetails"]["firstName"] == "Jane"
        assert payload["individual"]["personalDetails"]["gender"] == "F"
        assert payload["individual"]["medicareCard"]["medicareCardNumber"] == "1234567890"
        assert payload["encounters"][0]["episodes"][0]["vaccineCode"] == "INFLUVAC"
        assert payload["informationProvider"]["providerNumber"] == "123456AB"

    @pytest.mark.anyio
    async def test_resubmit_converts_dob_for_header(self, mock_client):
        """ddMMyyyy DOB should be converted to yyyy-MM-dd for client header."""
        service = ResubmitService(mock_client)
        await service.resubmit(
            individual={"firstName": "A", "lastName": "B", "dob": "15031985", "gender": "M"},
            encounter={"dateOfService": "01022026", "vaccineCode": "X", "vaccineDose": "1"},
            information_provider={},
        )
        call_args = mock_client.record_encounter.call_args
        dob_arg = call_args[0][1]  # Second positional arg is DOB
        assert dob_arg == "1985-03-15"

    @pytest.mark.anyio
    async def test_resubmit_no_medicare(self, mock_client):
        """Should not include medicareCard if no medicare number."""
        service = ResubmitService(mock_client)
        await service.resubmit(
            individual={"firstName": "A", "lastName": "B", "dob": "01011990", "gender": "M", "medicare": ""},
            encounter={"dateOfService": "01022026", "vaccineCode": "X", "vaccineDose": "1"},
            information_provider={},
        )
        payload = mock_client.record_encounter.call_args[0][0]
        assert "medicareCard" not in payload["individual"]

    @pytest.mark.anyio
    async def test_resubmit_error_response(self, mock_client):
        """Should return parsed error when AIR returns error."""
        mock_client.record_encounter = AsyncMock(return_value={
            "rawResponse": {
                "statusCode": "AIR-E-1005",
                "message": "Validation failed.",
                "errors": [
                    {"code": "AIR-E-1018", "field": "encounters.dateOfService", "message": "Date in future."},
                ],
            },
        })
        service = ResubmitService(mock_client)
        result = await service.resubmit(
            individual={"firstName": "A", "lastName": "B", "dob": "01011990", "gender": "M"},
            encounter={"dateOfService": "01012030", "vaccineCode": "X", "vaccineDose": "1"},
            information_provider={},
        )
        assert result["status"] == "ERROR"
        assert len(result["air_errors"]) == 1


class TestConfirmService:
    """Tests for ConfirmService."""

    @pytest.fixture
    def mock_client(self):
        client = MagicMock()
        client.record_encounter = AsyncMock(return_value={
            "rawResponse": {
                "statusCode": "AIR-I-1007",
                "message": "Confirmed successfully.",
                "claimDetails": {"claimId": "WB9X4I+$"},
            },
        })
        return client

    @pytest.mark.anyio
    async def test_confirm_success(self, mock_client):
        service = ConfirmService(mock_client)
        original_payload = {
            "individual": {
                "personalDetails": {"firstName": "John", "lastName": "Smith", "dateOfBirth": "01011990", "gender": "M"},
            },
            "encounters": [{"id": 1, "dateOfService": "01022026", "episodes": []}],
            "informationProvider": {"providerNumber": "2426621B"},
        }
        result = await service.confirm_record(
            original_payload=original_payload,
            claim_id="WB9X4I+$",
            claim_sequence_number="1",
            dob="1990-01-01",
        )
        assert result["status"] == "SUCCESS"
        mock_client.record_encounter.assert_called_once()

    @pytest.mark.anyio
    async def test_confirm_includes_claim_id(self, mock_client):
        """Confirmation payload should include claimId and acceptAndConfirm."""
        service = ConfirmService(mock_client)
        original_payload = {
            "individual": {"personalDetails": {"firstName": "A"}},
            "encounters": [{"id": 1, "dateOfService": "01022026", "episodes": []}],
            "informationProvider": {"providerNumber": "123"},
        }
        await service.confirm_record(
            original_payload=original_payload,
            claim_id="ABC123",
            claim_sequence_number=None,
            dob="1990-01-01",
        )
        call_args = mock_client.record_encounter.call_args
        payload = call_args[0][0]  # First positional arg
        assert payload["claimId"] == "ABC123"
        assert payload["encounters"][0]["acceptAndConfirm"] == "Y"
