# AIR Integration Documentation

## Overview

This document provides comprehensive guidance for integrating with the Australian Immunisation Register (AIR) REST Web Services. The AIR is Australia's national register that records vaccines given to people of all ages.

**Regulatory Framework:**
- Australian Immunisation Register Act 2015
- Privacy Act 1988 and Australian Privacy Principles
- My Health Records Act 2012
- Healthcare Identifiers Act 2010

**Key Integration Points:**
- **Authentication**: PRODA (Provider Digital Access) B2B OAuth 2.0
- **API**: AIR REST Web Services v1.4
- **Environment**: Vendor (development/testing) and Production
- **Certification**: NOI (Notice of Integration) required before production access

---

## PRODA Setup Requirements

### 1. Register Your Organisation

**Before you can access the AIR API, you must:**

1. **Register your organisation with PRODA**
   - Visit: https://proda.humanservices.gov.au
   - Complete organisation registration
   - Obtain your PRODA Organisation ID (RA number)
   - Note: This is separate from your ABN

2. **Link your organisation to Medicare Online**
   - Follow the guide: "Linking your PRODA organisation to Medicare Online"
   - Requires existing Medicare provider registration
   - Requires organisation authority to submit vaccination records

### 2. Create a Minor ID (dhs-auditId)

**What is a Minor ID?**
- A unique identifier for a device, location, or system that submits records to AIR
- Format: e.g., `MMS00001`, `PHM12345`
- Required in the `dhs-auditId` header for every API request

**How to Create:**
1. Log into PRODA with organisation administrator credentials
2. Navigate to Medicare Online → Manage Minor IDs
3. Create a new Minor ID for your application/location
4. Record the Minor ID value for configuration

**Important Rules (per "Correct use of Minor ID v1.1.pdf"):**
- One Minor ID per physical location or system
- Do not share Minor IDs across multiple locations
- Minor IDs must be renewed annually
- Suspended Minor IDs cannot submit records

### 3. Generate JKS Keystore for B2B Authentication

**What You Need:**
- Java Keytool (part of JDK)
- A 2048-bit RSA key pair
- JKS (Java KeyStore) format

**Steps to Generate:**

```bash
# Generate a new JKS keystore with RSA 2048-bit key pair
keytool -genkeypair -alias proda-b2b \
  -keyalg RSA -keysize 2048 \
  -storetype JKS \
  -keystore proda-keystore.jks \
  -validity 3650

# You will be prompted for:
# - Keystore password (save this securely)
# - Your name/organisation details
# - Key password (can be same as keystore password)

# Export the certificate (to register with PRODA)
keytool -exportcert -alias proda-b2b \
  -keystore proda-keystore.jks \
  -file proda-certificate.cer

# Convert to Base64 for environment variable storage
base64 -w 0 proda-keystore.jks > proda-keystore-base64.txt
```

**Register Certificate with PRODA:**
1. Log into PRODA
2. Navigate to Medicare Online → B2B Certificates
3. Upload the `proda-certificate.cer` file
4. Associate the certificate with your Minor ID

**Store Securely:**
- Save the Base64-encoded keystore in Azure Key Vault (production)
- Never commit the JKS file to version control
- Store keystore password separately in Key Vault

### 4. Configure Device Name

**What is a Device Name?**
- A descriptive identifier for the system making API requests
- Used in the JWT `sub` (subject) claim during authentication
- Format: Alphanumeric, no spaces (e.g., `AIRBulkVaxSystem01`)

**How to Register:**
1. In PRODA, navigate to Medicare Online → Devices
2. Add a new device with a descriptive name
3. Associate the device with your Minor ID and certificate
4. Record the device name for configuration

### 5. Developer Portal Registration

**Register for AIR API Access:**
1. Visit Services Australia Developer Portal
2. Register your application
3. Obtain your **X-IBM-Client-Id** (API key)
4. Receive vendor environment endpoint URLs
5. Contact Developer Liaison team for test data

**Contacts:**
- Email: DeveloperLiaison@servicesaustralia.gov.au
- Phone: OTS Technical Support 1300 550 115

---

## Authentication Flow

### PRODA B2B OAuth 2.0 JWT Flow

AIR uses PRODA (Provider Digital Access) for machine-to-machine authentication. The process uses JWT-based OAuth 2.0 grant type.

**High-Level Flow:**

```
1. Build JWT assertion signed with your private key (RS256)
2. Exchange JWT for access token at PRODA token endpoint
3. Use access token in Authorization header for AIR API calls
4. Token cached in-memory with auto-refresh before expiry
```

### Step 1: Build JWT Assertion

**JWT Header:**
```json
{
  "alg": "RS256",
  "typ": "JWT"
}
```

**JWT Claims:**
```json
{
  "iss": "MMS00001",                                    // Your Minor ID
  "sub": "AIRBulkVaxSystem01",                          // Your Device Name
  "aud": "https://medicareaustralia.gov.au/MCOL",       // PRODA audience (fixed)
  "exp": 1643835600,                                    // Now + 5 minutes (Unix timestamp)
  "iat": 1643835300,                                    // Current time (Unix timestamp)
  "jti": "550e8400-e29b-41d4-a716-446655440000"         // Unique request ID (UUID)
}
```

**Signature:**
- Algorithm: RS256 (RSA with SHA-256)
- Sign using your private key from the JKS keystore

**Implementation (Python):**
```python
import jwt
import time
from uuid import uuid4

def build_assertion(minor_id: str, device_name: str, private_key: bytes) -> str:
    now = int(time.time())
    claims = {
        "iss": minor_id,
        "sub": device_name,
        "aud": "https://medicareaustralia.gov.au/MCOL",
        "exp": now + 300,  # 5 minutes
        "iat": now,
        "jti": str(uuid4()),
    }
    return jwt.encode(claims, private_key, algorithm="RS256")
```

### Step 2: Exchange for Access Token

**Token Endpoint:**
- **Vendor**: https://proda.humanservices.gov.au/piaweb/api/b2b/v1/token
- **Production**: https://proda.humanservices.gov.au/piaweb/api/b2b/v1/token

**Request:**
```http
POST /piaweb/api/b2b/v1/token
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion={signed_jwt}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

**Implementation (Python):**
```python
import httpx

async def acquire_token(assertion: str, token_endpoint: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            token_endpoint,
            data={
                "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                "assertion": assertion,
            },
            timeout=30.0,
        )
        response.raise_for_status()
        return response.json()
```

### Step 3: Token Caching Strategy

**Cache Requirements:**
- Token lifetime: 60 minutes (3600 seconds)
- Refresh buffer: 10 minutes (600 seconds)
- Storage: **In-memory only** — never persist to database or disk
- Thread-safe caching for concurrent requests

**Refresh Logic:**
```python
class TokenCache:
    def __init__(self):
        self._access_token = None
        self._expires_at = 0.0

    def is_valid(self) -> bool:
        # Check if token is valid with 10-minute buffer
        return time.time() < (self._expires_at - 600)

    async def get_token(self) -> str:
        if not self.is_valid():
            token_data = await acquire_token(...)
            self._access_token = token_data["access_token"]
            self._expires_at = time.time() + token_data["expires_in"]
        return self._access_token
```

**Security Notes:**
- Clear token from memory if 401 Unauthorized received
- Never log the token value (log only "token acquired/refreshed" events)
- Implement singleton pattern to prevent multiple token requests

### Step 4: Use Token in API Requests

**Authorization Header:**
```http
Authorization: Bearer {access_token}
```

**Token Refresh Flow:**
```
1. Check if cached token is still valid (current_time < expires_at - 600s)
2. If valid: use cached token
3. If expired or near expiry: acquire new token
4. If AIR returns 401: clear cache and acquire new token
```

---

## AIR API Details

### Endpoints

**Base URLs:**
- **Vendor Environment**: Provided after Developer Portal registration
- **Production Environment**: Provided after NOI certification

**Key Endpoints:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/air/immunisation/v1.4/encounters/record` | POST | Submit vaccination records |
| `/air/immunisation/v1/refdata/vaccine` | GET | Retrieve vaccine reference data |
| `/air/immunisation/v1/refdata/antigen` | GET | Retrieve antigen reference data |
| `/air/immunisation/v1/refdata/routeOfAdministration` | GET | Retrieve route codes |
| `/air/immunisation/v1/refdata/vaccine/mandatory/vaccineBatch` | GET | List vaccines requiring batch number |
| `/air/immunisation/v1/refdata/country` | GET | Retrieve country codes |

### Required HTTP Headers

**Every AIR API request MUST include ALL 11 headers.** Missing any header will result in 400 or 401 errors.

**Header Specification:**

```http
Authorization: Bearer {proda_access_token}
X-IBM-Client-Id: {your_api_key}
Content-Type: application/json
Accept: application/json
dhs-messageId: urn:uuid:550e8400-e29b-41d4-a716-446655440000
dhs-correlationId: urn:uuid:6ba7b810-9dad-11d1-80b4-00c04fd430c8
dhs-auditId: MMS00001
dhs-auditIdType: Minor Id
dhs-subjectId: 18102005
dhs-subjectIdType: Date of Birth
dhs-productId: AIRBulkVax 1.0
```

**Header Details:**

| Header | Format | Example | Notes |
|--------|--------|---------|-------|
| `Authorization` | Bearer {token} | Bearer eyJhbGc... | PRODA B2B access token |
| `X-IBM-Client-Id` | UUID or API key | abc123-def456 | From Developer Portal |
| `Content-Type` | MIME type | application/json | Always JSON |
| `Accept` | MIME type | application/json | Always JSON |
| `dhs-messageId` | urn:uuid:{UUID} | urn:uuid:550e8400... | Unique per request |
| `dhs-correlationId` | urn:uuid:{UUID} | urn:uuid:6ba7b810... | Same for related requests |
| `dhs-auditId` | Minor ID | MMS00001 | Your registered Minor ID |
| `dhs-auditIdType` | Literal string | Minor Id | Always "Minor Id" |
| `dhs-subjectId` | ddMMyyyy | 18102005 | Patient DOB (18 Oct 2005) |
| `dhs-subjectIdType` | Literal string | Date of Birth | Always "Date of Birth" |
| `dhs-productId` | Name Version | AIRBulkVax 1.0 | Your software name + version |

**Critical Date Format Rules:**
- **API Request Body**: Dates use `yyyy-MM-dd` format (e.g., `2005-10-18`)
- **dhs-subjectId Header**: Date uses `ddMMyyyy` format (e.g., `18102005`)

**UUID Requirements:**
- `dhs-messageId`: Generate a new UUID for every API request
- `dhs-correlationId`: Use same UUID for all requests in a logical transaction/batch

### Record Encounter Request Structure

**Endpoint:**
```http
POST /air/immunisation/v1.4/encounters/record
```

**Request Limits:**
- Maximum **10 encounters** per request
- Maximum **5 episodes** per encounter
- Encounter IDs must start at 1 and increment sequentially
- Episode IDs must start at 1 (per encounter) and increment sequentially

**Example Request:**

```json
{
  "individual": {
    "personalDetails": {
      "dateOfBirth": "1990-01-15",
      "gender": "F",
      "firstName": "Jane",
      "lastName": "Smith"
    },
    "medicareCard": {
      "medicareCardNumber": "2123456789",
      "medicareIRN": "1"
    },
    "ihiNumber": "8003608833357361",
    "address": {
      "postCode": "2000"
    }
  },
  "encounters": [
    {
      "id": "1",
      "dateOfService": "2026-02-01",
      "episodes": [
        {
          "id": "1",
          "vaccineCode": "COMIRN",
          "vaccineDose": "1",
          "vaccineBatch": "FL1234",
          "vaccineType": "NIP",
          "routeOfAdministration": "IM"
        }
      ],
      "immunisationProvider": {
        "providerNumber": "1234567A"
      },
      "administeredOverseas": false,
      "antenatalIndicator": false
    }
  ],
  "informationProvider": {
    "providerNumber": "1234567A"
  }
}
```

**Field Descriptions:**

| Field | Type | Required | Format | Notes |
|-------|------|----------|--------|-------|
| `dateOfBirth` | string | Yes | yyyy-MM-dd | Must not be future or >130 years ago |
| `gender` | string | Yes | M, F, I, U | M=Male, F=Female, I=Intersex, U=Unknown |
| `firstName` | string | Conditional | Max 40 chars | Required if no Medicare/IHI |
| `lastName` | string | Conditional | Max 40 chars | Required if no Medicare/IHI |
| `medicareCardNumber` | string | Conditional | 10 digits | Validated with check digit algorithm |
| `medicareIRN` | string | Conditional | 1-9 | Required if Medicare provided |
| `ihiNumber` | string | Conditional | 16 digits | No Luhn validation required |
| `postCode` | string | Conditional | 4 digits | Required if no Medicare/IHI |
| `dateOfService` | string | Yes | yyyy-MM-dd | Must be after DOB, not future |
| `vaccineCode` | string | Yes | 1-6 chars | Must exist in reference data |
| `vaccineDose` | string | Yes | 1-20 | Dose sequence number |
| `vaccineBatch` | string | Conditional | 1-15 chars | Mandatory for COVID/Flu/Yellow Fever |
| `vaccineType` | string | Conditional | NIP, AEN, OTH | NIP=National, AEN=Additional, OTH=Other |
| `routeOfAdministration` | string | Conditional | IM, SC, ID, OR, IN, NAS | See reference data |
| `providerNumber` | string | Yes | 6-8 chars | Must be current at date of service |

### Minimum Identification Requirements

AIR attempts to identify individuals using these combinations (in priority order):

**1. Medicare Card (Preferred):**
- `medicareCardNumber` (10 digits)
- `medicareIRN` (1-9)
- `dateOfBirth`
- `gender`

**2. IHI Number:**
- `ihiNumber` (16 digits)
- `dateOfBirth`
- `gender`

**3. Demographic Match:**
- `firstName`
- `lastName`
- `dateOfBirth`
- `gender`
- `postCode`

**If no match found:** AIR returns `AIR-W-1004` (Individual Not Found). User must review and confirm to proceed.

### Response Handling

**Status Code Classification:**

| Status Code | Type | Meaning | Action Required |
|-------------|------|---------|-----------------|
| `AIR-I-1007` | Info | All encounters successfully recorded | Mark as SUCCESS |
| `AIR-I-1000` | Info | Individual encounter recorded | Mark encounter as SUCCESS |
| `AIR-W-1004` | Warning | Individual not found on AIR | Prompt user to confirm details |
| `AIR-W-1008` | Warning | Some encounters not recorded | Parse per-encounter results |
| `AIR-W-1001` | Warning | Encounter NOT successfully recorded | Display warning, allow confirm |
| `AIR-E-1005` | Error | Validation errors in request | Display errors to user |
| `AIR-E-1006` | Error | System error | Retry with exponential backoff |
| `AIR-E-1046` | Error | Encounters not confirmable | Correct and resubmit |

**Success Response Example:**

```json
{
  "statusCode": "AIR-I-1007",
  "message": "All encounters were successfully recorded"
}
```

**Warning Response Example:**

```json
{
  "statusCode": "AIR-W-1004",
  "message": "Individual details provided do not match an individual registered on the AIR. Verify details are correct, then resubmit with acceptAndConfirm flag set to 'Y'.",
  "claimDetails": {
    "claimId": "WC297@+5",
    "claimSequenceNumber": "1"
  }
}
```

**Error Response Example:**

```json
{
  "statusCode": "AIR-E-1005",
  "message": "The request contains validation errors",
  "validationErrors": [
    {
      "code": "AIR-E-1023",
      "message": "Vaccine code 'INVALID' is not valid",
      "field": "encounters[0].episodes[0].vaccineCode"
    }
  ]
}
```

**CRITICAL RULE:**
> Error messages MUST be displayed to the end user exactly as supplied by Services Australia — not truncated, transformed, or modified in any way.

Store the raw `message` string from AIR responses and display verbatim in the UI.

### Confirm Encounter Flow

When `AIR-W-1004` (individual not found) or `AIR-W-1008` (pended episodes) is returned:

**Steps:**

1. **Extract confirmation details:**
   - `claimId` from response
   - `claimSequenceNumber` from response

2. **Present warning to user:**
   - Display the AIR message verbatim
   - Show affected encounter details
   - Provide "Confirm" and "Correct & Resubmit" options

3. **Build confirmation request:**

```json
{
  "individual": { /* same as original */ },
  "encounters": [
    {
      "id": "1",
      "acceptAndConfirm": "Y",
      "dateOfService": "2026-02-01",
      "episodes": [ /* same as original */ ],
      "immunisationProvider": { /* same as original */ }
    }
  ],
  "informationProvider": { /* same as original */ },
  "claimId": "WC297@+5",
  "claimSequenceNumber": "1"
}
```

4. **Submit confirmation:**
   - POST to same endpoint
   - Use same headers (with new `dhs-messageId`)
   - Remove already-successful encounters from retry payload

**Important:**
- Only confirm encounters that require confirmation
- Do not resubmit already-successful encounters
- Set `acceptAndConfirm: "Y"` (string, not boolean)

### Reference Data API

**Cache Strategy:**
- Cache reference data locally
- Refresh daily (or on startup)
- Use cached data for validation before submission

**Vaccine Reference Data:**

```http
GET /air/immunisation/v1/refdata/vaccine
```

**Response:**
```json
{
  "vaccines": [
    {
      "vaccineCode": "COMIRN",
      "vaccineName": "Comirnaty COVID-19 vaccine",
      "vaccineCategoryCode": "COV19",
      "status": "Current"
    }
  ]
}
```

**Filter by Category:**
```http
GET /air/immunisation/v1/refdata/vaccine?vaccineCategoryCode=NIP
GET /air/immunisation/v1/refdata/vaccine?vaccineCategoryCode=COV19
GET /air/immunisation/v1/refdata/vaccine?vaccineCategoryCode=FLU
```

**Routes of Administration:**

```http
GET /air/immunisation/v1/refdata/routeOfAdministration
```

**Response:**
```json
{
  "routesOfAdministration": [
    {
      "code": "IM",
      "description": "Intramuscular"
    },
    {
      "code": "SC",
      "description": "Subcutaneous"
    },
    {
      "code": "ID",
      "description": "Intradermal"
    },
    {
      "code": "OR",
      "description": "Oral"
    },
    {
      "code": "IN",
      "description": "Intranasal"
    },
    {
      "code": "NAS",
      "description": "Nasal"
    }
  ]
}
```

**Vaccines Requiring Batch Number:**

```http
GET /air/immunisation/v1/refdata/vaccine/mandatory/vaccineBatch
```

**Response:**
```json
{
  "vaccines": [
    "COMIRN",
    "SPIKEVAX",
    "VAXZEVRIA",
    "INFLUVAC",
    "FLUARIX",
    "STAMARIL"
  ]
}
```

---

## Provider Registration

### Medicare Provider Numbers

**Format:** 8 characters
- 6-digit stem (provider identity)
- 1 practice location character
- 1 check digit

**Example:** `1234567A`

**Practice Location Characters:**
- Valid: `0-9`, `A-H`, `J-N`, `P-Y` (excluding I, O, S, Z)
- Each character maps to a numeric value:
  - `0-9` = 0-9
  - `A-Y` = 10-31 (skipping I, O, S, Z)

**Check Digit Algorithm:**

```python
def validate_medicare_provider(provider_num: str) -> bool:
    if len(provider_num) != 8:
        return False

    stem = provider_num[:6]
    location_char = provider_num[6]
    check_digit_char = provider_num[7]

    # Map location character to numeric value
    location_map = {
        '0': 0, '1': 1, '2': 2, '3': 3, '4': 4,
        '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
        'A': 10, 'B': 11, 'C': 12, 'D': 13, 'E': 14,
        'F': 15, 'G': 16, 'H': 17, 'J': 18, 'K': 19,
        'L': 20, 'M': 21, 'N': 22, 'P': 23, 'Q': 24,
        'R': 25, 'T': 26, 'U': 27, 'V': 28, 'W': 29,
        'X': 30, 'Y': 31
    }

    if location_char not in location_map:
        return False

    location_value = location_map[location_char]

    # Calculate check digit
    weighted = (
        int(stem[0]) * 3 +
        int(stem[1]) * 5 +
        int(stem[2]) * 8 +
        int(stem[3]) * 4 +
        int(stem[4]) * 2 +
        int(stem[5]) * 1 +
        location_value * 6
    )

    check_digit_index = weighted % 11
    check_digit_map = ['Y', 'X', 'W', 'V', 'T', 'R', 'Q', 'P', 'N', 'M', 'L']

    expected_check_digit = check_digit_map[check_digit_index]

    return check_digit_char == expected_check_digit
```

### AIR Provider Numbers

**Format:** 8 characters
- 1 state code (alpha)
- 5 digits
- 1 check digit (alpha)
- 1 blank space or padding character

**Example:** `V12345N `

**State Codes:**
- `V` = Victoria
- `N` = New South Wales
- `Q` = Queensland
- `W` = Western Australia
- `S` = South Australia
- `T` = Tasmania
- `A` = Australian Capital Territory
- `X` = Northern Territory

**Check Digit Algorithm:**

```python
def validate_air_provider(provider_num: str) -> bool:
    if len(provider_num) != 8:
        return False

    state_code = provider_num[0]
    digits = provider_num[1:6]
    check_digit = provider_num[6]

    state_map = {
        'V': 0, 'N': 1, 'Q': 2, 'W': 3,
        'S': 4, 'T': 5, 'A': 6, 'X': 7
    }

    if state_code not in state_map:
        return False

    state_value = state_map[state_code]

    weighted = (
        state_value * 3 +
        int(digits[0]) * 5 +
        int(digits[1]) * 8 +
        int(digits[2]) * 4 +
        int(digits[3]) * 2 +
        int(digits[4]) * 1
    )

    check_digit_index = weighted % 11
    check_digit_map = ['Y', 'X', 'W', 'V', 'T', 'R', 'Q', 'P', 'N', 'M', 'L']

    expected_check_digit = check_digit_map[check_digit_index]

    return check_digit == expected_check_digit
```

**AIR API Validation:**
- Provider numbers must exist in AIR
- Provider must be **current** at the date of service
- Information provider must be authorised for AIR access

---

## Certification Process

### Development Phase

**1. Register with Developer Portal**
- Complete application registration
- Receive vendor environment credentials
- Obtain X-IBM-Client-Id (API key)

**2. Develop Against Vendor Environment**
- Use provided vendor endpoint URLs
- Test with Services Australia-provided test data
- Never use real patient data in vendor environment

**3. Request Test Data**
- Contact: DeveloperLiaison@servicesaustralia.gov.au
- Provide use case descriptions
- Receive validated test scenarios

### OTS (Online Test Suite) Review

**Purpose:** Validate your integration before certification

**Process:**
1. Complete integration testing in vendor environment
2. Contact OTS team: itest@servicesaustralia.gov.au
3. Submit test results and documentation
4. OTS team reviews your submission

**Required Documentation:**
- Application Details Form
- Preliminary Test Plan
- Integration Test Plan
- User manual
- GUI screenshots

### NOI (Notice of Intent) Certification

**Required Before Production Access**

**Submission Requirements:**

1. **Application Details Form**
   - Software name and version
   - Organisation details
   - Technical contact information

2. **Test Plans**
   - All 5 workflow use cases tested (per TECH.SIS.AIR.02 Section 6)
   - Error handling scenarios
   - Confirmation flows

3. **Documentation**
   - User manual showing how staff use the system
   - Screenshots of all key screens
   - Error message display examples

4. **Technical Specification**
   - Integration architecture
   - Security measures
   - Data handling processes

**5 Required Test Cases:**

1. **Standard Success Flow**
   - Submit valid encounter
   - Receive AIR-I-1007 success

2. **Request Validation Fails**
   - Submit invalid data
   - Receive AIR-E-1005 with validation errors
   - Display errors to user

3. **Individual Not Found (Confirm Flow)**
   - Submit valid data for unmatched individual
   - Receive AIR-W-1004
   - Display warning to user
   - Resubmit with acceptAndConfirm=Y

4. **Encounter Has Pended Episodes**
   - Submit encounter with conditional warnings
   - Receive AIR-W-1008
   - Parse per-encounter results
   - Allow selective confirmation

5. **Encounters With Errors (Non-confirmable)**
   - Submit encounter with non-confirmable errors
   - Receive AIR-E-1046
   - Display errors
   - Correct and resubmit

**Approval Process:**
1. Submit NOI application via OTS portal
2. OTS team reviews submission (2-4 weeks)
3. Address any feedback or issues
4. Receive NOI approval certificate
5. Transition to production credentials

### Production Migration

**After NOI Approval:**

1. **Receive Production Credentials**
   - Production endpoint URLs
   - Production X-IBM-Client-Id
   - Production PRODA configuration

2. **Update Configuration**
   - Switch environment from `vendor` to `production`
   - Update all environment variables
   - Verify PRODA B2B certificate registered for production

3. **Phased Rollout**
   - Start with limited users/locations
   - Monitor submissions closely
   - Gradually expand to full deployment

4. **Ongoing Support**
   - Contact: DeveloperLiaison@servicesaustralia.gov.au
   - Phone: 1300 550 115 (technical support)
   - PRODA Production Support: 1800 700 199

---

## AIR Error Codes

### Information Codes (AIR-I-*)

| Code | Description | Action |
|------|-------------|--------|
| `AIR-I-1007` | All encounters successfully recorded | Mark batch as SUCCESS |
| `AIR-I-1000` | Individual encounter recorded | Mark encounter as SUCCESS |

### Warning Codes (AIR-W-*)

| Code | Description | Action |
|------|-------------|--------|
| `AIR-W-1004` | Individual not found on AIR | Prompt user to verify details, resubmit with acceptAndConfirm |
| `AIR-W-1008` | Some encounters not recorded | Parse per-encounter results, show warnings |
| `AIR-W-1001` | Encounter NOT successfully recorded | Display warning, allow confirmation or correction |

### Error Codes (AIR-E-*) - Request Validation

| Code | Description | Cause |
|------|-------------|-------|
| `AIR-E-1005` | Validation errors in request | See validationErrors array for details |
| `AIR-E-1013` | Max encounters exceeded | >10 encounters in single request |
| `AIR-E-1014` | Episode sequencing error | IDs must start at 1 and increment by 1 |
| `AIR-E-1015` | Date of service before DOB | Invalid date relationship |
| `AIR-E-1016` | Invalid format for field | Field does not match expected format |
| `AIR-E-1017` | Invalid field value | Value fails check digit or permitted values |
| `AIR-E-1018` | Date is in the future | Cannot record future dates |
| `AIR-E-1019` | Date indicates age >130 years | DOB too old |
| `AIR-E-1020` | Medicare number required with IRN | IRN provided but card number missing |
| `AIR-E-1022` | Invalid date of service | Date before 1996 or other invalid date |
| `AIR-E-1023` | Invalid vaccine code | Code not in reference data |
| `AIR-E-1024` | Invalid vaccine dose | Dose not in range 1-20 |
| `AIR-E-1026` | Insufficient identification | Missing required ID combination |
| `AIR-E-1027` | Invalid school ID | School ID format invalid |
| `AIR-E-1028` | Provider not current at DOS | Immunising provider not registered/current |
| `AIR-E-1029` | Information provider not current | Provider not authorised or current |

### Error Codes (AIR-E-*) - Business Rules

| Code | Description | Cause |
|------|-------------|-------|
| `AIR-E-1039` | Minor ID not authorised | Minor ID suspended or not linked to org |
| `AIR-E-1046` | Encounters not confirmable | Cannot use acceptAndConfirm for these errors |
| `AIR-E-1063` | Provider not authorised for AIR | Information provider lacks AIR access |
| `AIR-E-1079` | Country code required | administeredOverseas=true but country missing |
| `AIR-E-1081` | Batch number mandatory | Vaccine requires batch (COVID/Flu/Yellow Fever) |
| `AIR-E-1084` | Invalid vaccine type | vaccineType not NIP/AEN/OTH |
| `AIR-E-1085` | Invalid route of administration | Route not in reference data |
| `AIR-E-1086` | Vaccine type incompatible | vaccineType doesn't match vaccineCode category |
| `AIR-E-1087` | Route incompatible with vaccine | Route not valid for this vaccine |
| `AIR-E-1088` | Mandatory field missing | Required field not provided |
| `AIR-E-1089` | Antenatal indicator required | Missing mandatory antenatal flag |

### System Error Codes (AIR-E-*)

| Code | Description | Action |
|------|-------------|--------|
| `AIR-E-1006` | System error | Retry with exponential backoff (max 3 retries) |

### HTTP Status Codes

| Status | Meaning | Action |
|--------|---------|--------|
| 200 | Success | Parse response body for AIR status code |
| 400 | Bad Request | Check headers and request format |
| 401 | Unauthorized | Refresh PRODA token and retry once |
| 406 | Not Acceptable | Fix Accept header (must be application/json) |
| 415 | Unsupported Media Type | Fix Content-Type header |
| 500 | Internal Server Error | Retry with backoff |
| 502 | Bad Gateway | Retry with backoff |
| 503 | Service Unavailable | Retry with backoff |

---

## Best Practices

### Security

1. **Token Management**
   - Store PRODA tokens in-memory only
   - Never log token values
   - Clear token on 401 and re-authenticate

2. **Keystore Security**
   - Store JKS in Azure Key Vault (production)
   - Never commit keystores to version control
   - Rotate certificates before expiry

3. **Audit Logging**
   - Log all API requests and responses
   - Mask PII in logs (Medicare numbers, names, DOBs)
   - Include correlation IDs for tracing

### Error Handling

1. **Display AIR Messages Verbatim**
   - Never modify error messages from Services Australia
   - Store raw message text
   - Display exactly as received

2. **Retry Strategy**
   - Retry only for AIR-E-1006 and HTTP 5xx errors
   - Use exponential backoff (2^attempt seconds)
   - Maximum 3 retry attempts
   - Never retry validation errors (AIR-E-1005)

3. **User Communication**
   - Clearly distinguish errors, warnings, and success
   - Provide actionable guidance for each error type
   - Allow users to correct and resubmit

### Performance

1. **Batch Optimization**
   - Group encounters by individual and date
   - Maximum 10 encounters per API request
   - Submit batches sequentially (not parallel)

2. **Reference Data Caching**
   - Cache vaccine codes, routes, countries
   - Refresh daily or on startup
   - Use cached data for client-side validation

3. **Rate Limiting**
   - Respect Services Australia rate limits
   - Implement application-level throttling
   - Monitor submission queue depth

---

## Reference Documentation

### Services Australia Specifications

| Document | Version | Governs |
|----------|---------|---------|
| AIR Common Rules | TECH.SIS.AIR.01 V3.0.9 | HTTP headers, errors, date formats |
| AIR Record Encounter | TECH.SIS.AIR.02 V6.0.7 | Record/confirm encounter payloads |
| AIR API Authorisation | TECH.SIS.AIR.04 V1.0.3 | Provider access validation |
| AIR API Individual Details | TECH.SIS.AIR.05 V4.0.5 | Individual lookup |
| AIR Reference Data | TECH.SIS.AIR.07 V1.0.6 | Vaccine codes, routes, countries |
| AIR Developers Guide | V3.0.8 | Developer portal, NOI process |
| Correct Use of Minor ID | V1.1 | Minor ID assignment rules |
| AIR Messages Code List | V1.1.6 | All error/warning/info codes |

### Key Contacts

| Team | Contact | Purpose |
|------|---------|---------|
| Developer Liaison | DeveloperLiaison@servicesaustralia.gov.au | Registration, test data, production access |
| OTS Technical Support | 1300 550 115 | Technical issues during development |
| OTS Product Integration | itest@servicesaustralia.gov.au | NOI certification testing |
| PRODA Support (Production) | 1800 700 199 | PRODA production issues |

### Related Links

- **Services Australia Developer Portal**: https://developer.servicesaustralia.gov.au
- **PRODA Portal**: https://proda.humanservices.gov.au
- **Medicare Provider Portal**: https://medicareportal.servicesaustralia.gov.au

---

## Implementation Checklist

### PRODA Setup
- [ ] Register organisation with PRODA
- [ ] Create Minor ID for system/location
- [ ] Generate JKS keystore (2048-bit RSA)
- [ ] Export certificate and register with PRODA
- [ ] Configure device name in PRODA
- [ ] Store JKS Base64 in Key Vault
- [ ] Store keystore password in Key Vault

### Developer Portal
- [ ] Register application
- [ ] Obtain X-IBM-Client-Id
- [ ] Receive vendor environment endpoints
- [ ] Request test data from Developer Liaison

### Development
- [ ] Implement JWT assertion builder
- [ ] Implement PRODA token acquisition
- [ ] Implement in-memory token caching
- [ ] Implement AIR API client with all 11 headers
- [ ] Implement retry logic for system errors
- [ ] Implement confirm encounter flow
- [ ] Cache reference data (vaccines, routes, countries)
- [ ] Implement batch grouping logic
- [ ] Validate Medicare/provider check digits
- [ ] Display AIR messages verbatim

### Testing
- [ ] Test standard success flow (AIR-I-1007)
- [ ] Test validation errors (AIR-E-1005)
- [ ] Test individual not found flow (AIR-W-1004)
- [ ] Test pended episodes flow (AIR-W-1008)
- [ ] Test non-confirmable errors (AIR-E-1046)
- [ ] Test system error retry (AIR-E-1006)
- [ ] Test token refresh before expiry
- [ ] Test 401 token expiry handling

### Certification
- [ ] Complete OTS review
- [ ] Prepare NOI documentation
- [ ] Submit Application Details Form
- [ ] Submit Test Plans
- [ ] Submit user manual and screenshots
- [ ] Address OTS feedback
- [ ] Receive NOI approval

### Production Deployment
- [ ] Receive production credentials
- [ ] Update environment configuration
- [ ] Register production PRODA certificate
- [ ] Perform smoke test in production
- [ ] Begin phased rollout
- [ ] Monitor production submissions
- [ ] Document lessons learned

---

**Last Updated:** 2026-02-07
**Document Version:** 1.0
**Author:** AIR Bulk Vaccination Upload System
**Review Cycle:** Quarterly or when Services Australia publishes spec updates
