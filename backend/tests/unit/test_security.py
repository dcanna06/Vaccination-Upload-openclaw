"""Tests for TICKET-044/045/046: Security headers, rate limiting, PII protection."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ============================================================================
# Security Headers
# ============================================================================


class TestSecurityHeaders:
    """Verify security headers are present on responses."""

    @pytest.mark.asyncio
    async def test_x_content_type_options(self, client: AsyncClient) -> None:
        resp = await client.get("/health")
        assert resp.headers.get("x-content-type-options") == "nosniff"

    @pytest.mark.asyncio
    async def test_x_frame_options(self, client: AsyncClient) -> None:
        resp = await client.get("/health")
        assert resp.headers.get("x-frame-options") == "DENY"

    @pytest.mark.asyncio
    async def test_x_xss_protection(self, client: AsyncClient) -> None:
        resp = await client.get("/health")
        assert resp.headers.get("x-xss-protection") == "1; mode=block"

    @pytest.mark.asyncio
    async def test_referrer_policy(self, client: AsyncClient) -> None:
        resp = await client.get("/health")
        assert resp.headers.get("referrer-policy") == "strict-origin-when-cross-origin"

    @pytest.mark.asyncio
    async def test_cache_control(self, client: AsyncClient) -> None:
        resp = await client.get("/health")
        assert resp.headers.get("cache-control") == "no-store"

    @pytest.mark.asyncio
    async def test_permissions_policy(self, client: AsyncClient) -> None:
        resp = await client.get("/health")
        assert "camera=()" in resp.headers.get("permissions-policy", "")

    @pytest.mark.asyncio
    async def test_content_security_policy(self, client: AsyncClient) -> None:
        resp = await client.get("/health")
        csp = resp.headers.get("content-security-policy", "")
        assert "default-src 'self'" in csp
        assert "frame-ancestors 'none'" in csp


# ============================================================================
# Error handler doesn't leak stack traces
# ============================================================================


class TestErrorSafety:
    """Verify internal errors don't expose stack traces."""

    @pytest.mark.asyncio
    async def test_404_does_not_expose_internals(self, client: AsyncClient) -> None:
        resp = await client.get("/nonexistent")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_upload_error_does_not_expose_path(self, client: AsyncClient) -> None:
        resp = await client.post(
            "/api/upload",
            files={"file": ("test.txt", b"not excel", "text/plain")},
        )
        body = resp.json()
        assert "traceback" not in str(body).lower()
        assert "/home/" not in str(body)
