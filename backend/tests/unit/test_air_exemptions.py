"""Tests for AIR Exemption APIs (TECH.SIS.AIR.06) — APIs #5, #6, #10, #11."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas.air_exemptions import (
    GetContraindicationHistoryRequest,
    GetNaturalImmunityHistoryRequest,
    RecordContraindicationRequest,
    RecordNaturalImmunityRequest,
    ExemptionInformationProvider,
)
from app.services.air_exemptions import AIRExemptionsClient


class TestExemptionSchemas:
    def test_contraindication_history_request(self):
        req = GetContraindicationHistoryRequest(
            individualIdentifier="ID-123",
            informationProvider=ExemptionInformationProvider(providerNumber="1234567A"),
        )
        assert req.individualIdentifier == "ID-123"

    def test_natural_immunity_history_request(self):
        req = GetNaturalImmunityHistoryRequest(
            individualIdentifier="ID-456",
            informationProvider=ExemptionInformationProvider(providerNumber="1234567A"),
        )
        assert req.individualIdentifier == "ID-456"

    def test_record_contraindication_request(self):
        req = RecordContraindicationRequest(
            individualIdentifier="ID-789",
            antigenCode="PERT",
            contraindicationCode="C001",
            startDate="2026-01-15",
            informationProvider=ExemptionInformationProvider(providerNumber="1234567A"),
        )
        assert req.startDate == "2026-01-15"

    def test_record_natural_immunity_request(self):
        req = RecordNaturalImmunityRequest(
            individualIdentifier="ID-012",
            diseaseCode="VZV",
            evidenceDate="2025-12-01",
            informationProvider=ExemptionInformationProvider(providerNumber="1234567A"),
        )
        assert req.diseaseCode == "VZV"


class TestAIRExemptionsClient:
    def test_headers(self):
        client = AIRExemptionsClient("token", "MINOR-001")
        headers = client._build_headers()
        assert headers["dhs-auditId"] == "MINOR-001"

    @pytest.mark.anyio
    async def test_get_contraindication_history_success(self):
        client = AIRExemptionsClient("token", "LOC-001")
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "statusCode": "AIR-I-1001",
            "message": "History retrieved",
            "contraindicationHistory": [{"antigenCode": "PERT"}],
        }
        with patch("app.services.air_exemptions.httpx.AsyncClient") as MockClient:
            mc = AsyncMock()
            mc.post.return_value = mock_response
            mc.__aenter__ = AsyncMock(return_value=mc)
            mc.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mc

            result = await client.get_contraindication_history("ID", {"providerNumber": "1234567A"})
            assert result["status"] == "success"
            assert len(result["contraindicationHistory"]) == 1

    @pytest.mark.anyio
    async def test_get_natural_immunity_history_success(self):
        client = AIRExemptionsClient("token", "LOC-001")
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "statusCode": "AIR-I-1001",
            "message": "OK",
            "naturalImmunityHistory": [],
        }
        with patch("app.services.air_exemptions.httpx.AsyncClient") as MockClient:
            mc = AsyncMock()
            mc.post.return_value = mock_response
            mc.__aenter__ = AsyncMock(return_value=mc)
            mc.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mc

            result = await client.get_natural_immunity_history("ID", {"providerNumber": "1234567A"})
            assert result["status"] == "success"

    @pytest.mark.anyio
    async def test_record_contraindication_success(self):
        client = AIRExemptionsClient("token", "LOC-001")
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"statusCode": "AIR-I-1001", "message": "Recorded"}
        with patch("app.services.air_exemptions.httpx.AsyncClient") as MockClient:
            mc = AsyncMock()
            mc.post.return_value = mock_response
            mc.__aenter__ = AsyncMock(return_value=mc)
            mc.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mc

            result = await client.record_contraindication(
                "ID", "PERT", "C001", "2026-01-15", {"providerNumber": "1234567A"},
            )
            assert result["status"] == "success"

    @pytest.mark.anyio
    async def test_record_natural_immunity_success(self):
        client = AIRExemptionsClient("token", "LOC-001")
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"statusCode": "AIR-I-1001", "message": "Recorded"}
        with patch("app.services.air_exemptions.httpx.AsyncClient") as MockClient:
            mc = AsyncMock()
            mc.post.return_value = mock_response
            mc.__aenter__ = AsyncMock(return_value=mc)
            mc.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mc

            result = await client.record_natural_immunity(
                "ID", "VZV", "2025-12-01", {"providerNumber": "1234567A"},
            )
            assert result["status"] == "success"


class TestExemptionsRouter:
    @pytest.fixture
    def client(self):
        from app.main import create_app
        from fastapi.testclient import TestClient
        return TestClient(create_app())

    def test_contraindication_history_endpoint_exists(self, client):
        resp = client.post("/api/exemptions/contraindication/history", json={})
        assert resp.status_code == 422

    def test_natural_immunity_history_endpoint_exists(self, client):
        resp = client.post("/api/exemptions/naturalimmunity/history", json={})
        assert resp.status_code == 422

    def test_record_contraindication_endpoint_exists(self, client):
        resp = client.post("/api/exemptions/contraindication/record", json={})
        assert resp.status_code == 422

    def test_record_natural_immunity_endpoint_exists(self, client):
        resp = client.post("/api/exemptions/naturalimmunity/record", json={})
        assert resp.status_code == 422
