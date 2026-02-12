"""Tests for AIR Indicator, Indigenous Status, and Catch-Up APIs — APIs #12-#15."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas.air_indicators import (
    AddVaccineIndicatorRequest,
    RemoveVaccineIndicatorRequest,
    UpdateIndigenousStatusRequest,
    IndicatorInformationProvider,
)
from app.schemas.air_catchup import PlannedCatchUpRequest, CatchUpInformationProvider
from app.services.air_indicators import AIRIndicatorsClient


class TestIndicatorSchemas:
    def test_add_indicator_request(self):
        req = AddVaccineIndicatorRequest(
            individualIdentifier="ID-123",
            vaccineIndicatorCode="FLU",
            informationProvider=IndicatorInformationProvider(providerNumber="1234567A"),
        )
        assert req.vaccineIndicatorCode == "FLU"

    def test_remove_indicator_request(self):
        req = RemoveVaccineIndicatorRequest(
            individualIdentifier="ID-123",
            vaccineIndicatorCode="FLU",
            informationProvider=IndicatorInformationProvider(providerNumber="1234567A"),
        )
        assert req.vaccineIndicatorCode == "FLU"

    def test_indigenous_status_request(self):
        req = UpdateIndigenousStatusRequest(
            individualIdentifier="ID-123",
            indigenousStatus="Y",
            informationProvider=IndicatorInformationProvider(providerNumber="1234567A"),
        )
        assert req.indigenousStatus == "Y"

    def test_indigenous_status_invalid(self):
        with pytest.raises(Exception):
            UpdateIndigenousStatusRequest(
                individualIdentifier="ID-123",
                indigenousStatus="X",
                informationProvider=IndicatorInformationProvider(providerNumber="1234567A"),
            )

    def test_catchup_request(self):
        req = PlannedCatchUpRequest(
            medicareCardNumber="2123456789",
            medicareIRN="1",
            dateOfBirth="2020-05-15",
            gender="M",
            plannedCatchUpDate="2026-06-01",
            informationProvider=CatchUpInformationProvider(providerNumber="1234567A"),
        )
        assert req.plannedCatchUpDate == "2026-06-01"


class TestAIRIndicatorsClient:
    def test_headers(self):
        client = AIRIndicatorsClient("token", "MINOR-001")
        headers = client._build_headers()
        assert headers["dhs-auditId"] == "MINOR-001"

    def test_dob_conversion(self):
        assert AIRIndicatorsClient._dob_to_header_format("2020-05-15") == "15052020"

    @pytest.mark.anyio
    async def test_add_indicator_success(self):
        client = AIRIndicatorsClient("token", "LOC-001")
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"statusCode": "AIR-I-1001", "message": "Added"}
        with patch("app.services.air_indicators.httpx.AsyncClient") as MockClient:
            mc = AsyncMock()
            mc.post.return_value = mock_response
            mc.__aenter__ = AsyncMock(return_value=mc)
            mc.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mc

            result = await client.add_vaccine_indicator("ID", "FLU", {"providerNumber": "1234567A"})
            assert result["status"] == "success"

    @pytest.mark.anyio
    async def test_remove_indicator_success(self):
        client = AIRIndicatorsClient("token", "LOC-001")
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"statusCode": "AIR-I-1001", "message": "Removed"}
        with patch("app.services.air_indicators.httpx.AsyncClient") as MockClient:
            mc = AsyncMock()
            mc.post.return_value = mock_response
            mc.__aenter__ = AsyncMock(return_value=mc)
            mc.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mc

            result = await client.remove_vaccine_indicator("ID", "FLU", {"providerNumber": "1234567A"})
            assert result["status"] == "success"

    @pytest.mark.anyio
    async def test_update_indigenous_status(self):
        client = AIRIndicatorsClient("token", "LOC-001")
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"statusCode": "AIR-I-1001", "message": "Updated"}
        with patch("app.services.air_indicators.httpx.AsyncClient") as MockClient:
            mc = AsyncMock()
            mc.post.return_value = mock_response
            mc.__aenter__ = AsyncMock(return_value=mc)
            mc.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mc

            result = await client.update_indigenous_status("ID", "Y", {"providerNumber": "1234567A"})
            assert result["status"] == "success"

    @pytest.mark.anyio
    async def test_catchup_date(self):
        client = AIRIndicatorsClient("token", "LOC-001")
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"statusCode": "AIR-I-1001", "message": "Set"}
        with patch("app.services.air_indicators.httpx.AsyncClient") as MockClient:
            mc = AsyncMock()
            mc.post.return_value = mock_response
            mc.__aenter__ = AsyncMock(return_value=mc)
            mc.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mc

            result = await client.planned_catch_up_date(
                "2123456789", "1", "2020-05-15", "M", "2026-06-01",
                {"providerNumber": "1234567A"},
            )
            assert result["status"] == "success"


class TestIndicatorsRouter:
    @pytest.fixture
    def client(self):
        from app.main import create_app
        from app.dependencies import get_current_user
        from fastapi.testclient import TestClient

        app = create_app()

        mock_user = MagicMock()
        mock_user.id = 1
        mock_user.role = "admin"
        mock_user.status = "active"

        async def mock_auth():
            return mock_user

        app.dependency_overrides[get_current_user] = mock_auth
        return TestClient(app)

    def test_add_indicator_endpoint(self, client):
        resp = client.post("/api/indicators/vaccine/add", json={})
        assert resp.status_code == 422

    def test_remove_indicator_endpoint(self, client):
        resp = client.post("/api/indicators/vaccine/remove", json={})
        assert resp.status_code == 422

    def test_indigenous_status_endpoint(self, client):
        resp = client.post("/api/indicators/indigenous-status", json={})
        assert resp.status_code == 422

    def test_catchup_endpoint(self, client):
        resp = client.post("/api/indicators/catchup", json={})
        assert resp.status_code == 422
