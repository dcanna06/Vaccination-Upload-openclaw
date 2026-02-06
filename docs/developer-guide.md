# Developer Guide

AIR Bulk Vaccination Upload System - Developer documentation for local setup, development workflow, and API reference.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.12+** - Backend runtime
- **Node.js 18+** and npm - Frontend runtime
- **Docker Desktop** - For PostgreSQL and Redis
- **Git** - Version control

## Local Development Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Vaccination-Upload
```

### 2. Start Infrastructure Services

Start PostgreSQL and Redis using Docker Compose:

```bash
docker compose -f infrastructure/docker-compose.yml up -d
```

Verify services are running:

```bash
docker ps
# Should show air-postgres and air-redis containers running
```

### 3. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment configuration
cp ../.env.example ../.env
# Edit .env with your configuration (see Environment Variables section)
```

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
```

## Environment Variables

Create a `.env` file in the project root with the following configuration:

### Application Settings

```env
APP_ENV=vendor                      # vendor | production
FRONTEND_URL=http://localhost:3000
LOG_FORMAT=console                  # json | console
```

### PRODA Authentication

```env
PRODA_MINOR_ID=                     # Your Minor ID (e.g., MMS00001)
PRODA_DEVICE_NAME=                  # Device name registered with PRODA
PRODA_AUDIENCE=https://medicareaustralia.gov.au/MCOL
```

For PRODA JKS keystore:

```env
JKS_BASE64=                         # Base64-encoded JKS keystore file
JKS_PASSWORD=                       # JKS keystore password
```

### AIR API Configuration

```env
AIR_CLIENT_ID=                      # X-IBM-Client-Id from Developer Portal
AIR_PRODUCT_ID=AIRBulkVax 1.0      # Your product name and version
```

### Database and Cache

```env
DATABASE_URL=postgresql+asyncpg://air_admin:airdev123@localhost:5432/air_vaccination
REDIS_URL=redis://localhost:6379/0
```

## Running the Application

### Backend (FastAPI)

From the `backend` directory:

```bash
# Activate virtual environment if not already active
source .venv/bin/activate

# Run development server with hot reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

API documentation (Swagger UI): `http://localhost:8000/docs`

### Frontend (Next.js)

From the `frontend` directory:

```bash
# Run development server
npm run dev
```

The application will be available at `http://localhost:3000`

## API Endpoints

### Health Check

```http
GET /health
```

Returns service health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-07T12:00:00Z"
}
```

### Template Download

```http
GET /api/template
```

Downloads the Excel template for vaccination records.

**Response:** Excel file (XLSX)

### File Upload

```http
POST /api/upload
Content-Type: multipart/form-data
```

Uploads and parses an Excel file containing vaccination records.

**Request Body:**
- `file`: Excel file (multipart form data)

**Response:**
```json
{
  "success": true,
  "filename": "vaccinations.xlsx",
  "rows_parsed": 150,
  "data": [...]
}
```

### Validate Records

```http
POST /api/validate
Content-Type: application/json
```

Validates parsed vaccination records against AIR business rules.

**Request Body:**
```json
{
  "records": [
    {
      "medicare_card_number": "2123456789",
      "medicare_irn": "1",
      "date_of_birth": "1990-01-15",
      "gender": "F",
      "first_name": "Jane",
      "last_name": "Smith",
      "date_of_service": "2026-02-01",
      "vaccine_code": "COMIRN",
      "vaccine_dose": "1",
      "vaccine_batch": "FL1234",
      "vaccine_type": "NIP",
      "route_of_administration": "IM",
      "immunising_provider_number": "1234567A"
    }
  ]
}
```

**Response:**
```json
{
  "valid": true,
  "errors": [],
  "warnings": [],
  "record_count": 150
}
```

### Submit to AIR

```http
POST /api/submit
Content-Type: application/json
```

Submits validated records to the Australian Immunisation Register.

**Request Body:**
```json
{
  "records": [...],
  "batch_id": "uuid-v4"
}
```

**Response:**
```json
{
  "submission_id": "uuid-v4",
  "status": "pending",
  "total_records": 150
}
```

### Check Submission Progress

```http
GET /api/submit/{submission_id}/progress
```

Retrieves the current progress of a batch submission.

**Response:**
```json
{
  "submission_id": "uuid-v4",
  "status": "processing",
  "progress": {
    "total": 150,
    "processed": 75,
    "successful": 70,
    "warnings": 3,
    "errors": 2
  }
}
```

### Confirm Encounters

```http
POST /api/submit/{submission_id}/confirm
Content-Type: application/json
```

Confirms encounters that require user confirmation (e.g., AIR-W-1004, AIR-W-1008).

**Request Body:**
```json
{
  "encounter_ids": ["enc-1", "enc-2"],
  "claim_id": "WC297@+5",
  "claim_sequence_number": "1"
}
```

### Get Submission Results

```http
GET /api/submit/{submission_id}/results
```

Retrieves detailed results for a completed submission.

**Response:**
```json
{
  "submission_id": "uuid-v4",
  "status": "completed",
  "summary": {
    "total": 150,
    "successful": 145,
    "warnings": 3,
    "errors": 2
  },
  "records": [...]
}
```

### Pause Submission

```http
POST /api/submit/{submission_id}/pause
```

Pauses an in-progress submission.

### Resume Submission

```http
POST /api/submit/{submission_id}/resume
```

Resumes a paused submission.

## Testing

### Backend Tests

From the `backend` directory:

```bash
# Activate virtual environment
source .venv/bin/activate

# Run all tests with verbose output
pytest backend/tests/ -v

# Run with coverage report
pytest backend/tests/ -v --cov=app --cov-report=html

# Run specific test file
pytest backend/tests/test_validation.py -v
```

### Frontend Tests

From the `frontend` directory:

```bash
# Run all tests
npx vitest run

# Run in watch mode (for development)
npx vitest

# Run with coverage
npx vitest run --coverage
```

## Architecture Overview

### System Components

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Browser   │ ◄─────► │   Next.js    │ ◄─────► │   FastAPI   │
│  (React)    │         │  Frontend    │         │   Backend   │
└─────────────┘         └──────────────┘         └──────┬──────┘
                                                         │
                                                         ▼
                        ┌──────────────┐         ┌─────────────┐
                        │  PostgreSQL  │         │    Redis    │
                        │   Database   │         │    Cache    │
                        └──────────────┘         └─────────────┘
                                                         │
                                                         ▼
                                                  ┌─────────────┐
                                                  │  PRODA B2B  │
                                                  │    Auth     │
                                                  └──────┬──────┘
                                                         │
                                                         ▼
                                                  ┌─────────────┐
                                                  │  AIR API    │
                                                  │  (Services  │
                                                  │ Australia)  │
                                                  └─────────────┘
```

### Data Flow

1. **Upload**: User uploads Excel file through Next.js frontend
2. **Parse**: Backend (FastAPI) parses Excel using openpyxl
3. **Validate**: Server-side validation against AIR business rules
4. **Group**: Records grouped into encounters and episodes
5. **Authenticate**: PRODA B2B token acquired using JKS keystore
6. **Submit**: Batches of up to 10 encounters submitted to AIR API
7. **Track**: Progress stored in PostgreSQL, real-time updates via Redis
8. **Confirm**: User confirms warnings (AIR-W-1004, AIR-W-1008) if needed
9. **Results**: Final results displayed with verbatim AIR messages

### Key Technologies

**Backend:**
- **FastAPI**: Async Python web framework with automatic OpenAPI docs
- **Pydantic**: Data validation using Python type hints
- **SQLAlchemy 2.0**: Async ORM for PostgreSQL
- **structlog**: Structured JSON logging (no PII/PHI)
- **openpyxl**: Excel file parsing
- **httpx**: Async HTTP client for AIR API
- **pytest**: Testing framework with async support

**Frontend:**
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **TailwindCSS**: Utility-first CSS framework
- **Zustand**: Lightweight state management
- **React Hook Form + Zod**: Form handling and validation
- **Vitest**: Fast unit testing framework

**Infrastructure:**
- **PostgreSQL 16**: Primary database
- **Redis 7**: Caching and session management
- **Docker Compose**: Local development environment

## Development Guidelines

### Code Style

**Python:**
- Follow PEP 8 conventions
- Use type hints on all function signatures
- Use async/await for I/O operations
- Import order: stdlib, third-party, local
- Use structlog for all logging (never print or logging module)

**TypeScript:**
- Strict mode enabled
- No `any` types (use `unknown` with type guards)
- Prefer named exports
- Use interfaces for object shapes
- Component files: PascalCase
- Utility files: camelCase

### Validation Rules

The system implements AIR-specific validation rules:

- **Medicare Card Number**: 10 digits with check digit validation
- **IHI Number**: 16 digits (format only, NO Luhn check)
- **Provider Number**: Medicare or AIR format with check digit
- **Gender**: M, F, I, U (NOT X)
- **Date Format**: yyyy-MM-dd in API, ddMMyyyy in headers
- **Vaccine Type**: NIP, AEN, OTH
- **Route of Administration**: IM, SC, ID, OR, IN, NAS

### Logging

**CRITICAL**: Never log PII/PHI (Personal/Protected Health Information)

```python
# Good - masked
logger.info("validating_record", medicare="****6789", row=123)

# Bad - exposes PII
logger.info("validating_record", medicare="2123456789", name="Jane Smith")
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/TICKET-NNN-description

# Make changes and commit
git add <files>
git commit -m "feat(scope): TICKET-NNN description"

# Run tests before pushing
pytest backend/tests/ -v
npm --prefix frontend test

# Merge to main when complete
git checkout main
git merge feature/TICKET-NNN-description
```

### Error Handling

**Display AIR error messages verbatim** - never modify, truncate, or transform error messages from Services Australia:

```typescript
// Good - verbatim display
<ErrorMessage>{response.air_message}</ErrorMessage>

// Bad - modified message
<ErrorMessage>Error: Individual not found. Please check details.</ErrorMessage>
```

## Troubleshooting

### Docker Services Won't Start

```bash
# Check if ports are already in use
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis

# Restart services
docker compose -f infrastructure/docker-compose.yml restart

# View logs
docker compose -f infrastructure/docker-compose.yml logs -f
```

### Backend Import Errors

```bash
# Ensure virtual environment is activated
source backend/.venv/bin/activate

# Reinstall dependencies
pip install -r backend/requirements.txt
```

### Frontend Module Not Found

```bash
# Clean install
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### PRODA Authentication Failures

- Verify JKS keystore is Base64-encoded correctly
- Check PRODA_MINOR_ID matches registration
- Ensure PRODA_AUDIENCE is exactly `https://medicareaustralia.gov.au/MCOL`
- Token expires after 60 minutes - check auto-refresh logic

### AIR API Errors

- **401 Unauthorized**: Check PRODA token is valid and not expired
- **Missing header**: Ensure all `dhs-*` headers are present
- **AIR-E-1005**: Validation error - check request payload format
- **AIR-E-1006**: System error - retry with exponential backoff

## Additional Resources

- **AIR Technical Specifications**: `/docs/air-specs/`
- **API Reference**: `http://localhost:8000/docs` (when running)
- **Project Instructions**: `/claude.md`
- **Task Tracking**: `/TODO.md`
- **Progress Log**: `/PROGRESS.md`

For production deployment, NOI certification, and PRODA registration details, consult the main `claude.md` file.
