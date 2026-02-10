"""Tests for AIR Individual Management APIs (TECH.SIS.AIR.05).

Covers:
- Schema validation for all request/response models
- AIRIndividualClient methods with mocked HTTP + Redis
- Router endpoint integration tests
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas.air_individual import (
    HistoryDetailsRequest,
    HistoryStatementRequest,
    IdentifyIndividualRequest,
    InformationProvider,
    MedicareCard,
    PersonalDetails,
    VaccineTrialHistoryRequest,
)
from app.services.air_individual import (
    AIRIndividualClient,
    INDIVIDUAL_CACHE_TTL,
    _build_cache_key,
)


# ============================================================================
# Schema Tests
# ============================================================================

class TestIdentifyIndividualSchemas:
    def test_request_with_medicare(self):
        req = IdentifyIndividualRequest(
            personalDetails=PersonalDetails(dateOfBirth="1990-01-15", gender="F"),
            medicareCard=MedicareCard(medicareCardNumber="2123456789", medicareIRN="1"),
            informationProvider=InformationProvider(providerNumber="1234567A"),
        )
        assert req.personalDetails.dateOfBirth == "1990-01-15"
        assert req.medicareCard.medicareCardNumber == "2123456789"

    def test_request_with_ihi(self):
        req = IdentifyIndividualRequest(
            personalDetails=PersonalDetails(dateOfBirth="1990-01-15", gender="M"),
            ihiNumber="8003608833357361",
            informationProvider=InformationProvider(providerNumber="1234567A"),
        )
        assert req.ihiNumber == "8003608833357361"

    def test_request_with_demographics(self):
        req = IdentifyIndividualRequest(
            personalDetails=PersonalDetails(
                dateOfBirth="1990-01-15", gender="F",
                firstName="Jane", lastName="Smith",
            ),
            postCode="2000",
            informationProvider=InformationProvider(providerNumber="1234567A"),
        )
        assert req.personalDetails.firstName == "Jane"
        assert req.postCode == "2000"

    def test_invalid_dob_rejected(self):
        with pytest.raises(Exception):
            IdentifyIndividualRequest(
                personalDetails=PersonalDetails(dateOfBirth="15-01-1990", gender="F"),
                informationProvider=InformationProvider(providerNumber="1234567A"),
            )

    def test_invalid_ihi_rejected(self):
        with pytest.raises(Exception):
            IdentifyIndividualRequest(
                personalDetails=PersonalDetails(dateOfBirth="1990-01-15", gender="F"),
                ihiNumber="123",  # too short
                informationProvider=InformationProvider(providerNumber="1234567A"),
            )


class TestHistoryDetailsSchemas:
    def test_valid_request(self):
        req = HistoryDetailsRequest(
            individualIdentifier="ABC123XYZ",
            informationProvider=InformationProvider(providerNumber="1234567A"),
        )
        assert req.individualIdentifier == "ABC123XYZ"

    def test_identifier_too_long_rejected(self):
        with pytest.raises(Exception):
            HistoryDetailsRequest(
                individualIdentifier="X" * 129,  # max 128
                informationProvider=InformationProvider(providerNumber="1234567A"),
            )


class TestHistoryStatementSchemas:
    def test_valid_request(self):
        req = HistoryStatementRequest(
            individualIdentifier="ABC123",
            informationProvider=InformationProvider(providerNumber="1234567A"),
        )
        assert req.individualIdentifier == "ABC123"


class TestVaccineTrialHistorySchemas:
    def test_valid_request(self):
        req = VaccineTrialHistoryRequest(
            individualIdentifier="TRIAL-ID-001",
            informationProvider=InformationProvider(providerNumber="1234567A"),
        )
        assert req.individualIdentifier == "TRIAL-ID-001"


# ============================================================================
# Cache Key Tests
# ============================================================================

class TestCacheKey:
    def test_deterministic(self):
        data = {"personalDetails": {"dateOfBirth": "1990-01-15"}}
        key1 = _build_cache_key(data)
        key2 = _build_cache_key(data)
        assert key1 == key2

    def test_different_data_different_key(self):
        data1 = {"personalDetails": {"dateOfBirth": "1990-01-15"}}
        data2 = {"personalDetails": {"dateOfBirth": "1991-02-20"}}
        assert _build_cache_key(data1) != _build_cache_key(data2)

    def test_prefix(self):
        key = _build_cache_key({"test": True})
        assert key.startswith("air:individual:")


# ============================================================================
# AIRIndividualClient Tests
# ============================================================================

class TestAIRIndividualClient:
    def test_headers_include_audit_id(self):
        client = AIRIndividualClient("test-token", "LOC-MINOR-001")
        headers = client._build_headers()
        assert headers["dhs-auditId"] == "LOC-MINOR-001"
        assert headers["dhs-auditIdType"] == "Minor Id"
        assert headers["Authorization"] == "Bearer test-token"

    def test_headers_include_subject_dob(self):
        client = AIRIndividualClient("test-token", "LOC-001")
        headers = client._build_headers(subject_dob="15011990")
        assert headers["dhs-subjectId"] == "15011990"
        assert headers["dhs-subjectIdType"] == "Date of Birth"

    def test_headers_omit_subject_when_none(self):
        client = AIRIndividualClient("test-token", "LOC-001")
        headers = client._build_headers()
        assert "dhs-subjectId" not in headers

    def test_dob_conversion(self):
        assert AIRIndividualClient._dob_to_header_format("1990-01-15") == "15011990"
        assert AIRIndividualClient._dob_to_header_format("2005-10-18") == "18102005"

    @pytest.mark.anyio
    async def test_identify_individual_success(self):
        client = AIRIndividualClient("test-token", "LOC-001")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "statusCode": "AIR-I-1100",
            "message": "Your request was successfully processed.",
            "individualDetails": {
                "individualIdentifier": "OPAQUE-ID-12345",
                "individual": {
                    "personalDetails": {
                        "dateOfBirth": "15011990",
                        "gender": "F",
                        "firstName": "Jane",
                        "lastName": "Smith",
                    }
                },
            },
        }

        with patch("app.services.air_individual.httpx.AsyncClient") as MockClient:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mock_client

            result = await client.identify_individual({
                "personalDetails": {"dateOfBirth": "1990-01-15", "gender": "F"},
                "medicareCard": {"medicareCardNumber": "2123456789", "medicareIRN": "1"},
                "informationProvider": {"providerNumber": "1234567A"},
            })

            assert result["status"] == "success"
            assert result["individualIdentifier"] == "OPAQUE-ID-12345"
            assert result["statusCode"] == "AIR-I-1100"

    @pytest.mark.anyio
    async def test_identify_individual_not_found(self):
        client = AIRIndividualClient("test-token", "LOC-001")

        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.headers = {"content-type": "application/json"}
        mock_response.json.return_value = {
            "statusCode": "AIR-E-1026",
            "message": "Insufficient individual identification information",
        }

        with patch("app.services.air_individual.httpx.AsyncClient") as MockClient:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mock_client

            result = await client.identify_individual({
                "personalDetails": {"dateOfBirth": "1990-01-15"},
                "informationProvider": {"providerNumber": "1234567A"},
            })

            assert result["status"] == "error"
            assert result["statusCode"] == "AIR-E-1026"

    @pytest.mark.anyio
    async def test_identify_individual_with_redis_cache(self):
        mock_redis = AsyncMock()
        mock_redis.get.return_value = json.dumps({
            "status": "success",
            "statusCode": "AIR-I-1100",
            "individualIdentifier": "CACHED-ID",
        })

        client = AIRIndividualClient("test-token", "LOC-001", redis=mock_redis)

        result = await client.identify_individual({
            "personalDetails": {"dateOfBirth": "1990-01-15", "gender": "F"},
            "informationProvider": {"providerNumber": "1234567A"},
        })

        assert result["status"] == "success"
        assert result["individualIdentifier"] == "CACHED-ID"
        mock_redis.get.assert_called_once()

    @pytest.mark.anyio
    async def test_identify_individual_caches_result(self):
        mock_redis = AsyncMock()
        mock_redis.get.return_value = None  # cache miss

        client = AIRIndividualClient("test-token", "LOC-001", redis=mock_redis)

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "statusCode": "AIR-I-1100",
            "message": "Your request was successfully processed.",
            "individualDetails": {
                "individualIdentifier": "NEW-ID-999",
                "individual": {"personalDetails": {"dateOfBirth": "15011990"}},
            },
        }

        with patch("app.services.air_individual.httpx.AsyncClient") as MockClient:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mock_client

            result = await client.identify_individual({
                "personalDetails": {"dateOfBirth": "1990-01-15", "gender": "F"},
                "informationProvider": {"providerNumber": "1234567A"},
            })

            assert result["individualIdentifier"] == "NEW-ID-999"
            mock_redis.setex.assert_called_once()
            call_args = mock_redis.setex.call_args
            assert call_args[0][1] == INDIVIDUAL_CACHE_TTL

    @pytest.mark.anyio
    async def test_get_history_details_success(self):
        client = AIRIndividualClient("test-token", "LOC-001")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "statusCode": "AIR-I-1001",
            "message": "History details retrieved",
            "vaccineDueDetails": [
                {"antigenCode": "PERT", "dueDate": "2026-06-01", "doseNumber": "5"}
            ],
            "immunisationHistory": [
                {
                    "dateOfService": "2025-12-01",
                    "vaccineCode": "COMIRN",
                    "vaccineDose": "3",
                    "editable": True,
                }
            ],
        }

        with patch("app.services.air_individual.httpx.AsyncClient") as MockClient:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mock_client

            result = await client.get_history_details(
                "OPAQUE-ID-123",
                {"providerNumber": "1234567A"},
                subject_dob="1990-01-15",
            )

            assert result["status"] == "success"
            assert len(result["vaccineDueDetails"]) == 1
            assert len(result["immunisationHistory"]) == 1

    @pytest.mark.anyio
    async def test_get_history_statement_success(self):
        client = AIRIndividualClient("test-token", "LOC-001")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "statusCode": "AIR-I-1001",
            "message": "Statement retrieved",
        }

        with patch("app.services.air_individual.httpx.AsyncClient") as MockClient:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mock_client

            result = await client.get_history_statement(
                "OPAQUE-ID-123",
                {"providerNumber": "1234567A"},
            )

            assert result["status"] == "success"
            assert result["statementData"] is not None

    @pytest.mark.anyio
    async def test_get_vaccine_trial_history_success(self):
        client = AIRIndividualClient("test-token", "LOC-001")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "statusCode": "AIR-I-1001",
            "message": "Trial history retrieved",
            "trialHistory": [
                {
                    "trialName": "COVID Phase 3",
                    "vaccineCode": "COMIRN",
                    "doseNumber": "1",
                }
            ],
        }

        with patch("app.services.air_individual.httpx.AsyncClient") as MockClient:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mock_client

            result = await client.get_vaccine_trial_history(
                "OPAQUE-ID-123",
                {"providerNumber": "1234567A"},
            )

            assert result["status"] == "success"
            assert len(result["trialHistory"]) == 1

    @pytest.mark.anyio
    async def test_error_e1061_invalid_identifier(self):
        client = AIRIndividualClient("test-token", "LOC-001")

        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.headers = {"content-type": "application/json"}
        mock_response.json.return_value = {
            "statusCode": "AIR-E-1061",
            "message": "Invalid individual identifier",
        }

        with patch("app.services.air_individual.httpx.AsyncClient") as MockClient:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mock_client

            result = await client.get_history_details(
                "EXPIRED-ID",
                {"providerNumber": "1234567A"},
            )

            assert result["status"] == "error"
            assert result["statusCode"] == "AIR-E-1061"


# ============================================================================
# Router Tests
# ============================================================================

class TestIndividualsRouter:
    @pytest.fixture
    def client(self):
        from app.main import create_app
        from fastapi.testclient import TestClient

        app = create_app()
        return TestClient(app)

    def test_identify_endpoint_exists(self, client):
        """POST /api/individuals/identify returns 422 for empty body (not 404)."""
        response = client.post("/api/individuals/identify", json={})
        assert response.status_code == 422

    def test_history_details_endpoint_exists(self, client):
        response = client.post("/api/individuals/history/details", json={})
        assert response.status_code == 422

    def test_history_statement_endpoint_exists(self, client):
        response = client.post("/api/individuals/history/statement", json={})
        assert response.status_code == 422

    def test_vaccine_trial_endpoint_exists(self, client):
        response = client.post("/api/individuals/vaccinetrial/history", json={})
        assert response.status_code == 422
