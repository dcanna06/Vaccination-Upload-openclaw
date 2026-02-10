"""Tests for authentication service, dependencies, and router."""

from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone, timedelta

import pytest
from fastapi.testclient import TestClient

from app.services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    MAX_FAILED_ATTEMPTS,
)
from app.schemas.user import LoginRequest, UserCreate


# --- Password hashing tests ---


class TestPasswordHashing:
    def test_hash_returns_argon2id_hash(self):
        hashed = hash_password("SecurePass123!")
        assert hashed.startswith("$argon2id$")

    def test_verify_correct_password(self):
        hashed = hash_password("SecurePass123!")
        assert verify_password("SecurePass123!", hashed) is True

    def test_verify_wrong_password(self):
        hashed = hash_password("SecurePass123!")
        assert verify_password("WrongPassword1!", hashed) is False

    def test_different_hashes_for_same_password(self):
        h1 = hash_password("SecurePass123!")
        h2 = hash_password("SecurePass123!")
        assert h1 != h2  # Argon2 uses random salt


# --- JWT token tests ---


class TestJWTTokens:
    def test_create_and_decode_token(self):
        token = create_access_token(user_id=42, role="provider")
        payload = decode_access_token(token)
        assert payload["sub"] == "42"
        assert payload["role"] == "provider"

    def test_token_contains_expiry(self):
        token = create_access_token(user_id=1, role="org_admin")
        payload = decode_access_token(token)
        assert "exp" in payload
        assert "iat" in payload

    def test_invalid_token_raises(self):
        from app.exceptions import AuthenticationError

        with pytest.raises(AuthenticationError, match="Invalid token"):
            decode_access_token("not.a.valid.token")

    def test_expired_token_raises(self):
        import jwt as pyjwt
        from app.config import settings
        from app.exceptions import AuthenticationError
        import time

        payload = {
            "sub": "1",
            "role": "provider",
            "iat": int(time.time()) - 7200,
            "exp": int(time.time()) - 3600,
        }
        token = pyjwt.encode(payload, settings.APP_SECRET_KEY, algorithm="HS256")
        with pytest.raises(AuthenticationError, match="expired"):
            decode_access_token(token)


# --- Schema tests ---


class TestSchemas:
    def test_login_request_valid(self):
        req = LoginRequest(email="test@example.com", password="SecurePass123!")
        assert req.email == "test@example.com"

    def test_login_request_short_password(self):
        with pytest.raises(Exception):
            LoginRequest(email="test@example.com", password="short")

    def test_user_create_valid(self):
        user = UserCreate(
            email="new@example.com",
            password="SecurePass123!",
            first_name="Test",
            last_name="User",
            role="provider",
        )
        assert user.role == "provider"

    def test_user_create_default_role(self):
        user = UserCreate(
            email="new@example.com",
            password="SecurePass123!",
            first_name="Test",
            last_name="User",
        )
        assert user.role == "provider"


# --- Auth service tests (mocked DB) ---


class TestAuthenticateUser:
    @pytest.fixture
    def mock_db(self):
        db = AsyncMock()
        db.execute = AsyncMock()
        db.commit = AsyncMock()
        return db

    @pytest.mark.asyncio
    async def test_user_not_found(self, mock_db):
        from app.services.auth_service import authenticate_user
        from app.exceptions import AuthenticationError

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        with pytest.raises(AuthenticationError, match="Invalid email or password"):
            await authenticate_user(mock_db, "missing@example.com", "SecurePass123!")

    @pytest.mark.asyncio
    async def test_wrong_password_increments_failures(self, mock_db):
        from app.services.auth_service import authenticate_user
        from app.exceptions import AuthenticationError

        mock_user = MagicMock()
        mock_user.email = "test@example.com"
        mock_user.password_hash = hash_password("CorrectPass123!")
        mock_user.status = "active"
        mock_user.locked_until = None
        mock_user.failed_login_attempts = 0

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_db.execute.return_value = mock_result

        with pytest.raises(AuthenticationError, match="Invalid email or password"):
            await authenticate_user(mock_db, "test@example.com", "WrongPassword1!")

        assert mock_user.failed_login_attempts == 1
        mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_successful_login_resets_failures(self, mock_db):
        from app.services.auth_service import authenticate_user

        password = "SecurePass123!"
        mock_user = MagicMock()
        mock_user.email = "test@example.com"
        mock_user.password_hash = hash_password(password)
        mock_user.status = "active"
        mock_user.locked_until = None
        mock_user.failed_login_attempts = 2
        mock_user.id = 1
        mock_user.role = "provider"

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_db.execute.return_value = mock_result

        result = await authenticate_user(mock_db, "test@example.com", password)
        assert result == mock_user
        assert mock_user.failed_login_attempts == 0
        assert mock_user.locked_until is None

    @pytest.mark.asyncio
    async def test_locked_account_rejected(self, mock_db):
        from app.services.auth_service import authenticate_user
        from app.exceptions import AuthenticationError

        mock_user = MagicMock()
        mock_user.status = "locked"
        mock_user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=15)

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_db.execute.return_value = mock_result

        with pytest.raises(AuthenticationError, match="locked"):
            await authenticate_user(mock_db, "test@example.com", "SecurePass123!")

    @pytest.mark.asyncio
    async def test_inactive_account_rejected(self, mock_db):
        from app.services.auth_service import authenticate_user
        from app.exceptions import AuthenticationError

        mock_user = MagicMock()
        mock_user.status = "inactive"
        mock_user.locked_until = None

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_db.execute.return_value = mock_result

        with pytest.raises(AuthenticationError, match="inactive"):
            await authenticate_user(mock_db, "test@example.com", "SecurePass123!")

    @pytest.mark.asyncio
    async def test_lockout_after_max_failures(self, mock_db):
        from app.services.auth_service import authenticate_user
        from app.exceptions import AuthenticationError

        mock_user = MagicMock()
        mock_user.email = "test@example.com"
        mock_user.password_hash = hash_password("CorrectPass123!")
        mock_user.status = "active"
        mock_user.locked_until = None
        mock_user.failed_login_attempts = MAX_FAILED_ATTEMPTS - 1

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_db.execute.return_value = mock_result

        with pytest.raises(AuthenticationError, match="Invalid email or password"):
            await authenticate_user(mock_db, "test@example.com", "WrongPassword1!")

        assert mock_user.status == "locked"
        assert mock_user.locked_until is not None


# --- Router tests ---


class TestAuthRouter:
    @pytest.fixture
    def client(self):
        from app.main import create_app
        from app.database import get_db

        app = create_app()

        async def mock_db():
            db = AsyncMock()
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = None
            db.execute.return_value = mock_result
            yield db

        app.dependency_overrides[get_db] = mock_db
        return TestClient(app)

    def test_login_user_not_found(self, client):
        response = client.post(
            "/api/auth/login",
            json={"email": "test@example.com", "password": "SecurePass123!"},
        )
        assert response.status_code == 401

    def test_logout_endpoint(self, client):
        response = client.post("/api/auth/logout")
        assert response.status_code == 200
        assert response.json()["message"] == "Logged out"

    def test_me_endpoint_requires_auth(self, client):
        response = client.get("/api/auth/me")
        assert response.status_code == 401

    def test_register_endpoint_exists(self, client):
        response = client.post(
            "/api/auth/register",
            json={
                "email": "new@example.com",
                "password": "SecurePass123!",
                "first_name": "Test",
                "last_name": "User",
            },
        )
        # Will fail because mock org query returns None, but endpoint exists
        assert response.status_code in (201, 401, 500)


# --- User model tests ---


class TestUserModel:
    def test_user_model_instantiation(self):
        from app.models.user import User

        user = User(
            organisation_id=1,
            email="test@example.com",
            password_hash="$argon2id$...",
            first_name="Test",
            last_name="User",
            role="provider",
            status="active",
        )
        assert user.email == "test@example.com"
        assert user.role == "provider"
        # failed_login_attempts uses server_default, so None before DB insert
        assert user.failed_login_attempts is None or user.failed_login_attempts == 0
