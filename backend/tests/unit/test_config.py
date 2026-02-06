"""Tests for TICKET-005: Configuration service."""

import os

import pytest
from pydantic import ValidationError

from app.config import Settings, mask_secret


class TestMaskSecret:
    def test_masks_long_secret(self):
        assert mask_secret("mysupersecretkey") == "mysu****"

    def test_masks_short_secret(self):
        assert mask_secret("abc") == "****"

    def test_masks_exact_four_chars(self):
        assert mask_secret("abcd") == "****"

    def test_masks_five_chars(self):
        assert mask_secret("abcde") == "abcd****"


class TestSettings:
    def test_default_app_env_is_vendor(self):
        s = Settings(
            APP_SECRET_KEY="test-key-for-unit-testing-purposes",
            _env_file=None,
        )
        assert s.APP_ENV == "vendor"

    def test_vendor_env_uses_vendor_url(self):
        s = Settings(
            APP_ENV="vendor",
            AIR_VENDOR_BASE_URL="https://vendor.example.com",
            AIR_PROD_BASE_URL="https://prod.example.com",
            _env_file=None,
        )
        assert s.air_api_base_url == "https://vendor.example.com"

    def test_production_env_uses_prod_url(self):
        s = Settings(
            APP_ENV="production",
            AIR_VENDOR_BASE_URL="https://vendor.example.com",
            AIR_PROD_BASE_URL="https://prod.example.com",
            _env_file=None,
        )
        assert s.air_api_base_url == "https://prod.example.com"

    def test_invalid_app_env_raises(self):
        with pytest.raises(ValidationError, match="APP_ENV"):
            Settings(APP_ENV="invalid", _env_file=None)

    def test_default_product_id(self):
        s = Settings(_env_file=None)
        assert s.AIR_PRODUCT_ID == "AIRBulkVax 1.0"

    def test_default_proda_audience(self):
        s = Settings(_env_file=None)
        assert s.PRODA_AUDIENCE == "https://medicareaustralia.gov.au/MCOL"

    def test_jwt_defaults(self):
        s = Settings(_env_file=None)
        assert s.JWT_ALGORITHM == "HS256"
        assert s.JWT_ACCESS_TOKEN_EXPIRE_MINUTES == 30
        assert s.JWT_MAX_SESSION_HOURS == 8

    def test_log_format_default(self):
        s = Settings(_env_file=None)
        assert s.LOG_FORMAT == "json"
