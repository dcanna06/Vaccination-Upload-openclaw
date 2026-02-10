"""Tests for ORM models — instantiation, table registration, and field access."""

import pytest
from app.models import Base, Organisation, Location, LocationProvider


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
