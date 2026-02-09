"""Tests for AIR response parser service (DEV-009)."""

import pytest
from app.services.air_response_parser import parse_air_response, extract_episodes


class TestExtractEpisodes:
    """Tests for extract_episodes helper."""

    def test_empty_encounters(self):
        assert extract_episodes([]) == []

    def test_single_episode(self):
        encounters = [{
            "id": "1",
            "episodes": [{
                "id": "1",
                "information": {
                    "status": "VALID",
                    "code": "AIR-I-1002",
                    "text": "Vaccine was valid.",
                },
            }],
        }]
        result = extract_episodes(encounters)
        assert len(result) == 1
        assert result[0]["id"] == "1"
        assert result[0]["encounterId"] == "1"
        assert result[0]["status"] == "VALID"
        assert result[0]["code"] == "AIR-I-1002"
        assert result[0]["message"] == "Vaccine was valid."

    def test_multiple_episodes_across_encounters(self):
        encounters = [
            {
                "id": "1",
                "episodes": [
                    {"id": "1", "information": {"status": "VALID", "code": "AIR-I-1002", "text": "Valid."}},
                    {"id": "2", "information": {"status": "INVALID", "code": "AIR-E-1023", "text": "Invalid code."}},
                ],
            },
            {
                "id": "2",
                "episodes": [
                    {"id": "1", "information": {"status": "VALID", "code": "AIR-I-1002", "text": "Valid."}},
                ],
            },
        ]
        result = extract_episodes(encounters)
        assert len(result) == 3
        assert result[0]["encounterId"] == "1"
        assert result[1]["encounterId"] == "1"
        assert result[2]["encounterId"] == "2"

    def test_missing_information_field(self):
        encounters = [{"id": "1", "episodes": [{"id": "1"}]}]
        result = extract_episodes(encounters)
        assert result[0]["status"] == ""
        assert result[0]["code"] == ""
        assert result[0]["message"] == ""


class TestParseAirResponse:
    """Tests for parse_air_response main function."""

    def test_success_response(self):
        """AIR-I-1007 is a full success."""
        response = {
            "statusCode": "AIR-I-1007",
            "message": "All encounter(s) processed successfully.",
            "claimDetails": {
                "claimId": "WB9X4I+$",
                "claimSequenceNumber": "1",
                "encounters": [{
                    "id": "1",
                    "information": {"status": "SUCCESS", "code": "AIR-I-1000", "text": "Encounter was accepted."},
                    "episodes": [{
                        "id": "1",
                        "information": {"status": "VALID", "code": "AIR-I-1002", "text": "Vaccine was valid."},
                    }],
                }],
            },
        }
        result = parse_air_response(response)
        assert result["status"] == "SUCCESS"
        assert result["air_status_code"] == "AIR-I-1007"
        assert result["air_message"] == "All encounter(s) processed successfully."
        assert result["action_required"] == "NONE"
        assert result["claim_id"] == "WB9X4I+$"
        assert result["claim_sequence_number"] == "1"
        assert len(result["air_episodes"]) == 1
        assert result["air_episodes"][0]["status"] == "VALID"

    def test_air_i_1100_success(self):
        """AIR-I-1100 is also a success status."""
        response = {"statusCode": "AIR-I-1100", "message": "Success."}
        result = parse_air_response(response)
        assert result["status"] == "SUCCESS"
        assert result["action_required"] == "NONE"

    def test_warning_w1004_requires_confirmation(self):
        """AIR-W-1004 requires confirm or correct."""
        response = {
            "statusCode": "AIR-W-1004",
            "message": "The individual details could not be matched with AIR records.",
            "claimDetails": {
                "claimId": "ABC123",
                "encounters": [],
            },
        }
        result = parse_air_response(response)
        assert result["status"] == "WARNING"
        assert result["air_status_code"] == "AIR-W-1004"
        assert result["action_required"] == "CONFIRM_OR_CORRECT"
        assert result["claim_id"] == "ABC123"

    def test_warning_w1008_with_encounter_warning(self):
        """AIR-W-1008 with encounter-level warnings."""
        response = {
            "statusCode": "AIR-W-1008",
            "message": "One or more encounters have warnings.",
            "claimDetails": {
                "claimId": "DEF456",
                "encounters": [{
                    "id": "1",
                    "information": {"status": "WARNING", "code": "AIR-W-1001", "text": "Pended."},
                    "episodes": [],
                }],
            },
        }
        result = parse_air_response(response)
        assert result["status"] == "WARNING"
        assert result["action_required"] == "CONFIRM_OR_CORRECT"

    def test_warning_w1001_requires_confirmation(self):
        """AIR-W-1001 assessment rule failure also needs confirm."""
        response = {
            "statusCode": "AIR-W-1001",
            "message": "Assessment rules not met.",
        }
        result = parse_air_response(response)
        assert result["status"] == "WARNING"
        assert result["action_required"] == "CONFIRM_OR_CORRECT"

    def test_error_response(self):
        """AIR-E-1005 with field-level errors."""
        response = {
            "statusCode": "AIR-E-1005",
            "message": "Validation failed for one or more fields.",
            "errors": [
                {"code": "AIR-E-1018", "field": "encounters.dateOfService", "message": "Date is in the future."},
                {"code": "AIR-E-1017", "field": "individual.medicareCard.medicareCardNumber", "message": "Check digit failed."},
            ],
        }
        result = parse_air_response(response)
        assert result["status"] == "ERROR"
        assert result["air_status_code"] == "AIR-E-1005"
        assert result["action_required"] == "NONE"
        assert len(result["air_errors"]) == 2
        assert result["air_errors"][0]["code"] == "AIR-E-1018"
        assert result["air_errors"][0]["field"] == "encounters.dateOfService"
        assert result["air_errors"][0]["message"] == "Date is in the future."

    def test_verbatim_message_preserved(self):
        """CRITICAL: AIR messages must be stored exactly as received."""
        weird_message = "  Spaces & special chars: <html> 'quotes' \"double\" \t\ttabs  "
        response = {
            "statusCode": "AIR-E-1006",
            "message": weird_message,
        }
        result = parse_air_response(response)
        assert result["air_message"] == weird_message

    def test_empty_response(self):
        """Handle response with no statusCode gracefully."""
        result = parse_air_response({})
        assert result["status"] == "ERROR"
        assert result["air_status_code"] == ""
        assert result["air_message"] == ""
        assert result["action_required"] == "NONE"

    def test_no_claim_details(self):
        """Handle response without claimDetails."""
        response = {
            "statusCode": "AIR-E-1005",
            "message": "Error.",
        }
        result = parse_air_response(response)
        assert result["claim_id"] is None
        assert result["claim_sequence_number"] is None
        assert result["air_episodes"] == []

    def test_null_claim_details(self):
        """Handle explicit null claimDetails."""
        response = {
            "statusCode": "AIR-I-1007",
            "message": "Success.",
            "claimDetails": None,
        }
        result = parse_air_response(response)
        assert result["claim_id"] is None

    def test_null_errors(self):
        """Handle explicit null errors."""
        response = {
            "statusCode": "AIR-I-1007",
            "message": "Success.",
            "errors": None,
        }
        result = parse_air_response(response)
        assert result["air_errors"] == []

    def test_encounter_results_extracted(self):
        """Encounter-level results are returned for frontend display."""
        response = {
            "statusCode": "AIR-I-1007",
            "message": "Success.",
            "claimDetails": {
                "claimId": "XYZ",
                "encounters": [
                    {
                        "id": "1",
                        "information": {"status": "SUCCESS", "code": "AIR-I-1000", "text": "OK."},
                        "episodes": [],
                    },
                    {
                        "id": "2",
                        "information": {"status": "SUCCESS", "code": "AIR-I-1000", "text": "OK too."},
                        "episodes": [],
                    },
                ],
            },
        }
        result = parse_air_response(response)
        assert len(result["air_encounters"]) == 2
        assert result["air_encounters"][0]["id"] == "1"
        assert result["air_encounters"][1]["id"] == "2"
