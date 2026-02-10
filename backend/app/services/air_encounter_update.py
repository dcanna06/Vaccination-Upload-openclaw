"""AIR Update Encounter API #9 client (TECH.SIS.AIR.05).

POST /air/immunisation/v1.3/encounters/update
Allows updating editable encounters retrieved from immunisation history.
Requires individualIdentifier from a prior Identify Individual call.
"""

from typing import Any
from uuid import uuid4

import httpx
import structlog

from app.config import settings
from app.exceptions import AIRApiError

logger = structlog.get_logger(__name__)

UPDATE_ENCOUNTER_PATH = "/air/immunisation/v1.3/encounters/update"


class AIREncounterUpdateClient:
    """Client for the AIR Update Encounter API."""

    def __init__(self, access_token: str, minor_id: str) -> None:
        self._access_token = access_token
        self._minor_id = minor_id

    def _build_headers(self, subject_dob: str | None = None) -> dict[str, str]:
        """Build required AIR API headers per TECH.SIS.AIR.01."""
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
    def _dob_to_header_format(dob_yyyy_mm_dd: str) -> str:
        """Convert yyyy-MM-dd to ddMMyyyy for dhs-subjectId header."""
        parts = dob_yyyy_mm_dd.split("-")
        if len(parts) == 3:
            return f"{parts[2]}{parts[1]}{parts[0]}"
        return dob_yyyy_mm_dd

    async def update_encounter(
        self,
        individual_identifier: str,
        encounters: list[dict[str, Any]],
        information_provider: dict[str, str],
        subject_dob: str | None = None,
    ) -> dict[str, Any]:
        """Submit an update encounter request to AIR API.

        Args:
            individual_identifier: Opaque identifier from Identify Individual.
            encounters: List of encounter dicts with updated episode data.
            information_provider: Dict with providerNumber.
            subject_dob: Individual's DOB in yyyy-MM-dd for header.

        Returns:
            Parsed response dict.
        """
        dob_header = self._dob_to_header_format(subject_dob) if subject_dob else None
        headers = self._build_headers(dob_header)
        url = f"{settings.air_api_base_url}{UPDATE_ENCOUNTER_PATH}"

        payload = {
            "individualIdentifier": individual_identifier,
            "encounters": encounters,
            "informationProvider": information_provider,
        }

        logger.info(
            "air_update_encounter_request",
            encounter_count=len(encounters),
        )

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(url, json=payload, headers=headers)

                logger.info(
                    "air_update_encounter_response",
                    status_code=response.status_code,
                )

                if response.status_code >= 400:
                    body = {}
                    if response.headers.get("content-type", "").startswith("application/json"):
                        body = response.json()

                    air_status = body.get("statusCode", "")
                    air_message = body.get("message", "")

                    # Known error: invalid/expired individual identifier
                    if air_status == "AIR-E-1061":
                        return {
                            "status": "error",
                            "statusCode": air_status,
                            "message": air_message,
                            "rawResponse": body,
                        }

                    raise AIRApiError(
                        message=f"AIR Update Encounter error: HTTP {response.status_code}",
                        status_code=response.status_code,
                        detail=response.text,
                    )

                data = response.json()
                status_code = data.get("statusCode", "")
                message = data.get("message", "")

                result: dict[str, Any] = {
                    "statusCode": status_code,
                    "message": message,
                    "rawResponse": data,
                }

                if status_code.startswith("AIR-I-"):
                    result["status"] = "success"
                elif status_code.startswith("AIR-W-"):
                    result["status"] = "warning"
                else:
                    result["status"] = "error"

                result["encounterResults"] = data.get("encounterResults", [])
                return result

            except httpx.RequestError as e:
                raise AIRApiError(
                    message=f"AIR Update Encounter request failed: {str(e)}"
                )
