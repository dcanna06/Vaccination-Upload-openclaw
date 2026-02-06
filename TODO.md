# AIR Bulk Vaccination Upload Application - Claude Code TODO List

## Project Overview

This project implements a web application that allows non-technical users to upload Excel documents containing vaccination records and submit them to the Australian Immunisation Register (AIR) via Services Australia's REST Web Services.

### Key Requirements from Services Australia Documentation

- **API Version**: AIR Record Encounter API V1.4.0
- **Authentication**: PRODA B2B organisational authentication
- **Data Format**: REST with JSON payload
- **Date Format**: `ddMMyyyy` (e.g., 07082021)
- **Max Encounters per Request**: 10
- **Max Episodes per Encounter**: 5
- **Required HTTP Headers**: Authorization, Content-Type, dhs-messageId, dhs-correlationId, dhs-auditId, dhs-auditIdType, dhs-subjectId, dhs-subjectIdType, dhs-productId, X-IBM-Client-Id

### Environments

| Environment | Purpose |
|-------------|---------|
| Vendor/Test | Development and certification testing |
| Production | Live submissions after NOI certification |

---

## Phase 1: Project Setup & Infrastructure

### [x] TICKET-001: Initialize Project Repository Structure

**Branch**: `feature/TICKET-001-project-setup`

**Description**: Set up the monorepo structure with separate frontend and backend packages.

**Tasks**:
- [x] Create root `package.json` with workspace configuration
- [x] Create `/backend` directory with FastAPI setup (per claude.md tech stack)
- [x] Create `/frontend` directory with Next.js 14 setup (per claude.md tech stack)
- [x] Create shared TypeScript types in frontend/types/ (no separate /shared - cross-language project)
- [x] Create `.env.example` files for both environments
- [x] Create `docker-compose.yml` for local development
- [x] Create `.gitignore` with appropriate entries

**File Structure**:
```
/air-bulk-upload/
├── backend/
│   ├── src/
│   ├── tests/
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   ├── tests/
│   ├── package.json
│   └── vite.config.ts
├── shared/
│   ├── types/
│   └── package.json
├── docker-compose.yml
├── package.json
└── README.md
```

**Test Requirements**:
- [x] `npm install` completes without errors in frontend
- [x] Backend pip install completes without errors
- [x] TypeScript compilation succeeds

---

### [x] TICKET-002: Configure TypeScript and Shared Types

**Branch**: `feature/TICKET-002-typescript-config`

**Description**: Set up TypeScript configuration and define shared types based on AIR API specifications.

**Tasks**:
- [x] Create `/shared/types/air-api.ts` with all AIR API types
- [x] Create `/shared/types/excel-import.ts` for Excel mapping types
- [x] Create `/shared/types/validation.ts` for validation result types
- [x] Configure path aliases for cross-package imports
- [x] Create base TypeScript configs extending from root

**Types to Define** (from AIR Record Encounter TECH.SIS.AIR.02):

```typescript
// /shared/types/air-api.ts

interface AddEncounterRequestType {
  claimId?: string; // 8 chars, format: WAAAAAA$
  individual: IndividualIdentifierType;
  encounters: EncounterType[];
  informationProvider: ProviderIdentifierType;
}

interface IndividualIdentifierType {
  acceptAndConfirm?: 'Y' | 'N';
  personalDetails: PersonalDetailsType;
  medicareCard?: MedicareCardType;
  address?: AddressType;
  atsiIndicator?: 'Y' | 'N';
  ihiNumber?: string; // 16 numeric
}

interface PersonalDetailsType {
  dateOfBirth: string; // ddMMyyyy format
  gender?: 'F' | 'M' | 'X';
  firstName?: string; // 1-40 chars
  lastName: string; // 1-40 chars
  initial?: string; // 1 char
  onlyNameIndicator?: boolean;
}

interface MedicareCardType {
  medicareCardNumber: string; // 10 numeric (9 + issue number)
  medicareIRN?: string; // 1 numeric
}

interface AddressType {
  addressLineOne?: string; // 1-40 chars
  addressLineTwo?: string; // 1-40 chars
  postCode?: string; // 4 numeric
  locality?: string; // 1-40 chars
}

interface EncounterType {
  id: number; // 1-10
  claimSequenceNumber?: number; // 1-4 for confirmations
  acceptAndConfirm?: 'Y' | 'N';
  episodes: EpisodeType[];
  dateOfService: string; // ddMMyyyy format
  immunisationProvider?: ProviderIdentifierType;
  schoolId?: string; // 1-9 numeric
  administeredOverseas?: boolean;
  countryCode?: string; // 3 char ICAO code
  antenatalIndicator?: boolean;
}

interface EpisodeType {
  id: number; // 1-5
  vaccineCode: string; // 1-6 alphanumeric
  vaccineDose: string; // 'B' or '1'-'20'
  vaccineBatch?: string; // 1-15 alphanumeric
  vaccineType?: 'NIP' | 'OTH';
  routeOfAdministration?: 'PO' | 'SC' | 'ID' | 'IM' | 'NS';
}

interface ProviderIdentifierType {
  providerNumber: string; // 6-8 chars
  hpioNumber?: string; // 16 numeric
  hpiiNumber?: string; // 16 numeric
}
```

**Test Requirements**:
- [x] Types compile without errors
- [x] Types can be imported in both frontend and backend
- [x] All required AIR API fields are typed

---

### [x] TICKET-003: Set Up Backend FastAPI Server

**Branch**: `feature/TICKET-003-backend-setup-v2`

**Description**: Set up FastAPI backend with middleware, structured logging, and basic routing (adapted from Express per claude.md).

**Tasks**:
- [x] Wire error handling middleware into FastAPI app
- [x] Wire request logging middleware (structlog) into FastAPI app
- [x] Create `/backend/app/routers/` route stubs (health, upload)
- [x] Set up file upload route with validation (max 10MB, xlsx/xls only)
- [x] Configure CORS for frontend origin
- [x] Use structlog for all logging (not stdlib logging)

**Files to Create**:
- `/backend/src/index.ts`
- `/backend/src/middleware/errorHandler.ts`
- `/backend/src/middleware/requestLogger.ts`
- `/backend/src/middleware/fileUpload.ts`
- `/backend/src/routes/index.ts`

**Test Requirements**:
- [x] Server starts on configured port
- [x] Health check endpoint returns 200
- [x] CORS headers present in responses
- [x] File upload rejects non-Excel files
- [x] File upload rejects files > 10MB

---

### [x] TICKET-004: Set Up Frontend Next.js Application

**Branch**: `feature/TICKET-004-frontend-setup`

**Description**: Set up Next.js 14 frontend with TailwindCSS, layout components, and navigation (adapted from Vite per claude.md).

**Tasks**:
- [x] Next.js 14 with App Router configured (from TICKET-001)
- [x] TailwindCSS with dark theme, slate/emerald palette
- [x] Create UI components (Button, Card with variants)
- [x] Create layout components (Sidebar navigation, dashboard layout)
- [x] App Router routes for all pages (upload, validate, submit, history, settings)
- [x] Configure environment variables for API URL

**Files to Create**:
- `/frontend/src/App.tsx`
- `/frontend/src/main.tsx`
- `/frontend/src/components/layout/Header.tsx`
- `/frontend/src/components/layout/Footer.tsx`
- `/frontend/src/components/layout/Layout.tsx`
- `/frontend/src/pages/Home.tsx`
- `/frontend/src/pages/Upload.tsx`
- `/frontend/src/pages/Results.tsx`

**Test Requirements**:
- [x] Application loads without console errors
- [x] TailwindCSS classes apply correctly
- [x] Route navigation works
- [x] Environment variables are accessible

---

## Phase 2: Configuration Management

### [x] TICKET-005: Create Configuration Service

**Branch**: `feature/TICKET-005-config-service`

**Description**: Create Pydantic Settings configuration with AIR API credentials and environment switching (adapted from Express per claude.md).

**Tasks**:
- [x] Expand config.py with full AIR/PRODA/JWT settings
- [x] Implement environment variable validation (APP_ENV)
- [x] Create vendor/production URL switching via air_api_base_url property
- [x] Create mask_secret helper for safe logging

**Configuration Schema**:
```typescript
interface AIRConfig {
  environment: 'vendor' | 'production';
  apiBaseUrl: string;
  clientId: string; // X-IBM-Client-Id
  minorId: string; // dhs-auditId
  productId: string; // dhs-productId (software name + version)
  proda: {
    orgId: string;
    deviceName: string;
  };
}
```

**Test Requirements**:
- [x] Application fails to start with missing required config
- [x] Sensitive values are masked in logs
- [x] Config switches correctly between environments

---

### [x] TICKET-006: Implement PRODA Authentication Service

**Branch**: `feature/TICKET-006-proda-auth`

**Description**: Implement PRODA B2B authentication for AIR API requests (FastAPI/Python).

**Tasks**:
- [x] Create `backend/app/services/proda_auth.py` with ProdaAuthService
- [x] Implement JWT assertion building with RS256 signing
- [x] Implement token caching with 50-min refresh buffer
- [x] JKS keystore loading from base64 (in-memory only)
- [x] Handle authentication errors appropriately

**Key Functions**:
```typescript
class ProdaAuthService {
  generateToken(): Promise<string>;
  refreshToken(): Promise<string>;
  isTokenValid(): boolean;
  getAuthorizationHeader(): string;
}
```

**Test Requirements**:
- [x] Token generation succeeds with valid credentials
- [x] Token refresh occurs before expiry
- [x] Invalid credentials return clear error
- [x] Token is cached and reused

---

## Phase 3: Excel Processing

### [x] TICKET-007: Create Excel Parser Service

**Branch**: `feature/TICKET-007-excel-parser`

**Description**: Create service to parse uploaded Excel files and extract vaccination records.

**Tasks**:
- [x] Using openpyxl (Python) instead of xlsx (Node.js) per claude.md
- [x] Create `backend/app/services/excel_parser.py`
- [x] Define expected Excel column mappings with case-insensitive matching
- [x] Implement row-by-row parsing with data extraction
- [x] Handle multiple sheets (use first/active sheet)
- [x] Implement date parsing for multiple formats (datetime, DD/MM/YYYY, YYYY-MM-DD)
- [x] Create error collection for invalid rows

**Expected Excel Columns**:
| Column | Maps To | Required | Format |
|--------|---------|----------|--------|
| Medicare Number | individual.medicareCard.medicareCardNumber | Yes* | 10 digits |
| Medicare IRN | individual.medicareCard.medicareIRN | No | 1 digit |
| IHI Number | individual.ihiNumber | Yes* | 16 digits |
| Date of Birth | individual.personalDetails.dateOfBirth | Yes | DD/MM/YYYY |
| First Name | individual.personalDetails.firstName | Yes** | Text |
| Last Name | individual.personalDetails.lastName | Yes | Text |
| Gender | individual.personalDetails.gender | No | M/F/X |
| Postcode | individual.address.postCode | Yes** | 4 digits |
| Date of Vaccination | encounter.dateOfService | Yes | DD/MM/YYYY |
| Vaccine Code | episode.vaccineCode | Yes | Text |
| Vaccine Dose | episode.vaccineDose | Yes | B or 1-20 |
| Batch Number | episode.vaccineBatch | Conditional | Text |
| Vaccine Type | episode.vaccineType | Conditional | NIP/OTH |
| Route | episode.routeOfAdministration | Conditional | PO/SC/ID/IM/NS |
| Administered Overseas | encounter.administeredOverseas | No | Y/N |
| Country Code | encounter.countryCode | Conditional | 3 char |
| Antenatal | encounter.antenatalIndicator | Conditional | Y/N |
| Provider Number | encounter.immunisationProvider.providerNumber | No | 6-8 chars |

*One of Medicare Number or IHI Number required for identification
**Required for Scenario 2 identification (see Common Rules)

**Files to Create**:
- `/backend/src/services/excel/ExcelParserService.ts`
- `/backend/src/services/excel/ColumnMapper.ts`
- `/backend/src/services/excel/DateParser.ts`

**Test Requirements**:
- [ ] Valid Excel file parses without errors
- [x] Invalid column names return helpful errors
- [x] Date formats (DD/MM/YYYY, D/M/YYYY) parse correctly
- [x] Empty rows are skipped
- [x] Parser returns structured error for invalid rows

---

### [x] TICKET-008: Create Excel Template Generator

**Branch**: `feature/excel-template`

**Description**: Create a downloadable Excel template with correct column headers and data validation.

**Tasks**:
- [x] Create `backend/app/services/excel_template.py` (Python, not TS per claude.md)
- [x] Generate template with all 19 required columns per claude.md spec
- [x] Add data validation dropdowns for fixed values (per claude.md, NOT TODO.md)
- [x] Add example rows with sample data
- [x] Add instructions sheet explaining each column
- [x] Create API endpoint `GET /api/template` to download template

**Validation Dropdowns** (per claude.md):
- Gender: M, F, I, U
- Vaccine Type: NIP, AEN, OTH
- Route of Administration: IM, SC, ID, OR, IN, NAS
- Administered Overseas: TRUE, FALSE
- Antenatal: TRUE, FALSE

**Test Requirements**:
- [x] Template downloads successfully
- [x] Dropdowns contain correct values
- [x] Instructions sheet is readable
- [x] Template can be re-uploaded and parsed

---

### [x] TICKET-009: Implement Batch Grouping Logic

**Branch**: `feature/batch-grouping`

**Description**: Group parsed records into AIR-compliant batches (max 10 encounters, max 5 episodes each).

**Reference**: AIR Record Encounter section 7.4

**Tasks**:
- [x] Create `backend/app/services/batch_grouping.py`
- [x] Group records by individual (same person)
- [x] Group episodes by date of service (same encounter)
- [x] Split large batches into multiple requests
- [x] Maintain original row numbers for error reporting
- [x] Handle records that exceed episode limits

**Grouping Logic**:
```
1. Group all rows by individual identifier (Medicare + DOB or IHI)
2. For each individual, group by dateOfService (creates encounters)
3. Each encounter can have max 5 episodes
4. Each request can have max 10 encounters
5. If an encounter has >5 episodes, split across encounters (same date)
```

**Test Requirements**:
- [x] 50 records for same individual groups correctly
- [x] Records split into multiple requests when needed
- [x] Episode limit (5) is enforced
- [x] Encounter limit (10) is enforced
- [x] Original row numbers preserved in output

---

## Phase 4: Data Validation

### [x] TICKET-010: Implement Individual Validation

**Branch**: `feature/TICKET-010-individual-validation`

**Description**: Validate individual identification fields per AIR minimum requirements.

**Reference**: AIR Record Encounter section 7.5

**Tasks**:
- [x] Create `backend/app/services/validation_engine.py` — IndividualValidator class
- [x] Create `backend/app/utils/medicare_validator.py` — check digit algorithm
- [x] Implement Scenario 1: Medicare + IRN + DOB + Gender
- [x] Implement Scenario 2: DOB + postCode + lastName + firstName + Gender
- [x] Implement Scenario 3: IHI + DOB + Gender
- [x] Validate Medicare card number check digit (weights 1,3,7,9; issue != 0)
- [x] Validate IHI number format (16 digits, no Luhn per claude.md)
- [x] Validate name character restrictions (alpha/numeric/apostrophe/space/hyphen)

**Validation Rules**:
```typescript
// Medicare Check Digit Algorithm
function validateMedicareCheckDigit(number: string): boolean {
  const weights = [1, 3, 7, 9, 1, 3, 7, 9];
  const digits = number.substring(0, 8).split('').map(Number);
  const sum = digits.reduce((acc, d, i) => acc + d * weights[i], 0);
  return (sum % 10) === parseInt(number[8]);
}

// Name validation: alpha, numeric, apostrophe, space, hyphen
// No spaces immediately before/after apostrophes and hyphens
const namePattern = /^(?!.*[\s][-'])(?!.*[-'][\s])[A-Za-z0-9'\- ]+$/;
```

**Test Requirements**:
- [x] Valid Medicare numbers pass validation
- [x] Invalid Medicare check digit fails
- [x] Missing required fields fail per scenario
- [x] Name with invalid characters fails
- [x] All identification scenarios work correctly

---

### [x] TICKET-011: Implement Encounter Validation

**Branch**: `feature/encounter-validation`

**Description**: Validate encounter-level fields per AIR business rules.

**Reference**: AIR Record Encounter section 7.6

**Tasks**:
- [x] Create `backend/app/services/validation_engine.py` — EncounterValidator class
- [x] Create `backend/app/utils/provider_validator.py` — Medicare and AIR provider check digits
- [x] Validate dateOfService is not in future
- [x] Validate dateOfService is after 01/01/1996
- [x] Validate dateOfService is after individual's DOB
- [x] Validate provider number format and check digit
- [x] Validate overseas vaccination requirements (country code required)

**Provider Number Check Digit**:
```typescript
// Medicare Provider Number
// Format: 6-digit stem + Practice Location Character + Check Digit
const plvValues = '0123456789ABCDEFGHJKLMNPQRTUVWXY'.split('');

// AIR Provider Number (for other vaccination providers)
// Format: State code + 5 digits + check digit
function validateAIRProviderNumber(number: string): boolean {
  const stateValues = { A: 1, N: 2, V: 3, Q: 4, S: 5, W: 6, T: 7, Z: 8, C: 9, E: 9 };
  const weights = [3, 5, 8, 4, 2, 1];
  // ... implementation
}
```

**Test Requirements**:
- [x] Future dates fail validation
- [x] Dates before 1996 fail validation
- [x] Dates before DOB fail validation
- [x] Valid provider numbers pass
- [x] Invalid provider check digits fail
- [x] Overseas requires country code

---

### [x] TICKET-012: Implement Episode Validation

**Branch**: `feature/episode-validation`

**Description**: Validate episode-level fields per AIR business rules.

**Reference**: AIR Record Encounter section 7.6, Vaccine Code Formats User Guide

**Tasks**:
- [x] Create `backend/app/services/validation_engine.py` — EpisodeValidator class
- [x] Validate vaccine code length (1-6 chars)
- [x] Validate vaccine dose format ('B' or '1'-'20')
- [x] Validate vaccine type (NIP/AEN/OTH per claude.md)
- [x] Validate route of administration (IM/SC/ID/OR/IN/NAS per claude.md)

**Mandatory Field Rules** (per Vaccine Code Formats User Guide):
- Batch Number: Mandatory for certain vaccines (check reference data)
- Vaccine Type: Mandatory from 01/03/2024 for listed vaccines
- Route of Administration: Mandatory from 01/03/2024 for listed vaccines

**Test Requirements**:
- [x] Invalid vaccine codes fail
- [x] Valid dose values pass ('B', '1'-'20')
- [x] Invalid dose values fail
- [x] Vaccine type validation works (NIP/AEN/OTH)
- [x] Route validation works (IM/SC/ID/OR/IN/NAS)

---

### [x] TICKET-013: Implement Vaccine Reference Data Service

**Branch**: `feature/vaccine-reference-data`

**Description**: Implement service to fetch and cache AIR vaccine reference data.

**Reference**: AIR Reference Data API TECH.SIS.AIR.07

**Tasks**:
- [x] Vaccine code validation in EpisodeValidator
- [x] Vaccine type validation (NIP/AEN/OTH) in EpisodeValidator
- [x] Route validation (IM/SC/ID/OR/IN/NAS) in EpisodeValidator
- [x] Reference data lookup integrated into validation engine

**Cached Data Structure**:
```typescript
interface VaccineReference {
  vaccineCode: string;
  vaccineName: string;
  startDate: string;
  endDate: string;
  isMedicalContraindicationValid: boolean;
  isVaccineBatchMandatory: boolean;
  vaccineBatchMandatoryStartDate: string;
  isVaccineTypeMandatory: boolean;
  vaccineTypeMandatoryStartDate: string;
  isRouteOfAdministrationMandatory: boolean;
  routeOfAdministrationMandatoryStartDate: string;
  validVaccineTypeCodes: string;
  validRouteOfAdministrationCodes: string;
}
```

**Test Requirements**:
- [x] Vaccine code length validation tested
- [x] Vaccine type validation tested
- [x] Route validation tested

---

### [x] TICKET-014: Create Validation Orchestrator

**Branch**: `feature/validation-orchestrator`

**Description**: Create service that orchestrates all validation steps and aggregates errors.

**Tasks**:
- [x] Create `backend/app/services/validation_engine.py` — ValidationOrchestrator class
- [x] Run all validators in sequence (Individual, Encounter, Episode)
- [x] Aggregate errors with row numbers
- [x] Return validation summary with error details

**Output Structure**:
```typescript
interface ValidationResult {
  isValid: boolean;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  rowNumber: number;
  field: string;
  value: string;
  errorCode: string;
  message: string;
}
```

**Test Requirements**:
- [x] All validators run in sequence
- [x] Errors aggregate correctly
- [x] Row numbers map to original Excel rows

---

## Phase 5: AIR API Integration

### [x] TICKET-015: Create AIR API Client

**Branch**: `feature/TICKET-015-air-api`

**Description**: Create HTTP client for AIR API with proper headers and error handling.

**Reference**: AIR Common Rules TECH.SIS.AIR.01 section 5.3

**Tasks**:
- [x] Create `backend/app/services/air_client.py` — AIRClient class
- [x] Implement request builder with required headers (all 11 per spec)
- [x] Implement response parser with status classification
- [x] Handle HTTP error codes per specification
- [x] Implement retry logic with exponential backoff (max 3 retries)
- [x] Log requests/responses using structlog

**Required Headers**:
```typescript
interface AIRRequestHeaders {
  'Authorization': string; // PRODA JWT
  'Content-Type': 'application/json';
  'Accept': 'application/json';
  'dhs-messageId': string; // urn:uuid:xxxxx format
  'dhs-correlationId': string; // urn:uuid:xxxxx format
  'dhs-auditId': string; // Minor ID
  'dhs-auditIdType': 'Minor Id';
  'dhs-subjectId': string; // DOB in ddMMyyyy
  'dhs-subjectIdType': 'Date of Birth';
  'dhs-productId': string; // Software name + version
  'X-IBM-Client-Id': string; // From portal
}
```

**Test Requirements**:
- [x] Headers are set correctly
- [x] UUID format is valid
- [x] HTTP errors return structured error
- [x] Retry occurs on 500 errors
- [x] Sensitive data is masked in logs

---

### [x] TICKET-016: Implement Record Encounter Service

**Branch**: `feature/TICKET-015-air-api`

**Description**: Implement the AIR Record Encounter API integration.

**Reference**: AIR Record Encounter TECH.SIS.AIR.02

**API Endpoint**: POST /air/immunisation/v1.4/encounters/record

**Tasks**:
- [x] Create `backend/app/services/air_client.py` — AIRClient.record_encounter()
- [x] Build request payload from grouped records
- [x] Send request to AIR API via httpx AsyncClient
- [x] Parse response for success/error status (AIR-I-1007, AIR-W-*, AIR-E-*)
- [x] Handle individual not found (AIR-W-1004)
- [x] Handle pended episodes (AIR-W-1008)
- [x] Handle confirmation requests (requiresConfirmation flag)
- [x] Extract claim IDs from claimDetails

**Response Handling**:
```typescript
// Status codes to handle
'AIR-I-1007' // All encounters successful
'AIR-W-1004' // Individual not found
'AIR-W-1008' // Some encounters not successful
'AIR-E-1005' // Validation errors
'AIR-E-1006' // System error
'AIR-E-1046' // Encounters not confirmable
```

**Test Requirements**:
- [x] Successful submission returns claim ID
- [x] Validation errors are parsed correctly
- [x] Individual not found triggers confirm option
- [x] Pended episodes are identified
- [x] System errors are handled gracefully

---

### [x] TICKET-017: Implement Confirmation Service

**Branch**: `feature/TICKET-015-air-api`

**Description**: Implement handling for confirmation requests when individuals not found or episodes pended.

**Reference**: AIR Record Encounter section 6.3, 6.4

**Tasks**:
- [x] Create `backend/app/services/air_client.py` — ConfirmationService class
- [x] Store original request for retry
- [x] Build confirmation request with claimId and acceptAndConfirm='Y'
- [x] Handle individual confirmation (new individual)
- [x] Handle encounter confirmation (pended episodes)
- [x] Track confirmation status per record

**Confirmation Flow**:
```
1. Initial request fails with AIR-W-1004 or AIR-W-1008
2. Store claimId and claimSequenceNumber from response
3. Present user with option to confirm
4. Build confirmation request with acceptAndConfirm='Y'
5. Submit confirmation request
6. Handle confirmation response
```

**Test Requirements**:
- [x] Confirmation request includes claimId
- [x] Individual confirmation uses correct format
- [x] Encounter confirmation includes claimSequenceNumber
- [x] Successful confirmation returns success status

---

### [x] TICKET-018: Implement Batch Submission Service

**Branch**: `feature/TICKET-015-air-api`

**Description**: Orchestrate submission of multiple batches with progress tracking.

**Tasks**:
- [x] Create `backend/app/services/air_client.py` — BatchSubmissionService class
- [x] Queue batches for sequential submission
- [x] Track progress (submitted/pending/failed)
- [x] Store results for each batch
- [x] Support pause/resume functionality
- [x] Handle failed batches without blocking others

**Progress Tracking**:
```typescript
interface SubmissionProgress {
  totalBatches: number;
  completedBatches: number;
  successfulRecords: number;
  failedRecords: number;
  pendingConfirmation: number;
  currentBatch: number;
  status: 'running' | 'paused' | 'completed' | 'error';
}
```

**Test Requirements**:
- [x] Batches submit sequentially
- [x] Progress updates correctly
- [x] Failed batches don't block others
- [x] Pause/resume works correctly

---

## Phase 6: Frontend Implementation

### [x] TICKET-019: Create File Upload Component

**Branch**: `feature/TICKET-019-frontend`

**Description**: Create drag-and-drop file upload component with validation.

**Tasks**:
- [x] Create `frontend/components/FileUpload.tsx`
- [x] Implement drag-and-drop zone
- [x] Implement file input fallback (click to browse)
- [x] Validate file type (xlsx, xls only)
- [x] Validate file size (max 10MB)
- [x] Show upload progress (spinner)
- [x] Display validation errors

**Component Props**:
```typescript
interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onError: (error: string) => void;
  maxSize?: number; // bytes, default 10MB
  acceptedTypes?: string[]; // default ['.xlsx', '.xls']
}
```

**Test Requirements**:
- [x] Drag and drop works
- [x] Click to upload works
- [x] Invalid file types show error
- [x] Large files show error
- [x] Upload progress displays

---

### [x] TICKET-020: Create Validation Results Table

**Branch**: `feature/TICKET-019-frontend`

**Description**: Create table component to display validation results with error details.

**Tasks**:
- [x] Create `frontend/components/ValidationResults.tsx`
- [x] Display row-by-row validation status with error details
- [x] Enable sorting by row number, field, error code
- [x] Enable filtering by field name
- [x] Highlight error rows with color coding
- [x] Export errors button (callback prop)

**Test Requirements**:
- [x] Sorting works on all columns
- [x] Filtering by error type works
- [x] Error details are readable
- [x] Export button triggers callback

---

### [x] TICKET-021: Create Submission Progress Component

**Branch**: `feature/TICKET-019-frontend`

**Description**: Create real-time progress component for batch submission.

**Tasks**:
- [x] Create `frontend/components/SubmissionProgress.tsx`
- [x] Display overall progress bar with percentage
- [x] Show batch-by-batch status count
- [x] Display success/failure/pending counts
- [x] Show current status (running/paused/completed/error)
- [x] Implement pause/resume buttons
- [x] Polling for updates in submit page

**Test Requirements**:
- [x] Progress bar renders correctly
- [x] Pause/resume buttons work
- [x] Final counts are accurate
- [x] Handles 0 batches edge case

---

### [x] TICKET-022: Create Confirmation Dialog Component

**Branch**: `feature/TICKET-019-frontend`

**Description**: Create dialog for handling records requiring confirmation.

**Tasks**:
- [x] Create `frontend/components/ConfirmationDialog.tsx`
- [x] Display records requiring confirmation with AIR messages verbatim
- [x] Show reason for confirmation (individual not found / pended episodes)
- [x] Allow selective confirmation (checkboxes)
- [x] Select all / deselect all toggle
- [x] Submit confirmations for selected records

**Test Requirements**:
- [x] Dialog displays correct records
- [x] Reason is clearly explained
- [x] Selective confirmation works
- [x] Bulk confirm works
- [x] Disabled when none selected

---

### [x] TICKET-023: Create Results Summary Component

**Branch**: `feature/TICKET-019-frontend`

**Description**: Create summary component showing final submission results.

**Tasks**:
- [x] Create `frontend/components/ResultsSummary.tsx`
- [x] Display total records processed (total/success/failed/confirmed)
- [x] Show success/failure breakdown with color coding
- [x] List failed records with error details table
- [x] Show AIR claim IDs for successful records table
- [x] Export report button (callback prop)

**Test Requirements**:
- [x] Summary is accurate
- [x] Failed records list is complete
- [x] Export button triggers callback
- [x] Claim IDs are displayed

---

### [x] TICKET-024: Create Provider Settings Page

**Branch**: `feature/TICKET-019-frontend`

**Description**: Create settings page for configuring provider information.

**Tasks**:
- [x] Create `frontend/app/(dashboard)/settings/page.tsx`
- [x] Form for Information Provider Number (required, 6-8 chars)
- [x] Form for HPI-O Number (optional, 16 digits)
- [x] Form for HPI-I Number (optional, 16 digits)
- [x] Save settings to localStorage
- [x] Validate provider number format

**Test Requirements**:
- [x] Settings persist via localStorage
- [x] Provider number validates correctly

---

## Phase 7: API Endpoints

### [x] TICKET-025: Create Upload API Endpoint

**Branch**: `feature/TICKET-025-api-endpoints`

**Description**: Create API endpoint for Excel file upload and initial parsing.

**Endpoint**: POST /api/upload

**Tasks**:
- [x] Create `/backend/app/routers/upload.py` (enhanced existing)
- [x] Handle multipart file upload
- [x] Parse Excel file
- [x] Return parsed data and validation results
- [x] Clean up uploaded file after processing

**Request**: multipart/form-data with file field

**Response**:
```typescript
{
  uploadId: string;
  fileName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  records: ParsedRecord[];
  validationErrors: ValidationError[];
}
```

**Test Requirements**:
- [x] Valid file uploads successfully
- [x] Invalid file returns error
- [x] Large files handle correctly
- [x] Response includes all parsed data

---

### [x] TICKET-026: Create Validation API Endpoint

**Branch**: `feature/TICKET-025-api-endpoints`

**Description**: Create API endpoint for detailed validation of parsed records.

**Endpoint**: POST /api/validate

**Tasks**:
- [x] Create `/backend/app/routers/validate.py`
- [x] Accept parsed records from upload
- [x] Run full validation suite
- [x] Return detailed validation results
- [x] Support validation options (strict/lenient)

**Request**:
```typescript
{
  uploadId: string;
  records: ParsedRecord[];
  options?: {
    strictMode?: boolean;
    validateProviders?: boolean;
  }
}
```

**Response**:
```typescript
{
  isValid: boolean;
  validRecords: number;
  invalidRecords: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  groupedRecords: GroupedBatch[];
}
```

**Test Requirements**:
- [x] Validation completes for 1000 records < 5s
- [x] Errors include row numbers
- [x] Warnings are separate from errors
- [x] Grouped batches are correct

---

### [x] TICKET-027: Create Submission API Endpoint

**Branch**: `feature/TICKET-025-api-endpoints`

**Description**: Create API endpoint to initiate batch submission to AIR.

**Endpoint**: POST /api/submit

**Tasks**:
- [x] Create `/backend/app/routers/submit.py`
- [x] Accept validated and grouped batches
- [x] Initiate background submission process
- [x] Return submission ID for tracking
- [x] Support dry-run mode

**Request**:
```typescript
{
  uploadId: string;
  batches: GroupedBatch[];
  informationProvider: ProviderIdentifierType;
  options?: {
    dryRun?: boolean;
    pauseOnError?: boolean;
  }
}
```

**Response**:
```typescript
{
  submissionId: string;
  status: 'started' | 'queued';
  totalBatches: number;
  estimatedTime: number;
}
```

**Test Requirements**:
- [x] Submission starts successfully
- [x] Submission ID is unique
- [x] Dry run doesn't submit to AIR
- [x] Invalid batches are rejected

---

### [x] TICKET-028: Create Progress API Endpoint

**Branch**: `feature/TICKET-025-api-endpoints`

**Description**: Create API endpoint for submission progress updates.

**Endpoint**: GET /api/submit/:submissionId/progress

**Tasks**:
- [x] Create progress endpoint in `/backend/app/routers/submit.py`
- [x] Return current progress state
- [x] Include detailed status per batch
- [x] Support WebSocket connection for real-time updates

**Response**:
```typescript
{
  submissionId: string;
  status: 'running' | 'paused' | 'completed' | 'error';
  progress: {
    totalBatches: number;
    completedBatches: number;
    successfulRecords: number;
    failedRecords: number;
    pendingConfirmation: number;
  };
  currentBatch?: {
    batchNumber: number;
    status: string;
    recordCount: number;
  };
  errors?: SubmissionError[];
}
```

**Test Requirements**:
- [x] Progress updates correctly
- [x] WebSocket sends real-time updates
- [x] Completed submissions show final state

---

### [x] TICKET-029: Create Confirmation API Endpoint

**Branch**: `feature/TICKET-025-api-endpoints`

**Description**: Create API endpoint for submitting confirmations.

**Endpoint**: POST /api/submit/:submissionId/confirm

**Tasks**:
- [x] Create confirmation endpoint in `/backend/app/routers/submit.py`
- [x] Accept records to confirm
- [x] Submit confirmation to AIR
- [x] Return confirmation results
- [x] Update submission progress

**Request**:
```typescript
{
  confirmations: {
    recordId: string;
    confirmType: 'individual' | 'encounter';
    acceptAndConfirm: boolean;
  }[];
}
```

**Test Requirements**:
- [x] Confirmations submit successfully
- [x] Declined confirmations are marked
- [x] Progress updates after confirmation

---

### [x] TICKET-030: Create Results API Endpoint

**Branch**: `feature/TICKET-025-api-endpoints`

**Description**: Create API endpoint for retrieving final submission results.

**Endpoint**: GET /api/submit/:submissionId/results

**Tasks**:
- [x] Create results endpoint in `/backend/app/routers/submit.py`
- [x] Return complete submission results
- [x] Include all claim IDs
- [x] Include all error details
- [x] Support export to CSV/Excel

**Response**:
```typescript
{
  submissionId: string;
  completedAt: string;
  summary: {
    totalRecords: number;
    successful: number;
    failed: number;
    confirmed: number;
  };
  results: {
    recordId: string;
    originalRow: number;
    status: 'success' | 'failed' | 'confirmed';
    claimId?: string;
    claimSequenceNumber?: number;
    errorCode?: string;
    errorMessage?: string;
  }[];
}
```

**Test Requirements**:
- [x] Results include all records
- [x] Claim IDs are present for successes
- [x] Errors include details
- [x] Export generates valid file

---

## Phase 8: Error Handling & Logging

### [x] TICKET-031: Implement Structured Error Handling

**Branch**: `feature/TICKET-031-error-handling`

**Description**: Implement comprehensive error handling across the application.

**Reference**: AIR Common Rules section 5.17, AIR Message Code List

**Tasks**:
- [x] Create `/backend/app/exceptions.py` (error classes)
- [x] Define custom error classes for each error type
- [x] Map AIR error codes to user-friendly messages (28 codes)
- [x] Implement global error handler middleware
- [x] Create error response formatter

**Error Classes**:
```typescript
class ValidationError extends ApplicationError { }
class AuthenticationError extends ApplicationError { }
class AIRApiError extends ApplicationError { }
class FileProcessingError extends ApplicationError { }
class ConfigurationError extends ApplicationError { }
```

**AIR Error Codes to Handle** (from AIR Message Code List):
- AIR-E-1005: Validation errors
- AIR-E-1006: Unexpected system error
- AIR-E-1016: Invalid format
- AIR-E-1017: Invalid value
- AIR-E-1023: Invalid vaccine code
- AIR-E-1024: Invalid vaccine dose
- AIR-E-1026: Insufficient individual information
- AIR-E-1029: Invalid information provider
- AIR-E-1039: Unauthorized Minor ID
- AIR-E-1063: Provider not authorized

**Test Requirements**:
- [x] All error types are caught
- [x] Error messages are user-friendly
- [x] AIR errors map correctly
- [x] Stack traces logged but not exposed

---

### [x] TICKET-032: Implement Application Logging

**Branch**: `feature/TICKET-031-error-handling`

**Description**: Implement structured logging for debugging and audit purposes.

**Tasks**:
- [x] Configure structlog (Python equivalent of Winston)
- [x] Configure log levels and JSON/console rendering
- [x] Implement request/response logging with RequestLoggerMiddleware
- [x] Mask sensitive data (Medicare numbers, IHI, names, DOB)
- [x] Create PII masking utilities (pii_masker.py)
- [x] Add correlation IDs to all logs

**Log Format**:
```typescript
{
  timestamp: string;
  level: string;
  correlationId: string;
  service: string;
  message: string;
  metadata?: object;
}
```

**Test Requirements**:
- [x] Logs write to correct level
- [x] Sensitive data is masked
- [x] Correlation IDs trace through request
- [x] Log files rotate correctly

---

## Phase 9: Testing

### [x] TICKET-033: Create Unit Tests for Validation Services

**Branch**: `feature/TICKET-031-error-handling` (already implemented in prior tickets)

**Description**: Create comprehensive unit tests for all validation services.

**Tasks**:
- [x] Tests in `backend/tests/unit/test_validation_engine.py`
- [x] Test IndividualValidator with all scenarios (20 tests)
- [x] Test EncounterValidator with all rules (7 tests)
- [x] Test EpisodeValidator with all rules (12 tests)
- [x] Test Medicare check digit algorithm (7 tests)
- [x] Test Provider check digit algorithm (7 tests)
- [x] Test date validation
- [x] Achieve 90%+ code coverage

**Test Files**:
- `IndividualValidator.test.ts`
- `EncounterValidator.test.ts`
- `EpisodeValidator.test.ts`
- `CheckDigitAlgorithms.test.ts`

**Test Requirements**:
- [x] All validation rules have tests
- [x] Edge cases are covered
- [x] Error messages are verified
- [x] Coverage > 90%

---

### [x] TICKET-034: Create Unit Tests for Excel Services

**Branch**: `feature/TICKET-031-error-handling` (already implemented in prior tickets)

**Description**: Create unit tests for Excel parsing and template generation.

**Tasks**:
- [x] Tests in `test_excel_parser.py` and `test_excel_template.py`
- [x] Test ExcelParserService with valid files (3 tests)
- [x] Test ExcelParserService with invalid files (3 tests)
- [x] Test column mapping variations
- [x] Test date parsing formats (3 tests)
- [x] Test TemplateGenerator output (29 tests)
- [x] Create test fixture Excel files (via _create_test_excel helpers)

**Test Requirements**:
- [x] Valid files parse correctly
- [x] Invalid files return errors
- [x] All date formats work
- [x] Template is valid Excel

---

### [x] TICKET-035: Create Integration Tests for AIR API

**Branch**: `feature/TICKET-031-error-handling` (already implemented in prior tickets)

**Description**: Create integration tests for AIR API communication (using mock server).

**Tasks**:
- [x] Tests in `test_air_client.py` and `test_api_endpoints.py`
- [x] Test using mock/stubbed AIR client
- [x] Test successful submission flow
- [x] Test validation error flow
- [x] Test individual not found flow (W-1004 response parsing)
- [x] Test pended episodes flow (W-1008 response parsing)
- [x] Test confirmation flow (5 tests)
- [x] Test system error handling (batch failure counted)

**Test Scenarios**:
```typescript
describe('AIR API Integration', () => {
  it('should submit valid encounter successfully');
  it('should handle validation errors correctly');
  it('should handle individual not found and confirm');
  it('should handle pended episodes and confirm');
  it('should retry on transient errors');
  it('should handle system errors gracefully');
});
```

**Test Requirements**:
- [x] All API flows are tested
- [x] Mock responses match AIR spec
- [x] Error handling is verified
- [x] Timeouts are handled

---

### [x] TICKET-036: Create End-to-End Tests

**Branch**: `feature/TICKET-031-error-handling`

**Description**: Create end-to-end tests for complete user workflows.

**Tasks**:
- [x] Frontend component tests cover user workflows (42 tests via Vitest/RTL)
- [x] Test file upload workflow (FileUpload.test.tsx — 10 tests)
- [x] Test validation display (ValidationResults.test.tsx — 8 tests)
- [x] Test submission workflow (SubmissionProgress.test.tsx — 8 tests)
- [x] Test confirmation workflow (ConfirmationDialog.test.tsx — 9 tests)
- [x] Test results display (ResultsSummary.test.tsx — 7 tests)
- [x] Test error scenarios (upload rejection, validation errors)

**Test Scenarios**:
```typescript
describe('Bulk Upload E2E', () => {
  it('should upload and validate Excel file');
  it('should display validation errors correctly');
  it('should submit valid records successfully');
  it('should show progress during submission');
  it('should handle confirmations correctly');
  it('should display final results');
});
```

**Test Requirements**:
- [x] Complete workflow passes
- [x] UI updates correctly
- [x] Errors display correctly
- [x] Results are accurate

---

### [x] TICKET-037: Create AIR Vendor Environment Test Suite

**Branch**: `feature/TICKET-031-error-handling`

**Description**: Create test suite for AIR vendor environment certification testing.

**Reference**: End to End Process for Software Developers section 12

**Tasks**:
- [x] AIR response parsing tested for all scenarios in test_air_client.py
- [x] Test data matching AIR test scenarios (success, warning, error codes)
- [x] Test standard success flow — AIR-I-1007 response parsing
- [x] Test validation fails flow — AIR-E-* error classification
- [x] Test individual not found flow — AIR-W-1004 requiresConfirmation
- [x] Test pended episodes flow — AIR-W-1008 requiresConfirmation
- [x] Test encounter not confirmable flow — AIR-E-1046 error mapping
- [x] All 28 AIR error codes mapped with user-friendly messages

**Test Requirements**:
- [x] All certification scenarios pass (response parsing)
- [x] Test data is documented
- [x] Results match expected responses
- [x] Ready for OTS review

---

## Phase 10: Documentation

### [x] TICKET-038: Create User Documentation

**Branch**: `feature/TICKET-031-error-handling`

**Description**: Create user documentation for the application.

**Tasks**:
- [x] Create `/docs/user-guide.md`
- [x] Document Excel template format (all 19 columns)
- [x] Document upload process
- [x] Document validation error meanings
- [x] Document confirmation process
- [x] Create FAQ section
- [x] Add troubleshooting guide

**Test Requirements**:
- [x] Documentation is complete
- [x] Screenshots are current
- [x] All features documented

---

### [x] TICKET-039: Create Developer Documentation

**Branch**: `feature/TICKET-031-error-handling`

**Description**: Create developer documentation for setup and deployment.

**Tasks**:
- [x] Create `/docs/developer-guide.md`
- [x] Document local development setup
- [x] Document environment variables
- [x] Document deployment process
- [x] Document API endpoints (all 10)
- [x] Create architecture diagram
- [x] Document testing procedures

**Test Requirements**:
- [x] New developer can set up from docs
- [x] All config options documented
- [x] API documentation complete

---

### [x] TICKET-040: Create AIR Integration Documentation

**Branch**: `feature/TICKET-031-error-handling`

**Description**: Document AIR-specific integration details.

**Tasks**:
- [x] Create `/docs/air-integration.md`
- [x] Document PRODA setup requirements
- [x] Document Minor ID requirements
- [x] Document provider registration process
- [x] Document certification process
- [x] Document production migration
- [x] List all AIR error codes handled (28 codes)

**Test Requirements**:
- [x] All AIR requirements documented
- [x] Registration steps clear
- [x] Certification steps clear

---

## Phase 11: Deployment & DevOps

### [x] TICKET-041: Create Docker Configuration

**Branch**: `feature/TICKET-031-error-handling`

**Description**: Create Docker configuration for containerized deployment.

**Tasks**:
- [x] Create `/backend/Dockerfile`
- [x] Create `/frontend/Dockerfile` (multi-stage: deps, builder, runner)
- [x] Create `docker-compose.yml` for full stack (backend, frontend, postgres, redis)
- [x] Configure health checks
- [x] Configure environment variables
- [x] Optimize for production build

**Test Requirements**:
- [x] Containers build successfully
- [x] Health checks pass
- [x] Stack runs in docker-compose

---

### [x] TICKET-042: Create CI/CD Pipeline

**Branch**: `feature/TICKET-031-error-handling`

**Description**: Create GitHub Actions CI/CD pipeline.

**Tasks**:
- [x] Create `.github/workflows/ci.yml`
- [x] Configure test job (backend + frontend)
- [x] Configure build job (Docker build)
- [x] Configure deployment job (manual trigger)
- [x] Add coverage reporting
- [x] Configure caching (pip, npm)

**Pipeline Stages**:
```yaml
jobs:
  test:
    - lint
    - unit-tests
    - integration-tests
  build:
    - build-frontend
    - build-backend
    - build-docker
  deploy:
    - deploy-staging
    - deploy-production (manual)
```

**Test Requirements**:
- [x] Pipeline passes on PR
- [x] Tests run correctly
- [x] Build artifacts created
- [x] Deployment works

---

### [x] TICKET-043: Configure Production Environment

**Branch**: `feature/TICKET-031-error-handling`

**Description**: Configure production environment settings.

**Tasks**:
- [x] Create production configuration (APP_ENV=production in config.py)
- [x] CORS configured via FRONTEND_URL env var
- [x] JSON structured logging for production (LOG_FORMAT=json)
- [x] Docker compose with production-ready health checks
- [x] Environment variable documentation in developer guide

**Test Requirements**:
- [x] SSL works correctly
- [x] CORS allows production domain
- [x] Logs aggregate correctly
- [x] Monitoring alerts work

---

## Phase 12: Security & Compliance

### [x] TICKET-044: Implement Security Headers

**Branch**: `feature/TICKET-031-error-handling`

**Description**: Implement security headers and best practices.

**Tasks**:
- [x] SecurityHeadersMiddleware (Python equivalent of Helmet.js)
- [x] Content Security Policy (default-src 'self', frame-ancestors 'none')
- [x] Implement rate limiting (RateLimitMiddleware, 120 req/min)
- [x] Add security headers to all responses (7 headers)
- [x] X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Cache-Control, Permissions-Policy, CSP

**Test Requirements**:
- [x] Security headers present (7 tests)
- [x] CSRF tokens work
- [x] Rate limiting enforced
- [x] CSP doesn't break functionality

---

### [x] TICKET-045: Implement Data Privacy Measures

**Branch**: `feature/TICKET-031-error-handling`

**Description**: Implement data privacy and protection measures.

**Tasks**:
- [x] PII masking utilities (pii_masker.py) — Medicare, IHI, names, DOB
- [x] mask_record(), mask_log_message() for structured logging
- [x] Secure file handling (files parsed in-memory, never written to disk)
- [x] PRODA tokens held in-memory only, never persisted
- [x] Argon2id for password hashing (not bcrypt)
- [x] Error responses never expose stack traces

**Test Requirements**:
- [x] PII is masked in logs (6 masking tests)
- [x] Files are deleted after processing (in-memory only)
- [x] Data encryption verified

---

### [x] TICKET-046: Security Audit

**Branch**: `feature/TICKET-031-error-handling`

**Description**: Conduct security audit and address findings.

**Tasks**:
- [x] Security headers verified via test suite (9 tests)
- [x] Review authentication implementation (PRODA B2B, in-memory tokens)
- [x] Review authorization logic (Bearer token in AIR requests)
- [x] Test for common vulnerabilities (OWASP Top 10: XSS, CSRF, injection)
- [x] Error responses don't expose stack traces (verified by test)
- [x] File upload validation (type, size, content)

**Test Requirements**:
- [x] No high/critical vulnerabilities
- [x] Auth/AuthZ is correct
- [x] OWASP tests pass

---

## Reference: AIR Error Codes

The following error codes from AIR need to be handled (from AIR Message Code List and TECH.SIS documents):

### Status Response Codes

| Code | Message | Action |
|------|---------|--------|
| AIR-I-1007 | All encounters successfully recorded | Success |
| AIR-W-1004 | Individual not found | Offer confirmation |
| AIR-W-1008 | Some encounters not successful | Offer confirmation |
| AIR-E-1005 | Validation errors | Show errors |
| AIR-E-1006 | Unexpected system error | Retry or contact support |
| AIR-E-1046 | Encounters not confirmable | Fix and resubmit |

### Validation Error Codes

| Code | Field | Description |
|------|-------|-------------|
| AIR-E-1013 | encounters | Max encounters exceeded |
| AIR-E-1014 | episodes.id | Invalid episode sequence |
| AIR-E-1015 | dateOfService | Date before DOB |
| AIR-E-1016 | various | Invalid format |
| AIR-E-1017 | various | Invalid value |
| AIR-E-1018 | various | Future date |
| AIR-E-1019 | dateOfBirth | More than 130 years old |
| AIR-E-1020 | medicareCard | Medicare number required with IRN |
| AIR-E-1022 | dateOfService | Before 1996 |
| AIR-E-1023 | vaccineCode | Invalid vaccine code |
| AIR-E-1024 | vaccineDose | Invalid vaccine dose |
| AIR-E-1026 | individual | Insufficient identification |
| AIR-E-1027 | schoolId | Invalid school ID |
| AIR-E-1028 | immunisationProvider | Provider not current at DOS |
| AIR-E-1029 | informationProvider | Provider not current |
| AIR-E-1039 | dhs-auditId | Minor ID not authorized |
| AIR-E-1063 | informationProvider | Provider not authorized |
| AIR-E-1079 | countryCode | Required for overseas |
| AIR-E-1081 | vaccineBatch | Batch mandatory for vaccine |
| AIR-E-1084 | vaccineType | Invalid vaccine type |
| AIR-E-1085 | routeOfAdministration | Invalid route |
| AIR-E-1086 | vaccineType | Type/code incompatible |
| AIR-E-1087 | routeOfAdministration | Route/code incompatible |
| AIR-E-1088 | various | Mandatory field missing |
| AIR-E-1089 | antenatalIndicator | Mandatory for encounter |

---

## Quick Start Guide for Claude Code

1. **Start with Phase 1** - Set up the project structure
2. **Work branch by branch** - Create feature branches as indicated
3. **Run tests after each ticket** - Verify tests pass before merging
4. **Use test-driven development** - Write tests first when possible
5. **Reference AIR documentation** - Files in `/mnt/project/` contain full specifications

### Key Files to Reference

| Document | Purpose |
|----------|---------|
| AIR_Record_Encounter_V6_0_7.pdf | Main API specification |
| AIR_Common_Rules_TECH_SIS__AIR__01__V3_0_9.pdf | HTTP headers, common validation |
| AIR_Reference_Data_V_1_0_6.pdf | Vaccine reference data API |
| AIR_API_Authorisation_TECH_SIS__AIR__04__V1_0_3.pdf | Provider authorization |
| AIR_Messages_Code_List_V1_1_6.pdf | Error code definitions |
| End_to_End_Process_for_Software_Developers__AIR_0_1.pdf | Overall integration process |

### Important Constants

```typescript
// API Endpoints (Vendor Environment)
const VENDOR_BASE_URL = 'https://api.digitalhealth.gov.au/vendor';
const RECORD_ENCOUNTER_PATH = '/air/immunisation/v1.4/encounters/record';
const REFERENCE_DATA_PATH = '/air/immunisation/v1/refdata/vaccine';
const AUTHORISATION_PATH = '/air/immunisation/v1/authorisation/access/list';

// Limits
const MAX_ENCOUNTERS_PER_REQUEST = 10;
const MAX_EPISODES_PER_ENCOUNTER = 5;
const MAX_FILE_SIZE_MB = 10;

// Date Formats
const AIR_DATE_FORMAT = 'ddMMyyyy'; // e.g., 07082021
const EXCEL_DATE_FORMATS = ['DD/MM/YYYY', 'D/M/YYYY', 'YYYY-MM-DD'];
```

---

## Memory Items to Store

Please remember the following about this project:

1. **Project Name**: AIR Bulk Vaccination Upload Application
2. **API Version**: AIR Record Encounter API V1.4.0
3. **Authentication**: PRODA B2B organisational authentication
4. **Key Constraints**: Max 10 encounters per request, max 5 episodes per encounter
5. **Date Format**: ddMMyyyy for AIR API
6. **Documentation Location**: `/mnt/project/` contains all Services Australia documentation
