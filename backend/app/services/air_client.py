"""AIR API HTTP client for Record Encounter submissions.

Handles request building with required headers, response parsing,
retry logic, and confirmation flows per TECH.SIS.AIR.01 and TECH.SIS.AIR.02.
"""

import asyncio
from typing import Any
from uuid import uuid4

import httpx
import structlog

from app.config import settings
from app.exceptions import AIRApiError

logger = structlog.get_logger(__name__)

RECORD_ENCOUNTER_PATH = "/air/immunisation/v1.4/encounters/record"

MAX_RETRIES = 3
BACKOFF_BASE = 2  # seconds


class AIRClient:
    """HTTP client for AIR API with proper headers, retry, and response handling."""

    def __init__(self, access_token: str = "", correlation_id: str | None = None) -> None:
        self._access_token = access_token
        self._correlation_id = correlation_id or f"urn:uuid:{uuid4()}"

    def set_access_token(self, token: str) -> None:
        self._access_token = token

    def _build_headers(self, subject_dob_ddmmyyyy: str) -> dict[str, str]:
        """Build required AIR API headers per TECH.SIS.AIR.01."""
        return {
            "Authorization": f"Bearer {self._access_token}",
            "X-IBM-Client-Id": settings.AIR_CLIENT_ID,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "dhs-messageId": f"urn:uuid:{uuid4()}",
            "dhs-correlationId": self._correlation_id,
            "dhs-auditId": settings.PRODA_MINOR_ID,
            "dhs-auditIdType": "Minor Id",
            "dhs-subjectId": subject_dob_ddmmyyyy,
            "dhs-subjectIdType": "Date of Birth",
            "dhs-productId": settings.AIR_PRODUCT_ID,
        }

    def _dob_to_header_format(self, dob_yyyy_mm_dd: str) -> str:
        """Convert yyyy-MM-dd to ddMMyyyy for dhs-subjectId header."""
        parts = dob_yyyy_mm_dd.split("-")
        if len(parts) == 3:
            return f"{parts[2]}{parts[1]}{parts[0]}"
        return dob_yyyy_mm_dd

    async def record_encounter(
        self, payload: dict[str, Any], dob: str
    ) -> dict[str, Any]:
        """Submit a record encounter request to AIR API.

        Args:
            payload: The AddEncounterRequestType JSON body.
            dob: Individual's date of birth in yyyy-MM-dd format.

        Returns:
            Parsed AIR response dict.

        Raises:
            AIRApiError: If the request fails after retries.
        """
        dob_header = self._dob_to_header_format(dob)
        headers = self._build_headers(dob_header)
        url = f"{settings.air_api_base_url}{RECORD_ENCOUNTER_PATH}"

        return await self._submit_with_retry(url, headers, payload)

    async def _submit_with_retry(
        self,
        url: str,
        headers: dict[str, str],
        payload: dict[str, Any],
        attempt: int = 0,
    ) -> dict[str, Any]:
        """Submit request with exponential backoff retry for system errors."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(url, json=payload, headers=headers)

                logger.info(
                    "air_api_response",
                    status_code=response.status_code,
                    attempt=attempt + 1,
                )

                if response.status_code == 401 and attempt == 0:
                    logger.warning("air_api_auth_expired", attempt=attempt)
                    raise AIRApiError(
                        message="PRODA token expired or invalid",
                        status_code=401,
                    )

                if response.status_code >= 500 and attempt < MAX_RETRIES:
                    wait = BACKOFF_BASE ** attempt
                    logger.warning(
                        "air_api_server_error_retrying",
                        status_code=response.status_code,
                        wait_seconds=wait,
                        attempt=attempt + 1,
                    )
                    await asyncio.sleep(wait)
                    return await self._submit_with_retry(url, headers, payload, attempt + 1)

                if response.status_code >= 400:
                    logger.error(
                        "air_api_error_response",
                        status_code=response.status_code,
                        response_body=response.text[:2000],
                    )
                    raise AIRApiError(
                        message=f"AIR API error: HTTP {response.status_code}",
                        status_code=response.status_code,
                        detail=response.text,
                    )

                return self._parse_response(response.json())

            except httpx.TimeoutException:
                if attempt < MAX_RETRIES:
                    wait = BACKOFF_BASE ** attempt
                    logger.warning("air_api_timeout_retrying", wait_seconds=wait, attempt=attempt + 1)
                    await asyncio.sleep(wait)
                    return await self._submit_with_retry(url, headers, payload, attempt + 1)
                raise AIRApiError(message="AIR API request timed out after retries")

            except httpx.RequestError as e:
                if attempt < MAX_RETRIES:
                    wait = BACKOFF_BASE ** attempt
                    await asyncio.sleep(wait)
                    return await self._submit_with_retry(url, headers, payload, attempt + 1)
                raise AIRApiError(message=f"AIR API request failed: {str(e)}")

    def _parse_response(self, data: dict[str, Any]) -> dict[str, Any]:
        """Parse AIR API response and extract status, messages, claim details."""
        status_code = data.get("statusCode", "")
        message = data.get("message", "")

        result: dict[str, Any] = {
            "statusCode": status_code,
            "message": message,
            "rawResponse": data,
        }

        # Extract claim details if present
        claim_details = data.get("claimDetails")
        if claim_details:
            result["claimId"] = claim_details.get("claimId")
            result["claimSequenceNumber"] = claim_details.get("claimSequenceNumber")

        # Extract per-encounter results
        encounter_results = data.get("encounterResults", [])
        result["encounterResults"] = encounter_results

        # Classify response
        if status_code == "AIR-I-1007":
            result["status"] = "success"
        elif status_code in ("AIR-W-1004", "AIR-W-1008", "AIR-W-1001"):
            result["status"] = "warning"
            result["requiresConfirmation"] = True
        elif status_code.startswith("AIR-E-"):
            result["status"] = "error"
        else:
            result["status"] = "unknown"

        return result


class ConfirmationService:
    """Handles confirmation flows for AIR-W-1004 and AIR-W-1008 responses."""

    def __init__(self, air_client: AIRClient) -> None:
        self._client = air_client

    def build_confirmation_payload(
        self,
        original_payload: dict[str, Any],
        claim_id: str,
        claim_sequence_number: str | None = None,
    ) -> dict[str, Any]:
        """Build a confirmation request from the original payload.

        Sets acceptAndConfirm=True and includes claimId/claimSequenceNumber.
        """
        confirm_payload = {
            "individual": original_payload["individual"],
            "encounters": [],
            "informationProvider": original_payload["informationProvider"],
            "claimId": claim_id,
        }

        if claim_sequence_number:
            confirm_payload["claimSequenceNumber"] = claim_sequence_number

        for encounter in original_payload.get("encounters", []):
            confirm_encounter = dict(encounter)
            confirm_encounter["acceptAndConfirm"] = "Y"
            confirm_payload["encounters"].append(confirm_encounter)

        return confirm_payload

    async def confirm(
        self,
        original_payload: dict[str, Any],
        claim_id: str,
        dob: str,
        claim_sequence_number: str | None = None,
    ) -> dict[str, Any]:
        """Submit a confirmation request to AIR API."""
        payload = self.build_confirmation_payload(
            original_payload, claim_id, claim_sequence_number
        )
        return await self._client.record_encounter(payload, dob)


class BatchSubmissionService:
    """Orchestrates submission of multiple batches with progress tracking."""

    def __init__(self, air_client: AIRClient) -> None:
        self._client = air_client
        self._confirmation_service = ConfirmationService(air_client)
        self._paused = False

    async def submit_batches(
        self,
        batches: list[dict[str, Any]],
        information_provider: dict[str, Any],
    ) -> dict[str, Any]:
        """Submit all batches sequentially with progress tracking.

        Each encounter is for a single individual and sent as a separate
        API request, since the AIR API expects one individual per request.
        """
        results: list[dict[str, Any]] = []
        successful = 0
        failed = 0
        pending_confirm = 0

        # Flatten: each encounter in each batch becomes one API call
        all_encounters = []
        for batch in batches:
            for enc in batch.get("encounters", []):
                all_encounters.append(enc)

        total = len(all_encounters)
        for idx, encounter in enumerate(all_encounters):
            if self._paused:
                logger.info("batch_submission_paused", encounter_index=idx)
                break

            logger.info(
                "submitting_encounter",
                encounter_index=idx + 1,
                total_encounters=total,
            )

            try:
                # Wrap single encounter in a batch for _submit_single_batch
                single_batch = {"encounters": [encounter]}
                result = await self._submit_single_batch(
                    single_batch, dict(information_provider)
                )
                results.append(result)

                if result["status"] == "success":
                    successful += 1
                elif result["status"] == "warning":
                    pending_confirm += 1
                else:
                    failed += 1

            except AIRApiError as e:
                logger.error(
                    "encounter_submission_failed",
                    encounter_index=idx + 1,
                    error=e.message,
                )
                results.append({
                    "status": "error",
                    "error": e.message,
                    "detail": e.detail if hasattr(e, 'detail') else None,
                    "sourceRows": encounter.get("sourceRows", []),
                })
                failed += 1

        return {
            "totalBatches": total,
            "completedBatches": len(results),
            "successful": successful,
            "failed": failed,
            "pendingConfirmation": pending_confirm,
            "results": results,
            "status": "completed" if not self._paused else "paused",
        }

    def _to_ddmmyyyy(self, iso_date: str) -> str:
        """Convert yyyy-MM-dd to ddMMyyyy for AIR API body date format."""
        parts = iso_date.split("-")
        if len(parts) == 3:
            return f"{parts[2]}{parts[1]}{parts[0]}"
        return iso_date

    def _to_yyyymmdd(self, iso_date: str) -> str:
        """Convert yyyy-MM-dd to yyyyMMdd (ISO 8601 basic, no separators)."""
        return iso_date.replace("-", "")

    async def _submit_single_batch(
        self,
        batch: dict[str, Any],
        information_provider: dict[str, Any],
    ) -> dict[str, Any]:
        """Submit a single batch to AIR API."""
        encounters = batch.get("encounters", [])
        if not encounters:
            return {"status": "error", "error": "Empty batch"}

        # Build individual — only personalDetails and medicareCard (no address)
        raw_individual = encounters[0].get("individual", {})
        personal = dict(raw_individual.get("personalDetails", {}))
        dob_iso = personal.get("dateOfBirth", "")
        personal["dateOfBirth"] = self._to_ddmmyyyy(dob_iso)

        individual: dict[str, Any] = {"personalDetails": personal}
        if raw_individual.get("medicareCard"):
            individual["medicareCard"] = raw_individual["medicareCard"]
        if raw_individual.get("ihiNumber"):
            individual["ihiNumber"] = raw_individual["ihiNumber"]

        # Use configured provider number if informationProvider is empty
        if not information_provider.get("providerNumber"):
            information_provider = {
                "providerNumber": settings.AIR_PROVIDER_NUMBER,
            }

        # Build API encounters matching proven SoapUI format
        api_encounters = []
        for enc in encounters:
            episodes = []
            for ep in enc.get("episodes", []):
                episode: dict[str, Any] = {
                    "id": int(ep.get("id", 1)),
                    "vaccineCode": ep.get("vaccineCode", ""),
                    "vaccineDose": ep.get("vaccineDose", ""),
                }
                # Only include optional fields when they have actual values
                if ep.get("vaccineBatch"):
                    episode["vaccineBatch"] = ep["vaccineBatch"]
                if ep.get("vaccineType"):
                    episode["vaccineType"] = ep["vaccineType"]
                if ep.get("routeOfAdministration"):
                    episode["routeOfAdministration"] = ep["routeOfAdministration"]
                episodes.append(episode)

            api_enc: dict[str, Any] = {
                "id": int(enc.get("id", 1)),
                "dateOfService": self._to_ddmmyyyy(enc["dateOfService"]),
                "episodes": episodes,
            }
            if enc.get("immunisationProvider"):
                api_enc["immunisationProvider"] = enc["immunisationProvider"]
            if enc.get("schoolId"):
                api_enc["schoolId"] = enc["schoolId"]
            if enc.get("administeredOverseas"):
                api_enc["administeredOverseas"] = True
                if enc.get("countryCode"):
                    api_enc["countryCode"] = enc["countryCode"]
            if enc.get("antenatalIndicator") is not None:
                api_enc["antenatalIndicator"] = bool(enc["antenatalIndicator"])
            api_encounters.append(api_enc)

        payload = {
            "individual": individual,
            "encounters": api_encounters,
            "informationProvider": information_provider,
        }

        response = await self._client.record_encounter(payload, dob_iso)
        response["batchIndex"] = batch.get("batchIndex", 0)
        response["sourceRows"] = batch.get("sourceRows", [])
        response["encounterCount"] = len(api_encounters)

        return response

    def pause(self) -> None:
        """Pause batch submission after current batch completes."""
        self._paused = True

    def resume(self) -> None:
        """Resume batch submission."""
        self._paused = False
