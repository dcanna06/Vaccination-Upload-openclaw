"""AIR Individual Management API clients (TECH.SIS.AIR.05).

Covers APIs #2, #3, #4, #7:
- Identify Individual
- Get Immunisation History Details
- Get Immunisation History Statement
- Get Vaccine Trial History

All APIs except Identify Individual require an individualIdentifier
obtained from a prior Identify Individual call.
"""

import hashlib
import json
from typing import Any
from uuid import uuid4

import httpx
import structlog

from app.config import settings
from app.exceptions import AIRApiError

logger = structlog.get_logger(__name__)

# API paths
IDENTIFY_INDIVIDUAL_PATH = "/air/immunisation/v1.1/individual/details"
HISTORY_DETAILS_PATH = "/air/immunisation/v1.3/individual/history/details"
HISTORY_STATEMENT_PATH = "/air/immunisation/v1/individual/history/statement"
VACCINE_TRIAL_HISTORY_PATH = "/air/immunisation/v1/individual/vaccinetrial/history"

# Redis key prefix and TTL
INDIVIDUAL_CACHE_PREFIX = "air:individual:"
INDIVIDUAL_CACHE_TTL = 3600  # 1 hour (matches PRODA token lifetime)


def _build_cache_key(request_data: dict) -> str:
    """Build a deterministic cache key from individual search params."""
    canonical = json.dumps(request_data, sort_keys=True)
    digest = hashlib.sha256(canonical.encode()).hexdigest()[:16]
    return f"{INDIVIDUAL_CACHE_PREFIX}{digest}"


class AIRIndividualClient:
    """Client for AIR Individual Management APIs.

    Args:
        access_token: PRODA Bearer token.
        minor_id: Per-location Minor ID for dhs-auditId header.
        redis: Optional Redis client for caching individualIdentifier.
    """

    def __init__(
        self,
        access_token: str,
        minor_id: str,
        redis: Any | None = None,
    ) -> None:
        self._access_token = access_token
        self._minor_id = minor_id
        self._redis = redis

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

    async def _post(
        self,
        path: str,
        payload: dict[str, Any],
        subject_dob: str | None = None,
    ) -> dict[str, Any]:
        """Make a POST request to an AIR API endpoint."""
        url = f"{settings.air_api_base_url}{path}"
        headers = self._build_headers(subject_dob)

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(url, json=payload, headers=headers)

                logger.info(
                    "air_individual_api_response",
                    path=path,
                    status_code=response.status_code,
                )

                if response.status_code >= 400:
                    body = {}
                    if response.headers.get("content-type", "").startswith("application/json"):
                        body = response.json()

                    air_status = body.get("statusCode", "")
                    air_message = body.get("message", "")

                    logger.error(
                        "air_individual_api_error",
                        path=path,
                        http_status=response.status_code,
                        air_status=air_status,
                    )

                    # Return AIR error responses as structured data instead of raising
                    if air_status:
                        return {
                            "statusCode": air_status,
                            "message": air_message,
                            **body,
                        }

                    raise AIRApiError(
                        message=f"AIR API error: HTTP {response.status_code}",
                        status_code=response.status_code,
                        detail=response.text,
                    )

                return response.json()

            except httpx.RequestError as e:
                raise AIRApiError(
                    message=f"AIR Individual API request failed: {str(e)}"
                )

    # ========================================================================
    # API #2: Identify Individual
    # ========================================================================

    async def identify_individual(
        self,
        request_data: dict[str, Any],
    ) -> dict[str, Any]:
        """Call the Identify Individual API.

        Args:
            request_data: Dict containing personalDetails, medicareCard/ihiNumber,
                         informationProvider, and optionally postCode.

        Returns:
            Parsed response with individualIdentifier if found.
        """
        # Check Redis cache first
        cache_key = _build_cache_key(request_data)
        if self._redis:
            try:
                cached = await self._redis.get(cache_key)
                if cached:
                    logger.info("air_individual_cache_hit", cache_key=cache_key[:20])
                    return json.loads(cached)
            except Exception:
                logger.warning("redis_cache_read_failed", cache_key=cache_key[:20])

        # Build API request body
        dob = request_data.get("personalDetails", {}).get("dateOfBirth", "")
        dob_header = self._dob_to_header_format(dob)

        # Convert personalDetails DOB from yyyy-MM-dd to ddMMyyyy for AIR body
        body_personal_details = dict(request_data["personalDetails"])
        if dob and "-" in dob:
            body_personal_details["dateOfBirth"] = dob_header

        payload: dict[str, Any] = {
            "individual": {
                "personalDetails": body_personal_details,
            },
            "informationProvider": request_data["informationProvider"],
        }

        if request_data.get("medicareCard"):
            payload["individual"]["medicareCard"] = request_data["medicareCard"]
        if request_data.get("ihiNumber"):
            payload["individual"]["ihiNumber"] = request_data["ihiNumber"]
        if request_data.get("postCode"):
            payload["individual"]["address"] = {"postCode": request_data["postCode"]}

        data = await self._post(IDENTIFY_INDIVIDUAL_PATH, payload, dob_header)

        status_code = data.get("statusCode", "")
        message = data.get("message", "")

        result: dict[str, Any] = {
            "statusCode": status_code,
            "message": message,
            "rawResponse": data,
        }

        if status_code == "AIR-I-1100":
            result["status"] = "success"
            individual_details = data.get("individualDetails", {})
            result["individualIdentifier"] = individual_details.get("individualIdentifier")
            result["personalDetails"] = individual_details.get("individual", {}).get("personalDetails")

            # Cache the result in Redis
            if self._redis and result.get("individualIdentifier"):
                try:
                    await self._redis.setex(
                        cache_key,
                        INDIVIDUAL_CACHE_TTL,
                        json.dumps(result),
                    )
                    logger.info("air_individual_cached", cache_key=cache_key[:20])
                except Exception:
                    logger.warning("redis_cache_write_failed", cache_key=cache_key[:20])
        else:
            result["status"] = "error"

        return result

    # ========================================================================
    # API #3: Get Immunisation History Details
    # ========================================================================

    async def get_history_details(
        self,
        individual_identifier: str,
        information_provider: dict[str, str],
        subject_dob: str | None = None,
    ) -> dict[str, Any]:
        """Call the Get Immunisation History Details API.

        Args:
            individual_identifier: Opaque identifier from Identify Individual.
            information_provider: Dict with providerNumber.
            subject_dob: Individual's DOB in yyyy-MM-dd format for header.

        Returns:
            Parsed response with immunisation history and due vaccines.
        """
        dob_header = self._dob_to_header_format(subject_dob) if subject_dob else None

        payload = {
            "individualIdentifier": individual_identifier,
            "informationProvider": information_provider,
        }

        data = await self._post(HISTORY_DETAILS_PATH, payload, dob_header)

        status_code = data.get("statusCode", "")
        message = data.get("message", "")

        result: dict[str, Any] = {
            "statusCode": status_code,
            "message": message,
            "rawResponse": data,
        }

        if status_code.startswith("AIR-I-"):
            result["status"] = "success"
            result["vaccineDueDetails"] = data.get("vaccineDueDetails", [])
            result["immunisationHistory"] = data.get("immunisationHistory", [])
        else:
            result["status"] = "error"

        return result

    # ========================================================================
    # API #4: Get Immunisation History Statement
    # ========================================================================

    async def get_history_statement(
        self,
        individual_identifier: str,
        information_provider: dict[str, str],
        subject_dob: str | None = None,
    ) -> dict[str, Any]:
        """Call the Get Immunisation History Statement API.

        Args:
            individual_identifier: Opaque identifier from Identify Individual.
            information_provider: Dict with providerNumber.
            subject_dob: Individual's DOB in yyyy-MM-dd format for header.

        Returns:
            Parsed response with statement data.
        """
        dob_header = self._dob_to_header_format(subject_dob) if subject_dob else None

        payload = {
            "individualIdentifier": individual_identifier,
            "informationProvider": information_provider,
        }

        data = await self._post(HISTORY_STATEMENT_PATH, payload, dob_header)

        status_code = data.get("statusCode", "")
        message = data.get("message", "")

        result: dict[str, Any] = {
            "statusCode": status_code,
            "message": message,
            "rawResponse": data,
        }

        if status_code.startswith("AIR-I-"):
            result["status"] = "success"
            result["statementData"] = data
        else:
            result["status"] = "error"

        return result

    # ========================================================================
    # API #7: Get Vaccine Trial History
    # ========================================================================

    async def get_vaccine_trial_history(
        self,
        individual_identifier: str,
        information_provider: dict[str, str],
        subject_dob: str | None = None,
    ) -> dict[str, Any]:
        """Call the Get Vaccine Trial History API.

        Args:
            individual_identifier: Opaque identifier from Identify Individual.
            information_provider: Dict with providerNumber.
            subject_dob: Individual's DOB in yyyy-MM-dd format for header.

        Returns:
            Parsed response with vaccine trial history.
        """
        dob_header = self._dob_to_header_format(subject_dob) if subject_dob else None

        payload = {
            "individualIdentifier": individual_identifier,
            "informationProvider": information_provider,
        }

        data = await self._post(VACCINE_TRIAL_HISTORY_PATH, payload, dob_header)

        status_code = data.get("statusCode", "")
        message = data.get("message", "")

        result: dict[str, Any] = {
            "statusCode": status_code,
            "message": message,
            "rawResponse": data,
        }

        if status_code.startswith("AIR-I-"):
            result["status"] = "success"
            result["trialHistory"] = data.get("trialHistory", [])
        else:
            result["status"] = "error"

        return result
