"""File upload validation utilities for Excel file uploads."""

from fastapi import UploadFile

from app.middleware.error_handler import FileProcessingError

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_CONTENT_TYPES = {
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  # .xlsx
    "application/vnd.ms-excel",  # .xls
}
ALLOWED_EXTENSIONS = {".xlsx", ".xls"}


async def validate_upload_file(file: UploadFile) -> bytes:
    """Validate uploaded file type and size, return file content bytes.

    Raises FileProcessingError if the file is invalid.
    """
    # Validate filename extension
    filename = file.filename or ""
    ext = ""
    if "." in filename:
        ext = "." + filename.rsplit(".", 1)[1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise FileProcessingError(
            message=f"Invalid file type: '{ext or 'unknown'}'. Only .xlsx and .xls files are accepted.",
            detail={"allowed_extensions": list(ALLOWED_EXTENSIONS)},
        )

    # Validate content type if provided
    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
        raise FileProcessingError(
            message=f"Invalid content type: '{file.content_type}'.",
            detail={"allowed_types": list(ALLOWED_CONTENT_TYPES)},
        )

    # Read and validate file size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        size_mb = round(len(content) / (1024 * 1024), 2)
        raise FileProcessingError(
            message=f"File too large: {size_mb} MB. Maximum allowed size is 10 MB.",
            detail={"max_size_mb": 10, "actual_size_mb": size_mb},
        )

    if len(content) == 0:
        raise FileProcessingError(message="Uploaded file is empty.")

    return content
