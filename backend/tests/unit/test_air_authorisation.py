"""Tests for AIR Authorisation Access List API client and providers router."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.services.air_authorisation import AIRAuthorisationClient
from app.schemas.provider import ProviderLinkRequest, ProviderRead, HW027StatusUpdate


# ============================================================================
# Schema Tests
# ============================================================================

class TestProviderSchemas:
    def test_link_request_valid(self):
        req = ProviderLinkRequest(location_id=1, provider_number="1234567A")
        assert req.provider_number == "1234567A"
        assert req.provider_type == ""

    def test_link_request_empty_provider_rejected(self):
        with pytest.raises(Exception):
            ProviderLinkRequest(location_id=1, provider_number="")

    def test_hw027_status_valid(self):
        upd = HW027StatusUpdate(hw027_status="submitted")
        assert upd.hw027_status == "submitted"

    def test_hw027_status_invalid(self):
        with pytest.raises(Exception):
            HW027StatusUpdate(hw027_status="bogus")

    def test_provider_read_from_attributes(self):
        mock = MagicMock()
        mock.id = 1
        mock.location_id = 1
        mock.provider_number = "1234567A"
        mock.provider_type = "GP"
        mock.minor_id = "WRR00001"
        mock.hw027_status = "not_submitted"
        mock.air_access_list = None
        mock.created_at = "2026-01-01T00:00:00+00:00"
        mock.updated_at = "2026-01-01T00:00:00+00:00"

        read = ProviderRead.model_validate(mock, from_attributes=True)
        assert read.provider_number == "1234567A"
        assert read.minor_id == "WRR00001"


# ============================================================================
# AIRAuthorisationClient Tests
# ============================================================================

class TestAIRAuthorisationClient:
    def test_headers_include_audit_id(self):
        client = AIRAuthorisationClient(
            access_token="test-token",
            minor_id="LOC-MINOR-001",
        )
        headers = client._build_headers()
        assert headers["dhs-auditId"] == "LOC-MINOR-001"
        assert headers["dhs-auditIdType"] == "Minor Id"
        assert headers["Authorization"] == "Bearer test-token"

    @pytest.mark.anyio
    async def test_get_access_list_success(self):
        client = AIRAuthorisationClient("test-token", "LOC-001")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "statusCode": "AIR-I-1007",
            "accessList": [{"providerNumber": "1234567A", "authorised": True}],
        }

        with patch("app.services.air_authorisation.httpx.AsyncClient") as MockClient:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mock_client

            result = await client.get_access_list("1234567A")
            assert result["status"] == "success"
            assert "accessList" in result

    @pytest.mark.anyio
    async def test_get_access_list_e1039(self):
        client = AIRAuthorisationClient("test-token", "LOC-001")

        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.headers = {"content-type": "application/json"}
        mock_response.json.return_value = {
            "statusCode": "AIR-E-1039",
            "message": "Not associated",
        }

        with patch("app.services.air_authorisation.httpx.AsyncClient") as MockClient:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mock_client

            result = await client.get_access_list("9999999Z")
            assert result["status"] == "error"
            assert result["errorCode"] == "AIR-E-1039"

    @pytest.mark.anyio
    async def test_get_access_list_e1063(self):
        client = AIRAuthorisationClient("test-token", "LOC-001")

        mock_response = MagicMock()
        mock_response.status_code = 403
        mock_response.headers = {"content-type": "application/json"}
        mock_response.json.return_value = {
            "statusCode": "AIR-E-1063",
            "message": "Not authorised",
        }

        with patch("app.services.air_authorisation.httpx.AsyncClient") as MockClient:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mock_client

            result = await client.get_access_list("1111111B")
            assert result["status"] == "error"
            assert result["errorCode"] == "AIR-E-1063"


# ============================================================================
# Providers Router Tests
# ============================================================================

class TestProvidersRouter:
    @pytest.fixture
    def client(self):
        from app.main import create_app
        from app.database import get_db
        from app.dependencies import get_current_user

        app = create_app()

        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = []
        mock_result.scalars.return_value = mock_scalars
        mock_session.execute.return_value = mock_result

        async def mock_db():
            yield mock_session

        mock_user = MagicMock()
        mock_user.id = 1
        mock_user.role = "admin"
        mock_user.status = "active"

        async def mock_auth():
            return mock_user

        app.dependency_overrides[get_db] = mock_db
        app.dependency_overrides[get_current_user] = mock_auth
        return TestClient(app)

    def test_list_providers_endpoint_exists(self, client):
        """GET /api/providers returns 200."""
        response = client.get("/api/providers")
        assert response.status_code == 200
