"""Medicare card number check digit validation.

Implements the Medicare check digit algorithm per TECH.SIS.AIR.01 Appendix A.
"""

import re


def validate_medicare_check_digit(number: str) -> bool:
    """Validate a 10-digit Medicare card number check digit.

    The check digit is digit 9 (0-indexed position 8).
    Digit 10 is the issue number and must not be 0.

    Args:
        number: 10-digit Medicare card number string.

    Returns:
        True if the check digit is valid and issue number is not 0.
    """
    if not re.match(r"^\d{10}$", number):
        return False

    weights = [1, 3, 7, 9, 1, 3, 7, 9]
    digits = [int(d) for d in number[:8]]

    weighted_sum = sum(d * w for d, w in zip(digits, weights))
    check_digit = weighted_sum % 10

    if check_digit != int(number[8]):
        return False

    # Issue number (digit 10) must not be 0
    if number[9] == "0":
        return False

    return True
