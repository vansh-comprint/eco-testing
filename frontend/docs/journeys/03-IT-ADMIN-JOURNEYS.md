# IT Admin Journeys

## Overview

IT Admin is the primary operational role for day-to-day asset management. This document covers all IT Admin workflows in detail.

## Journey Overview

```mermaid
mindmap
  root((IT Admin))
    Asset Management
      Add Single Asset
      Bulk Upload
      View/Edit Assets
      Self-Assign
    Sub-User Management
      Create Employees
      Bulk Upload
      Send Invitations
    Batch Operations
      Create Batch
      Add Assets
      Submit for Approval
    Pickup Coordination
      Initiate Pickup
      Track Status
      Coordinate Logistics
    Self-Evaluation
      My Evaluations
      Complete Checklist
```

---

## Journey 1: Asset Creation (Single)

### 1.1 User Journey Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SINGLE ASSET CREATION                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  IT ADMIN ACTIONS                          SYSTEM RESPONSES                 │
│  ─────────────────                         ─────────────────                │
│                                                                             │
│  1. Login to /admin                        Load dashboard                   │
│         ↓                                                                   │
│  2. Navigate to Assets                     Load asset list                  │
│         ↓                                                                   │
│  3. Click "Add Asset"                      Open asset form                  │
│         ↓                                                                   │
│  4. Enter asset details:                   Real-time validation            │
│     • Serial Number                        • Check uniqueness               │
│     • Brand (select or custom)                                             │
│     • Model                                                                │
│     • Asset Type (laptop/desktop/etc)                                      │
│         ↓                                                                   │
│  5. Enter specifications (optional):       Auto-format inputs              │
│     • Processor                                                            │
│     • RAM                                                                  │
│     • Storage                                                              │
│     • Screen Size                                                          │
│         ↓                                                                   │
│  6. Choose assignment:                                                     │
│     ┌────────────────┐  ┌─────────────────┐  ┌─────────────────┐           │
│     │ No Assignment  │  │ Assign to       │  │ Self-Assign     │           │
│     │ (create only)  │  │ Employee        │  │ (evaluate self) │           │
│     └────────────────┘  └─────────────────┘  └─────────────────┘           │
│         ↓                                                                   │
│  7. Click "Create Asset"                   • Validate all fields           │
│                                            • Check serial uniqueness       │
│                                            • Create asset record           │
│                                            • Send notification if assigned │
│         ↓                                                                   │
│  8. See confirmation                       • Toast notification            │
│                                            • Redirect to asset list        │
│                                            • Asset appears in list         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Sequence Diagram

```mermaid
sequenceDiagram
    participant IT as IT Admin
    participant FE as Frontend<br/>(AddAsset.tsx)
    participant VAL as Validation
    participant API as Supabase API
    participant DB as Database
    participant EMAIL as Email Service

    IT->>FE: Navigate to /admin/assets/add
    FE->>API: fetchSubUsers(enterpriseId)
    API->>DB: SELECT * FROM sub_users
    DB-->>API: Sub-users list
    API-->>FE: Populate assignment dropdown

    IT->>FE: Enter serial number
    FE->>API: checkSerialNumberExists(serial)
    API->>DB: SELECT FROM assets WHERE serial_number = ?
    DB-->>API: Not exists
    API-->>FE: Serial available

    IT->>FE: Fill all form fields
    IT->>FE: Select assignment option

    alt Assign to Employee
        IT->>FE: Select sub-user from dropdown
    else Self-Assign
        IT->>FE: Check "Assign to myself"
    else No Assignment
        IT->>FE: Leave unassigned
    end

    IT->>FE: Click "Create Asset"
    FE->>VAL: Validate form
    VAL-->>FE: Valid

    FE->>API: createAsset(assetData)
    API->>DB: INSERT INTO assets

    alt Has Assignment
        API->>DB: UPDATE assets SET assigned_sub_user_id/assigned_user_id
        API->>DB: UPDATE assets SET status = 'assigned'
        API->>EMAIL: Send assignment notification
    else No Assignment
        API->>DB: status = 'pending_assignment'
    end

    DB-->>API: Asset created
    API-->>FE: Success response

    FE->>FE: Show success toast
    FE->>FE: Navigate to asset list
```

### 1.3 Form Validation Schema

```typescript
const assetFormSchema = z.object({
  serial_number: z.string()
    .min(1, 'Serial number is required')
    .max(100)
    .transform(val => val.toUpperCase().trim()),

  brand: z.string().min(1, 'Brand is required'),

  model: z.string().min(1, 'Model is required'),

  asset_type: z.enum([
    'laptop',
    'desktop',
    'monitor',
    'phone',
    'tablet',
    'printer',
    'other'
  ]),

  specs: z.object({
    processor: z.string().optional(),
    ram: z.string().optional(),
    storage: z.string().optional(),
    screen_size: z.string().optional(),
  }).optional(),

  assigned_sub_user_id: z.string().nullable().optional(),
  is_self_assigned: z.boolean().optional(),
});
```

---

## Journey 2: Bulk Asset Upload

### 2.1 User Journey Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       BULK ASSET UPLOAD                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  IT ADMIN ACTIONS                          SYSTEM RESPONSES                 │
│  ─────────────────                         ─────────────────                │
│                                                                             │
│  1. Navigate to Assets > Upload            Open upload page                 │
│         ↓                                                                   │
│  2. Download CSV/Excel template            Provide template file            │
│         ↓                                                                   │
│  3. Fill template with asset data:                                         │
│     • serial_number (required)                                             │
│     • brand (required)                                                     │
│     • model (required)                                                     │
│     • asset_type (required)                                                │
│     • processor, ram, storage (optional)                                   │
│     • assigned_to_email (optional)         Match with sub_users            │
│         ↓                                                                   │
│  4. Upload filled file                     Parse and validate              │
│         ↓                                                                   │
│  5. Review validation results:                                             │
│     ┌──────────────────────────────────────────────────────────────────┐   │
│     │  ✓ 45 assets valid                                                │   │
│     │  ⚠ 3 assets with warnings (employee not found)                    │   │
│     │  ✗ 2 assets with errors (duplicate serial)                        │   │
│     └──────────────────────────────────────────────────────────────────┘   │
│         ↓                                                                   │
│  6. View detailed errors                   Show row-by-row issues          │
│         ↓                                                                   │
│  7. Choose action:                                                         │
│     ┌─────────────────┐  ┌─────────────────┐                               │
│     │ Upload Valid    │  │ Fix & Re-upload │                               │
│     │ Only (45)       │  │                 │                               │
│     └─────────────────┘  └─────────────────┘                               │
│         ↓                                                                   │
│  8. Confirm upload                         • Create assets batch           │
│                                            • Send notifications            │
│                                            • Show results summary          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Sequence Diagram

```mermaid
sequenceDiagram
    participant IT as IT Admin
    participant FE as Frontend<br/>(UploadAssets.tsx)
    participant PARSER as CSV/Excel Parser
    participant VAL as Validator
    participant API as Supabase API
    participant DB as Database

    IT->>FE: Navigate to /admin/assets/upload
    FE->>FE: Show upload interface

    IT->>FE: Click "Download Template"
    FE->>IT: Provide CSV/Excel template

    Note over IT: IT Admin fills template offline

    IT->>FE: Upload filled file
    FE->>PARSER: Parse file
    PARSER-->>FE: Parsed rows

    FE->>API: fetchSubUsers(enterpriseId)
    API->>DB: SELECT email, id FROM sub_users
    DB-->>API: Sub-users map
    API-->>FE: Email-to-ID mapping

    FE->>API: fetchUsers(enterpriseId)
    API->>DB: SELECT email, id FROM users WHERE role = 'it_admin'
    DB-->>API: IT Admin users
    API-->>FE: IT Admin email-to-ID mapping

    loop For each row
        FE->>VAL: Validate row
        VAL->>VAL: Check required fields
        VAL->>VAL: Validate serial format
        VAL->>FE: Row validation result

        alt Has assigned_to_email
            FE->>FE: Check if email in IT Admin list
            alt Found in IT Admin
                FE->>FE: Set assigned_user_id (self-evaluation)
            else Check Sub-Users
                FE->>FE: Check if email in sub_users
                alt Found
                    FE->>FE: Set assigned_sub_user_id
                else Not Found
                    FE->>FE: Mark as warning (unassigned)
                end
            end
        end
    end

    FE->>API: Batch check serial uniqueness
    API->>DB: SELECT serial_number FROM assets WHERE serial_number IN (...)
    DB-->>API: Existing serials
    API-->>FE: Duplicates list

    FE->>FE: Mark duplicates as errors

    FE->>IT: Show validation summary

    IT->>FE: Click "Upload Valid Assets"

    FE->>API: createAssets(validAssets)

    loop For each valid asset
        API->>DB: INSERT INTO assets
    end

    loop For assigned assets
        API->>DB: Send notification
    end

    API-->>FE: Results summary
    FE->>IT: Show success/failure counts
```

### 2.3 CSV Template Columns

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| `serial_number` | Yes | Unique device serial | `SN123456` |
| `brand` | Yes | Manufacturer | `Dell`, `HP`, `Lenovo` |
| `model` | Yes | Model name | `Latitude 5520` |
| `asset_type` | Yes | Device category | `laptop`, `desktop` |
| `processor` | No | CPU details | `Intel Core i7-1165G7` |
| `ram` | No | Memory | `16GB` |
| `storage` | No | Storage | `512GB SSD` |
| `screen_size` | No | Display size | `15.6"` |
| `assigned_to_email` | No | Employee email | `john@techcorp.com` |

### 2.4 Validation Rules

```typescript
const bulkValidationRules = {
  serial_number: {
    required: true,
    unique: true, // Within file and database
    format: /^[A-Z0-9\-]+$/i,
  },
  brand: {
    required: true,
    maxLength: 100,
  },
  model: {
    required: true,
    maxLength: 200,
  },
  asset_type: {
    required: true,
    enum: ['laptop', 'desktop', 'monitor', 'phone', 'tablet', 'printer', 'other'],
  },
  assigned_to_email: {
    required: false,
    format: 'email',
    lookup: 'sub_users.email OR users.email', // Check both tables
  },
};
```

---

## Journey 3: Batch Creation & Management

### 3.1 User Journey Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      BATCH CREATION & SUBMISSION                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PREREQUISITE: Have assets with status "conditionally_accepted"             │
│                                                                             │
│  IT ADMIN ACTIONS                          SYSTEM RESPONSES                 │
│  ─────────────────                         ─────────────────                │
│                                                                             │
│  1. Navigate to Batches                    Load batch list                  │
│         ↓                                                                   │
│  2. Click "Create Batch"                   Open batch form                  │
│         ↓                                                                   │
│  3. Enter batch details:                                                   │
│     • Batch name                                                           │
│     • Description (optional)                                               │
│         ↓                                                                   │
│  4. Create batch (draft)                   Batch created in draft mode     │
│         ↓                                                                   │
│  5. Navigate to batch detail               Show batch detail page          │
│         ↓                                                                   │
│  6. Click "Add Assets"                     Show available assets           │
│         ↓                                                                   │
│  7. Select assets to add:                  Filter by status                │
│     • Filter by brand/type                 Show only eligible assets       │
│     • Select individual assets                                             │
│     • Or "Select All"                                                      │
│         ↓                                                                   │
│  8. Click "Add to Batch"                   Link assets to batch            │
│         ↓                                                                   │
│  9. Review batch contents                  Show asset count, estimated $   │
│         ↓                                                                   │
│  10. Click "Submit for Approval"           Open pickup details modal       │
│         ↓                                                                   │
│  11. Fill pickup details:                                                  │
│      • Select Branch                       Load IT admin's branches        │
│      • Preferred Date                      Date picker (future only)       │
│      • Time Slot                           morning/afternoon/evening       │
│      • Priority                            normal/high/urgent              │
│      • Notes                               Free text                       │
│         ↓                                                                   │
│  12. Confirm submission                    • Update batch status           │
│                                            • Notify Org Admin              │
│                                            • Batch locked for editing      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Batch Lifecycle Diagram

```mermaid
stateDiagram-v2
    [*] --> draft: Create Batch

    draft --> draft: Add/Remove Assets
    draft --> pending_approval: Submit for Approval

    pending_approval --> approved: Org Admin Approves
    pending_approval --> rejected: Org Admin Rejects

    rejected --> draft: IT Admin Edits

    approved --> pickup_scheduled: Pickup Assigned

    pickup_scheduled --> completed: All Assets Picked Up

    completed --> [*]

    note right of draft
        IT Admin can:
        - Add assets
        - Remove assets
        - Edit details
    end note

    note right of pending_approval
        Batch locked
        Waiting for Org Admin
    end note

    note right of approved
        Pickup request
        auto-created
    end note
```

### 3.3 Submission Sequence Diagram

```mermaid
sequenceDiagram
    participant IT as IT Admin
    participant FE as Frontend<br/>(BatchDetail.tsx)
    participant API as Supabase API
    participant DB as Database
    participant EMAIL as Email Service
    participant ORG as Org Admin

    IT->>FE: Open batch detail
    FE->>API: fetchBatch(batchId)
    API->>DB: SELECT batch, assets
    DB-->>API: Batch with assets
    API-->>FE: Display batch

    IT->>FE: Click "Submit for Approval"
    FE->>FE: Open pickup details modal

    IT->>FE: Select branch
    FE->>API: fetchBranchesByITAdmin(userId)
    API->>DB: SELECT * FROM branches WHERE it_admin_id = ?
    DB-->>API: IT Admin's branches
    API-->>FE: Populate dropdown

    IT->>FE: Select date, time slot, priority
    IT->>FE: Enter notes
    IT->>FE: Click "Submit"

    FE->>API: submitBatchForApproval(batchId, pickupDetails)

    API->>DB: BEGIN TRANSACTION

    Note over API,DB: Update batch
    API->>DB: UPDATE batches SET<br/>status = 'pending_approval',<br/>pickup_details = {...}

    Note over API,DB: Update assets
    API->>DB: UPDATE assets SET status = 'ready_for_pickup'<br/>WHERE batch_id = ?

    API->>DB: COMMIT

    API->>EMAIL: Notify Org Admin
    EMAIL->>ORG: "Batch pending approval"

    API-->>FE: Success
    FE->>IT: Show confirmation
    FE->>FE: Update UI (batch locked)
```

### 3.4 Technical Implementation

| Component | File Path | Purpose |
|-----------|-----------|---------|
| Batch List | `src/pages/admin/BatchList.tsx` | List all batches |
| Batch Create | `src/pages/admin/BatchCreate.tsx` | Create new batch |
| Batch Detail | `src/pages/admin/BatchDetail.tsx` | Manage batch assets |
| Create Mutation | `src/lib/db/mutations.ts` | `createBatch()` |
| Submit Mutation | `src/lib/db/mutations.ts` | `submitBatchForApproval()` |
| Add Assets | `src/lib/db/mutations.ts` | `addAssetsToBatch()` |

---

## Journey 4: Pickup Initiation

### 4.1 User Journey Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PICKUP INITIATION                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TRIGGER: Have approved assets ready for pickup (not in batch)              │
│                                                                             │
│  IT ADMIN ACTIONS                          SYSTEM RESPONSES                 │
│  ─────────────────                         ─────────────────                │
│                                                                             │
│  1. Navigate to Pickups                    Load pickup requests list        │
│         ↓                                                                   │
│  2. Click "Initiate Pickup"                Open initiate pickup page        │
│         ↓                                                                   │
│  3. Select branch                          Load IT admin's branches         │
│         ↓                                  Show branch address              │
│  4. Select assets:                         Show pickupable assets           │
│     • Filter by status                     "conditionally_accepted" only    │
│     • Select individual or "All"                                           │
│         ↓                                                                   │
│  5. Fill pickup details:                                                   │
│     • Preferred Date                       Future dates only                │
│     • Time Slot                            morning/afternoon/evening        │
│     • Priority                             normal/high/urgent               │
│     • Special Instructions                 Free text                        │
│         ↓                                                                   │
│  6. Review summary:                        Show asset count, address        │
│         ↓                                                                   │
│  7. Submit request                         • Create pickup_request          │
│                                            • Update asset statuses          │
│                                            • Notify OPS Admin               │
│         ↓                                                                   │
│  8. See confirmation                       • Request ID displayed           │
│                                            • Redirect to pickup list        │
│                                            • Status: "pending_assignment"   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Sequence Diagram

```mermaid
sequenceDiagram
    participant IT as IT Admin
    participant FE as Frontend<br/>(InitiatePickup.tsx)
    participant API as Supabase API
    participant DB as Database
    participant OPS as OPS Admin

    IT->>FE: Navigate to /admin/pickups/initiate
    FE->>API: fetchBranchesByITAdmin(userId)
    API->>DB: SELECT * FROM branches WHERE it_admin_id = ?
    DB-->>API: Branches list
    API-->>FE: Populate branch selector

    IT->>FE: Select branch
    FE->>API: fetchPickupableAssets(branchId)
    API->>DB: SELECT * FROM assets<br/>WHERE branch_id = ? AND status = 'conditionally_accepted'
    DB-->>API: Available assets
    API-->>FE: Display asset grid

    IT->>FE: Select assets (checkbox)
    IT->>FE: Fill pickup details
    IT->>FE: Click "Create Pickup Request"

    FE->>API: createPickupRequest(data)

    API->>DB: BEGIN TRANSACTION

    API->>DB: INSERT INTO pickup_requests<br/>(branch_id, asset_ids, status='pending_assignment')
    DB-->>API: Pickup request ID

    API->>DB: UPDATE assets SET status = 'pickup_requested'<br/>WHERE id IN (selected_ids)

    API->>DB: COMMIT

    API->>DB: Notify OPS Admin
    DB-->>API: Success

    API-->>FE: Success + pickup ID

    FE->>IT: Show confirmation
    FE->>FE: Redirect to pickup list
```

---

## Journey 5: Sub-User Management

### 5.1 User Journey Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SUB-USER MANAGEMENT                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CREATE SINGLE SUB-USER                                                     │
│  ─────────────────────                                                     │
│  1. Navigate to Sub-Users → Click "Add Employee"                           │
│  2. Enter details: Name, Email, Phone, Employee ID                         │
│  3. Create → Account created with temporary password                       │
│  4. System sends invitation email                                          │
│                                                                             │
│  BULK UPLOAD SUB-USERS                                                     │
│  ─────────────────────                                                     │
│  1. Download CSV template                                                  │
│  2. Fill employee details                                                  │
│  3. Upload → Validate all rows                                             │
│  4. Review errors/warnings                                                 │
│  5. Confirm → Create accounts                                              │
│  6. System sends bulk invitations                                          │
│                                                                             │
│  MANAGE SUB-USERS                                                          │
│  ────────────────                                                          │
│  • View list with search/filter                                            │
│  • Edit details (name, phone)                                              │
│  • Resend invitation email                                                 │
│  • Deactivate (status → inactive)                                          │
│  • View assigned assets                                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Sequence Diagram

```mermaid
sequenceDiagram
    participant IT as IT Admin
    participant FE as Frontend<br/>(SubUserList.tsx)
    participant API as Supabase API
    participant AUTH as Supabase Auth
    participant DB as Database
    participant EMAIL as Email Service

    IT->>FE: Navigate to /admin/sub-users
    FE->>API: fetchSubUsers(enterpriseId)
    API->>DB: SELECT * FROM sub_users WHERE enterprise_id = ?
    DB-->>API: Sub-users list
    API-->>FE: Display list

    IT->>FE: Click "Add Employee"
    FE->>FE: Open form modal

    IT->>FE: Enter name, email, phone, employee_id
    IT->>FE: Click "Create"

    FE->>API: createSubUser(data)

    API->>API: Generate temporary password

    API->>AUTH: admin.createUser({email, password})
    AUTH-->>API: auth_user_id

    API->>DB: INSERT INTO sub_users<br/>(id, name, email, phone, employee_id, enterprise_id)
    DB-->>API: Sub-user created

    API->>EMAIL: Send invitation email
    EMAIL-->>API: Sent

    API-->>FE: Success
    FE->>IT: Show confirmation
    FE->>FE: Update list
```

---

## Journey 6: Self-Evaluation

### 6.1 User Journey Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       IT ADMIN SELF-EVALUATION                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  USE CASE: IT Admin wants to evaluate their own device                      │
│                                                                             │
│  ASSIGNMENT PATH (Option A - During Asset Creation)                         │
│  ─────────────────────────────────────────────────                         │
│  1. Add Asset → Check "Assign to Myself"                                   │
│  2. Asset created with assigned_user_id = current user                     │
│  3. Asset appears in "My Evaluations" page                                 │
│                                                                             │
│  ASSIGNMENT PATH (Option B - Bulk Upload)                                   │
│  ─────────────────────────────────────────                                 │
│  1. In CSV, put IT Admin's email in assigned_to_email column               │
│  2. System detects email belongs to IT Admin (not sub-user)                │
│  3. Sets assigned_user_id instead of assigned_sub_user_id                  │
│  4. Asset appears in "My Evaluations" page                                 │
│                                                                             │
│  EVALUATION FLOW                                                           │
│  ───────────────                                                           │
│  1. Navigate to "My Evaluations" → See assigned devices                    │
│  2. Click "Start Evaluation" → Same form as sub-user                       │
│  3. Upload photos                                                          │
│  4. Complete functional checklist                                          │
│  5. Complete cosmetic checklist                                            │
│  6. Submit → Goes to remote review queue                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Self-Evaluation Flowchart

```mermaid
flowchart TD
    A[IT Admin] --> B{Assignment Method}

    B -->|Single Asset| C[Add Asset Form]
    C --> D[Check 'Assign to Myself']
    D --> E[Create Asset]
    E --> F[assigned_user_id = IT Admin ID]

    B -->|Bulk Upload| G[CSV with assigned_to_email]
    G --> H{Email Lookup}
    H -->|Found in users table| I[Set assigned_user_id]
    H -->|Found in sub_users| J[Set assigned_sub_user_id]
    H -->|Not found| K[Leave unassigned]

    F --> L[My Evaluations Page]
    I --> L

    L --> M[Click Start Evaluation]
    M --> N[Upload Photos]
    N --> O[Functional Checklist]
    O --> P[Cosmetic Assessment]
    P --> Q[Submit]
    Q --> R[Remote Review Queue]
```

---

## Journey 7: Tracking Asset Status

### 7.1 Status Visibility

```mermaid
flowchart LR
    subgraph ITAdmin["IT Admin View"]
        D1[Dashboard Stats]
        AL[Asset List]
        AD[Asset Detail]
        BL[Batch List]
        PL[Pickup List]
    end

    subgraph StatusFlow["Asset Status Flow"]
        S1[pending_assignment]
        S2[assigned]
        S3[check_in_started]
        S4[submitted]
        S5[remote_review]
        S6[conditionally_accepted]
        S7[ready_for_pickup]
        S8[pickup_requested]
        S9[pickup_scheduled]
        S10[picked_up]
    end

    D1 --> |counts by status| StatusFlow
    AL --> |filter by status| StatusFlow
    AD --> |single asset status| StatusFlow
    BL --> |batch status| StatusFlow
    PL --> |pickup status| StatusFlow
```

### 7.2 Dashboard Metrics

| Metric | Calculation | Purpose |
|--------|-------------|---------|
| Total Assets | Count all assets | Overview |
| Pending Assignment | Status = 'pending_assignment' | Action needed |
| Assigned | Status = 'assigned' | Waiting for employee |
| Submitted | Status = 'submitted' | In review |
| Approved | Status = 'conditionally_accepted' | Ready for batch |
| Ready for Pickup | Status = 'ready_for_pickup' | Can initiate pickup |
| In Transit | Status = 'picked_up' or 'in_transit' | Being shipped |
| Completed | Status = 'completed' | Finished |

---

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `fetchAssets` | Query | List assets (enterprise/branch scoped) |
| `fetchAssetsByITAdmin` | Query | Assets for IT admin's branches |
| `createAsset` | Mutation | Create single asset |
| `createAssets` | Mutation | Bulk create assets |
| `fetchBatches` | Query | List batches |
| `fetchBatchesByITAdmin` | Query | Batches for IT admin's branches |
| `createBatch` | Mutation | Create batch |
| `submitBatchForApproval` | Mutation | Submit to Org Admin |
| `createPickupRequest` | Mutation | Initiate pickup |
| `fetchPickupsByITAdmin` | Query | Pickup requests |
| `fetchSubUsers` | Query | List sub-users |
| `createSubUser` | Mutation | Create employee |
| `fetchSelfAssignedAssets` | Query | IT admin's own assets |

---

## Error Handling

| Error | User Message | Resolution |
|-------|--------------|------------|
| Duplicate serial | "Serial number already exists" | Use different serial |
| Invalid email | "Employee email not found" | Check email or create sub-user |
| Empty batch | "Batch must have at least 1 asset" | Add assets before submitting |
| No eligible assets | "No assets available for pickup" | Wait for approvals |
| Submission failed | "Failed to submit. Please retry." | Check connection, retry |
