# DEV Agent Prompt — AIR Submission Results & Edit/Resubmit

You are a senior full-stack developer implementing the Submission Results page and Edit & Resubmit panel for an AIR (Australian Immunisation Register) bulk vaccination upload system.

## Your Mission

Implement tickets DEV-001 through DEV-010 in the order specified below. After completing each ticket, update PROGRESS.md with the ticket ID, completion status, and any notes. Check BUGS.md before starting new work for any QA-reported issues.

---

## Git Branching Strategy

This project uses **trunk-based development with feature branches**. The current stable codebase is tagged `v1.0.0` on `main`. All work for this feature set targets `v1.1.0`.

### Branch Structure

```
main                          ← production-ready, tagged releases (v1.0.0, v1.1.0, ...)
  └── develop                 ← integration branch for v1.1.0 work
        ├── feature/submission-results-api       ← DEV-001, DEV-009
        ├── feature/submission-results-ui        ← DEV-002, DEV-003, DEV-004
        ├── feature/edit-resubmit-panel          ← DEV-005, DEV-007, DEV-008
        ├── feature/resubmit-confirm-api         ← DEV-006
        ├── feature/export-results               ← DEV-010
        └── test/e2e-submission-results          ← QA agent's Playwright tests
```

### Branch Naming Convention

| Prefix | Use Case | Example |
|--------|----------|---------|
| `feature/` | New functionality | `feature/submission-results-ui` |
| `fix/` | Bug fixes from QA | `fix/verbatim-message-truncation` |
| `test/` | Test suites and QA infra | `test/e2e-submission-results` |
| `hotfix/` | Emergency prod fixes | `hotfix/air-auth-token-expiry` |
| `chore/` | Config, deps, docs | `chore/playwright-setup` |

### Workflow — Step by Step

**1. Before starting any work, set up branches:**
```bash
# Ensure main is tagged with current version
git checkout main
git tag -a v1.0.0 -m "Release v1.0.0 — Bulk upload, auth, core AIR integration"
git push origin v1.0.0

# Create develop branch from main
git checkout -b develop
git push -u origin develop
```

**2. For each ticket or group of tickets, create a feature branch from develop:**
```bash
git checkout develop
git pull origin develop
git checkout -b feature/submission-results-api
# ... do work, commit frequently ...
git push -u origin feature/submission-results-api
```

**3. Commit messages — use conventional commits:**
```
feat(results): add SubmissionRecord model and migration     ← DEV-001
feat(results): implement AIR response parser service        ← DEV-009
feat(results-ui): add summary header with status counts     ← DEV-002
feat(results-ui): add expandable RecordCard component       ← DEV-003
feat(edit-panel): add slide-over form with field mapping    ← DEV-005
fix(results): preserve verbatim AIR message in air_message  ← bug fix
test(e2e): add Playwright submission results test suite     ← QA work
chore: add Playwright config and test dependencies          ← setup
```

**4. When feature branch is complete, merge to develop:**
```bash
git checkout develop
git pull origin develop
git merge feature/submission-results-api
git push origin develop
# Delete the feature branch
git branch -d feature/submission-results-api
git push origin --delete feature/submission-results-api
```

**5. When all tickets pass QA on develop, create release:**
```bash
git checkout develop
git checkout -b release/v1.1.0
# Final QA, version bump, changelog
git checkout main
git merge release/v1.1.0
git tag -a v1.1.0 -m "Release v1.1.0 — Submission results, edit/resubmit, confirm flow"
git push origin main --tags
# Back-merge to develop
git checkout develop
git merge main
```

### Merge Order (respects ticket dependencies)

```
Phase 1: feature/submission-results-api → develop     (DEV-001, DEV-009)
Phase 2: feature/submission-results-ui  → develop     (DEV-002, DEV-003, DEV-004)
Phase 3: feature/edit-resubmit-panel    → develop     (DEV-005, DEV-007, DEV-008)
         feature/resubmit-confirm-api   → develop     (DEV-006)
Phase 4: test/e2e-submission-results    → develop     (QA-005)
         feature/export-results         → develop     (DEV-010)
Phase 5: develop → release/v1.1.0 → main + tag v1.1.0
```

### Rules
- **Never commit directly to `main` or `develop`** — always use feature branches
- **Pull from develop before creating a new feature branch** to avoid conflicts
- **Run `npx tsc --noEmit` and `pytest` before every merge** to develop
- **QA agent works on `develop`** after feature branches are merged — they create `test/` branches only for new test files
- **Bug fixes from QA** go on `fix/` branches off develop, get priority merge

---

## Tech Stack
- **Frontend:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS
- **Backend:** Python FastAPI, SQLAlchemy 2.0, PostgreSQL 16, Redis
- **File structure:**
  - `frontend/app/submissions/[id]/results/page.tsx` — results page
  - `frontend/components/submission/RecordCard.tsx` — expandable record card
  - `frontend/components/submission/EditResubmitPanel.tsx` — slide-over edit form
  - `frontend/components/submission/ResultsToolbar.tsx` — filter tabs + actions
  - `frontend/components/submission/EpisodePill.tsx` — episode status badge
  - `frontend/components/submission/ErrorDetail.tsx` — error with guidance
  - `frontend/lib/air-error-guidance.ts` — error code → tip map
  - `frontend/types/submission.ts` — shared TypeScript interfaces
  - `backend/app/models/submission_record.py` — SQLAlchemy model
  - `backend/app/services/air_response_parser.py` — AIR response parser
  - `backend/app/routers/submission_results.py` — API endpoints
  - `backend/app/services/air_resubmit.py` — resubmit/confirm logic

## CRITICAL COMPLIANCE RULE

**TECH.SIS.AIR.02 §5.2.2:** Error messages MUST be displayed to the end user EXACTLY as supplied by Services Australia — not truncated, transformed, or changed in any way.

This means:
- Store the raw `message` string from every AIR response
- Display it verbatim in the UI — character for character
- Never wrap it in your own error text or modify it
- The `air_message` field in the database must be TEXT with no length limit

## Implementation Order

### Phase 1: Backend Foundation

**DEV-001: Database model + API endpoint**

```python
# backend/app/models/submission_record.py
class SubmissionRecord(Base):
    __tablename__ = "submission_records"
    
    id = Column(UUID, primary_key=True, default=uuid4)
    submission_id = Column(UUID, ForeignKey("submissions.id"), nullable=False)
    row_number = Column(Integer, nullable=False)
    individual_data = Column(JSONB, nullable=False)  # full individual block
    encounter_data = Column(JSONB, nullable=False)   # full encounter block
    status = Column(String(10), nullable=False)      # SUCCESS, WARNING, ERROR
    air_status_code = Column(String(12))             # e.g. AIR-I-1007
    air_message = Column(Text)                       # VERBATIM — never truncate
    air_errors = Column(JSONB, default=[])            # [{code, field, message}]
    air_episodes = Column(JSONB, default=[])          # [{id, status, code, message}]
    claim_id = Column(String(8))                     # for confirm flow
    claim_sequence_number = Column(String(4))
    action_required = Column(String(20), default="NONE")  # NONE or CONFIRM_OR_CORRECT
    resubmit_count = Column(Integer, default=0)
    last_resubmitted_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
```

**DEV-009: AIR Response Parser**

Parse the AddEncounterResponseType JSON from AIR into SubmissionRecord fields:

```python
def parse_air_response(air_response: dict, original_request: dict) -> dict:
    """
    Maps AIR AddEncounterResponseType to our SubmissionRecord fields.
    
    AIR response structure:
    {
        "statusCode": "AIR-I-1007",      # claim-level
        "codeType": "AIRIBU",
        "message": "All encounter(s)...", # STORE VERBATIM
        "claimDetails": {
            "claimId": "WB9X4I+$",
            "encounters": [{
                "id": "1",
                "information": {
                    "status": "SUCCESS",      # SUCCESS or WARNING
                    "code": "AIR-I-1000",
                    "text": "Encounter was..."  # STORE VERBATIM
                },
                "episodes": [{
                    "id": "1",
                    "information": {
                        "status": "VALID",     # VALID or INVALID
                        "code": "AIR-I-1002",
                        "text": "Vaccine was valid."
                    }
                }]
            }]
        },
        "errors": [{                      # only if AIR-E-1005/1006
            "code": "AIR-E-1018",
            "field": "encounters.dateOfService",
            "message": "Date field..."    # STORE VERBATIM
        }]
    }
    """
    status_code = air_response.get("statusCode", "")
    
    # Determine record status
    if status_code in ("AIR-I-1007", "AIR-I-1100"):
        status = "SUCCESS"
    elif status_code.startswith("AIR-W"):
        status = "WARNING"
    else:
        status = "ERROR"
    
    # Determine action required
    action = "NONE"
    if status_code in ("AIR-W-1004", "AIR-W-1008"):
        action = "CONFIRM_OR_CORRECT"
    
    # Check encounter-level results
    claim_details = air_response.get("claimDetails", {})
    encounters = claim_details.get("encounters", [])
    
    # For AIR-W-1008, check individual encounters
    if status_code == "AIR-W-1008" and encounters:
        for enc in encounters:
            info = enc.get("information", {})
            if info.get("status") == "WARNING":
                action = "CONFIRM_OR_CORRECT"
                break
    
    return {
        "status": status,
        "air_status_code": status_code,
        "air_message": air_response.get("message", ""),  # VERBATIM
        "air_errors": air_response.get("errors", []),
        "air_episodes": extract_episodes(encounters),
        "claim_id": claim_details.get("claimId"),
        "claim_sequence_number": claim_details.get("claimSequenceNumber"),
        "action_required": action,
    }
```

### Phase 2: Frontend — Results Page

**DEV-002: Summary header** — See `submission-results.jsx` mockup for exact layout.

**DEV-003: RecordCard** — This is the most complex component. Key requirements:
- Collapsed: row badge, status icon, name, vaccine+date, status badge, AIR code, chevron
- Expanded: patient grid, encounter grid, AIR message banner (VERBATIM), guidance tip, errors, episodes, action buttons
- Error/warning records expand by default
- "Confirm & Accept" button only on records with action_required === "CONFIRM_OR_CORRECT"
- "Edit & Resubmit" button on all non-SUCCESS records

**DEV-004: Filter tabs** — Client-side filtering for ≤50 records, server-side for larger.

### Phase 3: Frontend — Edit Panel

**DEV-005: EditResubmitPanel** — See `edit-resubmit-panel.jsx` for exact layout. Key requirements:

Field → Error Mapping (map AIR `field` paths to form field names):
```typescript
const FIELD_MAP: Record<string, string> = {
  "encounters.dateOfService": "dateOfService",
  "encounters.episodes.vaccineCode": "vaccineCode",
  "encounters.episodes.vaccineDose": "vaccineDose",
  "encounters.episodes.vaccineBatch": "vaccineBatch",
  "individual.medicareCard.medicareCardNumber": "medicare",
  "individual.medicareCard.medicareIRN": "irn",
  "individual.personalDetails.firstName": "firstName",
  "individual.personalDetails.lastName": "lastName",
  "individual.personalDetails.dateOfBirth": "dob",
  "individual.personalDetails.gender": "gender",
  "individual.address.postCode": "postCode",
  "individual": "firstName",  // fallback
};
```

**DEV-007: State management** for resubmit flow (loading, success, failure, re-error).

### Phase 4: Backend — Resubmit/Confirm

**DEV-006: Resubmit + Confirm endpoints**

```python
@router.post("/submissions/{id}/records/{row}/resubmit")
async def resubmit_record(id: UUID, row: int, data: ResubmitRequest):
    """
    Build a fresh AddEncounterRequestType and send to AIR.
    Does NOT include claimId — this is a new submission.
    """
    
@router.post("/submissions/{id}/records/{row}/confirm")
async def confirm_record(id: UUID, row: int):
    """
    For AIR-W-1004 and pended episodes.
    Uses stored claimId + claimSequenceNumber.
    Sets acceptAndConfirm=true.
    Already-successful encounters MUST be excluded.
    """

@router.post("/submissions/{id}/confirm-all-warnings")
async def confirm_all_warnings(id: UUID):
    """Batch confirm all CONFIRM_OR_CORRECT records."""
```

## TypeScript Interfaces

```typescript
// types/submission.ts

export interface SubmissionResult {
  id: string;
  completedAt: string;
  submittedBy: string;
  batchName: string;
  environment: "VENDOR_TEST" | "PRODUCTION";
  counts: { total: number; success: number; warning: number; error: number };
  records: SubmissionRecord[];
}

export interface SubmissionRecord {
  rowNumber: number;
  individual: IndividualData;
  encounter: EncounterData;
  status: "SUCCESS" | "WARNING" | "ERROR";
  airStatusCode: string;
  airMessage: string;  // VERBATIM from AIR
  errors: AirError[];
  episodes: EpisodeResult[];
  claimId?: string;
  claimSequenceNumber?: string;
  actionRequired: "NONE" | "CONFIRM_OR_CORRECT";
  resubmitCount: number;
}

export interface AirError {
  code: string;
  field: string;
  message: string;  // VERBATIM from AIR
}

export interface EpisodeResult {
  id: string;
  vaccine: string;
  status: "VALID" | "INVALID";
  code: string;
  message: string;  // VERBATIM from AIR
}

export interface IndividualData {
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  medicare: string;
  irn: string;
  ihiNumber?: string;
  postCode?: string;
  addressLineOne?: string;
  locality?: string;
}

export interface EncounterData {
  dateOfService: string;
  vaccineCode: string;
  vaccineDose: string;
  vaccineBatch: string;
  vaccineType: string;
  routeOfAdministration: string;
  providerNumber: string;
}
```

## Error Guidance Map

```typescript
// lib/air-error-guidance.ts
export const AIR_ERROR_GUIDANCE: Record<string, { tip: string; action: "confirm" | "edit" | "retry" | "none" }> = {
  "AIR-W-1004": { tip: "The patient may not be registered on AIR, or their details don't match. Verify name, DOB, and Medicare number against their card. If correct, confirm to create a new AIR record.", action: "confirm" },
  "AIR-W-1001": { tip: "The encounter didn't pass assessment rules. Review the episode details below. You can accept the pended status or correct the data.", action: "confirm" },
  "AIR-W-0044": { tip: "The vaccine may not be approved for use on the date of service. Check that the vaccine brand and date are correct.", action: "edit" },
  "AIR-E-1005": { tip: "One or more fields failed validation. Review each error below and correct the data.", action: "edit" },
  "AIR-E-1006": { tip: "A system error occurred on the AIR side. This will be retried automatically. If it persists, contact AIR.INTERNET.HELPDESK@servicesaustralia.gov.au", action: "retry" },
  "AIR-E-1015": { tip: "The vaccination date is before the patient's date of birth. Check both dates for typos.", action: "edit" },
  "AIR-E-1017": { tip: "A value failed validation or check digit. For Medicare numbers, verify all 10 digits match the patient's card exactly.", action: "edit" },
  "AIR-E-1018": { tip: "A date is in the future. Check that the date of service is today or earlier.", action: "edit" },
  "AIR-E-1023": { tip: "The vaccine code doesn't exist in AIR reference data. Use the dropdown to select a valid code.", action: "edit" },
  "AIR-E-1058": { tip: "This individual's AIR record has restrictions. Contact Services Australia directly — this cannot be resolved through the system.", action: "none" },
};
```

## Quality Gates

Before marking any ticket complete:
1. TypeScript compiles with zero errors (`npx tsc --noEmit`)
2. All existing tests pass
3. New component has basic unit tests
4. PROGRESS.md is updated
5. No hardcoded mock data in production code (use API calls)
6. All AIR messages are passed through as-is, never modified

## Coordination with QA Agent

- Write to PROGRESS.md after each ticket completion
- The QA agent will run Playwright tests against your dev server on port 3000
- QA agent will mock the backend API for frontend tests
- Check BUGS.md before starting new work
- If QA reports a verbatim message compliance failure, treat it as P0 and fix immediately
