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

        Returns submission results summary.
        """
        results: list[dict[str, Any]] = []
        successful = 0
        failed = 0
        pending_confirm = 0

        for batch_idx, batch in enumerate(batches):
            if self._paused:
                logger.info("batch_submission_paused", batch_index=batch_idx)
                break

            logger.info(
                "submitting_batch",
                batch_index=batch_idx + 1,
                total_batches=len(batches),
                encounters=batch.get("encounterCount", 0),
            )

            try:
                result = await self._submit_single_batch(
                    batch, information_provider
                )
                results.append(result)

                if result["status"] == "success":
                    successful += result.get("encounterCount", 0)
                elif result["status"] == "warning":
                    pending_confirm += result.get("encounterCount", 0)
                else:
                    failed += result.get("encounterCount", 0)

            except AIRApiError as e:
                logger.error(
                    "batch_submission_failed",
                    batch_index=batch_idx + 1,
                    error=e.message,
                )
                results.append({
                    "status": "error",
                    "error": e.message,
                    "batchIndex": batch_idx,
                    "sourceRows": batch.get("sourceRows", []),
                })
                failed += batch.get("encounterCount", 0)

        return {
            "totalBatches": len(batches),
            "completedBatches": len(results),
            "successful": successful,
            "failed": failed,
            "pendingConfirmation": pending_confirm,
            "results": results,
            "status": "completed" if not self._paused else "paused",
        }

    async def _submit_single_batch(
        self,
        batch: dict[str, Any],
        information_provider: dict[str, Any],
    ) -> dict[str, Any]:
        """Submit a single batch to AIR API."""
        encounters = batch.get("encounters", [])
        if not encounters:
            return {"status": "error", "error": "Empty batch"}

        # Get individual from first encounter
        individual = encounters[0].get("individual", {})
        dob = individual.get("personalDetails", {}).get("dateOfBirth", "")

        # Build API payload
        api_encounters = []
        for enc in encounters:
            api_enc = {
                "id": enc["id"],
                "dateOfService": enc["dateOfService"],
                "episodes": enc["episodes"],
            }
            if enc.get("immunisationProvider"):
                api_enc["immunisationProvider"] = enc["immunisationProvider"]
            if enc.get("administeredOverseas"):
                api_enc["administeredOverseas"] = True
                if enc.get("countryCode"):
                    api_enc["countryCode"] = enc["countryCode"]
            if enc.get("antenatalIndicator"):
                api_enc["antenatalIndicator"] = True
            if enc.get("schoolId"):
                api_enc["schoolId"] = enc["schoolId"]
            api_encounters.append(api_enc)

        payload = {
            "individual": individual,
            "encounters": api_encounters,
            "informationProvider": information_provider,
        }

        response = await self._client.record_encounter(payload, dob)
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
