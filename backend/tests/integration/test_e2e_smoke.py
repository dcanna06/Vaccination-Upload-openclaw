"""E2E Smoke Tests — TICKET-E2E-001 and E2E-002.

Run with:  pytest backend/tests/integration/test_e2e_smoke.py -m e2e -v

These tests require:
  - Valid PRODA credentials in .env
  - AIR_CLIENT_ID set
  - Network access to vendor endpoints
"""

import pytest

from app.config import settings
from app.services.proda_auth import ProdaAuthService

from .conftest import skip_no_vendor

pytestmark = [pytest.mark.e2e, pytest.mark.integration]


@skip_no_vendor
class TestE2E001ProdaTokenRetrieval:
    """E2E-001: PRODA Token Retrieval (Smoke Test).

    Must pass before all other E2E tests.
    """

    @pytest.mark.asyncio
    async def test_obtains_valid_token(self, proda_service):
        """Verify token retrieval from vendor PRODA endpoint."""
        token = await proda_service.get_token()
        assert token is not None
        assert len(token) > 100, "Token should be a long JWT string"

    @pytest.mark.asyncio
    async def test_token_is_cached(self, proda_service):
        """Verify second call returns cached token."""
        token1 = await proda_service.get_token()
        token2 = await proda_service.get_token()
        assert token1 == token2
        assert proda_service.is_token_valid is True

    @pytest.mark.asyncio
    async def test_authorization_header_format(self, proda_service):
        """Verify authorization header is Bearer format."""
        await proda_service.get_token()
        header = proda_service.get_authorization_header()
        assert header.startswith("Bearer ")
        assert len(header) > 107  # "Bearer " + 100+ char token


@skip_no_vendor
class TestE2E002ReferenceDataEndpoints:
    """E2E-002: Reference Data API Retrieval.

    Verifies AIR reference data endpoints are accessible with PRODA token.
    """

    @pytest.fixture
    async def auth_headers(self, proda_service):
        """Get authenticated headers for AIR API calls."""
        import uuid

        token = await proda_service.get_token()
        return {
            "Authorization": f"Bearer {token}",
            "X-IBM-Client-Id": settings.AIR_CLIENT_ID,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "dhs-messageId": f"urn:uuid:{uuid.uuid4()}",
            "dhs-correlationId": f"urn:uuid:{uuid.uuid4()}",
            "dhs-auditId": settings.PRODA_MINOR_ID,
            "dhs-auditIdType": "Minor Id",
            "dhs-productId": settings.AIR_PRODUCT_ID,
        }

    @pytest.mark.asyncio
    async def test_vaccine_reference_data(self, auth_headers):
        """Fetch vaccine reference data from AIR."""
        import httpx

        base_url = settings.AIR_API_BASE_URL_VENDOR
        url = f"{base_url}/air/immunisation/v1/refdata/vaccine"

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=auth_headers, timeout=30.0)

        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:200]}"

    @pytest.mark.asyncio
    async def test_route_of_administration_reference_data(self, auth_headers):
        """Fetch route of administration reference data."""
        import httpx

        base_url = settings.AIR_API_BASE_URL_VENDOR
        url = f"{base_url}/air/immunisation/v1/refdata/routeOfAdministration"

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=auth_headers, timeout=30.0)

        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:200]}"
