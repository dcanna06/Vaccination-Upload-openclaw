"""Application configuration using Pydantic Settings.

All sensitive values are loaded from environment variables.
Never log secrets - use the mask_secret helper for log output.
"""

from pydantic import field_validator
from pydantic_settings import BaseSettings


def mask_secret(value: str) -> str:
    """Mask a secret value for safe logging — show first 4 chars only."""
    if len(value) <= 4:
        return "****"
    return value[:4] + "****"


class Settings(BaseSettings):
    # === Application ===
    APP_ENV: str = "vendor"  # vendor | production
    APP_PORT: int = 8000
    APP_SECRET_KEY: str = "change-me-to-a-random-64-char-string"
    FRONTEND_URL: str = "http://localhost:3000"

    # === Database ===
    DATABASE_URL: str = "postgresql+asyncpg://air_admin:airdev123@localhost:5432/air_vaccination"
    REDIS_URL: str = "redis://localhost:6379/0"

    # === PRODA B2B Authentication ===
    PRODA_ORG_ID: str = ""
    PRODA_DEVICE_NAME: str = ""
    PRODA_MINOR_ID: str = ""
    PRODA_JKS_BASE64: str = ""
    PRODA_JKS_PASSWORD: str = ""
    PRODA_KEY_ALIAS: str = ""
    PRODA_AUDIENCE: str = "https://medicareaustralia.gov.au/MCOL"
    PRODA_TOKEN_ENDPOINT: str = "https://proda.humanservices.gov.au/piaweb/api/b2b/v1/token"

    # === AIR API ===
    AIR_CLIENT_ID: str = ""  # X-IBM-Client-Id
    AIR_PRODUCT_ID: str = "AIRBulkVax 1.0"  # dhs-productId
    AIR_VENDOR_BASE_URL: str = ""
    AIR_PROD_BASE_URL: str = ""
    AIR_PROVIDER_NUMBER: str = ""  # Default information provider

    # === JWT / Auth ===
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_MAX_SESSION_HOURS: int = 8

    # === Logging ===
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"  # json | console

    model_config = {"env_file": ".env", "extra": "ignore"}

    @property
    def air_api_base_url(self) -> str:
        """Return the correct AIR API base URL for the current environment."""
        if self.APP_ENV == "production":
            return self.AIR_PROD_BASE_URL
        return self.AIR_VENDOR_BASE_URL

    @field_validator("APP_ENV")
    @classmethod
    def validate_app_env(cls, v: str) -> str:
        allowed = {"vendor", "production", "development"}
        if v not in allowed:
            raise ValueError(f"APP_ENV must be one of {allowed}, got '{v}'")
        return v


settings = Settings()
