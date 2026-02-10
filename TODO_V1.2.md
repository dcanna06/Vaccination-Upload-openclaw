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

### [ ] V12-P01-001: Fix JWT Assertion Claims
**Priority**: 🔴 P0 — Blocker
**Branch**: `feature/V12-P01-001-fix-jwt-claims` off `develop`
**Files**: `backend/app/services/proda_auth.py`, `backend/app/config.py`
**Spec**: PRODA B2B Unattended v4.2 §5.3.3

- [ ] Change JWT `iss` from `PRODA_MINOR_ID` → `PRODA_ORG_ID`
- [ ] Change JWT `aud` from MCOL URL → `https://proda.humanservices.gov.au`
- [ ] Add JWT `token.aud` claim = `PRODA_TOKEN_AUD`
- [ ] Add JWT header `kid` = `PRODA_DEVICE_NAME`
- [ ] Remove `jti` claim (not in PRODA spec)
- [ ] Change `exp` from `now + 300` → `now + 600`
- [ ] Unit test: JWT header contains `kid`
- [ ] Unit test: `iss` = org_id, `aud` = PRODA URL, `token.aud` = MCOL URL
- [ ] Unit test: `jti` NOT present
- [ ] Merge to `develop`: `git checkout develop && git merge feature/V12-P01-001-fix-jwt-claims`

**Acceptance**: Unit tests pass. JWT matches PRODA B2B v4.2 §5.3.3 exactly.

### [ ] V12-P01-002: Add client_id to Token Request
**Priority**: 🔴 P0 — Blocker
**Branch**: `feature/V12-P01-002-add-client-id` off `develop`
**Files**: `backend/app/services/proda_auth.py`
**Spec**: PRODA B2B Unattended v4.2 §5.3.2

- [ ] Add `client_id` parameter to token POST body
- [ ] Add `PRODA_CLIENT_ID` to config.py Settings model
- [ ] Unit test: token request body includes `client_id`
- [ ] Integration test: acquire token from vendor endpoint (`@pytest.mark.vendor`)
- [ ] Merge to `develop`

**Acceptance**: Token body contains `grant_type`, `assertion`, AND `client_id`.

### [ ] V12-P01-003: Update Environment Variables
**Priority**: 🔴 P0 — Blocker
**Branch**: `feature/V12-P01-003-env-vars` off `develop`
**Files**: `.env.example`, `backend/app/config.py`, `docker-compose.yml`

- [ ] Add `PRODA_JWT_AUD`, `PRODA_TOKEN_AUD`, `PRODA_CLIENT_ID`, `PRODA_TOKEN_ENDPOINT_VENDOR`
- [ ] Deprecate `PRODA_AUDIENCE` and `PRODA_MINOR_ID` with comments
- [ ] Update all code references to old vars
- [ ] Config validation: fail fast if `PRODA_CLIENT_ID` is empty
- [ ] Merge to `develop`

**Acceptance**: App starts with new vars. Old vars logged as deprecated warnings.

### [ ] V12-P01-004: Vendor Token Integration Test
**Priority**: 🔴 P0 — Blocker
**Branch**: `feature/V12-P01-004-vendor-token-test` off `develop`
**Files**: `backend/tests/integration/test_proda_token.py`

- [ ] Integration test acquiring real token from vendor PRODA endpoint
- [ ] Assert response contains `access_token`, `token_type`, `expires_in`
- [ ] Test with known-good creds (DavidTestLaptop2 / 2330016739)
- [ ] Mark as `@pytest.mark.vendor` (skipped in CI unless vendor creds present)
- [ ] Merge to `develop`

**Acceptance**: Real PRODA token acquired from vendor environment.

---

## Phase 2 — Location & Minor ID Management (Week 2–3)

### [ ] V12-P02-001: Database Migration — locations + location_providers
**Priority**: 🟠 P1
**Branch**: `feature/V12-P02-001-locations-migration` off `develop`

- [ ] Create `locations` table (see V1.2 patch for schema)
- [ ] Create `location_providers` table
- [ ] Add indexes
- [ ] ALTER `organisations` add `minor_id_prefix`
- [ ] ALTER `users` add `default_location_id`
- [ ] ALTER `submission_batches` add `location_id`
- [ ] SQLAlchemy models: `Location`, `LocationProvider`
- [ ] Migration up/down test
- [ ] Merge to `develop`

### [ ] V12-P02-002: Location CRUD Backend
**Priority**: 🟠 P1
**Branch**: `feature/V12-P02-002-location-crud` off `develop`

- [ ] Pydantic schemas: `LocationCreate`, `LocationUpdate`, `LocationRead`
- [ ] CRUD endpoints: POST, GET (list), GET (detail), PUT, DELETE (soft)
- [ ] `assign_next_minor_id()` logic
- [ ] RBAC: Super Admin + Org Admin only
- [ ] Audit logging
- [ ] Unit tests + API tests
- [ ] Test: Minor ID immutable after creation
- [ ] Merge to `develop`

### [ ] V12-P02-003: Location Management Frontend
**Priority**: 🟠 P1
**Branch**: `feature/V12-P02-003-location-ui` off `develop`

- [ ] Location list table with status badges
- [ ] Add/edit location modals
- [ ] Minor ID shown as read-only after creation
- [ ] Deactivate with confirmation
- [ ] Merge to `develop`

### [ ] V12-P02-004: Provider-Location Linking + Authorisation API
**Priority**: 🟠 P1
**Branch**: `feature/V12-P02-004-provider-linking` off `develop`

- [ ] Provider link/unlink endpoints
- [ ] Authorisation Access List API client (`air_authorisation.py`)
- [ ] Verify endpoint: calls API #1, caches access list
- [ ] Handle AIR-E-1039 and AIR-E-1063
- [ ] HW027 status management endpoint
- [ ] Unit tests (mocked) + integration test (vendor)
- [ ] Merge to `develop`

### [ ] V12-P02-005: Provider Setup Frontend
**Priority**: 🟠 P1
**Branch**: `feature/V12-P02-005-provider-ui` off `develop`

- [ ] Provider entry + verify button
- [ ] Access list result display
- [ ] HW027 guidance section
- [ ] PRODA linking guidance
- [ ] Merge to `develop`

### [ ] V12-P02-006: Location Selector Component
**Priority**: 🟠 P1
**Branch**: `feature/V12-P02-006-location-selector` off `develop`

- [ ] Dropdown in dashboard header (hidden for single-location orgs)
- [ ] Pre-selects `user.default_location_id`
- [ ] Persists in zustand store
- [ ] Flows into all API calls
- [ ] Merge to `develop`

### [ ] V12-P02-007: dhs-auditId Per-Location Refactor
**Priority**: 🟠 P1
**Branch**: `feature/V12-P02-007-audit-id-per-location` off `develop`

- [ ] Refactor `build_air_headers()` to accept `location_minor_id`
- [ ] Remove all `config.PRODA_MINOR_ID` references
- [ ] Batch processor: lookup from `submission_batch.location_id`
- [ ] Tests: correct per-location Minor ID in headers
- [ ] Merge to `develop`

---

## Phase 3 — Individual Management APIs (Week 3–4)

### [ ] V12-P03-001: Identify Individual API Client
**Branch**: `feature/V12-P03-001-identify-individual` off `develop`
**Spec**: TECH.SIS.AIR.05 — Individual Details V4.0.5

- [ ] Pydantic models, service method, response code handling
- [ ] Store `individualIdentifier` in Redis (TTL = token lifetime)
- [ ] Unit + integration tests
- [ ] Merge to `develop`

### [ ] V12-P03-002: Immunisation History Details API Client
**Branch**: `feature/V12-P03-002-history-details` off `develop`

- [ ] Pydantic models, service method (requires individualIdentifier)
- [ ] Parse: vaccine due details, history, editable indicators
- [ ] Unit tests
- [ ] Merge to `develop`

### [ ] V12-P03-003: History Statement API Client
**Branch**: `feature/V12-P03-003-history-statement` off `develop`

- [ ] Pydantic models, service method
- [ ] Unit tests
- [ ] Merge to `develop`

### [ ] V12-P03-004: Individual Search Frontend
**Branch**: `feature/V12-P03-004-individual-search-ui` off `develop`

- [ ] Search form (Medicare/IHI/demographics)
- [ ] Minimum ID requirements helper text
- [ ] Success → redirect to detail hub; Not found → verbatim AIR message
- [ ] Merge to `develop`

### [ ] V12-P03-005: Individual Detail Hub Frontend
**Branch**: `feature/V12-P03-005-individual-hub-ui` off `develop`

- [ ] Hub page with nav to sub-pages
- [ ] Grey out items based on access list
- [ ] History page, Due vaccines, Statement page
- [ ] Merge to `develop`

### [ ] V12-P03-006: Vaccine Trial History API Client
**Branch**: `feature/V12-P03-006-vaccine-trial` off `develop`

- [ ] Pydantic models, service method, unit tests
- [ ] Merge to `develop`

---

## Phase 4 — Encounter Management (Week 4–5)

### [ ] V12-P04-001: Audit Record Encounter Against V6.0.7
**Branch**: `feature/V12-P04-001-audit-record-encounter` off `develop`

- [ ] Field-by-field comparison against spec
- [ ] Verify dhs-auditId uses per-location
- [ ] Confirm flow for claimId + claimSequenceNumber
- [ ] Document any gaps → sub-tickets
- [ ] Merge to `develop`

### [ ] V12-P04-002: Update Encounter API Client
**Branch**: `feature/V12-P04-002-update-encounter` off `develop`

- [ ] Pydantic models, service method (requires individualIdentifier)
- [ ] Handle editable vs non-editable episodes
- [ ] Unit tests
- [ ] Merge to `develop`

### [ ] V12-P04-003: Update Encounter Frontend
**Branch**: `feature/V12-P04-003-update-encounter-ui` off `develop`

- [ ] Pre-fill from history, editable fields only
- [ ] Verbatim AIR messages
- [ ] Merge to `develop`

### [ ] V12-P04-004: Confirmation Flow UI
**Branch**: `feature/V12-P04-004-confirm-flow-ui` off `develop`

- [ ] Pended encounters display (W-1004/W-1008)
- [ ] Confirm (acceptAndConfirm + claimId) / Correct (redirect to edit)
- [ ] Batch confirmation
- [ ] Merge to `develop`

---

## Phase 5 — Medical Exemptions & Natural Immunity (Week 5–6)

### [ ] V12-P05-001: Medical Contraindication APIs
**Branch**: `feature/V12-P05-001-contraindications` off `develop`
**Spec**: TECH.SIS.AIR.06

- [ ] Get + Record contraindication service methods + router endpoints
- [ ] Unit tests
- [ ] Merge to `develop`

### [ ] V12-P05-002: Natural Immunity APIs
**Branch**: `feature/V12-P05-002-natural-immunity` off `develop`

- [ ] Get + Record natural immunity service methods + router endpoints
- [ ] Unit tests
- [ ] Merge to `develop`

### [ ] V12-P05-003: Exemptions Frontend
**Branch**: `feature/V12-P05-003-exemptions-ui` off `develop`

- [ ] Contraindication history + record form
- [ ] Natural immunity history + record form
- [ ] Verbatim AIR messages
- [ ] Merge to `develop`

---

## Phase 6 — Indicators, Indigenous Status & Catch-Up (Week 6–7)

### [ ] V12-P06-001: Vaccine Indicator APIs
**Branch**: `feature/V12-P06-001-vaccine-indicators` off `develop`

- [ ] Add/Remove indicator service methods + router
- [ ] Unit tests; merge to `develop`

### [ ] V12-P06-002: Indigenous Status Update API
**Branch**: `feature/V12-P06-002-indigenous-status` off `develop`

- [ ] Service method + router; unit tests; merge to `develop`

### [ ] V12-P06-003: Planned Catch Up Date API
**Branch**: `feature/V12-P06-003-catchup-date` off `develop`
**Spec**: TECH.SIS.AIR.03

- [ ] Service method (NOTE: does NOT use individualIdentifier)
- [ ] Unit tests; merge to `develop`

### [ ] V12-P06-004: Indicators & Catch-Up Frontend
**Branch**: `feature/V12-P06-004-indicators-ui` off `develop`

- [ ] Indicators page, indigenous status form, catch-up form
- [ ] Verbatim AIR messages; merge to `develop`

---

## Phase 7 — Bulk Upload Hardening (Week 7–8)

### [ ] V12-P07-001: Excel Template Update
**Branch**: `feature/V12-P07-001-excel-template-update` off `develop`

- [ ] Review columns against V1.2 requirements
- [ ] Update parser for new columns; merge to `develop`

### [ ] V12-P07-002: Batch Processor — Location-Aware
**Branch**: `feature/V12-P07-002-batch-location-aware` off `develop`

- [ ] Inject `location_id`, look up `minor_id`, verify provider-location link
- [ ] Tests; merge to `develop`

### [ ] V12-P07-003: Performance Test — 150+ Records
**Branch**: `feature/V12-P07-003-perf-test` off `develop`

- [ ] 150-row test, <60 sec, no memory leaks
- [ ] Document baseline; merge to `develop`

---

## Phase 8 — NOI Certification & Release (Week 8–10)

### [ ] V12-P08-001: Full API Test Suite
**Priority**: 🔴 P0
**Branch**: `test/V12-P08-001-noi-test-suite` off `develop`

- [ ] Vendor integration test for each of 16 APIs
- [ ] All 5 Record Encounter workflow use cases (TECH.SIS.AIR.02 §6)
- [ ] All green in vendor environment
- [ ] Merge to `develop`

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
| P01 — PRODA Auth Fixes     | 4  | 🔴 Not Started |
| P02 — Location & Provider  | 7  | 🔴 Not Started |
| P03 — Individual Mgmt      | 6  | 🔴 Not Started |
| P04 — Encounter Mgmt       | 4  | 🔴 Not Started |
| P05 — Exemptions           | 3  | 🔴 Not Started |
| P06 — Indicators & Catchup | 4  | 🔴 Not Started |
| P07 — Bulk Upload Hardening| 3  | 🔴 Not Started |
| P08 — NOI & Release        | 4  | 🔴 Not Started |
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
