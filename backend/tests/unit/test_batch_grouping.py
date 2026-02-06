"""Tests for batch grouping service."""

import pytest

from app.services.batch_grouping import (
    MAX_ENCOUNTERS_PER_REQUEST,
    MAX_EPISODES_PER_ENCOUNTER,
    BatchGroupingService,
    _individual_key,
)


@pytest.fixture
def service() -> BatchGroupingService:
    return BatchGroupingService()


def _make_record(
    medicare: str = "2123456789",
    irn: str = "1",
    dob: str = "1990-01-15",
    gender: str = "F",
    dos: str = "2026-02-01",
    vaccine_code: str = "COMIRN",
    dose: str = "1",
    provider: str = "1234567A",
    row: int = 2,
    **kwargs,
) -> dict:
    record = {
        "rowNumber": row,
        "medicareCardNumber": medicare,
        "medicareIRN": irn,
        "dateOfBirth": dob,
        "gender": gender,
        "dateOfService": dos,
        "vaccineCode": vaccine_code,
        "vaccineDose": dose,
        "immunisingProviderNumber": provider,
        "firstName": "Jane",
        "lastName": "Smith",
    }
    record.update(kwargs)
    return record


class TestIndividualKey:
    """Test individual grouping key generation."""

    def test_medicare_key(self) -> None:
        r = _make_record(medicare="2123456789", irn="1")
        key = _individual_key(r)
        assert key.startswith("medicare:")
        assert "2123456789" in key

    def test_ihi_key_when_no_medicare(self) -> None:
        r = _make_record(medicare="", irn="", ihiNumber="8003608833357361")
        r["medicareCardNumber"] = ""
        key = _individual_key(r)
        assert key.startswith("ihi:")
        assert "8003608833357361" in key

    def test_demographic_key_fallback(self) -> None:
        r = _make_record()
        r["medicareCardNumber"] = ""
        r["ihiNumber"] = ""
        key = _individual_key(r)
        assert key.startswith("demo:")
        assert "JANE" in key
        assert "SMITH" in key

    def test_same_individual_same_key(self) -> None:
        r1 = _make_record(row=2, dos="2026-01-01")
        r2 = _make_record(row=3, dos="2026-02-01")
        assert _individual_key(r1) == _individual_key(r2)

    def test_different_medicare_different_key(self) -> None:
        r1 = _make_record(medicare="2123456789")
        r2 = _make_record(medicare="9876543210")
        assert _individual_key(r1) != _individual_key(r2)


class TestSingleRecord:
    """Test grouping a single record."""

    def test_single_record_produces_one_batch(self, service: BatchGroupingService) -> None:
        records = [_make_record()]
        batches = service.group(records)
        assert len(batches) == 1

    def test_single_record_has_one_encounter(self, service: BatchGroupingService) -> None:
        batches = service.group([_make_record()])
        assert batches[0]["encounterCount"] == 1

    def test_encounter_has_one_episode(self, service: BatchGroupingService) -> None:
        batches = service.group([_make_record()])
        encounter = batches[0]["encounters"][0]
        assert len(encounter["episodes"]) == 1

    def test_episode_id_is_1(self, service: BatchGroupingService) -> None:
        batches = service.group([_make_record()])
        episode = batches[0]["encounters"][0]["episodes"][0]
        assert episode["id"] == "1"

    def test_encounter_id_is_1(self, service: BatchGroupingService) -> None:
        batches = service.group([_make_record()])
        assert batches[0]["encounters"][0]["id"] == "1"

    def test_source_rows_preserved(self, service: BatchGroupingService) -> None:
        batches = service.group([_make_record(row=5)])
        assert 5 in batches[0]["sourceRows"]


class TestSameIndividualSameDate:
    """Test multiple vaccines for same individual on same date."""

    def test_groups_into_single_encounter(self, service: BatchGroupingService) -> None:
        records = [
            _make_record(row=2, vaccine_code="COMIRN", dose="1"),
            _make_record(row=3, vaccine_code="INFLVX", dose="1"),
        ]
        batches = service.group(records)
        assert len(batches) == 1
        assert batches[0]["encounterCount"] == 1

    def test_encounter_has_two_episodes(self, service: BatchGroupingService) -> None:
        records = [
            _make_record(row=2, vaccine_code="COMIRN", dose="1"),
            _make_record(row=3, vaccine_code="INFLVX", dose="1"),
        ]
        batches = service.group(records)
        assert len(batches[0]["encounters"][0]["episodes"]) == 2

    def test_episode_ids_sequential(self, service: BatchGroupingService) -> None:
        records = [
            _make_record(row=2, vaccine_code="COMIRN"),
            _make_record(row=3, vaccine_code="INFLVX"),
            _make_record(row=4, vaccine_code="HEPB"),
        ]
        batches = service.group(records)
        eps = batches[0]["encounters"][0]["episodes"]
        assert [e["id"] for e in eps] == ["1", "2", "3"]


class TestSameIndividualDifferentDates:
    """Test same individual with different dates of service."""

    def test_creates_separate_encounters(self, service: BatchGroupingService) -> None:
        records = [
            _make_record(row=2, dos="2026-01-01"),
            _make_record(row=3, dos="2026-02-01"),
        ]
        batches = service.group(records)
        assert batches[0]["encounterCount"] == 2

    def test_encounter_ids_sequential(self, service: BatchGroupingService) -> None:
        records = [
            _make_record(row=2, dos="2026-01-01"),
            _make_record(row=3, dos="2026-02-01"),
        ]
        batches = service.group(records)
        ids = [e["id"] for e in batches[0]["encounters"]]
        assert ids == ["1", "2"]


class TestDifferentIndividuals:
    """Test different individuals."""

    def test_separate_encounters(self, service: BatchGroupingService) -> None:
        records = [
            _make_record(row=2, medicare="2123456789"),
            _make_record(row=3, medicare="9876543210"),
        ]
        batches = service.group(records)
        total_encounters = sum(b["encounterCount"] for b in batches)
        assert total_encounters == 2


class TestEpisodeLimitEnforced:
    """Test that max 5 episodes per encounter is enforced."""

    def test_six_episodes_split_into_two_encounters(self, service: BatchGroupingService) -> None:
        records = [
            _make_record(row=i, vaccine_code=f"VAX{i}", dose=str(i))
            for i in range(2, 8)  # 6 records
        ]
        batches = service.group(records)
        # Should split into 2 encounters (5 + 1)
        total_encounters = sum(b["encounterCount"] for b in batches)
        assert total_encounters == 2

    def test_first_encounter_has_5_episodes(self, service: BatchGroupingService) -> None:
        records = [
            _make_record(row=i, vaccine_code=f"VAX{i}", dose=str(i))
            for i in range(2, 8)
        ]
        batches = service.group(records)
        assert len(batches[0]["encounters"][0]["episodes"]) == MAX_EPISODES_PER_ENCOUNTER

    def test_second_encounter_has_remaining(self, service: BatchGroupingService) -> None:
        records = [
            _make_record(row=i, vaccine_code=f"VAX{i}", dose=str(i))
            for i in range(2, 8)
        ]
        batches = service.group(records)
        assert len(batches[0]["encounters"][1]["episodes"]) == 1


class TestEncounterLimitEnforced:
    """Test that max 10 encounters per request is enforced."""

    def test_eleven_encounters_split_into_two_batches(self, service: BatchGroupingService) -> None:
        # 11 different individuals = 11 encounters
        records = [
            _make_record(row=i, medicare=f"000000{i:04d}", dos="2026-01-01")
            for i in range(11)
        ]
        batches = service.group(records)
        assert len(batches) == 2

    def test_first_batch_has_10_encounters(self, service: BatchGroupingService) -> None:
        records = [
            _make_record(row=i, medicare=f"000000{i:04d}", dos="2026-01-01")
            for i in range(11)
        ]
        batches = service.group(records)
        assert batches[0]["encounterCount"] == MAX_ENCOUNTERS_PER_REQUEST

    def test_second_batch_has_remaining(self, service: BatchGroupingService) -> None:
        records = [
            _make_record(row=i, medicare=f"000000{i:04d}", dos="2026-01-01")
            for i in range(11)
        ]
        batches = service.group(records)
        assert batches[1]["encounterCount"] == 1


class TestLargeDataset:
    """Test with a large number of records."""

    def test_50_records_same_individual(self, service: BatchGroupingService) -> None:
        """50 vaccines for same person on same date -> 10 encounters (5 episodes each)."""
        records = [
            _make_record(row=i, vaccine_code=f"V{i:03d}", dose="1")
            for i in range(2, 52)
        ]
        batches = service.group(records)
        total_encounters = sum(b["encounterCount"] for b in batches)
        assert total_encounters == 10  # 50 / 5 = 10

    def test_50_records_preserves_all_row_numbers(self, service: BatchGroupingService) -> None:
        records = [
            _make_record(row=i, vaccine_code=f"V{i:03d}", dose="1")
            for i in range(2, 52)
        ]
        batches = service.group(records)
        all_rows = []
        for batch in batches:
            all_rows.extend(batch["sourceRows"])
        assert sorted(all_rows) == list(range(2, 52))


class TestIndividualExtraction:
    """Test that individual fields are correctly extracted."""

    def test_medicare_card_included(self, service: BatchGroupingService) -> None:
        batches = service.group([_make_record(medicare="2123456789", irn="1")])
        ind = batches[0]["encounters"][0]["individual"]
        assert ind["medicareCard"]["medicareCardNumber"] == "2123456789"
        assert ind["medicareCard"]["medicareIRN"] == "1"

    def test_ihi_included(self, service: BatchGroupingService) -> None:
        batches = service.group([_make_record(ihiNumber="8003608833357361")])
        ind = batches[0]["encounters"][0]["individual"]
        assert ind["ihiNumber"] == "8003608833357361"

    def test_personal_details(self, service: BatchGroupingService) -> None:
        batches = service.group([_make_record(dob="1990-01-15", gender="F")])
        pd = batches[0]["encounters"][0]["individual"]["personalDetails"]
        assert pd["dateOfBirth"] == "1990-01-15"
        assert pd["gender"] == "F"

    def test_postcode_included(self, service: BatchGroupingService) -> None:
        batches = service.group([_make_record(postCode="2000")])
        ind = batches[0]["encounters"][0]["individual"]
        assert ind["address"]["postCode"] == "2000"


class TestEncounterFields:
    """Test encounter-level field extraction."""

    def test_provider_number(self, service: BatchGroupingService) -> None:
        batches = service.group([_make_record(provider="1234567A")])
        enc = batches[0]["encounters"][0]
        assert enc["immunisationProvider"]["providerNumber"] == "1234567A"

    def test_administered_overseas(self, service: BatchGroupingService) -> None:
        batches = service.group([_make_record(administeredOverseas=True, countryCode="USA")])
        enc = batches[0]["encounters"][0]
        assert enc["administeredOverseas"] is True
        assert enc["countryCode"] == "USA"

    def test_antenatal_indicator(self, service: BatchGroupingService) -> None:
        batches = service.group([_make_record(antenatalIndicator=True)])
        enc = batches[0]["encounters"][0]
        assert enc["antenatalIndicator"] is True

    def test_school_id(self, service: BatchGroupingService) -> None:
        batches = service.group([_make_record(schoolId="123456789")])
        enc = batches[0]["encounters"][0]
        assert enc["schoolId"] == "123456789"


class TestEpisodeFields:
    """Test episode field extraction."""

    def test_vaccine_code(self, service: BatchGroupingService) -> None:
        batches = service.group([_make_record(vaccine_code="COMIRN")])
        ep = batches[0]["encounters"][0]["episodes"][0]
        assert ep["vaccineCode"] == "COMIRN"

    def test_vaccine_batch(self, service: BatchGroupingService) -> None:
        batches = service.group([_make_record(vaccineBatch="FL1234")])
        ep = batches[0]["encounters"][0]["episodes"][0]
        assert ep["vaccineBatch"] == "FL1234"

    def test_vaccine_type(self, service: BatchGroupingService) -> None:
        batches = service.group([_make_record(vaccineType="NIP")])
        ep = batches[0]["encounters"][0]["episodes"][0]
        assert ep["vaccineType"] == "NIP"

    def test_route_of_administration(self, service: BatchGroupingService) -> None:
        batches = service.group([_make_record(routeOfAdministration="IM")])
        ep = batches[0]["encounters"][0]["episodes"][0]
        assert ep["routeOfAdministration"] == "IM"
