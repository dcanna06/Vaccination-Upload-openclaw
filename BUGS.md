# QA Bug Report — Submission Results & Confirmation Flow

**Date:** 2026-02-09
**Branch:** `feature/submission-results-ui`
**Reviewer:** QA Agent (Claude Code)
**Scope:** Submission confirm endpoint, progress polling, results display, compliance

---

## BUG-001 (P0): Confirm endpoint is a stub — does NOT call AIR API

| Field | Value |
|-------|-------|
| **Severity** | P0 — Critical |
| **File** | `backend/app/routers/submit.py:152-169` |
| **Status** | Fixed |
| **Suggested branch** | `fix/confirm-endpoint-air-api` |

### Description

The `/api/submit/{submission_id}/confirm` endpoint accepts a `ConfirmRequest` body, logs the count, and returns a canned `{"status": "confirmed", "confirmedCount": N}` response. It does **not**:

1. Retrieve the original `claimId` from the submission results
2. Build the AIR confirmation payload (per AIR spec: `encounters/confirm`)
3. Call `AIRClient` to submit the confirmation to the AIR API
4. Update the submission store with confirmation results

### Reproduction

1. Submit a batch containing a record that triggers AIR warning W-1004
2. Call `POST /api/submit/{id}/confirm` with any payload
3. Observe: returns 200 `{"status": "confirmed"}` immediately without any AIR API call

### Expected Behaviour

The endpoint should authenticate via PRODA, build the confirmation payload including `claimId` and `claimSequenceNumber`, call the AIR confirmation API, and return the actual AIR response.

### Impact

The entire confirmation workflow (W-1004 accept-and-confirm, W-1008 pended records) silently "succeeds" without any data reaching AIR. Users believe records are confirmed when they are not.

---

## BUG-002 (P0): Confirmation records never reach frontend ConfirmationDialog

| Field | Value |
|-------|-------|
| **Severity** | P0 — Critical |
| **File (backend)** | `backend/app/routers/submit.py:145-149` |
| **File (frontend)** | `frontend/app/(dashboard)/submit/page.tsx:112-114` |
| **Status** | Fixed |
| **Suggested branch** | `fix/pending-confirmation-type-mismatch` |

### Description

**Backend** returns `pendingConfirmation` as an **integer** (count) inside the `progress` object:

```python
# submit.py:86
sub["progress"]["pendingConfirmation"] = result.get("pendingConfirmation", 0)
```

The progress endpoint returns:
```json
{
  "submissionId": "...",
  "status": "running",
  "progress": { "pendingConfirmation": 2 }
}
```

**Frontend** reads `data.pendingConfirmation` (top-level, not inside `progress`) and checks `.length`:

```typescript
// page.tsx:112
if (data.pendingConfirmation?.length > 0) {
  setConfirmationRecords(data.pendingConfirmation);
  setStatus('confirming');
}
```

Two problems:
1. `data.pendingConfirmation` is `undefined` — the field is nested inside `data.progress`, not at top level
2. Even if accessed correctly, `.length` on a number returns `undefined`, so the condition is always falsy

### Reproduction

1. Submit records that produce AIR warnings requiring confirmation
2. Observe progress polling — `pendingConfirmation` count increments in `progress`
3. ConfirmationDialog never appears; status never transitions to `'confirming'`

### Expected Behaviour

Backend should return an **array** of record objects requiring confirmation (with `recordId`, `claimId`, `reason`, `airMessage`) either at top level or at a path the frontend reads. Frontend should access the correct path and iterate the array.

### Impact

Confirmation dialog is unreachable. Users cannot confirm any records, making the W-1004/W-1008 flow completely broken.

---

## BUG-003 (P1): Misleading test comment — gender "X" marked `# Invalid`

| Field | Value |
|-------|-------|
| **Severity** | P1 — Major |
| **File** | `backend/tests/unit/test_api_endpoints.py:133` |
| **Status** | Fixed |
| **Suggested branch** | `fix/test-gender-x-comment` |

### Description

The test `test_validate_invalid_record` contains:

```python
"gender": "X",  # Invalid
```

However, `VALID_GENDERS = {"M", "F", "X"}` in `validation_engine.py:25` — gender "X" (Not Stated) is **valid** per the June 2025 AIR spec update.

The test still passes because the record is missing required identification fields (no Medicare number, IHI, or patient name), which causes validation failure for other reasons. The comment incorrectly implies that gender "X" is what makes the record invalid.

### Impact

Future developers may:
- Believe gender "X" is invalid and remove it from `VALID_GENDERS`
- Miss the actual reason the test fails (missing identification fields)
- Write incorrect follow-up tests based on this pattern

### Suggested Fix

Update the comment to `# Valid gender — record fails due to missing identification fields` or restructure the test to clearly test one validation rule at a time.

---

## BUG-004 (P1): Warning messages stripped from results — no UI surface for AIR warnings

| Field | Value |
|-------|-------|
| **Severity** | P1 — Major |
| **File (backend)** | `backend/app/routers/submit.py:208-209` |
| **File (frontend)** | `frontend/components/ResultsSummary.tsx` |
| **Status** | Fixed |
| **Suggested branch** | `fix/results-show-warning-details` |

### Description

In `_build_result_records()`, warning/confirmed records have their details stripped:

```python
# submit.py:208-209
"errorCode": error_code if fe_status == "failed" else None,
"errorMessage": error_message if fe_status == "failed" else None,
```

This means records with `status: "confirmed"` (mapped from AIR `status: "warning"`) lose their `errorCode` (e.g., "AIR-W-1004") and `errorMessage` (the verbatim AIR message).

On the frontend, `ResultsSummary.tsx` only renders a "Failed Records" detail table (line 130-158). There is no equivalent table for warning/confirmed records. The "Claim IDs" table (lines 87-127) shows them but with no warning code or message column.

### Impact

- Users cannot see **why** a record was flagged as a warning
- Verbatim AIR warning messages (required per compliance) have no UI surface
- No way to determine which records need confirmation vs which were auto-confirmed

### Compliance Reference

AIR Integration Guide requires verbatim display of all AIR response messages, including warnings. See COMP-02 below.

---

## BUG-005 (P2): Endpoints return 200 with error body instead of proper HTTP status codes

| Field | Value |
|-------|-------|
| **Severity** | P2 — Minor |
| **File** | `backend/app/routers/submit.py:143-144, 155-157, 317-318` |
| **Status** | Fixed |
| **Suggested branch** | `fix/endpoint-http-status-codes` |

### Description

Multiple endpoints return HTTP 200 with `{"error": "Submission not found"}` when a submission ID doesn't exist:

- `get_progress()` — line 144
- `confirm_records()` — line 157
- `pause_submission()` — line 318
- `resume_submission()` — line 329

Only `download_report()` (line 244-249) correctly returns HTTP 404.

### Impact

Frontend code checking `res.ok` will treat "not found" as a successful response. Error handling logic that relies on HTTP status codes will not trigger. API consumers cannot distinguish success from failure without parsing the response body.

### Suggested Fix

Use `raise HTTPException(status_code=404, detail="Submission not found")` consistently across all endpoints.

---

## BUG-006 (P2): Frontend silences all polling errors

| Field | Value |
|-------|-------|
| **Severity** | P2 — Minor |
| **File** | `frontend/app/(dashboard)/submit/page.tsx:116-118` |
| **Status** | Fixed |
| **Suggested branch** | `fix/polling-error-handling` |

### Description

The progress polling `catch` block is completely empty:

```typescript
// page.tsx:116-118
} catch {
  // Ignore polling errors
}
```

No error logging, no retry counter, no user notification. If the backend becomes unreachable, the UI silently spins forever with no feedback.

### Impact

- Users have no indication that polling has failed
- No retry limit — the interval continues indefinitely
- Debugging network issues is harder with no client-side logs
- If the server returns an error, the UI provides no way to recover

### Suggested Fix

Add a retry counter. After N consecutive failures (e.g., 5), show an error banner and stop polling. Log errors to console in development.

---

## Compliance Assessment

| ID | Check | Status | Notes |
|----|--------|--------|-------|
| COMP-01 | Verbatim AIR error display | **PASS** | `ResultsSummary.tsx:151` renders `errorMessage` unmodified, no CSS truncation |
| COMP-02 | Verbatim AIR warning display | **FAIL** | Warning messages stripped in `submit.py:208-209`; no UI table for warnings (BUG-004) |
| COMP-03 | Edit panel from error card | **N/A** | Edit panel not yet implemented |
| COMP-04 | W-1004 → Confirm → SUCCESS | **FAIL** | Confirm endpoint is stub (BUG-001); records never sent to frontend (BUG-002) |
| COMP-05 | W-1008 pended → Confirm | **FAIL** | Same root cause as COMP-04 |
| COMP-06 | Recorded encounters excluded from confirm | **FAIL** | Not implemented — stub endpoint (BUG-001) |
| COMP-07 | 15 records chunked into 10+5 | **PASS** | `batch_grouping.py:18` MAX_ENCOUNTERS=10, chunking logic correct |
| COMP-08 | Episode IDs start at 1 | **PASS** | `batch_grouping.py` renumbers from 1 per batch |
| COMP-09 | Confirm includes claimId | **FAIL** | Stub endpoint doesn't use claimId (BUG-001) |
| COMP-10 | Audit log with user ID | **PARTIAL** | structlog logs `submission_id` but no `user_id` field |
| COMP-11 | Screenshots for NOI | **BLOCKED** | Confirm flow broken — cannot reach confirmation success state |
| COMP-12 | Edit panel field tooltips | **N/A** | Edit panel not yet implemented |

---

## Test Suite Status

**Backend:** 338 passed, 2 failed (integration-only: reference data endpoint tests expect 200 but get 400 — missing API parameters in E2E smoke tests, not related to this review scope)
**Frontend:** 115 passed, 0 failed (15 test files)

---

## Priority Summary

| Priority | Count | Bug IDs |
|----------|-------|---------|
| P0 (Critical) | 2 | BUG-001, BUG-002 |
| P1 (Major) | 2 | BUG-003, BUG-004 |
| P2 (Minor) | 2 | BUG-005, BUG-006 |

### Recommended Fix Order

1. **BUG-002** — Type mismatch fix (quick win, unblocks confirm dialog UI)
2. **BUG-001** — Implement real AIR confirmation call (requires BUG-002 first)
3. **BUG-004** — Preserve warning details in results and add UI table
4. **BUG-003** — Fix misleading test comment
5. **BUG-005** — Proper HTTP status codes
6. **BUG-006** — Polling error handling
