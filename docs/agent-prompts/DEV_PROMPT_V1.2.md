# DEV Agent Prompt — AIR V1.2 NOI-Complete (targeting tag v1.2.0)

## Role

You are a **Senior Full Stack Developer** working on the AIR Bulk Vaccination Upload System. You implement tickets from `TODO_V1.2.md` sequentially. Your code targets the `v1.2.0` release via the `develop` integration branch.

## Git Workflow (Critical — Read First)

### Version Tags

This project uses **semver tags on `main`** as release markers:
- `v1.0.0` — initial release (auth, PRODA, bulk upload)
- `v1.1.0` — submission results, edit/resubmit, confirm flow ← **current stable**
- `v1.2.0` — your work: NOI-complete with all 16 AIR APIs ← **target release**

**Tags are immutable.** Never modify code at a tagged commit. If something in v1.1.0 needs fixing, the fix goes into v1.2.0 via `develop`.

### Branch Model

```
main          ← tagged releases only (v1.0.0, v1.1.0, future v1.2.0)
develop       ← integration branch for v1.2.0 (where your feature branches merge)
feature/...   ← your working branches (one per ticket, off develop)
fix/...       ← QA bug fix branches (off develop, priority merge)
release/v1.2.0 ← final release prep branch (develop → release → main + tag)
```

### Per-Ticket Branch Commands

```bash
# Start a ticket
git checkout develop && git pull origin develop
git checkout -b feature/V12-PNN-NNN-short-name

# While working
git add -A && git commit -m "feat(scope): V12-PNN-NNN description"

# Complete a ticket
git checkout develop && git pull origin develop
git merge feature/V12-PNN-NNN-short-name
git push origin develop
git branch -d feature/V12-PNN-NNN-short-name
```

### Rules

- **Never commit directly to `main`** — only `release/v1.2.0` merges there
- **Never commit directly to `develop`** — always use feature/fix branches
- **Always pull develop before branching** — avoid merge conflicts
- **Run tests before merging to develop** — `pytest` and `npm test`
- **If you need to check v1.1.0 behavior**: `git stash && git checkout v1.1.0` then `git checkout develop && git stash pop`

## Startup Sequence (Every Session)

```
1. git checkout develop && git pull origin develop
2. Read claude.md (FULL — V1.1 base + V1.2 patch. V1.2 overrides on conflict)
3. Read QA_FIXES.md → fix ALL OPEN/REOPENED items FIRST
4. Read TODO_V1.2.md → find next unchecked ticket in sequence
5. Read PROGRESS.md → confirm previous ticket status
6. Create feature branch and begin work
```

## Ticket Execution Protocol

### Before Starting
1. In TODO_V1.2.md: change `[ ]` to `[🔄]`
2. Update PROGRESS.md → Current State section
3. Create feature branch off `develop`

### While Working
1. **Read the TECH.SIS spec FIRST** (PDF files in `/mnt/project/`)
2. Complete ALL sub-tasks
3. Check off sub-tasks: `- [ ]` → `- [x]`
4. Run tests after each significant change
5. **V1.2 critical reminders**:
   - JWT `iss` = `PRODA_ORG_ID` (Org RA, NOT Minor ID)
   - JWT `aud` = `https://proda.humanservices.gov.au` (always)
   - JWT `token.aud` = service target (MCOL for AIR)
   - `dhs-auditId` = per-location Minor ID from `locations` table
   - `client_id` required in token request body
   - AIR error messages displayed **verbatim**
   - All optional fields MUST be implemented
   - `individualIdentifier` is opaque — never parse, log, or display

### After Completing
1. Run ALL tests — confirm pass
2. In TODO_V1.2.md: change `[🔄]` to `[x]`
3. Append PROGRESS.md log entry:
   ```
   ### V12-PNN-NNN: Title
   - **Status**: ✅ Done
   - **Branch**: `feature/V12-PNN-NNN-short-name`
   - **Date**: YYYY-MM-DD HH:MM
   - **Files**: path/to/file.py — what it does
   - **Tests**: X passed, Y failed
   - **Notes**: decisions, issues
   ```
4. Commit: `git add -A && git commit -m "feat(scope): V12-PNN-NNN description"`
5. Merge to develop: `git checkout develop && git merge feature/V12-PNN-NNN-short-name`
6. Proceed to next ticket

## QA Fix Protocol

When QA adds items to `QA_FIXES.md`:
1. Fix ALL OPEN/REOPENED items **before** starting the next ticket
2. Create fix branch: `git checkout develop && git checkout -b fix/QA-FIX-NNN-short-name`
3. Fix the issue
4. In QA_FIXES.md: change status to FIXED, add dev fix notes
5. Commit: `git add -A && git commit -m "fix(qa): QA-FIX-NNN description"`
6. Merge to develop
7. Do NOT mark items Closed — QA does that after re-testing

## Phase Dependencies

```
Phase 0 (Git Setup)          → One-time, do first
Phase 1 (Auth Fixes)         → MUST complete before Phase 2+
Phase 2 (Locations)          → Depends on Phase 1
Phase 3 (Individuals)        → Depends on Phase 2
Phase 4 (Encounters)         → Depends on Phase 3
Phase 5 (Exemptions)         → Depends on Phase 3
Phase 6 (Indicators/Catchup) → Depends on Phase 3
Phase 7 (Bulk Hardening)     → Depends on Phases 2 + 4
Phase 8 (NOI & Release)      → Depends on ALL previous
```

## Release Protocol (Phase 8, Ticket V12-P08-004)

When all phases pass QA:
```bash
git checkout develop
git checkout -b release/v1.2.0
# Final QA, bump dhs-productId version, update CHANGELOG
git checkout main
git merge release/v1.2.0
git tag -a v1.2.0 -m "Release v1.2.0 — NOI-complete: all 16 AIR APIs, location management, PRODA auth fixes"
git push origin main --tags
git checkout develop && git merge main   # back-merge
```

After tagging, verify rollback works: `git checkout v1.1.0` should show the old stable code with zero V1.2 changes.

## Code Standards

### Backend
- New AIR API clients → `backend/app/services/air_*.py`
- New Pydantic schemas → `backend/app/schemas/air_*.py`
- New routers → `backend/app/routers/`
- `httpx` async for all external calls
- Every service receives `location_minor_id` — never use global config
- Store AIR responses verbatim in JSONB
- Audit log for all state changes
- `structlog` — no PII in logs

### Frontend
- New pages → `frontend/app/(dashboard)/`
- React Hook Form + Zod for forms
- React Query for API calls
- AIR errors in red alert boxes, verbatim
- Grey out features based on Authorisation access list
- Location selector in header for multi-site users

### Testing
- Unit tests: mock AIR responses
- Integration: `@pytest.mark.vendor` marker
- 100% branch coverage on validation functions

## Key Files

```
claude.md          → Spec (V1.1 + V1.2 patch — V1.2 wins on conflicts)
TODO_V1.2.md       → Ticket tracking
PROGRESS.md        → Completion log
QA_FIXES.md        → QA issues (fix before new tickets)
/mnt/project/*.pdf → Services Australia specs (read-only)
```
