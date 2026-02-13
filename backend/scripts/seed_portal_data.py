"""Seed script for the Aged Care Vaccination Portal.

Populates the database with sample facilities, residents, eligibility,
clinics, clinic assignments, messages, and notifications.

Usage:
    cd backend && python -m scripts.seed_portal_data

Idempotent: checks for existing records before inserting.
"""

import asyncio
from datetime import date, datetime, timedelta, timezone

import structlog
from sqlalchemy import insert, select, text

from app.config import settings
from app.database import async_session_factory
from app.models.clinic import Clinic
from app.models.clinic_resident import ClinicResident
from app.models.facility import Facility, user_facilities
from app.models.message import Message
from app.models.notification import Notification
from app.models.resident import Resident, ResidentEligibility
from app.models.user import User

log = structlog.get_logger()

# ── Seed Data Definitions ───────────────────────────────────────────────

FACILITIES = [
    {
        "name": "Sunrise Aged Care",
        "address": "12 Harbour St, Sydney NSW 2000",
        "contact_person": "Helen Carter",
        "contact_phone": "02 9123 4567",
        "contact_email": "helen@sunriseac.com.au",
        "pharmacy_name": "Sunrise Pharmacy",
        "pharmacist_name": "Dr Sarah Kim",
    },
    {
        "name": "Sunny Acres",
        "address": "45 Wattle Rd, Melbourne VIC 3000",
        "contact_person": "James Wong",
        "contact_phone": "03 8765 4321",
        "contact_email": "james@sunnyacres.com.au",
        "pharmacy_name": "Sunny Pharmacy",
        "pharmacist_name": "Dr Peter Jones",
    },
    {
        "name": "Oceanview Residence",
        "address": "88 Marine Pde, Gold Coast QLD 4217",
        "contact_person": "Maria Santos",
        "contact_phone": "07 5555 1234",
        "contact_email": "maria@oceanview.com.au",
        "pharmacy_name": "Oceanview Pharmacy",
        "pharmacist_name": "Dr Linda Chen",
    },
    {
        "name": "Greenfield Lodge",
        "address": "3 Park Ave, Adelaide SA 5000",
        "contact_person": "Robert Brown",
        "contact_phone": "08 7000 9876",
        "contact_email": "robert@greenfieldlodge.com.au",
        "pharmacy_name": "Greenfield Pharmacy",
        "pharmacist_name": "Dr Michael Patel",
    },
    {
        "name": "Willowbrook Care",
        "address": "21 Creek Ln, Hobart TAS 7000",
        "contact_person": "Susan Nguyen",
        "contact_phone": "03 6200 5555",
        "contact_email": "susan@willowbrook.com.au",
        "pharmacy_name": "Willowbrook Pharmacy",
        "pharmacist_name": "Dr Emily Watson",
    },
]

RESIDENTS = [
    # Facility 0 (Sunrise) - 4 residents
    {"fac_idx": 0, "first_name": "Dorothy", "last_name": "Smith", "dob": "1935-03-15", "gender": "F", "medicare": "2123456789", "room": "101", "wing": "East", "gp": "Dr Adams"},
    {"fac_idx": 0, "first_name": "Harold", "last_name": "Jones", "dob": "1938-07-22", "gender": "M", "medicare": "2234567890", "room": "102", "wing": "East", "gp": "Dr Adams"},
    {"fac_idx": 0, "first_name": "Margaret", "last_name": "Williams", "dob": "1940-11-01", "gender": "F", "medicare": "2345678901", "room": "201", "wing": "West", "gp": "Dr Baker"},
    {"fac_idx": 0, "first_name": "Arthur", "last_name": "Brown", "dob": "1933-05-10", "gender": "M", "medicare": "2456789012", "room": "202", "wing": "West", "gp": "Dr Baker"},
    # Facility 1 (Sunny Acres) - 4 residents
    {"fac_idx": 1, "first_name": "Edith", "last_name": "Taylor", "dob": "1937-01-28", "gender": "F", "medicare": "3123456789", "room": "A1", "wing": "North", "gp": "Dr Clark"},
    {"fac_idx": 1, "first_name": "Frank", "last_name": "Wilson", "dob": "1936-09-14", "gender": "M", "medicare": "3234567890", "room": "A2", "wing": "North", "gp": "Dr Clark"},
    {"fac_idx": 1, "first_name": "Rose", "last_name": "Anderson", "dob": "1941-04-19", "gender": "F", "medicare": "3345678901", "room": "B1", "wing": "South", "gp": "Dr Davis"},
    {"fac_idx": 1, "first_name": "George", "last_name": "Thomas", "dob": "1934-12-05", "gender": "M", "medicare": "3456789012", "room": "B2", "wing": "South", "gp": "Dr Davis"},
    # Facility 2 (Oceanview) - 3 residents
    {"fac_idx": 2, "first_name": "Irene", "last_name": "Jackson", "dob": "1939-06-30", "gender": "F", "medicare": "4123456789", "room": "1A", "wing": "Ocean", "gp": "Dr Evans"},
    {"fac_idx": 2, "first_name": "Walter", "last_name": "White", "dob": "1932-08-17", "gender": "M", "medicare": "4234567890", "room": "1B", "wing": "Ocean", "gp": "Dr Evans"},
    {"fac_idx": 2, "first_name": "Betty", "last_name": "Harris", "dob": "1943-02-25", "gender": "F", "medicare": "4345678901", "room": "2A", "wing": "Garden", "gp": "Dr Foster"},
    # Facility 3 (Greenfield) - 3 residents
    {"fac_idx": 3, "first_name": "Norman", "last_name": "Martin", "dob": "1936-10-12", "gender": "M", "medicare": "5123456789", "room": "G1", "wing": "Main", "gp": "Dr Green"},
    {"fac_idx": 3, "first_name": "Gladys", "last_name": "Thompson", "dob": "1938-03-08", "gender": "F", "medicare": "5234567890", "room": "G2", "wing": "Main", "gp": "Dr Green"},
    {"fac_idx": 3, "first_name": "Albert", "last_name": "Garcia", "dob": "1935-11-20", "gender": "M", "medicare": "5345678901", "room": "G3", "wing": "Main", "gp": "Dr Hill"},
    # Facility 4 (Willowbrook) - 3 residents
    {"fac_idx": 4, "first_name": "Mabel", "last_name": "Martinez", "dob": "1940-07-04", "gender": "F", "medicare": "6123456789", "room": "W1", "wing": "Willow", "gp": "Dr Irving"},
    {"fac_idx": 4, "first_name": "Ernest", "last_name": "Robinson", "dob": "1937-05-16", "gender": "M", "medicare": "6234567890", "room": "W2", "wing": "Willow", "gp": "Dr Irving"},
    {"fac_idx": 4, "first_name": "Vera", "last_name": "Clark", "dob": "1942-09-23", "gender": "F", "medicare": "6345678901", "room": "W3", "wing": "Brook", "gp": "Dr King"},
]

VACCINE_CODES = ["COVID-19", "INFLUENZA", "PNEUMOCOCCAL", "SHINGLES"]

CLINICS = [
    {"fac_idx": 0, "name": "Flu Clinic March 2026", "date": "2026-03-15", "time": "09:00-12:00", "location": "Common Room", "vaccines": ["INFLUENZA"]},
    {"fac_idx": 0, "name": "COVID Booster March 2026", "date": "2026-03-20", "time": "10:00-14:00", "location": "Medical Wing", "vaccines": ["COVID-19"]},
    {"fac_idx": 1, "name": "Flu Clinic March 2026", "date": "2026-03-18", "time": "09:00-11:00", "location": "Activity Room", "vaccines": ["INFLUENZA"]},
    {"fac_idx": 2, "name": "Multi-Vaccine Clinic April 2026", "date": "2026-04-01", "time": "08:30-13:00", "location": "Dining Hall", "vaccines": ["INFLUENZA", "PNEUMOCOCCAL"]},
    {"fac_idx": 3, "name": "Flu & Shingles April 2026", "date": "2026-04-10", "time": "09:00-12:00", "location": "Rec Room", "vaccines": ["INFLUENZA", "SHINGLES"]},
    {"fac_idx": 4, "name": "COVID Clinic April 2026", "date": "2026-04-15", "time": "10:00-15:00", "location": "Main Hall", "vaccines": ["COVID-19"]},
]

TEST_USERS = [
    {"email": "nurse_mgr@test.local", "role": "org_admin", "first_name": "Nurse", "last_name": "Manager"},
    {"email": "pharmacist@test.local", "role": "provider", "first_name": "Test", "last_name": "Pharmacist"},
    {"email": "viewer@test.local", "role": "read_only", "first_name": "Read", "last_name": "Only"},
]


async def seed() -> None:
    """Run the full seed pipeline."""
    async with async_session_factory() as db:
        # ── 1. Get or create organisation ─────────────────────────────
        org_result = await db.execute(
            select(text("id")).select_from(text("organisations")).limit(1)
        )
        org_row = org_result.first()
        if org_row is None:
            log.error("seed.no_organisation", msg="No organisation found. Run Alembic migrations first.")
            return
        org_id = org_row[0]
        log.info("seed.org_found", organisation_id=org_id)

        # ── 2. Test users ─────────────────────────────────────────────
        user_ids: dict[str, int] = {}
        for u in TEST_USERS:
            existing = await db.execute(
                select(User).where(User.email == u["email"])
            )
            user = existing.scalar_one_or_none()
            if user is None:
                # Use a dummy hash — these are test users only
                user = User(
                    organisation_id=org_id,
                    email=u["email"],
                    password_hash="$argon2id$v=19$m=65536,t=3,p=4$SEEDDATA$dummyhash",
                    first_name=u["first_name"],
                    last_name=u["last_name"],
                    role=u["role"],
                    status="active",
                )
                db.add(user)
                await db.flush()
                log.info("seed.user_created", email=u["email"], user_id=user.id)
            else:
                log.info("seed.user_exists", email=u["email"], user_id=user.id)
            user_ids[u["email"]] = user.id

        # ── 3. Facilities ─────────────────────────────────────────────
        facility_objs: list[Facility] = []
        for fac_data in FACILITIES:
            existing = await db.execute(
                select(Facility).where(
                    Facility.name == fac_data["name"],
                    Facility.organisation_id == org_id,
                )
            )
            fac = existing.scalar_one_or_none()
            if fac is None:
                fac = Facility(organisation_id=org_id, **fac_data)
                db.add(fac)
                await db.flush()
                log.info("seed.facility_created", name=fac.name, facility_id=fac.id)
            else:
                log.info("seed.facility_exists", name=fac.name, facility_id=fac.id)
            facility_objs.append(fac)

        # Link all test users to all facilities
        for uid in user_ids.values():
            for fac in facility_objs:
                existing_link = await db.execute(
                    select(user_facilities).where(
                        user_facilities.c.user_id == uid,
                        user_facilities.c.facility_id == fac.id,
                    )
                )
                if existing_link.first() is None:
                    await db.execute(
                        insert(user_facilities).values(
                            user_id=uid, facility_id=fac.id
                        )
                    )

        # ── 4. Residents ──────────────────────────────────────────────
        resident_objs: list[Resident] = []
        for r_data in RESIDENTS:
            fac = facility_objs[r_data["fac_idx"]]
            existing = await db.execute(
                select(Resident).where(
                    Resident.facility_id == fac.id,
                    Resident.first_name == r_data["first_name"],
                    Resident.last_name == r_data["last_name"],
                )
            )
            res = existing.scalar_one_or_none()
            if res is None:
                res = Resident(
                    facility_id=fac.id,
                    first_name=r_data["first_name"],
                    last_name=r_data["last_name"],
                    date_of_birth=date.fromisoformat(r_data["dob"]),
                    gender=r_data["gender"],
                    medicare_number=r_data.get("medicare"),
                    room=r_data.get("room"),
                    wing=r_data.get("wing"),
                    gp_name=r_data.get("gp"),
                )
                db.add(res)
                await db.flush()
                log.info("seed.resident_created", name=f"{res.first_name} {res.last_name}", resident_id=res.id)
            else:
                log.info("seed.resident_exists", name=f"{res.first_name} {res.last_name}", resident_id=res.id)
            resident_objs.append(res)

        # ── 5. Eligibility ────────────────────────────────────────────
        for idx, res in enumerate(resident_objs):
            for vc in VACCINE_CODES:
                existing = await db.execute(
                    select(ResidentEligibility).where(
                        ResidentEligibility.resident_id == res.id,
                        ResidentEligibility.vaccine_code == vc,
                    )
                )
                if existing.scalar_one_or_none() is not None:
                    continue
                # Alternate due/overdue to create realistic data
                is_due = idx % 3 != 0
                is_overdue = idx % 5 == 0
                due_date = date.today() + timedelta(days=30 * (idx % 4))
                elig = ResidentEligibility(
                    resident_id=res.id,
                    vaccine_code=vc,
                    is_due=is_due,
                    is_overdue=is_overdue,
                    due_date=due_date if is_due else None,
                    dose_number=(idx % 3) + 1,
                    last_synced_at=datetime.now(timezone.utc) - timedelta(days=idx),
                )
                db.add(elig)

        # ── 6. Clinics ────────────────────────────────────────────────
        clinic_objs: list[Clinic] = []
        creator_id = user_ids.get("pharmacist@test.local") or list(user_ids.values())[0]
        for c_data in CLINICS:
            fac = facility_objs[c_data["fac_idx"]]
            existing = await db.execute(
                select(Clinic).where(
                    Clinic.facility_id == fac.id,
                    Clinic.name == c_data["name"],
                )
            )
            clinic = existing.scalar_one_or_none()
            if clinic is None:
                clinic = Clinic(
                    facility_id=fac.id,
                    name=c_data["name"],
                    clinic_date=date.fromisoformat(c_data["date"]),
                    time_range=c_data["time"],
                    location=c_data["location"],
                    pharmacist_name=fac.pharmacist_name,
                    vaccines=c_data["vaccines"],
                    status="upcoming",
                    created_by=creator_id,
                )
                db.add(clinic)
                await db.flush()
                log.info("seed.clinic_created", name=clinic.name, clinic_id=clinic.id)
            else:
                log.info("seed.clinic_exists", name=clinic.name, clinic_id=clinic.id)
            clinic_objs.append(clinic)

        # ── 7. Clinic-Resident assignments ────────────────────────────
        # Assign residents from matching facility to each clinic
        for c_idx, clinic in enumerate(clinic_objs):
            c_data = CLINICS[c_idx]
            fac_idx = c_data["fac_idx"]
            fac_residents = [
                r for r_data, r in zip(RESIDENTS, resident_objs)
                if r_data["fac_idx"] == fac_idx
            ]
            for vaccine in c_data["vaccines"]:
                for res in fac_residents:
                    existing = await db.execute(
                        select(ClinicResident).where(
                            ClinicResident.clinic_id == clinic.id,
                            ClinicResident.resident_id == res.id,
                            ClinicResident.vaccine_code == vaccine,
                        )
                    )
                    if existing.scalar_one_or_none() is not None:
                        continue
                    cr = ClinicResident(
                        clinic_id=clinic.id,
                        resident_id=res.id,
                        vaccine_code=vaccine,
                        is_eligible=True,
                        consent_status="consented",
                        consented_at=datetime.now(timezone.utc) - timedelta(days=5),
                    )
                    db.add(cr)

        # ── 8. Messages ───────────────────────────────────────────────
        nurse_id = user_ids.get("nurse_mgr@test.local") or list(user_ids.values())[0]
        pharm_id = user_ids.get("pharmacist@test.local") or list(user_ids.values())[0]

        sample_messages = [
            (0, nurse_id, "org_admin", "Hi, we have 4 residents ready for the flu clinic next week."),
            (0, pharm_id, "provider", "Thanks Helen. I will bring the vaccines on the 15th. Please confirm consent forms are ready."),
            (0, nurse_id, "org_admin", "All consents have been collected. See you then!"),
            (1, nurse_id, "org_admin", "Can we schedule a pneumococcal clinic for April?"),
            (1, pharm_id, "provider", "Sure, I will check stock availability and get back to you."),
            (2, nurse_id, "org_admin", "Two new admissions this week. Will need eligibility checks."),
        ]

        for fac_idx, sender_id, sender_role, body in sample_messages:
            fac = facility_objs[fac_idx]
            existing = await db.execute(
                select(Message).where(
                    Message.facility_id == fac.id,
                    Message.body == body,
                )
            )
            if existing.scalar_one_or_none() is None:
                msg = Message(
                    facility_id=fac.id,
                    sender_id=sender_id,
                    sender_role=sender_role,
                    body=body,
                )
                db.add(msg)

        # ── 9. Notifications ──────────────────────────────────────────
        sample_notifications = [
            (nurse_id, "clinic_scheduled", "Flu Clinic March 2026 scheduled at Sunrise Aged Care"),
            (nurse_id, "eligibility_due", "3 residents overdue for COVID-19 booster at Sunrise Aged Care"),
            (pharm_id, "clinic_scheduled", "You have been assigned to Flu Clinic March 2026 at Sunrise Aged Care"),
            (pharm_id, "message", "New message from Helen Carter at Sunrise Aged Care"),
            (nurse_id, "resident_added", "New resident Dorothy Smith added to Sunrise Aged Care"),
        ]

        for uid, ntype, title in sample_notifications:
            existing = await db.execute(
                select(Notification).where(
                    Notification.user_id == uid,
                    Notification.title == title,
                )
            )
            if existing.scalar_one_or_none() is None:
                notif = Notification(
                    user_id=uid,
                    type=ntype,
                    title=title,
                    metadata_={"source": "seed_script"},
                )
                db.add(notif)

        await db.commit()
        log.info("seed.complete", msg="All portal seed data inserted successfully")


if __name__ == "__main__":
    asyncio.run(seed())
