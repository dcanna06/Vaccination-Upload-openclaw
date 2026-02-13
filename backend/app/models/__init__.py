"""ORM models — import all models so Alembic sees them."""

from app.models.base import Base, TimestampMixin
from app.models.audit import AuditLog
from app.models.clinic import Clinic
from app.models.clinic_resident import ClinicResident
from app.models.facility import Facility, user_facilities
from app.models.location import Location, LocationProvider
from app.models.message import Message
from app.models.notification import Notification
from app.models.organisation import Organisation
from app.models.resident import Resident, ResidentEligibility
from app.models.submission import SubmissionBatch, SubmissionRecord
from app.models.user import User

__all__ = [
    "Base",
    "TimestampMixin",
    "AuditLog",
    "Clinic",
    "ClinicResident",
    "Facility",
    "Location",
    "LocationProvider",
    "Message",
    "Notification",
    "Organisation",
    "Resident",
    "ResidentEligibility",
    "SubmissionBatch",
    "SubmissionRecord",
    "User",
    "user_facilities",
]
