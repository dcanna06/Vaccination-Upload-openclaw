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

### QA-FIX-002: TICKET-002 not merged to main
- **Source ticket**: TICKET-002
- **Severity**: 🟡 MAJOR
- **Status**: FIXED
- **File(s)**: Git branch `feature/TICKET-002-typescript-config`
- **Problem**: TICKET-002 commit `e6be799` was marked ✅ Done in PROGRESS.md but never merged to main. Main branch is still at `9d4e97a` (QA fix for TICKET-001). Dev proceeded to create `feature/TICKET-003-backend-setup` from the unmerged TICKET-002 branch. This violates the claude.md workflow protocol.
- **Expected**: Per claude.md "Ticket Tracking Protocol" → "After Completing a Ticket" step 5: `git checkout main && git merge feature/TICKET-NNN-short-name`. TICKET-002 must be merged to main before TICKET-003 work can properly proceed.
- **Evidence**: `git log main --oneline` shows main at `9d4e97a fix(qa): TICKET-001...` — does not include `e6be799 feat(types): TICKET-002...`. Branch graph shows TICKET-002 and QA fix diverged from `6ed2927` without being reconciled.
- **Dev fix notes**: Merged `feature/TICKET-002-typescript-config` into main. Resolved merge conflict in PROGRESS.md (kept both TICKET-002 and TICKET-003-005 entries in chronological order). TICKET-002 changes (air.ts enhancements, type tests, air_request.py) now in main.
- **Retest result**: (QA agent fills this in after retesting)

---

## Closed Issues

<!-- 
Only VERIFIED items go here.

### QA-FIX-001: Short description
- **Status**: VERIFIED ✅
- **Fixed by**: commit hash or ticket reference
- **Verified by QA**: YYYY-MM-DD
- **Retest result**: All tests pass, issue confirmed resolved

-->
