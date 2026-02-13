"""FastAPI application factory for AIR Bulk Vaccination Upload API."""

import asyncio
from contextlib import asynccontextmanager

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
from app.routers import auth, bulk_history, encounters_update, exemptions, health, indicators, individuals, locations, providers, submit, submission_results, template, upload, validate
from app.routers import portal_clinics, portal_eligibility, portal_facilities, portal_messages, portal_notifications, portal_residents


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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start background cleanup tasks for in-memory PII stores."""
    from app.routers.submit import _cleanup_expired_submissions
    from app.routers.bulk_history import _cleanup_expired_requests

    task1 = asyncio.create_task(_cleanup_expired_submissions())
    task2 = asyncio.create_task(_cleanup_expired_requests())
    yield
    task1.cancel()
    task2.cancel()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    configure_structlog()

    app = FastAPI(
        title="AIR Bulk Vaccination Upload API",
        description="Backend API for uploading vaccination records to the Australian Immunisation Register",
        version="1.2.0",
        lifespan=lifespan,
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
    app.include_router(auth.router)
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
    app.include_router(bulk_history.router)

    # Portal routers (Aged Care Vaccination Portal)
    app.include_router(portal_facilities.router)
    app.include_router(portal_residents.router)
    app.include_router(portal_clinics.router)
    app.include_router(portal_messages.router)
    app.include_router(portal_eligibility.router)
    app.include_router(portal_notifications.router)

    return app


app = create_app()
