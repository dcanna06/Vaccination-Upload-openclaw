"""Global error handling middleware for the FastAPI application."""

import structlog
from fastapi import Request
from fastapi.responses import JSONResponse

from app.exceptions import (
    AIRApiError,
    AppError,
    AuthenticationError,
    FileProcessingError,
    ValidationError,
)

# Re-export exception classes for backwards compatibility
__all__ = [
    "AppError",
    "ValidationError",
    "AuthenticationError",
    "FileProcessingError",
    "AIRApiError",
    "app_error_handler",
    "unhandled_error_handler",
]

logger = structlog.get_logger(__name__)


async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
    """Handle application-level errors."""
    logger.warning("app_error", error=exc.message, status_code=exc.status_code)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.message,
            "detail": exc.detail,
        },
    )


async def unhandled_error_handler(_request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected errors — log stack trace but don't expose it."""
    logger.error("unhandled_error", error=str(exc), exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "An unexpected error occurred."},
    )
