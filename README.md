# Vendor Recommendation Platform

An internal platform for the operations team to manage vendors and receive intelligent vendor recommendations based on work requirements, vendor performance history, and AI-generated summaries.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [How the Recommendation System Works](#how-the-recommendation-system-works)
  - [Vendor Rating Flow](#vendor-rating-flow)
  - [Rank Recalculation](#rank-recalculation)
  - [Recommendation Query](#recommendation-query)
  - [Full Request Lifecycle](#full-request-lifecycle)
- [API Reference](#api-reference)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js + TypeScript |
| Framework | Express 5 |
| ORM | Prisma 7 |
| Database | PostgreSQL (Neon) |
| Validation | Zod 4 |
| AI Summary | OpenRouter — Llama 3.1 8B Instruct |

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Create a `.env` file in the project root (see [Environment Variables](#environment-variables) below):

```bash
cp .env.example .env
```

### 3. Run database migrations

```bash
npx prisma migrate dev
```

### 4. Generate the Prisma client

```bash
npx prisma generate
```

### 5. Seed the database

Populates categories, vendors, locations, documents, work requirements, ratings, and pre-computed ranks so you can test all endpoints immediately:

```bash
npm run seed
```

The seed output will print the IDs of the open work requirements to use with the recommendation endpoint.

### 6. Start the development server

```bash
npm run dev
```

Server runs at `http://localhost:3000`.

---

## Environment Variables

Add the following to your `.env` file:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string (Neon, local Postgres, etc.) |
| `OPENROUTER_API_KEY` | Yes | API key from [openrouter.ai/keys](https://openrouter.ai/keys) — used for AI summaries |

```env
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
OPENROUTER_API_KEY="sk-or-v1-..."
```

> The `OPENROUTER_API_KEY` is only used for the AI summary feature. If the key is missing or invalid, the recommendation endpoint still returns the ranked vendor list — `aiSummary` will be `null`.

---

## Database Schema

### Entity Relationship Diagram

```mermaid
erDiagram
    Category {
        int id PK
        string name
    }

    Vendor {
        int id PK
        string name
        string vendorType
        string contactName
        string contactPhone
        string contactEmail
        enum currentStatus
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
    }

    VendorRating {
        int id PK
        int vendorId FK
        int workRequirementId FK
        int ratingValue
        int ratedBy
        string notes
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

    Category        ||--o{ VendorCategory    : "assigned to vendors via"
    Category        ||--o{ WorkRequirement   : "required by"
    Category        ||--o{ VendorRank        : "ranks are scoped to"
    Vendor          ||--o{ VendorCategory    : "belongs to categories via"
    Vendor          ||--o{ VendorLocation    : "operates in"
    Vendor          ||--o{ VendorDocument    : "has compliance docs"
    Vendor          ||--o{ VendorRating      : "rated in"
    Vendor          ||--o{ VendorRank        : "ranked by"
    Vendor          ||--o{ Recommendation    : "appears in"
    WorkRequirement ||--o{ VendorRating      : "triggers rating for"
    WorkRequirement ||--o{ Recommendation   : "generates"
```

### Key design decisions

- **`VendorCategory`** is a many-to-many join table — one vendor can operate across multiple categories (e.g. a multi-skill contractor in both Electrical and HVAC).
- **`VendorRank`** has a unique constraint on `(vendorId, categoryId)` — one rank row per vendor per category, always reflecting the latest average.
- **`VendorRating`** has a unique constraint on `(vendorId, workRequirementId)` — one rating per vendor per completed job, preventing duplicates.
- **`Recommendation`** is an audit log — it captures the rank at the time of recommendation so historical decisions can be reviewed even after ranks change.

---

## How the Recommendation System Works

### Vendor Rating Flow

When a job is completed, the operations team submits a rating (1–5) for the vendor that did the work. This is the input that feeds the entire ranking engine.

```mermaid
flowchart TD
    A([POST /api/vendor-ratings]) --> B{Zod validation\nratingValue 1–5\nall required fields}
    B -- Invalid --> C([400 Bad Request])
    B -- Valid --> D[Fetch WorkRequirement\nto get categoryId]
    D --> E{WorkRequirement\nexists?}
    E -- No --> F([404 Not Found])
    E -- Yes --> G[INSERT VendorRating]
    G --> H[[recalculateVendorRank\nvendorId · categoryId]]
    H --> I([201 Created])
```

> The same trigger runs on **PUT** (rating edited) and **DELETE** (rating removed) so the rank always stays in sync.

---

### Rank Recalculation

This is the core of the ranking engine. Every time a rating is saved, updated, or deleted, `recalculateVendorRank` runs immediately in the same request.

```mermaid
flowchart TD
    A[[recalculateVendorRank\nvendorId · categoryId]] --> B

    B["AVG all VendorRatings\nfor this vendor\nwhere WorkRequirement.categoryId matches"]

    B --> C{Average\nresult?}

    C -- "avg = null\n(no ratings remain)" --> D[DELETE VendorRank row\nso stale data is removed]
    C -- "avg computed" --> E{VendorRank row\nalready exists?}

    E -- No --> F[INSERT VendorRank\nrankValue = avg]
    E -- Yes --> G[UPDATE VendorRank\nrankValue = avg]

    D --> H([Done])
    F --> H
    G --> H
```

**How a vendor's rank evolves over time:**

```mermaid
timeline
    title PowerTech Solutions — Electrical Category Rank History
    Rated 4 on Job 1   : Ratings [4]    : Rank = 4.00
    Rated 3 on Job 5   : Ratings [4, 3] : Rank = 3.50
    Job 1 updated to 5 : Ratings [5, 3] : Rank = 4.00
    Job 5 deleted      : Ratings [5]    : Rank = 5.00
    All ratings removed: Ratings []     : Rank row deleted
```

The rank is always a **live average** across all historical jobs in that category — it stays accurate regardless of edits or deletions.

---

### Recommendation Query

When the operations team raises a new work requirement and needs vendor suggestions:

```mermaid
flowchart TD
    A([GET /api/recommendations\n?workRequirementId=X]) --> B{Validate\nworkRequirementId}
    B -- Invalid --> C([400 Bad Request])
    B -- Valid --> D[Fetch WorkRequirement\ncategoryId · location · priority]
    D --> E{Exists?}
    E -- No --> F([404 Not Found])
    E -- Yes --> G

    G["Find active vendors where:\n✓ currentStatus = active\n✓ VendorLocation matches location\n✓ VendorCategory matches categoryId"]

    G --> H[Join VendorRank\nfor this category]
    H --> I["Sort DESC by rankValue\nUnranked vendors → bottom"]
    I --> J[Persist to Recommendation\ntable as audit snapshot]
    J --> K[Build ranked response]
    K --> L([Call OpenRouter AI])

    L --> M{AI responds?}
    M -- Yes --> N[Attach aiSummary to response]
    M -- "No - quota / error" --> O[aiSummary: null]

    N --> P([200 OK])
    O --> P
```

**Sorting rules:**

| Vendor | rankValue | Position |
|---|---|---|
| Volta Electric Co. | 5.00 | 1st |
| PowerTech Solutions | 4.00 | 2nd |
| MultiSkill Services | 3.00 | 3rd |
| NewVendor Ltd. | null (no history) | Last |

Location filtering is **exact match** — a vendor must have the work requirement's location in their `VendorLocation` list. A vendor with Dubai and Sharjah locations will not appear in an Abu Dhabi recommendation even if they have the highest rank.

---

### Full Request Lifecycle

This diagram shows the complete journey from submitting a rating to receiving a recommendation:

```mermaid
sequenceDiagram
    actor Ops as Operations Team
    participant API as Express API
    participant DB as PostgreSQL
    participant AI as OpenRouter AI

    Note over Ops,DB: Phase 1 — Rate a completed vendor job

    Ops->>API: POST /api/vendor-ratings\n{ vendorId, workRequirementId, ratingValue: 5 }
    API->>DB: INSERT INTO vendor_rating
    API->>DB: SELECT AVG(rating_value)\nWHERE vendor_id AND category matches
    DB-->>API: avg = 4.50
    API->>DB: UPSERT vendor_rank\nSET rank_value = 4.50
    API-->>Ops: 201 Created

    Note over Ops,AI: Phase 2 — Get vendor recommendations

    Ops->>API: GET /api/recommendations?workRequirementId=4
    API->>DB: SELECT work_requirement WHERE id = 4\n→ categoryId=1 (Electrical), location=Dubai
    API->>DB: SELECT vendors\nWHERE active\nAND location = Dubai\nAND category = Electrical\nJOIN vendor_rank ON categoryId
    DB-->>API: Volta(5.0), PowerTech(4.0), MultiSkill(3.0)
    API->>DB: DELETE + INSERT recommendations\n(audit snapshot)
    API->>AI: prompt with work requirement\n+ ranked vendor list
    AI-->>API: "Volta Electric Co. leads with a\nperfect 5.0 rating..."
    API-->>Ops: 200 OK\n{ recommendations: [...], aiSummary: "..." }
```

---

## API Reference

### Vendors

| Method | Endpoint | Body / Params | Description |
|---|---|---|---|
| GET | `/api/vendors` | — | Get all vendors with categories and locations |
| GET | `/api/vendors/:id` | — | Get vendor with ranks and documents |
| POST | `/api/vendors` | `name`, `vendorType`, `contactEmail?`, `contactPhone?`, `currentStatus?` | Create vendor |
| PUT | `/api/vendors/:id` | Any vendor field (all optional) | Update vendor |
| DELETE | `/api/vendors/:id` | — | Delete vendor |

### Vendor Documents

| Method | Endpoint | Body / Params | Description |
|---|---|---|---|
| GET | `/api/vendor-documents` | — | Get all documents |
| GET | `/api/vendor-documents/:id` | — | Get document by ID |
| POST | `/api/vendor-documents` | `vendorId`, `documentType`, `documentUrl`, `issueDate?`, `expiryDate?`, `verificationStatus?` | Upload document |
| PUT | `/api/vendor-documents/:id` | Any document field (all optional) | Update document |
| DELETE | `/api/vendor-documents/:id` | — | Delete document |

`documentType` enum: `tax_registration` · `insurance` · `trade_license` · `safety_certificate` · `agreement`

### Work Requirements

| Method | Endpoint | Body / Params | Description |
|---|---|---|---|
| GET | `/api/work-requirements` | — | Get all work requirements |
| GET | `/api/work-requirements/:id` | — | Get work requirement with ratings |
| POST | `/api/work-requirements` | `title`, `categoryId`, `location`, `estimatedValue`, `createdBy`, `priority?`, `expectedStartDate?`, `status?` | Create work requirement |
| PUT | `/api/work-requirements/:id` | Any field except `createdBy` (all optional) | Update work requirement |
| DELETE | `/api/work-requirements/:id` | — | Delete work requirement |

`priority` enum: `low` · `medium` · `high` · `urgent`
`status` enum: `draft` · `open` · `assigned` · `closed`

### Vendor Ratings

| Method | Endpoint | Body / Params | Description |
|---|---|---|---|
| GET | `/api/vendor-ratings` | — | Get all ratings |
| POST | `/api/vendor-ratings` | `vendorId`, `workRequirementId`, `ratingValue` (1–5), `ratedBy`, `notes?` | Submit rating → triggers rank recalculation |
| PUT | `/api/vendor-ratings/:id` | `ratingValue?`, `notes?` | Update rating → triggers rank recalculation |
| DELETE | `/api/vendor-ratings/:id` | — | Delete rating → triggers rank recalculation |

### Recommendations

| Method | Endpoint | Query Params | Description |
|---|---|---|---|
| GET | `/api/recommendations` | `workRequirementId` (required) | Returns ranked vendor list + AI summary |

**Response shape:**

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
        "locations": ["Dubai", "Sharjah"],
        "categories": ["Electrical"]
      },
      "rankValue": "5.00"
    }
  ]
}
```
