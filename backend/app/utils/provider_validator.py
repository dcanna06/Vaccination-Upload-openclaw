"""Provider number validation.

Implements check digit algorithms for both Medicare and AIR provider numbers
per TECH.SIS.AIR.01 and claude.md specification.
"""

import re

# Practice Location Character values for Medicare Provider Number
# Note: I, O, S, Z are NOT valid
_PLC_VALUES: dict[str, int] = {}
_valid_chars = "0123456789ABCDEFGHJKLMNPQRTUVWXY"
for i, c in enumerate(_valid_chars):
    _PLC_VALUES[c] = i

# Check digit lookup table (index -> character)
_CHECK_DIGITS = {0: "Y", 1: "X", 2: "W", 3: "V", 4: "T", 5: "R", 6: "Q", 7: "P", 8: "N", 9: "M", 10: "L"}

# State code values for AIR Provider Number
_STATE_VALUES: dict[str, int] = {
    "V": 3, "N": 2, "Q": 4, "W": 6, "S": 5, "T": 7, "A": 1, "X": 8,
}


def validate_medicare_provider_number(number: str) -> bool:
    """Validate a Medicare provider number (8 chars).

    Format: 6-digit stem + practice location character + check digit.

    Args:
        number: 8-character provider number string.

    Returns:
        True if the check digit is valid.
    """
    number = number.upper().strip()
    if len(number) != 8:
        return False

    # First 6 chars must be digits
    if not number[:6].isdigit():
        return False

    # 7th char is practice location character
    plc = number[6]
    if plc not in _PLC_VALUES:
        return False

    # Calculate check digit
    digits = [int(d) for d in number[:6]]
    weights = [3, 5, 8, 4, 2, 1]
    weighted = sum(d * w for d, w in zip(digits, weights))
    weighted += _PLC_VALUES[plc] * 6

    check_idx = weighted % 11
    expected = _CHECK_DIGITS.get(check_idx)

    return expected is not None and number[7] == expected


def validate_air_provider_number(number: str) -> bool:
    """Validate an AIR provider number (8 chars).

    Format: state code (alpha) + 5 digits + check digit (alpha) + blank.

    Args:
        number: 8-character AIR provider number string.

    Returns:
        True if the format and check digit are valid.
    """
    number = number.upper().strip()
    if len(number) != 8:
        return False

    state = number[0]
    if state not in _STATE_VALUES:
        return False

    # Chars 2-6 must be digits
    if not number[1:6].isdigit():
        return False

    # Calculate check digit
    d1 = _STATE_VALUES[state]
    digits = [d1] + [int(d) for d in number[1:6]]
    weights = [3, 5, 8, 4, 2, 1]
    weighted = sum(d * w for d, w in zip(digits, weights))

    check_idx = weighted % 11
    expected = _CHECK_DIGITS.get(check_idx)

    return expected is not None and number[6] == expected


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
