"""Persistent JSON-file storage for submission metadata and AIR payloads.

Storage layout:
  backend/data/submissions/
    {submission-uuid}/
      metadata.json
      payloads/
        001_request.json
        001_response.json
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import structlog

logger = structlog.get_logger(__name__)

_DEFAULT_BASE = Path(__file__).resolve().parent.parent.parent / "data" / "submissions"


class SubmissionStore:
    """Read/write submission data as JSON files on disk."""

    def __init__(self, base_dir: Path | None = None) -> None:
        self._base = base_dir or _DEFAULT_BASE
        self._base.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # Metadata
    # ------------------------------------------------------------------

    def save_metadata(self, submission_id: str, data: dict[str, Any]) -> None:
        """Write (or overwrite) metadata.json for a submission."""
        sub_dir = self._base / submission_id
        sub_dir.mkdir(parents=True, exist_ok=True)
        path = sub_dir / "metadata.json"
        path.write_text(json.dumps(data, default=str, indent=2), encoding="utf-8")

    def load_metadata(self, submission_id: str) -> dict[str, Any] | None:
        """Load metadata.json for a single submission, or None if missing."""
        path = self._base / submission_id / "metadata.json"
        if not path.exists():
            return None
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as exc:
            logger.warning("metadata_load_failed", submission_id=submission_id, error=str(exc))
            return None

    def load_all_metadata(self) -> dict[str, dict[str, Any]]:
        """Scan every sub-directory and return {submission_id: metadata}."""
        result: dict[str, dict[str, Any]] = {}
        if not self._base.exists():
            return result
        for child in sorted(self._base.iterdir()):
            if child.is_dir():
                meta = self.load_metadata(child.name)
                if meta is not None:
                    result[child.name] = meta
        return result

    # ------------------------------------------------------------------
    # Payloads
    # ------------------------------------------------------------------

    def save_payload(
        self,
        submission_id: str,
        encounter_index: int,
        request_body: dict[str, Any],
        response_body: dict[str, Any] | None,
    ) -> None:
        """Persist the raw AIR request/response for one encounter."""
        payloads_dir = self._base / submission_id / "payloads"
        payloads_dir.mkdir(parents=True, exist_ok=True)
        prefix = f"{encounter_index:03d}"

        ts = datetime.now(timezone.utc).isoformat()

        req_path = payloads_dir / f"{prefix}_request.json"
        req_path.write_text(
            json.dumps({**request_body, "_timestamp": ts}, default=str, indent=2),
            encoding="utf-8",
        )

        if response_body is not None:
            resp_path = payloads_dir / f"{prefix}_response.json"
            resp_path.write_text(
                json.dumps({**response_body, "_timestamp": ts}, default=str, indent=2),
                encoding="utf-8",
            )
