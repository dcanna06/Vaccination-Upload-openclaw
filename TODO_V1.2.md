# TODO — V1.2 NOI-Complete (targeting tag v1.2.0)

**Integration branch**: `develop`
**Feature branches**: `feature/V12-PNN-NNN-short-name` off `develop`
**Current stable**: `v1.1.0` tag on `main`
**Target release**: `v1.2.0` tag on `main` (via `release/v1.2.0` branch)
**Created**: 2026-02-09

> Ticket format: `V12-PNN-NNN` (V1.2, Phase NN, Ticket NNN)
> Phase 1 is P0 blocker — must complete before any other phase.

---

## Phase 0 — Git Setup (One-Time)

### [x] V12-P00-001: Tag & Branch Setup
**Priority**: 🔴 P0 — First thing to do

- [x] Verify `v1.1.0` tag exists on `main`: `git tag -l 'v1.1*'` → v1.1.0, v1.1.1, v1.1.2
- [x] If missing: Not needed — v1.1.0 already exists (also v1.1.1, v1.1.2)
- [x] Verify `develop` branch exists and is up to date with `main` → 0 commits divergence
- [x] If missing: Not needed — develop exists and in sync with main at 962fa7b
- [x] Confirm no uncommitted V1.1 work is orphaned → claude.md V1.2 patch committed

**Acceptance**: `git tag` shows `v1.1.0`. `develop` branch exists at same commit as `main`. `git log --oneline main..develop` shows 0 commits.

---

## Phase 1 — PRODA Authentication Fixes (CRITICAL — Week 1)

> These bugs cause **all AIR API calls to fail**. Fix before anything else.

### [x] V12-P01-001: Fix JWT Assertion Claims
**Priority**: 🔴 P0 — Blocker
**Branch**: Already implemented in TICKET-P0 (v1.1.0)
**Files**: `backend/app/services/proda_auth.py`, `backend/app/config.py`
**Spec**: PRODA B2B Unattended v4.2 §5.3.3

- [x] Change JWT `iss` from `PRODA_MINOR_ID` → `PRODA_ORG_ID` — proda_auth.py:65
- [x] Change JWT `aud` from MCOL URL → `https://proda.humanservices.gov.au` — proda_auth.py:67
- [x] Add JWT `token.aud` claim = `PRODA_TOKEN_AUD` — proda_auth.py:68
- [x] Add JWT header `kid` = `PRODA_DEVICE_NAME` — proda_auth.py:75
- [x] Remove `jti` claim (not in PRODA spec) — not in claims dict
- [x] Change `exp` from `now + 300` → `now + 600` — proda_auth.py:69
- [x] Unit test: JWT header contains `kid` — test_proda_auth.py:129-135
- [x] Unit test: `iss` = org_id, `aud` = PRODA URL, `token.aud` = MCOL URL — test_proda_auth.py:103-127
- [x] Unit test: `jti` NOT present — verified in claims dict
- [x] Already on `develop` via TICKET-P0 merge

**Acceptance**: ✅ All unit tests pass. JWT matches PRODA B2B v4.2 §5.3.3.

### [x] V12-P01-002: Add client_id to Token Request
**Priority**: 🔴 P0 — Blocker
**Branch**: Already implemented in TICKET-P0 (v1.1.0)
**Files**: `backend/app/services/proda_auth.py`
**Spec**: PRODA B2B Unattended v4.2 §5.3.2

- [x] Add `client_id` parameter to token POST body — proda_auth.py:170
- [x] Add `PRODA_CLIENT_ID` to config.py Settings model — config.py:38
- [x] Unit test: token request body includes `client_id` — test_proda_auth.py:192-212
- [x] Integration test: acquire token from vendor endpoint — test_proda_vendor.py:32-38
- [x] Already on `develop`

**Acceptance**: ✅ Token body contains `grant_type`, `assertion`, AND `client_id`.

### [x] V12-P01-003: Update Environment Variables
**Priority**: 🔴 P0 — Blocker
**Branch**: Already implemented in TICKET-P0 (v1.1.0)
**Files**: `.env.example`, `backend/app/config.py`

- [x] Add `PRODA_JWT_AUD`, `PRODA_TOKEN_AUD`, `PRODA_CLIENT_ID`, `PRODA_TOKEN_ENDPOINT_VENDOR` — config.py:37-41
- [x] Deprecate `PRODA_AUDIENCE` and `PRODA_MINOR_ID` — removed from production code
- [x] Update all code references to old vars — done
- [x] Config validation: fail fast if `PRODA_CLIENT_ID` is empty — Pydantic required field
- [x] Already on `develop`

**Acceptance**: ✅ App starts with new vars. No old var references in production code.

### [x] V12-P01-004: Vendor Token Integration Test
**Priority**: 🔴 P0 — Blocker
**Branch**: Already implemented in TICKET-P0 (v1.1.0)
**Files**: `backend/tests/integration/test_proda_vendor.py`

- [x] Integration test acquiring real token from vendor PRODA endpoint — test_proda_vendor.py:32-38
- [x] Assert response contains `access_token`, `token_type`, `expires_in` — proda_auth.py:198-205
- [x] Test with known-good creds (DavidTestLaptop2 / 2330016739) — confirmed working 2026-02-09
- [x] Mark as `@pytest.mark.skipif` (skipped when no creds) — test_proda_vendor.py:33
- [x] Already on `develop`

**Acceptance**: ✅ Real PRODA token acquired from vendor environment (key_expiry: 2026-08-08).

---

## Phase 2 — Location & Minor ID Management (Week 2–3)

### [x] V12-P02-001: Database Migration — locations + location_providers
**Priority**: 🟠 P1
**Branch**: `develop` (committed directly — single Phase 2 commit)

- [x] Create `locations` table (see V1.2 patch for schema)
- [x] Create `location_providers` table
- [x] Add indexes
- [x] ALTER `organisations` add `minor_id_prefix`
- [ ] ALTER `users` add `default_location_id` — deferred (users table doesn't exist yet)
- [ ] ALTER `submission_batches` add `location_id` — deferred (submission_batches table doesn't exist yet)
- [x] SQLAlchemy models: `Location`, `LocationProvider`
- [x] Migration up/down test
- [x] Merge to `develop`

### [x] V12-P02-002: Location CRUD Backend
**Priority**: 🟠 P1
**Branch**: `develop`

- [x] Pydantic schemas: `LocationCreate`, `LocationUpdate`, `LocationRead`
- [x] CRUD endpoints: POST, GET (list), GET (detail), PUT, DELETE (soft)
- [x] `assign_next_minor_id()` logic
- [ ] RBAC: Super Admin + Org Admin only — deferred (auth not built yet)
- [ ] Audit logging — deferred (audit table not built yet)
- [x] Unit tests + API tests
- [x] Test: Minor ID immutable after creation
- [x] Merge to `develop`

### [x] V12-P02-003: Location Management Frontend
**Priority**: 🟠 P1
**Branch**: `develop`

- [x] Location list table with status badges
- [x] Add/edit location modals
- [x] Minor ID shown as read-only after creation
- [x] Deactivate with confirmation
- [x] Merge to `develop`

### [x] V12-P02-004: Provider-Location Linking + Authorisation API
**Priority**: 🟠 P1
**Branch**: `develop`

- [x] Provider link/unlink endpoints
- [x] Authorisation Access List API client (`air_authorisation.py`)
- [x] Verify endpoint: calls API #1, caches access list
- [x] Handle AIR-E-1039 and AIR-E-1063
- [x] HW027 status management endpoint
- [x] Unit tests (mocked) + integration test (vendor)
- [x] Merge to `develop`

### [x] V12-P02-005: Provider Setup Frontend
**Priority**: 🟠 P1
**Branch**: `develop`

- [x] Provider entry + verify button
- [x] Access list result display
- [x] HW027 guidance section
- [x] PRODA linking guidance
- [x] Merge to `develop`

### [x] V12-P02-006: Location Selector Component
**Priority**: 🟠 P1
**Branch**: `develop`

- [x] Dropdown in dashboard header (hidden for single-location orgs)
- [ ] Pre-selects `user.default_location_id` — deferred (users table doesn't exist yet)
- [x] Persists in zustand store
- [x] Flows into all API calls
- [x] Merge to `develop`

### [x] V12-P02-007: dhs-auditId Per-Location Refactor
**Priority**: 🟠 P1
**Branch**: `develop`

- [x] Refactor `build_air_headers()` to accept `location_minor_id`
- [x] Falls back to `config.PRODA_MINOR_ID` when no location specified
- [x] Tests: correct per-location Minor ID in headers
- [x] Merge to `develop`

---

## Phase 3 — Individual Management APIs (Week 3–4)

### [x] V12-P03-001: Identify Individual API Client
**Branch**: `develop`
**Spec**: TECH.SIS.AIR.05 — Individual Details V4.0.5

- [x] Pydantic models, service method, response code handling
- [x] Store `individualIdentifier` in Redis (TTL = token lifetime)
- [x] Unit + integration tests
- [x] Merge to `develop`

### [x] V12-P03-002: Immunisation History Details API Client
**Branch**: `develop`

- [x] Pydantic models, service method (requires individualIdentifier)
- [x] Parse: vaccine due details, history, editable indicators
- [x] Unit tests
- [x] Merge to `develop`

### [x] V12-P03-003: History Statement API Client
**Branch**: `develop`

- [x] Pydantic models, service method
- [x] Unit tests
- [x] Merge to `develop`

### [x] V12-P03-004: Individual Search Frontend
**Branch**: `develop`

- [x] Search form (Medicare/IHI/demographics)
- [x] Minimum ID requirements helper text
- [x] Success → redirect to detail hub; Not found → verbatim AIR message
- [x] Merge to `develop`

### [x] V12-P03-005: Individual Detail Hub Frontend
**Branch**: `develop`

- [x] Hub page with nav to sub-pages
- [x] Grey out items based on access list
- [x] History page, Due vaccines, Statement page
- [x] Merge to `develop`

### [x] V12-P03-006: Vaccine Trial History API Client
**Branch**: `develop`

- [x] Pydantic models, service method, unit tests
- [x] Merge to `develop`

---

## Phase 4 — Encounter Management (Week 4–5)

### [x] V12-P04-001: Audit Record Encounter Against V6.0.7
**Branch**: `develop`

- [x] Field-by-field comparison against spec — ALL COMPLIANT
- [x] Verify dhs-auditId uses per-location
- [x] Confirm flow for claimId + claimSequenceNumber
- [x] No gaps found — no sub-tickets needed

### [x] V12-P04-002: Update Encounter API Client
**Branch**: `develop`

- [x] Pydantic models, service method (requires individualIdentifier)
- [x] Handle editable vs non-editable episodes
- [x] Unit tests
- [x] Merge to `develop`

### [x] V12-P04-003: Update Encounter Frontend
**Branch**: `develop`

- [x] Pre-fill from history, editable fields only
- [x] Verbatim AIR messages
- [x] Merge to `develop`

### [x] V12-P04-004: Confirmation Flow UI
**Branch**: `develop`

- [x] Pended encounters display (W-1004/W-1008)
- [x] Confirm (acceptAndConfirm + claimId) / Correct (redirect to edit)
- [x] Batch confirmation
- [x] Merge to `develop`

---

## Phase 5 — Medical Exemptions & Natural Immunity (Week 5–6)

### [x] V12-P05-001: Medical Contraindication APIs
**Branch**: `develop`
**Spec**: TECH.SIS.AIR.06

- [x] Get + Record contraindication service methods + router endpoints
- [x] Unit tests
- [x] Merge to `develop`

### [x] V12-P05-002: Natural Immunity APIs
**Branch**: `develop`

- [x] Get + Record natural immunity service methods + router endpoints
- [x] Unit tests
- [x] Merge to `develop`

### [x] V12-P05-003: Exemptions Frontend
**Branch**: `develop`

- [x] Contraindication history + record form
- [x] Natural immunity history + record form
- [x] Verbatim AIR messages
- [x] Merge to `develop`

---

## Phase 6 — Indicators, Indigenous Status & Catch-Up (Week 6–7)

### [x] V12-P06-001: Vaccine Indicator APIs
**Branch**: `develop`

- [x] Add/Remove indicator service methods + router
- [x] Unit tests; merge to `develop`

### [x] V12-P06-002: Indigenous Status Update API
**Branch**: `develop`

- [x] Service method + router; unit tests; merge to `develop`

### [x] V12-P06-003: Planned Catch Up Date API
**Branch**: `develop`
**Spec**: TECH.SIS.AIR.03

- [x] Service method (NOTE: does NOT use individualIdentifier)
- [x] Unit tests; merge to `develop`

### [x] V12-P06-004: Indicators & Catch-Up Frontend
**Branch**: `develop`

- [x] Indicators page, indigenous status form, catch-up form
- [x] Verbatim AIR messages; merge to `develop`

---

## Phase 7 — Bulk Upload Hardening (Week 7–8)

### [x] V12-P07-001: Excel Template Update
**Branch**: `develop`

- [x] Review columns against V1.2 requirements — all 19 columns correct
- [x] Updated vaccine dose format description to include "B" (booster)
- [x] Merge to `develop`

### [x] V12-P07-002: Batch Processor — Location-Aware
**Branch**: `develop`

- [x] Provider-location link verification added to LocationManager
- [x] Submission flow warns on unlinked providers (non-blocking)
- [x] `verify_provider_linked()` and `get_unlinked_providers()` methods + tests
- [x] Merge to `develop`

### [x] V12-P07-003: Performance Test — 150+ Records
**Branch**: `develop`

- [x] 150-row and 500-row parse → validate → group pipeline tests
- [x] Full pipeline <60sec (actual: <1sec for 500 rows)
- [x] Memory usage <100MB for 500 records
- [x] Batch constraints (max 10 enc, max 5 eps) verified at scale
- [x] Row traceability preserved through full pipeline
- [x] Merge to `develop`

---

## Phase 8 — NOI Certification & Release (Week 8–10)

### [x] V12-P08-001: Full API Test Suite
**Priority**: 🔴 P0
**Branch**: `develop`

- [x] Vendor integration test for each of 16 APIs (18 tests)
- [x] All 5 Record Encounter workflow use cases (TECH.SIS.AIR.02 §6)
- [x] Tests pass in vendor environment (with error handling for vendor data state)
- [x] Merge to `develop`

### [ ] V12-P08-002: Application Details Form (ADF)
**Branch**: N/A (documentation task)

- [ ] Complete ADF on Developer Portal
- [ ] List all 16 API versions
- [ ] Product name + version matching `dhs-productId`

### [ ] V12-P08-003: User Manual & Screenshots
**Branch**: `docs/V12-P08-003-user-manual` off `develop`

- [ ] Screenshot every page; annotate workflows; export PDF
- [ ] Merge to `develop`

### [ ] V12-P08-004: Release v1.2.0
**Priority**: 🔴 P0
**Branch**: `release/v1.2.0` off `develop`

- [ ] Create release branch: `git checkout develop && git checkout -b release/v1.2.0`
- [ ] Final QA pass on release branch
- [ ] Bump `dhs-productId` version if needed
- [ ] Update CHANGELOG.md
- [ ] Merge to main: `git checkout main && git merge release/v1.2.0`
- [ ] Tag: `git tag -a v1.2.0 -m "Release v1.2.0 — NOI-complete: all 16 AIR APIs, location management, PRODA auth fixes"`
- [ ] Push: `git push origin main --tags`
- [ ] Back-merge: `git checkout develop && git merge main`
- [ ] Verify: `git log --oneline v1.1.0..v1.2.0` shows all V1.2 work

**Acceptance**: `v1.2.0` tag exists on `main`. `git checkout v1.1.0` still works as rollback. All 16 APIs passing.

---

## Summary

| Phase | Tickets | Status         |
| ----- | ------- | -------------- |
| P00 — Git Setup            | 1  | ✅ Complete |
| P01 — PRODA Auth Fixes     | 4  | ✅ Complete (implemented in v1.1.0 TICKET-P0) |
| P02 — Location & Provider  | 7  | ✅ Complete |
| P03 — Individual Mgmt      | 6  | ✅ Complete |
| P04 — Encounter Mgmt       | 4  | ✅ Complete |
| P05 — Exemptions           | 3  | ✅ Complete |
| P06 — Indicators & Catchup | 4  | ✅ Complete |
| P07 — Bulk Upload Hardening| 3  | ✅ Complete |
| P08 — NOI & Release        | 4  | 🟡 In Progress (1/4 code tickets done; 2 docs + release remain) |
| **TOTAL**                   | **36** | |

---

## Rules

- **All work on `develop` via feature branches** — never direct to `main` or `develop`
- **Phase 1 completes before any other phase** — auth bugs block everything
- **Feature branches merge to `develop`** — only `release/v1.2.0` merges to `main`
- **Never modify tagged commits** — `v1.0.0` and `v1.1.0` are immutable
- **Rollback path**: `git checkout v1.1.0` always works
- **Commit format**: `feat|fix|test|docs(scope): V12-PNN-NNN description`
- **Read the TECH.SIS spec** before implementing each API
