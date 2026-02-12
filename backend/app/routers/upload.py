"""File upload endpoint for Excel vaccination records."""

from typing import Any

from fastapi import APIRouter, Depends, UploadFile
from pydantic import BaseModel

import structlog

from app.dependencies import get_current_user
from app.middleware.file_upload import validate_upload_file
from app.models.user import User
from app.services.excel_parser import ExcelParserService

router = APIRouter(prefix="/api", tags=["upload"])
logger = structlog.get_logger(__name__)


class UploadResponse(BaseModel):
    fileName: str
    sizeBytes: int
    status: str
    totalRows: int
    validRows: int
    invalidRows: int
    records: list[dict[str, Any]]
    errors: list[dict[str, Any]]


@router.post("/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile, user: User = Depends(get_current_user)) -> UploadResponse:
    """Accept an Excel file upload, validate, parse, and return results."""
    content = await validate_upload_file(file)

    parser = ExcelParserService()
    result = parser.parse(content)

    records = result.get("records", [])
    errors = result.get("errors", [])
    total_rows = result.get("totalRows", 0)
    valid_count = len(records)
    invalid_count = len(set(e.get("row", 0) for e in errors))

    logger.info(
        "upload_parsed",
        file_name=file.filename,
        total_rows=total_rows,
        valid=valid_count,
        invalid=invalid_count,
    )

    return UploadResponse(
        fileName=file.filename or "",
        sizeBytes=len(content),
        status="parsed",
        totalRows=total_rows,
        validRows=valid_count,
        invalidRows=invalid_count,
        records=records,
        errors=errors,
    )
