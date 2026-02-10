"""Authentication service — Argon2id hashing, JWT token management."""

import time
from datetime import datetime, timezone

import jwt
import structlog
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.exceptions import AuthenticationError
from app.models.user import User

logger = structlog.get_logger()

# Argon2id hasher with secure defaults
_hasher = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=4,
    hash_len=32,
    salt_len=16,
)

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_SECONDS = 1800  # 30 minutes


def hash_password(password: str) -> str:
    """Hash a password with Argon2id."""
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against an Argon2id hash."""
    try:
        return _hasher.verify(password_hash, password)
    except VerifyMismatchError:
        return False


def create_access_token(user_id: int, role: str) -> str:
    """Create a JWT access token."""
    now = int(time.time())
    payload = {
        "sub": str(user_id),
        "role": role,
        "iat": now,
        "exp": now + (settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60),
    }
    return jwt.encode(payload, settings.APP_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT access token."""
    try:
        return jwt.decode(
            token,
            settings.APP_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except jwt.ExpiredSignatureError:
        raise AuthenticationError("Token has expired")
    except jwt.InvalidTokenError:
        raise AuthenticationError("Invalid token")


async def authenticate_user(
    db: AsyncSession, email: str, password: str
) -> User:
    """Authenticate a user by email and password. Returns User or raises AuthenticationError."""
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None:
        logger.warning("login_failed", reason="user_not_found")
        raise AuthenticationError("Invalid email or password")

    # Check lockout
    if user.locked_until and user.locked_until > datetime.now(timezone.utc):
        logger.warning("login_failed", reason="account_locked", user_id=user.id)
        raise AuthenticationError("Account is locked. Try again later.")

    # Check status
    if user.status not in ("active", "pending"):
        logger.warning("login_failed", reason="account_inactive", user_id=user.id)
        raise AuthenticationError("Account is inactive")

    # Verify password
    if not verify_password(password, user.password_hash):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
            user.locked_until = datetime.now(timezone.utc).replace(
                second=user.locked_until.second if user.locked_until else 0
            )
            # Set lockout 30 min from now
            from datetime import timedelta

            user.locked_until = datetime.now(timezone.utc) + timedelta(seconds=LOCKOUT_SECONDS)
            user.status = "locked"
            logger.warning("account_locked", user_id=user.id, attempts=user.failed_login_attempts)
        await db.commit()
        raise AuthenticationError("Invalid email or password")

    # Success — reset counters
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login = datetime.now(timezone.utc)
    if user.status == "locked":
        user.status = "active"
    await db.commit()

    logger.info("login_success", user_id=user.id, role=user.role)
    return user
