"""Authentication router — login, logout, register, me."""

import structlog
from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.exceptions import AuthenticationError
from app.models.user import User
from app.schemas.user import (
    LoginRequest,
    LoginResponse,
    UserCreate,
    UserResponse,
)
from app.services.auth_service import (
    authenticate_user,
    create_access_token,
    hash_password,
)

logger = structlog.get_logger()

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(
    body: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    """Authenticate user and set HttpOnly cookie."""
    user = await authenticate_user(db, body.email, body.password)
    token = create_access_token(user.id, user.role)

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.APP_ENV != "vendor",
        samesite="lax",
        max_age=settings.JWT_MAX_SESSION_HOURS * 3600,
        path="/",
    )

    return LoginResponse(access_token=token)


@router.post("/logout")
async def logout(response: Response) -> dict:
    """Clear the auth cookie."""
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=settings.APP_ENV != "vendor",
        samesite="lax",
        path="/",
    )
    return {"message": "Logged out"}


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Register a new user account."""
    # Check for existing email
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none() is not None:
        raise AuthenticationError("Email already registered")

    # Get default organisation (first one)
    from app.models.organisation import Organisation

    org_result = await db.execute(
        select(Organisation).where(Organisation.status == "active").limit(1)
    )
    org = org_result.scalar_one_or_none()
    if org is None:
        raise AuthenticationError("No active organisation found")

    user = User(
        organisation_id=org.id,
        email=body.email,
        password_hash=hash_password(body.password),
        first_name=body.first_name,
        last_name=body.last_name,
        phone=body.phone,
        ahpra_number=body.ahpra_number,
        role=body.role,
        status="active",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    logger.info("user_registered", user_id=user.id, role=user.role)
    return UserResponse(
        id=str(user.id),
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        phone=user.phone,
        ahpra_number=user.ahpra_number,
        role=user.role,
        status=user.status,
    )


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)) -> UserResponse:
    """Get current authenticated user."""
    return UserResponse(
        id=str(user.id),
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        phone=user.phone,
        ahpra_number=user.ahpra_number,
        role=user.role,
        status=user.status,
    )
