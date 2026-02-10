"""Tests for Location CRUD — schemas, manager, router."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.schemas.location import LocationCreate, LocationRead, LocationUpdate


# --- Schema tests ---

class TestLocationCreate:
    def test_valid(self):
        loc = LocationCreate(name="Clinic A", organisation_id=1)
        assert loc.name == "Clinic A"
        assert loc.organisation_id == 1
        assert loc.address_line_1 == ""

    def test_name_required(self):
        with pytest.raises(Exception):
            LocationCreate(name="", organisation_id=1)

    def test_full_fields(self):
        loc = LocationCreate(
            name="Clinic B",
            organisation_id=2,
            address_line_1="1 Main St",
            address_line_2="Suite 5",
            suburb="Melbourne",
            state="VIC",
            postcode="3000",
        )
        assert loc.suburb == "Melbourne"


class TestLocationUpdate:
    def test_partial_update(self):
        upd = LocationUpdate(name="New Name")
        assert upd.name == "New Name"
        assert upd.address_line_1 is None

    def test_empty_update(self):
        upd = LocationUpdate()
        assert upd.name is None


class TestLocationRead:
    def test_from_attributes(self):
        """LocationRead should accept ORM-like objects."""
        mock = MagicMock()
        mock.id = 1
        mock.organisation_id = 1
        mock.name = "Test"
        mock.address_line_1 = ""
        mock.address_line_2 = ""
        mock.suburb = ""
        mock.state = ""
        mock.postcode = ""
        mock.minor_id = "001"
        mock.proda_link_status = "pending"
        mock.status = "active"
        mock.created_at = "2026-01-01T00:00:00+00:00"
        mock.updated_at = "2026-01-01T00:00:00+00:00"

        read = LocationRead.model_validate(mock, from_attributes=True)
        assert read.id == 1
        assert read.minor_id == "001"


# --- LocationManager tests (mocked DB) ---

class TestLocationManager:
    @pytest.fixture
    def mock_db(self):
        db = AsyncMock()
        db.execute = AsyncMock()
        db.commit = AsyncMock()
        db.refresh = AsyncMock()
        db.add = MagicMock()
        return db

    @pytest.mark.asyncio
    async def test_get_returns_none(self, mock_db):
        from app.services.location_manager import LocationManager

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        mgr = LocationManager(mock_db)
        result = await mgr.get(999)
        assert result is None

    @pytest.mark.asyncio
    async def test_get_returns_location(self, mock_db):
        from app.services.location_manager import LocationManager

        mock_loc = MagicMock()
        mock_loc.id = 1
        mock_loc.name = "Clinic"
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_loc
        mock_db.execute.return_value = mock_result

        mgr = LocationManager(mock_db)
        result = await mgr.get(1)
        assert result.name == "Clinic"

    @pytest.mark.asyncio
    async def test_deactivate_sets_inactive(self, mock_db):
        from app.services.location_manager import LocationManager

        mock_loc = MagicMock()
        mock_loc.id = 1
        mock_loc.status = "active"
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_loc
        mock_db.execute.return_value = mock_result

        mgr = LocationManager(mock_db)
        result = await mgr.deactivate(1)
        assert result.status == "inactive"

    @pytest.mark.asyncio
    async def test_update_strips_minor_id(self, mock_db):
        from app.services.location_manager import LocationManager

        mock_loc = MagicMock()
        mock_loc.id = 1
        mock_loc.name = "Old"
        mock_loc.minor_id = "001"
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_loc
        mock_db.execute.return_value = mock_result

        mgr = LocationManager(mock_db)
        result = await mgr.update(1, name="New", minor_id="HACKED")
        # minor_id should remain unchanged
        assert result.minor_id == "001"

    @pytest.mark.asyncio
    async def test_get_minor_id(self, mock_db):
        from app.services.location_manager import LocationManager

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = "MI-001"
        mock_db.execute.return_value = mock_result

        mgr = LocationManager(mock_db)
        result = await mgr.get_minor_id(1)
        assert result == "MI-001"


# --- Router tests (mocked dependencies) ---

class TestLocationsRouter:
    @pytest.fixture
    def client(self):
        from app.main import create_app
        from app.database import get_db

        app = create_app()

        async def mock_db():
            yield AsyncMock()

        app.dependency_overrides[get_db] = mock_db
        return TestClient(app)

    @patch("app.routers.locations.LocationManager")
    def test_get_location_not_found(self, MockManager, client):
        mock_mgr = AsyncMock()
        mock_mgr.get.return_value = None
        MockManager.return_value = mock_mgr

        response = client.get("/api/locations/999")
        assert response.status_code == 404

    @patch("app.routers.locations.LocationManager")
    def test_list_locations(self, MockManager, client):
        mock_mgr = AsyncMock()
        mock_mgr.list_active.return_value = []
        MockManager.return_value = mock_mgr

        response = client.get("/api/locations")
        assert response.status_code == 200
        assert response.json() == []

    @patch("app.routers.locations.LocationManager")
    def test_delete_not_found(self, MockManager, client):
        mock_mgr = AsyncMock()
        mock_mgr.deactivate.return_value = None
        MockManager.return_value = mock_mgr

        response = client.delete("/api/locations/999")
        assert response.status_code == 404
