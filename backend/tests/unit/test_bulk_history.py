"""Unit tests for Bulk Immunisation History Request feature.

Tests the bulk_history router endpoints: upload, validate, process, progress,
results, and download.
"""

import asyncio
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routers.bulk_history import _requests

client = TestClient(app)


# ============================================================================
# Helper factories
# ============================================================================

def _valid_record(**overrides) -> dict:
    """Create a valid patient record for bulk history."""
    record = {
        "rowNumber": 2,
        "medicareCardNumber": "2123456701",
        "medicareIRN": "1",
        "firstName": "John",
        "lastName": "Smith",
        "dateOfBirth": "1990-01-15",
        "gender": "M",
    }
    record.update(overrides)
    return record


def _ihi_record(**overrides) -> dict:
    """Create a valid IHI-based record."""
    record = {
        "rowNumber": 3,
        "ihiNumber": "8003608833357361",
        "firstName": "Jane",
        "lastName": "Doe",
        "dateOfBirth": "1985-05-20",
        "gender": "F",
    }
    record.update(overrides)
    return record


def _demographics_record(**overrides) -> dict:
    """Create a valid demographics-based record."""
    record = {
        "rowNumber": 4,
        "firstName": "Alice",
        "lastName": "Brown",
        "dateOfBirth": "2000-03-10",
        "gender": "X",
        "postCode": "2000",
    }
    record.update(overrides)
    return record


# ============================================================================
# Validate endpoint
# ============================================================================

class TestBulkHistoryValidate:
    """Tests for POST /api/bulk-history/validate."""

    def test_validate_valid_medicare_record(self):
        resp = client.post("/api/bulk-history/validate", json={
            "records": [_valid_record()],
            "providerNumber": "2448141T",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["isValid"] is True
        assert data["validRecords"] == 1
        assert data["invalidRecords"] == 0
        assert data["errors"] == []

    def test_validate_valid_ihi_record(self):
        resp = client.post("/api/bulk-history/validate", json={
            "records": [_ihi_record()],
            "providerNumber": "2448141T",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["isValid"] is True
        assert data["validRecords"] == 1

    def test_validate_valid_demographics_record(self):
        resp = client.post("/api/bulk-history/validate", json={
            "records": [_demographics_record()],
            "providerNumber": "2448141T",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["isValid"] is True
        assert data["validRecords"] == 1

    def test_validate_multiple_records_mixed(self):
        resp = client.post("/api/bulk-history/validate", json={
            "records": [
                _valid_record(rowNumber=1),
                _ihi_record(rowNumber=2),
                _demographics_record(rowNumber=3),
            ],
            "providerNumber": "2448141T",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["isValid"] is True
        assert data["totalRecords"] == 3
        assert data["validRecords"] == 3

    def test_validate_missing_dob(self):
        record = _valid_record()
        del record["dateOfBirth"]
        resp = client.post("/api/bulk-history/validate", json={
            "records": [record],
            "providerNumber": "2448141T",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["isValid"] is False
        assert data["invalidRecords"] == 1
        assert any(e["field"] == "dateOfBirth" for e in data["errors"])

    def test_validate_invalid_gender(self):
        resp = client.post("/api/bulk-history/validate", json={
            "records": [_valid_record(gender="Z")],
            "providerNumber": "2448141T",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["isValid"] is False
        assert any(e["field"] == "gender" for e in data["errors"])

    def test_validate_missing_gender(self):
        record = _valid_record()
        del record["gender"]
        resp = client.post("/api/bulk-history/validate", json={
            "records": [record],
            "providerNumber": "2448141T",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["isValid"] is False

    def test_validate_insufficient_identification(self):
        """No Medicare, no IHI, and no complete demographics (missing postCode)."""
        resp = client.post("/api/bulk-history/validate", json={
            "records": [{
                "rowNumber": 1,
                "firstName": "Test",
                "lastName": "User",
                "dateOfBirth": "2000-01-01",
                "gender": "M",
                # Missing postCode for demographics scenario
            }],
            "providerNumber": "2448141T",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["isValid"] is False
        assert any(e["errorCode"] == "AIR-E-1026" for e in data["errors"])

    def test_validate_invalid_medicare_check_digit(self):
        resp = client.post("/api/bulk-history/validate", json={
            "records": [_valid_record(medicareCardNumber="1234567890")],
            "providerNumber": "2448141T",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["isValid"] is False
        assert any(e["errorCode"] == "AIR-E-1017" for e in data["errors"])

    def test_validate_invalid_ihi_format(self):
        resp = client.post("/api/bulk-history/validate", json={
            "records": [_ihi_record(ihiNumber="12345")],
            "providerNumber": "2448141T",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["isValid"] is False
        assert any(e["field"] == "ihiNumber" for e in data["errors"])

    def test_validate_future_dob(self):
        resp = client.post("/api/bulk-history/validate", json={
            "records": [_valid_record(dateOfBirth="2099-01-01")],
            "providerNumber": "2448141T",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["isValid"] is False
        assert any(e["errorCode"] == "AIR-E-1018" for e in data["errors"])

    def test_validate_empty_records(self):
        resp = client.post("/api/bulk-history/validate", json={
            "records": [],
            "providerNumber": "2448141T",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["isValid"] is True
        assert data["totalRecords"] == 0

    def test_validate_requires_provider_number(self):
        resp = client.post("/api/bulk-history/validate", json={
            "records": [_valid_record()],
        })
        assert resp.status_code == 422  # Missing required field

    def test_validate_provider_number_too_short(self):
        resp = client.post("/api/bulk-history/validate", json={
            "records": [_valid_record()],
            "providerNumber": "AB",
        })
        assert resp.status_code == 422

    def test_validate_gender_x_valid(self):
        """Gender X (indeterminate) must be accepted."""
        resp = client.post("/api/bulk-history/validate", json={
            "records": [_valid_record(gender="X")],
            "providerNumber": "2448141T",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["isValid"] is True

    def test_validate_returns_records_in_response(self):
        records = [_valid_record()]
        resp = client.post("/api/bulk-history/validate", json={
            "records": records,
            "providerNumber": "2448141T",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["records"]) == 1
        assert data["records"][0]["rowNumber"] == 2


# ============================================================================
# Process endpoint
# ============================================================================

class TestBulkHistoryProcess:
    """Tests for POST /api/bulk-history/process."""

    def test_process_returns_request_id(self):
        resp = client.post("/api/bulk-history/process", json={
            "records": [_valid_record()],
            "providerNumber": "2448141T",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["requestId"]
        assert data["status"] == "running"
        assert data["totalRecords"] == 1

    def test_process_multiple_records(self):
        resp = client.post("/api/bulk-history/process", json={
            "records": [
                _valid_record(rowNumber=1),
                _ihi_record(rowNumber=2),
            ],
            "providerNumber": "2448141T",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["totalRecords"] == 2

    def test_process_requires_provider_number(self):
        resp = client.post("/api/bulk-history/process", json={
            "records": [_valid_record()],
        })
        assert resp.status_code == 422


# ============================================================================
# Progress endpoint
# ============================================================================

class TestBulkHistoryProgress:
    """Tests for GET /api/bulk-history/{request_id}/progress."""

    def test_progress_not_found(self):
        resp = client.get("/api/bulk-history/nonexistent/progress")
        assert resp.status_code == 404

    def test_progress_returns_initial_state(self):
        # Start a process
        process_resp = client.post("/api/bulk-history/process", json={
            "records": [_valid_record()],
            "providerNumber": "2448141T",
        })
        request_id = process_resp.json()["requestId"]

        # Check progress immediately
        resp = client.get(f"/api/bulk-history/{request_id}/progress")
        assert resp.status_code == 200
        data = resp.json()
        assert data["requestId"] == request_id
        assert data["progress"]["totalRecords"] == 1


# ============================================================================
# Results endpoint
# ============================================================================

class TestBulkHistoryResults:
    """Tests for GET /api/bulk-history/{request_id}/results."""

    def test_results_not_found(self):
        resp = client.get("/api/bulk-history/nonexistent/results")
        assert resp.status_code == 404

    def test_results_not_completed(self):
        """Results for a request still running should return status."""
        # Inject a mock request in running state
        _requests["test-running-id"] = {
            "status": "running",
            "progress": {
                "totalRecords": 1, "processedRecords": 0,
                "successfulRecords": 0, "failedRecords": 0,
                "currentRecord": 0, "status": "running",
            },
            "results": None,
        }

        resp = client.get("/api/bulk-history/test-running-id/results")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "running"
        assert data["results"] == []

        # Cleanup
        del _requests["test-running-id"]

    def test_results_completed(self):
        """Completed request returns full results."""
        _requests["test-completed-id"] = {
            "status": "completed",
            "completedAt": "2026-02-10T12:00:00Z",
            "progress": {
                "totalRecords": 1, "processedRecords": 1,
                "successfulRecords": 1, "failedRecords": 0,
                "currentRecord": 1, "status": "completed",
            },
            "results": [{
                "rowNumber": 1,
                "status": "success",
                "statusCode": "AIR-I-1100",
                "message": "OK",
                "firstName": "John",
                "lastName": "Smith",
                "dateOfBirth": "1990-01-15",
                "medicareCardNumber": "2123456701",
                "immunisationHistory": [
                    {
                        "dateOfService": "01022025",
                        "vaccineCode": "COMIRN",
                        "vaccineDescription": "Comirnaty",
                        "vaccineDose": "1",
                        "routeOfAdministration": "IM",
                        "status": "VALID",
                    }
                ],
                "vaccineDueDetails": [
                    {"antigenCode": "FLU", "doseNumber": "1", "dueDate": "01032026"}
                ],
            }],
        }

        resp = client.get("/api/bulk-history/test-completed-id/results")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "completed"
        assert data["totalRecords"] == 1
        assert data["successfulRecords"] == 1
        assert len(data["results"]) == 1
        assert data["results"][0]["status"] == "success"
        assert len(data["results"][0]["immunisationHistory"]) == 1
        assert data["results"][0]["immunisationHistory"][0]["vaccineCode"] == "COMIRN"

        del _requests["test-completed-id"]


# ============================================================================
# Download endpoint
# ============================================================================

class TestBulkHistoryDownload:
    """Tests for GET /api/bulk-history/{request_id}/download."""

    def test_download_not_found(self):
        resp = client.get("/api/bulk-history/nonexistent/download")
        assert resp.status_code == 404

    def test_download_not_completed(self):
        _requests["test-not-done"] = {
            "status": "running",
            "progress": {
                "totalRecords": 1, "processedRecords": 0,
                "successfulRecords": 0, "failedRecords": 0,
                "currentRecord": 0, "status": "running",
            },
            "results": None,
        }

        resp = client.get("/api/bulk-history/test-not-done/download")
        assert resp.status_code == 400

        del _requests["test-not-done"]

    def test_download_returns_excel(self):
        _requests["test-download-id"] = {
            "status": "completed",
            "completedAt": "2026-02-10T12:00:00Z",
            "progress": {
                "totalRecords": 2, "processedRecords": 2,
                "successfulRecords": 1, "failedRecords": 1,
                "currentRecord": 2, "status": "completed",
            },
            "results": [
                {
                    "rowNumber": 1,
                    "status": "success",
                    "statusCode": "AIR-I-1100",
                    "message": "OK",
                    "firstName": "John",
                    "lastName": "Smith",
                    "dateOfBirth": "1990-01-15",
                    "medicareCardNumber": "2123456701",
                    "immunisationHistory": [
                        {
                            "dateOfService": "01022025",
                            "vaccineCode": "COMIRN",
                            "vaccineDescription": "Comirnaty",
                            "vaccineDose": "1",
                            "routeOfAdministration": "IM",
                            "status": "VALID",
                        }
                    ],
                    "vaccineDueDetails": [],
                },
                {
                    "rowNumber": 2,
                    "status": "error",
                    "statusCode": "AIR-E-1026",
                    "message": "Individual not found",
                    "firstName": "Jane",
                    "lastName": "Doe",
                    "dateOfBirth": "1985-05-20",
                    "medicareCardNumber": None,
                    "immunisationHistory": [],
                    "vaccineDueDetails": [],
                },
            ],
        }

        resp = client.get("/api/bulk-history/test-download-id/download")
        assert resp.status_code == 200
        assert "spreadsheet" in resp.headers["content-type"]
        assert "immunisation-history" in resp.headers["content-disposition"]
        assert ".xlsx" in resp.headers["content-disposition"]
        # Verify it's a valid xlsx (starts with PK zip header)
        assert resp.content[:2] == b"PK"

        del _requests["test-download-id"]


# ============================================================================
# Date formatting helper
# ============================================================================

class TestDateFormatting:
    """Tests for _format_date_display helper."""

    def test_ddMMyyyy_to_display(self):
        from app.routers.bulk_history import _format_date_display
        assert _format_date_display("01022025") == "01/02/2025"

    def test_yyyy_mm_dd_to_display(self):
        from app.routers.bulk_history import _format_date_display
        assert _format_date_display("2025-02-01") == "01/02/2025"

    def test_empty_string(self):
        from app.routers.bulk_history import _format_date_display
        assert _format_date_display("") == ""

    def test_none_input(self):
        from app.routers.bulk_history import _format_date_display
        assert _format_date_display(None) == ""

    def test_unknown_format_passthrough(self):
        from app.routers.bulk_history import _format_date_display
        assert _format_date_display("2025/02/01") == "2025/02/01"


# ============================================================================
# Schema validation
# ============================================================================

class TestBulkHistorySchemas:
    """Tests for Pydantic schema validation."""

    def test_validate_request_schema(self):
        from app.schemas.bulk_history import BulkHistoryValidateRequest
        req = BulkHistoryValidateRequest(
            records=[{"rowNumber": 1, "dateOfBirth": "1990-01-15", "gender": "M"}],
            providerNumber="2448141T",
        )
        assert req.providerNumber == "2448141T"
        assert len(req.records) == 1

    def test_process_request_schema(self):
        from app.schemas.bulk_history import BulkHistoryProcessRequest
        req = BulkHistoryProcessRequest(
            records=[{"rowNumber": 1}],
            providerNumber="2448141T",
        )
        assert req.providerNumber == "2448141T"

    def test_process_response_schema(self):
        from app.schemas.bulk_history import BulkHistoryProcessResponse
        resp = BulkHistoryProcessResponse(
            requestId="abc-123",
            status="running",
            totalRecords=5,
        )
        assert resp.requestId == "abc-123"

    def test_history_result_entry(self):
        from app.schemas.bulk_history import HistoryResultEntry
        entry = HistoryResultEntry(
            dateOfService="01022025",
            vaccineCode="COMIRN",
            vaccineDose="1",
            status="VALID",
        )
        assert entry.vaccineCode == "COMIRN"

    def test_individual_history_result(self):
        from app.schemas.bulk_history import IndividualHistoryResult
        result = IndividualHistoryResult(
            rowNumber=1,
            status="success",
            immunisationHistory=[],
            vaccineDueDetails=[],
        )
        assert result.status == "success"
        assert result.immunisationHistory == []
