# Vendor Recommendation Platform

An internal platform for the operations team to manage vendors and receive intelligent vendor recommendations based on work requirements, vendor performance history, and AI-generated summaries.

---

## Table of Contents

1. [Project Architecture](#1-project-architecture)
2. [Database Design](#2-database-design)
3. [API Design](#3-api-design)
4. [Recommendation Logic](#4-recommendation-logic)
5. [AI Usage](#5-ai-usage)
6. [Assumptions](#6-assumptions)
7. [Trade-offs](#7-trade-offs)
8. [Getting Started](#8-getting-started)

---

## 1. Project Architecture

The platform is a RESTful API server built in layers. Each layer has a single responsibility — routes only handle HTTP concerns, services contain business logic, and libs hold shared infrastructure clients.

### System Architecture

```mermaid
flowchart TD
    Client(["👤 Operations Team\n(Postman / Frontend)"])

    subgraph Server["Express Server — localhost:3000"]
        direction TB
        Routes["Routes Layer\n/api/vendors\n/api/vendor-documents\n/api/vendor-ratings\n/api/work-requirements\n/api/recommendations"]
        Services["Services Layer\nBusiness Logic + Zod Validation"]
        Libs["Libs\nprisma.ts · openrouter.ts"]
    end

    subgraph External["External Services"]
        DB[("PostgreSQL\n(Neon)")]
        AI["OpenRouter API\nLlama 3.1 8B"]
    end

    Client -->|HTTP Request| Routes
    Routes -->|Delegates| Services
    Services -->|Query / Mutate| Libs
    Libs -->|SQL via Prisma| DB
    Libs -->|REST| AI
    Services -->|Response| Routes
    Routes -->|JSON| Client
```

### Folder Structure

```
src/
├── index.ts                  ← Express app, route registration
├── routes/
│   ├── vendor.ts
│   ├── vendor-documents.ts
│   ├── vendor-ratings.ts
│   ├── work-requirements.ts
│   └── recommendations.ts
├── services/
│   ├── vendor.ts
│   ├── vendor-documents.ts
│   ├── vendor-ratings.ts     ← contains rank recalculation trigger
│   ├── work-requirements.ts
│   └── recommendations.ts    ← contains AI summary generation
└── libs/
    ├── prisma.ts             ← PrismaClient singleton
    └── openrouter.ts         ← OpenAI-compatible client for OpenRouter

prisma/
├── schema.prisma             ← all models and relations
├── seed.ts                   ← test data
└── migrations/
```

---

## 2. Database Design

### Entity Relationship Diagram

```mermaid
erDiagram
    Category {
        int id PK
        string name UK
    }

    Vendor {
        int id PK
        string name
        string vendorType
        string contactName
        string contactPhone
        string contactEmail
        enum currentStatus
        datetime createdAt
        datetime updatedAt
    }

    VendorCategory {
        int vendorId FK
        int categoryId FK
        int addedBy
        datetime addedAt
    }

    VendorLocation {
        int id PK
        int vendorId FK
        string location
    }

    VendorDocument {
        int id PK
        int vendorId FK
        enum documentType
        string documentUrl
        date issueDate
        date expiryDate
        enum verificationStatus
        int verifiedBy
        datetime uploadedAt
    }

    WorkRequirement {
        int id PK
        string title
        int categoryId FK
        string location
        decimal estimatedValue
        enum priority
        date expectedStartDate
        enum status
        int createdBy
        datetime createdAt
    }

    VendorRating {
        int id PK
        int vendorId FK
        int workRequirementId FK
        int ratingValue
        int ratedBy
        string notes
        datetime createdAt
    }

    VendorRank {
        int id PK
        int vendorId FK
        int categoryId FK
        decimal rankValue
        datetime updatedAt
    }

    Recommendation {
        int id PK
        int workRequirementId FK
        int vendorId FK
        int rankAtTimeOfRec
        bool wasSelected
        datetime generatedAt
    }

    Category        ||--o{ VendorCategory   : "grouped via"
    Category        ||--o{ WorkRequirement  : "scopes"
    Category        ||--o{ VendorRank       : "ranks within"
    Vendor          ||--o{ VendorCategory   : "assigned to"
    Vendor          ||--o{ VendorLocation   : "operates in"
    Vendor          ||--o{ VendorDocument   : "holds"
    Vendor          ||--o{ VendorRating     : "rated in"
    Vendor          ||--o{ VendorRank       : "ranked by"
    Vendor          ||--o{ Recommendation   : "appears in"
    WorkRequirement ||--o{ VendorRating     : "receives"
    WorkRequirement ||--o{ Recommendation   : "generates"
```

### Key Constraints and Indexes

| Table | Constraint | Purpose |
|---|---|---|
| `vendor_category` | `UNIQUE (vendorId, categoryId)` | A vendor cannot be in the same category twice |
| `vendor_location` | `UNIQUE (vendorId, location)` | No duplicate location rows per vendor |
| `vendor_rating` | `UNIQUE (vendorId, workRequirementId)` | One rating per vendor per job |
| `vendor_rank` | `UNIQUE (vendorId, categoryId)` | One rank row per vendor per category |
| `vendor_rank` | `INDEX (categoryId, rankValue DESC)` | Fast sorted lookup when building recommendation list |
| `vendor_document` | `INDEX (vendorId, verificationStatus, expiryDate)` | Efficient eligibility filtering by compliance status |
| `recommendation` | `INDEX (workRequirementId)` | Fast audit lookups per work requirement |

### Why Ranks are a Separate Table

Storing ranks separately from ratings allows the recommendation query to do a single indexed lookup on `vendor_rank` rather than computing aggregates across all ratings at query time. The rank stays pre-computed and is only updated when a rating changes — not on every recommendation request.

---

## 3. API Design

### Route Overview

```mermaid
flowchart LR
    subgraph Vendors["/api/vendors"]
        V1["GET /"]
        V2["GET /:id"]
        V3["POST /"]
        V4["PUT /:id"]
        V5["DELETE /:id"]
    end

    subgraph Docs["/api/vendor-documents"]
        D1["GET /"]
        D2["GET /:id"]
        D3["POST /"]
        D4["PUT /:id"]
        D5["DELETE /:id"]
    end

    subgraph WR["/api/work-requirements"]
        W1["GET /"]
        W2["GET /:id"]
        W3["POST /"]
        W4["PUT /:id"]
        W5["DELETE /:id"]
    end

    subgraph Ratings["/api/vendor-ratings"]
        R1["GET /"]
        R3["POST /"]
        R4["PUT /:id"]
        R5["DELETE /:id"]
    end

    subgraph Rec["/api/recommendations"]
        RC1["GET /?workRequirementId=n"]
    end
```

### Request Validation

Every mutating endpoint validates its request body with a **Zod schema** before touching the database. Invalid requests return `400` with a structured error listing every field that failed:

```json
{
  "error": [
    { "path": ["ratingValue"], "message": "Number must be less than or equal to 5" },
    { "path": ["vendorId"], "message": "Required" }
  ]
}
```

### Error Response Conventions

| HTTP Status | When |
|---|---|
| `400` | Zod validation failed — missing or invalid fields |
| `404` | Resource not found (Prisma `P2025`) or foreign key not found |
| `409` | Duplicate unique constraint violated (Prisma `P2002`) — e.g. rating a vendor twice on the same job |
| `500` | Unexpected server error |

### Recommendation Response Shape

```json
{
  "workRequirement": {
    "id": 4,
    "title": "New Office Electrical Upgrade",
    "category": "Electrical",
    "location": "Dubai",
    "priority": "high",
    "estimatedValue": "150000.00"
  },
  "totalMatches": 3,
  "aiSummary": "Based on historical performance, Volta Electric Co. is the top recommendation...",
  "recommendations": [
    {
      "position": 1,
      "vendor": {
        "id": 2,
        "name": "Volta Electric Co.",
        "vendorType": "Contractor",
        "contactName": "Sara Khalid",
        "contactEmail": "sara@voltaelectric.ae",
        "locations": ["Dubai", "Sharjah"],
        "categories": ["Electrical"]
      },
      "rankValue": "5.00"
    }
  ]
}
```

---

## 4. Recommendation Logic

The recommendation engine is built on three stages that run in sequence: **rate → rank → recommend**.

### Stage 1 — Submit a Rating

```mermaid
flowchart TD
    A([POST /api/vendor-ratings]) --> B{Zod Validation\nratingValue 1–5\nall required fields present}
    B -- Invalid --> C([400 Bad Request])
    B -- Valid --> D[Lookup WorkRequirement\nto resolve categoryId]
    D --> E{WorkRequirement\nexists?}
    E -- No --> F([404 Not Found])
    E -- Yes --> G[INSERT VendorRating]
    G --> H[[Trigger: recalculateVendorRank\nvendorId · categoryId]]
    H --> I([201 Created])
```

> The same recalculation trigger fires on **PUT** (rating edited) and **DELETE** (rating removed).

---

### Stage 2 — Rank Recalculation

Every rating change immediately re-computes the vendor's average for that category and updates the `vendor_rank` table in the same request.

```mermaid
flowchart TD
    A[[recalculateVendorRank\nvendorId · categoryId]] --> B

    B["SELECT AVG rating_value\nFROM vendor_rating\nJOIN work_requirement ON categoryId\nWHERE vendorId matches"]

    B --> C{Result?}

    C -- "NULL — no ratings\nremain in this category" --> D["DELETE vendor_rank\n(removes stale data)"]
    C -- "Average computed" --> E{Does a rank\nrow exist?}

    E -- No --> F["INSERT vendor_rank\nrankValue = avg"]
    E -- Yes --> G["UPDATE vendor_rank\nSET rankValue = avg"]

    D & F & G --> H([Done — rank is live])
```

**How rank evolves over time (example — PowerTech, Electrical):**

```mermaid
timeline
    title PowerTech Solutions — Electrical Category Rank
    Rated 4 on Job 1    : Ratings [4]       : Rank = 4.00
    Rated 3 on Job 5    : Ratings [4, 3]    : Rank = 3.50
    Job 1 updated to 5  : Ratings [5, 3]    : Rank = 4.00
    Job 5 rating deleted : Ratings [5]      : Rank = 5.00
    All ratings removed  : Ratings []       : Rank row deleted
```

---

### Stage 3 — Recommendation Query

```mermaid
flowchart TD
    A([GET /api/recommendations\n?workRequirementId=4]) --> B{Validate\nworkRequirementId}
    B -- Invalid --> C([400 Bad Request])
    B -- Valid --> D[Fetch WorkRequirement\ncategoryId · location · priority]
    D --> E{Exists?}
    E -- No --> F([404 Not Found])
    E -- Yes --> G

    G["Filter active vendors\n──────────────────\n✓ currentStatus = active\n✓ VendorLocation includes location\n✓ VendorCategory includes categoryId"]

    G --> H["Join VendorRank\nfor this categoryId"]
    H --> I["Sort by rankValue DESC\nNULL rank → bottom of list"]
    I --> J["Persist to Recommendation\n(audit snapshot with rankAtTimeOfRec)"]
    J --> K[Build ranked result list]
    K --> L[[Call OpenRouter AI\nfor summary]]
    L --> M{AI responded?}
    M -- Yes --> N["Attach aiSummary\nto response"]
    M -- "No (quota / error)" --> O["aiSummary: null\n(still return ranked list)"]
    N & O --> P([200 OK])
```

**Matching rules:**

| Rule | Detail |
|---|---|
| Category match | Vendor must be assigned to the exact same category as the work requirement via `VendorCategory` |
| Location match | Vendor must have the exact work requirement location in their `VendorLocation` list |
| Status | Vendor must be `active` — `inactive`, `blacklisted`, and `pending_verification` are excluded |
| Unranked vendors | Still returned, placed after all ranked vendors, so the team knows they exist as an option |

---

### Full Request Lifecycle

```mermaid
sequenceDiagram
    actor Ops as Operations Team
    participant API as Express API
    participant DB as PostgreSQL
    participant AI as OpenRouter

    Note over Ops,DB: Phase 1 — Rate a completed job

    Ops->>API: POST /api/vendor-ratings\n{ vendorId:2, workRequirementId:1, ratingValue:5 }
    API->>DB: INSERT INTO vendor_rating
    API->>DB: SELECT AVG(rating_value) WHERE vendor=2, category=Electrical
    DB-->>API: avg = 4.50
    API->>DB: UPSERT vendor_rank SET rankValue = 4.50
    DB-->>API: OK
    API-->>Ops: 201 Created

    Note over Ops,AI: Phase 2 — Get recommendations for new work requirement

    Ops->>API: GET /api/recommendations?workRequirementId=4
    API->>DB: SELECT * FROM work_requirement WHERE id=4
    DB-->>API: { categoryId:1, location:"Dubai" }
    API->>DB: SELECT vendors WHERE active\nAND location=Dubai\nAND category=Electrical\nJOIN vendor_rank
    DB-->>API: Volta(5.0), PowerTech(4.0), MultiSkill(3.0)
    API->>DB: DELETE recommendations WHERE workRequirementId=4
    API->>DB: INSERT recommendations (Volta pos1, PowerTech pos2, MultiSkill pos3)
    API->>AI: Prompt with work requirement + ranked vendors
    AI-->>API: "Volta Electric Co. leads with a perfect 5.0..."
    API-->>Ops: 200 OK { recommendations:[...], aiSummary:"..." }
```

---

## 5. AI Usage

### What it does

After the ranked vendor list is assembled, the platform calls **OpenRouter** to generate a short, professional summary that the operations team can read at a glance — rather than interpreting a table of numbers.

### Model

`meta-llama/llama-3.1-8b-instruct:free` via [OpenRouter](https://openrouter.ai).

This is a free-tier model that is fast enough for synchronous use and produces well-structured text for business summarisation tasks.

### Prompt Design

The prompt is structured to give the model exactly what it needs — no more:

```
You are an assistant for an internal vendor management platform.

Work requirement:
- Title: New Office Electrical Upgrade
- Category: Electrical
- Location: Dubai
- Priority: high
- Estimated Value: AED 150000

Ranked vendors:
1. Volta Electric Co. (Contractor) — Rank: 5.00, Locations: Dubai, Sharjah
2. PowerTech Solutions (Contractor) — Rank: 4.00, Locations: Dubai, Abu Dhabi
3. MultiSkill Services (Contractor) — Rank: 3.00, Locations: Dubai

Write a concise 3–4 sentence recommendation summary for the operations team.
Mention the top vendor by name and explain why they lead. If any vendor is
unranked, note they are new with no prior performance data. Keep the tone
professional and practical.
```

### Graceful Degradation

The AI call is wrapped in its own `try/catch` inside the recommendations service. If the call fails for any reason (network error, quota exceeded, invalid key), the endpoint still returns the full ranked list with `aiSummary: null`. The recommendation system is never blocked by the AI layer.

```
ranked list assembled  →  try AI call
                               ↓ success  →  aiSummary: "Volta leads..."
                               ↓ failure  →  aiSummary: null
                          return 200 either way
```

---

## 6. Assumptions

| # | Assumption |
|---|---|
| 1 | **No authentication layer.** `createdBy`, `ratedBy`, and `addedBy` are plain integer user IDs. Auth is out of scope — these fields exist so the data model is ready when an auth system is added later. |
| 2 | **Location is a free-text string** (e.g. `"Dubai"`), not a structured address or coordinates. Matching is exact string equality. |
| 3 | **One rating per vendor per work requirement.** A vendor can only be rated once per completed job. If a re-evaluation is needed, the existing rating is updated via PUT. |
| 4 | **Rank = simple average** of all ratings in a category. All past jobs are weighted equally regardless of recency or job size. |
| 5 | **Vendor categories are admin-curated.** The `VendorCategory` table has an `addedBy` field — category assignments are not self-declared by vendors. |
| 6 | **Active vendors only** appear in recommendations. Vendors with `inactive`, `blacklisted`, or `pending_verification` status are silently excluded. |
| 7 | **Unranked vendors are still surfaced.** A newly onboarded vendor with zero ratings appears at the bottom of the recommendation list rather than being hidden, giving the team visibility of all options. |
| 8 | **A vendor can cover multiple categories.** For example, a multi-skill contractor can be assigned to both Electrical and HVAC, and will have an independent rank in each. |
| 9 | **Document verification is tracked but not enforced** in the recommendation filter. Documents are stored and can be reviewed, but they do not currently gate a vendor from appearing in results. |

---

## 7. Trade-offs

### Synchronous rank recalculation vs. async queue

**Chosen:** Recalculate rank synchronously in the same HTTP request that saves the rating.

| Synchronous (current) | Async queue (alternative) |
|---|---|
| Simple — no extra infrastructure | More resilient under high write load |
| Rank is always up-to-date | Rank may lag behind ratings briefly |
| Adds ~5–20 ms latency to rating POST | Rating POST returns immediately |
| Fine for low–medium write volume | Better for high-frequency rating ingestion |

For an internal operations tool with tens of ratings per day, synchronous is the right call. An async queue would add complexity (Redis, a worker process, retry logic) that is not justified at this scale.

---

### Simple average vs. weighted ranking

**Chosen:** Simple average of all historical ratings per category.

| Simple average (current) | Weighted alternatives |
|---|---|
| Easy to understand and audit | Harder to explain to the ops team |
| All jobs contribute equally | Could decay older ratings or weight by job value |
| Can be gamed by small sample size | Bayesian prior or minimum-rating threshold mitigates this |

A vendor rated 5.0 on a single small job outranks one rated 4.8 over 20 jobs. This is a known limitation. A Bayesian average (blending with a global prior) would be a straightforward upgrade if the team finds the current ranking misleading in practice.

---

### Exact location matching vs. geo-based matching

**Chosen:** Exact string match on location name.

| Exact match (current) | Geo-based (alternative) |
|---|---|
| Zero infrastructure needed | Requires PostGIS or a geocoding API |
| Simple to seed and test | Handles radius-based or region-based matching |
| Brittle if location names are inconsistent | Robust to spelling variations |
| Fine for a fixed set of known cities | Needed for open-ended location input |

Since the platform operates within a known set of cities (Dubai, Abu Dhabi, Sharjah, etc.), exact matching is sufficient and avoids introducing a geo dependency.

---

### Persisting recommendations vs. computing on-the-fly

**Chosen:** Persist recommendations to the `Recommendation` table after every query.

| Persisted (current) | On-the-fly only (alternative) |
|---|---|
| Full audit trail — who got recommended when | No storage overhead |
| Can track `wasSelected` for future ML features | No historical record |
| Slightly more DB writes per recommendation call | Simpler |

The audit trail is explicitly called out in the spec as important. Persisting also enables future analytics: which vendors are consistently recommended but never selected, or whether the highest-ranked vendor wins the job.

---

### Free AI model vs. paid model

**Chosen:** `meta-llama/llama-3.1-8b-instruct:free` on OpenRouter.

| Free model (current) | Paid model (e.g. GPT-4o) |
|---|---|
| Zero cost | Per-token cost |
| Rate limits apply | Higher/configurable limits |
| Good enough for short summaries | Better instruction-following, more nuanced output |
| Summary quality is acceptable | Higher quality, fewer hallucinations |

The AI summary is supplementary — the ranked list is the core output. A free model is sufficient for generating a 3–4 sentence professional summary. Upgrading the model is a one-line change in the service if quality becomes a concern.

---

## 8. Getting Started

### Prerequisites

- Node.js 20+
- A PostgreSQL database (Neon free tier works)
- An OpenRouter API key (free tier available)

### Environment Variables

Create a `.env` file in the project root:

```env
# PostgreSQL connection string
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

# OpenRouter API key — get one at https://openrouter.ai/keys
OPENROUTER_API_KEY="sk-or-v1-..."
```

### Setup Steps

```bash
# 1. Install dependencies
npm install

# 2. Run database migrations
npx prisma migrate dev

# 3. Generate the Prisma client
npx prisma generate

# 4. Seed the database with test data
npm run seed

# 5. Start the development server
npm run dev
# → Server running at http://localhost:3000
```

### Testing with Postman

Import `vendor-recommendation.postman_collection.json` from the project root into Postman. The collection includes pre-built requests for every endpoint with example bodies and the correct work requirement IDs from the seed data.

**Seeded work requirement IDs for recommendations:**

| ID | Title | Category | Location | Expected top result |
|---|---|---|---|---|
| 4 | New Office Electrical Upgrade | Electrical | Dubai | Volta Electric Co. (5.0) |
| 5 | Plumbing System Renovation | Plumbing | Abu Dhabi | PipeMasters Ltd. (5.0) |
| 6 | Server Room HVAC Installation | HVAC | Dubai | CoolAir HVAC Systems (5.0) |
| 7 | Building Electrical Maintenance | Electrical | Abu Dhabi | PowerTech Solutions (4.0) |
| 8 | IT Infrastructure Upgrade | IT Services | Dubai | TechPro IT Solutions (unranked) |
