"""Parse AIR AddEncounterResponseType into SubmissionRecord fields.

CRITICAL: TECH.SIS.AIR.02 §5.2.2 — all AIR messages MUST be stored and
displayed verbatim, never truncated or modified.
"""

from __future__ import annotations

from typing import Any

import structlog

logger = structlog.get_logger(__name__)


def extract_episodes(encounters: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Extract episode-level results from AIR encounter responses.

    Each encounter may contain multiple episodes; this flattens them
    into a list of episode result dicts.
    """
    episodes: list[dict[str, Any]] = []
    for enc in encounters:
        enc_id = enc.get("id", "")
        for ep in enc.get("episodes", []):
            info = ep.get("information", {})
            episodes.append({
                "id": str(ep.get("id", "")),
                "encounterId": str(enc_id),
                "status": info.get("status", ""),   # VALID or INVALID
                "code": info.get("code", ""),
                "message": info.get("text", ""),     # VERBATIM
            })
    return episodes


def parse_air_response(
    air_response: dict[str, Any],
    original_request: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Map an AIR AddEncounterResponseType to SubmissionRecord fields.

    Args:
        air_response: Raw JSON response from AIR API.
        original_request: The original AddEncounterRequestType sent to AIR.

    Returns:
        Dict with fields matching the SubmissionRecord schema.

    AIR response structure::

        {
            "statusCode": "AIR-I-1007",
            "codeType": "AIRIBU",
            "message": "All encounter(s)...",      # STORE VERBATIM
            "claimDetails": {
                "claimId": "WB9X4I+$",
                "encounters": [{
                    "id": "1",
                    "information": {
                        "status": "SUCCESS",
                        "code": "AIR-I-1000",
                        "text": "Encounter was..."  # STORE VERBATIM
                    },
                    "episodes": [{
                        "id": "1",
                        "information": {
                            "status": "VALID",
                            "code": "AIR-I-1002",
                            "text": "Vaccine was valid."
                        }
                    }]
                }]
            },
            "errors": [{
                "code": "AIR-E-1018",
                "field": "encounters.dateOfService",
                "message": "Date field..."          # STORE VERBATIM
            }]
        }
    """
    status_code = air_response.get("statusCode", "")

    # Determine record status
    if status_code in ("AIR-I-1007", "AIR-I-1100"):
        status = "SUCCESS"
    elif status_code.startswith("AIR-W"):
        status = "WARNING"
    elif status_code.startswith("AIR-E"):
        status = "ERROR"
    else:
        status = "ERROR"

    # Determine action required
    action = "NONE"
    if status_code in ("AIR-W-1004", "AIR-W-1008"):
        action = "CONFIRM_OR_CORRECT"

    # Extract claim details
    claim_details = air_response.get("claimDetails", {}) or {}
    encounters = claim_details.get("encounters", []) or []

    # For AIR-W-1008, check individual encounters
    if status_code == "AIR-W-1008" and encounters:
        for enc in encounters:
            info = enc.get("information", {})
            if info.get("status") == "WARNING":
                action = "CONFIRM_OR_CORRECT"
                break

    # For AIR-W-1001 (assessment rule failure), also needs confirm
    if status_code == "AIR-W-1001":
        action = "CONFIRM_OR_CORRECT"

    # Build encounter-level results for frontend display
    encounter_results: list[dict[str, Any]] = []
    for enc in encounters:
        info = enc.get("information", {})
        encounter_results.append({
            "id": str(enc.get("id", "")),
            "status": info.get("status", ""),
            "code": info.get("code", ""),
            "message": info.get("text", ""),  # VERBATIM
        })

    result = {
        "status": status,
        "air_status_code": status_code,
        "air_message": air_response.get("message", ""),  # VERBATIM — never truncate
        "air_errors": air_response.get("errors", []) or [],
        "air_episodes": extract_episodes(encounters),
        "air_encounters": encounter_results,
        "claim_id": claim_details.get("claimId"),
        "claim_sequence_number": claim_details.get("claimSequenceNumber"),
        "action_required": action,
    }

    logger.info(
        "air_response_parsed",
        status=status,
        status_code=status_code,
        action_required=action,
        episode_count=len(result["air_episodes"]),
        error_count=len(result["air_errors"]),
    )

    return result
