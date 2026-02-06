from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_ENV: str = "development"
    APP_PORT: int = 8000
    APP_SECRET_KEY: str = "change-me-to-a-random-64-char-string"
    FRONTEND_URL: str = "http://localhost:3000"

    DATABASE_URL: str = "postgresql+asyncpg://air_admin:airdev123@localhost:5432/air_vaccination"
    REDIS_URL: str = "redis://localhost:6379/0"

    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
