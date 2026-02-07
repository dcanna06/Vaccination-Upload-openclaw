"""Shared fixtures for integration/E2E tests against vendor environment.

Test data from Services Australia vendor test data issued 1/08/2025
for Warrandyte Healthcare Pty Ltd.
"""

import pytest

from app.config import settings
from app.services.proda_auth import ProdaAuthService


def _has_vendor_config() -> bool:
    """Check if vendor environment credentials are fully configured."""
    return bool(
        settings.PRODA_ORG_ID
        and settings.PRODA_DEVICE_NAME
        and (settings.PRODA_JKS_BASE64 or settings.PRODA_JKS_FILE_PATH)
        and settings.AIR_CLIENT_ID
    )


skip_no_vendor = pytest.mark.skipif(
    not _has_vendor_config(),
    reason="Vendor environment credentials not configured in .env",
)


# === Vendor Credentials ===

VENDOR_PROVIDERS = {
    "BOWLING": {"providerNumber": "2448141T", "firstName": "GRAHAM", "lastName": "BOWLING"},
    "BISHOP": {"providerNumber": "2448151L", "firstName": "FELICITY", "lastName": "BISHOP"},
}

VENDOR_AIR_PROVIDERS = {
    "AMELIA": {"providerNumber": "N56725J", "name": "AMELIA PRACTITIONERS65"},
    "DANIELLE": {"providerNumber": "T59433Y", "name": "DANIELLE PARTNERS16"},
}

VENDOR_SCHOOL_IDS = ["40001", "41000", "43350"]

VENDOR_HPIO = "8003623233370062"
VENDOR_HPII = "8003611566712356"


# === Section 5 — Updatable Test Patients ===

SECTION5_PATIENTS = {
    "SCRIVENER": {
        "medicareCardNumber": "3951333161",
        "medicareIRN": "1",
        "lastName": "SCRIVENER",
        "firstName": "Tandra",
        "dateOfBirth": "1961-01-19",
        "gender": "F",
        "postCode": "3214",
    },
    "MAHER": {
        "medicareCardNumber": "3951333251",
        "medicareIRN": "1",
        "lastName": "MAHER",
        "firstName": "Lyndon",
        "dateOfBirth": "1962-09-27",
        "gender": "M",
        "postCode": "3825",
    },
    "MCBEAN": {
        "medicareCardNumber": "5951138021",
        "medicareIRN": "1",
        "lastName": "MCBEAN",
        "firstName": "Arla",
        "dateOfBirth": "1971-03-09",
        "gender": "F",
        "postCode": "5432",
    },
    "SHEPPARD": {
        "medicareCardNumber": "4951650791",
        "medicareIRN": "1",
        "lastName": "SHEPPARD",
        "firstName": "Phoebe",
        "dateOfBirth": "1999-08-19",
        "gender": "F",
        "postCode": "4313",
    },
}


# === Section 7 — Alternate Enrolment Patients ===

SECTION7_PATIENTS = {
    "ONLY_NAME": {
        "medicareCardNumber": "2297460337",
        "medicareIRN": "1",
        "lastName": "Devo",
        "firstName": "Onlyname",
        "dateOfBirth": "1980-01-01",
        "gender": "M",
        "postCode": "2000",
    },
    "LONG_NAME": {
        "medicareCardNumber": "3950921522",
        "medicareIRN": "1",
        "lastName": "Weatherby-Wilkinson",
        "firstName": "Harriett-Jane",
        "dateOfBirth": "1992-03-12",
        "gender": "F",
        "postCode": "3006",
    },
    "UNKNOWN_ON_MEDICARE": {
        "medicareCardNumber": "2398125261",
        "medicareIRN": "1",
        "lastName": "Doe",
        "firstName": "John",
        "dateOfBirth": "1979-09-13",
        "gender": "M",
        "postCode": "2000",
    },
    "DECEASED": {
        "medicareCardNumber": "2296510128",
        "medicareIRN": "4",
        "lastName": "Jones",
        "firstName": "Sad",
        "dateOfBirth": "1964-09-15",
        "gender": "M",
        "postCode": "2904",
    },
}


# === Section 8 — IHI Patients (READ ONLY) ===

SECTION8_IHI_PATIENTS = {
    "AUTH_RELEASE": {
        "ihiNumber": "8003608666929138",
        "medicareCardNumber": "3951149822",
        "medicareIRN": "1",
        "lastName": "Hayes",
        "firstName": "Gwen",
        "dateOfBirth": "1992-08-12",
        "gender": "F",
    },
    "AIR_HISTORY": {
        "ihiNumber": "8003608000265033",
        "medicareCardNumber": "2953701052",
        "medicareIRN": "2",
        "lastName": "Edwards",
        "firstName": "Koby",
        "dateOfBirth": "2012-04-17",
        "gender": "M",
    },
    "NO_HISTORY": {
        "ihiNumber": "8003608333411106",
        "medicareCardNumber": "2951214793",
        "medicareIRN": "1",
        "lastName": "Wilson",
        "firstName": "Peter",
        "dateOfBirth": "1979-02-19",
        "gender": "M",
    },
    "COVID_COMPLETE": {
        "ihiNumber": "8003608333607810",
        "medicareCardNumber": "4951420142",
        "medicareIRN": "1",
        "lastName": "Stanley",
        "firstName": "Henry",
        "dateOfBirth": "1970-12-01",
        "gender": "M",
    },
}


# === Pytest Fixtures ===

@pytest.fixture
def proda_service():
    """ProdaAuthService configured from .env."""
    return ProdaAuthService(config=settings)


@pytest.fixture
def provider_bowling():
    return VENDOR_PROVIDERS["BOWLING"]


@pytest.fixture
def provider_bishop():
    return VENDOR_PROVIDERS["BISHOP"]


@pytest.fixture
def patient_scrivener():
    return SECTION5_PATIENTS["SCRIVENER"].copy()


@pytest.fixture
def patient_maher():
    return SECTION5_PATIENTS["MAHER"].copy()


@pytest.fixture
def patient_mcbean():
    return SECTION5_PATIENTS["MCBEAN"].copy()


@pytest.fixture
def patient_sheppard():
    return SECTION5_PATIENTS["SHEPPARD"].copy()


@pytest.fixture
def patient_doe_unknown():
    return SECTION7_PATIENTS["UNKNOWN_ON_MEDICARE"].copy()


@pytest.fixture
def patient_weatherby():
    return SECTION7_PATIENTS["LONG_NAME"].copy()


@pytest.fixture
def patient_deceased():
    return SECTION7_PATIENTS["DECEASED"].copy()
