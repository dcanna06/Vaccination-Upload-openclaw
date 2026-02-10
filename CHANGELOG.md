# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2026-02-10

### Added

**All 16 AIR APIs (NOI-Complete)**
- Authorisation Access List (API #1) — verify provider access per location
- Identify Individual (API #2) — search by Medicare, IHI, or demographics
- Immunisation History Details (API #3) — full vaccination history
- Immunisation History Statement (API #4) — downloadable statement
- Contraindication History (API #5) — medical exemption history
- Record Contraindication (API #6) — record new medical exemption
- Vaccine Trial History (API #7) — trial participation history
- Record Encounter (API #8) — bulk vaccination submission (existing, updated to v1.4)
- Update Encounter (API #9) — edit existing encounter records
- Natural Immunity History (API #10) — natural immunity records
- Record Natural Immunity (API #11) — record new natural immunity
- Add Vaccine Indicator (API #12) — add indicators to individual
- Remove Vaccine Indicator (API #13) — remove indicators
- Update Indigenous Status (API #14) — update indigenous status flag
- Planned Catch-Up Schedule (API #15) — schedule catch-up vaccination dates
- Reference Data (API #16) — vaccine codes, routes of administration

**Location & Minor ID Management**
- Location CRUD with auto-assigned Minor IDs (atomic assignment)
- Provider-location linking with AIR access list verification
- Per-location `dhs-auditId` header (multi-site support)
- HW027 form guidance and status tracking
- Location selector in dashboard header
- Admin pages for locations and providers

**Individual Management UI**
- Individual search page (Medicare, IHI, demographics)
- Individual detail hub with navigation to history, statement, trials
- Immunisation history page
- History statement download page
- Vaccine trial history page
- Medical exemptions management page
- Encounter update form

**Indicators & Catch-Up**
- Vaccine indicator management (add/remove)
- Indigenous status update
- Planned catch-up schedule page (Medicare-based, not individualIdentifier)

**Bulk Upload Hardening**
- Vaccine dose format updated to "1-20 or B" (booster support)
- Provider-location link verification before submission (non-blocking warning)
- Performance tests: 500-row pipeline < 1 second, < 100MB peak memory
- Batch constraint verification at scale

**Testing**
- 23 NOI integration tests (18 API + 5 workflow scenarios) against vendor environment
- 8 performance tests (150 and 500 row pipelines)
- 33 new location/provider CRUD tests
- 28 individual management API tests
- 10 encounter update tests
- 13 exemption API tests
- 15 indicator API tests
- Total: 473 backend, 142 frontend — all passing

### Changed
- Record Encounter API path updated from v1.3 to v1.4
- `dhs-productId` updated to "EM Bulk Vaccination Upload V1.2"
- Sidebar navigation expanded with Individuals, Confirm, Indicators, Catch-Up, Locations, Providers

### Fixed
- BUG-007: EditResubmitPanel gender dropdown aligned with backend validation (M, F, X)
- BUG-007: EditResubmitPanel route dropdown aligned with backend validation (PO, SC, ID, IM, NS)

---

## [1.1.2] - 2026-02-09

### Fixed
- Connect submit completion page to detailed results page

---

## [1.1.1] - 2026-02-09

### Fixed
- BUG-001: Confirm endpoint now calls AIR via ConfirmService + PRODA auth
- BUG-002: pendingConfirmation type corrected to array
- BUG-003: Test comment corrected (gender X is valid)
- BUG-004: Warning errorCode/errorMessage no longer stripped from results
- BUG-005: All endpoints return HTTPException(404) for not-found
- BUG-006: Poll failures tracked with MAX_POLL_FAILURES=5 and error banner

---

## [1.1.0] - 2026-02-08

### Added
- PRODA B2B authentication rewrite (RS256 JWT)
- Gender X support
- Route NS (nasal) support
- Vendor environment integration test
- 34 Playwright E2E test definitions

### Fixed
- JWT claims: iss=ORG_ID, sub=DEVICE_NAME, aud=proda.humanservices.gov.au
- JWT header: typ=False (no "typ":"JWT"), kid=DEVICE_NAME
- Removed jti claim (not in PRODA spec)
- Added client_id to token request
- Content-Type set to x-www-form-urlencoded for PRODA POST

---

## [1.0.0] - 2026-02-07

### Added
- Initial release
- Excel upload, parse, validate, group pipeline
- Record Encounter API integration (v1.3)
- Submission progress tracking
- Confirmation workflow (AIR-W-1004, AIR-W-1008)
- Submission history and detailed results
- Excel template download
- Validation error reporting
