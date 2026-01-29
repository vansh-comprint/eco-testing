# System Architecture

## Overview

This document provides technical architecture documentation for the EcoTribe platform, including component relationships, data flow, and integration points.

---

## High-Level Architecture

```mermaid
flowchart TB
    subgraph Clients["Client Applications"]
        WEB[Web App<br/>React + Vite]
        MOBILE[Mobile Web<br/>Responsive]
    end

    subgraph Frontend["Frontend Layer"]
        ROUTER[React Router]
        QUERY[React Query]
        ZUSTAND[Zustand Store]
        UI[UI Components]
    end

    subgraph DataLayer["Data Layer"]
        QUERIES[queries.ts]
        MUTATIONS[mutations.ts]
        CLIENT[Supabase Client]
        ADMIN[Supabase Admin]
    end

    subgraph Backend["Supabase Backend"]
        AUTH[Auth Service]
        REALTIME[Realtime]
        STORAGE[File Storage]
        DBAPI[REST API]
        POSTGRES[(PostgreSQL)]
    end

    subgraph External["External Services"]
        EMAIL[Email Service]
        SMS[SMS Gateway]
        MAPS[Maps API]
    end

    Clients --> Frontend
    Frontend --> DataLayer
    DataLayer --> Backend
    Backend --> External
```

---

## Frontend Architecture

### Component Hierarchy

```mermaid
flowchart TD
    subgraph App["App.tsx"]
        PROVIDERS[Context Providers]
        ROUTER[Router]
    end

    subgraph Routes["Route Structure"]
        PUBLIC[Public Routes]
        PROTECTED[Protected Routes]
    end

    subgraph Portals["User Portals"]
        SUPER[/super]
        OPS[/ops]
        TECH[/tech]
        ORGADMIN[/org-admin]
        ADMIN[/admin]
        CHECKIN[/check-in]
        LOGADMIN[/logistics-admin]
        LOGUSER[/logistics]
    end

    subgraph Layouts["Layout Components"]
        SUPER_L[SuperLayout]
        OPS_L[OpsLayout]
        ORG_L[OrgAdminLayout]
        ADMIN_L[AdminLayout]
        CHECKIN_L[CheckInLayout]
        LOG_L[LogisticsLayout]
    end

    App --> Routes
    Routes --> PUBLIC
    Routes --> PROTECTED
    PROTECTED --> Portals
    Portals --> Layouts
```

### State Management

```mermaid
flowchart LR
    subgraph ServerState["Server State (React Query)"]
        ASSETS[useAssets]
        BATCHES[useBatches]
        BRANCHES[useBranches]
        PICKUPS[usePickups]
        USERS[useSubUsers]
        LOGISTICS[useLogistics]
    end

    subgraph ClientState["Client State (Zustand)"]
        AUTH[authStore]
        THEME[themeStore]
    end

    subgraph LocalState["Component State"]
        FORM[Form State]
        UI_STATE[UI State]
        MODAL[Modal State]
    end

    ServerState --> |Cache| QUERY_CLIENT[QueryClient]
    ClientState --> |Persist| LOCAL_STORAGE[localStorage]
```

### Query Key Structure

```typescript
// Hierarchical query keys for cache management
const queryKeys = {
  assets: {
    all: ['assets'],
    list: (enterpriseId) => ['assets', 'list', enterpriseId],
    byBranch: (branchId) => ['assets', 'branch', branchId],
    byITAdmin: (userId) => ['assets', 'it-admin', userId],
    detail: (id) => ['assets', 'detail', id],
  },
  batches: {
    all: ['batches'],
    list: (enterpriseId) => ['batches', 'list', enterpriseId],
    byITAdmin: (userId) => ['batches', 'it-admin', userId],
    detail: (id) => ['batches', 'detail', id],
  },
  branches: {
    all: ['branches'],
    list: (enterpriseId) => ['branches', 'list', enterpriseId],
    byITAdmin: (userId) => ['branches', 'it-admin', userId],
    detail: (id) => ['branches', 'detail', id],
  },
  // ... etc
};
```

---

## Database Architecture

### Entity Relationship Diagram

```mermaid
erDiagram
    ENTERPRISES ||--o{ BRANCHES : has
    ENTERPRISES ||--o{ USERS : has
    ENTERPRISES ||--o{ SUB_USERS : has
    ENTERPRISES ||--|| ENTERPRISE_WALLETS : has

    BRANCHES ||--o| USERS : managed_by
    BRANCHES ||--o{ ASSETS : contains
    BRANCHES ||--o{ BATCHES : contains

    USERS ||--o{ ASSETS : creates
    USERS ||--o{ BATCHES : creates

    SUB_USERS ||--o{ ASSETS : assigned_to
    SUB_USERS ||--o{ SUBMISSIONS : submits

    ASSETS ||--o| BATCHES : belongs_to
    ASSETS ||--o| SUBMISSIONS : has
    ASSETS ||--o| REMOTE_REVIEWS : has
    ASSETS ||--o| FACILITY_QC : has

    BATCHES ||--o| PICKUP_REQUESTS : generates

    PICKUP_REQUESTS ||--o| LOGISTICS_ADMINS : assigned_to
    PICKUP_REQUESTS ||--o| LOGISTICS_USERS : assigned_to

    LOGISTICS_ADMINS ||--o{ LOGISTICS_USERS : manages

    ENTERPRISES {
        string id PK
        string name
        string gst_number
        string pan_number
        jsonb address
        string status
    }

    BRANCHES {
        string id PK
        string enterprise_id FK
        string it_admin_id FK
        string branch_name
        string branch_code
        string status
    }

    USERS {
        string id PK
        string enterprise_id FK
        string email
        string name
        string role
        string status
    }

    ASSETS {
        string id PK
        string enterprise_id FK
        string branch_id FK
        string batch_id FK
        string serial_number
        string brand
        string model
        string status
    }

    BATCHES {
        string id PK
        string enterprise_id FK
        string branch_id FK
        string name
        string status
        string created_by FK
    }
```

### Core Tables Schema

```sql
-- Enterprises (Client Companies)
CREATE TABLE enterprises (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    gst_number TEXT UNIQUE,
    pan_number TEXT,
    address JSONB,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Branches (Physical Locations)
CREATE TABLE branches (
    id TEXT PRIMARY KEY,
    enterprise_id TEXT REFERENCES enterprises(id),
    it_admin_id TEXT REFERENCES users(id),
    branch_name TEXT NOT NULL,
    branch_code TEXT NOT NULL,
    address_line1 TEXT,
    city TEXT,
    state TEXT,
    pin_code TEXT,
    site_contact_person TEXT,
    site_contact_phone TEXT,
    status TEXT DEFAULT 'active',
    UNIQUE(enterprise_id, branch_code)
);

-- Users (Admin Accounts)
CREATE TABLE users (
    id TEXT PRIMARY KEY,  -- Same as Supabase Auth user ID
    enterprise_id TEXT REFERENCES enterprises(id),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL,  -- super_admin, main_admin, org_admin, it_admin
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Sub-Users (Enterprise Employees)
CREATE TABLE sub_users (
    id TEXT PRIMARY KEY,
    enterprise_id TEXT REFERENCES enterprises(id),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    employee_id TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Assets (Devices)
CREATE TABLE assets (
    id TEXT PRIMARY KEY,
    enterprise_id TEXT REFERENCES enterprises(id),
    branch_id TEXT REFERENCES branches(id),
    batch_id TEXT REFERENCES batches(id),
    serial_number TEXT UNIQUE NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    specs JSONB,
    assigned_sub_user_id TEXT REFERENCES sub_users(id),
    assigned_user_id TEXT REFERENCES users(id),
    is_self_assigned BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'pending_assignment',
    base_price DECIMAL,
    final_price DECIMAL,
    grade TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Batches (Asset Collections)
CREATE TABLE batches (
    id TEXT PRIMARY KEY,
    enterprise_id TEXT REFERENCES enterprises(id),
    branch_id TEXT REFERENCES branches(id),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft',
    created_by TEXT REFERENCES users(id),
    approved_by TEXT REFERENCES users(id),
    approved_at TIMESTAMP,
    it_admin_notes TEXT,
    org_admin_notes TEXT,
    preferred_pickup_date DATE,
    preferred_pickup_slot TEXT,
    pickup_priority TEXT,
    estimated_value DECIMAL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Pickup Requests
CREATE TABLE pickup_requests (
    id TEXT PRIMARY KEY,
    enterprise_id TEXT REFERENCES enterprises(id),
    branch_id TEXT REFERENCES branches(id),
    batch_id TEXT REFERENCES batches(id),
    asset_ids TEXT[],
    status TEXT DEFAULT 'pending_assignment',
    logistics_admin_id TEXT REFERENCES logistics_admins(id),
    logistics_user_id TEXT REFERENCES logistics_users(id),
    scheduled_date DATE,
    scheduled_time_slot TEXT,
    it_admin_notes TEXT,
    ops_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Database Views

```sql
-- Org Admin Asset View (Nested Hierarchy)
CREATE VIEW org_admin_asset_view AS
SELECT
    b.id as branch_id,
    b.branch_name,
    b.branch_code,
    u.id as it_admin_id,
    u.name as it_admin_name,
    bt.id as batch_id,
    bt.name as batch_name,
    bt.status as batch_status,
    a.id as asset_id,
    a.serial_number,
    a.brand,
    a.model,
    a.status as asset_status,
    su.name as assigned_to
FROM branches b
LEFT JOIN users u ON b.it_admin_id = u.id
LEFT JOIN batches bt ON bt.branch_id = b.id
LEFT JOIN assets a ON a.batch_id = bt.id
LEFT JOIN sub_users su ON a.assigned_sub_user_id = su.id;

-- Pickup Approval Queue
CREATE VIEW pickup_approval_queue AS
SELECT
    bt.id,
    bt.name,
    bt.status,
    bt.created_at,
    bt.preferred_pickup_date,
    bt.it_admin_notes,
    b.branch_name,
    u.name as it_admin_name,
    COUNT(a.id) as asset_count,
    SUM(a.base_price) as total_value
FROM batches bt
JOIN branches b ON bt.branch_id = b.id
JOIN users u ON bt.created_by = u.id
LEFT JOIN assets a ON a.batch_id = bt.id
WHERE bt.status = 'pending_approval'
GROUP BY bt.id, b.branch_name, u.name;
```

---

## API Architecture

### Request Flow

```mermaid
sequenceDiagram
    participant UI as React Component
    participant HOOK as React Query Hook
    participant QUERY as queries.ts
    participant CLIENT as Supabase Client
    participant AUTH as Supabase Auth
    participant DB as PostgreSQL

    UI->>HOOK: Call hook (e.g., useAssets)
    HOOK->>HOOK: Check cache

    alt Cache Hit
        HOOK-->>UI: Return cached data
    else Cache Miss
        HOOK->>QUERY: Call query function
        QUERY->>CLIENT: Supabase query
        CLIENT->>AUTH: Verify JWT
        AUTH-->>CLIENT: Valid session
        CLIENT->>DB: Execute SQL
        DB-->>CLIENT: Result set
        CLIENT-->>QUERY: Data
        QUERY-->>HOOK: Formatted data
        HOOK->>HOOK: Update cache
        HOOK-->>UI: Return data
    end
```

### Mutation Flow

```mermaid
sequenceDiagram
    participant UI as React Component
    participant HOOK as useMutation Hook
    participant MUTATION as mutations.ts
    participant CLIENT as Supabase Client
    participant AUTH as Supabase Auth
    participant DB as PostgreSQL
    participant CACHE as Query Cache

    UI->>HOOK: mutate(data)
    HOOK->>MUTATION: Call mutation function
    MUTATION->>CLIENT: Supabase insert/update

    alt Needs Admin Client
        MUTATION->>CLIENT: Use supabaseAdmin
    else Regular Client
        MUTATION->>CLIENT: Use supabase
    end

    CLIENT->>AUTH: Verify permissions
    AUTH-->>CLIENT: Authorized
    CLIENT->>DB: Execute mutation
    DB-->>CLIENT: Result
    CLIENT-->>MUTATION: Success/Error
    MUTATION-->>HOOK: Result

    HOOK->>CACHE: Invalidate related queries
    HOOK-->>UI: onSuccess/onError callback
```

---

## Authentication Architecture

### Auth Flow Diagram

```mermaid
flowchart TD
    subgraph Login["Login Flow"]
        A[User enters credentials]
        B[Supabase Auth validates]
        C{Valid?}
        D[Get auth token]
        E[Identify user type]
        F[Query users table]
        G[Query sub_users table]
        H[Query logistics tables]
        I[Set auth state]
        J[Redirect to portal]
        K[Show error]
    end

    A --> B --> C
    C -->|Yes| D --> E
    E --> F
    F -->|Not found| G
    G -->|Not found| H
    F -->|Found| I
    G -->|Found| I
    H -->|Found| I
    I --> J
    C -->|No| K
```

### Role-Based Access Control

```mermaid
flowchart TD
    subgraph RBAC["Access Control"]
        USER[User Request]
        ROUTE[ProtectedRoute]
        CHECK{Role Check}
        ALLOW[Render Component]
        DENY[Redirect to /unauthorized]
    end

    USER --> ROUTE
    ROUTE --> CHECK
    CHECK -->|Role in allowedRoles| ALLOW
    CHECK -->|Role NOT in allowedRoles| DENY
```

### Permission Matrix

| Permission | super_admin | main_admin | org_admin | it_admin | sub_user | logistics_admin | logistics_user |
|------------|-------------|------------|-----------|----------|----------|-----------------|----------------|
| View all enterprises | ✓ | ✓ | - | - | - | - | - |
| Manage enterprises | ✓ | ✓ | - | - | - | - | - |
| Manage branches | ✓ | ✓ | ✓ | - | - | - | - |
| Manage IT admins | ✓ | ✓ | ✓ | - | - | - | - |
| Manage assets | ✓ | ✓ | - | ✓ | - | - | - |
| Manage batches | ✓ | ✓ | - | ✓ | - | - | - |
| Submit evaluation | - | - | - | ✓ | ✓ | - | - |
| Approve pickups | ✓ | ✓ | ✓ | - | - | - | - |
| Assign logistics | ✓ | ✓ | - | - | - | - | - |
| Manage drivers | - | - | - | - | - | ✓ | - |
| Complete pickups | - | - | - | - | - | - | ✓ |

---

## Data Flow Architecture

### Asset Lifecycle Data Flow

```mermaid
flowchart TB
    subgraph Creation["Asset Creation"]
        IT[IT Admin]
        CREATE[createAsset()]
        ASSET_DB[(assets table)]
    end

    subgraph Assignment["Assignment"]
        ASSIGN[assignAssetToSubUser()]
        SUB[Sub-User]
        EMAIL1[Send notification]
    end

    subgraph Evaluation["Self-Evaluation"]
        EVAL[DeviceSubmit.tsx]
        STORAGE[(Supabase Storage)]
        SUBMIT[createSubmission()]
        SUB_DB[(submissions table)]
    end

    subgraph Review["Remote Review"]
        TECH[Technician]
        REVIEW[createRemoteReview()]
        REVIEW_DB[(remote_reviews table)]
    end

    subgraph Batch["Batch Processing"]
        BATCH[createBatch()]
        BATCH_DB[(batches table)]
        APPROVE[approveBatch()]
    end

    subgraph Pickup["Pickup"]
        PICKUP[createPickupRequest()]
        PICKUP_DB[(pickup_requests table)]
        LA[Logistics Admin]
        LU[Logistics User]
    end

    subgraph QC["Final QC"]
        FACILITY[Facility QC]
        QC_DB[(facility_qc table)]
        GRADE[Assign Grade]
    end

    subgraph Payout["Payout"]
        CALC[Calculate Value]
        WALLET_DB[(enterprise_wallets)]
        TRANS_DB[(credit_transactions)]
    end

    IT --> CREATE --> ASSET_DB
    ASSET_DB --> ASSIGN --> SUB
    ASSIGN --> EMAIL1

    SUB --> EVAL
    EVAL --> STORAGE
    EVAL --> SUBMIT --> SUB_DB

    SUB_DB --> TECH
    TECH --> REVIEW --> REVIEW_DB

    REVIEW_DB --> BATCH --> BATCH_DB
    BATCH_DB --> APPROVE

    APPROVE --> PICKUP --> PICKUP_DB
    PICKUP_DB --> LA --> LU

    LU --> FACILITY --> QC_DB
    QC_DB --> GRADE

    GRADE --> CALC --> WALLET_DB
    CALC --> TRANS_DB
```

---

## File Storage Architecture

### Storage Buckets

```mermaid
flowchart TD
    subgraph Storage["Supabase Storage"]
        B1[submissions]
        B2[documents]
        B3[on-site-qc]
        B4[epr-certificates]
    end

    subgraph Content["File Types"]
        C1[Device Photos]
        C2[GST/PAN/Certs]
        C3[Pickup Evidence]
        C4[EPR PDFs]
    end

    B1 --> C1
    B2 --> C2
    B3 --> C3
    B4 --> C4
```

### File Upload Flow

```mermaid
sequenceDiagram
    participant USER as User
    participant FE as Frontend
    participant STORAGE as Supabase Storage
    participant DB as Database

    USER->>FE: Select file
    FE->>FE: Validate file (type, size)
    FE->>STORAGE: Upload to bucket
    STORAGE-->>FE: Public URL
    FE->>DB: Save URL to record
    DB-->>FE: Success
    FE->>USER: Show preview
```

---

## Notification Architecture

### Notification Channels

```mermaid
flowchart LR
    subgraph Triggers["Event Triggers"]
        T1[Asset Assigned]
        T2[Submission Complete]
        T3[Review Decision]
        T4[Batch Submitted]
        T5[Batch Approved]
        T6[Pickup Assigned]
        T7[Payout Processed]
    end

    subgraph System["Notification System"]
        HANDLER[Event Handler]
        TEMPLATE[Template Engine]
        QUEUE[Notification Queue]
    end

    subgraph Channels["Delivery Channels"]
        EMAIL[Email]
        INAPP[In-App]
        SMS[SMS]
        PUSH[Push Notification]
    end

    Triggers --> HANDLER
    HANDLER --> TEMPLATE
    TEMPLATE --> QUEUE
    QUEUE --> Channels
```

### Notification Types

| Event | Recipients | Channels |
|-------|------------|----------|
| Asset assigned | Sub-user | Email, In-app |
| Evaluation submitted | IT Admin | In-app |
| Remote review complete | IT Admin | In-app |
| Batch submitted | Org Admin | Email, In-app |
| Batch approved | IT Admin | Email, In-app |
| Batch rejected | IT Admin | Email, In-app |
| Pickup assigned (LA) | Logistics Admin | Email, In-app |
| Pickup assigned (LU) | Logistics User | In-app, SMS, Push |
| Pickup complete | IT Admin, Org Admin | In-app |
| Payout processed | Org Admin | Email, In-app |

---

## Deployment Architecture

### Environment Setup

```mermaid
flowchart TD
    subgraph Dev["Development"]
        DEV_FE[Vite Dev Server]
        DEV_DB[Local/Dev Supabase]
    end

    subgraph Staging["Staging"]
        STG_FE[Vercel Preview]
        STG_DB[Staging Supabase]
    end

    subgraph Prod["Production"]
        PROD_FE[Vercel Production]
        PROD_DB[Production Supabase]
        CDN[CDN / Edge]
    end

    DEV_FE --> DEV_DB
    STG_FE --> STG_DB
    PROD_FE --> CDN --> PROD_DB
```

### Environment Variables

```bash
# Development
VITE_SUPABASE_URL=https://dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...dev

# Staging
VITE_SUPABASE_URL=https://staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...staging

# Production
VITE_SUPABASE_URL=https://prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...prod
```

---

## Security Architecture

### Security Layers

```mermaid
flowchart TD
    subgraph Client["Client Layer"]
        A[HTTPS Only]
        B[JWT in Header]
        C[Input Validation]
    end

    subgraph API["API Layer"]
        D[Rate Limiting]
        E[CORS Policy]
        F[Request Validation]
    end

    subgraph Database["Database Layer"]
        G[Row Level Security]
        H[Encrypted at Rest]
        I[Connection Pooling]
    end

    subgraph Access["Access Control"]
        J[Role-Based Access]
        K[Data Scoping]
        L[Audit Logging]
    end

    Client --> API --> Database
    API --> Access
```

### Row Level Security (RLS)

```sql
-- Example RLS policies (disabled in dev)
-- Enterprise data scoping
CREATE POLICY "Users can view own enterprise" ON assets
    FOR SELECT USING (
        enterprise_id IN (
            SELECT enterprise_id FROM users WHERE id = auth.uid()
        )
    );

-- IT Admin branch scoping
CREATE POLICY "IT Admin can manage branch assets" ON assets
    FOR ALL USING (
        branch_id IN (
            SELECT id FROM branches WHERE it_admin_id = auth.uid()
        )
    );
```

---

## Performance Considerations

### Optimization Strategies

| Area | Strategy | Implementation |
|------|----------|----------------|
| Data Fetching | React Query caching | 60s stale time, background refetch |
| Bundle Size | Code splitting | Lazy load portals |
| Images | Compression | WebP format, responsive sizes |
| Database | Indexes | On foreign keys, frequently queried columns |
| Queries | Pagination | Limit 50 records default |
| Real-time | Selective subscription | Only subscribe to needed tables |

### Query Optimization

```typescript
// Optimized query with pagination
const { data, fetchNextPage } = useInfiniteQuery({
  queryKey: ['assets', enterpriseId],
  queryFn: ({ pageParam = 0 }) =>
    fetchAssets(enterpriseId, { offset: pageParam, limit: 50 }),
  getNextPageParam: (lastPage, pages) =>
    lastPage.length === 50 ? pages.length * 50 : undefined,
  staleTime: 60000,
});
```

---

## Monitoring & Logging

### Log Categories

| Category | Purpose | Examples |
|----------|---------|----------|
| Auth | Login/logout events | User login, session expired |
| Mutations | Data changes | Asset created, batch approved |
| Errors | System errors | API failures, validation errors |
| Audit | Compliance tracking | Who did what, when |

### Error Handling Pattern

```typescript
// Consistent error handling
try {
  const result = await mutation.mutateAsync(data);
  addToast({ type: 'success', message: 'Operation successful' });
} catch (error) {
  console.error('[Mutation Error]', error);
  addToast({
    type: 'error',
    message: error.message || 'Operation failed'
  });
}
```
