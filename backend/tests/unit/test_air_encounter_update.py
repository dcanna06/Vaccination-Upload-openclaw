"""Tests for AIR Update Encounter API #9 (TECH.SIS.AIR.05)."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas.air_encounter_update import (
    UpdateEncounter,
    UpdateEncounterRequest,
    UpdateEpisode,
)
from app.services.air_encounter_update import AIREncounterUpdateClient


# ============================================================================
# Schema Tests
# ============================================================================

class TestUpdateEncounterSchemas:
    def test_valid_request(self):
        req = UpdateEncounterRequest(
            individualIdentifier="OPAQUE-ID-123",
            encounters=[
                UpdateEncounter(
                    id="1",
                    dateOfService="2026-01-15",
                    episodes=[
                        UpdateEpisode(id="1", vaccineCode="COMIRN", vaccineDose="3")
                    ],
                )
            ],
            informationProvider={"providerNumber": "1234567A"},
        )
        assert req.individualIdentifier == "OPAQUE-ID-123"
        assert len(req.encounters) == 1

    def test_episode_with_optional_fields(self):
        ep = UpdateEpisode(
            id="1",
            vaccineCode="COMIRN",
            vaccineDose="3",
            vaccineBatch="FL1234",
            vaccineType="NIP",
            routeOfAdministration="IM",
        )
        assert ep.vaccineBatch == "FL1234"
        assert ep.vaccineType == "NIP"

    def test_invalid_identifier_too_long(self):
        with pytest.raises(Exception):
            UpdateEncounterRequest(
                individualIdentifier="X" * 129,
                encounters=[
                    UpdateEncounter(
                        id="1",
                        dateOfService="2026-01-15",
                        episodes=[UpdateEpisode(id="1", vaccineCode="X", vaccineDose="1")],
                    )
                ],
                informationProvider={"providerNumber": "1234567A"},
            )

    def test_encounters_required(self):
        with pytest.raises(Exception):
            UpdateEncounterRequest(
                individualIdentifier="ID",
                encounters=[],
                informationProvider={"providerNumber": "1234567A"},
            )


# ============================================================================
# Client Tests
# ============================================================================

class TestAIREncounterUpdateClient:
    def test_headers_include_audit_id(self):
        client = AIREncounterUpdateClient("test-token", "LOC-MINOR-001")
        headers = client._build_headers()
        assert headers["dhs-auditId"] == "LOC-MINOR-001"
        assert headers["Authorization"] == "Bearer test-token"

    def test_dob_conversion(self):
        assert AIREncounterUpdateClient._dob_to_header_format("1990-01-15") == "15011990"

    @pytest.mark.anyio
    async def test_update_encounter_success(self):
        client = AIREncounterUpdateClient("test-token", "LOC-001")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "statusCode": "AIR-I-1007",
            "message": "Encounters updated successfully",
            "encounterResults": [{"encounterId": "1", "statusCode": "AIR-I-1000"}],
        }

        with patch("app.services.air_encounter_update.httpx.AsyncClient") as MockClient:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mock_client

            result = await client.update_encounter(
                individual_identifier="OPAQUE-ID-123",
                encounters=[{
                    "id": "1",
                    "dateOfService": "2026-01-15",
                    "episodes": [{"id": "1", "vaccineCode": "COMIRN", "vaccineDose": "3"}],
                }],
                information_provider={"providerNumber": "1234567A"},
            )

            assert result["status"] == "success"
            assert result["statusCode"] == "AIR-I-1007"

    @pytest.mark.anyio
    async def test_update_encounter_invalid_identifier(self):
        client = AIREncounterUpdateClient("test-token", "LOC-001")

        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.headers = {"content-type": "application/json"}
        mock_response.json.return_value = {
            "statusCode": "AIR-E-1061",
            "message": "Invalid individual identifier",
        }

        with patch("app.services.air_encounter_update.httpx.AsyncClient") as MockClient:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mock_client

            result = await client.update_encounter(
                individual_identifier="EXPIRED-ID",
                encounters=[{
                    "id": "1",
                    "dateOfService": "2026-01-15",
                    "episodes": [{"id": "1", "vaccineCode": "X", "vaccineDose": "1"}],
                }],
                information_provider={"providerNumber": "1234567A"},
            )

            assert result["status"] == "error"
            assert result["statusCode"] == "AIR-E-1061"

    @pytest.mark.anyio
    async def test_update_encounter_warning(self):
        client = AIREncounterUpdateClient("test-token", "LOC-001")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "statusCode": "AIR-W-1008",
            "message": "Some encounters not updated",
            "encounterResults": [],
        }

        with patch("app.services.air_encounter_update.httpx.AsyncClient") as MockClient:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mock_client

            result = await client.update_encounter(
                individual_identifier="ID-123",
                encounters=[],
                information_provider={"providerNumber": "1234567A"},
            )

            assert result["status"] == "warning"


# ============================================================================
# Router Tests
# ============================================================================

class TestEncountersUpdateRouter:
    @pytest.fixture
    def client(self):
        from app.main import create_app
        from fastapi.testclient import TestClient

        app = create_app()
        return TestClient(app)

    def test_update_endpoint_exists(self, client):
        """POST /api/encounters/update returns 422 for empty body."""
        response = client.post("/api/encounters/update", json={})
        assert response.status_code == 422
