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

### TICKET-002: Configure TypeScript and Shared Types

**Branch**: `feature/typescript-config`

**Description**: Set up TypeScript configuration and define shared types based on AIR API specifications.

**Tasks**:
- [ ] Create `/shared/types/air-api.ts` with all AIR API types
- [ ] Create `/shared/types/excel-import.ts` for Excel mapping types
- [ ] Create `/shared/types/validation.ts` for validation result types
- [ ] Configure path aliases for cross-package imports
- [ ] Create base TypeScript configs extending from root

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
- [ ] Types compile without errors
- [ ] Types can be imported in both frontend and backend
- [ ] All required AIR API fields are typed

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

### TICKET-006: Implement PRODA Authentication Service

**Branch**: `feature/proda-auth`

**Description**: Implement PRODA B2B authentication for API requests.

**Reference**: PRODA B2B Unattended Developers Guide

**Tasks**:
- [ ] Create `/backend/src/services/proda/ProdaAuthService.ts`
- [ ] Implement JWT token generation with PRODA credentials
- [ ] Implement token caching and refresh logic
- [ ] Create authentication middleware for AIR API calls
- [ ] Handle authentication errors appropriately

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
- [ ] Token generation succeeds with valid credentials
- [ ] Token refresh occurs before expiry
- [ ] Invalid credentials return clear error
- [ ] Token is cached and reused

---

## Phase 3: Excel Processing

### TICKET-007: Create Excel Parser Service

**Branch**: `feature/excel-parser`

**Description**: Create service to parse uploaded Excel files and extract vaccination records.

**Tasks**:
- [ ] Install xlsx library: `npm install xlsx`
- [ ] Create `/backend/src/services/excel/ExcelParserService.ts`
- [ ] Define expected Excel column mappings
- [ ] Implement row-by-row parsing with data extraction
- [ ] Handle multiple sheets (use first sheet by default)
- [ ] Implement date parsing for multiple formats
- [ ] Create error collection for invalid rows

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
- [ ] Invalid column names return helpful errors
- [ ] Date formats (DD/MM/YYYY, D/M/YYYY) parse correctly
- [ ] Empty rows are skipped
- [ ] Parser returns structured error for invalid rows

---

### TICKET-008: Create Excel Template Generator

**Branch**: `feature/excel-template`

**Description**: Create a downloadable Excel template with correct column headers and data validation.

**Tasks**:
- [ ] Create `/backend/src/services/excel/TemplateGenerator.ts`
- [ ] Generate template with all required columns
- [ ] Add data validation dropdowns for fixed values
- [ ] Add example rows with sample data
- [ ] Add instructions sheet explaining each column
- [ ] Create API endpoint to download template

**Validation Dropdowns**:
- Gender: M, F, X
- Vaccine Type: NIP, OTH
- Route of Administration: PO, SC, ID, IM, NS
- Administered Overseas: Y, N
- Antenatal: Y, N

**Test Requirements**:
- [ ] Template downloads successfully
- [ ] Dropdowns contain correct values
- [ ] Instructions sheet is readable
- [ ] Template can be re-uploaded and parsed

---

### TICKET-009: Implement Batch Grouping Logic

**Branch**: `feature/batch-grouping`

**Description**: Group parsed records into AIR-compliant batches (max 10 encounters, max 5 episodes each).

**Reference**: AIR Record Encounter section 7.4

**Tasks**:
- [ ] Create `/backend/src/services/batch/BatchGroupingService.ts`
- [ ] Group records by individual (same person)
- [ ] Group episodes by date of service (same encounter)
- [ ] Split large batches into multiple requests
- [ ] Maintain original row numbers for error reporting
- [ ] Handle records that exceed episode limits

**Grouping Logic**:
```
1. Group all rows by individual identifier (Medicare + DOB or IHI)
2. For each individual, group by dateOfService (creates encounters)
3. Each encounter can have max 5 episodes
4. Each request can have max 10 encounters
5. If an encounter has >5 episodes, split across encounters (same date)
```

**Test Requirements**:
- [ ] 50 records for same individual groups correctly
- [ ] Records split into multiple requests when needed
- [ ] Episode limit (5) is enforced
- [ ] Encounter limit (10) is enforced
- [ ] Original row numbers preserved in output

---

## Phase 4: Data Validation

### TICKET-010: Implement Individual Validation

**Branch**: `feature/individual-validation`

**Description**: Validate individual identification fields per AIR minimum requirements.

**Reference**: AIR Record Encounter section 7.5

**Tasks**:
- [ ] Create `/backend/src/services/validation/IndividualValidator.ts`
- [ ] Implement Scenario 1: Medicare + DOB + lastName
- [ ] Implement Scenario 2: DOB + postCode + lastName + firstName
- [ ] Implement Scenario 3: IHI + DOB + lastName
- [ ] Implement Scenario 4: DOB + lastName + onlyNameIndicator
- [ ] Validate Medicare card number check digit
- [ ] Validate IHI number format (16 digits)
- [ ] Validate name character restrictions

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
- [ ] Valid Medicare numbers pass validation
- [ ] Invalid Medicare check digit fails
- [ ] Missing required fields fail per scenario
- [ ] Name with invalid characters fails
- [ ] All 4 identification scenarios work correctly

---

### TICKET-011: Implement Encounter Validation

**Branch**: `feature/encounter-validation`

**Description**: Validate encounter-level fields per AIR business rules.

**Reference**: AIR Record Encounter section 7.6

**Tasks**:
- [ ] Create `/backend/src/services/validation/EncounterValidator.ts`
- [ ] Validate dateOfService is not in future
- [ ] Validate dateOfService is after 01/01/1996
- [ ] Validate dateOfService is after individual's DOB
- [ ] Validate provider number format and check digit
- [ ] Validate school ID format
- [ ] Validate overseas vaccination requirements
- [ ] Validate antenatal indicator requirements

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
- [ ] Future dates fail validation
- [ ] Dates before 1996 fail validation
- [ ] Dates before DOB fail validation
- [ ] Valid provider numbers pass
- [ ] Invalid provider check digits fail
- [ ] Overseas requires country code

---

### TICKET-012: Implement Episode Validation

**Branch**: `feature/episode-validation`

**Description**: Validate episode-level fields per AIR business rules.

**Reference**: AIR Record Encounter section 7.6, Vaccine Code Formats User Guide

**Tasks**:
- [ ] Create `/backend/src/services/validation/EpisodeValidator.ts`
- [ ] Validate vaccine code exists in reference data
- [ ] Validate vaccine dose format ('B' or '1'-'20')
- [ ] Validate batch number when mandatory
- [ ] Validate vaccine type when mandatory (after 01/03/2024)
- [ ] Validate route of administration when mandatory
- [ ] Validate vaccine type/code compatibility
- [ ] Validate route/code compatibility

**Mandatory Field Rules** (per Vaccine Code Formats User Guide):
- Batch Number: Mandatory for certain vaccines (check reference data)
- Vaccine Type: Mandatory from 01/03/2024 for listed vaccines
- Route of Administration: Mandatory from 01/03/2024 for listed vaccines

**Test Requirements**:
- [ ] Invalid vaccine codes fail
- [ ] Missing mandatory batch numbers fail
- [ ] Valid dose values pass ('B', '1'-'20')
- [ ] Invalid dose values fail
- [ ] Vaccine type validation works for post-March 2024
- [ ] Route validation works for post-March 2024

---

### TICKET-013: Implement Vaccine Reference Data Service

**Branch**: `feature/vaccine-reference-data`

**Description**: Implement service to fetch and cache AIR vaccine reference data.

**Reference**: AIR Reference Data API TECH.SIS.AIR.07

**Tasks**:
- [ ] Create `/backend/src/services/reference/VaccineReferenceService.ts`
- [ ] Implement GET /air/immunisation/v1/refdata/vaccine endpoint call
- [ ] Cache reference data locally (refresh daily)
- [ ] Create lookup functions for validation
- [ ] Handle API errors gracefully

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
- [ ] Reference data fetches successfully
- [ ] Cache returns data without API call
- [ ] Cache refreshes after expiry
- [ ] Invalid vaccine codes return null
- [ ] Mandatory field checks work correctly

---

### TICKET-014: Create Validation Orchestrator

**Branch**: `feature/validation-orchestrator`

**Description**: Create service that orchestrates all validation steps and aggregates errors.

**Tasks**:
- [ ] Create `/backend/src/services/validation/ValidationOrchestrator.ts`
- [ ] Run all validators in sequence
- [ ] Aggregate errors with row numbers
- [ ] Return validation summary with error details
- [ ] Support partial validation (validate without blocking)

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
- [ ] All validators run in sequence
- [ ] Errors aggregate correctly
- [ ] Row numbers map to original Excel rows
- [ ] Validation completes within reasonable time (<5s for 1000 records)

---

## Phase 5: AIR API Integration

### TICKET-015: Create AIR API Client

**Branch**: `feature/air-api-client`

**Description**: Create HTTP client for AIR API with proper headers and error handling.

**Reference**: AIR Common Rules TECH.SIS.AIR.01 section 5.3

**Tasks**:
- [ ] Create `/backend/src/services/air/AIRApiClient.ts`
- [ ] Implement request builder with required headers
- [ ] Implement response parser
- [ ] Handle HTTP error codes per specification
- [ ] Implement retry logic for transient failures
- [ ] Log requests/responses (mask sensitive data)

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
- [ ] Headers are set correctly
- [ ] UUID format is valid
- [ ] HTTP errors return structured error
- [ ] Retry occurs on 500 errors
- [ ] Sensitive data is masked in logs

---

### TICKET-016: Implement Record Encounter Service

**Branch**: `feature/record-encounter`

**Description**: Implement the AIR Record Encounter API integration.

**Reference**: AIR Record Encounter TECH.SIS.AIR.02

**API Endpoint**: POST /air/immunisation/v1.4/encounters/record

**Tasks**:
- [ ] Create `/backend/src/services/air/RecordEncounterService.ts`
- [ ] Build request payload from grouped records
- [ ] Send request to AIR API
- [ ] Parse response for success/error status
- [ ] Handle individual not found (AIR-W-1004)
- [ ] Handle pended episodes (AIR-W-1008)
- [ ] Handle confirmation requests
- [ ] Store claim IDs for retry/confirmation

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
- [ ] Successful submission returns claim ID
- [ ] Validation errors are parsed correctly
- [ ] Individual not found triggers confirm option
- [ ] Pended episodes are identified
- [ ] System errors are handled gracefully

---

### TICKET-017: Implement Confirmation Service

**Branch**: `feature/confirmation-service`

**Description**: Implement handling for confirmation requests when individuals not found or episodes pended.

**Reference**: AIR Record Encounter section 6.3, 6.4

**Tasks**:
- [ ] Create `/backend/src/services/air/ConfirmationService.ts`
- [ ] Store original request for retry
- [ ] Build confirmation request with claimId
- [ ] Handle individual confirmation (new individual)
- [ ] Handle encounter confirmation (pended episodes)
- [ ] Track confirmation status per record

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
- [ ] Confirmation request includes claimId
- [ ] Individual confirmation uses correct format
- [ ] Encounter confirmation includes claimSequenceNumber
- [ ] Successful confirmation returns success status

---

### TICKET-018: Implement Batch Submission Service

**Branch**: `feature/batch-submission`

**Description**: Orchestrate submission of multiple batches with progress tracking.

**Tasks**:
- [ ] Create `/backend/src/services/submission/BatchSubmissionService.ts`
- [ ] Queue batches for sequential submission
- [ ] Track progress (submitted/pending/failed)
- [ ] Implement rate limiting (configurable)
- [ ] Store results for each batch
- [ ] Support pause/resume functionality
- [ ] Support retry for failed batches

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
- [ ] Batches submit sequentially
- [ ] Progress updates correctly
- [ ] Failed batches don't block others
- [ ] Pause/resume works correctly
- [ ] Rate limiting is enforced

---

## Phase 6: Frontend Implementation

### TICKET-019: Create File Upload Component

**Branch**: `feature/file-upload-ui`

**Description**: Create drag-and-drop file upload component with validation.

**Tasks**:
- [ ] Create `/frontend/src/components/upload/FileUpload.tsx`
- [ ] Implement drag-and-drop zone
- [ ] Implement file input fallback
- [ ] Validate file type (xlsx, xls only)
- [ ] Validate file size (max 10MB)
- [ ] Show upload progress
- [ ] Display validation errors

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
- [ ] Drag and drop works
- [ ] Click to upload works
- [ ] Invalid file types show error
- [ ] Large files show error
- [ ] Upload progress displays

---

### TICKET-020: Create Validation Results Table

**Branch**: `feature-validation-results-ui`

**Description**: Create table component to display validation results with error details.

**Tasks**:
- [ ] Create `/frontend/src/components/validation/ValidationResultsTable.tsx`
- [ ] Display row-by-row validation status
- [ ] Show error details in expandable rows
- [ ] Enable sorting and filtering
- [ ] Highlight error rows
- [ ] Export invalid rows to new Excel file

**Test Requirements**:
- [ ] Table renders with 1000+ rows performantly
- [ ] Sorting works on all columns
- [ ] Filtering by error type works
- [ ] Error details are readable
- [ ] Export creates valid Excel file

---

### TICKET-021: Create Submission Progress Component

**Branch**: `feature/submission-progress-ui`

**Description**: Create real-time progress component for batch submission.

**Tasks**:
- [ ] Create `/frontend/src/components/submission/SubmissionProgress.tsx`
- [ ] Display overall progress bar
- [ ] Show batch-by-batch status
- [ ] Display success/failure counts
- [ ] Show current operation
- [ ] Implement pause/resume buttons
- [ ] Use WebSocket or polling for updates

**Test Requirements**:
- [ ] Progress updates in real-time
- [ ] Pause/resume buttons work
- [ ] Final counts are accurate
- [ ] Component handles connection loss

---

### TICKET-022: Create Confirmation Dialog Component

**Branch**: `feature/confirmation-dialog-ui`

**Description**: Create dialog for handling records requiring confirmation.

**Tasks**:
- [ ] Create `/frontend/src/components/submission/ConfirmationDialog.tsx`
- [ ] Display records requiring confirmation
- [ ] Show reason for confirmation (individual not found / pended episodes)
- [ ] Allow selective confirmation
- [ ] Submit confirmations in batch
- [ ] Show confirmation results

**Test Requirements**:
- [ ] Dialog displays correct records
- [ ] Reason is clearly explained
- [ ] Selective confirmation works
- [ ] Bulk confirm works
- [ ] Results update correctly

---

### TICKET-023: Create Results Summary Component

**Branch**: `feature/results-summary-ui`

**Description**: Create summary component showing final submission results.

**Tasks**:
- [ ] Create `/frontend/src/components/results/ResultsSummary.tsx`
- [ ] Display total records processed
- [ ] Show success/failure breakdown
- [ ] List failed records with error details
- [ ] Generate downloadable report
- [ ] Show AIR claim IDs for successful records

**Test Requirements**:
- [ ] Summary is accurate
- [ ] Failed records list is complete
- [ ] Report downloads correctly
- [ ] Claim IDs are displayed

---

### TICKET-024: Create Provider Settings Page

**Branch**: `feature/provider-settings-ui`

**Description**: Create settings page for configuring provider information.

**Tasks**:
- [ ] Create `/frontend/src/pages/Settings.tsx`
- [ ] Form for Information Provider Number
- [ ] Form for HPI-O Number (optional)
- [ ] Form for HPI-I Number (optional)
- [ ] Save settings to local storage
- [ ] Validate provider number format

**Test Requirements**:
- [ ] Settings persist across sessions
- [ ] Provider number validates correctly
- [ ] Settings used in submissions

---

## Phase 7: API Endpoints

### TICKET-025: Create Upload API Endpoint

**Branch**: `feature/upload-endpoint`

**Description**: Create API endpoint for Excel file upload and initial parsing.

**Endpoint**: POST /api/upload

**Tasks**:
- [ ] Create `/backend/src/routes/upload.ts`
- [ ] Handle multipart file upload
- [ ] Parse Excel file
- [ ] Return parsed data and validation results
- [ ] Clean up uploaded file after processing

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
- [ ] Valid file uploads successfully
- [ ] Invalid file returns error
- [ ] Large files handle correctly
- [ ] Response includes all parsed data

---

### TICKET-026: Create Validation API Endpoint

**Branch**: `feature/validation-endpoint`

**Description**: Create API endpoint for detailed validation of parsed records.

**Endpoint**: POST /api/validate

**Tasks**:
- [ ] Create `/backend/src/routes/validate.ts`
- [ ] Accept parsed records from upload
- [ ] Run full validation suite
- [ ] Return detailed validation results
- [ ] Support validation options (strict/lenient)

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
- [ ] Validation completes for 1000 records < 5s
- [ ] Errors include row numbers
- [ ] Warnings are separate from errors
- [ ] Grouped batches are correct

---

### TICKET-027: Create Submission API Endpoint

**Branch**: `feature/submission-endpoint`

**Description**: Create API endpoint to initiate batch submission to AIR.

**Endpoint**: POST /api/submit

**Tasks**:
- [ ] Create `/backend/src/routes/submit.ts`
- [ ] Accept validated and grouped batches
- [ ] Initiate background submission process
- [ ] Return submission ID for tracking
- [ ] Support dry-run mode

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
- [ ] Submission starts successfully
- [ ] Submission ID is unique
- [ ] Dry run doesn't submit to AIR
- [ ] Invalid batches are rejected

---

### TICKET-028: Create Progress API Endpoint

**Branch**: `feature/progress-endpoint`

**Description**: Create API endpoint for submission progress updates.

**Endpoint**: GET /api/submit/:submissionId/progress

**Tasks**:
- [ ] Create progress endpoint in `/backend/src/routes/submit.ts`
- [ ] Return current progress state
- [ ] Include detailed status per batch
- [ ] Support WebSocket connection for real-time updates

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
- [ ] Progress updates correctly
- [ ] WebSocket sends real-time updates
- [ ] Completed submissions show final state

---

### TICKET-029: Create Confirmation API Endpoint

**Branch**: `feature/confirmation-endpoint`

**Description**: Create API endpoint for submitting confirmations.

**Endpoint**: POST /api/submit/:submissionId/confirm

**Tasks**:
- [ ] Create confirmation endpoint in `/backend/src/routes/submit.ts`
- [ ] Accept records to confirm
- [ ] Submit confirmation to AIR
- [ ] Return confirmation results
- [ ] Update submission progress

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
- [ ] Confirmations submit successfully
- [ ] Declined confirmations are marked
- [ ] Progress updates after confirmation

---

### TICKET-030: Create Results API Endpoint

**Branch**: `feature/results-endpoint`

**Description**: Create API endpoint for retrieving final submission results.

**Endpoint**: GET /api/submit/:submissionId/results

**Tasks**:
- [ ] Create results endpoint in `/backend/src/routes/submit.ts`
- [ ] Return complete submission results
- [ ] Include all claim IDs
- [ ] Include all error details
- [ ] Support export to CSV/Excel

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
- [ ] Results include all records
- [ ] Claim IDs are present for successes
- [ ] Errors include details
- [ ] Export generates valid file

---

## Phase 8: Error Handling & Logging

### TICKET-031: Implement Structured Error Handling

**Branch**: `feature/error-handling`

**Description**: Implement comprehensive error handling across the application.

**Reference**: AIR Common Rules section 5.17, AIR Message Code List

**Tasks**:
- [ ] Create `/backend/src/errors/` directory structure
- [ ] Define custom error classes for each error type
- [ ] Map AIR error codes to user-friendly messages
- [ ] Implement global error handler middleware
- [ ] Create error response formatter

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
- [ ] All error types are caught
- [ ] Error messages are user-friendly
- [ ] AIR errors map correctly
- [ ] Stack traces logged but not exposed

---

### TICKET-032: Implement Application Logging

**Branch**: `feature/logging`

**Description**: Implement structured logging for debugging and audit purposes.

**Tasks**:
- [ ] Install Winston logger: `npm install winston`
- [ ] Create `/backend/src/utils/logger.ts`
- [ ] Configure log levels (error, warn, info, debug)
- [ ] Implement request/response logging
- [ ] Mask sensitive data (Medicare numbers, etc.)
- [ ] Configure log rotation
- [ ] Add correlation IDs to all logs

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
- [ ] Logs write to correct level
- [ ] Sensitive data is masked
- [ ] Correlation IDs trace through request
- [ ] Log files rotate correctly

---

## Phase 9: Testing

### TICKET-033: Create Unit Tests for Validation Services

**Branch**: `feature/validation-tests`

**Description**: Create comprehensive unit tests for all validation services.

**Tasks**:
- [ ] Create `/backend/tests/unit/validation/` directory
- [ ] Test IndividualValidator with all scenarios
- [ ] Test EncounterValidator with all rules
- [ ] Test EpisodeValidator with all rules
- [ ] Test Medicare check digit algorithm
- [ ] Test Provider check digit algorithm
- [ ] Test date validation
- [ ] Achieve 90%+ code coverage

**Test Files**:
- `IndividualValidator.test.ts`
- `EncounterValidator.test.ts`
- `EpisodeValidator.test.ts`
- `CheckDigitAlgorithms.test.ts`

**Test Requirements**:
- [ ] All validation rules have tests
- [ ] Edge cases are covered
- [ ] Error messages are verified
- [ ] Coverage > 90%

---

### TICKET-034: Create Unit Tests for Excel Services

**Branch**: `feature/excel-tests`

**Description**: Create unit tests for Excel parsing and template generation.

**Tasks**:
- [ ] Create `/backend/tests/unit/excel/` directory
- [ ] Test ExcelParserService with valid files
- [ ] Test ExcelParserService with invalid files
- [ ] Test column mapping variations
- [ ] Test date parsing formats
- [ ] Test TemplateGenerator output
- [ ] Create test fixture Excel files

**Test Requirements**:
- [ ] Valid files parse correctly
- [ ] Invalid files return errors
- [ ] All date formats work
- [ ] Template is valid Excel

---

### TICKET-035: Create Integration Tests for AIR API

**Branch**: `feature/api-integration-tests`

**Description**: Create integration tests for AIR API communication (using mock server).

**Tasks**:
- [ ] Create `/backend/tests/integration/air/` directory
- [ ] Create mock AIR API server
- [ ] Test successful submission flow
- [ ] Test validation error flow
- [ ] Test individual not found flow
- [ ] Test pended episodes flow
- [ ] Test confirmation flow
- [ ] Test system error handling

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
- [ ] All API flows are tested
- [ ] Mock responses match AIR spec
- [ ] Error handling is verified
- [ ] Timeouts are handled

---

### TICKET-036: Create End-to-End Tests

**Branch**: `feature/e2e-tests`

**Description**: Create end-to-end tests for complete user workflows.

**Tasks**:
- [ ] Install Playwright: `npm install -D @playwright/test`
- [ ] Create `/frontend/tests/e2e/` directory
- [ ] Test file upload workflow
- [ ] Test validation display
- [ ] Test submission workflow
- [ ] Test confirmation workflow
- [ ] Test results display
- [ ] Test error scenarios

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
- [ ] Complete workflow passes
- [ ] UI updates correctly
- [ ] Errors display correctly
- [ ] Results are accurate

---

### TICKET-037: Create AIR Vendor Environment Test Suite

**Branch**: `feature/vendor-tests`

**Description**: Create test suite for AIR vendor environment certification testing.

**Reference**: End to End Process for Software Developers section 12

**Tasks**:
- [ ] Create `/backend/tests/certification/` directory
- [ ] Create test data matching AIR test scenarios
- [ ] Test standard success flow (section 6.1)
- [ ] Test validation fails flow (section 6.2)
- [ ] Test individual not found flow (section 6.3)
- [ ] Test pended episodes flow (section 6.4)
- [ ] Test encounter not confirmable flow (section 6.5)
- [ ] Document all test results

**Test Requirements**:
- [ ] All certification scenarios pass
- [ ] Test data is documented
- [ ] Results match expected responses
- [ ] Ready for OTS review

---

## Phase 10: Documentation

### TICKET-038: Create User Documentation

**Branch**: `feature/user-docs`

**Description**: Create user documentation for the application.

**Tasks**:
- [ ] Create `/docs/user-guide.md`
- [ ] Document Excel template format
- [ ] Document upload process
- [ ] Document validation error meanings
- [ ] Document confirmation process
- [ ] Create FAQ section
- [ ] Add troubleshooting guide

**Test Requirements**:
- [ ] Documentation is complete
- [ ] Screenshots are current
- [ ] All features documented

---

### TICKET-039: Create Developer Documentation

**Branch**: `feature/dev-docs`

**Description**: Create developer documentation for setup and deployment.

**Tasks**:
- [ ] Create `/docs/developer-guide.md`
- [ ] Document local development setup
- [ ] Document environment variables
- [ ] Document deployment process
- [ ] Document API endpoints
- [ ] Create architecture diagram
- [ ] Document testing procedures

**Test Requirements**:
- [ ] New developer can set up from docs
- [ ] All config options documented
- [ ] API documentation complete

---

### TICKET-040: Create AIR Integration Documentation

**Branch**: `feature/air-docs`

**Description**: Document AIR-specific integration details.

**Tasks**:
- [ ] Create `/docs/air-integration.md`
- [ ] Document PRODA setup requirements
- [ ] Document Minor ID requirements
- [ ] Document provider registration process
- [ ] Document certification process
- [ ] Document production migration
- [ ] List all AIR error codes handled

**Test Requirements**:
- [ ] All AIR requirements documented
- [ ] Registration steps clear
- [ ] Certification steps clear

---

## Phase 11: Deployment & DevOps

### TICKET-041: Create Docker Configuration

**Branch**: `feature/docker`

**Description**: Create Docker configuration for containerized deployment.

**Tasks**:
- [ ] Create `/backend/Dockerfile`
- [ ] Create `/frontend/Dockerfile`
- [ ] Create `docker-compose.yml` for full stack
- [ ] Configure health checks
- [ ] Configure environment variables
- [ ] Optimize for production build

**Test Requirements**:
- [ ] Containers build successfully
- [ ] Health checks pass
- [ ] Stack runs in docker-compose

---

### TICKET-042: Create CI/CD Pipeline

**Branch**: `feature/cicd`

**Description**: Create GitHub Actions CI/CD pipeline.

**Tasks**:
- [ ] Create `.github/workflows/ci.yml`
- [ ] Configure test job
- [ ] Configure build job
- [ ] Configure deployment job (manual trigger)
- [ ] Add security scanning
- [ ] Configure dependency updates

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
- [ ] Pipeline passes on PR
- [ ] Tests run correctly
- [ ] Build artifacts created
- [ ] Deployment works

---

### TICKET-043: Configure Production Environment

**Branch**: `feature/prod-config`

**Description**: Configure production environment settings.

**Tasks**:
- [ ] Create production configuration
- [ ] Set up SSL certificates
- [ ] Configure CORS for production domain
- [ ] Set up log aggregation
- [ ] Configure monitoring
- [ ] Document production URLs

**Test Requirements**:
- [ ] SSL works correctly
- [ ] CORS allows production domain
- [ ] Logs aggregate correctly
- [ ] Monitoring alerts work

---

## Phase 12: Security & Compliance

### TICKET-044: Implement Security Headers

**Branch**: `feature/security-headers`

**Description**: Implement security headers and best practices.

**Tasks**:
- [ ] Configure Helmet.js with appropriate options
- [ ] Implement CSRF protection
- [ ] Configure Content Security Policy
- [ ] Implement rate limiting
- [ ] Add security headers to all responses

**Test Requirements**:
- [ ] Security headers present
- [ ] CSRF tokens work
- [ ] Rate limiting enforced
- [ ] CSP doesn't break functionality

---

### TICKET-045: Implement Data Privacy Measures

**Branch**: `feature/privacy`

**Description**: Implement data privacy and protection measures.

**Tasks**:
- [ ] Ensure no PII is logged
- [ ] Implement data encryption at rest
- [ ] Implement secure file handling
- [ ] Auto-delete uploaded files after processing
- [ ] Document data retention policy
- [ ] Implement data export/delete capability

**Test Requirements**:
- [ ] PII is masked in logs
- [ ] Files are deleted after processing
- [ ] Data encryption verified

---

### TICKET-046: Security Audit

**Branch**: `feature/security-audit`

**Description**: Conduct security audit and address findings.

**Tasks**:
- [ ] Run npm audit and fix vulnerabilities
- [ ] Review authentication implementation
- [ ] Review authorization logic
- [ ] Test for common vulnerabilities (OWASP Top 10)
- [ ] Document security measures
- [ ] Create security incident response plan

**Test Requirements**:
- [ ] No high/critical vulnerabilities
- [ ] Auth/AuthZ is correct
- [ ] OWASP tests pass

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
