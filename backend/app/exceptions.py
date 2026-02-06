"""Application exception classes per claude.md coding standards."""

from typing import Any

from fastapi import status


# AIR error code to user-friendly message mapping
AIR_ERROR_MESSAGES: dict[str, str] = {
    # Status response codes
    "AIR-I-1007": "All encounters successfully recorded.",
    "AIR-W-1001": "Some episodes require confirmation.",
    "AIR-W-1004": "Individual not found on AIR. Please confirm details are correct.",
    "AIR-W-1008": "Some encounters were not successful and require confirmation.",
    "AIR-E-1005": "The request contains validation errors.",
    "AIR-E-1006": "An unexpected AIR system error occurred. Please retry.",
    "AIR-E-1046": "Encounters cannot be confirmed. Please correct and resubmit.",
    # Validation error codes
    "AIR-E-1013": "Maximum of 10 encounters per request exceeded.",
    "AIR-E-1014": "Invalid episode sequence number.",
    "AIR-E-1015": "Date of service cannot be before date of birth.",
    "AIR-E-1016": "Invalid field format.",
    "AIR-E-1017": "Invalid field value.",
    "AIR-E-1018": "Date cannot be in the future.",
    "AIR-E-1019": "Date of birth indicates age over 130 years.",
    "AIR-E-1020": "Medicare card number is required when IRN is provided.",
    "AIR-E-1022": "Date of service cannot be before 1996.",
    "AIR-E-1023": "Invalid vaccine code.",
    "AIR-E-1024": "Invalid vaccine dose number.",
    "AIR-E-1026": "Insufficient individual identification information.",
    "AIR-E-1027": "Invalid school ID.",
    "AIR-E-1028": "Immunisation provider was not current at date of service.",
    "AIR-E-1029": "Information provider is not current.",
    "AIR-E-1039": "Minor ID is not authorised for this action.",
    "AIR-E-1063": "Information provider is not authorised for AIR.",
    "AIR-E-1079": "Country code is required when administered overseas.",
    "AIR-E-1081": "Vaccine batch number is mandatory for this vaccine.",
    "AIR-E-1084": "Invalid vaccine type.",
    "AIR-E-1085": "Invalid route of administration.",
    "AIR-E-1086": "Vaccine type is not compatible with vaccine code.",
    "AIR-E-1087": "Route of administration is not compatible with vaccine code.",
    "AIR-E-1088": "A mandatory field is missing.",
    "AIR-E-1089": "Antenatal indicator is mandatory for this encounter.",
}


def get_air_user_message(code: str) -> str:
    """Get user-friendly message for an AIR error/warning code."""
    return AIR_ERROR_MESSAGES.get(code, f"AIR returned code: {code}")


class AppError(Exception):
    """Base application error."""

    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail: Any = None,
    ) -> None:
        self.message = message
        self.status_code = status_code
        self.detail = detail
        super().__init__(self.message)


class ValidationError(AppError):
    """Raised when request validation fails."""

    def __init__(self, message: str, detail: Any = None) -> None:
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
        )


class AuthenticationError(AppError):
    """Raised when authentication fails."""

    def __init__(self, message: str = "Authentication required") -> None:
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class FileProcessingError(AppError):
    """Raised when file upload or processing fails."""

    def __init__(self, message: str, detail: Any = None) -> None:
        super().__init__(
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
        )


class AIRApiError(AppError):
    """Raised when AIR API returns an error."""

    def __init__(self, message: str, status_code: int = 502, detail: Any = None) -> None:
        super().__init__(
            message=message,
            status_code=status_code,
            detail=detail,
        )
