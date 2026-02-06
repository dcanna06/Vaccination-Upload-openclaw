"""Tests for TICKET-003: Backend FastAPI server setup.

Covers:
- Health check endpoint
- CORS headers
- File upload validation (type and size)
- Error handler middleware
- Request logger middleware (correlation IDs)
"""

import io

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# --- Health check ---


@pytest.mark.asyncio
async def test_health_check_returns_200(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


# --- CORS ---


@pytest.mark.asyncio
async def test_cors_headers_on_preflight(client: AsyncClient):
    response = await client.options(
        "/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert "access-control-allow-origin" in response.headers


@pytest.mark.asyncio
async def test_cors_allows_configured_origin(client: AsyncClient):
    response = await client.get(
        "/health",
        headers={"Origin": "http://localhost:3000"},
    )
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"


# --- File upload validation ---


@pytest.mark.asyncio
async def test_upload_rejects_non_excel_file(client: AsyncClient):
    files = {"file": ("test.txt", io.BytesIO(b"hello"), "text/plain")}
    response = await client.post("/api/upload", files=files)
    assert response.status_code == 400
    body = response.json()
    assert "Invalid file type" in body["error"]


@pytest.mark.asyncio
async def test_upload_rejects_csv_file(client: AsyncClient):
    files = {"file": ("data.csv", io.BytesIO(b"a,b,c"), "text/csv")}
    response = await client.post("/api/upload", files=files)
    assert response.status_code == 400
    body = response.json()
    assert "Invalid file type" in body["error"]


@pytest.mark.asyncio
async def test_upload_rejects_file_over_10mb(client: AsyncClient):
    large_content = b"x" * (11 * 1024 * 1024)  # 11 MB
    files = {
        "file": (
            "big.xlsx",
            io.BytesIO(large_content),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    }
    response = await client.post("/api/upload", files=files)
    assert response.status_code == 400
    body = response.json()
    assert "File too large" in body["error"]


@pytest.mark.asyncio
async def test_upload_rejects_empty_file(client: AsyncClient):
    files = {
        "file": (
            "empty.xlsx",
            io.BytesIO(b""),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    }
    response = await client.post("/api/upload", files=files)
    assert response.status_code == 400
    body = response.json()
    assert "empty" in body["error"].lower()


@pytest.mark.asyncio
async def test_upload_accepts_xlsx_file(client: AsyncClient):
    files = {
        "file": (
            "vaccines.xlsx",
            io.BytesIO(b"PK\x03\x04fake-xlsx-content"),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    }
    response = await client.post("/api/upload", files=files)
    assert response.status_code == 200
    body = response.json()
    assert body["fileName"] == "vaccines.xlsx"
    assert body["status"] == "uploaded"
    assert body["sizeBytes"] > 0


@pytest.mark.asyncio
async def test_upload_accepts_xls_file(client: AsyncClient):
    files = {
        "file": (
            "vaccines.xls",
            io.BytesIO(b"\xd0\xcf\x11\xe0fake-xls-content"),
            "application/vnd.ms-excel",
        )
    }
    response = await client.post("/api/upload", files=files)
    assert response.status_code == 200
    body = response.json()
    assert body["fileName"] == "vaccines.xls"


# --- Correlation ID ---


@pytest.mark.asyncio
async def test_response_includes_correlation_id(client: AsyncClient):
    response = await client.get("/health")
    assert "x-correlation-id" in response.headers
    # Should be a valid UUID format
    cid = response.headers["x-correlation-id"]
    assert len(cid) == 36  # UUID format


@pytest.mark.asyncio
async def test_custom_correlation_id_echoed(client: AsyncClient):
    custom_id = "test-correlation-123"
    response = await client.get(
        "/health",
        headers={"x-correlation-id": custom_id},
    )
    assert response.headers["x-correlation-id"] == custom_id


# --- Error handling ---


@pytest.mark.asyncio
async def test_404_for_unknown_route(client: AsyncClient):
    response = await client.get("/nonexistent")
    assert response.status_code == 404
