"""Tests for SubmissionStore JSON file persistence."""

import json
from pathlib import Path

import pytest

from app.services.submission_store import SubmissionStore


@pytest.fixture
def store(tmp_path: Path) -> SubmissionStore:
    """Create a SubmissionStore backed by a temporary directory."""
    return SubmissionStore(base_dir=tmp_path)


@pytest.fixture
def sample_metadata() -> dict:
    return {
        "status": "completed",
        "createdAt": "2026-02-09T10:00:00+00:00",
        "completedAt": "2026-02-09T10:01:00+00:00",
        "dryRun": False,
        "progress": {
            "totalBatches": 2,
            "completedBatches": 2,
            "successfulRecords": 1,
            "failedRecords": 1,
            "pendingConfirmation": 0,
            "currentBatch": 0,
            "status": "completed",
        },
        "results": {
            "successful": 1,
            "failed": 1,
            "results": [],
        },
    }


# ============================================================================
# Metadata Tests
# ============================================================================

class TestSaveLoadMetadata:
    """Test metadata persistence round-trip."""

    def test_save_and_load(self, store: SubmissionStore, sample_metadata: dict) -> None:
        store.save_metadata("sub-001", sample_metadata)
        loaded = store.load_metadata("sub-001")
        assert loaded == sample_metadata

    def test_load_missing_returns_none(self, store: SubmissionStore) -> None:
        assert store.load_metadata("nonexistent") is None

    def test_overwrite(self, store: SubmissionStore, sample_metadata: dict) -> None:
        store.save_metadata("sub-001", sample_metadata)
        updated = {**sample_metadata, "status": "error"}
        store.save_metadata("sub-001", updated)
        loaded = store.load_metadata("sub-001")
        assert loaded["status"] == "error"

    def test_metadata_written_as_json(self, store: SubmissionStore, tmp_path: Path, sample_metadata: dict) -> None:
        store.save_metadata("sub-002", sample_metadata)
        path = tmp_path / "sub-002" / "metadata.json"
        assert path.exists()
        data = json.loads(path.read_text())
        assert data["status"] == "completed"

    def test_corrupt_json_returns_none(self, store: SubmissionStore, tmp_path: Path) -> None:
        sub_dir = tmp_path / "corrupt-sub"
        sub_dir.mkdir()
        (sub_dir / "metadata.json").write_text("NOT JSON {{{")
        assert store.load_metadata("corrupt-sub") is None


class TestLoadAllMetadata:
    """Test bulk loading of all submissions."""

    def test_empty_directory(self, store: SubmissionStore) -> None:
        assert store.load_all_metadata() == {}

    def test_loads_multiple(self, store: SubmissionStore, sample_metadata: dict) -> None:
        store.save_metadata("aaa", sample_metadata)
        store.save_metadata("bbb", {**sample_metadata, "status": "error"})
        result = store.load_all_metadata()
        assert len(result) == 2
        assert result["aaa"]["status"] == "completed"
        assert result["bbb"]["status"] == "error"

    def test_skips_files_not_dirs(self, store: SubmissionStore, tmp_path: Path) -> None:
        (tmp_path / "stray-file.txt").write_text("ignore me")
        assert store.load_all_metadata() == {}

    def test_skips_dirs_without_metadata(self, store: SubmissionStore, tmp_path: Path) -> None:
        (tmp_path / "empty-sub").mkdir()
        assert store.load_all_metadata() == {}


# ============================================================================
# Payload Tests
# ============================================================================

class TestSavePayload:
    """Test AIR request/response payload persistence."""

    def test_saves_request_and_response(self, store: SubmissionStore, tmp_path: Path) -> None:
        request = {"individual": {"personalDetails": {"dateOfBirth": "15011990"}}}
        response = {"statusCode": "AIR-I-1007", "message": "OK"}

        store.save_payload("sub-001", 1, request, response)

        req_path = tmp_path / "sub-001" / "payloads" / "001_request.json"
        resp_path = tmp_path / "sub-001" / "payloads" / "001_response.json"
        assert req_path.exists()
        assert resp_path.exists()

        req_data = json.loads(req_path.read_text())
        assert req_data["individual"]["personalDetails"]["dateOfBirth"] == "15011990"
        assert "_timestamp" in req_data

        resp_data = json.loads(resp_path.read_text())
        assert resp_data["statusCode"] == "AIR-I-1007"
        assert "_timestamp" in resp_data

    def test_saves_request_only_when_response_none(self, store: SubmissionStore, tmp_path: Path) -> None:
        store.save_payload("sub-001", 2, {"test": True}, None)

        req_path = tmp_path / "sub-001" / "payloads" / "002_request.json"
        resp_path = tmp_path / "sub-001" / "payloads" / "002_response.json"
        assert req_path.exists()
        assert not resp_path.exists()

    def test_encounter_index_zero_padded(self, store: SubmissionStore, tmp_path: Path) -> None:
        store.save_payload("sub-001", 10, {"x": 1}, {"y": 2})
        assert (tmp_path / "sub-001" / "payloads" / "010_request.json").exists()
        assert (tmp_path / "sub-001" / "payloads" / "010_response.json").exists()

    def test_multiple_encounters(self, store: SubmissionStore, tmp_path: Path) -> None:
        store.save_payload("sub-001", 1, {"enc": 1}, {"res": 1})
        store.save_payload("sub-001", 2, {"enc": 2}, {"res": 2})
        store.save_payload("sub-001", 3, {"enc": 3}, {"res": 3})

        payloads_dir = tmp_path / "sub-001" / "payloads"
        files = sorted(f.name for f in payloads_dir.iterdir())
        assert files == [
            "001_request.json",
            "001_response.json",
            "002_request.json",
            "002_response.json",
            "003_request.json",
            "003_response.json",
        ]
