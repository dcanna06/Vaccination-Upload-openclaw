"""Shared fixtures for unit tests."""

from unittest.mock import MagicMock

import pytest

from app.dependencies import get_current_user
from app.main import app


def _mock_user():
    """Create a mock User object for authenticated test requests."""
    user = MagicMock()
    user.id = 1
    user.organisation_id = 1
    user.email = "test@example.com"
    user.first_name = "Test"
    user.last_name = "User"
    user.role = "admin"
    user.status = "active"
    user.default_location_id = None
    return user


@pytest.fixture(autouse=True)
def override_auth():
    """Override get_current_user for all unit tests so protected endpoints work."""
    mock_user = _mock_user()

    async def _override():
        return mock_user

    app.dependency_overrides[get_current_user] = _override
    yield mock_user
    app.dependency_overrides.pop(get_current_user, None)
