"""Application exception classes per claude.md coding standards."""

from typing import Any

from fastapi import status


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
