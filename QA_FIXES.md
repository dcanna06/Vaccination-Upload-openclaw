# QA Fix Queue

> **QA Agent**: Add issues here that the dev agent needs to fix.
> **Dev Agent**: Check this file before starting each new ticket. Fix any OPEN items first. After fixing, change status from OPEN to FIXED.
> **QA Agent**: After dev marks an item FIXED, re-test it. Change status to VERIFIED (passed) or REOPENED (still broken).

## Status Flow

```
QA finds issue → OPEN (QA writes it)
                    ↓
Dev fixes it   → FIXED (Dev updates status)
                    ↓
QA re-tests    → VERIFIED ✅ (move to Closed) or REOPENED 🔁 (stays in Open)
```

---

## Open Issues

<!-- 
Statuses that stay here: OPEN, FIXED (awaiting QA retest), REOPENED

### QA-FIX-001: Short description
- **Source ticket**: TICKET-NNN
- **Severity**: 🔴 CRITICAL | 🟡 MAJOR
- **Status**: OPEN | FIXED | REOPENED
- **File(s)**: `path/to/file.py`
- **Problem**: What's wrong
- **Expected**: What it should do
- **Evidence**: Test output, error message, or code snippet
- **Dev fix notes**: (Dev agent fills this in when marking FIXED)
- **Retest result**: (QA agent fills this in after retesting)

-->

*(No open issues)*

---

## Closed Issues

<!--
Only VERIFIED items go here.
-->

### QA-FIX-008: Unused import in file_upload.py
- **Source ticket**: TICKET-003
- **Severity**: 🟢 MINOR
- **Status**: VERIFIED ✅
- **Verified by QA**: 2026-02-07
- **Retest result**: `file_upload.py` no longer imports `status`. Only `UploadFile` imported from FastAPI. Clean.

### QA-FIX-007: upload.py uses dict return type instead of Pydantic model
- **Source ticket**: TICKET-003
- **Severity**: 🟢 MINOR
- **Status**: VERIFIED ✅
- **Verified by QA**: 2026-02-07
- **Retest result**: `UploadResponse` Pydantic model at line 11-14, endpoint uses `response_model=UploadResponse`, returns `UploadResponse(...)`. Correct.

### QA-FIX-006: Exception classes in wrong file
- **Source ticket**: TICKET-003
- **Severity**: 🟢 MINOR
- **Status**: VERIFIED ✅
- **Verified by QA**: 2026-02-07
- **Retest result**: `app/exceptions.py` contains all 5 exception classes (AppError, ValidationError, AuthenticationError, FileProcessingError, AIRApiError). `error_handler.py` imports from `exceptions.py` and re-exports via `__all__`. Clean.

### QA-FIX-005: EpisodeSchema.vaccineDose missing pattern validation
- **Source ticket**: TICKET-002
- **Severity**: 🟢 MINOR
- **Status**: VERIFIED ✅
- **Verified by QA**: 2026-02-07
- **Retest result**: `air_request.py:47` has `vaccineDose: str = Field(..., pattern=r"^(B|[1-9]|1[0-9]|20)$")`. Allows B and 1-20. Correct.

### QA-FIX-004: EncounterSchema.id missing pattern validation
- **Source ticket**: TICKET-002
- **Severity**: 🟢 MINOR
- **Status**: VERIFIED ✅
- **Verified by QA**: 2026-02-07
- **Retest result**: `air_request.py:54` has `id: str = Field(..., pattern=r"^([1-9]|10)$")`. Allows 1-10. Correct.

### QA-FIX-003: Duplicate httpx in requirements.txt
- **Source ticket**: TICKET-001
- **Severity**: 🟢 MINOR
- **Status**: VERIFIED ✅
- **Verified by QA**: 2026-02-07
- **Retest result**: `httpx==0.27.0` appears once (line 20, under HTTP client section). No duplicate in Testing section. Correct.

### QA-FIX-002: TICKET-002 not merged to main
- **Source ticket**: TICKET-002
- **Severity**: 🟡 MAJOR
- **Status**: VERIFIED ✅
- **Fixed by**: `7bf9f6e` (fix(qa): QA-FIX-002 merge TICKET-002 to main)
- **Verified by QA**: 2026-02-07
- **Retest result**: TICKET-002 commit `e6be799` confirmed on main via merge `7bf9f6e`. All TICKET-002 artifacts present (air.ts types, air_request.py schemas, 32 type tests). Keystore patterns from QA-FIX-001 survived merge. 37 tests passing on main.
