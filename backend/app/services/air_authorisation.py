"""AIR Authorisation Access List API (#1) client.

Calls POST /air/immunisation/v1/authorisation/accesslist to verify
a provider's access list for a given location.
"""

from typing import Any
from uuid import uuid4

import httpx
import structlog

from app.config import settings
from app.exceptions import AIRApiError

logger = structlog.get_logger(__name__)

ACCESS_LIST_PATH = "/air/immunisation/v1/authorisation/accesslist"


class AIRAuthorisationClient:
    """Client for the AIR Authorisation Access List API."""

    def __init__(self, access_token: str, minor_id: str) -> None:
        self._access_token = access_token
        self._minor_id = minor_id

    def _build_headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._access_token}",
            "X-IBM-Client-Id": settings.AIR_CLIENT_ID,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "dhs-messageId": f"urn:uuid:{uuid4()}",
            "dhs-correlationId": str(uuid4()),
            "dhs-auditId": self._minor_id,
            "dhs-auditIdType": "Minor Id",
            "dhs-productId": settings.AIR_PRODUCT_ID,
        }

    async def get_access_list(self, provider_number: str) -> dict[str, Any]:
        """Query the AIR authorisation access list for a provider.

        Returns the parsed response dict with access list details.
        Raises AIRApiError on failure.
        """
        url = f"{settings.air_api_base_url}{ACCESS_LIST_PATH}"
        headers = self._build_headers()
        payload = {"providerNumber": provider_number}

        logger.info(
            "air_authorisation_request",
            provider_number=provider_number,
            minor_id=self._minor_id,
        )

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(url, json=payload, headers=headers)

                if response.status_code >= 400:
                    body = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
                    status_code = body.get("statusCode", "")

                    logger.error(
                        "air_authorisation_error",
                        http_status=response.status_code,
                        air_status=status_code,
                    )

                    # Known error codes
                    if status_code == "AIR-E-1039":
                        return {
                            "status": "error",
                            "errorCode": "AIR-E-1039",
                            "message": "Provider is not associated with this organisation",
                        }
                    if status_code == "AIR-E-1063":
                        return {
                            "status": "error",
                            "errorCode": "AIR-E-1063",
                            "message": "Provider is not authorised for AIR",
                        }

                    raise AIRApiError(
                        message=f"AIR Authorisation API error: HTTP {response.status_code}",
                        status_code=response.status_code,
                        detail=response.text,
                    )

                data = response.json()
                logger.info(
                    "air_authorisation_success",
                    provider_number=provider_number,
                    status_code=data.get("statusCode", ""),
                )
                return {
                    "status": "success",
                    "accessList": data,
                }

            except httpx.RequestError as e:
                raise AIRApiError(
                    message=f"AIR Authorisation API request failed: {str(e)}"
                )
