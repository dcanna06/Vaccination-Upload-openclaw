"""AIR Indicator, Indigenous Status, and Catch-Up APIs.

Covers:
- API #12: Add Additional Vaccine Indicator
- API #13: Remove Additional Vaccine Indicator
- API #14: Update Indigenous Status
- API #15: Planned Catch Up Date (NOTE: does NOT use individualIdentifier)
"""

from typing import Any
from uuid import uuid4

import httpx
import structlog

from app.config import settings
from app.exceptions import AIRApiError

logger = structlog.get_logger(__name__)

ADD_INDICATOR_PATH = "/air/immunisation/v1/individual/vaccineindicator/add"
REMOVE_INDICATOR_PATH = "/air/immunisation/v1/individual/vaccineindicator/remove"
INDIGENOUS_STATUS_PATH = "/air/immunisation/v1/individual/indigenousstatus/update"
CATCHUP_PATH = "/air/immunisation/v1.1/schedule/catchup"


class AIRIndicatorsClient:
    """Client for AIR Indicator, Indigenous Status, and Catch-Up APIs."""

    def __init__(self, access_token: str, minor_id: str) -> None:
        self._access_token = access_token
        self._minor_id = minor_id

    def _build_headers(self, subject_dob: str | None = None) -> dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self._access_token}",
            "X-IBM-Client-Id": settings.AIR_CLIENT_ID,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "dhs-messageId": f"urn:uuid:{uuid4()}",
            "dhs-correlationId": f"urn:uuid:{uuid4()}",
            "dhs-auditId": self._minor_id,
            "dhs-auditIdType": "Minor Id",
            "dhs-productId": settings.AIR_PRODUCT_ID,
        }
        if subject_dob:
            headers["dhs-subjectId"] = subject_dob
            headers["dhs-subjectIdType"] = "Date of Birth"
        return headers

    @staticmethod
    def _dob_to_header_format(dob: str) -> str:
        parts = dob.split("-")
        if len(parts) == 3:
            return f"{parts[2]}{parts[1]}{parts[0]}"
        return dob

    async def _post(self, path: str, payload: dict[str, Any], subject_dob: str | None = None) -> dict[str, Any]:
        url = f"{settings.air_api_base_url}{path}"
        dob_header = self._dob_to_header_format(subject_dob) if subject_dob else None
        headers = self._build_headers(dob_header)

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(url, json=payload, headers=headers)
                logger.info("air_indicators_response", path=path, status_code=response.status_code)

                if response.status_code >= 400:
                    body = {}
                    if response.headers.get("content-type", "").startswith("application/json"):
                        body = response.json()
                    air_status = body.get("statusCode", "")
                    if air_status in ("AIR-E-1061", "AIR-E-1026"):
                        return {"statusCode": air_status, "message": body.get("message", ""), **body}
                    raise AIRApiError(
                        message=f"AIR Indicators API error: HTTP {response.status_code}",
                        status_code=response.status_code, detail=response.text,
                    )
                return response.json()
            except httpx.RequestError as e:
                raise AIRApiError(message=f"AIR Indicators request failed: {str(e)}")

    def _parse_result(self, data: dict[str, Any]) -> dict[str, Any]:
        status_code = data.get("statusCode", "")
        return {
            "statusCode": status_code,
            "message": data.get("message", ""),
            "status": "success" if status_code.startswith("AIR-I-") else "error",
            "rawResponse": data,
        }

    async def add_vaccine_indicator(
        self, individual_identifier: str, indicator_code: str,
        information_provider: dict[str, str],
    ) -> dict[str, Any]:
        payload = {
            "individualIdentifier": individual_identifier,
            "vaccineIndicatorCode": indicator_code,
            "informationProvider": information_provider,
        }
        data = await self._post(ADD_INDICATOR_PATH, payload)
        return self._parse_result(data)

    async def remove_vaccine_indicator(
        self, individual_identifier: str, indicator_code: str,
        information_provider: dict[str, str],
    ) -> dict[str, Any]:
        payload = {
            "individualIdentifier": individual_identifier,
            "vaccineIndicatorCode": indicator_code,
            "informationProvider": information_provider,
        }
        data = await self._post(REMOVE_INDICATOR_PATH, payload)
        return self._parse_result(data)

    async def update_indigenous_status(
        self, individual_identifier: str, indigenous_status: str,
        information_provider: dict[str, str],
    ) -> dict[str, Any]:
        payload = {
            "individualIdentifier": individual_identifier,
            "indigenousStatus": indigenous_status,
            "informationProvider": information_provider,
        }
        data = await self._post(INDIGENOUS_STATUS_PATH, payload)
        return self._parse_result(data)

    async def planned_catch_up_date(
        self, medicare_card_number: str | None, medicare_irn: str | None,
        date_of_birth: str, gender: str, planned_date: str,
        information_provider: dict[str, str],
    ) -> dict[str, Any]:
        """API #15: Does NOT use individualIdentifier."""
        payload: dict[str, Any] = {
            "dateOfBirth": date_of_birth,
            "gender": gender,
            "plannedCatchUpDate": planned_date,
            "informationProvider": information_provider,
        }
        if medicare_card_number:
            payload["medicareCardNumber"] = medicare_card_number
        if medicare_irn:
            payload["medicareIRN"] = medicare_irn

        data = await self._post(CATCHUP_PATH, payload, subject_dob=date_of_birth)
        return self._parse_result(data)
