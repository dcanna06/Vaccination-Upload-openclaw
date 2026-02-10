"""Tests for ORM models — instantiation, table registration, and field access."""

import pytest
from app.models import (
    Base,
    AuditLog,
    Organisation,
    Location,
    LocationProvider,
    SubmissionBatch,
    SubmissionRecord,
)


class TestOrganisationModel:
    def test_instantiation(self):
        org = Organisation(
            name="Test Org",
            proda_org_id="ORG123",
            minor_id_prefix="TO",
            status="active",
        )
        assert org.name == "Test Org"
        assert org.proda_org_id == "ORG123"
        assert org.minor_id_prefix == "TO"
        assert org.status == "active"

    def test_fields_set_when_explicit(self):
        org = Organisation(name="Min Org", proda_org_id="ORG999", status="active")
        assert org.name == "Min Org"
        assert org.status == "active"


class TestLocationModel:
    def test_instantiation(self):
        loc = Location(
            organisation_id=1,
            name="Main Clinic",
            address_line_1="123 Health St",
            suburb="Sydney",
            state="NSW",
            postcode="2000",
            minor_id="MINOR-001",
            status="active",
        )
        assert loc.name == "Main Clinic"
        assert loc.minor_id == "MINOR-001"
        assert loc.address_line_1 == "123 Health St"

    def test_minimal_instantiation(self):
        loc = Location(organisation_id=1, name="Loc", minor_id="M1")
        assert loc.name == "Loc"
        assert loc.minor_id == "M1"
        # server_default fields are None before flush — that's expected
        assert loc.organisation_id == 1


class TestLocationProviderModel:
    def test_instantiation(self):
        lp = LocationProvider(
            location_id=1,
            provider_number="1234567A",
            provider_type="GP",
            hw027_status="submitted",
        )
        assert lp.provider_number == "1234567A"
        assert lp.provider_type == "GP"
        assert lp.hw027_status == "submitted"

    def test_minimal_instantiation(self):
        lp = LocationProvider(location_id=1, provider_number="9999999Z")
        assert lp.provider_number == "9999999Z"
        assert lp.air_access_list is None


class TestBaseMetadata:
    def test_all_tables_registered(self):
        table_names = set(Base.metadata.tables.keys())
        assert "organisations" in table_names
        assert "locations" in table_names
        assert "location_providers" in table_names

    def test_location_has_expected_columns(self):
        cols = {c.name for c in Base.metadata.tables["locations"].columns}
        assert "minor_id" in cols
        assert "organisation_id" in cols
        assert "proda_link_status" in cols

    def test_location_providers_has_unique_constraint(self):
        table = Base.metadata.tables["location_providers"]
        constraint_names = {c.name for c in table.constraints if c.name}
        assert "uq_location_provider" in constraint_names


class TestSubmissionBatchModel:
    def test_instantiation(self):
        batch = SubmissionBatch(
            organisation_id=1,
            user_id=1,
            file_name="vaccinations.xlsx",
            total_records=50,
            status="draft",
            environment="vendor",
        )
        assert batch.file_name == "vaccinations.xlsx"
        assert batch.total_records == 50
        assert batch.status == "draft"
        assert batch.environment == "vendor"

    def test_minimal_instantiation(self):
        batch = SubmissionBatch(
            organisation_id=1,
            user_id=1,
            file_name="test.xlsx",
        )
        assert batch.file_name == "test.xlsx"
        assert batch.organisation_id == 1
        assert batch.user_id == 1

    def test_counter_fields(self):
        batch = SubmissionBatch(
            organisation_id=1,
            user_id=1,
            file_name="test.xlsx",
            successful=10,
            failed=2,
            warnings=3,
            pending_confirmation=1,
        )
        assert batch.successful == 10
        assert batch.failed == 2
        assert batch.warnings == 3
        assert batch.pending_confirmation == 1

    def test_location_id_optional(self):
        batch = SubmissionBatch(
            organisation_id=1,
            user_id=1,
            file_name="test.xlsx",
            location_id=5,
        )
        assert batch.location_id == 5


class TestSubmissionRecordModel:
    def test_instantiation(self):
        record = SubmissionRecord(
            batch_id=1,
            row_number=3,
            air_status_code="AIR-I-1007",
            air_message="Claim processed successfully",
            claim_id="CLAIM-001",
            claim_sequence_number="1",
            status="success",
        )
        assert record.batch_id == 1
        assert record.row_number == 3
        assert record.air_status_code == "AIR-I-1007"
        assert record.status == "success"

    def test_minimal_instantiation(self):
        record = SubmissionRecord(batch_id=1, row_number=1)
        assert record.row_number == 1
        assert record.request_payload is None
        assert record.response_payload is None

    def test_json_payload_fields(self):
        record = SubmissionRecord(
            batch_id=1,
            row_number=1,
            request_payload={"encounter": {"personalDetails": {}}},
            response_payload={"statusCode": "AIR-I-1007"},
        )
        assert record.request_payload["encounter"]["personalDetails"] == {}
        assert record.response_payload["statusCode"] == "AIR-I-1007"

    def test_confirmation_fields(self):
        record = SubmissionRecord(
            batch_id=1,
            row_number=1,
            status="warning",
            confirmation_status="pending_confirm",
        )
        assert record.confirmation_status == "pending_confirm"


class TestAuditLogModel:
    def test_instantiation(self):
        log = AuditLog(
            user_id=1,
            action="login",
            resource_type="user",
            resource_id=1,
            ip_address="192.168.1.1",
        )
        assert log.action == "login"
        assert log.resource_type == "user"
        assert log.ip_address == "192.168.1.1"

    def test_minimal_instantiation(self):
        log = AuditLog(action="system_start")
        assert log.action == "system_start"
        assert log.user_id is None
        assert log.details is None

    def test_details_json_field(self):
        log = AuditLog(
            user_id=1,
            action="submit_batch",
            details={"batch_id": 42, "records": 100},
        )
        assert log.details["batch_id"] == 42

    def test_tables_registered(self):
        table_names = set(Base.metadata.tables.keys())
        assert "submission_batches" in table_names
        assert "submission_records" in table_names
        assert "audit_log" in table_names

    def test_submission_batches_columns(self):
        cols = {c.name for c in Base.metadata.tables["submission_batches"].columns}
        assert "file_name" in cols
        assert "total_records" in cols
        assert "status" in cols
        assert "location_id" in cols
        assert "environment" in cols

    def test_submission_records_columns(self):
        cols = {c.name for c in Base.metadata.tables["submission_records"].columns}
        assert "batch_id" in cols
        assert "row_number" in cols
        assert "request_payload" in cols
        assert "air_status_code" in cols
        assert "confirmation_status" in cols

    def test_audit_log_columns(self):
        cols = {c.name for c in Base.metadata.tables["audit_log"].columns}
        assert "action" in cols
        assert "user_id" in cols
        assert "details" in cols
        assert "ip_address" in cols
