"""Tests for TICKET-P0: PRODA authentication service (corrected JWT claims)."""

import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.config import Settings
from app.middleware.error_handler import AuthenticationError
from app.services.proda_auth import ProdaAuthService, TOKEN_REFRESH_BUFFER_SECONDS


@pytest.fixture
def config():
    return Settings(
        APP_ENV="vendor",
        PRODA_ORG_ID="2330016739",
        PRODA_DEVICE_NAME="DavidTestLaptop2",
        PRODA_MINOR_ID="WRR00000",
        PRODA_JKS_BASE64="dGVzdA==",  # base64("test")
        PRODA_JKS_PASSWORD="Pass-123",
        PRODA_KEY_ALIAS="proda-alias",
        PRODA_JWT_AUDIENCE="https://proda.humanservices.gov.au",
        PRODA_CLIENT_ID="soape-testing-client-v2",
        PRODA_ACCESS_TOKEN_AUDIENCE="https://proda.humanservices.gov.au",
        PRODA_TOKEN_ENDPOINT_VENDOR="https://vnd.proda.humanservices.gov.au/mga/sps/oauth/oauth20/token",
        PRODA_TOKEN_ENDPOINT_PROD="https://proda.humanservices.gov.au/mga/sps/oauth/oauth20/token",
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
        config = Settings(PRODA_JKS_BASE64="", PRODA_JKS_FILE_PATH="", _env_file=None)
        service = ProdaAuthService(config=config)
        with pytest.raises(AuthenticationError, match="JKS keystore not configured"):
            service._build_assertion()

    def test_jwt_claims_use_org_id_as_issuer(self, service):
        """iss must be PRODA_ORG_ID, NOT Minor ID."""
        with patch.object(service, "_load_private_key", return_value=b"fake-key"):
            with patch("jwt.encode", return_value="mock-jwt") as mock_encode:
                service._build_assertion()
                call_args = mock_encode.call_args
                claims = call_args[0][0]
                assert claims["iss"] == "2330016739"  # ORG_ID, not Minor ID

    def test_jwt_claims_use_correct_audience(self, service):
        """aud must be https://proda.humanservices.gov.au, NOT MCOL."""
        with patch.object(service, "_load_private_key", return_value=b"fake-key"):
            with patch("jwt.encode", return_value="mock-jwt") as mock_encode:
                service._build_assertion()
                claims = mock_encode.call_args[0][0]
                assert claims["aud"] == "https://proda.humanservices.gov.au"

    def test_jwt_claims_include_token_aud(self, service):
        """token.aud custom claim must be present."""
        with patch.object(service, "_load_private_key", return_value=b"fake-key"):
            with patch("jwt.encode", return_value="mock-jwt") as mock_encode:
                service._build_assertion()
                claims = mock_encode.call_args[0][0]
                assert "token.aud" in claims
                assert claims["token.aud"] == "https://proda.humanservices.gov.au"

    def test_jwt_header_includes_kid(self, service):
        """kid header must be set to PRODA_DEVICE_NAME."""
        with patch.object(service, "_load_private_key", return_value=b"fake-key"):
            with patch("jwt.encode", return_value="mock-jwt") as mock_encode:
                service._build_assertion()
                call_kwargs = mock_encode.call_args[1]
                assert call_kwargs["headers"]["kid"] == "DavidTestLaptop2"

    def test_jwt_expiry_is_10_minutes(self, service):
        """exp must be now + 600 (10 minutes), not 5 minutes."""
        with patch.object(service, "_load_private_key", return_value=b"fake-key"):
            with patch("jwt.encode", return_value="mock-jwt") as mock_encode:
                service._build_assertion()
                claims = mock_encode.call_args[0][0]
                # exp - iat should be 600 (10 min)
                assert claims["exp"] - claims["iat"] == 600

    def test_jwt_sub_is_device_name(self, service):
        """sub must be PRODA_DEVICE_NAME."""
        with patch.object(service, "_load_private_key", return_value=b"fake-key"):
            with patch("jwt.encode", return_value="mock-jwt") as mock_encode:
                service._build_assertion()
                claims = mock_encode.call_args[0][0]
                assert claims["sub"] == "DavidTestLaptop2"


class TestTokenEndpointSelection:
    def test_vendor_env_uses_vendor_endpoint(self, config):
        config.APP_ENV = "vendor"
        service = ProdaAuthService(config=config)
        assert service._get_token_endpoint() == "https://vnd.proda.humanservices.gov.au/mga/sps/oauth/oauth20/token"

    def test_production_env_uses_prod_endpoint(self, config):
        config.APP_ENV = "production"
        service = ProdaAuthService(config=config)
        assert service._get_token_endpoint() == "https://proda.humanservices.gov.au/mga/sps/oauth/oauth20/token"


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
    async def test_post_body_includes_client_id(self, service):
        """POST body must include client_id parameter."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "access_token": "token",
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

                await service._acquire_token()

                post_call = mock_client.post.call_args
                assert post_call[1]["data"]["client_id"] == "soape-testing-client-v2"

    @pytest.mark.asyncio
    async def test_post_uses_vendor_endpoint(self, service):
        """Token request should use vendor endpoint when APP_ENV=vendor."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "access_token": "token",
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

                await service._acquire_token()

                post_call = mock_client.post.call_args
                assert post_call[0][0] == "https://vnd.proda.humanservices.gov.au/mga/sps/oauth/oauth20/token"

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
