"""File upload endpoint for Excel vaccination records."""

from fastapi import APIRouter, UploadFile

from app.middleware.file_upload import validate_upload_file

router = APIRouter(prefix="/api", tags=["upload"])


@router.post("/upload")
async def upload_file(file: UploadFile) -> dict:
    """Accept an Excel file upload, validate type/size, return confirmation."""
    content = await validate_upload_file(file)
    return {
        "fileName": file.filename,
        "sizeBytes": len(content),
        "status": "uploaded",
    }
