"""Tests for upload, validate, and submit API endpoints."""

import io

import openpyxl
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


def _create_test_excel() -> bytes:
    """Create a minimal test Excel file with valid vaccination data."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Vaccination Records"

    headers = [
        "Medicare Card Number", "Medicare IRN", "IHI Number",
        "First Name", "Last Name", "Date of Birth", "Gender",
        "Postcode", "Date of Service", "Vaccine Code", "Vaccine Dose",
        "Vaccine Batch", "Vaccine Type", "Route of Administration",
        "Administered Overseas", "Country Code",
        "Immunising Provider Number", "School ID", "Antenatal Indicator",
    ]
    ws.append(headers)
    ws.append([
        "2123456701", "1", "", "Jane", "Smith", "1990-01-15", "F",
        "2000", "2026-01-15", "COMIRN", "1",
        "FL1234", "NIP", "IM",
        "FALSE", "", "1234560V", "", "FALSE",
    ])

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


@pytest.fixture
def excel_bytes() -> bytes:
    return _create_test_excel()


# ============================================================================
# Upload Endpoint Tests
# ============================================================================

class TestUploadEndpoint:
    """Test POST /api/upload."""

    @pytest.mark.anyio
    async def test_upload_parses_excel(self, excel_bytes: bytes) -> None:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.post(
                "/api/upload",
                files={"file": ("test.xlsx", excel_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "parsed"
        assert data["totalRows"] >= 1

    @pytest.mark.anyio
    async def test_upload_returns_records(self, excel_bytes: bytes) -> None:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.post(
                "/api/upload",
                files={"file": ("test.xlsx", excel_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            )
        data = resp.json()
        assert len(data["records"]) >= 1
        assert data["records"][0].get("vaccineCode") == "COMIRN"

    @pytest.mark.anyio
    async def test_upload_returns_filename(self, excel_bytes: bytes) -> None:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.post(
                "/api/upload",
                files={"file": ("vaccines.xlsx", excel_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            )
        assert resp.json()["fileName"] == "vaccines.xlsx"

    @pytest.mark.anyio
    async def test_upload_rejects_non_excel(self) -> None:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.post(
                "/api/upload",
                files={"file": ("test.txt", b"not excel", "text/plain")},
            )
        assert resp.status_code >= 400


# ============================================================================
# Validate Endpoint Tests
# ============================================================================

class TestValidateEndpoint:
    """Test POST /api/validate."""

    @pytest.mark.anyio
    async def test_validate_valid_record(self) -> None:
        records = [
            {
                "rowNumber": 2,
                "medicareCardNumber": "2123456701",
                "medicareIRN": "1",
                "dateOfBirth": "1990-01-15",
                "gender": "F",
                "dateOfService": "2026-01-15",
                "vaccineCode": "COMIRN",
                "vaccineDose": "1",
            }
        ]
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.post("/api/validate", json={"records": records})
        assert resp.status_code == 200
        data = resp.json()
        assert data["isValid"] is True
        assert data["validRecords"] == 1
        assert data["invalidRecords"] == 0

    @pytest.mark.anyio
    async def test_validate_invalid_record(self) -> None:
        records = [
            {
                "rowNumber": 2,
                "dateOfBirth": "1990-01-15",
                "gender": "X",  # Valid gender — record fails due to missing identification fields
                "dateOfService": "2026-01-15",
                "vaccineCode": "COMIRN",
                "vaccineDose": "1",
            }
        ]
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.post("/api/validate", json={"records": records})
        data = resp.json()
        assert data["isValid"] is False
        assert data["invalidRecords"] >= 1
        assert len(data["errors"]) >= 1

    @pytest.mark.anyio
    async def test_validate_returns_grouped_batches_when_valid(self) -> None:
        records = [
            {
                "rowNumber": 2,
                "medicareCardNumber": "2123456701",
                "medicareIRN": "1",
                "dateOfBirth": "1990-01-15",
                "gender": "F",
                "dateOfService": "2026-01-15",
                "vaccineCode": "COMIRN",
                "vaccineDose": "1",
            }
        ]
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.post("/api/validate", json={"records": records})
        data = resp.json()
        assert data["isValid"] is True
        assert len(data["groupedBatches"]) >= 1

    @pytest.mark.anyio
    async def test_validate_empty_records(self) -> None:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.post("/api/validate", json={"records": []})
        data = resp.json()
        assert data["isValid"] is True
        assert data["totalRecords"] == 0

    @pytest.mark.anyio
    async def test_validate_errors_include_row_numbers(self) -> None:
        records = [
            {
                "rowNumber": 5,
                "dateOfBirth": "",
                "gender": "",
                "dateOfService": "",
                "vaccineCode": "",
                "vaccineDose": "",
            }
        ]
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.post("/api/validate", json={"records": records})
        data = resp.json()
        assert any(e["rowNumber"] == 5 for e in data["errors"])


# ============================================================================
# Submit Endpoint Tests
# ============================================================================

class TestSubmitEndpoint:
    """Test POST /api/submit and related endpoints."""

    @pytest.mark.anyio
    async def test_submit_dry_run(self) -> None:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.post("/api/submit", json={
                "batches": [{"encounterCount": 1}],
                "informationProvider": {"providerNumber": "1234560V"},
                "dryRun": True,
            })
        assert resp.status_code == 200
        data = resp.json()
        assert data["submissionId"]
        assert data["totalBatches"] == 1

    @pytest.mark.anyio
    async def test_progress_endpoint(self) -> None:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            # Create submission
            submit_resp = await ac.post("/api/submit", json={
                "batches": [],
                "informationProvider": {"providerNumber": "1234560V"},
                "dryRun": True,
            })
            sub_id = submit_resp.json()["submissionId"]

            # Check progress
            resp = await ac.get(f"/api/submit/{sub_id}/progress")
        assert resp.status_code == 200
        data = resp.json()
        assert data["submissionId"] == sub_id

    @pytest.mark.anyio
    async def test_progress_not_found(self) -> None:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.get("/api/submit/nonexistent/progress")
        assert resp.status_code == 404

    @pytest.mark.anyio
    async def test_results_endpoint(self) -> None:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            submit_resp = await ac.post("/api/submit", json={
                "batches": [],
                "informationProvider": {"providerNumber": "1234560V"},
                "dryRun": True,
            })
            sub_id = submit_resp.json()["submissionId"]

            resp = await ac.get(f"/api/submit/{sub_id}/results")
        assert resp.status_code == 200
        data = resp.json()
        assert data["submissionId"] == sub_id

    @pytest.mark.anyio
    async def test_pause_resume(self) -> None:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            submit_resp = await ac.post("/api/submit", json={
                "batches": [],
                "informationProvider": {"providerNumber": "1234560V"},
                "dryRun": True,
            })
            sub_id = submit_resp.json()["submissionId"]

            # Pause
            pause_resp = await ac.post(f"/api/submit/{sub_id}/pause")
            assert pause_resp.json()["status"] == "paused"

            # Resume
            resume_resp = await ac.post(f"/api/submit/{sub_id}/resume")
            assert resume_resp.json()["status"] == "running"

    @pytest.mark.anyio
    async def test_confirm_endpoint(self) -> None:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            submit_resp = await ac.post("/api/submit", json={
                "batches": [],
                "informationProvider": {"providerNumber": "1234560V"},
                "dryRun": True,
            })
            sub_id = submit_resp.json()["submissionId"]

            resp = await ac.post(f"/api/submit/{sub_id}/confirm", json={
                "confirmations": [
                    {"recordId": "r1", "confirmType": "individual", "acceptAndConfirm": True}
                ],
            })
        assert resp.status_code == 200
        data = resp.json()
        assert data["confirmedCount"] == 1
