# PRODA Authentication Fix — Priority P0 Ticket

> **Add this as the NEXT ticket in TODO.md, before any other remaining work.**
> **This is a P0 blocker — the application CANNOT authenticate with Services Australia until this is fixed.**

---

## TICKET-P0: Fix PRODA B2B Authentication (CRITICAL)

**Priority**: P0 — Blocker
**Scope**: Backend `proda_auth.py` service, env config, all PRODA-related code
**Reason**: The PRODA JWT claims in claude.md were incorrect. The correct claims have been proven via SoapUI against the vendor test environment on 2026-02-08. Any code built against the old claims will fail with HTTP 500 "Unable to retrieve device data".

### What's Wrong

The `proda_auth.py` service (or equivalent) was built using these INCORRECT JWT claims:
- `iss` = Minor ID → **WRONG** (must be Org ID)
- `aud` = `https://medicareaustralia.gov.au/MCOL` → **WRONG** (must be `https://proda.humanservices.gov.au`)
- Missing `kid` header → **WRONG** (must be device name)
- Missing `token.aud` custom claim → **WRONG** (required)
- Missing `client_id` POST parameter → **WRONG** (required)
- Token endpoint URL wrong → **WRONG** (must be `/mga/sps/oauth/oauth20/token` path)

### Tasks

- [ ] **1. Update `config.py` / environment variables:**
  - Add `PRODA_TOKEN_ENDPOINT_VENDOR` = `https://vnd.proda.humanservices.gov.au/mga/sps/oauth/oauth20/token`
  - Add `PRODA_TOKEN_ENDPOINT_PROD` = `https://proda.humanservices.gov.au/mga/sps/oauth/oauth20/token`
  - Change `PRODA_AUDIENCE` → `PRODA_JWT_AUDIENCE` = `https://proda.humanservices.gov.au`
  - Add `PRODA_CLIENT_ID` = `soape-testing-client-v2` (vendor env)
  - Add `PRODA_ACCESS_TOKEN_AUDIENCE` = `https://proda.humanservices.gov.au`
  - Set `PRODA_KEY_ALIAS` default = `proda-alias`
  - Set `PRODA_JKS_PASSWORD` default = `Pass-123`
  - Remove old `PRODA_TOKEN_ENDPOINT` single var (replace with vendor/prod split)

- [ ] **2. Rewrite JWT assertion builder in `proda_auth.py`:**
  ```python
  # CORRECT JWT structure (proven 2026-02-08)
  header = {
      "alg": "RS256",
      "kid": config.PRODA_DEVICE_NAME           # ← was missing entirely
  }
  payload = {
      "iss": config.PRODA_ORG_ID,               # ← was PRODA_MINOR_ID (WRONG)
      "sub": config.PRODA_DEVICE_NAME,           # ← this was correct
      "aud": "https://proda.humanservices.gov.au",  # ← was medicareaustralia.gov.au/MCOL (WRONG)
      "token.aud": config.PRODA_ACCESS_TOKEN_AUDIENCE,  # ← was missing entirely
      "exp": now + timedelta(minutes=10),        # ← was 5 minutes
      "iat": now,
  }
  ```

- [ ] **3. Fix token request POST body:**
  ```python
  # CORRECT POST body (proven 2026-02-08)
  data = {
      "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
      "assertion": signed_jwt,
      "client_id": config.PRODA_CLIENT_ID,      # ← was missing entirely
  }
  # Content-Type: application/x-www-form-urlencoded (NOT JSON)
  ```

- [ ] **4. Fix token endpoint URL selection:**
  ```python
  def get_token_endpoint(self) -> str:
      if config.APP_ENV == "vendor":
          return config.PRODA_TOKEN_ENDPOINT_VENDOR
      return config.PRODA_TOKEN_ENDPOINT_PROD
  ```

- [ ] **5. Update JKS loading to use correct alias/password:**
  - JKS alias MUST be `proda-alias` (SoapUI hardcodes this)
  - JKS password MUST be `Pass-123` (SoapUI hardcodes this)
  - Ensure `pyjks` or equivalent loads with these exact values
  - Verify the private key extracted from JKS can sign JWTs successfully

- [ ] **6. Update `.env.example` with correct values:**
  ```env
  PRODA_TOKEN_ENDPOINT_VENDOR=https://vnd.proda.humanservices.gov.au/mga/sps/oauth/oauth20/token
  PRODA_TOKEN_ENDPOINT_PROD=https://proda.humanservices.gov.au/mga/sps/oauth/oauth20/token
  PRODA_DEVICE_NAME=DavidTestLaptop2
  PRODA_ORG_ID=2330016739
  PRODA_MINOR_ID=WRR00000
  PRODA_JKS_BASE64=
  PRODA_JKS_PASSWORD=Pass-123
  PRODA_KEY_ALIAS=proda-alias
  PRODA_JWT_AUDIENCE=https://proda.humanservices.gov.au
  PRODA_CLIENT_ID=soape-testing-client-v2
  PRODA_ACCESS_TOKEN_AUDIENCE=https://proda.humanservices.gov.au
  ```

- [ ] **7. Update gender validation everywhere:**
  - Valid values: `M`, `F`, `I`, `U`, `X`
  - `X` = Not Stated/Inadequately Described (added June 2025)
  - Update backend Pydantic enums/validators
  - Update frontend Zod schemas
  - Update Excel template column G accepted values
  - Update Excel template mappings (accept "NotStated" → "X")

- [ ] **8. Update route of administration validation everywhere:**
  - Valid values: `IM`, `SC`, `ID`, `OR`, `IN`, `NAS`, `NS`
  - `NS` = Nasal (added October 2025, distinct from legacy `NAS`)
  - Update backend validators
  - Update frontend validators
  - Update Excel template column N accepted values

- [ ] **9. Write integration test against vendor environment:**
  ```python
  async def test_proda_token_retrieval():
      """Test real token retrieval against vendor PRODA endpoint."""
      auth_service = ProdaAuthService(config)
      token = await auth_service.get_access_token()
      assert token is not None
      assert len(token) > 100
      # Decode and verify claims
      payload = jwt.decode(token, options={"verify_signature": False})
      assert payload["sub"] == config.PRODA_ORG_ID
      assert payload["proda.swinst"] == config.PRODA_DEVICE_NAME
      assert payload["aud"] == "PRODA.UNATTENDED.B2B"
  ```

- [ ] **10. Update all unit tests for PRODA auth:**
  - Mock JWT builder tests should assert correct claims
  - Mock POST request tests should assert `client_id` in form body
  - Mock token endpoint URL selection tests for vendor vs prod

### Test Requirements

- [ ] Token retrieval succeeds against `https://vnd.proda.humanservices.gov.au/mga/sps/oauth/oauth20/token`
- [ ] JWT assertion contains: `iss`=orgId, `sub`=deviceName, `aud`=proda URL, `token.aud`, `kid` header
- [ ] POST body contains: `grant_type`, `assertion`, `client_id`
- [ ] Response contains valid `access_token` with `expires_in: 3600`
- [ ] Gender `X` accepted in all validation paths
- [ ] Route `NS` accepted in all validation paths
- [ ] Old incorrect values produce test failures (regression protection)
- [ ] `.env.example` matches new variable names
- [ ] No references to `https://medicareaustralia.gov.au/MCOL` remain anywhere in codebase

### Files Likely Affected

- `backend/app/config.py`
- `backend/app/services/proda_auth.py`
- `backend/app/services/validation_engine.py`
- `backend/app/utils/medicare_validator.py` (gender enum if defined here)
- `backend/app/schemas/air_request.py` (gender/route enums)
- `backend/tests/unit/test_proda_auth.py`
- `backend/tests/integration/test_air_connectivity.py`
- `frontend/lib/validation/business-rules.ts` (gender/route validation)
- `frontend/types/air.ts` (gender/route types)
- `.env.example`
- `claude.md` (apply changes from CLAUDE_MD_PATCH.md)

### Acceptance Criteria

The dev agent should be able to run a script like this and get a valid token:

```python
import asyncio
from app.services.proda_auth import ProdaAuthService
from app.config import Settings

settings = Settings()  # loads from .env
auth = ProdaAuthService(settings)
token = asyncio.run(auth.get_access_token())
print(f"Token length: {len(token)}")
print("SUCCESS — PRODA authentication is working")
```
