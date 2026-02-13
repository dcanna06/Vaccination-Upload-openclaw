"""Message / chat endpoints for the Aged Care Portal."""

import structlog
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.facility import Facility, user_facilities
from app.models.message import Message
from app.models.user import User
from app.schemas.message import MessageCreate, MessageResponse, ThreadResponse

log = structlog.get_logger()

router = APIRouter(prefix="/api/v1/portals/messages", tags=["portal-messages"])


@router.get("/threads", response_model=list[ThreadResponse])
async def list_threads(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ThreadResponse]:
    """List message threads (one per facility) for the current user."""
    # Get facilities the user can see
    if user.role in ("super_admin", "org_admin"):
        fac_stmt = select(Facility.id, Facility.name).where(
            Facility.organisation_id == user.organisation_id
        )
    else:
        fac_stmt = (
            select(Facility.id, Facility.name)
            .join(user_facilities, user_facilities.c.facility_id == Facility.id)
            .where(user_facilities.c.user_id == user.id)
        )

    fac_result = await db.execute(fac_stmt)
    facilities = {row.id: row.name for row in fac_result.all()}

    if not facilities:
        return []

    # Get latest message per facility
    latest_msg = (
        select(
            Message.facility_id,
            func.max(Message.created_at).label("last_at"),
        )
        .where(Message.facility_id.in_(facilities.keys()))
        .group_by(Message.facility_id)
        .subquery()
    )

    result = await db.execute(
        select(Message)
        .join(
            latest_msg,
            (Message.facility_id == latest_msg.c.facility_id)
            & (Message.created_at == latest_msg.c.last_at),
        )
        .order_by(Message.created_at.desc())
    )
    messages = result.scalars().all()

    threads = []
    for msg in messages:
        threads.append(
            ThreadResponse(
                facility_id=msg.facility_id,
                facility_name=facilities.get(msg.facility_id, "Unknown"),
                last_message=msg.body[:100],
                last_message_at=msg.created_at,
            )
        )
    return threads


@router.get("", response_model=list[MessageResponse])
async def list_messages(
    facility_id: int,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[MessageResponse]:
    """Get messages for a specific facility (thread)."""
    result = await db.execute(
        select(Message)
        .where(Message.facility_id == facility_id)
        .order_by(Message.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    messages = result.scalars().all()

    # Build sender name lookup
    sender_ids = {m.sender_id for m in messages}
    sender_names: dict[int, str] = {}
    if sender_ids:
        user_result = await db.execute(
            select(User).where(User.id.in_(sender_ids))
        )
        for u in user_result.scalars().all():
            sender_names[u.id] = f"{u.first_name} {u.last_name}"

    return [
        MessageResponse(
            id=m.id,
            facility_id=m.facility_id,
            sender_id=m.sender_id,
            sender_role=m.sender_role,
            sender_name=sender_names.get(m.sender_id, "Unknown"),
            body=m.body,
            created_at=m.created_at,
        )
        for m in messages
    ]


@router.post("", response_model=MessageResponse, status_code=201)
async def send_message(
    body: MessageCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MessageResponse:
    """Send a message in a facility's thread."""
    # Verify facility exists
    fac_result = await db.execute(
        select(Facility).where(Facility.id == body.facility_id)
    )
    if fac_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Facility not found")

    message = Message(
        facility_id=body.facility_id,
        sender_id=user.id,
        sender_role=user.role,
        body=body.body,
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)

    log.info(
        "message.sent",
        message_id=message.id,
        facility_id=message.facility_id,
        sender_id=user.id,
    )

    return MessageResponse(
        id=message.id,
        facility_id=message.facility_id,
        sender_id=message.sender_id,
        sender_role=message.sender_role,
        sender_name=f"{user.first_name} {user.last_name}",
        body=message.body,
        created_at=message.created_at,
    )
