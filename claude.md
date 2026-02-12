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
PRODA_TOKEN_ENDPOINT_VENDOR=https://vnd.proda.humanservices.gov.au/mga/sps/oauth/oauth20/token
PRODA_TOKEN_ENDPOINT_PROD=https://proda.humanservices.gov.au/mga/sps/oauth/oauth20/token
PRODA_MINOR_ID=                        # e.g., WRR00000 — Minor ID assigned to this healthcare location
PRODA_DEVICE_NAME=                     # Device name registered with PRODA (e.g., DavidTestLaptop2)
PRODA_ORG_ID=                          # PRODA Organisation ID / RA number (e.g., 2330016739)
PRODA_JKS_BASE64=                      # Base64-encoded JKS keystore file (generated by SoapUI)
PRODA_JKS_PASSWORD=Pass-123            # JKS keystore password (SoapUI default)
PRODA_KEY_ALIAS=proda-alias            # Private key alias within JKS (SoapUI default)
PRODA_JWT_AUDIENCE=https://proda.humanservices.gov.au
PRODA_CLIENT_ID=soape-testing-client-v2  # Vendor environment client ID
PRODA_ACCESS_TOKEN_AUDIENCE=https://proda.humanservices.gov.au  # accessTokenAudience value

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
    "dhs-productId": config.AIR_PRODUCT_ID,            # "EM Bulk Vaccination Upload V1.2"
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
      "gender": "F",                      // M, F, X
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
          "routeOfAdministration": "IM"   // PO, SC, ID, IM, NS
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

### Token Acquisition Flow (PROVEN — verified against vendor test environment 2026-02-08)

```
1. Load private key from JKS keystore
   - JKS generated by SoapUI during device activation
   - Alias: "proda-alias"
   - Password: "Pass-123"
   - In production: retrieve from Azure Key Vault → decode Base64 → load in memory

2. Build JWT assertion with these EXACT claims:
   HEADER:
   - alg: "RS256"
   - kid: {PRODA_DEVICE_NAME}              ← device name, NOT org ID

   PAYLOAD:
   - iss: {PRODA_ORG_ID}                   ← organisation ID (e.g., "2330016739")
   - sub: {PRODA_DEVICE_NAME}              ← device name (e.g., "DavidTestLaptop2")
   - aud: "https://proda.humanservices.gov.au"  ← FIXED audience string
   - token.aud: {PRODA_ACCESS_TOKEN_AUDIENCE}   ← custom claim for access token audience
   - exp: now + 10 minutes
   - iat: now

   Sign with RS256 using JKS private key

3. POST to PRODA_TOKEN_ENDPOINT (vendor or prod):
   Content-Type: application/x-www-form-urlencoded
   Body:
   - grant_type: urn:ietf:params:oauth:grant-type:jwt-bearer
   - assertion: {signed_jwt}
   - client_id: {PRODA_CLIENT_ID}          ← "soape-testing-client-v2" for vendor

4. Response: { access_token, token_type: "bearer", expires_in: 3600, key_expiry, device_expiry }
5. Cache token in memory. Refresh at 50-minute mark (before 60-min expiry).
```

### Proven Token Payload (decoded from successful token retrieval):
```json
{
  "sub": "2330016739",                         // orgId
  "iss": "https://proda.humanservices.gov.au",
  "aud": "PRODA.UNATTENDED.B2B",
  "proda.swinst": "DavidTestLaptop2",          // deviceName
  "proda.type": "UNATTENDED.B2B",
  "proda.org": "2330016739",
  "proda.aud": "https://proda.humanservices.gov.au",
  "proda.rp": "PRODA",
  "proda.sp": ["PRODA"]
}
```

### CRITICAL NOTES:
- JWT `iss` is ORG_ID, NOT Minor ID (previous claude.md was WRONG)
- JWT `aud` is "https://proda.humanservices.gov.au", NOT "https://medicareaustralia.gov.au/MCOL"
- JWT `kid` header MUST be the device name
- `token.aud` is a custom claim in the JWT payload, NOT the standard `aud` claim
- `client_id` is a POST form parameter, NOT a JWT claim
- Token endpoint URL differs between vendor and production environments
- JKS MUST be generated by SoapUI's ActivateDevice test suite — Python-generated keys are NOT compatible

**CRITICAL**: PRODA tokens MUST be held in-memory only. Never persist to database or disk.

### JKS Keystore Handling

- JKS MUST be generated by SoapUI's ActivateDevice test suite (Python/Java-generated keys are NOT compatible with the PRODA token server)
- SoapUI generates the JKS with alias `proda-alias` and password `Pass-123`
- Store JKS file as Base64-encoded secret in Azure Key Vault
- At runtime: retrieve from Key Vault → decode Base64 → load with `pyjks` or Java KeyStore
- Never write the decoded JKS to the filesystem in production
- For local dev: mount from `.env` file as `PRODA_JKS_BASE64`
- Device key expiry: must be monitored and renewed before expiry (current: 6 months from activation)
- Device expiry: 5 years from activation

### Vendor Test Environment Credentials (current)
- Org ID: 2330016739
- Device Name: DavidTestLaptop2
- Device Status: ACTIVE
- Key Expiry: 2026-08-06
- Device Expiry: 2031-04-07
- JKS Location (local): C:\Users\david\Downloads\ProdaCertificates\DavidTestLaptop2_vnd.jks
- Token Endpoint: https://vnd.proda.humanservices.gov.au/mga/sps/oauth/oauth20/token
- Client ID: soape-testing-client-v2

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

- `M` = Male, `F` = Female, `X` = Indeterminate/Intersex/Unspecified
- **Note**: Backend validation accepts M, F, X only. I and U are NOT in the codebase.
- **In Excel template**: accept M/F/X or Male/Female and map accordingly

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
| G   | Gender                     | individual.personalDetails.gender       | Yes      | M/F/X               |
| H   | Postcode                   | individual.address.postCode             | Cond     | 4 digits            |
| I   | Date of Service            | encounters[].dateOfService              | Yes      | DD/MM/YYYY          |
| J   | Vaccine Code               | episodes[].vaccineCode                  | Yes      | 1-6 chars           |
| K   | Vaccine Dose               | episodes[].vaccineDose                  | Yes      | 1-20 or B           |
| L   | Vaccine Batch              | episodes[].vaccineBatch                 | Cond     | 1-15 chars          |
| M   | Vaccine Type               | episodes[].vaccineType                  | Cond     | NIP/OTH             |
| N   | Route of Administration    | episodes[].routeOfAdministration        | Cond     | PO/SC/ID/IM/NS      |
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
- Gender not in M/F/X
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

---

## Ticket Tracking Protocol

Claude Code must follow this workflow for every ticket. No exceptions.

### Before Starting Any New Ticket

1. Check `QA_FIXES.md` for OPEN or REOPENED items. Fix ALL of them first before starting the next ticket. After fixing:
   - Change the item's status from OPEN/REOPENED to FIXED
   - Add "Dev fix notes" explaining what you changed
   - Commit with: `git add -A && git commit -m "fix(qa): QA-FIX-NNN description"`
   - Do NOT move items to "Closed Issues" — QA agent does that after re-testing
2. Read `PROGRESS.md` to confirm the previous ticket is ✅ Done
3. Never start a new ticket if the previous one has failing tests
4. Update `PROGRESS.md` → "Current State" section:
   ```
   **Last updated**: YYYY-MM-DD HH:MM
   **Current ticket**: TICKET-NNN
   **Phase**: N — Phase Name
   **Branch**: feature/TICKET-NNN-short-name
   ```
5. In `TODO.md`, change the ticket's status marker from `[ ]` to `[🔄]`
6. Create the feature branch: `git checkout -b feature/TICKET-NNN-short-name`

### While Working on a Ticket

- Complete ALL tasks listed under the ticket in `TODO.md`
- In `TODO.md`, check off individual sub-tasks as you go: `- [ ]` → `- [x]`
- Run tests after each significant change, not just at the end
- If you encounter a blocker, update `PROGRESS.md` with status ❌ and explain why

### After Completing a Ticket

1. Run ALL tests for the ticket and confirm they pass
2. In `TODO.md`, change the ticket's status marker from `[🔄]` to `[x]`
3. Append a log entry to `PROGRESS.md` using this exact format:
   ```
   ### TICKET-NNN: Title
   - **Status**: ✅ Done
   - **Branch**: `feature/TICKET-NNN-short-name`
   - **Date**: YYYY-MM-DD HH:MM
   - **Files created/modified**:
     - `path/to/file.py` — what it does
   - **Tests**: X passed, Y failed
   - **Notes**: Any decisions, issues, or observations
   ```
4. Commit: `git add -A && git commit -m "feat(scope): TICKET-NNN description"`
5. Merge to main: `git checkout main && git merge feature/TICKET-NNN-short-name`
6. Only then proceed to the next ticket in sequence

### Rules

- **Never skip a failing ticket** — fix it or mark it ❌ Blocked with a reason
- **Never modify PROGRESS.md log entries** — append only
- **Always update both files** — TODO.md (checkboxes) AND PROGRESS.md (log)
- **Commit message format**: `feat|fix|test|docs(scope): TICKET-NNN short description`


---

# ═══════════════════════════════════════════════════════════════════════════════
# V1.2 PATCH — Appended 2026-02-09
# Everything ABOVE this line is V1.1 (frozen — tagged as v1.1.0 on main)
# Everything BELOW this line is V1.2 (active on develop branch, targeting v1.2.0 tag)
# If V1.2 contradicts V1.1, V1.2 WINS.
# ═══════════════════════════════════════════════════════════════════════════════

## Version Control & Git Strategy

### Versioning

This project uses **Semantic Versioning** (semver). Version numbers live on **Git tags**, not branch names. Branches are ephemeral workspaces; tags are permanent release markers.

| Tag       | Scope                                                                                         | Status                               |
| --------- | --------------------------------------------------------------------------------------------- | ------------------------------------ |
| `v1.0.0`  | Auth, PRODA B2B, bulk upload, core AIR Record Encounter                                       | ✅ RELEASED — tagged on `main`       |
| `v1.1.0`  | Submission results, edit/resubmit, confirm flow, export                                       | ✅ RELEASED — tagged on `main`       |
| `v1.2.0`  | PRODA JWT fixes, 14 missing AIR APIs, Location/Minor ID, full NOI-ready architecture          | ✅ RELEASED — tagged on `main`       |
| `v1.3.0`  | User auth, RBAC, DB migrations (users/submission_batches), E2E tests, BUG-008 cleanup         | 🔄 IN DEVELOPMENT — on `develop`     |

### Branch Structure

```
main                              ← production-ready, tagged releases only
  ├── tag: v1.0.0                 ← initial release
  ├── tag: v1.1.0                 ← submission results release (current stable)
  └── (future) tag: v1.2.0       ← NOI-complete release
develop                           ← integration branch for v1.2.0
  ├── feature/V12-P01-*           ← PRODA auth fix tickets
  ├── feature/V12-P02-*           ← Location & provider tickets
  ├── feature/V12-P03-*           ← Individual management tickets
  ├── feature/V12-P04-*           ← Encounter management tickets
  ├── feature/V12-P05-*           ← Exemptions tickets
  ├── feature/V12-P06-*           ← Indicators & catch-up tickets
  ├── feature/V12-P07-*           ← Bulk upload hardening tickets
  ├── fix/*                       ← QA-reported bug fixes (priority merge)
  ├── test/*                      ← QA test infrastructure
  └── release/v1.2.0             ← created when all tests pass → merges to main + tag
```

### Tag & Release Process

```bash
# STEP 0: Tag current stable as v1.1.0 (if not already tagged)
git checkout main
git tag -a v1.1.0 -m "Release v1.1.0 — Submission results, edit/resubmit, confirm flow"
git push origin main --tags

# STEP 1: Create develop from latest main (if not already present)
git checkout main
git checkout -b develop
git push origin develop

# STEP 2: DEV works on feature branches off develop
git checkout develop && git pull
git checkout -b feature/V12-P01-001-fix-jwt-claims
# ... work ...
git checkout develop && git merge feature/V12-P01-001-fix-jwt-claims

# STEP 3: When all phases pass QA on develop, create release branch
git checkout develop
git checkout -b release/v1.2.0
# Final QA, version bump in dhs-productId, changelog update
git checkout main
git merge release/v1.2.0
git tag -a v1.2.0 -m "Release v1.2.0 — NOI-complete: all 16 AIR APIs, location management, PRODA auth fixes"
git push origin main --tags
# Back-merge to develop
git checkout develop
git merge main
```

### Rollback Safety

If v1.2.0 introduces regressions, production can instantly revert:
```bash
git checkout v1.1.0          # roll back to last stable tag
# or: deploy the v1.1.0 tagged commit to production
```

This is why **we never modify tagged commits** and why `main` only receives code through release branches.

### Branch Naming Convention

| Prefix       | Pattern                                     | Who     | Example                                      |
| ------------ | ------------------------------------------- | ------- | -------------------------------------------- |
| `feature/`   | `feature/V12-PNN-NNN-short-name`            | DEV     | `feature/V12-P01-001-fix-jwt-claims`         |
| `fix/`       | `fix/QA-FIX-NNN-short-name`                 | DEV     | `fix/QA-FIX-003-missing-client-id`           |
| `test/`      | `test/V12-PNN-description`                  | QA      | `test/V12-P03-individual-search-e2e`         |
| `release/`   | `release/vX.Y.Z`                            | Lead    | `release/v1.2.0`                             |

### Commit Message Convention

```
feat(scope): V12-PNN-NNN description          # New feature
fix(scope): V12-PNN-NNN description            # Bug fix
fix(qa): QA-FIX-NNN description                # QA-reported fix
test(scope): V12-PNN-NNN description           # Test addition
docs(scope): V12-PNN-NNN description           # Documentation
```

### Rules

- **Never commit directly to `main`** — only release branches merge to main
- **Never commit directly to `develop`** — use feature/fix/test branches
- **Never modify a tagged commit** — tags are immutable release markers
- **Always pull develop before branching** — `git checkout develop && git pull`
- **Run tests before merging to develop** — `pytest` and `npm test`
- **QA works on `develop`** after feature branches merge — creates `test/` branches for new tests
- **Bug fixes get `fix/` branches** off develop with priority merge

---

## V1.2 ERRATA — PRODA Authentication Corrections

> **OVERRIDES V1.1 section "PRODA B2B Authentication" (lines ~399–428)**
> The V1.1 JWT claims contain multiple errors that will cause authentication failures.

### Corrected JWT Assertion

```
JWT Header:
  alg: RS256
  kid: {PRODA_DEVICE_NAME}                ← Software instance name (MISSING in V1.1)

JWT Payload:
  iss: {PRODA_ORG_ID}                     ← Organisation RA number (V1.1 WRONGLY used Minor ID)
  sub: {PRODA_DEVICE_NAME}                ← Software instance name (correct in V1.1)
  aud: "https://proda.humanservices.gov.au"    ← ALWAYS this value (V1.1 WRONGLY used MCOL URL)
  token.aud: {PRODA_TOKEN_AUD}            ← Service target audience (MISSING in V1.1)
  iat: <epoch seconds>
  exp: <epoch seconds + 600>              ← 10 minute max (V1.1 said 5 min, spec says 600 sec)
```

### V1.1 → V1.2 Correction Table

| Field                  | V1.1 (WRONG)                            | V1.2 (CORRECT)                                     | Spec Reference             |
| ---------------------- | --------------------------------------- | --------------------------------------------------- | -------------------------- |
| JWT `iss`              | `PRODA_MINOR_ID`                        | `PRODA_ORG_ID` (Organisation RA number)             | PRODA B2B v4.2 §5.3.3     |
| JWT `aud`              | `https://medicareaustralia.gov.au/MCOL` | `https://proda.humanservices.gov.au`                | PRODA B2B v4.2 §5.3.3     |
| JWT `token.aud`        | *(missing entirely)*                    | `https://medicareaustralia.gov.au/MCOL`             | PRODA B2B v4.2 §5.4       |
| JWT header `kid`       | *(missing entirely)*                    | `{PRODA_DEVICE_NAME}`                               | PRODA B2B v4.2 §5.3.3     |
| Token body `client_id` | *(missing entirely)*                    | Required — from Developer Portal software reg       | PRODA B2B v4.2 §5.3.2     |
| JWT `jti`              | Present                                 | Removed — not in PRODA spec                         | PRODA B2B v4.2 §5.3.3     |
| JWT `exp`              | `now + 5 min`                           | `now + 600` sec (spec says 600 explicitly)          | PRODA B2B v4.2 §5.3.3     |

### Corrected Token Request

```
POST {PRODA_TOKEN_ENDPOINT}
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer
&assertion={signed_jwt}
&client_id={PRODA_CLIENT_ID}              ← REQUIRED — was missing in V1.1
```

### Corrected Environment Variables

> **OVERRIDES V1.1 env vars for all PRODA fields.**

```env
# === PRODA B2B Authentication (V1.2 corrected) ===
PRODA_TOKEN_ENDPOINT=https://proda.humanservices.gov.au/piaweb/api/b2b/v1/token
PRODA_TOKEN_ENDPOINT_VENDOR=https://vnd.proda.humanservices.gov.au/piaweb/api/b2b/v1/token
PRODA_ORG_ID=2330016739                                        # Organisation RA number → JWT iss
PRODA_DEVICE_NAME=DavidTestLaptop2                             # Software instance → JWT sub + kid
PRODA_CLIENT_ID=                                               # From Developer Portal → token body
PRODA_JWT_AUD=https://proda.humanservices.gov.au               # JWT aud (ALWAYS this value)
PRODA_TOKEN_AUD=https://medicareaustralia.gov.au/MCOL          # JWT token.aud (AIR service target)
PRODA_JKS_BASE64=                                              # Base64-encoded JKS keystore
PRODA_JKS_PASSWORD=                                            # JKS keystore password
PRODA_KEY_ALIAS=                                               # Private key alias within JKS

# === RETIRED V1.1 vars — do not use ===
# PRODA_MINOR_ID     → replaced by per-location lookup from locations table
# PRODA_AUDIENCE     → split into PRODA_JWT_AUD + PRODA_TOKEN_AUD
```

### Corrected Python Implementation

```python
# backend/app/services/proda_auth.py  (V1.2 — replaces V1.1 implementation)

import time, jwt, httpx
from app.config import settings

def build_proda_assertion() -> str:
    now = int(time.time())
    headers = {
        "alg": "RS256",
        "kid": settings.PRODA_DEVICE_NAME,
    }
    claims = {
        "iss": settings.PRODA_ORG_ID,            # Org RA, NOT Minor ID
        "sub": settings.PRODA_DEVICE_NAME,
        "aud": settings.PRODA_JWT_AUD,            # https://proda.humanservices.gov.au
        "token.aud": settings.PRODA_TOKEN_AUD,    # https://medicareaustralia.gov.au/MCOL
        "iat": now,
        "exp": now + 600,
    }
    private_key = load_private_key_from_jks()
    return jwt.encode(claims, private_key, algorithm="RS256", headers=headers)

async def acquire_token() -> dict:
    assertion = build_proda_assertion()
    endpoint = (settings.PRODA_TOKEN_ENDPOINT_VENDOR
                if settings.APP_ENV == "vendor"
                else settings.PRODA_TOKEN_ENDPOINT)
    async with httpx.AsyncClient() as client:
        resp = await client.post(endpoint, data={
            "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
            "assertion": assertion,
            "client_id": settings.PRODA_CLIENT_ID,
        })
        resp.raise_for_status()
    return resp.json()
```

### Proven Working Test Configuration (from SoapUI vendor testing)

```
orgId:      2330016739
deviceName: DavidTestLaptop2
JKS alias:  proda-alias
JKS pass:   Pass-123
client_id:  soape-testing-client-v2
token.aud:  https://medicareaustralia.gov.au/MCOL
```

---

## V1.2 — Mandatory AIR APIs for NOI Certification

> Per AIR Developer Guide V3.0.8 §6.3:
> *"It is a requirement to develop ALL AIR Web Services so full AIR functionality is provided."*
>
> V1.1 only implements APIs #8 and #16 below. **All 16 are mandatory.**

### Complete API Inventory

| #  | API Name                                 | Spec              | Method | Path                                                              | V1.1 | V1.2 |
|----|------------------------------------------|-------------------|--------|-------------------------------------------------------------------|------|------|
| 1  | Get Authorisation Access List            | TECH.SIS.AIR.04   | POST   | `/air/immunisation/v1/authorisation/accesslist`                   | ❌   | ✅   |
| 2  | Identify Individual                      | TECH.SIS.AIR.05   | POST   | `/air/immunisation/v1.1/individual/details`                       | ❌   | ✅   |
| 3  | Get Immunisation History Details         | TECH.SIS.AIR.05   | POST   | `/air/immunisation/v1.3/individual/history/details`               | ❌   | ✅   |
| 4  | Get Immunisation History Statement       | TECH.SIS.AIR.05   | POST   | `/air/immunisation/v1/individual/history/statement`               | ❌   | ✅   |
| 5  | Get Medical Contraindication History     | TECH.SIS.AIR.06   | POST   | `/air/immunisation/v1/individual/contraindication/history`        | ❌   | ✅   |
| 6  | Get Natural Immunity History             | TECH.SIS.AIR.06   | POST   | `/air/immunisation/v1/individual/naturalimmunity/history`         | ❌   | ✅   |
| 7  | Get Vaccine Trial History                | TECH.SIS.AIR.05   | POST   | `/air/immunisation/v1/individual/vaccinetrial/history`            | ❌   | ✅   |
| 8  | Record Encounter                         | TECH.SIS.AIR.02   | POST   | `/air/immunisation/v1.4/encounters/record`                        | ✅   | ✅   |
| 9  | Update Encounter                         | TECH.SIS.AIR.05   | POST   | `/air/immunisation/v1.3/encounters/update`                        | ❌   | ✅   |
| 10 | Record Medical Contraindication          | TECH.SIS.AIR.06   | POST   | `/air/immunisation/v1/individual/contraindication/record`         | ❌   | ✅   |
| 11 | Record Natural Immunity                  | TECH.SIS.AIR.06   | POST   | `/air/immunisation/v1/individual/naturalimmunity/record`          | ❌   | ✅   |
| 12 | Add Additional Vaccine Indicator         | TECH.SIS.AIR.05   | POST   | `/air/immunisation/v1/individual/vaccineindicator/add`            | ❌   | ✅   |
| 13 | Remove Additional Vaccine Indicator      | TECH.SIS.AIR.05   | POST   | `/air/immunisation/v1/individual/vaccineindicator/remove`         | ❌   | ✅   |
| 14 | Update Indigenous Status                 | TECH.SIS.AIR.05   | POST   | `/air/immunisation/v1/individual/indigenousstatus/update`         | ❌   | ✅   |
| 15 | Planned Catch Up Date                    | TECH.SIS.AIR.03   | POST   | `/air/immunisation/v1.1/schedule/catchup`                         | ❌   | ✅   |
| 16 | Reference Data (multiple endpoints)      | TECH.SIS.AIR.07   | GET    | `/air/immunisation/v1/refdata/*`                                  | ✅   | ✅   |

### Common HTTP Headers (V1.2 Corrected)

> **OVERRIDES V1.1 headers block.** Key change: `dhs-auditId` is now per-location.

```python
def build_air_headers(
    proda_token: str,
    location_minor_id: str,    # ← Per-location Minor ID, NOT global config
    subject_dob: str | None,   # ddMMyyyy format — None for APIs that don't use subjectId
) -> dict:
    headers = {
        "Authorization": f"Bearer {proda_token}",
        "X-IBM-Client-Id": config.AIR_CLIENT_ID,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "dhs-messageId": f"urn:uuid:{uuid4()}",
        "dhs-correlationId": f"urn:uuid:{uuid4()}",
        "dhs-auditId": location_minor_id,             # ← PER LOCATION
        "dhs-auditIdType": "Minor Id",
        "dhs-productId": config.AIR_PRODUCT_ID,
    }
    if subject_dob:
        headers["dhs-subjectId"] = subject_dob
        headers["dhs-subjectIdType"] = "Date of Birth"
    return headers
```

### Individual Identifier Pattern

APIs #2–7 and #9–14 follow a two-step pattern:

```
Step 1: Call Identify Individual (API #2) → returns individualIdentifier (opaque, max 128 chars)
Step 2: Pass individualIdentifier to subsequent calls in request body
```

**Exceptions** (do NOT use individualIdentifier):
- Record Encounter (#8), Planned Catch Up Date (#15), Reference Data (#16)

### Authorisation Access List API (Detail)

```json
// Request: POST /air/immunisation/v1/authorisation/accesslist
{ "informationProvider": { "providerNumber": "1234567A" } }

// Response (AIR-I-1100)
{
    "statusCode": "AIR-I-1100",
    "message": "Your request was successfully processed",
    "accessList": [
        { "accessTypeCode": "IDEN", "accessTypeDescription": "Identify Individual" },
        { "accessTypeCode": "HIST", "accessTypeDescription": "Immunisation History" },
        { "accessTypeCode": "RECD", "accessTypeDescription": "Record Encounter" }
    ]
}
```

**Frontend**: Cache access list per provider session. Grey out menu items the provider can't access.

---

## V1.2 — Location & Minor ID Management

> **EXTENDS V1.1 schema. DEPRECATES** `organisations.minor_id`.

### New Database Tables

```sql
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    name VARCHAR(200) NOT NULL,
    address_line1 VARCHAR(200), address_line2 VARCHAR(200),
    suburb VARCHAR(100), state VARCHAR(3), postcode VARCHAR(4),
    minor_id VARCHAR(20) NOT NULL UNIQUE,
    proda_link_status VARCHAR(20) DEFAULT 'pending',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE location_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    provider_number VARCHAR(8) NOT NULL,
    provider_type VARCHAR(20) NOT NULL,
    hw027_status VARCHAR(20) DEFAULT 'pending',
    air_access_list JSONB,
    access_list_fetched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(location_id, provider_number)
);

-- Existing table changes
ALTER TABLE organisations ADD COLUMN minor_id_prefix VARCHAR(3);
ALTER TABLE users ADD COLUMN default_location_id UUID REFERENCES locations(id);
ALTER TABLE submission_batches ADD COLUMN location_id UUID REFERENCES locations(id);
```

---

## V1.2 — Updated Folder Structure (New Files Only)

```
backend/app/
├── routers/   locations.py, providers.py, individuals.py, encounters_update.py,
│              exemptions.py, indicators.py, catchup.py
├── services/  air_authorisation.py, air_individual.py, air_encounter_update.py,
│              air_exemptions.py, air_indicators.py, air_catchup.py, location_manager.py
├── models/    location.py
├── schemas/   air_authorisation.py, air_individual.py, air_encounter_update.py,
│              air_exemptions.py, air_indicators.py, air_catchup.py, location.py

frontend/app/(dashboard)/
├── admin/     locations/page.tsx, providers/page.tsx
├── individuals/  page.tsx, [id]/page.tsx, [id]/history/page.tsx,
│                 [id]/statement/page.tsx, [id]/exemptions/page.tsx
├── encounters/   [id]/update/page.tsx
├── indicators/page.tsx, catchup/page.tsx, confirm/page.tsx
```

---

## V1.2 — Updated RBAC (Extends V1.1)

| Action                     | Super Admin | Org Admin | Provider | Reviewer | Read Only |
| -------------------------- | ----------- | --------- | -------- | -------- | --------- |
| Manage Locations           | ✔           | ✔         | —        | —        | —         |
| Manage Providers           | ✔           | ✔         | —        | —        | —         |
| Search Individuals         | ✔           | ✔         | ✔        | ✔        | ✔         |
| View History/Statement     | ✔           | ✔         | ✔        | ✔        | ✔         |
| Record Exemptions          | ✔           | ✔         | ✔        | —        | —         |
| Update Encounters          | ✔           | ✔         | ✔        | —        | —         |
| Indicators/Indigenous/Catchup | ✔        | ✔         | ✔        | —        | —         |

---

## V1.2 — Additional Error Codes

| Code       | Type    | Description                                      | Action                                 |
| ---------- | ------- | ------------------------------------------------ | -------------------------------------- |
| AIR-E-1026 | Error   | Insufficient individual information              | Prompt for more details                |
| AIR-E-1035 | Error   | Individual details could not be retrieved        | Display verbatim, suggest retry        |
| AIR-E-1039 | Error   | Provider not associated with Minor ID/PRODA org  | Check location + provider setup        |
| AIR-E-1061 | Error   | Invalid individual identifier                    | Re-identify individual (API #2)        |
| AIR-E-1063 | Error   | Provider not authorised for service              | Check Authorisation access list        |
| AIR-I-1001 | Info    | Individual details found                         | Proceed with individualIdentifier      |
| AIR-I-1100 | Info    | Request processed (Auth/RefData)                 | Proceed                                |
| AIR-W-0103 | Warning | Duplicate antigen dose                           | Display verbatim                       |

---

## V1.2 — Reminders for Claude Code

> **SUPPLEMENTS V1.1 reminders 1–10.**

11. **PRODA `iss` is Org RA, NOT Minor ID** — single most critical auth fix
12. **PRODA JWT needs `token.aud`** — separate from `aud`
13. **PRODA token request needs `client_id`** — in POST body
14. **`dhs-auditId` per-location** — from `locations.minor_id`, not global config
15. **individualIdentifier is opaque** — never display, parse, or log
16. **Authorisation API first** — verify provider access before data operations
17. **NOI tests ALL 16 APIs** — build and test every one
18. **HW027 is external** — app guides users but doesn't submit the form
19. **Git tags are immutable** — never modify v1.0.0 or v1.1.0 tagged commits
20. **All work on `develop`** via feature branches. Only `release/v1.2.0` merges to `main`
21. **V1.2 wins on conflicts** — always
22. **All optional fields MUST be developed** — mandatory for developers per TECH.SIS
23. **Read the TECH.SIS spec** before implementing each API
24. **`dhs-productId` must match NOI** — version in header = version on NOI certificate

---

## V1.3 — Post-Release Work Items

> v1.2.0 is RELEASED and tagged. The items below are outstanding work for the next release.
> All work on `develop` branch via feature branches.


## Bulk Immunisation History Request Feature

### Overview

Allows users to upload an Excel file containing patient identification details, validate them,
then bulk-fetch immunisation history from AIR for all patients. Results are displayed on-screen
and downloadable as an Excel report with Summary, Immunisation History, Vaccines Due, and Errors sheets.

### User Flow

1. **Upload**: User uploads `.xlsx` file with patient identification columns (Medicare/IHI/demographics)
2. **Validate & Edit**: System validates individual identification fields (DOB, gender, Medicare check digit, IHI format, demographics completeness). User can **Edit** invalid rows inline or **Skip** them.
3. **Process**: System calls AIR API for each valid patient:
   - Step 1: Identify Individual (API #2) → obtain `individualIdentifier`
   - Step 2: Get Immunisation History Details (API #3) → retrieve full history
   - Progress bar shows real-time status
4. **Results**: Summary cards (total/success/failed), expandable per-patient detail showing vaccination history and vaccines due
5. **Download**: Excel report with 4 sheets (Summary, Immunisation History, Vaccines Due, Errors)

### Required Excel Columns (Patient Identification)

| Column | Maps To | Required | Notes |
|--------|---------|----------|-------|
| Medicare Card Number | individual.medicareCard.medicareCardNumber | Conditional | 10 digits, check digit validated |
| Medicare IRN | individual.medicareCard.medicareIRN | Conditional | 1-9, required if Medicare provided |
| IHI Number | individual.ihiNumber | Conditional | 16 digits, no Luhn check |
| First Name | individual.personalDetails.firstName | Conditional | Max 40 chars |
| Last Name | individual.personalDetails.lastName | Conditional | Max 40 chars |
| Date of Birth | individual.personalDetails.dateOfBirth | Yes | DD/MM/YYYY |
| Gender | individual.personalDetails.gender | Yes | M/F/X |
| Postcode | individual.address.postCode | Conditional | 4 digits |

At least one identification scenario must be satisfied per AIR rules:
1. Medicare + IRN + DOB + Gender
2. IHI + DOB + Gender
3. FirstName + LastName + DOB + Gender + Postcode

### Backend Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/bulk-history/upload` | Upload and parse Excel file |
| POST | `/api/bulk-history/validate` | Validate individual identification fields |
| POST | `/api/bulk-history/process` | Start background processing (identify + fetch history) |
| GET | `/api/bulk-history/{requestId}/progress` | Poll processing progress |
| GET | `/api/bulk-history/{requestId}/results` | Get completed results |
| GET | `/api/bulk-history/{requestId}/download` | Download Excel report |

### Files

| File | Purpose |
|------|---------|
| `backend/app/routers/bulk_history.py` | API endpoints |
| `backend/app/schemas/bulk_history.py` | Pydantic request/response models |
| `backend/tests/unit/test_bulk_history.py` | 37 unit tests |
| `frontend/app/(dashboard)/bulk-history/page.tsx` | Multi-step wizard UI |
| `frontend/e2e/bulk-history.spec.ts` | Playwright E2E tests |

### AIR API Compliance

- Uses Identify Individual (API #2: `POST /air/immunisation/v1.1/individual/details`)
- Uses Get Immunisation History Details (API #3: `POST /air/immunisation/v1.3/individual/immunisation-history/details`)
- All AIR error messages displayed verbatim per TECH.SIS.AIR.02 Section 5.2.2
- PRODA authentication via existing ProdaAuthService
- Headers built per TECH.SIS.AIR.01 (dhs-subjectId, dhs-auditId, etc.)
- DOB format: `ddMMyyyy` in headers, `yyyy-MM-dd` internal

### Open Bugs

| Bug | Priority | Description | Status |
|-----|----------|-------------|--------|
| BUG-008 | P2 | ResultsSummary has no warning table — dead code (submit page redirects to detailed results) | OPEN |

### User Authentication & RBAC

The login page exists as a shell but auth is not wired. The compliance audit noted "no user_id in logs" (PARTIAL). Required:

- **User model + Alembic migration** — users table with organisation_id FK, Argon2id password hash, role enum, lockout fields
- **Auth router** — POST /api/auth/login, POST /api/auth/logout, POST /api/auth/register
- **JWT middleware** — HS256 tokens in HttpOnly cookies, 30min inactivity timeout, 8hr max session
- **Password hashing** — Argon2id (NOT bcrypt), min 12 chars, complexity requirements
- **Account lockout** — 5 failed attempts → 30min lockout
- **RBAC middleware** — role-based access per the RBAC table in V1.1 and V1.2 sections
- **Frontend auth context** — AuthProvider, useAuth hook, protected route wrapper
- **Wire login page** — connect to auth API, redirect on success
- **Audit logging** — add user_id to structlog context for all authenticated requests

### Database Migrations (Deferred from Phase 2)

- `users` table — full schema per V1.1 Database Schema section
- `submission_batches` table — with location_id FK
- `submission_records` table — for per-record tracking
- `audit_log` table — for audit trail
- ALTER existing tables: `users.default_location_id`, `submission_batches.location_id`

### Playwright E2E Tests

34 Playwright E2E tests are defined in `backend/tests/integration/` but need running frontend + backend to execute. Requires:
- Playwright test runner configuration
- Dev server startup script for test environment
- CI pipeline integration

### NOI Certification (Manual — Not Code)

- Submit `docs/APPLICATION_DETAILS_FORM.md` to Services Australia OTS portal (itest@servicesaustralia.gov.au)
- Provide screenshots of all key screens
- Complete OTS review process (2-4 weeks turnaround)
- Address any feedback from OTS team

### Remote Repository

- Push `main` branch and `v1.2.0` tag to remote
- Push `develop` branch to remote
- Delete `release/v1.2.0` branch (local + remote)

## Vaccine Clinic Mode

Summary of feature

The user of the system runs vaccines clinics 
This means that they need to know which patients are eligible for certain vaccines and which patients are not eligible
Eligible is defined by a set of clinic rules. 
After uploading to the Bulk Immunisation History, the user would need the ability to enter vaccine clinic mode
this gives the user the ability to see patients eligible for certain vaccines 
The user can export this list

Vaccines 
Vaccine clinics are run for either Flu, COVID, Shingrix, Prevnar 13
The system would need to know which vaccine codes relate to flu, which codes relate to covid, which relate to shingles and which relate to pneumococcal

eligibility rules
eligibility rules can be hard coded but should be able to change in the future
--Flu clinic rules
Patients eligible for flu clinic are those that have not had any type of flu vaccine in 2026. If a patient has had any type of flu vaccine in 2026 then they would not be eligible
--COVID Clinic Rules
COVID vaccines are allowed once every 6 months
if a patient has had any type covid vaccine in the previous 6 months they are not eligible
if a patient has not had a covid vaccine in previous 6 months, they are eligible
--Shingles clinic rules
3 rules to meet to be eligible 
patients must be over the age of 65, and
patients must not have had 2 doses of Shingrix vaccine
patient must not have had Zostavax in the previous 5 years
If patient is eligible and they have had no doses of Shingrix vaccine - return eligible for two doses
if, patient is eligible and they have had one dose of Shingrix vaccines - return eligible for one dose
Patient due date for Shingrix is equal to either (due date is only valid if patient meets eligibility rule)
1. The date they turned 65 years old if they have had no Shingrix doses, or 
2. If patient has had 1 dose of Shingrix, the due date is equal to 2 months after the first dose 
--Prevnar 13 clinic rules
3 rules to be eligible
patient must be over 70 years of age or older 
patient must not have had Prevnar 13 previously at any stage
Patient must not have had Prevnar 23 in the previous 12 months 
patient due date for Prevnar is equal to either of the below (due date is only valid if patient meets eligibility rule)
1. If the patient has had 12 months since Prevnar 23 or has never had Prevnar 23, then the due date for prevnar 13 is the date the patient turned 70
2. if the patient has previously had Prevnar 23, but it has not yet been 12 months, then the due date is equal to the date when it has been 12 months since the Prevnar 23. 

Returned results per clinic 
below results may be displayed on screen and available as a csv file to download
For all clinics return patient room number - in original upload document
For all clinics return patient first name, last name, DOB, age, medicare card number and reference number
--Returned results for flu clinic
Return if eligible or not eligible
Return date of last flu vaccine if found
--Returned results for COVID clinic
Return if eligible or not eligible
Return last date of COVID vaccine if found
--Returned results Shingrix clinic
Return if eligible for one dose or two doses or if not eligible
return last date of Shingrix dose 1 and dose 2 if applicable
return last date of Zostovax if applicable
return due date for Shingrix if applicable
--Returned results Prevnar 13 clinic
Return if eligible or not
return last date of Prevnar 13 if applicable
return last date of Prevnar 23 if applicable
Return due date for Prevnar 13 if applicable

An example of what this may be look like, and a starting point for your team can be found here \\wsl$\Ubuntu\home\david\Vaccination-Upload\docs\air-bulk-manager (1).jsx

Develop an implementation plan, and mockups before proceeding to todo tickets

End of feature Vaccine Clinic Mode
-------
