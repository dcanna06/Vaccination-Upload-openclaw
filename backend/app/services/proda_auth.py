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
        """Build a signed JWT assertion for PRODA token request."""
        if not self._config.PRODA_JKS_BASE64:
            raise AuthenticationError("PRODA JKS keystore not configured")

        now = int(time.time())
        claims = {
            "iss": self._config.PRODA_MINOR_ID,
            "sub": self._config.PRODA_DEVICE_NAME,
            "aud": self._config.PRODA_AUDIENCE,
            "exp": now + 300,  # 5 minutes
            "iat": now,
            "jti": str(uuid4()),
        }

        # Load private key from JKS (base64 encoded)
        private_key = self._load_private_key()

        return jwt.encode(claims, private_key, algorithm="RS256")

    def _load_private_key(self) -> bytes:
        """Load private key from base64-encoded JKS keystore.

        Uses pyjks to extract the private key. Key is loaded into memory
        only — never written to disk.
        """
        try:
            import jks

            jks_bytes = base64.b64decode(self._config.PRODA_JKS_BASE64)
            keystore = jks.KeyStore.load(
                io.BytesIO(jks_bytes).read(),
                self._config.PRODA_JKS_PASSWORD,
            )

            alias = self._config.PRODA_KEY_ALIAS
            if alias not in keystore.private_keys:
                raise AuthenticationError(
                    f"Key alias '{alias}' not found in JKS keystore"
                )

            pk_entry = keystore.private_keys[alias]
            if not pk_entry.is_decrypted():
                pk_entry.decrypt(self._config.PRODA_JKS_PASSWORD)

            return pk_entry.pkey
        except ImportError:
            raise AuthenticationError("pyjks library not available")
        except AuthenticationError:
            raise
        except Exception as e:
            logger.error("jks_load_failed", error=str(e))
            raise AuthenticationError(f"Failed to load JKS keystore: {str(e)}")

    async def get_token(self) -> str:
        """Get a valid PRODA access token, refreshing if needed."""
        if self.is_token_valid:
            return self._access_token  # type: ignore[return-value]

        return await self._acquire_token()

    async def _acquire_token(self) -> str:
        """Acquire a new token from the PRODA token endpoint."""
        assertion = self._build_assertion()

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self._config.PRODA_TOKEN_ENDPOINT,
                    data={
                        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                        "assertion": assertion,
                    },
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
