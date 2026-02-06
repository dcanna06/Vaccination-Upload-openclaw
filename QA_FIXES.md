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

### QA-FIX-003: Duplicate httpx in requirements.txt
- **Source ticket**: TICKET-001
- **Severity**: 🟢 MINOR
- **Status**: FIXED
- **File(s)**: `backend/requirements.txt`
- **Problem**: `httpx==0.27.0` listed twice (under HTTP client and Testing sections)
- **Expected**: Listed once only
- **Dev fix notes**: Removed duplicate entry under Testing section

### QA-FIX-004: EncounterSchema.id missing pattern validation
- **Source ticket**: TICKET-002
- **Severity**: 🟢 MINOR
- **Status**: FIXED
- **File(s)**: `backend/app/schemas/air_request.py`
- **Problem**: `EncounterSchema.id` had no pattern constraint; should be 1-10
- **Expected**: Pattern `^([1-9]|10)$` to match encounter ID spec
- **Dev fix notes**: Added `pattern=r"^([1-9]|10)$"` to EncounterSchema.id Field

### QA-FIX-005: EpisodeSchema.vaccineDose missing pattern validation
- **Source ticket**: TICKET-002
- **Severity**: 🟢 MINOR
- **Status**: FIXED
- **File(s)**: `backend/app/schemas/air_request.py`
- **Problem**: `vaccineDose` had no pattern; should be 'B' or '1'-'20'
- **Expected**: Pattern `^(B|[1-9]|1[0-9]|20)$`
- **Dev fix notes**: Added `pattern=r"^(B|[1-9]|1[0-9]|20)$"` to EpisodeSchema.vaccineDose

### QA-FIX-006: Exception classes in wrong file
- **Source ticket**: TICKET-003
- **Severity**: 🟢 MINOR
- **Status**: FIXED
- **File(s)**: `backend/app/exceptions.py`, `backend/app/middleware/error_handler.py`
- **Problem**: Exception classes defined in middleware/error_handler.py; claude.md says app/exceptions.py
- **Expected**: Exception classes in `app/exceptions.py` per coding standards
- **Dev fix notes**: Created `app/exceptions.py` with all exception classes. Updated `error_handler.py` to import from exceptions.py and re-export for backward compatibility.

### QA-FIX-007: upload.py uses dict return type instead of Pydantic model
- **Source ticket**: TICKET-003
- **Severity**: 🟢 MINOR
- **Status**: FIXED
- **File(s)**: `backend/app/routers/upload.py`
- **Problem**: Upload endpoint returns `-> dict` instead of a Pydantic model
- **Expected**: Pydantic response model per claude.md coding standards
- **Dev fix notes**: Created `UploadResponse` Pydantic model and updated endpoint to use `response_model=UploadResponse`

### QA-FIX-008: Unused import in file_upload.py
- **Source ticket**: TICKET-003
- **Severity**: 🟢 MINOR
- **Status**: FIXED
- **File(s)**: `backend/app/middleware/file_upload.py`
- **Problem**: `status` imported from FastAPI but never used
- **Expected**: No unused imports
- **Dev fix notes**: Removed unused `status` import

---

## Closed Issues

<!--
Only VERIFIED items go here.
-->

### QA-FIX-002: TICKET-002 not merged to main
- **Source ticket**: TICKET-002
- **Severity**: 🟡 MAJOR
- **Status**: VERIFIED ✅
- **Fixed by**: `7bf9f6e` (fix(qa): QA-FIX-002 merge TICKET-002 to main)
- **Verified by QA**: 2026-02-07
- **Retest result**: TICKET-002 commit `e6be799` confirmed on main via merge `7bf9f6e`. All TICKET-002 artifacts present (air.ts types, air_request.py schemas, 32 type tests). Keystore patterns from QA-FIX-001 survived merge. 37 tests passing on main.
