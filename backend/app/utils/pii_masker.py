"""PII masking utilities for structured logging.

Masks Medicare numbers, IHI numbers, names, and other sensitive data
before logging to prevent PII exposure.
"""

import re


def mask_medicare(value: str) -> str:
    """Mask a Medicare card number, showing only last 2 digits."""
    if not value or len(value) < 4:
        return "***"
    return "*" * (len(value) - 2) + value[-2:]


def mask_ihi(value: str) -> str:
    """Mask an IHI number, showing only last 4 digits."""
    if not value or len(value) < 6:
        return "***"
    return "*" * (len(value) - 4) + value[-4:]


def mask_name(value: str) -> str:
    """Mask a name, showing only first character."""
    if not value:
        return "***"
    return value[0] + "*" * (len(value) - 1)


def mask_dob(value: str) -> str:
    """Mask date of birth, showing only year."""
    if not value or len(value) < 4:
        return "***"
    # Extract year from yyyy-MM-dd or ddMMyyyy
    if "-" in value:
        return value[:4] + "-**-**"
    if len(value) == 8:
        return "****" + value[4:]
    return "***"


def mask_record(record: dict) -> dict:
    """Return a copy of a record dict with PII fields masked."""
    masked = dict(record)
    if "medicareCardNumber" in masked and masked["medicareCardNumber"]:
        masked["medicareCardNumber"] = mask_medicare(str(masked["medicareCardNumber"]))
    if "medicareIRN" in masked and masked["medicareIRN"]:
        masked["medicareIRN"] = "*"
    if "ihiNumber" in masked and masked["ihiNumber"]:
        masked["ihiNumber"] = mask_ihi(str(masked["ihiNumber"]))
    if "firstName" in masked and masked["firstName"]:
        masked["firstName"] = mask_name(str(masked["firstName"]))
    if "lastName" in masked and masked["lastName"]:
        masked["lastName"] = mask_name(str(masked["lastName"]))
    if "dateOfBirth" in masked and masked["dateOfBirth"]:
        masked["dateOfBirth"] = mask_dob(str(masked["dateOfBirth"]))
    return masked


def mask_log_message(message: str) -> str:
    """Mask potential PII patterns in a log message string."""
    # Mask 10-digit Medicare numbers
    message = re.sub(r"\b\d{10}\b", lambda m: mask_medicare(m.group()), message)
    # Mask 16-digit IHI numbers
    message = re.sub(r"\b\d{16}\b", lambda m: mask_ihi(m.group()), message)
    return message
