# QA End-to-End Test Tickets — Vendor Environment

> **Date**: 2026-02-08
> **Prerequisites**: TICKET-P0 (PRODA Auth Fix) must be complete and passing before any of these tickets can run.
> **Environment**: Vendor Test — `https://test.healthclaiming.api.humanservices.gov.au/claiming/ext-vnd`
> **Source**: Services Australia test data issued 1/08/2025 for Warrandyte Healthcare Pty Ltd

---

## Test Environment Configuration

These values MUST be set in `.env` before running any E2E tests:

```env
APP_ENV=vendor
PRODA_TOKEN_ENDPOINT_VENDOR=https://vnd.proda.humanservices.gov.au/mga/sps/oauth/oauth20/token
PRODA_DEVICE_NAME=DavidTestLaptop2
PRODA_ORG_ID=2330016739
PRODA_MINOR_ID=WRR00000
PRODA_JKS_PASSWORD=Pass-123
PRODA_KEY_ALIAS=proda-alias
PRODA_JWT_AUDIENCE=https://proda.humanservices.gov.au
PRODA_CLIENT_ID=soape-testing-client-v2
PRODA_ACCESS_TOKEN_AUDIENCE=https://proda.humanservices.gov.au
AIR_API_BASE_URL_VENDOR=https://test.healthclaiming.api.humanservices.gov.au/claiming/ext-vnd
AIR_PRODUCT_ID=AIRBulkVax 1.0
```

> **X-IBM-Client-Id**: Must be generated via Health Systems Developer Portal → 'Your Applications' → 'Create new app'. The API key displayed is the X-IBM-Client-Id value.

---

## Test Data Reference

### Providers (use as Immunising Provider OR Information Provider)

| Provider Number | Last Name | First Name |
|---|---|---|
| 2448141T | BOWLING | GRAHAM |
| 2448151L | BISHOP | FELICITY |

### AIR Provider Numbers (Other Vaccination Provider)

| AIR Provider Number | Name |
|---|---|
| N56725J | AMELIA PRACTITIONERS65 |
| T59433Y | DANIELLE PARTNERS16 |

### School IDs

| School ID |
|---|
| 40001 |
| 41000 |
| 43350 |

### HPIO / HPII

| Type | Number |
|---|---|
| HPIO | 8003623233370062 |
| HPII | 8003611566712356 |

### Single Medicare Test Patients (Section 5 — can be updated)

| Medicare | IRN | Last Name | First Name | DOB | Sex | Postcode |
|---|---|---|---|---|---|---|
| 3951333161 | 1 | SCRIVENER | Tandra | 1961-01-19 | F | 3214 |
| 3951333251 | 1 | MAHER | Lyndon | 1962-09-27 | M | 3825 |
| 5951138021 | 1 | MCBEAN | Arla | 1971-03-09 | F | 5432 |
| 4951650791 | 1 | SHEPPARD | Phoebe | 1999-08-19 | F | 4313 |

### Alternate Enrolment Types (Section 7 — can be updated)

| Scenario | Medicare | IRN | Last Name | First Name | DOB | Sex | Postcode |
|---|---|---|---|---|---|---|---|
| Only Name | 2297460337 | 1 | Devo | Onlyname | 1980-01-01 | M | 2000 |
| Long Name | 3950921522 | 1 | Weatherby-Wilkinson | Harriett-Jane | 1992-03-12 | F | 3006 |
| RHCA | 2297582345 | 1 | Xpatriot | English | 1975-09-15 | M | 2000 |
| Expired RHCA | 2297402205 | 1 | Forigner | French | 1980-05-16 | F | 2600 |
| Lost Card | 5500393925 | 1 | Boyes | Simon | 1980-05-23 | M | 5083 |
| Transferred Card | 6951393261 | 3 | Harris | Sam | 2000-09-12 | F | 6054 |
| Deceased | 2296510128 | 4 | Jones | Sad | 1964-09-15 | M | 2904 |
| Unknown on Medicare | 2398125261 | 1 | Doe | John | 1979-09-13 | M | 2000 |
| Old Issue Number | 2298264833 | 1 | Watts | Gregory | 1970-05-12 | M | 2903 |
| Safety Net | 2295919746 | 1 | Davis | Eva | 1979-05-02 | F | 2614 |

### IHI Test Patients (Section 8 — READ ONLY, do NOT update)

| Scenario | IHI | Medicare | IRN | Last Name | First Name | DOB | Sex | Postcode |
|---|---|---|---|---|---|---|---|---|
| End Date=Ltd | 8003608666929120 | 4951405042 | 2 | Hicks | Minnie | 2016-11-12 | F | 4121 |
| End Date=All | 8003608000265017 | 6951624612 | 2 | Stenson | Jerico | 2018-11-11 | M | 6021 |
| End Date=None | 8003608333600336 | 6951628322 | 2 | Allan | Grace | 2017-01-23 | F | 7004 |
| Auth Release | 8003608666929138 | 3951149822 | 1 | Hayes | Gwen | 1992-08-12 | F | 3212 |
| AIR History | 8003608000265033 | 2953701052 | 2 | Edwards | Koby | 2012-04-17 | M | 2160 |
| Indigenous Ind | 8003608666929807 | 3951152402 | 2 | Jenkins | Clarissa | 2015-10-15 | F | 3109 |
| No History | 8003608333411106 | 2951214793 | 1 | Wilson | Peter | 1979-02-19 | M | 2360 |
| COVID Complete | 8003608333607810 | 4951420142 | 1 | Stanley | Henry | 1970-12-01 | M | 0838 |
| COVID Incomplete | 8003608666937743 | 2953894862 | 1 | Markell | Ross | 1971-05-27 | M | 2209 |
| AIR Only Name | 8003608333617074 | 5951056491 | 1 | Monty | (none) | 2000-05-12 | M | 5008 |

---

## TICKET-E2E-001: PRODA Token Retrieval (Smoke Test)

**Priority**: P0 — Must pass before all other E2E tests
**Type**: Integration / Smoke
**Estimated time**: 5 minutes

### Description
Verify the application can obtain a valid PRODA access token from the vendor token endpoint using the corrected JWT claims from TICKET-P0.

### Steps

- [ ] 1. Configure `.env` with vendor test credentials (see top of this file)
- [ ] 2. Start the backend application
- [ ] 3. Trigger PRODA token acquisition (via startup or manual API call)
- [ ] 4. Verify token is obtained successfully
- [ ] 5. Decode token and verify claims

### Expected Results

- [ ] HTTP 200 from `https://vnd.proda.humanservices.gov.au/mga/sps/oauth/oauth20/token`
- [ ] Response contains `access_token`, `token_type: "bearer"`, `expires_in: 3600`
- [ ] Decoded token `sub` = `2330016739` (orgId)
- [ ] Decoded token `proda.swinst` = `DavidTestLaptop2`
- [ ] Decoded token `aud` = `PRODA.UNATTENDED.B2B`
- [ ] Token cached in memory (not persisted to DB or disk)
- [ ] No `https://medicareaustralia.gov.au/MCOL` references remain in codebase

### Failure Action
If this test fails, STOP all E2E testing. TICKET-P0 is not complete.

---

## TICKET-E2E-002: Reference Data API Retrieval

**Priority**: P0 — Required for validation tests
**Type**: Integration
**Estimated time**: 10 minutes

### Description
Verify the application can fetch and cache reference data from all AIR reference data endpoints using the PRODA bearer token.

### Steps

- [ ] 1. Obtain PRODA token (prerequisite: E2E-001 passes)
- [ ] 2. Call each reference data endpoint with correct headers
- [ ] 3. Verify response data is parseable and cacheable

### API Calls to Test

```
GET /air/immunisation/v1/refdata/vaccine
GET /air/immunisation/v1/refdata/vaccine?vaccineCategoryCode=NIP
GET /air/immunisation/v1/refdata/vaccine?vaccineCategoryCode=COV19
GET /air/immunisation/v1/refdata/vaccine?vaccineCategoryCode=FLU
GET /air/immunisation/v1/refdata/antigen
GET /air/immunisation/v1/refdata/routeOfAdministration
GET /air/immunisation/v1/refdata/vaccine/mandatory/vaccineBatch
GET /air/immunisation/v1/refdata/country
```

### Required Headers (all calls)

```
Authorization: Bearer {token}
X-IBM-Client-Id: {api_key}
dhs-messageId: urn:uuid:{unique}
dhs-correlationId: urn:uuid:{unique}
dhs-auditId: WRR00000
dhs-auditIdType: Minor Id
dhs-productId: AIRBulkVax 1.0
```

### Expected Results

- [ ] All 8 endpoints return HTTP 200
- [ ] Vaccine list contains known codes (FLUVAX, MMR, COMIRN, etc.)
- [ ] Route of administration list contains IM, SC, ID, OR, IN, NAS, NS
- [ ] Mandatory vaccine batch list returns (COVID, Flu, Yellow Fever vaccines)
- [ ] Country list returns valid ISO 3166-1 codes
- [ ] Data is cached locally after retrieval
- [ ] Log: No PII in log output

---

## TICKET-E2E-003: Individual Details Lookup — Known Patients

**Priority**: P1
**Type**: Integration
**Estimated time**: 15 minutes

### Description
Verify the application can look up test individuals on AIR using the Individual Details API. Uses Section 8 READ-ONLY patients.

### Test Cases

**3a — Lookup by Medicare (patient with AIR History):**
```json
{
  "individualIdentifier": "8003608000265033",
  "informationProvider": {
    "providerNumber": "2448141T"
  }
}
```
- Patient: Edwards, Koby (DOB 2012-04-17, M)
- Expected: Returns individual details + immunisation history

**3b — Lookup by Medicare (No History patient):**
- Patient: Wilson, Peter (Medicare 2951214793, IRN 1)
- Expected: Returns individual details, empty/no immunisation history

**3c — Lookup by Medicare (COVID Complete patient):**
- Patient: Stanley, Henry (Medicare 4951420142, IRN 1)
- Expected: Returns individual details with COVID vaccination history

### Required Headers

Same as E2E-002, plus:
```
dhs-subjectId: {DOB in ddMMyyyy format}
dhs-subjectIdType: Date of Birth
```

### Expected Results

- [ ] All lookups return HTTP 200
- [ ] AIR History patient has encounters, immunities, and/or contraindications
- [ ] No History patient has no encounter data
- [ ] COVID Complete patient shows COVID vaccination records
- [ ] Response structure matches TECH.SIS.AIR.05 (Individual Details V4.0.5)
- [ ] `dhs-subjectId` correctly formatted as ddMMyyyy (e.g., `17042012` for Koby)

---

## TICKET-E2E-004: Record Encounter — Standard Success Flow

**Priority**: P0
**Type**: Integration / Core workflow
**Estimated time**: 20 minutes

### Description
Submit a vaccination encounter for a known test patient and verify AIR-I-1007 (all success) response. This is the primary happy path for the entire application.

### Test Patient
Use Section 5 patient: **SCRIVENER, Tandra**
- Medicare: 3951333161, IRN: 1
- DOB: 1961-01-19, Gender: F
- Postcode: 3214

### Request Payload

```json
{
  "individual": {
    "personalDetails": {
      "dateOfBirth": "1961-01-19",
      "gender": "F",
      "firstName": "Tandra",
      "lastName": "SCRIVENER"
    },
    "medicareCard": {
      "medicareCardNumber": "3951333161",
      "medicareIRN": "1"
    }
  },
  "encounters": [
    {
      "id": "1",
      "dateOfService": "2025-10-01",
      "acceptAndConfirm": false,
      "immunisationProvider": {
        "providerNumber": "2448141T"
      },
      "episodes": [
        {
          "id": "1",
          "vaccineCode": "FLUVAX",
          "vaccineDose": "1",
          "vaccineBatch": "BATCH001",
          "vaccineType": "",
          "routeOfAdministration": ""
        }
      ]
    }
  ],
  "informationProvider": {
    "providerNumber": "2448141T"
  }
}
```

### Required Headers

```
Authorization: Bearer {token}
X-IBM-Client-Id: {api_key}
Content-Type: application/json
Accept: application/json
dhs-messageId: urn:uuid:{unique}
dhs-correlationId: urn:uuid:{unique}
dhs-auditId: WRR00000
dhs-auditIdType: Minor Id
dhs-subjectId: 19011961
dhs-subjectIdType: Date of Birth
dhs-productId: AIRBulkVax 1.0
```

### Expected Results

- [ ] HTTP 200 returned
- [ ] Response contains `AIR-I-1007` (all encounters successfully recorded) OR `AIR-I-1000` (individual encounter success)
- [ ] Response contains `claimDetails` with `claimId` and `claimSequenceNumber`
- [ ] AIR message displayed verbatim in application (not modified)
- [ ] Submission logged to database with correct status
- [ ] Audit trail records the submission event

### Notes
- If the vaccine dose has already been recorded for this patient, AIR may return a warning (AIR-W-0103 duplicate antigen dose). Use a different `vaccineDose` number or `dateOfService` if needed.
- FLUVAX requires a batch number (check mandatory vaccine batch list from E2E-002).

---

## TICKET-E2E-005: Record Encounter — Multiple Encounters in Single Request

**Priority**: P1
**Type**: Integration
**Estimated time**: 20 minutes

### Description
Submit a request containing 2 encounters for the same individual (different dates of service) to verify batching works correctly.

### Test Patient
**MAHER, Lyndon** — Medicare: 3951333251, IRN: 1, DOB: 1962-09-27, M

### Request Payload

```json
{
  "individual": {
    "personalDetails": {
      "dateOfBirth": "1962-09-27",
      "gender": "M",
      "firstName": "Lyndon",
      "lastName": "MAHER"
    },
    "medicareCard": {
      "medicareCardNumber": "3951333251",
      "medicareIRN": "1"
    }
  },
  "encounters": [
    {
      "id": "1",
      "dateOfService": "2025-09-15",
      "acceptAndConfirm": false,
      "immunisationProvider": {
        "providerNumber": "2448151L"
      },
      "episodes": [
        {
          "id": "1",
          "vaccineCode": "MMR",
          "vaccineDose": "1",
          "vaccineType": "",
          "routeOfAdministration": ""
        }
      ]
    },
    {
      "id": "2",
      "dateOfService": "2025-10-15",
      "acceptAndConfirm": false,
      "immunisationProvider": {
        "providerNumber": "2448151L"
      },
      "episodes": [
        {
          "id": "1",
          "vaccineCode": "FLUVAX",
          "vaccineDose": "1",
          "vaccineBatch": "BATCH002",
          "vaccineType": "",
          "routeOfAdministration": ""
        }
      ]
    }
  ],
  "informationProvider": {
    "providerNumber": "2448151L"
  }
}
```

### Expected Results

- [ ] HTTP 200
- [ ] Both encounters recorded: AIR-I-1007 or per-encounter AIR-I-1000
- [ ] Encounter IDs correctly sequential (1, 2)
- [ ] Episode IDs correctly sequential within each encounter
- [ ] Application correctly tracks per-encounter status
- [ ] If one fails and one succeeds, application shows AIR-W-1008 with per-encounter breakdown

---

## TICKET-E2E-006: Record Encounter — Individual Not Found (AIR-W-1004 Confirm Flow)

**Priority**: P0 — Core workflow
**Type**: Integration
**Estimated time**: 25 minutes

### Description
Submit an encounter for the "Unknown on Medicare" test patient. This should trigger AIR-W-1004 (Individual Not Found). Then test the confirm flow by resubmitting with `acceptAndConfirm: true`.

### Test Patient
**Doe, John** — Medicare: 2398125261, IRN: 1, DOB: 1979-09-13, M, Postcode: 2000

### Step 1 — Initial Submission (expect AIR-W-1004)

```json
{
  "individual": {
    "personalDetails": {
      "dateOfBirth": "1979-09-13",
      "gender": "M",
      "firstName": "John",
      "lastName": "Doe"
    },
    "medicareCard": {
      "medicareCardNumber": "2398125261",
      "medicareIRN": "1"
    }
  },
  "encounters": [
    {
      "id": "1",
      "dateOfService": "2025-11-01",
      "acceptAndConfirm": false,
      "immunisationProvider": {
        "providerNumber": "2448141T"
      },
      "episodes": [
        {
          "id": "1",
          "vaccineCode": "FLUVAX",
          "vaccineDose": "1",
          "vaccineBatch": "BATCH003",
          "vaccineType": "",
          "routeOfAdministration": ""
        }
      ]
    }
  ],
  "informationProvider": {
    "providerNumber": "2448141T"
  }
}
```

### Expected Step 1 Results

- [ ] Response contains `AIR-W-1004`
- [ ] Message: "Individual was not found. Please either correct the individual details or confirm and accept individual details are correct"
- [ ] Response contains `claimDetails` with `claimId` and `claimSequenceNumber`
- [ ] Application displays warning to user with verbatim AIR message
- [ ] Application presents "Confirm" and "Correct & Resubmit" options

### Step 2 — Confirm Submission (resubmit with acceptAndConfirm)

Extract `claimId` and `claimSequenceNumber` from Step 1 response, then resubmit:

```json
{
  "individual": { /* same as step 1 */ },
  "encounters": [
    {
      "id": "1",
      "claimSequenceNumber": "{from_step_1_response}",
      "dateOfService": "2025-11-01",
      "acceptAndConfirm": true,
      "immunisationProvider": {
        "providerNumber": "2448141T"
      },
      "episodes": [
        {
          "id": "1",
          "vaccineCode": "FLUVAX",
          "vaccineDose": "1",
          "vaccineBatch": "BATCH003",
          "vaccineType": "",
          "routeOfAdministration": ""
        }
      ]
    }
  ],
  "informationProvider": {
    "providerNumber": "2448141T"
  },
  "claimId": "{from_step_1_response}"
}
```

### Expected Step 2 Results

- [ ] HTTP 200
- [ ] Response contains AIR-I-1007 or AIR-I-1000 (success)
- [ ] Application marks record as confirmed
- [ ] `claimId` and `claimSequenceNumber` correctly passed from Step 1
- [ ] Submission history shows the two-step flow (initial warning → confirmed)

---

## TICKET-E2E-007: Record Encounter — Validation Error (AIR-E-1005)

**Priority**: P1
**Type**: Integration / Negative test
**Estimated time**: 15 minutes

### Description
Submit deliberately invalid requests to verify the application correctly handles AIR validation errors and displays them verbatim.

### Test Cases

**7a — Invalid vaccine code:**
- Use patient SCRIVENER, Tandra
- Set `vaccineCode` to `INVALIDCODE`
- Expected: AIR-E-1005 with per-field validation error for invalid vaccine code

**7b — Future date of service:**
- Use patient MAHER, Lyndon
- Set `dateOfService` to a date in the future (e.g., `2027-01-01`)
- Expected: AIR-E-1018 (date is in the future)

**7c — More than 10 encounters:**
- Build a request with 11 encounters
- Expected: Pre-submission validation catches this (AIR-E-1013), OR AIR returns the error
- Application MUST catch this client-side before sending to AIR

**7d — Invalid provider number:**
- Use a provider number with wrong check digit (e.g., `2448141X`)
- Expected: AIR-E-1017 or AIR-E-1029

### Expected Results (all cases)

- [ ] AIR error messages displayed verbatim — not truncated, transformed, or changed
- [ ] Error code correctly parsed and stored in database
- [ ] Application does NOT auto-retry validation errors
- [ ] User can see which field/encounter caused the error
- [ ] Records marked as 'error' status in submission history

---

## TICKET-E2E-008: Record Encounter — Deceased Patient

**Priority**: P1
**Type**: Integration / Edge case
**Estimated time**: 10 minutes

### Description
Submit an encounter for the deceased test patient to verify correct error handling.

### Test Patient
**Jones, Sad** — Medicare: 2296510128, IRN: 4, DOB: 1964-09-15, M (Deceased 30/06/2024)

### Expected Results

- [ ] AIR returns an appropriate error or warning about the deceased status
- [ ] Application displays the AIR message verbatim
- [ ] Record marked appropriately in submission history
- [ ] No crash or unhandled exception

---

## TICKET-E2E-009: Record Encounter — Long Name / Special Characters

**Priority**: P1
**Type**: Integration / Edge case
**Estimated time**: 10 minutes

### Description
Test name handling with hyphenated and long names.

### Test Patient
**Weatherby-Wilkinson, Harriett-Jane** — Medicare: 3950921522, IRN: 1, DOB: 1992-03-12, F, Postcode: 3006

### Expected Results

- [ ] Hyphenated surname `Weatherby-Wilkinson` accepted (within 40 char limit)
- [ ] Hyphenated first name `Harriett-Jane` accepted
- [ ] No truncation or character mangling
- [ ] Encounter recorded successfully or appropriate AIR response

---

## TICKET-E2E-010: Record Encounter — AIR Provider Number

**Priority**: P1
**Type**: Integration
**Estimated time**: 10 minutes

### Description
Submit an encounter using an AIR provider number (state code format) instead of a Medicare provider number.

### Test

- Use patient MCBEAN, Arla (Medicare: 5951138021, IRN: 1, DOB: 1971-03-09, F)
- Immunising provider: `N56725J` (AIR Provider — AMELIA PRACTITIONERS65)
- Information provider: `2448141T` (Medicare provider)

### Expected Results

- [ ] AIR accepts the AIR-format provider number
- [ ] Provider number validation in application accepts both formats (Medicare 8-char and AIR state-code format)
- [ ] Encounter recorded successfully

---

## TICKET-E2E-011: Record Encounter — School Vaccination with School ID

**Priority**: P2
**Type**: Integration
**Estimated time**: 10 minutes

### Description
Submit an encounter with a School ID to verify the school vaccination flow.

### Test

- Use patient SHEPPARD, Phoebe (Medicare: 4951650791, IRN: 1, DOB: 1999-08-19, F)
- School ID: `40001`
- Include `schoolId` field in encounter

### Expected Results

- [ ] School ID accepted in request
- [ ] Encounter recorded successfully
- [ ] School ID stored in submission record

---

## TICKET-E2E-012: Full Excel Upload → Submission E2E (UI Flow)

**Priority**: P0 — Full system integration
**Type**: End-to-end / UI
**Estimated time**: 45 minutes

### Description
Test the complete user workflow: create an Excel file using the template, upload it, validate, submit, and review results. This is the primary user story.

### Setup

Create an Excel file (`test_batch.xlsx`) with these rows:

| Medicare Card Number | Medicare IRN | IHI Number | First Name | Last Name | Date of Birth | Gender | Postcode | Date of Service | Vaccine Code | Vaccine Dose | Vaccine Batch | Vaccine Type | Route of Administration | Administered Overseas | Country Code | Immunising Provider Number | School ID | Antenatal Indicator |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 3951333161 | 1 | | Tandra | SCRIVENER | 19/01/1961 | F | 3214 | 01/12/2025 | FLUVAX | 2 | BATCHQA1 | | | FALSE | | 2448141T | | FALSE |
| 3951333251 | 1 | | Lyndon | MAHER | 27/09/1962 | M | 3825 | 01/12/2025 | MMR | 2 | | | | FALSE | | 2448151L | | FALSE |
| 5951138021 | 1 | | Arla | MCBEAN | 09/03/1971 | F | 5432 | 01/12/2025 | FLUVAX | 1 | BATCHQA2 | | | FALSE | | 2448141T | | FALSE |
| 4951650791 | 1 | | Phoebe | SHEPPARD | 19/08/1999 | F | 4313 | 01/12/2025 | MMR | 1 | | | IM | FALSE | | 2448151L | | FALSE |

### Test Steps

- [ ] 1. **Download template** — verify template download works from the UI
- [ ] 2. **Upload file** — drag-and-drop or file picker, verify file accepted
- [ ] 3. **Client-side parsing** — verify all 4 rows parsed, columns mapped correctly
- [ ] 4. **Validation preview** — verify no validation errors on known-good data
- [ ] 5. **Submit** — click submit, watch progress monitor
- [ ] 6. **PRODA auth** — verify token obtained automatically (no user intervention)
- [ ] 7. **API submission** — verify requests sent with correct headers and payload structure
- [ ] 8. **Progress tracking** — verify real-time progress updates (1/4, 2/4, 3/4, 4/4)
- [ ] 9. **Results** — verify per-record success/warning/error status displayed
- [ ] 10. **AIR messages** — verify any AIR messages displayed verbatim
- [ ] 11. **History** — verify batch appears in submission history with correct counts
- [ ] 12. **Re-upload** — verify a second upload works without issues

### Expected Results

- [ ] All 4 records either succeed (AIR-I-1007/AIR-I-1000) or return known warnings
- [ ] Batch status shows correct breakdown (N success, N warnings, N errors)
- [ ] No unhandled exceptions or UI crashes
- [ ] Progress indicator accurate
- [ ] Results downloadable or viewable
- [ ] Audit trail complete

---

## TICKET-E2E-013: Excel Upload — Validation Error Handling

**Priority**: P1
**Type**: End-to-end / Negative
**Estimated time**: 20 minutes

### Description
Upload an Excel file with known errors to verify client-side and server-side validation catches them before submission.

### Test Excel (deliberately bad data)

| Medicare Card Number | Medicare IRN | First Name | Last Name | Date of Birth | Gender | Postcode | Date of Service | Vaccine Code | Vaccine Dose | Vaccine Batch | Immunising Provider Number |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1234567890 | 1 | Test | Invalid | 19/01/1961 | F | 3214 | 01/12/2025 | FLUVAX | 1 | BATCH | 2448141T |
| 3951333161 | 0 | Tandra | SCRIVENER | 19/01/1961 | F | 3214 | 01/12/2025 | FLUVAX | 1 | BATCH | 2448141T |
| 3951333161 | 1 | Tandra | SCRIVENER | 19/01/1961 | Z | 3214 | 01/12/2025 | FLUVAX | 1 | BATCH | 2448141T |
| 3951333161 | 1 | Tandra | SCRIVENER | 19/01/1961 | F | 3214 | 01/01/2028 | FLUVAX | 1 | BATCH | 2448141T |
| | | | | 19/01/1961 | F | | 01/12/2025 | FLUVAX | 1 | BATCH | 2448141T |

### Expected Validation Errors

- [ ] Row 1: Invalid Medicare check digit (1234567890 fails algorithm)
- [ ] Row 2: IRN cannot be 0 (must be 1-9)
- [ ] Row 3: Invalid gender `Z` (must be M/F/I/U/X)
- [ ] Row 4: Future date of service (2028)
- [ ] Row 5: Insufficient identification (no Medicare, no IHI, no name+postcode)
- [ ] All errors caught BEFORE submission to AIR (client-side or server-side pre-validation)
- [ ] Errors displayed with row numbers and clear descriptions
- [ ] User can correct and re-upload

---

## TICKET-E2E-014: Token Refresh During Long Batch

**Priority**: P1
**Type**: Integration / Reliability
**Estimated time**: 15 minutes

### Description
Verify the application handles PRODA token refresh gracefully during batch processing. Tokens expire in 60 minutes, and the app should refresh at 50 minutes.

### Test

- [ ] 1. Obtain initial token, note the `exp` time
- [ ] 2. Artificially advance the token cache age to 50+ minutes (or mock the timer)
- [ ] 3. Trigger a submission
- [ ] 4. Verify new token is obtained automatically before the API call
- [ ] 5. Verify submission succeeds with the refreshed token

### Expected Results

- [ ] Token refreshed automatically at 50-minute mark
- [ ] No 401 errors during batch processing
- [ ] Token refresh is transparent to the user
- [ ] Old token discarded, new token cached in memory only

---

## TICKET-E2E-015: Authorisation API — Provider Access Check

**Priority**: P2
**Type**: Integration
**Estimated time**: 10 minutes

### Description
Verify the Authorisation API can check whether a provider is authorised for AIR reporting.

### Test

- Use provider `2448141T` (BOWLING GRAHAM)
- Use individual from Section 8 (Auth Release patient: Hayes, Gwen — IHI: 8003608666929138)

### Expected Results

- [ ] Authorisation check returns valid response
- [ ] Provider authorisation status correctly interpreted
- [ ] Application handles unauthorised providers gracefully

---

## TICKET-E2E-016: HTTP Error Handling

**Priority**: P1
**Type**: Integration / Resilience
**Estimated time**: 15 minutes

### Description
Verify correct handling of HTTP-level errors from the AIR API.

### Test Cases

**16a — Expired/invalid token (401):**
- Send a request with an expired or garbage bearer token
- Expected: Application detects 401 and triggers token refresh, then retries

**16b — Missing X-IBM-Client-Id (401):**
- Send a request without the X-IBM-Client-Id header
- Expected: 401 error, application logs the issue clearly

**16c — Missing required headers:**
- Omit `dhs-auditId` header
- Expected: 400 error with clear message about missing header

**16d — Server error retry (500):**
- If AIR returns 500 (AIR-E-1006), verify exponential backoff retry (max 3 attempts)
- Note: This may not be triggerable on demand — verify the retry logic exists in code review

### Expected Results

- [ ] 401 → Token refresh + retry
- [ ] 400 → Clear error message, no retry
- [ ] 500 → Exponential backoff retry (max 3), then fail gracefully
- [ ] All errors logged with correlation IDs for troubleshooting
- [ ] No PII in error logs

---

## Execution Order

Run in this order (later tests depend on earlier ones):

| Order | Ticket | Description | Blocker? |
|---|---|---|---|
| 1 | E2E-001 | PRODA Token Retrieval | YES — stop if fails |
| 2 | E2E-002 | Reference Data Retrieval | YES — stop if fails |
| 3 | E2E-003 | Individual Details Lookup | No |
| 4 | E2E-004 | Record Encounter — Success | YES — stop if fails |
| 5 | E2E-005 | Multiple Encounters | No |
| 6 | E2E-006 | Individual Not Found + Confirm | No |
| 7 | E2E-007 | Validation Errors | No |
| 8 | E2E-008 | Deceased Patient | No |
| 9 | E2E-009 | Long Names | No |
| 10 | E2E-010 | AIR Provider Number | No |
| 11 | E2E-011 | School ID | No |
| 12 | E2E-012 | Full Excel Upload E2E | Critical |
| 13 | E2E-013 | Excel Validation Errors | No |
| 14 | E2E-014 | Token Refresh | No |
| 15 | E2E-015 | Authorisation API | No |
| 16 | E2E-016 | HTTP Error Handling | No |

---

## Important Reminders

1. **DO NOT use Section 8 patients for updates** — they are read-only test data. Only use Section 5 and Section 7 patients for Record Encounter tests.
2. **Planned Catch-up Dates** — only 1 can be set per patient. If you need to reset, email `itest@servicesaustralia.gov.au`.
3. **Duplicate submissions** — if you run the same encounter twice, AIR may return duplicate warnings. Use different `vaccineDose` numbers or `dateOfService` dates for repeat runs.
4. **Error messages are sacred** — verify they are displayed EXACTLY as returned by AIR. This is a NOI certification requirement.
5. **Vaccine batch** — FLUVAX and COVID vaccines require a batch number. Check the mandatory batch list from E2E-002.
