# Comprehensive Application Audit Report

**AIR Bulk Vaccination Upload**
**Date:** 2026-02-12
**Scope:** Code security, infrastructure, CI/CD, data handling, Australian health compliance

---

## Executive Summary

This audit covers the full stack of the AIR Bulk Vaccination Upload application — a Next.js frontend and FastAPI backend that submits vaccination data to the Australian Immunisation Register (AIR) via PRODA authentication. The application is deployed on Azure App Service (Australia East).

### Risk Overview

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 7 | Requires immediate action |
| HIGH | 12 | Fix within 1-2 weeks |
| MEDIUM | 10 | Fix within 1 month |
| LOW | 6 | Backlog |

---

## PART 1: CRITICAL FINDINGS

### C-01: Missing Authentication on Data Endpoints
**Severity:** CRITICAL
**Impact:** Any unauthenticated user can upload, validate, submit, and download health records

All core data endpoints lack `Depends(get_current_user)`:

| File | Endpoints Without Auth |
|------|----------------------|
| `backend/app/routers/upload.py:29` | `POST /upload` |
| `backend/app/routers/validate.py:31` | `POST /validate` |
| `backend/app/routers/submit.py:214,257,271,421,446,500,519,531` | All submit/confirm/results/download |
| `backend/app/routers/bulk_history.py:42,96,297,344,363,407` | All bulk history endpoints |
| `backend/app/routers/submission_results.py:145,270,320,418,539` | All results/resubmit/export |

**Fix:** Add `user: User = Depends(get_current_user)` to every endpoint handling PII.

---

### C-02: No Authorization / Ownership Checks on Submissions
**Severity:** CRITICAL
**Impact:** User A can access User B's submission data by guessing the UUID

Submission and bulk history endpoints use only a UUID in the path with no ownership verification:
```python
# backend/app/routers/submit.py:257
sub = _submissions.get(submission_id)  # No check if user owns this
```

**Fix:** Store `user_id` and `organisation_id` with each submission; verify ownership before returning data.

---

### C-03: PII Stored Indefinitely in Memory (No TTL)
**Severity:** CRITICAL
**Impact:** Medicare numbers, IHI, names, DOB accumulate in memory until server restart

Two global dicts hold full PII with no cleanup:
- `backend/app/routers/bulk_history.py:35` — `_requests: dict[str, dict[str, Any]] = {}`
- `backend/app/routers/submit.py:24-25` — `_submissions: dict[str, dict[str, Any]]`

After processing completes, PII remains in memory indefinitely. On server crash, memory could be dumped.

**Fix:** Use Redis with TTL (e.g., 1 hour expiry) or implement a cleanup task that purges completed requests.

---

### C-04: Default APP_SECRET_KEY Is a Placeholder
**Severity:** CRITICAL
**Impact:** If env var is not set, all JWT tokens are signed with a known string

```python
# backend/app/config.py:22
APP_SECRET_KEY: str = "change-me-to-a-random-64-char-string"
```

**Fix:** Add a validator that refuses to start with the default value. Require the env var.

---

### C-05: Default PRODA_JKS_PASSWORD Is "Pass-123"
**Severity:** CRITICAL
**Impact:** Known default password for keystore containing PRODA signing key

```python
# backend/app/config.py:35
PRODA_JKS_PASSWORD: str = "Pass-123"  # SoapUI default
```

**Fix:** Remove default; require env var. Add startup validation.

---

### C-06: Sensitive Healthcare Identifiers in localStorage (Frontend)
**Severity:** CRITICAL
**Impact:** XSS attack can steal provider identifiers and healthcare data

```typescript
// frontend/app/(dashboard)/settings/page.tsx:16-31
localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
// Stores: providerNumber, hpioNumber, hpiiNumber
```

Also: `sessionStorage` stores full pended encounter payloads with PII:
```typescript
// frontend/app/(dashboard)/confirm/page.tsx:25-34
sessionStorage.getItem('pendedEncounters');  // Full names, DOB, Medicare
```

**Fix:** Store only in backend. Use httpOnly cookies for session context. Never put PII in browser storage.

---

### C-07: PII Stored Plaintext in Database (No Encryption at Rest)
**Severity:** CRITICAL
**Impact:** Database compromise exposes all Medicare numbers, IHI, names, DOB

Database models store PII in plaintext columns:
- `backend/app/models/submission.py` — submission batches contain full payloads
- No field-level encryption for sensitive columns
- No Transparent Data Encryption (TDE) configured at Azure PostgreSQL level

**Fix:** Enable TDE on Azure PostgreSQL. Implement field-level encryption for Medicare/IHI numbers using Fernet or AES-256-GCM.

---

## PART 2: HIGH SEVERITY FINDINGS

### H-01: Information Disclosure via Exception Details
**Severity:** HIGH
**Files:** `individuals.py:73`, `exemptions.py:43,57,75,91`, `indicators.py:44,59,74,92`, `encounters_update.py:53`

Raw exception messages exposed to clients:
```python
raise HTTPException(status_code=502, detail=str(e))  # Leaks internal errors
```

**Fix:** Log details server-side; return generic error messages to clients.

---

### H-02: No CSRF Protection
**Severity:** HIGH
**File:** `backend/app/main.py`

No CSRF tokens implemented. While SameSite cookies provide some protection, this is insufficient for a healthcare application.

**Fix:** Add CSRF middleware or use double-submit cookie pattern.

---

### H-03: RBAC Exists But Is Never Used
**Severity:** HIGH
**File:** `backend/app/dependencies.py:37-48`

`require_role()` dependency factory exists but is not applied to any endpoint. Any authenticated user can perform any action.

**Fix:** Apply `require_role("provider", "admin")` to confirmation and submission endpoints.

---

### H-04: Full PII in API Responses (No Masking)
**Severity:** HIGH
**Files:** `submission_results.py:46-63`, `bulk_history.py:432-481`

API responses and CSV/Excel exports include unmasked Medicare numbers, full names, DOB:
```python
"medicare": medicare.get("medicareCardNumber", ""),  # Full number returned
```

**Fix:** Mask PII in display responses (e.g., `****1234`). Require explicit action for unmasked exports.

---

### H-05: No User-Initiated Data Deletion
**Severity:** HIGH
**Impact:** Users cannot exercise deletion rights under Privacy Act APPs

No DELETE endpoints exist for submission data. PII persists indefinitely.

**Fix:** Implement soft-delete with data retention policy. Add `DELETE /submissions/{id}` endpoint.

---

### H-06: No Error Boundary in Frontend
**Severity:** HIGH
**File:** Missing `frontend/app/error.tsx`

Unhandled errors crash the entire application with no fallback UI.

**Fix:** Create `app/error.tsx` and `app/global-error.tsx` error boundaries.

---

### H-07: Submission Store Files Written with Default Permissions
**Severity:** HIGH
**File:** `backend/app/services/submission_store.py:37-42`

JSON files containing PII are written with default 644 permissions (world-readable).

**Fix:** Set `os.chmod(path, 0o600)` after writing.

---

### H-08: No Comprehensive Audit Logging
**Severity:** HIGH
**Impact:** Cannot trace who accessed, modified, or exported health records

Sensitive operations (confirm, resubmit, export, download) have minimal logging without user_id:
```python
logger.info("record_resubmitted", submission_id=submission_id, row=row)
# Missing: user_id, timestamp, IP, reason
```

**Fix:** Log user_id, action, resource, timestamp for all data operations. Store in audit_log table.

---

### H-09: Multi-Tenancy Not Enforced
**Severity:** HIGH
**File:** `backend/app/models/submission.py:15-17`

Database models include `organisation_id` but queries don't filter by it. All submissions visible to all users.

**Fix:** Add `organisation_id` filtering to all database queries.

---

### H-10: No Content Security Policy on Frontend
**Severity:** HIGH
**File:** `frontend/next.config.js`

No CSP headers configured. Missing X-Frame-Options, X-Content-Type-Options in frontend.

**Fix:** Add security headers via `next.config.js` `headers()` function.

---

### H-11: No Data Retention Policy
**Severity:** HIGH
**Impact:** Health records accumulate indefinitely with no automated cleanup

No expiry or retention period on stored submissions. Audit logs never expire.

**Fix:** Implement data retention policy (7 years for health records per Australian guidelines, then auto-purge).

---

### H-12: ACR Admin Access Enabled
**Severity:** HIGH
**File:** `infra/setup-azure.sh:58`

```bash
az acr create --admin-enabled true
```

Admin access on Azure Container Registry should be disabled in favor of RBAC/managed identity.

**Fix:** Use `--admin-enabled false` and configure managed identity for image pulls.

---

## PART 3: MEDIUM SEVERITY FINDINGS

### M-01: Token Expiry Mismatch (Cookie vs JWT)
**File:** `backend/app/routers/auth.py:41-49`
Cookie `max_age` is 8 hours but JWT `exp` is 30 minutes.

### M-02: Weak Password Policy (12 chars, no complexity)
**File:** `backend/app/schemas/user.py:14`
Healthcare systems should require 16+ chars with complexity per NIST guidelines.

### M-03: Rate Limiting Bypassable via X-Forwarded-For
**File:** `backend/app/middleware/security.py:48`
IP-based rate limiting can be spoofed behind proxy. In-memory, not distributed.

### M-04: PII Masking Incomplete in Logging
**File:** `backend/app/utils/pii_masker.py:43-58`
Only masks top-level fields; nested PII in error messages not caught.

### M-05: Insecure Cookie in Vendor Environment
**File:** `backend/app/routers/auth.py:45-46`
`secure=False` when `APP_ENV == "vendor"`, allowing HTTP transmission of session tokens.

### M-06: No MIME Type Validation on File Upload (Frontend)
**File:** `frontend/components/FileUpload.tsx:31-47`
Only extension-based validation; no magic byte checking.

### M-07: PII Displayed Unmasked in Frontend
**File:** `frontend/components/submission/RecordCard.tsx:123-148`
Medicare numbers, full names shown verbatim in UI. Visible in screenshots/DevTools.

### M-08: Hardcoded localhost Fallback for API URL
**Files:** `frontend/lib/env.ts:5`, `frontend/app/(dashboard)/individuals/page.tsx:53`
Falls back to `http://localhost:8000` (no HTTPS).

### M-09: No Request Size Limits (Global)
**File:** `backend/app/main.py`
File uploads limited to 10MB but no global request body limit.

### M-10: OpenAPI/Swagger Exposed in Production
**File:** `backend/app/main.py:42-46`
`/docs` and `/openapi.json` leak full API structure.

---

## PART 4: LOW SEVERITY FINDINGS

| ID | Finding | File |
|----|---------|------|
| L-01 | No fetch timeout on frontend API calls | Multiple files |
| L-02 | Dependencies not pinned to latest security patches | `requirements.txt` |
| L-03 | Suspense missing fallback props | `frontend/app/(auth)/login/page.tsx` |
| L-04 | No structured error recovery (incident IDs) | `error_handler.py` |
| L-05 | Docker health check uses HTTP (not HTTPS) | `Dockerfile` |
| L-06 | No `pip audit` in CI pipeline | `.github/workflows/ci.yml` |

---

## PART 5: CI/CD PIPELINE AUDIT

### Pipeline Structure
- `ci.yml`: Runs on push/PR to main — backend tests (excluding integration), frontend build
- `deploy-azure.yml`: Runs on push to main — tests + Docker build + ACR push + App Service deploy

### Findings

| Finding | Severity | Detail |
|---------|----------|--------|
| No container image scanning | HIGH | No Trivy/Snyk scanning before deploy |
| Third-party actions not pinned by SHA | MEDIUM | Uses `actions/checkout@v4` (tag) not SHA |
| No dependency vulnerability scanning | MEDIUM | No `pip audit` or `npm audit` in CI |
| Integration tests skipped | LOW | `-m "not integration"` — expected but documented |
| No rollback capability | MEDIUM | No blue-green/canary deployment; manual rollback only |
| OIDC auth not configured | HIGH | GitHub Actions can't auto-deploy; manual push required |
| No branch protection evidence | MEDIUM | No required reviews, status checks, or signed commits visible |
| No SBOM generation | LOW | No software bill of materials for supply chain tracking |

---

## PART 6: AZURE INFRASTRUCTURE AUDIT

### Current Setup (from `infra/setup-azure.sh`)
- Region: Australia East (good for data sovereignty)
- PostgreSQL: Flexible Server, Standard_B1ms, Burstable tier
- Redis: Basic C0
- Storage: Standard_LRS, TLS 1.2, private access
- App Service: B1 Linux, 2 Gunicorn workers
- Key Vault: Created but secrets are placeholder values

### Findings

| Finding | Severity | Detail |
|---------|----------|--------|
| No database backup automation | HIGH | No `az postgres flexible-server backup` configured |
| Key Vault RBAC disabled | MEDIUM | `--enable-rbac-authorization false` |
| PostgreSQL firewall 0.0.0.0 | MEDIUM | AllowAzureServices is broad; use VNet integration |
| No VNet/Private Endpoints | HIGH | Services communicate over public internet |
| No WAF (Web Application Firewall) | MEDIUM | No Azure Front Door or Application Gateway |
| B1 tier lacks SLA | LOW | Basic tier has no SLA; use S1+ for production |
| No autoscaling | LOW | Fixed 2 workers; no auto-scale rules |
| Secrets stored as App Settings | MEDIUM | Should reference Key Vault, not inline |

---

## PART 7: AUSTRALIAN HEALTH DATA COMPLIANCE

### 7.1 Privacy Act 1988 — Australian Privacy Principles

| APP | Requirement | Status | Gap |
|-----|-------------|--------|-----|
| APP 1 | Privacy policy, transparent management | FAIL | No privacy policy endpoint or document |
| APP 6 | Use/disclosure limited to purpose | PARTIAL | Data collected for AIR submission but no purpose limitation enforcement |
| APP 8 | Cross-border disclosure | RISK | Azure Australia East keeps data in AU, but need DPA with Microsoft confirming no cross-border access |
| APP 11 | Security of personal information | FAIL | Missing encryption at rest, access controls, audit trails |
| APP 12 | Access to personal information | FAIL | No endpoint for individuals to access their data |
| APP 13 | Correction of personal information | FAIL | No endpoint for individuals to correct their data |

**Key APP 11 requirement (updated Dec 2024):** "Reasonable steps" now explicitly includes technical AND organisational measures — encryption at rest is expected for health information.

### 7.2 Healthcare Identifiers Act 2010

| Requirement | Status | Gap |
|-------------|--------|-----|
| Only authorized entities collect/use IHI | PARTIAL | App collects IHI for AIR submission (authorized purpose) but no access controls verify the user is authorized |
| IHI must not be disclosed except as permitted | RISK | IHI stored in plaintext, returned in API responses, exported in CSV/Excel |
| Penalties: Up to 120 penalty units or 2 years imprisonment | — | Non-compliance is a criminal offence |

### 7.3 My Health Records Act 2012

| Requirement | Status | Gap |
|-------------|--------|-----|
| Mandatory data breach notification | FAIL | No breach detection or notification system |
| Report to OAIC + System Operator "as soon as practicable" | FAIL | No incident response process |
| Audit trail of access to health records | FAIL | No comprehensive audit logging |
| Penalties: Up to 100 penalty units per breach | — | — |

### 7.4 Notifiable Data Breaches Scheme (Privacy Act Part IIIC)

| Requirement | Status | Gap |
|-------------|--------|-----|
| Assess suspected breaches within 30 days | FAIL | No breach assessment process |
| Notify OAIC + affected individuals for eligible breaches | FAIL | No notification mechanism |
| Health information = "sensitive information" = lower threshold | — | Any unauthorized access is likely "eligible" |

### 7.5 ADHA Conformance Requirements

| Requirement | Status | Notes |
|-------------|--------|-------|
| Software Vendor Registration | UNKNOWN | Must register with ADHA Developer Program |
| Conformance Testing (4-8 weeks) | UNKNOWN | Required before production deployment |
| TLS 1.2+ (enforced Feb 2026) | PASS | All API calls use HTTPS with TLS 1.2+ |
| PRODA B2B authentication | PASS | Correctly implemented per B2B Guide v4.2 |
| AIR API v1.4 compliance | PASS | Correct API paths and payload formats |

### 7.6 TGA — Software as Medical Device (SaMD)

**Assessment:** This software is likely **EXCLUDED** from TGA regulation because:
- It functions as an administrative/data transfer tool (not clinical decision support)
- It does not provide diagnosis, treatment, or monitoring
- It transfers data to/from AIR (electronic health record function)

However, if any clinical decision-making features are added (e.g., "patient is overdue for vaccination"), it may need TGA classification.

### 7.7 ACSC Essential Eight

| Strategy | Status | Gap |
|----------|--------|-----|
| Application Control | N/A | Web application (not desktop) |
| Patch Applications | PARTIAL | Dependencies pinned but no automated vulnerability scanning |
| Configure Office Macros | PARTIAL | Excel uploads accepted but macros not explicitly blocked |
| User Application Hardening | PARTIAL | CSP headers on backend, missing on frontend |
| Restrict Admin Privileges | FAIL | RBAC exists but not enforced; all users have equal access |
| Patch Operating Systems | PARTIAL | Docker base images need regular rebuilds |
| Multi-Factor Authentication | FAIL | No MFA implemented |
| Regular Backups | FAIL | No automated database backup strategy |

---

## PART 8: POSITIVE FINDINGS

The following areas are well-implemented:

- Argon2id password hashing (time_cost=3, memory_cost=65536)
- Structured logging with structlog (JSON output)
- Backend security headers (CSP, X-Frame-Options, X-Content-Type-Options, Cache-Control: no-store)
- Account lockout after 5 failed attempts (30-minute lockout)
- httpOnly cookies for session tokens
- PRODA tokens in-memory only, never persisted
- PRODA token reuse with TTL (per B2B Best Practice Guide)
- File uploads: in-memory only, not persisted to disk
- File type and size validation (10MB limit, .xlsx/.xls only)
- CORS properly scoped to specific frontend URL
- PII not logged in structlog output
- Pydantic input validation on all request schemas
- Azure region: Australia East (data sovereignty)
- TLS 1.2+ for all external API calls
- Async database with SQLAlchemy (non-blocking)

---

## PART 9: REMEDIATION PRIORITY

### Immediate (Before Production)

1. **Add authentication to ALL data endpoints** — C-01
2. **Add authorization/ownership checks** — C-02
3. **Replace in-memory PII storage with Redis + TTL** — C-03
4. **Remove default APP_SECRET_KEY** — C-04
5. **Remove default PRODA_JKS_PASSWORD** — C-05
6. **Remove PII from browser localStorage/sessionStorage** — C-06
7. **Enable database encryption** — C-07

### Week 1-2

8. Fix information disclosure in error responses — H-01
9. Add CSRF protection — H-02
10. Enforce RBAC on endpoints — H-03
11. Mask PII in API responses and exports — H-04
12. Add comprehensive audit logging — H-08
13. Enforce multi-tenancy filtering — H-09
14. Add CSP headers to frontend — H-10
15. Fix submission file permissions — H-07

### Week 3-4

16. Implement data deletion endpoints — H-05
17. Add data retention policy — H-11
18. Add container image scanning to CI — CI finding
19. Configure VNet/Private Endpoints for Azure — Infra finding
20. Implement database backup automation — Infra finding
21. Add MFA — Essential Eight
22. Implement breach notification process — Compliance

### Backlog

23. Implement privacy policy endpoint — APP 1
24. Add individual data access endpoint — APP 12
25. Add individual data correction endpoint — APP 13
26. Complete ADHA conformance testing registration
27. Add SBOM generation to CI
28. Pin GitHub Actions by SHA
29. Add blue-green deployment capability

---

## PART 10: COMPLIANCE CHECKLIST FOR PRODUCTION

Before going to production, the following must be completed:

- [ ] All CRITICAL findings resolved
- [ ] All HIGH findings resolved or accepted with risk mitigation
- [ ] Privacy Impact Assessment (PIA) completed
- [ ] Data Processing Agreement with Microsoft Azure
- [ ] Privacy policy published
- [ ] Data breach response plan documented
- [ ] OAIC notification process established
- [ ] ADHA Software Vendor Registration submitted
- [ ] Conformance testing with ADHA completed (4-8 weeks)
- [ ] Penetration test by independent security firm
- [ ] Security audit by qualified IRAP assessor (recommended)
- [ ] MFA enabled for all users
- [ ] Database encryption at rest enabled
- [ ] Automated backups configured and tested
- [ ] Audit logging covering all PII access
- [ ] Data retention policy implemented and documented

---

*Report generated by automated code analysis. Findings should be verified by a qualified security professional before production deployment. Legal compliance assessments should be confirmed with a privacy lawyer experienced in Australian health data legislation.*
