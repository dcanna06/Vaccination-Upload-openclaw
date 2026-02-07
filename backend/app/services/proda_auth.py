"""PRODA B2B authentication service for AIR API access.

Implements JWT-based token acquisition per PRODA B2B Unattended Developers Guide.
Tokens are held in-memory only — never persisted to database or disk.
"""

import base64
import io
import time
from uuid import uuid4

import httpx
import jwt
import structlog

from app.config import Settings, settings
from app.middleware.error_handler import AuthenticationError

logger = structlog.get_logger(__name__)

# Refresh at 50 minutes (before 60-min expiry)
TOKEN_REFRESH_BUFFER_SECONDS = 600


class ProdaAuthService:
    """Manages PRODA B2B token acquisition and in-memory caching."""

    def __init__(self, config: Settings | None = None) -> None:
        self._config = config or settings
        self._access_token: str | None = None
        self._token_expires_at: float = 0.0

    @property
    def is_token_valid(self) -> bool:
        """Check if the cached token is still valid (with refresh buffer)."""
        if not self._access_token:
            return False
        return time.time() < (self._token_expires_at - TOKEN_REFRESH_BUFFER_SECONDS)

    def _build_assertion(self) -> str:
        """Build a signed JWT assertion for PRODA token request.

        JWT structure proven against vendor environment 2026-02-08:
        - header: alg=RS256, kid=PRODA_DEVICE_NAME
        - payload: iss=ORG_ID, sub=DEVICE_NAME, aud=proda URL,
          token.aud=ACCESS_TOKEN_AUDIENCE, exp=10min
        """
        if not self._config.PRODA_JKS_BASE64 and not self._config.PRODA_JKS_FILE_PATH:
            raise AuthenticationError("PRODA JKS keystore not configured")

        now = int(time.time())
        claims = {
            "iss": self._config.PRODA_ORG_ID,
            "sub": self._config.PRODA_DEVICE_NAME,
            "aud": self._config.PRODA_JWT_AUDIENCE,
            "token.aud": self._config.PRODA_ACCESS_TOKEN_AUDIENCE,
            "exp": now + 600,  # 10 minutes
            "iat": now,
            "jti": str(uuid4()),
        }

        headers = {
            "kid": self._config.PRODA_DEVICE_NAME,
        }

        # Load private key from JKS
        private_key = self._load_private_key()

        return jwt.encode(claims, private_key, algorithm="RS256", headers=headers)

    def _load_private_key(self) -> bytes:
        """Load private key from keystore (JKS or PKCS12) or base64-encoded.

        Supports both JKS (pyjks) and PKCS12 (cryptography) formats.
        Key is loaded into memory only — never written to disk.
        """
        try:
            if self._config.PRODA_JKS_FILE_PATH:
                with open(self._config.PRODA_JKS_FILE_PATH, "rb") as f:
                    store_bytes = f.read()
            elif self._config.PRODA_JKS_BASE64:
                store_bytes = base64.b64decode(self._config.PRODA_JKS_BASE64)
            else:
                raise AuthenticationError("No keystore configured")

            # Detect format: JKS starts with FEEDFEED, PKCS12 starts with 3082
            if store_bytes[:4] in (b'\xfe\xed\xfe\xed', b'\xce\xce\xce\xce'):
                return self._load_from_jks(store_bytes)
            else:
                return self._load_from_pkcs12(store_bytes)

        except AuthenticationError:
            raise
        except Exception as e:
            logger.error("keystore_load_failed", error=str(e))
            raise AuthenticationError(f"Failed to load keystore: {str(e)}")

    def _load_from_jks(self, store_bytes: bytes) -> bytes:
        """Extract private key from JKS keystore bytes."""
        import jks

        keystore = jks.KeyStore.loads(store_bytes, self._config.PRODA_JKS_PASSWORD)
        alias = self._config.PRODA_KEY_ALIAS
        if alias not in keystore.private_keys:
            raise AuthenticationError(f"Key alias '{alias}' not found in JKS keystore")

        pk_entry = keystore.private_keys[alias]
        if not pk_entry.is_decrypted():
            pk_entry.decrypt(self._config.PRODA_JKS_PASSWORD)
        return pk_entry.pkey

    def _load_from_pkcs12(self, store_bytes: bytes) -> bytes:
        """Extract private key from PKCS12 keystore bytes."""
        from cryptography.hazmat.primitives.serialization import (
            Encoding,
            NoEncryption,
            PrivateFormat,
            pkcs12,
        )

        private_key, _cert, _chain = pkcs12.load_key_and_certificates(
            store_bytes, self._config.PRODA_JKS_PASSWORD.encode("utf-8")
        )
        if private_key is None:
            raise AuthenticationError("No private key found in PKCS12 keystore")

        return private_key.private_bytes(Encoding.PEM, PrivateFormat.PKCS8, NoEncryption())

    async def get_token(self) -> str:
        """Get a valid PRODA access token, refreshing if needed."""
        if self.is_token_valid:
            return self._access_token  # type: ignore[return-value]

        return await self._acquire_token()

    def _get_token_endpoint(self) -> str:
        """Return the correct PRODA token endpoint for the current environment."""
        if self._config.APP_ENV == "production":
            return self._config.PRODA_TOKEN_ENDPOINT_PROD
        return self._config.PRODA_TOKEN_ENDPOINT_VENDOR

    async def _acquire_token(self) -> str:
        """Acquire a new token from the PRODA token endpoint."""
        assertion = self._build_assertion()
        endpoint = self._get_token_endpoint()

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    endpoint,
                    data={
                        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                        "assertion": assertion,
                        "client_id": self._config.PRODA_CLIENT_ID,
                    },
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                    timeout=30.0,
                )
                response.raise_for_status()
            except httpx.HTTPStatusError as e:
                logger.error(
                    "proda_token_failed",
                    status_code=e.response.status_code,
                )
                raise AuthenticationError(
                    f"PRODA token request failed: HTTP {e.response.status_code}"
                )
            except httpx.RequestError as e:
                logger.error("proda_token_request_error", error=str(e))
                raise AuthenticationError(
                    f"PRODA token request error: {str(e)}"
                )

        token_data = response.json()
        self._access_token = token_data["access_token"]
        expires_in = token_data.get("expires_in", 3600)
        self._token_expires_at = time.time() + expires_in

        logger.info(
            "proda_token_acquired",
            expires_in=expires_in,
            token_type=token_data.get("token_type"),
        )

        return self._access_token  # type: ignore[return-value]

    def get_authorization_header(self) -> str:
        """Return the Authorization header value. Raises if no token cached."""
        if not self._access_token:
            raise AuthenticationError("No PRODA token available — call get_token() first")
        return f"Bearer {self._access_token}"

    def clear_token(self) -> None:
        """Clear the cached token (e.g., after 401 from AIR API)."""
        self._access_token = None
        self._token_expires_at = 0.0


# Singleton instance
proda_auth = ProdaAuthService()
