# Vaccination-Upload

Bulk upload for vaccination encounters to AIR



\# AIR Bulk Vaccination Upload System



Web application for non-technical pharmacy staff to upload Excel vaccination records and submit them to the Australian Immunisation Register (AIR) via Services Australia REST Web Services.



---



\## For Claude Code: Read These First



```bash

cat claude.md    # ★ MANDATORY — 829-line project instructions, tech stack, AIR rules, algorithms

cat TODO.md      # ★ 38 tickets across 7 phases — your work queue

```



> \*\*Rule\*\*: `claude.md` is the single source of truth. When `TODO.md` conflicts with `claude.md`, follow `claude.md`.



---



\## Tech Stack



| Layer | Technology |

|---|---|

| Frontend | Next.js 14 (App Router), React 18, TypeScript strict, TailwindCSS, Zustand, React Query, React Hook Form + Zod, SheetJS |

| Backend | Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy 2.0 async, Alembic, httpx, structlog |

| Database | PostgreSQL 16 |

| Cache | Redis 7 |

| Auth (App) | JWT (HS256) + HttpOnly cookies, Argon2id passwords |

| Auth (AIR) | PRODA B2B OAuth 2.0 JWT (RS256), 60-min token, refresh at 50 min |

| Infrastructure | Azure Australia East (Sydney), Docker, Terraform |



---



\## Project Structure



```

Vaccination-Upload/

│

├── claude.md                    ← Claude Code instructions (READ FIRST)

├── TODO.md                      ← 38 development tickets, 7 phases

├── README.md                    ← This file

├── .env.example                 ← Environment variable template

├── .gitignore

│

├── docs/

│   ├── air-specs/               ← Services Australia documentation (16 files)

│   │   ├── AIR\_Record\_Encounter\_V6\_0\_7.pdf          # Core API: request/response, use cases, data elements

│   │   ├── AIR\_Common\_Rules\_TECH\_SIS\_\_AIR\_\_01\_\_V3\_0\_9.pdf  # Validation algorithms (Appendix A), business rules

│   │   ├── AIR\_API\_Authorisation\_TECH\_SIS\_\_AIR\_\_04\_\_V1\_0\_3.pdf  # PRODA B2B OAuth flow, headers, JKS certs

│   │   ├── AIR\_API\_Individual\_Details\_V4\_0\_5.pdf     # Individual ID rules, minimum ID combinations

│   │   ├── AIR\_API\_Medical\_Exemptions\_TECH\_SIS\_\_AIR\_\_06\_\_V1\_0\_6.pdf  # Medical exemptions (future scope)

│   │   ├── AIR\_Reference\_Data\_V\_1\_0\_6.pdf            # Vaccine codes, antigens, routes, country codes

│   │   ├── AIR\_Messages\_Code\_List\_V1\_1\_6.pdf         # All AIR-I/W/E response codes + required behaviour

│   │   ├── AIR\_Developers\_Guide\_\_V3\_0\_8.pdf          # Onboarding, registration, NOI certification

│   │   ├── AIR\_Planned\_Catch\_Up\_Date\_V3\_0\_5.pdf      # Catch-up date calculation

│   │   ├── AIR\_Web\_Services\_Change\_Guide\_V2\_5\_3.pdf  # API versioning and change history

│   │   ├── AIR\_SoapUI\_Users\_Guide\_V9\_0.pdf           # Manual testing reference

│   │   ├── AIR\_Technical\_Specification\_v1\_1.docx      # Project tech spec v1.1 (superseded by v1.2)

│   │   ├── Correct\_use\_of\_Minor\_ID\_v1\_1.pdf          # Minor ID format for dhs-auditId header

│   │   ├── End\_to\_End\_Process\_for\_Software\_Developers\_\_AIR\_0\_1.pdf  # Register → develop → test → certify

│   │   └── Linking\_your\_PRODA\_organisation\_to\_Medicare\_Online\_Guide\_V1\_0\_4.pdf  # PRODA org setup

│   │

│   └── tech-specs/

│       └── AIR\_Technical\_Specification\_v1\_2.docx      # Our tech spec v1.2 (architecture, infra, compliance)

│

├── frontend/                    ← Next.js 14 App Router

│   ├── app/

│   │   ├── (auth)/login/        # Login page

│   │   └── (dashboard)/         # Authenticated pages

│   │       ├── upload/          # Excel upload + preview

│   │       ├── validate/        # Validation results grid

│   │       ├── submit/          # Progress monitor + results

│   │       ├── history/         # Past submissions

│   │       ├── settings/        # PRODA config, environment toggle

│   │       └── users/           # User management (admin)

│   ├── components/              # Shared UI components

│   ├── lib/                     # Client utilities

│   │   ├── excel/               # SheetJS parser + template generator

│   │   └── validation/          # Client-side validators (Medicare, provider, business rules)

│   ├── stores/                  # Zustand state management

│   └── types/                   # TypeScript type definitions

│

├── backend/                     ← Python FastAPI

│   ├── app/

│   │   ├── main.py              # FastAPI app factory

│   │   ├── config.py            # Pydantic Settings (all env vars)

│   │   ├── dependencies.py      # DI: get\_db, get\_current\_user

│   │   ├── exceptions.py        # Custom exception classes

│   │   ├── routers/             # API endpoints

│   │   │   ├── auth.py          # POST /api/auth/login, logout, me

│   │   │   ├── validate.py      # POST /api/validate

│   │   │   ├── submit.py        # POST /api/submit, GET progress

│   │   │   ├── confirm.py       # POST /api/submit/confirm

│   │   │   ├── history.py       # GET /api/history

│   │   │   ├── reference\_data.py # GET /api/reference-data/\*

│   │   │   ├── organisations.py # GET/PUT org settings

│   │   │   └── users.py         # User CRUD

│   │   ├── models/              # SQLAlchemy 2.0 models

│   │   │   ├── organisation.py  # organisations table

│   │   │   ├── user.py          # users table (5 roles)

│   │   │   ├── submission.py    # submission\_batches + submission\_records

│   │   │   └── audit.py         # audit\_log table

│   │   ├── schemas/             # Pydantic request/response models

│   │   │   ├── air\_request.py   # AddEncounterRequest payload

│   │   │   ├── air\_response.py  # AIR response parsing

│   │   │   ├── user.py          # Login/user schemas

│   │   │   └── validation.py    # ValidationResult, ExcelRowSchema

│   │   ├── services/            # Business logic

│   │   │   ├── proda\_auth.py    # PRODA B2B token acquisition

│   │   │   ├── air\_client.py    # HTTP client (11 headers, retry logic)

│   │   │   ├── encounter\_service.py  # Build/process Record Encounter

│   │   │   ├── confirm\_service.py    # AIR-W-1004/1008 confirmation flow

│   │   │   ├── batch\_processor.py    # Grouping + submission orchestration

│   │   │   ├── validation\_engine.py  # All validators orchestrated

│   │   │   ├── excel\_parser.py       # openpyxl server-side parsing

│   │   │   ├── reference\_data.py     # AIR ref data cache (Redis, 24h TTL)

│   │   │   └── auth\_service.py       # User auth, JWT, sessions

│   │   ├── middleware/          # Auth, RBAC, audit, error handling

│   │   └── utils/               # Medicare validator, provider validator, UUID helpers

│   ├── tests/

│   │   ├── unit/                # pytest unit tests (>80% coverage)

│   │   ├── integration/         # End-to-end with mock AIR API

│   │   └── fixtures/            # Sample Excel files

│   ├── alembic/                 # Database migrations

│   ├── requirements.txt

│   └── Dockerfile

│

└── infrastructure/

&nbsp;   ├── docker-compose.yml       # Local dev: PostgreSQL 16 + Redis 7

&nbsp;   ├── docker-compose.prod.yml  # Production compose

&nbsp;   └── terraform/               # Azure resources (App Service, DB, Key Vault)

```



---



\## Key Document Reference



When implementing a feature, consult these documents:



| Topic | Primary Document | claude.md Section |

|---|---|---|

| API request/response format | `AIR\_Record\_Encounter\_V6\_0\_7.pdf` | § AIR API Integration Rules |

| HTTP headers (11 mandatory) | `AIR\_API\_Authorisation\_TECH\_SIS\_\_AIR\_\_04\_\_V1\_0\_3.pdf` | § HTTP Headers |

| Medicare check digit algorithm | `AIR\_Common\_Rules\_TECH\_SIS\_\_AIR\_\_01\_\_V3\_0\_9.pdf` (Appendix A) | § Validation Algorithms |

| Provider number check digit | `AIR\_Common\_Rules\_TECH\_SIS\_\_AIR\_\_01\_\_V3\_0\_9.pdf` (Appendix A) | § Validation Algorithms |

| Individual identification rules | `AIR\_API\_Individual\_Details\_V4\_0\_5.pdf` | § Excel Template Specification |

| Error codes + required behaviour | `AIR\_Messages\_Code\_List\_V1\_1\_6.pdf` | § Error Handling |

| Vaccine codes, routes, batches | `AIR\_Reference\_Data\_V\_1\_0\_6.pdf` | § Reference Data |

| PRODA B2B auth flow | `AIR\_API\_Authorisation\_TECH\_SIS\_\_AIR\_\_04\_\_V1\_0\_3.pdf` | § PRODA B2B Authentication |

| Minor ID usage | `Correct\_use\_of\_Minor\_ID\_v1\_1.pdf` | § Minor ID |

| NOI certification process | `End\_to\_End\_Process\_for\_Software\_Developers\_\_AIR\_0\_1.pdf` | — |

| Azure infrastructure | `docs/tech-specs/AIR\_Technical\_Specification\_v1\_2.docx` | — |



---



\## Development Workflow



\### Ticket Execution Order



```

Phase 1 — Foundation:     TICKET-001 → 002 → 003 → 004 → 005

Phase 2 — Validation:     TICKET-006 → 007 → 008 → 009 → 010 → 011 → 012 → 013

Phase 3 — AIR API:        TICKET-014 → 015 → 016 → 017 → 018 → 019

Phase 4 — Frontend:       TICKET-020 → 021 → 022 → 023 → 024 → 025 → 026 → 027 → 028

Phase 5 — Error Handling: TICKET-029 → 030 → 031

Phase 6 — Testing:        TICKET-032 → 033 → 034

Phase 7 — Docs \& Deploy:  TICKET-035 → 036 → 037 → 038

```



Frontend (Phase 4) can start in parallel once TICKET-004 (auth) is done.



\### Branch Pattern



```bash

git checkout -b feature/TICKET-NNN-short-name

\# ... implement + test ...

git add -A \&\& git commit -m "feat(scope): TICKET-NNN description"

git checkout main \&\& git merge feature/TICKET-NNN-short-name

```



---



\## Local Development Setup



\### Prerequisites



\- Node.js 20+ (via nvm)

\- Python 3.12+ (via deadsnakes PPA)

\- Docker (for PostgreSQL 16 + Redis 7)

\- Git configured with SSH key to GitHub



\### First-Time Setup



```bash

\# Clone

git clone git@github.com:dcanna06/Vaccination-Upload.git

cd Vaccination-Upload



\# Copy env template and fill in credentials

cp .env.example .env



\# Start databases

docker start air-postgres air-redis

\# Or if containers don't exist yet:

\# docker run -d --name air-postgres -p 5432:5432 -e POSTGRES\_DB=air\_vaccination -e POSTGRES\_USER=air\_admin -e POSTGRES\_PASSWORD=airdev123 postgres:16-alpine

\# docker run -d --name air-redis -p 6379:6379 redis:7-alpine



\# Backend

cd backend

python3.12 -m venv .venv

source .venv/bin/activate

pip install -r requirements.txt

alembic upgrade head

uvicorn app.main:app --reload --port 8000



\# Frontend (new terminal)

cd frontend

npm install

npm run dev

```



\### Docker Containers



| Container | Port | Image | Credentials |

|---|---|---|---|

| air-postgres | 5432 | postgres:16-alpine | air\_admin / airdev123 / air\_vaccination |

| air-redis | 6379 | redis:7-alpine | — |



---



\## Key AIR API Constraints



These are non-negotiable requirements from Services Australia:



\- \*\*Max 10 encounters per API request\*\* (AIR-E-1013 if exceeded)

\- \*\*Max 5 episodes per encounter\*\* (sequential IDs starting at 1)

\- \*\*11 mandatory HTTP headers\*\* on every request

\- \*\*Date formats\*\*: API body uses `yyyy-MM-dd`, `dhs-subjectId` header uses `ddMMyyyy`

\- \*\*AIR error messages must be displayed VERBATIM\*\* — never truncate or modify

\- \*\*PRODA tokens\*\*: 60-min expiry, refresh at 50-min mark, in-memory only

\- \*\*Gender values\*\*: M, F, I, U (not X)

\- \*\*IHI\*\*: 16 numeric characters, NO Luhn check

\- \*\*Medicare\*\*: 10 digits, weighted check digit algorithm (see claude.md)



---



\## Environments



| Environment | Base URL | Purpose |

|---|---|---|

| Vendor (Test) | `https://test.healthclaiming.api.humanservices.gov.au/claiming/ext-vnd` | Development + NOI certification |

| Production | `https://healthclaiming.api.humanservices.gov.au/claiming/ext` | Live submissions (after NOI) |



---



\## Contacts



| Role | Contact |

|---|---|

| Developer Registration | DeveloperLiaison@servicesaustralia.gov.au |

| NOI Testing | itest@servicesaustralia.gov.au |

| Technical Support | OTS 1300 550 115 |

