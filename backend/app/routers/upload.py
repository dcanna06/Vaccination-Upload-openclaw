"""File upload endpoint for Excel vaccination records."""

from fastapi import APIRouter, UploadFile
from pydantic import BaseModel

from app.middleware.file_upload import validate_upload_file

router = APIRouter(prefix="/api", tags=["upload"])


class UploadResponse(BaseModel):
    fileName: str
    sizeBytes: int
    status: str


@router.post("/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile) -> UploadResponse:
    """Accept an Excel file upload, validate type/size, return confirmation."""
    content = await validate_upload_file(file)
    return UploadResponse(
        fileName=file.filename or "",
        sizeBytes=len(content),
        status="uploaded",
    )
