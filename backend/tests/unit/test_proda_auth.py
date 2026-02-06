"""Tests for TICKET-006: PRODA authentication service."""

import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.config import Settings
from app.middleware.error_handler import AuthenticationError
from app.services.proda_auth import ProdaAuthService, TOKEN_REFRESH_BUFFER_SECONDS


@pytest.fixture
def config():
    return Settings(
        PRODA_MINOR_ID="MMS00001",
        PRODA_DEVICE_NAME="test-device",
        PRODA_ORG_ID="RA1234",
        PRODA_JKS_BASE64="dGVzdA==",  # base64("test")
        PRODA_JKS_PASSWORD="password",
        PRODA_KEY_ALIAS="mykey",
        PRODA_AUDIENCE="https://medicareaustralia.gov.au/MCOL",
        PRODA_TOKEN_ENDPOINT="https://proda.example.com/token",
        _env_file=None,
    )


@pytest.fixture
def service(config):
    return ProdaAuthService(config=config)


class TestTokenValidity:
    def test_no_token_is_invalid(self, service):
        assert service.is_token_valid is False

    def test_expired_token_is_invalid(self, service):
        service._access_token = "test-token"
        service._token_expires_at = time.time() - 100
        assert service.is_token_valid is False

    def test_token_within_buffer_is_invalid(self, service):
        service._access_token = "test-token"
        # Set expiry just within the buffer
        service._token_expires_at = time.time() + TOKEN_REFRESH_BUFFER_SECONDS - 10
        assert service.is_token_valid is False

    def test_valid_token_outside_buffer(self, service):
        service._access_token = "test-token"
        service._token_expires_at = time.time() + TOKEN_REFRESH_BUFFER_SECONDS + 100
        assert service.is_token_valid is True


class TestGetAuthorizationHeader:
    def test_raises_when_no_token(self, service):
        with pytest.raises(AuthenticationError, match="No PRODA token"):
            service.get_authorization_header()

    def test_returns_bearer_header(self, service):
        service._access_token = "my-token-123"
        assert service.get_authorization_header() == "Bearer my-token-123"


class TestClearToken:
    def test_clears_token_and_expiry(self, service):
        service._access_token = "token"
        service._token_expires_at = time.time() + 3600
        service.clear_token()
        assert service._access_token is None
        assert service._token_expires_at == 0.0
        assert service.is_token_valid is False


class TestGetToken:
    @pytest.mark.asyncio
    async def test_returns_cached_token_if_valid(self, service):
        service._access_token = "cached-token"
        service._token_expires_at = time.time() + TOKEN_REFRESH_BUFFER_SECONDS + 100
        token = await service.get_token()
        assert token == "cached-token"

    @pytest.mark.asyncio
    async def test_acquires_new_token_when_expired(self, service):
        service._access_token = None
        with patch.object(service, "_acquire_token", new_callable=AsyncMock) as mock:
            mock.return_value = "new-token"
            token = await service.get_token()
            assert token == "new-token"
            mock.assert_awaited_once()


class TestBuildAssertion:
    def test_raises_without_jks_config(self):
        config = Settings(PRODA_JKS_BASE64="", _env_file=None)
        service = ProdaAuthService(config=config)
        with pytest.raises(AuthenticationError, match="JKS keystore not configured"):
            service._build_assertion()


class TestAcquireToken:
    @pytest.mark.asyncio
    async def test_successful_token_acquisition(self, service):
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "access_token": "acquired-token",
            "token_type": "Bearer",
            "expires_in": 3600,
        }
        mock_response.raise_for_status = MagicMock()

        with patch.object(service, "_build_assertion", return_value="mock-assertion"):
            with patch("httpx.AsyncClient") as mock_client_class:
                mock_client = AsyncMock()
                mock_client.post.return_value = mock_response
                mock_client.__aenter__ = AsyncMock(return_value=mock_client)
                mock_client.__aexit__ = AsyncMock(return_value=False)
                mock_client_class.return_value = mock_client

                token = await service._acquire_token()
                assert token == "acquired-token"
                assert service._access_token == "acquired-token"
                assert service._token_expires_at > time.time()

    @pytest.mark.asyncio
    async def test_token_is_cached_after_acquisition(self, service):
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "access_token": "cached-me",
            "expires_in": 3600,
        }
        mock_response.raise_for_status = MagicMock()

        with patch.object(service, "_build_assertion", return_value="mock"):
            with patch("httpx.AsyncClient") as mock_client_class:
                mock_client = AsyncMock()
                mock_client.post.return_value = mock_response
                mock_client.__aenter__ = AsyncMock(return_value=mock_client)
                mock_client.__aexit__ = AsyncMock(return_value=False)
                mock_client_class.return_value = mock_client

                await service._acquire_token()
                # Token should now be valid (cached)
                assert service.is_token_valid is True
                assert service.get_authorization_header() == "Bearer cached-me"
