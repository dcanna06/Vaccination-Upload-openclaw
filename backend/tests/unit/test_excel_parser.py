"""Tests for TICKET-007: Excel parser service."""

import io
from datetime import datetime

import pytest
from openpyxl import Workbook

from app.middleware.error_handler import FileProcessingError
from app.services.excel_parser import ExcelParserService


def _make_excel(headers: list[str], rows: list[list]) -> bytes:
    """Create an in-memory Excel file with given headers and rows."""
    wb = Workbook()
    ws = wb.active
    ws.append(headers)
    for row in rows:
        ws.append(row)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


@pytest.fixture
def parser():
    return ExcelParserService()


@pytest.fixture
def valid_excel() -> bytes:
    return _make_excel(
        [
            "Medicare Card Number", "Medicare IRN", "IHI Number",
            "First Name", "Last Name", "Date of Birth", "Gender",
            "Postcode", "Date of Service", "Vaccine Code", "Vaccine Dose",
            "Vaccine Batch", "Vaccine Type", "Route of Administration",
            "Administered Overseas", "Country Code",
            "Immunising Provider Number", "School ID", "Antenatal Indicator",
        ],
        [
            [
                "2123456789", "1", None,
                "Jane", "Smith", datetime(1990, 1, 15), "F",
                "2000", datetime(2026, 2, 1), "COMIRN", "1",
                "FL1234", "NIP", "IM",
                "FALSE", None,
                "1234567A", None, "FALSE",
            ],
        ],
    )


class TestParseValidFile:
    def test_parses_single_record(self, parser, valid_excel):
        result = parser.parse(valid_excel)
        assert result["totalRows"] == 1
        assert result["validRecords"] == 1
        assert len(result["records"]) == 1
        assert len(result["errors"]) == 0

    def test_record_has_expected_fields(self, parser, valid_excel):
        rec = parser.parse(valid_excel)["records"][0]
        assert rec["medicareCardNumber"] == "2123456789"
        assert rec["medicareIRN"] == "1"
        assert rec["firstName"] == "Jane"
        assert rec["lastName"] == "Smith"
        assert rec["dateOfBirth"] == "1990-01-15"
        assert rec["gender"] == "F"
        assert rec["postCode"] == "2000"
        assert rec["dateOfService"] == "2026-02-01"
        assert rec["vaccineCode"] == "COMIRN"
        assert rec["vaccineDose"] == "1"
        assert rec["vaccineBatch"] == "FL1234"
        assert rec["vaccineType"] == "NIP"
        assert rec["routeOfAdministration"] == "IM"
        assert rec["administeredOverseas"] is False
        assert rec["immunisingProviderNumber"] == "1234567A"

    def test_row_number_is_2_for_first_data_row(self, parser, valid_excel):
        rec = parser.parse(valid_excel)["records"][0]
        assert rec["rowNumber"] == 2


class TestDateParsing:
    def test_datetime_object(self, parser):
        excel = _make_excel(
            ["Date of Birth", "Vaccine Code"],
            [[datetime(2000, 6, 15), "FLU"]],
        )
        rec = parser.parse(excel)["records"][0]
        assert rec["dateOfBirth"] == "2000-06-15"

    def test_dd_mm_yyyy_string(self, parser):
        excel = _make_excel(
            ["Date of Birth", "Vaccine Code"],
            [["15/06/2000", "FLU"]],
        )
        rec = parser.parse(excel)["records"][0]
        assert rec["dateOfBirth"] == "2000-06-15"

    def test_invalid_date_produces_error(self, parser):
        excel = _make_excel(
            ["Date of Birth", "Vaccine Code"],
            [["not-a-date", "FLU"]],
        )
        result = parser.parse(excel)
        assert len(result["errors"]) == 1
        assert result["errors"][0]["field"] == "dateOfBirth"


class TestGenderNormalization:
    @pytest.mark.parametrize("input_val,expected", [
        ("M", "M"), ("Male", "M"), ("male", "M"),
        ("F", "F"), ("Female", "F"),
        ("X", "X"), ("Not Stated", "X"),
    ])
    def test_valid_genders(self, parser, input_val, expected):
        excel = _make_excel(
            ["Gender", "Vaccine Code"],
            [[input_val, "FLU"]],
        )
        rec = parser.parse(excel)["records"][0]
        assert rec["gender"] == expected

    @pytest.mark.parametrize("input_val", ["Z", "I", "Intersex", "U", "Unknown"])
    def test_invalid_gender_produces_error(self, parser, input_val):
        excel = _make_excel(
            ["Gender", "Vaccine Code"],
            [[input_val, "FLU"]],
        )
        result = parser.parse(excel)
        assert len(result["errors"]) == 1
        assert "Invalid gender" in result["errors"][0]["message"]


class TestEmptyRows:
    def test_empty_rows_are_skipped(self, parser):
        excel = _make_excel(
            ["Vaccine Code", "First Name"],
            [
                ["FLU", "Jane"],
                [None, None],  # empty row
                ["COVID", "John"],
            ],
        )
        result = parser.parse(excel)
        assert result["validRecords"] == 2
        assert result["totalRows"] == 3


class TestInvalidFiles:
    def test_non_excel_bytes_raise_error(self, parser):
        with pytest.raises(FileProcessingError, match="Failed to open"):
            parser.parse(b"not an excel file")

    def test_header_only_raises_error(self, parser):
        excel = _make_excel(["Vaccine Code"], [])
        with pytest.raises(FileProcessingError, match="header row and at least one"):
            parser.parse(excel)

    def test_no_recognized_headers_raises_error(self, parser):
        wb = Workbook()
        ws = wb.active
        ws.append(["Unknown Col 1", "Unknown Col 2"])
        ws.append(["val1", "val2"])
        buf = io.BytesIO()
        wb.save(buf)
        with pytest.raises(FileProcessingError, match="No recognized column"):
            parser.parse(buf.getvalue())


class TestMultipleRecords:
    def test_parses_multiple_rows(self, parser):
        excel = _make_excel(
            ["First Name", "Last Name", "Date of Birth", "Vaccine Code", "Vaccine Dose"],
            [
                ["Jane", "Smith", datetime(1990, 1, 15), "FLU", "1"],
                ["John", "Doe", datetime(1985, 3, 20), "COVID", "2"],
                ["Alice", "Brown", datetime(2000, 12, 1), "COMIRN", "1"],
            ],
        )
        result = parser.parse(excel)
        assert result["validRecords"] == 3
        assert result["records"][0]["firstName"] == "Jane"
        assert result["records"][1]["firstName"] == "John"
        assert result["records"][2]["firstName"] == "Alice"
