# Org Admin Journeys

## Overview

Org Admin is the enterprise-level administrator responsible for branch management, IT admin oversight, pickup approvals, and financial tracking.

## Journey Overview

```mermaid
mindmap
  root((Org Admin))
    Branch Management
      Create Branches
      Bulk Upload
      Assign IT Admins
    IT Admin Management
      Create IT Admins
      Assign to Branches
      Monitor Activity
    Pickup Approvals
      Review Batches
      Set Pricing
      Approve/Reject
    Financial
      View Wallet
      Track Transactions
      Request Withdrawals
    Compliance
      EPR Certificates
      Generate Reports
```

---

## Journey 1: Branch Management

### 1.1 Create Single Branch

```mermaid
sequenceDiagram
    participant ORG as Org Admin
    participant FE as Frontend<br/>(BranchManagement.tsx)
    participant API as Supabase API
    participant DB as Database

    ORG->>FE: Navigate to /org-admin/branches
    FE->>API: fetchBranches(enterpriseId)
    API->>DB: SELECT * FROM branches WHERE enterprise_id = ?
    DB-->>API: Branches list
    API-->>FE: Display branches

    ORG->>FE: Click "Add Branch"
    FE->>FE: Open branch form modal

    ORG->>FE: Enter branch details
    ORG->>FE: Enter branch code

    FE->>API: checkBranchCodeExists(enterpriseId, code)
    API->>DB: SELECT id FROM branches WHERE branch_code = ?
    DB-->>API: Not exists
    API-->>FE: Code available

    ORG->>FE: Select IT Admin (optional)
    ORG->>FE: Click "Create"

    FE->>API: createBranch(data)
    API->>DB: INSERT INTO branches

    alt IT Admin Selected
        API->>DB: UPDATE branches SET it_admin_id = ?
        Note over DB: Branch status = 'active'
    else No IT Admin
        Note over DB: Branch status = 'needs_admin'
    end

    DB-->>API: Branch created
    API-->>FE: Success
    FE->>ORG: Show confirmation
    FE->>FE: Refresh branch list
```

### 1.2 Bulk Branch Upload

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      BULK BRANCH UPLOAD                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CSV TEMPLATE COLUMNS                                                       │
│  ────────────────────                                                      │
│  • branch_name (required)                                                  │
│  • branch_code (required, 1-10 alphanumeric)                               │
│  • address_line1 (required)                                                │
│  • address_line2 (optional)                                                │
│  • city (required)                                                         │
│  • state (required)                                                        │
│  • pin_code (required, 6 digits)                                           │
│  • site_contact_person (optional)                                          │
│  • site_contact_phone (optional)                                           │
│  • it_admin_email (optional - auto-creates if not exists)                  │
│  • it_admin_name (optional - used if creating new IT admin)                │
│                                                                             │
│  AUTO IT ADMIN CREATION                                                    │
│  ──────────────────────                                                    │
│  If it_admin_email is provided:                                            │
│    • Check if email exists in users table                                  │
│    • If exists → assign that IT admin to branch                            │
│    • If not exists → create new IT admin with generated password           │
│    • Password shown in results report for distribution                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Branch Status Flow

```mermaid
stateDiagram-v2
    [*] --> needs_admin: Created without IT Admin

    needs_admin --> active: IT Admin Assigned

    active --> inactive: Deactivated
    active --> needs_admin: IT Admin Removed

    inactive --> active: Reactivated

    note right of needs_admin
        Branch exists but
        cannot operate
        without IT Admin
    end note

    note right of active
        Fully operational
        IT Admin can manage
    end note
```

---

## Journey 2: IT Admin Management

### 2.1 Create IT Admin Flow

```mermaid
sequenceDiagram
    participant ORG as Org Admin
    participant FE as Frontend<br/>(ITAdminManagement.tsx)
    participant API as Supabase API
    participant AUTH as Supabase Auth
    participant DB as Database
    participant EMAIL as Email Service

    ORG->>FE: Navigate to /org-admin/it-admins
    FE->>API: fetchITAdmins(enterpriseId)
    API->>DB: SELECT * FROM users WHERE enterprise_id = ? AND role = 'it_admin'
    DB-->>API: IT Admins list
    API-->>FE: Display list

    ORG->>FE: Click "Add IT Admin"
    FE->>FE: Open form modal

    FE->>API: fetchBranches(enterpriseId)
    API->>DB: SELECT * FROM branches
    DB-->>API: Branches for dropdown
    API-->>FE: Populate branch selector

    ORG->>FE: Enter name, email, phone
    ORG->>FE: Select branch to assign
    ORG->>FE: Enter password
    ORG->>FE: Click "Create"

    FE->>API: createITAdmin(data)

    API->>AUTH: admin.createUser({email, password})
    AUTH-->>API: auth_user_id

    API->>DB: INSERT INTO users (id, role='it_admin', enterprise_id)
    DB-->>API: User created

    alt Branch Selected
        API->>DB: UPDATE branches SET it_admin_id = ?
        DB-->>API: Branch updated
    end

    API->>EMAIL: Send credentials email
    EMAIL-->>API: Sent

    API-->>FE: Success
    FE->>ORG: Show confirmation
```

### 2.2 IT Admin - Branch Relationship (V3.2)

```mermaid
erDiagram
    USERS ||--o{ BRANCHES : manages
    USERS {
        string id PK
        string email
        string name
        string role
        string enterprise_id FK
    }
    BRANCHES {
        string id PK
        string enterprise_id FK
        string it_admin_id FK
        string branch_name
        string branch_code
        string status
    }

    %% Key relationship:
    %% One IT Admin can manage MULTIPLE branches
    %% Each branch has AT MOST one IT Admin
```

---

## Journey 3: Pickup Approvals (Critical Workflow)

### 3.1 Complete Approval Journey

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PICKUP APPROVAL WORKFLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TRIGGER: IT Admin submits batch for approval                               │
│                                                                             │
│  ORG ADMIN ACTIONS                         SYSTEM RESPONSES                 │
│  ─────────────────                         ─────────────────                │
│                                                                             │
│  1. Receive notification                   Email + In-app badge             │
│         ↓                                                                   │
│  2. Navigate to Approvals                  Load approval queue              │
│         ↓                                                                   │
│  3. Select pending batch                   Show batch detail panel          │
│         ↓                                                                   │
│  4. Review batch info:                     Display:                         │
│     • Submitting IT Admin                  • Admin name + branch            │
│     • Asset count                          • Total assets in batch          │
│     • Pickup details                       • Date, time, location           │
│     • IT Admin notes                       • Any special instructions       │
│         ↓                                                                   │
│  5. Review all assets:                                                     │
│     ┌────────────────────────────────────────────────────────────────────┐ │
│     │ Asset              │ Specs              │ Price (₹)                │ │
│     ├────────────────────┼────────────────────┼──────────────────────────┤ │
│     │ Dell Latitude 5520 │ i5 / 16GB / 512GB  │ [___15000___]            │ │
│     │ HP ProBook 450     │ i7 / 8GB / 256GB   │ [___12000___]            │ │
│     │ Lenovo ThinkPad    │ i5 / 8GB / 256GB   │ [____________]           │ │
│     ├────────────────────┴────────────────────┼──────────────────────────┤ │
│     │                               Total     │ ₹27,000                  │ │
│     └─────────────────────────────────────────┴──────────────────────────┘ │
│                                                                             │
│  6. Set pricing (OPTIONAL):                Per-asset pricing               │
│     • Enter price for each asset           • Not required to approve       │
│     • System shows running total           • Can leave blank               │
│         ↓                                                                   │
│  7. Make decision:                                                         │
│                                                                             │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │                         APPROVE                                  │    │
│     │  • Confirms pickup schedule                                      │    │
│     │  • Creates pickup_request automatically                          │    │
│     │  • Saves asset prices (if entered)                               │    │
│     │  • Notifies IT Admin                                             │    │
│     │  • Batch moves to logistics queue                                │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │                          REJECT                                  │    │
│     │  • Opens rejection reason modal                                  │    │
│     │  • Enter feedback for IT Admin                                   │    │
│     │  • Batch returns to "draft" status                               │    │
│     │  • IT Admin can edit and resubmit                                │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Approval Sequence Diagram

```mermaid
sequenceDiagram
    participant IT as IT Admin
    participant ORG as Org Admin
    participant FE as Frontend<br/>(PickupApprovals.tsx)
    participant API as Supabase API
    participant DB as Database
    participant EMAIL as Email Service

    Note over IT: IT Admin submits batch
    IT->>API: submitBatchForApproval()
    API->>EMAIL: Notify Org Admin
    EMAIL->>ORG: "Batch pending approval"

    ORG->>FE: Open /org-admin/approvals
    FE->>API: fetchPickupApprovalQueue(enterpriseId)
    API->>DB: SELECT FROM pickup_approval_queue VIEW
    DB-->>API: Pending batches
    API-->>FE: Display queue

    ORG->>FE: Click batch to review
    FE->>API: fetchBatchById(batchId)
    API->>DB: SELECT batch, assets, IT admin info
    DB-->>API: Full batch data
    API-->>FE: Display review panel

    ORG->>FE: Review assets
    ORG->>FE: Enter pricing (optional)

    alt Approve
        ORG->>FE: Click "Approve"
        FE->>FE: Show confirmation dialog

        Note over FE: "Approving will initiate pickup.<br/>X assets worth ₹Y scheduled."

        ORG->>FE: Confirm
        FE->>API: approveBatchWithPrices(batchId, prices)

        API->>DB: BEGIN TRANSACTION

        loop For assets with prices
            API->>DB: UPDATE assets SET base_price = ?
        end

        API->>DB: UPDATE batches SET status = 'approved'

        API->>DB: INSERT INTO pickup_requests

        API->>DB: COMMIT

        API->>EMAIL: Notify IT Admin
        EMAIL->>IT: "Batch approved, pickup scheduled"

        API-->>FE: Success
        FE->>ORG: Show confirmation

    else Reject
        ORG->>FE: Click "Reject"
        FE->>FE: Open rejection modal
        ORG->>FE: Enter rejection reason
        ORG->>FE: Confirm rejection

        FE->>API: rejectBatch(batchId, reason)
        API->>DB: UPDATE batches SET status = 'rejected', rejection_reason
        API->>EMAIL: Notify IT Admin
        EMAIL->>IT: "Batch rejected: [reason]"

        API-->>FE: Success
    end
```

### 3.3 Pricing Table UI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  BATCH: December IT Refresh                                                 │
│  Branch: Mumbai HQ • IT Admin: John Smith                                   │
│  Submitted: Dec 5, 2025 • Assets: 12                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ASSETS                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Asset                  │ Specs                │ Price (₹)           │   │
│  ├────────────────────────┼──────────────────────┼─────────────────────┤   │
│  │ Dell Latitude 5520     │ i5-1135G7 / 16GB /   │                     │   │
│  │ SN: DL5520-001         │ 512GB SSD / 15.6"    │ [     15,000     ]  │   │
│  ├────────────────────────┼──────────────────────┼─────────────────────┤   │
│  │ HP ProBook 450 G8      │ i7-1165G7 / 8GB /    │                     │   │
│  │ SN: HPP450-002         │ 256GB SSD / 15.6"    │ [     12,000     ]  │   │
│  ├────────────────────────┼──────────────────────┼─────────────────────┤   │
│  │ Lenovo ThinkPad T14    │ i5-1135G7 / 8GB /    │                     │   │
│  │ SN: LTP14-003          │ 256GB SSD / 14"      │ [              ]    │   │
│  ├────────────────────────┼──────────────────────┼─────────────────────┤   │
│  │ Dell XPS 15 9510       │ i7-11800H / 32GB /   │                     │   │
│  │ SN: DXP15-004          │ 1TB SSD / 15.6"      │ [     35,000     ]  │   │
│  ├────────────────────────┴──────────────────────┼─────────────────────┤   │
│  │                                      Total    │       ₹62,000       │   │
│  └───────────────────────────────────────────────┴─────────────────────┘   │
│                                                                             │
│  IT Admin Notes:                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  "End of year refresh batch. All devices have been tested and are   │   │
│  │   ready for pickup. Contact site security for building access."     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                                    [ Reject ]   [ ✓ Approve Batch ]         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Journey 4: Financial Tracking

### 4.1 Wallet Dashboard

```mermaid
flowchart TD
    subgraph Wallet["Enterprise Wallet"]
        A[Available Balance<br/>₹2,45,000]
        B[Pending Credits<br/>₹1,20,000]
        C[Total Earned<br/>₹15,45,000]
        D[Total Redeemed<br/>₹13,00,000]
    end

    subgraph Actions["Available Actions"]
        E[View Transactions]
        F[Request Withdrawal]
        G[Export Statement]
    end

    Wallet --> Actions
```

### 4.2 Transaction Types

| Type | Description | Impact |
|------|-------------|--------|
| `credit` | Asset payout credited | +Balance |
| `pending_credit` | Asset in QC, pending payout | +Pending |
| `withdrawal` | Bank transfer requested | -Balance |
| `redemption` | Product purchased with credits | -Balance |
| `adjustment` | Manual adjustment (dispute, correction) | ±Balance |

### 4.3 Wallet Sequence Diagram

```mermaid
sequenceDiagram
    participant ORG as Org Admin
    participant FE as Frontend<br/>(Wallet.tsx)
    participant API as Supabase API
    participant DB as Database

    ORG->>FE: Navigate to /org-admin/wallet
    FE->>API: fetchEnterpriseWallet(enterpriseId)
    API->>DB: SELECT * FROM enterprise_wallets WHERE enterprise_id = ?
    DB-->>API: Wallet data
    API-->>FE: Display balances

    FE->>API: fetchTransactions(enterpriseId)
    API->>DB: SELECT * FROM credit_transactions ORDER BY created_at DESC
    DB-->>API: Transaction history
    API-->>FE: Display transactions

    ORG->>FE: Click "Request Withdrawal"
    FE->>FE: Open withdrawal modal
    ORG->>FE: Enter amount
    ORG->>FE: Confirm bank details
    ORG->>FE: Submit request

    FE->>API: createWithdrawalRequest(amount)
    API->>DB: INSERT INTO withdrawal_requests
    API->>DB: UPDATE enterprise_wallets SET available_balance = available_balance - amount
    API-->>FE: Success
    FE->>ORG: "Withdrawal requested. Processing in 3-5 business days."
```

---

## Journey 5: EPR Certificates & Reports

### 5.1 EPR Certificate Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      EPR CERTIFICATES                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  What is EPR?                                                              │
│  Extended Producer Responsibility (EPR) certificates prove                  │
│  environmentally responsible disposal of e-waste.                           │
│                                                                             │
│  Certificate Generation:                                                   │
│  • Auto-generated when assets reach "completed" status                     │
│  • Contains details of all devices processed                               │
│  • Legally valid for compliance reporting                                  │
│                                                                             │
│  Available Actions:                                                        │
│  • View certificate list by date range                                     │
│  • Download individual certificates (PDF)                                  │
│  • Bulk download for period                                                │
│  • Share via email                                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Reports Available

| Report | Description | Format |
|--------|-------------|--------|
| Asset Summary | All assets by status | PDF, Excel |
| Branch Performance | Assets per branch | PDF, Excel |
| Financial Summary | Credits, payouts, withdrawals | PDF, Excel |
| IT Admin Activity | Actions per IT admin | PDF |
| EPR Compliance | Environmental certificates | PDF |

---

## Technical Implementation

### Components

| Component | File Path | Purpose |
|-----------|-----------|---------|
| Dashboard | `src/pages/org-admin/Dashboard.tsx` | Overview metrics |
| Branch Management | `src/pages/org-admin/BranchManagement.tsx` | CRUD branches |
| Bulk Branch Upload | `src/pages/org-admin/BulkBranchUpload.tsx` | CSV upload |
| IT Admin Management | `src/pages/org-admin/ITAdminManagement.tsx` | CRUD IT admins |
| Pickup Approvals | `src/pages/org-admin/PickupApprovals.tsx` | Batch approvals |
| Wallet | `src/pages/org-admin/Wallet.tsx` | Financial tracking |
| Reports | `src/pages/org-admin/Reports.tsx` | Generate reports |
| EPR Certificates | `src/pages/org-admin/EPRCertificates.tsx` | Compliance docs |

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `fetchBranches(enterpriseId)` | List branches |
| `createBranch(data)` | Create branch |
| `bulkCreateBranches(data)` | Bulk create |
| `fetchITAdmins(enterpriseId)` | List IT admins |
| `createITAdmin(data)` | Create IT admin |
| `fetchPickupApprovalQueue(enterpriseId)` | Pending batches |
| `approveBatchWithPrices(batchId, prices)` | Approve with pricing |
| `rejectBatch(batchId, reason)` | Reject batch |
| `fetchEnterpriseWallet(enterpriseId)` | Wallet balance |
| `fetchTransactions(enterpriseId)` | Transaction history |

---

## Decision Points

### Approval Decision Tree

```mermaid
flowchart TD
    A[Review Batch] --> B{All Info Complete?}
    B -->|No| C[Request More Info from IT Admin]
    B -->|Yes| D{Assets Look Valid?}
    D -->|No| E[Reject with Reason]
    D -->|Yes| F{Set Pricing?}
    F -->|Yes| G[Enter Asset Prices]
    F -->|No| H[Leave Prices Empty]
    G --> I[Approve Batch]
    H --> I
    I --> J[Pickup Request Created]
    E --> K[Batch Returns to IT Admin]
    C --> L[Wait for IT Admin Response]
```
