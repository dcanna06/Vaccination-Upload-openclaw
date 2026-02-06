# AIR Bulk Vaccination Records Upload System

## Project Identity

- **Name**: AIR Bulk Vaccination Upload System
- **Purpose**: Web application enabling non-technical pharmacy staff to upload Excel files containing vaccination records, validate against AIR business rules, and submit to the Australian Immunisation Register (AIR) via Services Australia REST Web Services.
- **Regulatory Context**: Governed by Privacy Act 1988, Australian Privacy Principles, My Health Records Act 2012, Australian Immunisation Register Act 2015, Healthcare Identifiers Act 2010.
- **Certification**: Requires NOI (Notice of Integration) certification from Services Australia before production access.

---

## Tech Stack

| Layer                | Technology                          | Notes                                              |
| -------------------- | ----------------------------------- | -------------------------------------------------- |
| Frontend             | Next.js 14 (App Router), React 18+ | TypeScript strict mode                             |
| Styling              | TailwindCSS                         | Dark theme, slate/emerald palette                  |
| State Management     | Zustand + React Query               | Zustand for local, React Query for server state    |
| Form Handling        | React Hook Form + Zod              | Zod schemas mirror AIR field validations           |
| Excel Parsing        | SheetJS (xlsx)                      | Client-side parse, server-side validation          |
| Backend              | Python 3.12+ / FastAPI              | Async, type-hinted, Pydantic models                |
| Database             | PostgreSQL 16 (Flexible Server)     | Via SQLAlchemy 2.0 + Alembic migrations            |
| Cache / Sessions     | Redis (Premium P1)                  | TLS-only, zone-redundant                           |
| Queue / Background   | Azure Container Apps                | Batch submission workers, token refresh             |
| Auth (App Users)     | JWT (HS256) + HttpOnly cookies      | 8hr session, 30min inactivity timeout              |
| Auth (AIR API)       | PRODA B2B OAuth 2.0 JWT (RS256)     | 60min token, auto-refresh before expiry            |
| Password Hashing     | Argon2id                            | Not bcrypt                                         |
| Infrastructure       | Azure (Australia East primary)      | DR in Australia Southeast (Melbourne)              |
| IaC                  | Terraform                           | Environment parity: dev, staging, prod             |
| CI/CD                | Azure DevOps / GitHub Actions       | Blue-green deploys, approval gates for prod        |
| Secret Management    | Azure Key Vault (Premium, HSM)      | All creds, JKS keystores, API keys stored here     |

---

## Folder Structure

```
air-vaccination-system/
├── claude.md                          # THIS FILE — project instructions
├── frontend/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── upload/page.tsx        # Excel upload & client-side parse
│   │   │   ├── validate/page.tsx      # Validation preview, error display
│   │   │   ├── submit/page.tsx        # Submission progress monitor
│   │   │   ├── history/page.tsx       # Submission history & reports
│   │   │   ├── settings/page.tsx      # Org config, PRODA creds
│   │   │   ├── users/page.tsx         # User management (admin)
│   │   │   └── layout.tsx
│   │   ├── api/                       # Next.js API routes (BFF proxy)
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── upload/route.ts
│   │   │   ├── validate/route.ts
│   │   │   ├── submit/route.ts
│   │   │   └── history/route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx                   # Landing / redirect
│   ├── components/
│   │   ├── ui/                        # Reusable primitives (button, input, table, modal)
│   │   ├── FileUpload.tsx
│   │   ├── ValidationResults.tsx
│   │   ├── WarningReview.tsx          # AIR-W-1004 / AIR-W-1008 handling
│   │   ├── SubmissionProgress.tsx
│   │   ├── SubmissionHistory.tsx
│   │   └── ExcelTemplateDownload.tsx
│   ├── lib/
│   │   ├── validation/
│   │   │   ├── index.ts               # Orchestrator
│   │   │   ├── medicare.ts            # Medicare check digit algorithm
│   │   │   ├── provider.ts            # Provider number validation (Medicare + AIR formats)
│   │   │   ├── business-rules.ts      # AIR field validations (dates, names, codes)
│   │   │   └── cross-record.ts        # Duplicate detection, encounter grouping
│   │   ├── excel/
│   │   │   ├── parser.ts              # SheetJS parse, column mapping
│   │   │   └── template.ts            # Template generation / download
│   │   └── utils/
│   │       └── index.ts
│   ├── types/
│   │   ├── air.ts                     # AIR API request/response types
│   │   ├── validation.ts              # Validation result types
│   │   └── submission.ts              # Batch/submission tracking types
│   ├── stores/
│   │   ├── uploadStore.ts             # Zustand: file state, parsed rows
│   │   └── submissionStore.ts         # Zustand: batch progress
│   ├── public/
│   │   └── templates/
│   │       └── vaccination_template.xlsx
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   └── next.config.js
│
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI app factory
│   │   ├── config.py                  # Pydantic Settings (env-driven)
│   │   ├── dependencies.py            # DI: db sessions, auth, PRODA client
│   │   ├── routers/
│   │   │   ├── auth.py                # Login, logout, session management
│   │   │   ├── upload.py              # File upload endpoint
│   │   │   ├── validate.py            # Server-side validation
│   │   │   ├── submit.py              # Batch submission orchestration
│   │   │   ├── history.py             # Submission history queries
│   │   │   ├── users.py               # User CRUD (admin)
│   │   │   ├── organisations.py       # Org management
│   │   │   └── reference_data.py      # AIR reference data proxy/cache
│   │   ├── models/
│   │   │   ├── user.py                # SQLAlchemy: users, roles
│   │   │   ├── organisation.py        # SQLAlchemy: orgs, PRODA config
│   │   │   ├── submission.py          # SQLAlchemy: batches, records, results
│   │   │   └── audit.py               # SQLAlchemy: audit_log
│   │   ├── schemas/
│   │   │   ├── air_request.py         # Pydantic: AddEncounterRequestType
│   │   │   ├── air_response.py        # Pydantic: AddEncounterResponseType
│   │   │   ├── validation.py          # Pydantic: validation results
│   │   │   └── user.py                # Pydantic: user CRUD DTOs
│   │   ├── services/
│   │   │   ├── proda_auth.py          # PRODA B2B token acquisition & refresh
│   │   │   ├── air_client.py          # HTTP client for AIR API (record, confirm)
│   │   │   ├── validation_engine.py   # Server-side AIR business rule validation
│   │   │   ├── batch_processor.py     # Batch orchestration, retry logic
│   │   │   ├── excel_parser.py        # Server-side Excel validation
│   │   │   └── reference_data.py      # AIR reference data fetch & cache
│   │   ├── middleware/
│   │   │   ├── auth.py                # JWT verification, role-based access
│   │   │   ├── rate_limit.py          # 100 req/min user, 1000/min org
│   │   │   └── audit.py               # Audit logging middleware
│   │   └── utils/
│   │       ├── medicare_validator.py   # Medicare check digit algorithm
│   │       ├── provider_validator.py   # Provider number check digit
│   │       └── uuid_helpers.py         # urn:uuid: generation for dhs-* headers
│   ├── alembic/                       # Database migrations
│   │   ├── versions/
│   │   └── env.py
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── conftest.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── alembic.ini
│
├── infrastructure/
│   ├── terraform/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   ├── modules/
│   │   │   ├── app_service/
│   │   │   ├── database/
│   │   │   ├── keyvault/
│   │   │   ├── networking/
│   │   │   └── monitoring/
│   │   └── environments/
│   │       ├── dev.tfvars
│   │       ├── staging.tfvars
│   │       └── prod.tfvars
│   └── docker-compose.yml             # Local dev environment
│
├── docs/
│   ├── AIR_Technical_Specification_v1_2.docx
│   ├── api-reference.md
│   └── deployment-runbook.md
│
└── .env.example
```

---

## Environment Configuration

### Environment Variables

```env
# === Application ===
APP_ENV=vendor                         # vendor | production
APP_SECRET_KEY=                        # For JWT signing (HS256)
APP_CORS_ORIGINS=http://localhost:3000

# === Database ===
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/air_vaccination
REDIS_URL=redis://localhost:6379/0

# === PRODA B2B Authentication ===
PRODA_TOKEN_ENDPOINT=https://proda.humanservices.gov.au/piaweb/api/b2b/v1/token
PRODA_MINOR_ID=                        # e.g., MMS00001
PRODA_DEVICE_NAME=                     # Device name registered with PRODA
PRODA_ORG_ID=                          # PRODA Organisation ID (RA number)
PRODA_JKS_BASE64=                      # Base64-encoded JKS keystore file
PRODA_JKS_PASSWORD=                    # JKS keystore password
PRODA_KEY_ALIAS=                       # Private key alias within JKS
PRODA_AUDIENCE=https://medicareaustralia.gov.au/MCOL

# === AIR API ===
AIR_API_BASE_URL_VENDOR=               # Provided by Developer Portal after registration
AIR_API_BASE_URL_PROD=                 # Provided after NOI certification
AIR_CLIENT_ID=                         # X-IBM-Client-Id from Developer Portal
AIR_PRODUCT_ID=AIRBulkVax 1.0         # dhs-productId value (SoftwareName Version)
AIR_PROVIDER_NUMBER=                   # Default information provider number

# === Azure Key Vault (Production) ===
AZURE_KEY_VAULT_URL=
```

### API Endpoints by Environment

| Environment     | Purpose                            |
| --------------- | ---------------------------------- |
| `vendor`        | Development & NOI certification    |
| `production`    | Live submissions (post-NOI only)   |

**CRITICAL**: Never point `vendor` credentials at production, or vice versa. Environment switching requires full credential rotation.

---

## AIR API Integration Rules

### Source of Truth Documents

All implementation MUST conform to these Services Australia specifications:

| Document                          | Reference         | Governs                                    |
| --------------------------------- | ----------------- | ------------------------------------------ |
| AIR Common Rules V3.0.9           | TECH.SIS.AIR.01   | HTTP headers, general errors, date formats |
| AIR Record Encounter V6.0.7       | TECH.SIS.AIR.02   | Record/confirm encounter payloads          |
| AIR API Authorisation V1.0.3      | TECH.SIS.AIR.04   | Provider access validation                 |
| AIR API Individual Details V4.0.5 | TECH.SIS.AIR.05   | Individual lookup                          |
| AIR Reference Data V1.0.6         | TECH.SIS.AIR.07   | Vaccine codes, routes, countries           |
| AIR Developers Guide V3.0.8       | —                 | Developer portal, NOI process              |
| Correct Use of Minor ID V1.1      | —                 | Minor ID assignment rules                  |
| AIR Messages Code List V1.1.6     | —                 | All AIR error/warning/info codes           |

### Required HTTP Headers

Every AIR API request MUST include ALL of these headers. Missing any header returns 401 or 400.

```python
headers = {
    "Authorization": f"Bearer {proda_access_token}",
    "X-IBM-Client-Id": config.AIR_CLIENT_ID,
    "Content-Type": "application/json",
    "Accept": "application/json",
    "dhs-messageId": f"urn:uuid:{uuid4()}",           # Unique per request
    "dhs-correlationId": f"urn:uuid:{correlation_id}", # Unique per session/batch
    "dhs-auditId": config.PRODA_MINOR_ID,              # Minor ID
    "dhs-auditIdType": "Minor Id",                     # Literal string
    "dhs-subjectId": dob_ddmmyyyy,                     # Individual's DOB as ddMMyyyy
    "dhs-subjectIdType": "Date of Birth",              # Literal string
    "dhs-productId": config.AIR_PRODUCT_ID,            # e.g., "AIRBulkVax 1.0"
}
```

**Header format rules:**
- `dhs-messageId`: MUST be `urn:uuid:` prefix + valid UUID v4
- `dhs-correlationId`: MUST be `urn:uuid:` prefix + unique transaction ID (same format)
- `dhs-subjectId`: DOB in `ddMMyyyy` format (e.g., `18102005` for 18 Oct 2005)
- `dhs-auditId`: The Minor ID value assigned to the healthcare location
- `dhs-productId`: Software name + space + version (e.g., `AIRBulkVax 1.0`)

### Record Encounter Request Structure

```
POST /air/immunisation/v1.4/encounters/record
```

**Limits:**
- Maximum **10 encounters** per request (`AIR-E-1013` if exceeded)
- Maximum **5 episodes** per encounter
- Episode IDs must start at 1 and increment sequentially (`AIR-E-1014`)
- Encounter IDs must start at 1 and increment sequentially

**Request shape** (`AddEncounterRequestType`):

```json
{
  "individual": {
    "personalDetails": {
      "dateOfBirth": "1990-01-15",       // yyyy-MM-dd
      "gender": "F",                      // M, F, I, U
      "firstName": "Jane",               // String(40), conditional
      "lastName": "Smith"                 // String(40), conditional
    },
    "medicareCard": {
      "medicareCardNumber": "2123456789", // 10 digits, check digit validated
      "medicareIRN": "1"                  // 1-9, required if medicare provided
    },
    "ihiNumber": "8003608833357361",      // 16 numeric chars, NO Luhn validation
    "address": {
      "postCode": "2000"                  // 4 digits, valid AU postcode
    }
  },
  "encounters": [
    {
      "id": "1",
      "dateOfService": "2026-02-01",      // yyyy-MM-dd, after DOB, not future
      "episodes": [
        {
          "id": "1",
          "vaccineCode": "COMIRN",        // Valid code from Reference Data API
          "vaccineDose": "1",             // 1-20
          "vaccineBatch": "FL1234",       // Mandatory for COVID/Flu/YellowFever
          "vaccineType": "NIP",           // NIP, AEN, OTH
          "routeOfAdministration": "IM"   // IM, SC, ID, OR, IN, NAS
        }
      ],
      "immunisationProvider": {
        "providerNumber": "1234567A"
      },
      "administeredOverseas": false,
      "countryCode": null,                // Required if administeredOverseas=true
      "antenatalIndicator": false
    }
  ],
  "informationProvider": {
    "providerNumber": "1234567A"          // Must exist and be current in AIR
  }
}
```

### Minimum Identification Requirements

AIR searches for individuals using one of these combinations (in order of priority):

1. **Medicare**: `medicareCardNumber` + `medicareIRN` + `dateOfBirth` + `gender`
2. **IHI**: `ihiNumber` + `dateOfBirth` + `gender`
3. **Demographics**: `firstName` + `lastName` + `dateOfBirth` + `gender` + `postCode`

If none match, AIR returns `AIR-W-1004` (Individual Not Found).

### Response Handling

**Status codes** and required application behaviour:

| Code         | Type    | Meaning                                    | Required Action                                                                                   |
| ------------ | ------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `AIR-I-1007` | Info    | All encounters successfully recorded       | Mark batch as SUCCESS. No further action.                                                         |
| `AIR-I-1000` | Info    | Individual encounter recorded              | Mark individual encounter as SUCCESS.                                                             |
| `AIR-W-1004` | Warning | Individual not found on AIR                | Prompt user to verify details. If confirmed, resubmit with `acceptAndConfirm: true` + `claimId`.  |
| `AIR-W-1008` | Warning | Some encounters not recorded               | Parse per-encounter results. Show warnings. Allow selective confirm.                              |
| `AIR-W-1001` | Warning | Encounter NOT successfully recorded        | Display warning, allow user to confirm or correct.                                                |
| `AIR-E-1005` | Error   | Validation errors in request               | Display errors to user for correction. Do NOT auto-retry.                                         |
| `AIR-E-1006` | Error   | System error                               | Log error identifier. Retry with exponential backoff (max 3 retries).                             |
| `AIR-E-1046` | Error   | Encounters not confirmable                 | Display errors. Remove invalid encounters and resubmit valid ones.                                |

**CRITICAL RULE**: Per TECH.SIS.AIR.02 Section 5.2.2:
> Error messages MUST be displayed to the end user exactly as supplied by Services Australia — not truncated, transformed, or changed in any way.

Store the raw `message` string from AIR responses and display it verbatim in the UI.

### Confirm Encounter Flow

When `AIR-W-1004` (individual not found) or `AIR-W-1008` (pended episodes) is returned:

1. Extract `claimId` and `claimSequenceNumber` from the response `claimDetails`
2. Present the warning to the user with the verbatim AIR message
3. User reviews and clicks "Confirm" or "Correct & Resubmit"
4. If confirming, build a confirm request:

```json
{
  "individual": { /* same as original */ },
  "encounters": [
    {
      "id": "1",
      "acceptAndConfirm": true
      // Include same encounter data
    }
  ],
  "informationProvider": { /* same as original */ },
  "claimId": "WC297@+5",
  "claimSequenceNumber": "1"
}
```

5. Submit to the same endpoint. Already-successful encounters MUST be removed from the retry payload.

### Reference Data API

Cache reference data locally (refresh daily). Endpoints:

```
GET /air/immunisation/v1/refdata/vaccine                              # All vaccines
GET /air/immunisation/v1/refdata/vaccine?vaccineCategoryCode=NIP      # NIP vaccines
GET /air/immunisation/v1/refdata/vaccine?vaccineCategoryCode=COV19    # COVID-19
GET /air/immunisation/v1/refdata/vaccine?vaccineCategoryCode=FLU      # Influenza
GET /air/immunisation/v1/refdata/antigen                              # Antigens
GET /air/immunisation/v1/refdata/routeOfAdministration                # Routes
GET /air/immunisation/v1/refdata/vaccine/mandatory/vaccineBatch       # Vaccines requiring batch
GET /air/immunisation/v1/refdata/country                              # Country codes
```

Use cached reference data to validate `vaccineCode`, `routeOfAdministration`, and `countryCode` BEFORE submitting to AIR.

---

## PRODA B2B Authentication

### Token Acquisition Flow

```
1. Load private key from JKS keystore (stored in Key Vault)
2. Build JWT assertion:
   - iss: {PRODA_MINOR_ID}
   - sub: {PRODA_DEVICE_NAME}
   - aud: {PRODA_AUDIENCE}  (https://medicareaustralia.gov.au/MCOL)
   - exp: now + 5 minutes
   - iat: now
   - jti: unique UUID
   - Sign with RS256 using JKS private key
3. POST to PRODA_TOKEN_ENDPOINT:
   - grant_type: urn:ietf:params:oauth:grant-type:jwt-bearer
   - assertion: {signed_jwt}
4. Response: { access_token, token_type: "Bearer", expires_in: 3600 }
5. Cache token in memory. Refresh at 50-minute mark (before 60-min expiry).
```

**CRITICAL**: PRODA tokens MUST be held in-memory only. Never persist to database or disk.

### JKS Keystore Handling

- Store JKS file as Base64-encoded secret in Azure Key Vault
- At runtime: retrieve from Key Vault → decode Base64 → load with `pyjks` or equivalent
- Never write the decoded JKS to the filesystem in production
- For local dev: mount from `.env` file as `PRODA_JKS_BASE64`

---

## Validation Rules

### Medicare Card Number Check Digit (Appendix A, TECH.SIS.AIR.01)

```
weighted_sum = (d1 * 1) + (d2 * 3) + (d3 * 7) + (d4 * 9) + (d5 * 1) + (d6 * 3) + (d7 * 7) + (d8 * 9)
check_digit = weighted_sum % 10
// check_digit must equal digit 9
// digit 10 (issue number) must not be 0
```

Implement in both `frontend/lib/validation/medicare.ts` and `backend/app/utils/medicare_validator.py`.

### Provider Number Validation

**Medicare Provider Number** (8 chars): 6-digit stem + practice location char + check digit

```
Practice Location Characters and their values:
0=0, 1=1, 2=2, ..., 9=9, A=10, B=11, C=12, D=13, E=14, F=15,
G=16, H=17, J=18, K=19, L=20, M=21, N=22, P=23, Q=24, R=25,
T=26, U=27, V=28, W=29, X=30, Y=31
(Note: I, O, S, Z are NOT valid practice location characters)

Provider Check Digit Algorithm:
weighted = (d1*3) + (d2*5) + (d3*8) + (d4*4) + (d5*2) + (d6*1) + (PLV*6)
check_digit_index = weighted % 11
Lookup: 0=Y, 1=X, 2=W, 3=V, 4=T, 5=R, 6=Q, 7=P, 8=N, 9=M, 10=L
```

**AIR Provider Number** (8 chars): state code (alpha) + 5 digits + check digit (alpha) + blank

```
State codes: V(VIC), N(NSW), Q(QLD), W(WA), S(SA), T(TAS), A(ACT), X(NT)
Algorithm: (d1*3) + (d2*5) + (d3*8) + (d4*4) + (d5*2) + (d6*1)
// d1 is state code converted to numeric value
check_digit_index = weighted % 11
```

### IHI Number Validation

- Format: exactly 16 numeric characters
- **AIR does NOT perform Luhn check digit validation on IHI numbers** (per TECH.SIS.AIR.02)
- Validate format only (16 digits). Do not implement Luhn check for IHI.

### Name Validation

- `firstName` and `lastName`: max 40 characters
- Allowed characters: alpha, numeric, apostrophe (`'`), space, hyphen (`-`)
- No spaces immediately before or after apostrophes or hyphens
- Must contain at least one alpha character

### Date Validation

- API format: `yyyy-MM-dd`
- `dhs-subjectId` header format: `ddMMyyyy`
- `dateOfBirth`: must not be in the future (`AIR-E-1018`), must not be >130 years ago (`AIR-E-1019`)
- `dateOfService`: must be after `dateOfBirth` (`AIR-E-1015`), must not be in the future (`AIR-E-1018`)

### Gender Values

- `M` = Male, `F` = Female, `I` = Intersex/Indeterminate, `U` = Unknown
- **In Excel template**: accept M/F/I/U or Male/Female/Intersex/Unknown and map accordingly

### Vaccine Batch Mandatory Rule

- Fetch `/air/immunisation/v1/refdata/vaccine/mandatory/vaccineBatch` on startup
- If the `vaccineCode` appears in this list, `vaccineBatch` is **mandatory**
- Currently includes: all COVID-19 vaccines, Influenza, Yellow Fever

---

## Excel Template Specification

### Column Mapping

The Excel template MUST have these columns in this exact order:

| Col | Header                     | Maps To                                 | Required | Format              |
| --- | -------------------------- | --------------------------------------- | -------- | ------------------- |
| A   | Medicare Card Number       | individual.medicareCard.medicareCardNumber | Cond   | 10 digits           |
| B   | Medicare IRN               | individual.medicareCard.medicareIRN     | Cond     | Single digit 1-9    |
| C   | IHI Number                 | individual.ihiNumber                    | No       | 16 digits           |
| D   | First Name                 | individual.personalDetails.firstName    | Cond     | Text, max 40        |
| E   | Last Name                  | individual.personalDetails.lastName     | Cond     | Text, max 40        |
| F   | Date of Birth              | individual.personalDetails.dateOfBirth  | Yes      | DD/MM/YYYY          |
| G   | Gender                     | individual.personalDetails.gender       | Yes      | M/F/I/U             |
| H   | Postcode                   | individual.address.postCode             | Cond     | 4 digits            |
| I   | Date of Service            | encounters[].dateOfService              | Yes      | DD/MM/YYYY          |
| J   | Vaccine Code               | episodes[].vaccineCode                  | Yes      | 1-6 chars           |
| K   | Vaccine Dose               | episodes[].vaccineDose                  | Yes      | 1-20                |
| L   | Vaccine Batch              | episodes[].vaccineBatch                 | Cond     | 1-15 chars          |
| M   | Vaccine Type               | episodes[].vaccineType                  | Cond     | NIP/AEN/OTH         |
| N   | Route of Administration    | episodes[].routeOfAdministration        | Cond     | IM/SC/ID/OR/IN/NAS  |
| O   | Administered Overseas      | encounters[].administeredOverseas       | No       | TRUE/FALSE          |
| P   | Country Code               | encounters[].countryCode                | Cond     | 3-char ISO 3166-1   |
| Q   | Immunising Provider Number | encounters[].immunisationProvider.providerNumber | Yes | 6-8 chars     |
| R   | School ID                  | encounters[].schoolId                   | No       | Valid format         |
| S   | Antenatal Indicator        | encounters[].antenatalIndicator         | No       | TRUE/FALSE          |

### Excel-to-API Grouping Logic

Multiple Excel rows for the same individual (same Medicare/IHI + DOB) with the same date of service MUST be grouped into a single encounter with multiple episodes. Algorithm:

```
1. Parse all rows from Excel
2. Group by individual identity (Medicare+IRN or IHI or Name+DOB+Gender+Postcode)
3. Within each individual group, sub-group by dateOfService → each becomes an encounter
4. Within each encounter, each vaccine row becomes an episode (max 5 per encounter)
5. Chunk into API requests of max 10 encounters each
6. Submit sequentially (not parallel, to respect rate limits)
```

---

## User Roles and Permissions (RBAC)

| Role         | Upload | Submit | View Own | View All Org | Review/Approve | Manage Users | Manage Org | PRODA Config | Audit Logs | System Config |
| ------------ | ------ | ------ | -------- | ------------ | -------------- | ------------ | ---------- | ------------ | ---------- | ------------- |
| Super Admin  | ✓      | ✓      | ✓        | ✓            | ✓              | ✓            | ✓          | ✓            | ✓          | ✓             |
| Org Admin    | ✓      | ✓      | ✓        | ✓            | ✓              | ✓            | —          | ✓            | ✓          | —             |
| Provider     | ✓      | ✓      | ✓        | —            | —              | —            | —          | —            | —          | —             |
| Reviewer     | —      | —      | ✓        | ✓            | ✓              | —            | —          | —            | —          | —             |
| Read Only    | —      | —      | ✓        | ✓            | —              | —            | —          | —            | —          | —             |

---

## Database Schema (Key Tables)

```sql
-- Organisations
CREATE TABLE organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  abn VARCHAR(11),
  proda_org_id VARCHAR(50),
  minor_id VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active',  -- active, suspended, inactive
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,   -- Argon2id
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  role VARCHAR(20) NOT NULL,             -- super_admin, org_admin, provider, reviewer, read_only
  status VARCHAR(20) DEFAULT 'pending',  -- pending, active, locked, inactive
  mfa_enabled BOOLEAN DEFAULT FALSE,
  last_login TIMESTAMPTZ,
  failed_login_attempts INT DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Submission Batches
CREATE TABLE submission_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id),
  user_id UUID REFERENCES users(id),
  file_name VARCHAR(255),
  total_records INT,
  successful INT DEFAULT 0,
  failed INT DEFAULT 0,
  warnings INT DEFAULT 0,
  pending_confirmation INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft',    -- draft, validating, validated, submitting, completed, failed
  environment VARCHAR(20),               -- vendor, production
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Individual Submission Records
CREATE TABLE submission_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES submission_batches(id),
  row_number INT,                        -- Original Excel row number
  request_payload JSONB,                 -- Sanitized request sent to AIR
  response_payload JSONB,                -- Raw AIR response (stored verbatim)
  air_status_code VARCHAR(20),           -- AIR-I-1007, AIR-W-1004, etc.
  air_message TEXT,                      -- Verbatim AIR message
  claim_id VARCHAR(50),                  -- From AIR response (for confirms)
  claim_sequence_number VARCHAR(10),
  status VARCHAR(20) DEFAULT 'pending',  -- pending, success, warning, error, confirmed
  confirmation_status VARCHAR(20),       -- null, pending_confirm, confirmed, rejected
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  details JSONB,                         -- PII masked in this field
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Error Handling Patterns

### Client-Side (Frontend) Validation Errors

Catch these BEFORE submitting to the backend:

- Missing required fields (red highlight on cell)
- Invalid Medicare check digit
- Invalid date formats or future dates
- Gender not in M/F/I/U
- Vaccine code not in cached reference data
- Dose number out of range (1-20)
- Batch missing for vaccines that require it

### Server-Side Validation Errors

Backend re-validates everything (never trust client). Additional checks:

- Provider number check digit
- Cross-record duplicate detection
- Encounter/episode limit enforcement
- Reference data currency (check against latest cached data)

### AIR API Error Handling

```python
# Retry strategy for AIR-E-1006 (system error)
MAX_RETRIES = 3
BACKOFF_BASE = 2  # seconds

async def submit_with_retry(payload, attempt=0):
    try:
        response = await air_client.record_encounter(payload)
        if response.status_code == "AIR-E-1006" and attempt < MAX_RETRIES:
            await asyncio.sleep(BACKOFF_BASE ** attempt)
            return await submit_with_retry(payload, attempt + 1)
        return response
    except httpx.TimeoutException:
        if attempt < MAX_RETRIES:
            await asyncio.sleep(BACKOFF_BASE ** attempt)
            return await submit_with_retry(payload, attempt + 1)
        raise
```

### HTTP-Level Errors

| HTTP Status                  | Cause                          | Action                                |
| ---------------------------- | ------------------------------ | ------------------------------------- |
| 401 Unauthorized             | Missing/invalid auth or client ID | Refresh PRODA token and retry once |
| 406 Not Acceptable           | Bad Accept header              | Fix header (must be application/json) |
| 415 Unsupported Media Type   | Missing Content-Type           | Fix header                            |
| 500 Internal Server Error    | AIR service unavailable        | Retry with backoff                    |

---

## Coding Standards

### TypeScript (Frontend)

- Strict mode enabled (`"strict": true` in tsconfig)
- Use `interface` for object shapes, `type` for unions/intersections
- All AIR-related types in `types/air.ts` — mirror the TECH.SIS data structure names
- No `any` — use `unknown` and narrow with type guards
- Prefer named exports over default exports
- Component files: PascalCase (e.g., `FileUpload.tsx`)
- Utility files: camelCase (e.g., `medicareValidator.ts`)

### Python (Backend)

- Python 3.12+ with type hints on ALL functions
- Pydantic v2 models for all request/response schemas
- SQLAlchemy 2.0 async style
- Use `httpx` (async) for AIR API calls, not `requests`
- All service functions are `async`
- Exception classes in `app/exceptions.py`
- Logging via `structlog` (structured JSON logs)
- No PII/PHI in logs — use masked versions

### Naming Conventions

- Database columns: `snake_case`
- Python variables/functions: `snake_case`
- Python classes: `PascalCase`
- TypeScript variables/functions: `camelCase`
- TypeScript types/interfaces: `PascalCase`
- API routes: `kebab-case` (e.g., `/api/submission-batches`)
- Environment variables: `SCREAMING_SNAKE_CASE`

### Git Conventions

- Branch naming: `feature/TICKET-NNN-short-description`
- Commit messages: `type(scope): description` (conventional commits)
  - `feat(air-client): implement record encounter submission`
  - `fix(validation): correct medicare check digit for 10-digit numbers`
  - `test(proda): add token refresh integration tests`
- PR requires 2 approvals for production branches
- All PRs must pass: lint, type-check, unit tests, integration tests

---

## Testing Strategy

### Unit Tests

- Frontend: Vitest + React Testing Library
- Backend: pytest + pytest-asyncio
- **Critical validation functions** (Medicare check digit, provider validation, date rules) must have 100% branch coverage
- Mock AIR API responses for all status codes

### Integration Tests (Vendor Environment)

- Test against Services Australia Vendor endpoint with provided test data
- Test data provided by Developer Liaison team — DO NOT use real patient data
- Cover all 5 workflow use cases from TECH.SIS.AIR.02 Section 6:
  1. Standard success flow
  2. Request validation fails
  3. Individual not found (confirm flow)
  4. Encounter has pended episodes
  5. Encounters with errors (non-confirmable)

### NOI Certification Tests

- Required before production access
- Contact: `itest@servicesaustralia.gov.au`
- Must provide: Application Details Form, Preliminary Test Plan, Integration Test Plan, user manual, GUI screenshots
- All tests must use Vendor environment

---

## Security Rules

1. **All traffic TLS 1.2+** — enforce in Azure Front Door and between all services
2. **PRODA JKS never on disk** — Key Vault → memory only
3. **PRODA tokens in-memory only** — never database, never logs
4. **Passwords: Argon2id** — min 12 chars, upper+lower+number+special
5. **Account lockout**: 5 failed attempts → 30-minute lockout
6. **Session**: 30-min inactivity timeout, 8-hour max duration
7. **Rate limiting**: 100 req/min per user, 1000 req/min per org
8. **CSRF protection** on all state-changing endpoints
9. **No PII in logs** — mask Medicare numbers, names, DOBs in all log output
10. **AIR error messages displayed verbatim** — never modify Services Australia messages
11. **Multi-tenant data isolation** — all queries scoped to `organisation_id`
12. **Audit every sensitive action** — logins, submissions, user changes, config changes

---

## Key Contacts

| Team                      | Contact                                          | Purpose                          |
| ------------------------- | ------------------------------------------------ | -------------------------------- |
| Developer Liaison         | DeveloperLiaison@servicesaustralia.gov.au         | Registration, test data, prod access |
| OTS Technical Support     | 1300 550 115                                      | Technical issues during dev      |
| OTS Product Integration   | itest@servicesaustralia.gov.au                    | NOI certification testing        |
| PRODA Support (Prod)      | 1800 700 199                                      | PRODA production issues          |

---

## Quick Reference: AIR Validation Error Codes

| Code         | Description                                                    |
| ------------ | -------------------------------------------------------------- |
| AIR-E-1013   | Max encounters exceeded (>10 per request)                      |
| AIR-E-1014   | Episode sequencing error (must start at 1, increment by 1)     |
| AIR-E-1015   | Date of Service must be after Date of Birth                    |
| AIR-E-1016   | Invalid format for field                                       |
| AIR-E-1017   | Invalid value (failed permitted values or check digit)         |
| AIR-E-1018   | Date is in the future                                          |
| AIR-E-1019   | Date is more than 130 years in the past                        |
| AIR-E-1020   | Medicare card number required when IRN is set                  |
| AIR-E-1021   | Immunising Provider Number must be supplied                    |
| AIR-E-1022   | Date of Service is invalid                                     |
| AIR-E-1023   | Vaccine code is invalid                                        |
| AIR-E-1024   | Vaccine dose is invalid                                        |
| AIR-E-1028   | Provider number must exist and be current at date of service   |
| AIR-E-1029   | Information provider number must exist and be current          |

---

## Reminders for Claude Code

1. **Always validate both client-side AND server-side** — never trust frontend validation alone
2. **AIR error messages are sacred** — display them exactly as received, no modifications
3. **Group Excel rows into encounters** before API submission — one individual + one date = one encounter
4. **Max 10 encounters per API call** — batch accordingly
5. **Handle `AIR-W-1004` gracefully** — it's a normal flow, not an error. User confirms, then resubmit.
6. **PRODA token refresh at 50 minutes** — don't wait for expiry
7. **Test with Vendor environment first** — production access only after NOI certification
8. **Date formats differ**: API body uses `yyyy-MM-dd`, `dhs-subjectId` header uses `ddMMyyyy`
9. **All fields are mandatory for developers** even if optional for health professionals (per TECH.SIS.AIR.02)
10. **IHI does NOT use Luhn validation** — format check only (16 numeric digits)
