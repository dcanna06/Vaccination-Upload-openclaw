"""Tests for submission results API endpoints (DEV-001)."""

import json
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def mock_submission_data():
    """Sample submission metadata as stored on disk."""
    return {
        "status": "completed",
        "createdAt": "2026-02-09T10:00:00+00:00",
        "completedAt": "2026-02-09T10:05:00+00:00",
        "environment": "VENDOR_TEST",
        "batches": [],
        "dryRun": False,
        "progress": {
            "totalBatches": 2,
            "completedBatches": 2,
            "successfulRecords": 1,
            "failedRecords": 1,
            "pendingConfirmation": 0,
            "currentBatch": 2,
            "status": "completed",
        },
        "results": {
            "status": "completed",
            "completedBatches": 2,
            "successful": 1,
            "failed": 1,
            "pendingConfirmation": 0,
            "results": [
                {
                    "status": "success",
                    "statusCode": "AIR-I-1007",
                    "message": "All encounter(s) processed successfully.",
                    "sourceRows": [1],
                    "rawResponse": {
                        "statusCode": "AIR-I-1007",
                        "message": "All encounter(s) processed successfully.",
                        "claimDetails": {
                            "claimId": "WB9X4I+$",
                            "claimSequenceNumber": "1",
                            "encounters": [{
                                "id": "1",
                                "information": {"status": "SUCCESS", "code": "AIR-I-1000", "text": "Encounter accepted."},
                                "episodes": [{
                                    "id": "1",
                                    "information": {"status": "VALID", "code": "AIR-I-1002", "text": "Valid."},
                                }],
                            }],
                        },
                    },
                },
                {
                    "status": "error",
                    "statusCode": "AIR-E-1005",
                    "message": "Validation failed.",
                    "sourceRows": [2],
                    "rawResponse": {
                        "statusCode": "AIR-E-1005",
                        "message": "Validation failed.",
                        "errors": [
                            {"code": "AIR-E-1018", "field": "encounters.dateOfService", "message": "Date in future."},
                        ],
                    },
                },
            ],
        },
    }


@pytest.fixture
def mock_request_payload():
    """Sample request payload as stored on disk."""
    return {
        "individual": {
            "personalDetails": {
                "firstName": "John",
                "lastName": "Smith",
                "dateOfBirth": "01011990",
                "gender": "M",
            },
            "medicareCard": {
                "medicareCardNumber": "2950301611",
                "medicareIRN": "1",
            },
        },
        "encounters": [{
            "id": 1,
            "dateOfService": "01022026",
            "episodes": [{
                "id": 1,
                "vaccineCode": "COVAST",
                "vaccineDose": "1",
                "vaccineBatch": "BATCH001",
                "vaccineType": "NIP",
                "routeOfAdministration": "IM",
            }],
        }],
        "informationProvider": {"providerNumber": "2426621B"},
    }


@pytest.mark.anyio
async def test_get_results_not_found(client):
    """Should return 404 for non-existent submission."""
    response = await client.get("/api/submissions/nonexistent-id/results")
    assert response.status_code == 404


@pytest.mark.anyio
async def test_get_results_success(client, mock_submission_data, mock_request_payload):
    """Should return detailed results for a valid submission."""
    with patch("app.routers.submission_results._store") as mock_store:
        mock_store.load_metadata.return_value = mock_submission_data
        mock_store._base = Path("/tmp/test")

        # Mock payload loading to return None (use rawResponse fallback)
        with patch("app.routers.submission_results._load_payload", return_value=None):
            response = await client.get("/api/submissions/test-id/results")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "test-id"
    assert data["completedAt"] == "2026-02-09T10:05:00+00:00"
    assert data["counts"]["total"] == 2
    assert data["counts"]["success"] == 1
    assert data["counts"]["error"] == 1
    assert len(data["records"]) == 2

    # First record should be SUCCESS
    rec0 = data["records"][0]
    assert rec0["status"] == "SUCCESS"
    assert rec0["airStatusCode"] == "AIR-I-1007"
    assert rec0["airMessage"] == "All encounter(s) processed successfully."
    assert rec0["actionRequired"] == "NONE"

    # Second record should be ERROR
    rec1 = data["records"][1]
    assert rec1["status"] == "ERROR"
    assert rec1["airStatusCode"] == "AIR-E-1005"
    assert len(rec1["errors"]) == 1
    assert rec1["errors"][0]["code"] == "AIR-E-1018"


@pytest.mark.anyio
async def test_get_results_with_status_filter(client, mock_submission_data):
    """Should filter records by status."""
    with patch("app.routers.submission_results._store") as mock_store:
        mock_store.load_metadata.return_value = mock_submission_data
        mock_store._base = Path("/tmp/test")

        with patch("app.routers.submission_results._load_payload", return_value=None):
            response = await client.get("/api/submissions/test-id/results?status=ERROR")

    data = response.json()
    assert len(data["records"]) == 1
    assert data["records"][0]["status"] == "ERROR"
    # Counts reflect total, not filtered
    assert data["counts"]["total"] == 2


@pytest.mark.anyio
async def test_get_results_pagination(client, mock_submission_data):
    """Should paginate results."""
    with patch("app.routers.submission_results._store") as mock_store:
        mock_store.load_metadata.return_value = mock_submission_data
        mock_store._base = Path("/tmp/test")

        with patch("app.routers.submission_results._load_payload", return_value=None):
            response = await client.get("/api/submissions/test-id/results?page=1&page_size=1")

    data = response.json()
    assert len(data["records"]) == 1
    assert data["pagination"]["page"] == 1
    assert data["pagination"]["pageSize"] == 1
    assert data["pagination"]["totalRecords"] == 2
    assert data["pagination"]["totalPages"] == 2


@pytest.mark.anyio
async def test_verbatim_message_preserved(client):
    """CRITICAL: AIR messages must be returned verbatim, never modified."""
    verbatim_msg = "  Exact AIR message with <special> chars & 'quotes' — do NOT modify  "
    metadata = {
        "status": "completed",
        "completedAt": "2026-02-09T10:00:00+00:00",
        "results": {
            "results": [{
                "status": "error",
                "sourceRows": [1],
                "rawResponse": {
                    "statusCode": "AIR-E-1006",
                    "message": verbatim_msg,
                },
            }],
        },
    }

    with patch("app.routers.submission_results._store") as mock_store:
        mock_store.load_metadata.return_value = metadata
        mock_store._base = Path("/tmp/test")

        with patch("app.routers.submission_results._load_payload", return_value=None):
            response = await client.get("/api/submissions/test-id/results")

    data = response.json()
    assert data["records"][0]["airMessage"] == verbatim_msg


@pytest.mark.anyio
async def test_get_results_with_stored_payloads(client, mock_submission_data, mock_request_payload):
    """Should use stored payloads when available for richer data."""
    stored_response = {
        "statusCode": "AIR-I-1007",
        "message": "All encounter(s) processed successfully.",
        "claimDetails": {
            "claimId": "WB9X4I+$",
            "claimSequenceNumber": "1",
            "encounters": [{
                "id": "1",
                "information": {"status": "SUCCESS", "code": "AIR-I-1000", "text": "OK."},
                "episodes": [{
                    "id": "1",
                    "information": {"status": "VALID", "code": "AIR-I-1002", "text": "Valid."},
                }],
            }],
        },
    }

    def load_payload_side_effect(sid, idx, kind):
        if idx == 1 and kind == "request":
            return mock_request_payload
        if idx == 1 and kind == "response":
            return stored_response
        return None

    with patch("app.routers.submission_results._store") as mock_store:
        mock_store.load_metadata.return_value = mock_submission_data
        mock_store._base = Path("/tmp/test")

        with patch("app.routers.submission_results._load_payload", side_effect=load_payload_side_effect):
            response = await client.get("/api/submissions/test-id/results")

    data = response.json()
    rec0 = data["records"][0]
    assert rec0["individual"]["firstName"] == "John"
    assert rec0["individual"]["lastName"] == "Smith"
    assert rec0["encounter"]["vaccineCode"] == "COVAST"
    assert rec0["episodes"][0]["vaccine"] == "COVAST"
    assert rec0["episodes"][0]["status"] == "VALID"


@pytest.mark.anyio
async def test_export_not_found(client):
    """Should return 404 for non-existent submission."""
    response = await client.get("/api/submissions/nonexistent-id/export")
    assert response.status_code == 404


@pytest.mark.anyio
async def test_export_csv(client, mock_submission_data):
    """Should return a CSV with headers and detail rows."""
    with patch("app.routers.submission_results._store") as mock_store:
        mock_store.load_metadata.return_value = mock_submission_data
        mock_store._base = Path("/tmp/test")

        with patch("app.routers.submission_results._load_payload", return_value=None):
            response = await client.get("/api/submissions/test-id/export")

    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv; charset=utf-8"
    assert "attachment" in response.headers.get("content-disposition", "")

    content = response.text
    assert "AIR Submission Results Report" in content
    assert "test-id" in content
    # Should have header row with expected columns
    assert "Row,Status,AIR Code,AIR Message" in content
    # Should have data rows
    lines = content.strip().split("\n")
    # Header section (6 lines) + summary (3 lines) + column header (1) + data rows (2)
    assert len(lines) >= 10


@pytest.mark.anyio
async def test_export_csv_verbatim_message(client):
    """CRITICAL: Exported CSV must contain verbatim AIR messages."""
    verbatim_msg = "Exact message with special chars"
    metadata = {
        "status": "completed",
        "completedAt": "2026-02-09T10:00:00+00:00",
        "results": {
            "results": [{
                "status": "error",
                "sourceRows": [1],
                "rawResponse": {
                    "statusCode": "AIR-E-1005",
                    "message": verbatim_msg,
                },
            }],
        },
    }

    with patch("app.routers.submission_results._store") as mock_store:
        mock_store.load_metadata.return_value = metadata
        mock_store._base = Path("/tmp/test")

        with patch("app.routers.submission_results._load_payload", return_value=None):
            response = await client.get("/api/submissions/test-id/export")

    assert response.status_code == 200
    assert verbatim_msg in response.text
