"""AIR Exemption API clients (TECH.SIS.AIR.06).

Covers:
- API #5: Get Medical Contraindication History
- API #6: Get Natural Immunity History
- API #10: Record Medical Contraindication
- API #11: Record Natural Immunity

All require individualIdentifier from a prior Identify Individual call.
"""

from typing import Any
from uuid import uuid4

import httpx
import structlog

from app.config import settings
from app.exceptions import AIRApiError

logger = structlog.get_logger(__name__)

# API paths
CONTRAINDICATION_HISTORY_PATH = "/air/immunisation/v1/individual/contraindication/history"
NATURAL_IMMUNITY_HISTORY_PATH = "/air/immunisation/v1/individual/naturalimmunity/history"
RECORD_CONTRAINDICATION_PATH = "/air/immunisation/v1/individual/contraindication/record"
RECORD_NATURAL_IMMUNITY_PATH = "/air/immunisation/v1/individual/naturalimmunity/record"


class AIRExemptionsClient:
    """Client for AIR Medical Exemption and Natural Immunity APIs."""

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

    async def _post(self, path: str, payload: dict[str, Any], subject_dob: str | None = None) -> dict[str, Any]:
        url = f"{settings.air_api_base_url}{path}"
        headers = self._build_headers(subject_dob)

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(url, json=payload, headers=headers)

                logger.info("air_exemptions_response", path=path, status_code=response.status_code)

                if response.status_code >= 400:
                    body = {}
                    if response.headers.get("content-type", "").startswith("application/json"):
                        body = response.json()
                    air_status = body.get("statusCode", "")
                    if air_status in ("AIR-E-1061", "AIR-E-1026"):
                        return {"statusCode": air_status, "message": body.get("message", ""), **body}
                    raise AIRApiError(
                        message=f"AIR Exemptions API error: HTTP {response.status_code}",
                        status_code=response.status_code, detail=response.text,
                    )

                return response.json()
            except httpx.RequestError as e:
                raise AIRApiError(message=f"AIR Exemptions request failed: {str(e)}")

    def _parse_result(self, data: dict[str, Any]) -> dict[str, Any]:
        status_code = data.get("statusCode", "")
        return {
            "statusCode": status_code,
            "message": data.get("message", ""),
            "status": "success" if status_code.startswith("AIR-I-") else "error",
            "rawResponse": data,
        }

    async def get_contraindication_history(
        self, individual_identifier: str, information_provider: dict[str, str],
        subject_dob: str | None = None,
    ) -> dict[str, Any]:
        payload = {"individualIdentifier": individual_identifier, "informationProvider": information_provider}
        data = await self._post(CONTRAINDICATION_HISTORY_PATH, payload, subject_dob)
        result = self._parse_result(data)
        result["contraindicationHistory"] = data.get("contraindicationHistory", [])
        return result

    async def get_natural_immunity_history(
        self, individual_identifier: str, information_provider: dict[str, str],
        subject_dob: str | None = None,
    ) -> dict[str, Any]:
        payload = {"individualIdentifier": individual_identifier, "informationProvider": information_provider}
        data = await self._post(NATURAL_IMMUNITY_HISTORY_PATH, payload, subject_dob)
        result = self._parse_result(data)
        result["naturalImmunityHistory"] = data.get("naturalImmunityHistory", [])
        return result

    async def record_contraindication(
        self, individual_identifier: str, antigen_code: str, contraindication_code: str,
        start_date: str, information_provider: dict[str, str],
        end_date: str | None = None, subject_dob: str | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "individualIdentifier": individual_identifier,
            "antigenCode": antigen_code,
            "contraindicationCode": contraindication_code,
            "startDate": start_date,
            "informationProvider": information_provider,
        }
        if end_date:
            payload["endDate"] = end_date
        data = await self._post(RECORD_CONTRAINDICATION_PATH, payload, subject_dob)
        return self._parse_result(data)

    async def record_natural_immunity(
        self, individual_identifier: str, disease_code: str, evidence_date: str,
        information_provider: dict[str, str], subject_dob: str | None = None,
    ) -> dict[str, Any]:
        payload = {
            "individualIdentifier": individual_identifier,
            "diseaseCode": disease_code,
            "evidenceDate": evidence_date,
            "informationProvider": information_provider,
        }
        data = await self._post(RECORD_NATURAL_IMMUNITY_PATH, payload, subject_dob)
        return self._parse_result(data)
