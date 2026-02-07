# AIR Bulk Vaccination Upload System — Vendor Test Environment Setup Guide

**Document Version:** 1.0  
**Date:** 7 February 2026  
**Based on:** All TECH.SIS documentation reviewed (16 project files)

---

## 1. Executive Summary

This guide covers exactly what you need to do to connect your locally running AIR Bulk Vaccination Upload application to the **Services Australia Vendor (Test) Environment** for the AIR Web Services. It walks through every prerequisite, credential, configuration value, and endpoint — drawn directly from the official Services Australia documentation in this project.

Your system uses:
- **Frontend:** Next.js 14 App Router
- **Backend:** Python/FastAPI
- **Database:** PostgreSQL + SQLAlchemy 2.0
- **Cache:** Redis
- **Auth to AIR:** PRODA B2B OAuth 2.0 JWT

The vendor environment is a fully functional test mirror of production. Everything you build and test here carries over directly to production — only the URLs, credentials, and Minor IDs change.

---

## 2. Registration & Onboarding (Must Complete Before Any Code Hits Real Endpoints)

These steps are sequential and **cannot be skipped**. Based on the *End to End Process for Software Developers V4.0.0*:

### Step 1 — Register a PRODA Individual Account (Production Environment)

As the **Authorised Officer (AO)** — a person listed as an Associate on the ABR for your pharmacy's ABN — you must create a **production** PRODA individual account.

- Go to: [https://proda.humanservices.gov.au](https://proda.humanservices.gov.au)
- You need: Your personal identity documents (Medicare card, driver's licence, etc.)
- This account is used to register in the Developer Portal — **not** for API calls
- Only the AO needs this at initial registration stage

### Step 2 — Register on the Health Systems Developer Portal

Using your PRODA individual account, register your organisation in the portal:

- URL: Provided by Services Australia (contact Developer Liaison)
- The AO must be legally authorised to accept the Interface Agreement
- After submission, **Developer Liaison on-boards your organisation** and sends login details via email
- **Note:** PRODA is NOT used to log into the portal — you get a separate username/password

**Contact:** DeveloperLiaison@servicesaustralia.gov.au

### Step 3 — Sign In & Accept the Interface Agreement

After receiving your portal credentials:

1. Log in to the Health Systems Developer Portal
2. Accept the Interface Agreement (this is a legal contract between your org and Services Australia)
3. Agree to all associated policies
4. OTS will notify you via email when access is approved

**After acceptance, Developer Liaison provides:**
- ✅ A **Minor ID** (format: `ABC00000` — 3 alpha chars + 5 digits)
- ✅ A **PRODA development package** for integration
- ✅ **Test data** for development

### Step 4 — Delegate Additional Access (Optional)

The AO can invite additional staff to the portal with:
- **Administrator** access
- **Developer** access  
- **View Only** access

Username format requirement: Must contain the alpha letters of your Minor ID (e.g., `John_ABC`).

### Step 5 — Create Your Application in the Portal

1. Go to **Your Applications** tab → **Create New App**
2. Name your application with a version number (e.g., `AIRBulkUploadV1.0`)
3. An **API Key (Client ID)** is generated — this becomes your `X-IBM-Client-Id`
4. The Client ID is 32 hexadecimal characters (e.g., `5211a7aca10953b85a19846608e956d7`)
5. **Copy and store this securely** — you need it for every API request

> ⚠️ The `Client Secret` is NOT used in transmissions.

### Step 6 — Subscribe to AIR API Products

From the portal Home page or **API Products** tab, subscribe to:

| API Product | Required | TECH.SIS Reference |
|---|---|---|
| AIR API – Immunisation Encounter V1.4.0 | **Yes** (core) | TECH.SIS.AIR.02 |
| AIR API – Authorisation V1.0.0 | Yes | TECH.SIS.AIR.04 |
| AIR API – Individual Details V1.3.0 | Yes | TECH.SIS.AIR.05 |
| AIR API – Medical Exemptions V1.0.0 | Yes | TECH.SIS.AIR.06 |
| AIR Reference Data API V1.0.0 | Yes | TECH.SIS.AIR.07 |

> If you haven't subscribed to a product, you **cannot** access its APIs or complete testing.

### Step 7 — Download Documentation

From **User Documentation** tab → **Document Link** for AIR, download:
- All TECH.SIS documents (you have these in the project already)
- The AIR SoapUI Project (XML file for testing connectivity)
- YAML/OpenAPI specifications for all APIs

---

## 3. PRODA B2B Authentication Setup (Vendor Environment)

This is the most complex prerequisite. Your app authenticates to AIR via PRODA B2B OAuth 2.0 JWT tokens. Based on *AIR SoapUI Users Guide V9.0* and *Common Rules V3.0.9*.

### 3.1 — Create PRODA Vendor Credentials

Follow the guide: *"Guide for creating PRODA Vendor Individual Account and Linking"* (available on the portal under User Documentation → PRODA Documentation).

The process:

1. **Create a PRODA Vendor Individual Account** (separate from the production account in Step 1)
2. **Create/Link a PRODA Organisation Vendor Account**
3. **Register a B2B Device** against the organisation
4. **Activate the B2B Device** (generates a Java KeyStore / JKS file)
5. **Link the organisation to the Medicare Online/ECLIPSE/DVA/AIR Service Provider** in PRODA using your Minor ID

### 3.2 — Collect Your PRODA Credentials

After completing the above, you will have:

| Credential | Description | Example | Where Stored in Your App |
|---|---|---|---|
| `certLocation` | Path to Java KeyStore (JKS) file containing device certificates | `./certs/mydevice_vnd.jks` | Backend env config / Azure Key Vault |
| `deviceName` | Software instance (device) name registered with PRODA | `MyPharmacyBulkUploader` | Backend env config |
| `prodaOrgId` | PRODA Organisation RA number | `6656200173` | Backend env config |
| `minorId` | Minor ID linked in PRODA | `ABC00000` | Backend env config + `dhs-auditId` header |
| `X-IBM-Client-Id` | API Key from Developer Portal | `5211a7aca10953b85a19846608e956d7` | Backend env config |
| `dhs-productId` | Your software name + version | `AIRBulkUploadV1.0` | Backend env config |
| `audience` | PRODA token audience string | `https://medicareaustralia.gov.au/MCOL` | Hardcoded in auth module |

### 3.3 — Token Acquisition Flow

Your FastAPI backend must implement this flow:

```
1. Load JKS → extract private key
2. Create JWT assertion:
   - sub: prodaOrgId
   - aud: "PRODA.UNATTENDED.B2B"  
   - proda.swinst: deviceName
   - proda.org: prodaOrgId
   - iss: prodaOrgId
   - exp: current_time + 300 (5 minutes)
   - iat: current_time
3. Sign JWT with RSA-256 using device private key
4. POST to PRODA token endpoint with:
   - grant_type: urn:ietf:params:oauth:grant-type:jwt-bearer
   - assertion: <signed_JWT>
   - accesstokenAudience: https://medicareaustralia.gov.au/MCOL
5. Receive access_token (JWT), expires_in (3600 = 60 mins)
6. Use access_token as Bearer token in Authorization header
7. Track expiry — refresh BEFORE expiration
```

**PRODA Token Endpoint (Vendor):** Provided in the PRODA development package from Developer Liaison.

### 3.4 — Key & Device Expiry Management

From the token response, also track:

- **`expires_in`** — Token lifetime in seconds (3600 = 60 min). Refresh before expiry.
- **`device_expiry`** — Date/time the device itself expires. Must be refreshed in PRODA UI before expiry.
  - Notify user: 30 days before, 7 days before, then daily until expiry
- **`key_expiry`** — Date/time the signing key expires. Must generate new key and submit to PRODA before expiry.

---

## 4. API Endpoints & HTTP Headers

### 4.1 — Vendor Test Environment Base URL

The vendor (test) environment base URL is:

```
https://test.healthclaiming.api.humanservices.gov.au/claiming/ext-vnd
```

> The exact URL is provided via the Health Systems Developer Portal after registration and subscription. The above is from your existing technical specification.

### 4.2 — API Paths (Append to Base URL)

Based on *AIR Common Rules V3.0.9* Section 5.7 — Inbound Service Properties:

| API | Version | Path |
|---|---|---|
| **Record Encounter** | 1.4.0 | `/air/immunisation/v1.4/encounters/record` |
| Record Encounter | 1.3.0 | `/air/immunisation/v1.3/encounters/record` |
| Identify Individual | 1.1.0 | `/air/immunisation/v1.1/individual/details` |
| Immunisation History Details | 1.3.0 | `/air/immunisation/v1.3/individual/immunisation-history/details` |
| Update Encounter | 1.3.0 | `/air/immunisation/v1.3/encounter/update` |
| Immunisation History Statement | 1.0.0 | `/air/immunisation/v1/individual/immunisation-history/statement` |
| Authorisation Access List | 1.0.0 | `/air/immunisation/v1/authorisation/access/list` |
| Medical Contraindication Record | 1.0.0 | `/air/immunisation/v1/individual/medical-contraindication/record` |
| Natural Immunity Record | 1.0.0 | `/air/immunisation/v1/individual/natural-immunity/record` |
| Planned Catch Up Date | 1.1.0 | `/air/immunisation/v1.1/schedule/catchup` |
| **Reference Data — Vaccines** | 1.0.0 | `/air/immunisation/v1/refdata/vaccine` |
| Reference Data — Antigens | 1.0.0 | `/air/immunisation/v1/refdata/antigen` |
| Reference Data — Route of Admin | 1.0.0 | `/air/immunisation/v1/refdata/routeOfAdministration` |
| Reference Data — Mandatory Batch | 1.0.0 | `/air/immunisation/v1/refdata/vaccine/mandatory/vaccineBatch` |
| Reference Data — Country Codes | 1.0.0 | `/air/immunisation/v1/refdata/country` |

### 4.3 — Required HTTP Headers (Every Request)

From *AIR Common Rules V3.0.9* Section 5.3:

| Header | Required | Format | Description |
|---|---|---|---|
| `Authorization` | Yes | `Bearer {JWT_ACCESS_TOKEN}` | PRODA OAuth 2.0 access token |
| `X-IBM-Client-Id` | Yes | 32-char hex string | API Key from Developer Portal |
| `Content-Type` | Yes | `application/json` | Must be exactly this |
| `Accept` | No | `application/json` | Recommended |
| `dhs-messageId` | Yes | `urn:uuid:{UUID}` | Unique per request (e.g., `urn:uuid:ee703doc-844d-4fdf-843f-64c0966f9359`) |
| `dhs-correlationId` | Yes | `urn:uuid:{ID}` | Unique per session/batch — format: `urn:uuid:{minorId}{13-digit-number}` |
| `dhs-auditId` | Yes | String | Your Minor ID (e.g., `ABC00000`) |
| `dhs-auditIdType` | Yes | String | Always `Minor Id` |
| `dhs-subjectId` | Yes | `ddMMyyyy` | Date of Birth of the individual (e.g., `18102005` for 18 Oct 2005) |
| `dhs-subjectIdType` | Yes | String | `Date of Birth` (for all Record Encounter / Individual APIs) |
| `dhs-productId` | Yes | String | Software name + version (e.g., `AIRBulkUploadV1.0`) |

> **Critical:** For Record Encounter with multiple individuals in a batch, `dhs-subjectId` should use the DOB of the **first** individual in the request. Each separate API call should use the relevant individual's DOB.

> **Blank exception:** For the Authorisation Access List API, `dhs-subjectId` and `dhs-subjectIdType` should both be set to **blank** (empty string), but still included as they're mandatory headers.

---

## 5. Local Development Environment Configuration

### 5.1 — Environment Variables (.env file)

Create a `.env` file for your FastAPI backend:

```env
# ===== Environment Mode =====
AIR_ENVIRONMENT=vendor          # vendor | production

# ===== Services Australia API =====
AIR_API_BASE_URL=https://test.healthclaiming.api.humanservices.gov.au/claiming/ext-vnd
AIR_API_VERSION=1.4.0
AIR_RECORD_ENCOUNTER_PATH=/air/immunisation/v1.4/encounters/record
AIR_IDENTIFY_INDIVIDUAL_PATH=/air/immunisation/v1.1/individual/details
AIR_REFERENCE_DATA_PATH=/air/immunisation/v1/refdata

# ===== PRODA B2B Authentication =====
PRODA_TOKEN_URL=<provided_in_proda_dev_package>
PRODA_JKS_PATH=./certs/your_device_vnd.jks
PRODA_JKS_PASSWORD=<your_jks_password>
PRODA_DEVICE_NAME=<your_device_name>
PRODA_ORG_ID=<your_proda_ra_number>
PRODA_AUDIENCE=https://medicareaustralia.gov.au/MCOL

# ===== AIR Headers =====
AIR_CLIENT_ID=<your_32_char_x_ibm_client_id>
AIR_MINOR_ID=<your_minor_id_e.g._ABC00000>
AIR_PRODUCT_ID=AIRBulkUploadV1.0

# ===== Local App Database =====
DATABASE_URL=postgresql://air_user:air_pass@localhost:5432/air_db
REDIS_URL=redis://localhost:6379/0

# ===== Security =====
SECRET_KEY=<generate_random_256_bit_key>
JWT_ALGORITHM=HS256
JWT_EXPIRY_HOURS=8
```

### 5.2 — JKS Certificate Handling in Python

Java KeyStore (JKS) files are Java-native. In Python, you need to extract the private key:

```bash
pip install pyjks cryptography
```

```python
import jks
from cryptography.hazmat.primitives import serialization

def load_proda_private_key(jks_path: str, jks_password: str, alias: str = None):
    """Load private key from PRODA JKS file for JWT signing."""
    keystore = jks.KeyStore.load(jks_path, jks_password)
    
    if alias is None:
        # Use first private key entry
        alias = list(keystore.private_keys.keys())[0]
    
    pk_entry = keystore.private_keys[alias]
    
    if pk_entry.is_decrypted():
        key_bytes = pk_entry.pkey
    else:
        pk_entry.decrypt(jks_password)
        key_bytes = pk_entry.pkey
    
    private_key = serialization.load_der_private_key(key_bytes, password=None)
    return private_key
```

### 5.3 — Network Requirements

Your local machine must be able to reach:
- The PRODA vendor token endpoint (HTTPS, port 443)
- The AIR vendor API endpoint (HTTPS, port 443)
- No VPN or special network access is required — these are public internet endpoints
- TLS 1.2+ is required

---

## 6. Validation Before Hitting Real Endpoints

Before sending any request to the vendor environment, your app **must** validate locally. This is critical — per *AIR Developers Guide V3.0.8* Section 5.4, you should complete unit testing before submitting for NOI.

### 6.1 — Medicare Card Number Validation

From *Common Rules V3.0.9*, Appendix A:

```python
def validate_medicare_number(medicare_number: str) -> bool:
    """Validate 10-digit Medicare card number using check digit algorithm."""
    if not medicare_number or len(medicare_number) != 10 or not medicare_number.isdigit():
        return False
    
    weights = [1, 3, 7, 9, 1, 3, 7, 9]
    digits = [int(d) for d in medicare_number[:8]]
    
    check_sum = sum(d * w for d, w in zip(digits, weights))
    check_digit = check_sum % 10
    
    # 9th digit is check digit
    if int(medicare_number[8]) != check_digit:
        return False
    
    # 10th digit (issue number) must not be zero
    if medicare_number[9] == '0':
        return False
    
    return True
```

### 6.2 — AIR Provider Number Validation

For pharmacies / other vaccination providers (not Medicare provider numbers):

```python
def validate_air_provider_number(provider_number: str) -> bool:
    """Validate AIR provider number (State + 5 digits + check alpha)."""
    if len(provider_number) != 8:
        return False
    
    state_codes = {'A': 1, 'N': 2, 'V': 3, 'Q': 4, 'S': 5, 'W': 6, 'T': 7, 'Z': 8, 'C': 9, 'E': 9}
    check_digits = {0: 'Y', 1: 'X', 2: 'W', 3: 'T', 4: 'L', 5: 'K', 6: 'J', 7: 'H', 8: 'F', 9: 'B', 10: 'A'}
    
    state_char = provider_number[0].upper()
    if state_char not in state_codes:
        return False
    
    middle_digits = provider_number[1:6]
    if not middle_digits.isdigit():
        return False
    
    check_char = provider_number[6].upper()
    
    # Algorithm: (d1*3) + (d2*5) + (d3*8) + (d4*4) + (d5*2) + d6
    d1 = state_codes[state_char]
    d2, d3, d4, d5, d6 = [int(c) for c in middle_digits]
    
    total = (d1 * 3) + (d2 * 5) + (d3 * 8) + (d4 * 4) + (d5 * 2) + d6
    remainder = total % 11
    
    expected_check = check_digits.get(remainder)
    
    # 8th character should be blank/space (per spec: "8 characters" with trailing blank)
    return check_char == expected_check
```

### 6.3 — Key Field Validations (Pre-Submission Checklist)

| Field | Validation | Error Code |
|---|---|---|
| `dateOfBirth` | Format `yyyy-MM-dd`, not future, not >130 years ago | AIR-E-1015, AIR-E-1018, AIR-E-1019 |
| `gender` | Must be `M`, `F`, `I`, `U`, or `X` | AIR-E-1017 |
| `medicareCardNumber` | 10 digits, check digit valid per algorithm | AIR-E-1016, AIR-E-1020 |
| `medicareIRN` | 1-9, required if medicareCardNumber provided | AIR-E-1020 |
| `ihiNumber` | 16 numeric characters (no Luhn check needed) | AIR-E-1016 |
| `encounter.id` | 1-10, sequential starting from 1 | AIR-E-1013, AIR-E-1014 |
| `episode.id` | 1-5 per encounter, sequential | AIR-E-1014 |
| `vaccineCode` | Valid code from Reference Data API | AIR-E-1023 |
| `dateOfService` | `yyyy-MM-dd`, after DOB, not future | AIR-E-1015, AIR-E-1018 |
| `providerNumber` | Valid Medicare or AIR provider number | AIR-E-1028, AIR-E-1029 |
| `routeOfAdministration` | One of: `IM`, `SC`, `ID`, `OR`, `IN`, `NAS` | AIR-E-1017 |
| `vaccineBatch` | Mandatory for COVID-19, Influenza, Yellow Fever | Check via Reference Data API |
| Names (`firstName`, `lastName`) | Alpha, numeric, apostrophe, space, hyphen only; no spaces before/after apostrophes/hyphens | AIR-E-1016 |

### 6.4 — Minimum Individual Identification Requirements

At least ONE of these combinations must be provided (from *Record Encounter V6.0.7* Section 7.5):

1. **Medicare Card Number + Medicare IRN + Date of Birth + Gender**
2. **IHI Number + Date of Birth + Gender**
3. **First Name + Last Name + Date of Birth + Gender + Postcode**

---

## 7. Testing Workflow with SoapUI (Validate Connectivity First)

Before your app code hits the real endpoint, validate connectivity using SoapUI. Based on *AIR SoapUI Users Guide V9.0*:

### 7.1 — Install & Import

1. Install SoapUI V5.7.2+
2. Download the `servicesaustralia-air-samples-vendor-soapui-project-v5.xml` from the Developer Portal
3. Import: File → Import Project → select the XML file

### 7.2 — Configure Properties

In the SoapUI project, set these properties in the `vendor` test suite:

| Property | Value |
|---|---|
| `certLocation` | Path to your JKS (e.g., `C:\certs\mydevice_vnd.jks`) |
| `clientId` | Your X-IBM-Client-Id from the portal |
| `deviceName` | Your PRODA device name |
| `minorId` | Your Minor ID (e.g., `ABC00000`) |
| `prodaId` | Your PRODA Organisation RA number |
| `dhs-product-id` | Your product name + version (e.g., `AIRBulkUploadV1.0`) |

### 7.3 — Test Token Acquisition

1. Run the **"run me first (get token for AIR)"** test step
2. This calls PRODA with audience `https://medicareaustralia.gov.au/MCOL`
3. The `Authorization` property auto-populates with the Bearer JWT
4. Verify `expires_in: 3600` in the response

### 7.4 — Test API Calls

After getting a token, test each service in order:
1. **Identify Individual** — confirms connectivity and test data
2. **Record Encounter** — submit a test vaccination record
3. **Reference Data** — fetch vaccine codes, antigens, etc.

---

## 8. Record Encounter API — Request/Response Format

### 8.1 — Sample Request Payload

```json
POST {BASE_URL}/air/immunisation/v1.4/encounters/record
Content-Type: application/json
Authorization: Bearer {JWT_TOKEN}
X-IBM-Client-Id: {CLIENT_ID}
dhs-messageId: urn:uuid:a1b2c3d4-e5f6-7890-abcd-ef1234567890
dhs-correlationId: urn:uuid:ABC000001234567812345678
dhs-auditId: ABC00000
dhs-auditIdType: Minor Id
dhs-subjectId: 18102005
dhs-subjectIdType: Date of Birth
dhs-productId: AIRBulkUploadV1.0

{
  "individual": {
    "firstName": "JANE",
    "lastName": "SMITH",
    "dateOfBirth": "2005-10-18",
    "gender": "F",
    "medicareCardNumber": "2951431581",
    "medicareIRN": "1"
  },
  "informationProviderNumber": "V30001YA",
  "encounters": [
    {
      "id": 1,
      "dateOfService": "2026-01-15",
      "episodes": [
        {
          "id": 1,
          "vaccineCode": "COVAST",
          "vaccineDose": 1,
          "vaccineBatch": "FK1234",
          "vaccineType": "NIP",
          "routeOfAdministration": "IM",
          "immunisationProviderNumber": "V30001YA"
        }
      ]
    }
  ]
}
```

### 8.2 — Response Codes & Handling

| Code | Severity | Meaning | Action |
|---|---|---|---|
| **AIR-I-1007** | Info | All encounters successfully recorded | ✅ Log success, update status |
| **AIR-W-1004** | Warning | Individual not found on AIR | Prompt user to verify details, then resubmit with `acceptAndConfirm: true`, `claimId`, and `claimSequenceNumber` |
| **AIR-W-1008** | Warning | Some encounters not recorded | Review individual warnings, correct or confirm |
| **AIR-E-1005** | Error | Validation errors | Display errors to user, do NOT resubmit |
| **AIR-E-1006** | Error | System error | Log error-identifier, retry with exponential backoff |
| **AIR-E-1046** | Error | Encounters not recorded due to errors | Correct data and resubmit |
| **AIR-I-1100** | Info | Request successfully processed | ✅ Similar to AIR-I-1007 |

### 8.3 — Confirmation Flow (AIR-W-1004)

When an individual is not found, the API returns `AIR-W-1004` with `claimId` and `claimSequenceNumber`. To confirm and create a new record:

```json
{
  "individual": { ... },
  "informationProviderNumber": "V30001YA",
  "claimId": "<from_previous_response>",
  "claimSequenceNumber": "<from_previous_response>",
  "acceptAndConfirm": true,
  "encounters": [ ... ]
}
```

> ⚠️ Per Services Australia requirements, your GUI **must** display the AIR error messages **verbatim** to the user and prompt them to confirm before resubmitting.

---

## 9. Batching Rules for Bulk Upload

Your app processes ~150 records per batch. Key constraints:

- **Maximum 10 encounters per API request**
- **Maximum 5 episodes per encounter**
- Each encounter = 1 individual's visit (may have multiple vaccines)
- Each episode = 1 vaccine within that visit

For 150 records where each patient received 1 vaccine on 1 date:
- That's 150 encounters → **15 API calls** (10 encounters each, last call has 10)
- Each call needs its own `dhs-messageId` (unique UUID)
- Use the same `dhs-correlationId` across the batch for session grouping
- Each call needs the correct `dhs-subjectId` (DOB of the first individual in that call's payload)

### Rate Limiting

Implement rate limiting in your backend:
- Wait between API calls to avoid overwhelming the vendor environment
- Implement exponential backoff on `AIR-E-1006` (system error) responses
- Track token expiry — refresh the PRODA token before it expires mid-batch

---

## 10. Reference Data — Cache Locally

Call these endpoints on startup/daily to cache valid values:

```
GET {BASE_URL}/air/immunisation/v1/refdata/vaccine
GET {BASE_URL}/air/immunisation/v1/refdata/vaccine?vaccineCategoryCode=NIP
GET {BASE_URL}/air/immunisation/v1/refdata/vaccine?vaccineCategoryCode=COV19
GET {BASE_URL}/air/immunisation/v1/refdata/vaccine?vaccineCategoryCode=FLU
GET {BASE_URL}/air/immunisation/v1/refdata/antigen
GET {BASE_URL}/air/immunisation/v1/refdata/routeOfAdministration
GET {BASE_URL}/air/immunisation/v1/refdata/vaccine/mandatory/vaccineBatch
GET {BASE_URL}/air/immunisation/v1/refdata/country
```

Store in Redis with a 24-hour TTL. Use these for:
- Excel upload validation (valid vaccine codes dropdown)
- Batch number mandatory checks
- Route of administration validation
- Country code validation for overseas encounters

---

## 11. Minor ID — Correct Usage

From *Correct use of Minor ID V1.1*:

- Your initial Minor ID (e.g., `ABC00000`) identifies **your software/developer organisation**
- Each **site/location** using your software gets a unique Minor ID: `ABC00001`, `ABC00002`, etc.
- A Minor ID uniquely identifies the site where health services are rendered
- **Do not** share a Minor ID across multiple unrelated sites
- **Do not** allocate per ABN — allocate per physical location

For your pharmacy app:
- You (as developer) get `ABC00000` 
- Each pharmacy location using your system gets `ABC00001`, `ABC00002`, etc.
- Health professionals at each site submit HW027 form to link their Minor ID + provider number with Services Australia

---

## 12. NOI Certification Path

Before going to production, you must pass NOI (Notice of Integration) testing. Based on *AIR Developers Guide V3.0.8* Section 6:

### 12.1 — Pre-NOI Checklist

- [ ] Complete all unit testing locally
- [ ] Validate all business rules from TECH.SIS documents
- [ ] Successfully transmit test requests to vendor environment
- [ ] Prepare **User Manual** meeting these requirements:
  1. Privacy statement (Privacy Act 1988, HIR Act 1973, AIR Act 2015)
  2. Your customer support contact details
  3. Installation/access instructions including PRODA setup (device registration, service linking, Minor ID)
  4. Step-by-step instructions with **screenshots** for ALL API functions
  5. Instructions on vaccine code selection, dosage, provider numbers
  6. How to resubmit rejected encounters
  7. How to submit historical and overseas encounters
  8. Troubleshooting section with error messages
  9. Searchable content (not just navigable by structure)

### 12.2 — Booking NOI Testing

1. Submit your User Manual to OTS Product Integration team
2. Apply for certification via the portal: Home → Certification → View certification
3. Complete the **Application Details Form (ADF)** — available as a dynamic web form
4. OTS assigns a testing officer and booking period

**Contact:** itest@servicesaustralia.gov.au | 1300 550 115

### 12.3 — NOI Testing Requirements

- One set of test cases per AIR Web Service
- Must demonstrate full AIR functionality
- **All optional fields must be developable** (even if optional for health professionals)
- GUI screenshots required as evidence
- `dhs-productId` and `X-IBM-Client-Id` must remain consistent throughout testing

### 12.4 — Additional Requirements (API-Only Product)

Since your system is essentially an intermediary (Excel upload → API), you'll need to:
- Create your own GUI for front-end user behaviour tests with screenshots
- Provide a user manual covering front-end user support

### 12.5 — Post-NOI — Production Access

On successful NOI:
1. OTS notifies Developer Liaison
2. Developer Liaison sends production details (new URL, credentials)
3. Update your app config: swap vendor URL/credentials for production values
4. `dhs-productId` must match exactly what was certified in the NOI

---

## 13. Switching from Vendor to Production

When you have your NOI and production access:

| Configuration | Vendor (Test) | Production |
|---|---|---|
| Base URL | `https://test.healthclaiming.api.humanservices.gov.au/claiming/ext-vnd` | Provided post-certification |
| PRODA Token URL | Vendor PRODA endpoint | Production PRODA endpoint |
| JKS File | Vendor device JKS | Production device JKS (new device) |
| PRODA Org ID | Vendor RA number | Production RA number |
| X-IBM-Client-Id | Same (carry over from vendor) | Same (carry over) |
| dhs-productId | Same | Same (must match NOI) |
| Minor ID | Vendor Minor ID (e.g., `ABC00000`) | Production Minor IDs per site |
| Test Data | Provided test data only | Real patient data |

---

## 14. Support Contacts Quick Reference

| Team | Contact | Purpose |
|---|---|---|
| Developer Liaison | DeveloperLiaison@servicesaustralia.gov.au | Registration, test data, production access |
| OTS Technical Support | 1300 550 115 / onlineclaiming@servicesaustralia.gov.au | Technical issues during development |
| OTS Product Integration | itest@servicesaustralia.gov.au / 1300 550 115 | NOI certification testing |
| PRODA Support (Vendor) | 1300 550 115 / onlineclaiming@servicesaustralia.gov.au | PRODA vendor environment issues |
| PRODA Support (Production) | 1800 700 199 / PRODA@servicesaustralia.gov.au | PRODA production issues |
| eBusiness / AIR Helpdesk | 1800 700 199 / 1800 653 809 | Provider registration assistance |

---

## 15. Immediate Next Steps — Action Items

To get your locally running app hitting the real vendor test endpoints, complete these in order:

1. **✉️ Email Developer Liaison** (DeveloperLiaison@servicesaustralia.gov.au) — Register your organisation if not already done. You need to be an Authorised Officer listed on the ABR for your ABN.

2. **🔐 Create PRODA accounts** — Individual (production) → register in portal → accept Interface Agreement → create PRODA Vendor Organisation + B2B Device.

3. **📋 Collect credentials** — Minor ID, PRODA Org RA, JKS file, X-IBM-Client-Id from portal, device name.

4. **🔌 Configure your `.env`** — Populate with all credentials per Section 5.1 above.

5. **🧪 Test with SoapUI first** — Validate your PRODA token acquisition and a basic Identify Individual call before integrating into your FastAPI backend.

6. **💻 Implement PRODA auth in FastAPI** — JKS → private key → JWT assertion → token endpoint → Bearer token caching.

7. **📡 Make your first API call** — Start with Reference Data (lowest risk), then Identify Individual, then Record Encounter with test data.

8. **🔄 Build the batch processing pipeline** — Excel → validate → chunk into 10-encounter batches → submit sequentially → handle responses → confirmation flow for AIR-W-1004.

9. **📖 Write the User Manual** — Required for NOI. Start early — it has extensive screenshot requirements.

10. **🎯 Apply for NOI testing** — When all unit testing passes and you can demonstrate full functionality.

---

*This guide was compiled from the complete set of Services Australia AIR documentation available in the project: End to End Process V4.0.0, AIR Developers Guide V3.0.8, AIR Common Rules V3.0.9 (TECH.SIS.AIR.01), AIR Record Encounter V6.0.7 (TECH.SIS.AIR.02), AIR API Authorisation V1.0.3 (TECH.SIS.AIR.04), AIR API Individual Details V4.0.5 (TECH.SIS.AIR.05), AIR API Medical Exemptions V1.0.6 (TECH.SIS.AIR.06), AIR Reference Data V1.0.6 (TECH.SIS.AIR.07), AIR SoapUI Users Guide V9.0, AIR Messages Code List V1.1.6, AIR Web Services Change Guide V2.5.3, Linking your PRODA organisation to Medicare Online V1.0.4, Correct use of Minor ID V1.1, AIR Planned Catch Up Date V3.0.5, and the AIR Technical Specification V1.1.*
