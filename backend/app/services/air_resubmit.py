"""Resubmit and Confirm services for AIR encounter records.

Handles building fresh resubmit payloads and confirmation payloads
(with acceptAndConfirm=Y, claimId, excluding already-successful encounters).
"""

from __future__ import annotations

from typing import Any

import structlog

from app.services.air_client import AIRClient, ConfirmationService
from app.services.air_response_parser import parse_air_response

logger = structlog.get_logger(__name__)


class ResubmitService:
    """Build and send fresh resubmission requests to AIR."""

    def __init__(self, air_client: AIRClient) -> None:
        self._client = air_client

    async def resubmit(
        self,
        individual: dict[str, Any],
        encounter: dict[str, Any],
        information_provider: dict[str, Any],
    ) -> dict[str, Any]:
        """Build a fresh AddEncounterRequestType and submit to AIR.

        Does NOT include claimId — this is a new submission.

        Args:
            individual: Updated individual data from the edit form.
            encounter: Updated encounter data from the edit form.
            information_provider: Provider details.

        Returns:
            Parsed AIR response with status, messages, errors, episodes.
        """
        # Build individual block
        api_individual: dict[str, Any] = {
            "personalDetails": {
                "firstName": individual.get("firstName", ""),
                "lastName": individual.get("lastName", ""),
                "dateOfBirth": individual.get("dob", ""),
                "gender": individual.get("gender", ""),
            },
        }

        if individual.get("medicare"):
            api_individual["medicareCard"] = {
                "medicareCardNumber": individual["medicare"],
                "medicareIRN": individual.get("irn", "1"),
            }

        if individual.get("ihiNumber"):
            api_individual["ihiNumber"] = individual["ihiNumber"]

        # Build encounter block
        episode: dict[str, Any] = {
            "id": 1,
            "vaccineCode": encounter.get("vaccineCode", ""),
            "vaccineDose": encounter.get("vaccineDose", ""),
        }
        if encounter.get("vaccineBatch"):
            episode["vaccineBatch"] = encounter["vaccineBatch"]
        if encounter.get("vaccineType"):
            episode["vaccineType"] = encounter["vaccineType"]
        if encounter.get("routeOfAdministration"):
            episode["routeOfAdministration"] = encounter["routeOfAdministration"]

        api_encounter = {
            "id": 1,
            "dateOfService": encounter.get("dateOfService", ""),
            "episodes": [episode],
        }

        payload = {
            "individual": api_individual,
            "encounters": [api_encounter],
            "informationProvider": information_provider,
        }

        # Extract DOB for header (already in ddMMyyyy format from form)
        dob_header = individual.get("dob", "")
        # Convert ddMMyyyy to yyyy-MM-dd for the client header conversion
        if len(dob_header) == 8 and dob_header.isdigit():
            dob_iso = f"{dob_header[4:8]}-{dob_header[2:4]}-{dob_header[0:2]}"
        else:
            dob_iso = dob_header

        raw_response = await self._client.record_encounter(payload, dob_iso)
        parsed = parse_air_response(raw_response.get("rawResponse", raw_response), payload)

        logger.info(
            "resubmit_completed",
            status=parsed["status"],
            status_code=parsed["air_status_code"],
        )

        return parsed


class ConfirmService:
    """Handle confirmation flows for AIR-W-1004 and pended episodes."""

    def __init__(self, air_client: AIRClient) -> None:
        self._client = air_client
        self._confirmation_service = ConfirmationService(air_client)

    async def confirm_record(
        self,
        original_payload: dict[str, Any],
        claim_id: str,
        claim_sequence_number: str | None,
        dob: str,
    ) -> dict[str, Any]:
        """Confirm a single record using stored claimId + claimSequenceNumber.

        Sets acceptAndConfirm=Y. Already-successful encounters MUST be
        excluded from the confirmation payload.

        Args:
            original_payload: The original AddEncounterRequestType sent to AIR.
            claim_id: The claimId from the original AIR response.
            claim_sequence_number: Optional claimSequenceNumber.
            dob: Individual's DOB in yyyy-MM-dd format.

        Returns:
            Parsed AIR response.
        """
        raw_response = await self._confirmation_service.confirm(
            original_payload, claim_id, dob, claim_sequence_number
        )

        air_body = raw_response.get("rawResponse", raw_response)
        parsed = parse_air_response(air_body, original_payload)

        logger.info(
            "confirm_completed",
            status=parsed["status"],
            status_code=parsed["air_status_code"],
            claim_id=claim_id,
        )

        # Include raw response so callers can persist it
        parsed["_raw_response"] = air_body
        return parsed
