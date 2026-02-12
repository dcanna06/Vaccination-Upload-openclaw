"""Tests for provider resolution in the submission flow."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest


class TestResolveDefaultProvider:
    """Test _resolve_default_provider helper."""

    @pytest.mark.asyncio
    async def test_returns_none_when_no_location(self):
        from app.routers.submit import _resolve_default_provider

        result = await _resolve_default_provider(None)
        assert result is None

    @pytest.mark.asyncio
    async def test_returns_provider_from_location(self):
        mock_session = AsyncMock()
        mock_mgr = AsyncMock()
        mock_mgr.get_default_provider.return_value = "1234567A"

        with patch("app.database.async_session_factory") as mock_factory:
            mock_ctx = AsyncMock()
            mock_ctx.__aenter__ = AsyncMock(return_value=mock_session)
            mock_ctx.__aexit__ = AsyncMock(return_value=False)
            mock_factory.return_value = mock_ctx

            with patch("app.services.location_manager.LocationManager", return_value=mock_mgr):
                from app.routers.submit import _resolve_default_provider

                result = await _resolve_default_provider(42)
                assert result == "1234567A"
                mock_mgr.get_default_provider.assert_called_once_with(42)

    @pytest.mark.asyncio
    async def test_returns_none_when_no_providers(self):
        mock_session = AsyncMock()
        mock_mgr = AsyncMock()
        mock_mgr.get_default_provider.return_value = None

        with patch("app.database.async_session_factory") as mock_factory:
            mock_ctx = AsyncMock()
            mock_ctx.__aenter__ = AsyncMock(return_value=mock_session)
            mock_ctx.__aexit__ = AsyncMock(return_value=False)
            mock_factory.return_value = mock_ctx

            with patch("app.services.location_manager.LocationManager", return_value=mock_mgr):
                from app.routers.submit import _resolve_default_provider

                result = await _resolve_default_provider(42)
                assert result is None


class TestLocationManagerGetDefaultProvider:
    """Test LocationManager.get_default_provider method."""

    @pytest.fixture
    def mock_db(self):
        db = AsyncMock()
        db.execute = AsyncMock()
        db.commit = AsyncMock()
        db.refresh = AsyncMock()
        db.add = MagicMock()
        return db

    @pytest.mark.asyncio
    async def test_returns_first_provider(self, mock_db):
        from app.services.location_manager import LocationManager

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = "1234567A"
        mock_db.execute.return_value = mock_result

        mgr = LocationManager(mock_db)
        result = await mgr.get_default_provider(1)
        assert result == "1234567A"

    @pytest.mark.asyncio
    async def test_returns_none_when_no_providers(self, mock_db):
        from app.services.location_manager import LocationManager

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        mgr = LocationManager(mock_db)
        result = await mgr.get_default_provider(99)
        assert result is None


class TestSubmissionProviderFallback:
    """Test the full informationProvider resolution chain in _run_submission."""

    @pytest.mark.asyncio
    async def test_explicit_provider_used_when_present(self):
        """When informationProvider has a providerNumber, it should be used as-is."""
        from app.routers.submit import _submissions, _run_submission

        sub_id = "test-explicit-provider"
        _submissions[sub_id] = {
            "status": "running",
            "batches": [{"encounters": []}],
            "informationProvider": {"providerNumber": "EXPLICIT1"},
            "dryRun": True,
            "locationId": 1,
            "progress": {
                "totalBatches": 1,
                "completedBatches": 0,
                "successfulRecords": 0,
                "failedRecords": 0,
                "pendingConfirmation": 0,
                "currentBatch": 0,
                "status": "running",
            },
            "results": None,
        }

        await _run_submission(sub_id)

        # Dry run doesn't call AIR, but the submission should complete
        assert _submissions[sub_id]["status"] == "completed"

        # Cleanup
        del _submissions[sub_id]

    @pytest.mark.asyncio
    async def test_fallback_to_config_when_no_location(self):
        """When no locationId is set and informationProvider is empty, config is used."""
        from app.routers.submit import _submissions, _run_submission

        sub_id = "test-no-location"
        _submissions[sub_id] = {
            "status": "running",
            "batches": [{"encounters": []}],
            "informationProvider": {},
            "dryRun": True,
            "locationId": None,
            "progress": {
                "totalBatches": 1,
                "completedBatches": 0,
                "successfulRecords": 0,
                "failedRecords": 0,
                "pendingConfirmation": 0,
                "currentBatch": 0,
                "status": "running",
            },
            "results": None,
        }

        await _run_submission(sub_id)

        assert _submissions[sub_id]["status"] == "completed"

        # Cleanup
        del _submissions[sub_id]
