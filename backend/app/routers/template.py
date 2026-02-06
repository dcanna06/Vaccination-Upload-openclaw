"""Excel template download endpoint."""

from fastapi import APIRouter
from fastapi.responses import Response

from app.services.excel_template import ExcelTemplateService

router = APIRouter(prefix="/api", tags=["template"])


@router.get("/template")
async def download_template() -> Response:
    """Generate and return an Excel template for vaccination record uploads."""
    service = ExcelTemplateService()
    content = service.generate()
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": 'attachment; filename="vaccination_template.xlsx"',
        },
    )
