"""FastAPI application factory for AIR Bulk Vaccination Upload API."""

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.middleware.error_handler import (
    AppError,
    app_error_handler,
    unhandled_error_handler,
)
from app.middleware.request_logger import RequestLoggerMiddleware
from app.middleware.security import RateLimitMiddleware, SecurityHeadersMiddleware
from app.routers import encounters_update, exemptions, health, indicators, individuals, locations, providers, submit, submission_results, template, upload, validate


def configure_structlog() -> None:
    """Configure structlog for structured JSON logging."""
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.stdlib.add_log_level,
            structlog.stdlib.add_logger_name,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer()
            if settings.LOG_FORMAT == "json"
            else structlog.dev.ConsoleRenderer(),
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    configure_structlog()

    app = FastAPI(
        title="AIR Bulk Vaccination Upload API",
        description="Backend API for uploading vaccination records to the Australian Immunisation Register",
        version="0.1.0",
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.FRONTEND_URL],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Security headers
    app.add_middleware(SecurityHeadersMiddleware)

    # Rate limiting
    app.add_middleware(RateLimitMiddleware, requests_per_minute=120)

    # Request logging
    app.add_middleware(RequestLoggerMiddleware)

    # Error handlers
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(Exception, unhandled_error_handler)

    # Routers
    app.include_router(health.router)
    app.include_router(upload.router)
    app.include_router(template.router)
    app.include_router(validate.router)
    app.include_router(submit.router)
    app.include_router(submission_results.router)
    app.include_router(locations.router)
    app.include_router(providers.router)
    app.include_router(individuals.router)
    app.include_router(encounters_update.router)
    app.include_router(exemptions.router)
    app.include_router(indicators.router)

    return app


app = create_app()
