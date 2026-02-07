"""Integration test: PRODA token retrieval against vendor environment.

Run with:  pytest backend/tests/integration/test_proda_vendor.py -m integration -v

Requires a valid .env with PRODA credentials and a JKS keystore configured.
Skipped automatically if PRODA_ORG_ID is not set.
"""

import pytest

from app.config import settings
from app.services.proda_auth import ProdaAuthService


pytestmark = pytest.mark.integration


@pytest.fixture
def auth_service():
    return ProdaAuthService(config=settings)


def _has_proda_config() -> bool:
    """Check if PRODA credentials are configured."""
    return bool(
        settings.PRODA_ORG_ID
        and settings.PRODA_DEVICE_NAME
        and (settings.PRODA_JKS_BASE64 or settings.PRODA_JKS_FILE_PATH)
    )


@pytest.mark.asyncio
@pytest.mark.skipif(not _has_proda_config(), reason="PRODA credentials not configured")
async def test_proda_token_retrieval(auth_service):
    """Test real token retrieval against vendor PRODA endpoint."""
    token = await auth_service.get_token()
    assert token is not None
    assert len(token) > 100


@pytest.mark.asyncio
@pytest.mark.skipif(not _has_proda_config(), reason="PRODA credentials not configured")
async def test_proda_token_is_cached(auth_service):
    """Test that a second call returns the cached token."""
    token1 = await auth_service.get_token()
    token2 = await auth_service.get_token()
    assert token1 == token2
    assert auth_service.is_token_valid is True
