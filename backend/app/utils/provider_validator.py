"""Provider number validation.

Format-only validation for Medicare and AIR provider numbers.
Check digit verification is left to the AIR API since the algorithm
details are not fully documented and official Services Australia test
numbers must pass local validation.
"""

# Valid state codes for AIR Provider Numbers
_VALID_STATE_CODES = {"V", "N", "Q", "W", "S", "T", "A", "X"}


def validate_medicare_provider_number(number: str) -> bool:
    """Validate a Medicare provider number format (6-8 chars).

    Format: 6-digit stem + practice location character + check digit.
    Check digit verification is left to the AIR API — we only validate format
    since the check digit algorithm details are not publicly documented and
    official Services Australia test numbers must pass.

    Args:
        number: Provider number string.

    Returns:
        True if the format is valid.
    """
    number = number.upper().strip()
    if len(number) < 6 or len(number) > 8:
        return False

    # First 6 chars must be digits
    if not number[:6].isdigit():
        return False

    # If 8 chars: 7th must be alphanumeric, 8th must be alpha
    if len(number) == 8:
        if not number[6].isalnum():
            return False
        if not number[7].isalpha():
            return False

    return True


def validate_air_provider_number(number: str) -> bool:
    """Validate an AIR provider number format (7-8 chars).

    Format: state code (alpha) + 5 digits + check digit (alpha) [+ optional blank].
    Check digit verification is left to the AIR API.

    Args:
        number: AIR provider number string.

    Returns:
        True if the format is valid.
    """
    number = number.upper().strip()
    if len(number) < 7 or len(number) > 8:
        return False

    state = number[0]
    if state not in _VALID_STATE_CODES:
        return False

    # Chars 2-6 must be digits
    if not number[1:6].isdigit():
        return False

    # Check digit position must be alpha
    if not number[6].isalpha():
        return False

    return True


def validate_provider_number(number: str) -> bool:
    """Validate a provider number (either Medicare or AIR format).

    Args:
        number: Provider number string.

    Returns:
        True if the number is valid in either format.
    """
    if not number or len(number.strip()) < 6:
        return False

    number = number.upper().strip()

    # Try Medicare format first (starts with digit)
    if number[0].isdigit():
        return validate_medicare_provider_number(number)

    # Try AIR format (starts with state letter)
    if number[0].isalpha():
        return validate_air_provider_number(number)

    return False
