# Enterprise Onboarding Journey

## Overview

This document details the complete enterprise onboarding flow from initial registration through first asset submission.

## Journey Stages

```mermaid
flowchart LR
    A[Discovery] --> B[Registration]
    B --> C[Review]
    C --> D[Approval]
    D --> E[Setup]
    E --> F[First Asset]

    style A fill:#e1f5fe
    style B fill:#fff3e0
    style C fill:#fce4ec
    style D fill:#e8f5e9
    style E fill:#f3e5f5
    style F fill:#e0f2f1
```

---

## Stage 1: Discovery & Registration

### 1.1 User Journey Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         REGISTRATION JOURNEY                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PROSPECT ACTIONS                           SYSTEM RESPONSES                │
│  ─────────────────                         ─────────────────               │
│                                                                             │
│  1. Visit website                          Landing page loads               │
│         ↓                                                                   │
│  2. Click "Register Enterprise"            Navigate to /register           │
│         ↓                                                                   │
│  3. Enter company details                  Real-time validation            │
│     • Company name                         • GST format check              │
│     • GST number                           • PAN format check              │
│     • PAN number                                                           │
│         ↓                                                                   │
│  4. Enter contact person                   Email uniqueness check          │
│     • Name                                 • Check against existing users  │
│     • Email                                • Show error if duplicate       │
│     • Phone                                                                │
│         ↓                                                                   │
│  5. Enter address                          PIN code validation             │
│     • Address lines                        • City/State auto-fill         │
│     • City, State                                                         │
│     • PIN code                                                            │
│         ↓                                                                   │
│  6. Upload documents                       File validation                 │
│     • GST Certificate (required)           • File type check (PDF/Image)  │
│     • PAN Card (required)                  • Size limit check (5MB)       │
│     • Incorporation Cert (optional)        • Upload to Supabase Storage   │
│         ↓                                                                   │
│  7. Review & Submit                        Show summary for confirmation   │
│         ↓                                                                   │
│  8. Submit Application                     • Create application record    │
│                                            • Send confirmation email       │
│                                            • Notify OPS admins             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Registration Form Sequence Diagram

```mermaid
sequenceDiagram
    participant P as Prospect
    participant FE as Frontend<br/>(EnterpriseRegister.tsx)
    participant VAL as Validation<br/>(Zod Schema)
    participant API as Supabase API
    participant STORE as Supabase Storage
    participant DB as Database
    participant EMAIL as Email Service

    rect rgb(240, 248, 255)
        Note over P,FE: Step 1: Company Information
        P->>FE: Enter company name
        P->>FE: Enter GST number
        FE->>VAL: Validate GST format
        VAL-->>FE: Valid/Invalid
        P->>FE: Enter PAN number
        FE->>VAL: Validate PAN format
        VAL-->>FE: Valid/Invalid
    end

    rect rgb(255, 250, 240)
        Note over P,FE: Step 2: Contact Person
        P->>FE: Enter name, email, phone
        FE->>API: Check email uniqueness
        API->>DB: SELECT FROM users WHERE email = ?
        DB-->>API: Result
        API-->>FE: Available/Taken
        FE->>P: Show availability status
    end

    rect rgb(240, 255, 240)
        Note over P,FE: Step 3: Address
        P->>FE: Enter address details
        P->>FE: Enter PIN code
        FE->>FE: Auto-suggest city/state (optional)
    end

    rect rgb(255, 240, 245)
        Note over P,STORE: Step 4: Document Upload
        P->>FE: Select GST certificate file
        FE->>FE: Validate file type & size
        FE->>STORE: Upload file
        STORE-->>FE: File URL
        P->>FE: Select PAN card file
        FE->>STORE: Upload file
        STORE-->>FE: File URL
        P->>FE: Select incorporation cert (optional)
        FE->>STORE: Upload file
        STORE-->>FE: File URL
    end

    rect rgb(240, 240, 255)
        Note over P,EMAIL: Step 5: Submit
        P->>FE: Click Submit Application
        FE->>VAL: Final validation
        VAL-->>FE: All valid
        FE->>API: createEnterpriseApplication(data)
        API->>DB: INSERT INTO enterprise_applications
        DB-->>API: Application created (id)
        API-->>FE: Success response

        par Parallel notifications
            API->>EMAIL: Send confirmation to applicant
            API->>EMAIL: Notify OPS admins
        end

        FE->>P: Show success page
    end
```

### 1.3 Form Validation Rules

```typescript
// src/lib/validations/enterprise-application.ts

const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const pinRegex = /^[1-9][0-9]{5}$/;

const enterpriseApplicationSchema = z.object({
  // Company Info
  company_name: z.string()
    .min(3, 'Company name must be at least 3 characters')
    .max(200, 'Company name too long'),

  gst_number: z.string()
    .regex(gstRegex, 'Invalid GST number format'),

  pan_number: z.string()
    .regex(panRegex, 'Invalid PAN number format'),

  // Contact Person (becomes Org Admin)
  contact_name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100),

  contact_email: z.string()
    .email('Invalid email format')
    .transform(v => v.toLowerCase()),

  contact_phone: z.string()
    .min(10, 'Phone must be at least 10 digits')
    .regex(/^[0-9+\-\s]+$/, 'Invalid phone format'),

  // Address
  address_line1: z.string().min(5, 'Address is required'),
  address_line2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pin_code: z.string().regex(pinRegex, 'Invalid PIN code'),

  // Documents
  documents: z.object({
    gst_certificate: z.string().url('GST certificate is required'),
    pan_card: z.string().url('PAN card is required'),
    incorporation_certificate: z.string().url().optional(),
  }),
});
```

### 1.4 Database Operation

```sql
-- Insert new application
INSERT INTO enterprise_applications (
  id,
  company_name,
  gst_number,
  pan_number,
  contact_name,
  contact_email,
  contact_phone,
  address_line1,
  address_line2,
  city,
  state,
  pin_code,
  documents,
  status,
  created_at
) VALUES (
  'ea-{timestamp}-{random}',
  :company_name,
  :gst_number,
  :pan_number,
  :contact_name,
  :contact_email,
  :contact_phone,
  :address_line1,
  :address_line2,
  :city,
  :state,
  :pin_code,
  :documents_json,
  'pending',
  NOW()
);
```

### 1.5 Technical Implementation

| Component | File Path | Purpose |
|-----------|-----------|---------|
| Registration Page | `src/pages/auth/EnterpriseRegister.tsx` | Multi-step form |
| Form Schema | `src/lib/validations/enterprise.ts` | Zod validation |
| Mutation | `src/lib/db/mutations.ts` | `createEnterpriseApplication()` |
| Query | `src/lib/db/queries.ts` | `checkEmailExists()` |

---

## Stage 2: Application Review

### 2.1 OPS Admin Review Journey

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      APPLICATION REVIEW JOURNEY                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TRIGGER: Email notification / Dashboard indicator                          │
│                                                                             │
│  OPS ADMIN ACTIONS                         SYSTEM RESPONSES                 │
│  ─────────────────                         ─────────────────                │
│                                                                             │
│  1. Login to /ops portal                   Show dashboard with badge        │
│         ↓                                                                   │
│  2. Navigate to Applications               Load application queue           │
│         ↓                                                                   │
│  3. Filter by "Pending"                    Show pending applications        │
│         ↓                                                                   │
│  4. Click application row                  Show application detail modal    │
│         ↓                                                                   │
│  5. Review company details                 Display all submitted data       │
│     • Verify GST/PAN                                                       │
│     • Check address                                                        │
│         ↓                                                                   │
│  6. Review documents                       Show document previews          │
│     • Open GST certificate                 • PDF viewer / image viewer     │
│     • Open PAN card                                                        │
│     • Open incorporation cert                                              │
│         ↓                                                                   │
│  7. Make decision:                                                         │
│                                                                             │
│     ┌─────────────┐  ┌──────────────┐  ┌───────────────┐                   │
│     │   APPROVE   │  │    REJECT    │  │  REQUEST INFO │                   │
│     └──────┬──────┘  └──────┬───────┘  └───────┬───────┘                   │
│            ↓                ↓                   ↓                           │
│     • Create enterprise  • Set status to    • Set status to                │
│     • Create Org Admin     'rejected'         'more_info_needed'           │
│     • Send welcome       • Enter reason     • Specify required docs        │
│       email              • Send rejection   • Send request email           │
│                            email                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Review Sequence Diagram

```mermaid
sequenceDiagram
    participant OPS as OPS Admin
    participant FE as Frontend<br/>(EnterpriseApplications.tsx)
    participant API as Supabase API
    participant DB as Database
    participant AUTH as Supabase Auth
    participant EMAIL as Email Service

    OPS->>FE: Open Applications page
    FE->>API: fetchEnterpriseApplications('pending')
    API->>DB: SELECT * FROM enterprise_applications<br/>WHERE status = 'pending'
    DB-->>API: Applications list
    API-->>FE: Display queue

    OPS->>FE: Click on application
    FE->>FE: Open detail modal

    OPS->>FE: Review documents
    FE->>FE: Open document viewer

    alt Approve Application
        OPS->>FE: Click "Approve"
        FE->>FE: Show confirmation dialog
        OPS->>FE: Confirm approval
        FE->>API: approveEnterpriseApplication(id)

        API->>DB: BEGIN TRANSACTION

        Note over API,DB: Step 1: Create Enterprise
        API->>DB: INSERT INTO enterprises
        DB-->>API: enterprise_id

        Note over API,DB: Step 2: Create Auth User
        API->>AUTH: admin.createUser({email, password})
        AUTH-->>API: auth_user_id

        Note over API,DB: Step 3: Create Org Admin
        API->>DB: INSERT INTO users<br/>(role='org_admin', enterprise_id)
        DB-->>API: user_id

        Note over API,DB: Step 4: Update Application
        API->>DB: UPDATE enterprise_applications<br/>SET status='approved'

        API->>DB: COMMIT
        DB-->>API: Success

        API->>EMAIL: Send welcome email with credentials
        EMAIL-->>API: Sent

        API-->>FE: Success
        FE->>OPS: Show success toast

    else Reject Application
        OPS->>FE: Click "Reject"
        FE->>FE: Show reason dialog
        OPS->>FE: Enter rejection reason
        OPS->>FE: Confirm rejection
        FE->>API: rejectEnterpriseApplication(id, reason)
        API->>DB: UPDATE enterprise_applications<br/>SET status='rejected', rejection_reason
        DB-->>API: Success
        API->>EMAIL: Send rejection email
        FE->>OPS: Show confirmation

    else Request More Info
        OPS->>FE: Click "Request Info"
        FE->>FE: Show info request dialog
        OPS->>FE: Specify required documents
        FE->>API: requestMoreInfo(id, details)
        API->>DB: UPDATE enterprise_applications<br/>SET status='more_info_needed'
        API->>EMAIL: Send request email
        FE->>OPS: Show confirmation
    end
```

### 2.3 Approval Transaction (Database)

```sql
-- Full approval transaction
BEGIN;

-- 1. Create enterprise record
INSERT INTO enterprises (
  id,
  name,
  gst_number,
  pan_number,
  address,
  status,
  created_at
) VALUES (
  'ent-{uuid}',
  :company_name,
  :gst_number,
  :pan_number,
  :address_json,
  'active',
  NOW()
) RETURNING id INTO enterprise_id;

-- 2. Create user record (Org Admin)
INSERT INTO users (
  id,  -- Same as auth user ID
  email,
  name,
  phone,
  role,
  enterprise_id,
  status,
  created_at
) VALUES (
  :auth_user_id,
  :contact_email,
  :contact_name,
  :contact_phone,
  'org_admin',
  enterprise_id,
  'active',
  NOW()
);

-- 3. Create enterprise wallet
INSERT INTO enterprise_wallets (
  id,
  enterprise_id,
  available_balance,
  pending_balance,
  total_earned,
  total_redeemed,
  created_at
) VALUES (
  'wallet-{uuid}',
  enterprise_id,
  0,
  0,
  0,
  0,
  NOW()
);

-- 4. Update application status
UPDATE enterprise_applications
SET
  status = 'approved',
  reviewed_by = :ops_admin_id,
  reviewed_at = NOW(),
  enterprise_id = enterprise_id
WHERE id = :application_id;

-- 5. Create audit log
INSERT INTO audit_logs (
  id,
  entity_type,
  entity_id,
  action,
  performed_by,
  details,
  created_at
) VALUES (
  'audit-{uuid}',
  'enterprise_application',
  :application_id,
  'approved',
  :ops_admin_id,
  :details_json,
  NOW()
);

COMMIT;
```

### 2.4 Technical Implementation

| Component | File Path | Purpose |
|-----------|-----------|---------|
| Applications Queue | `src/pages/ops/EnterpriseApplications.tsx` | List & review |
| Approval Mutation | `src/lib/db/mutations.ts` | `approveEnterpriseApplication()` |
| Rejection Mutation | `src/lib/db/mutations.ts` | `rejectEnterpriseApplication()` |
| Query | `src/lib/db/queries.ts` | `fetchEnterpriseApplications()` |

---

## Stage 3: Initial Setup (Org Admin)

### 3.1 First Login & Setup Journey

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ORG ADMIN INITIAL SETUP                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TRIGGER: Welcome email with temporary password                             │
│                                                                             │
│  ORG ADMIN ACTIONS                         SYSTEM RESPONSES                 │
│  ─────────────────                         ─────────────────                │
│                                                                             │
│  1. Click link in welcome email            Navigate to /login               │
│         ↓                                                                   │
│  2. Enter credentials                      Authenticate user                │
│         ↓                                                                   │
│  3. (Optional) Change password             Update auth password             │
│         ↓                                                                   │
│  4. Land on dashboard                      Show empty state UI              │
│         ↓                                                                   │
│  5. Create first branch                    Guide wizard appears             │
│     • Branch name                                                          │
│     • Branch code                          Validate uniqueness              │
│     • Address details                                                      │
│         ↓                                                                   │
│  6. Create first IT Admin                  Create user account              │
│     • Name                                                                 │
│     • Email                                Send invitation email            │
│     • Phone                                                                │
│     • Password                                                             │
│         ↓                                                                   │
│  7. Assign IT Admin to branch              Link admin to branch             │
│         ↓                                                                   │
│  8. Setup complete!                        Show success state               │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        OPTIONAL BULK SETUP                          │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │  Alternative path for large enterprises:                             │   │
│  │                                                                      │   │
│  │  5a. Bulk upload branches                                           │   │
│  │      • Download CSV template                                        │   │
│  │      • Fill branch details                                          │   │
│  │      • Upload and validate                                          │   │
│  │      • Create all branches                                          │   │
│  │              ↓                                                       │   │
│  │  6a. Bulk upload IT Admins                                          │   │
│  │      • Download CSV template                                        │   │
│  │      • Fill admin details + branch codes                            │   │
│  │      • Upload and validate                                          │   │
│  │      • Create admins + assignments                                  │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Initial Setup Sequence Diagram

```mermaid
sequenceDiagram
    participant ORG as Org Admin
    participant FE as Frontend
    participant AUTH as Supabase Auth
    participant API as Supabase API
    participant DB as Database
    participant EMAIL as Email Service

    rect rgb(240, 248, 255)
        Note over ORG,AUTH: First Login
        ORG->>FE: Click link in welcome email
        FE->>FE: Navigate to /login
        ORG->>FE: Enter email + temp password
        FE->>AUTH: signInWithPassword()
        AUTH-->>FE: Auth token
        FE->>DB: Fetch user profile
        DB-->>FE: User (org_admin)
        FE->>DB: Fetch enterprise
        DB-->>FE: Enterprise data
        FE->>FE: Redirect to /org-admin
    end

    rect rgb(255, 250, 240)
        Note over ORG,DB: Create First Branch
        ORG->>FE: Navigate to Branches
        FE->>FE: Show empty state + CTA
        ORG->>FE: Click "Create Branch"
        FE->>FE: Open branch form modal

        ORG->>FE: Enter branch name
        ORG->>FE: Enter branch code
        FE->>API: checkBranchCodeExists(code)
        API->>DB: SELECT FROM branches WHERE branch_code = ?
        DB-->>API: Not exists
        API-->>FE: Code available

        ORG->>FE: Enter address details
        ORG->>FE: Click "Create"
        FE->>API: createBranch(data)
        API->>DB: INSERT INTO branches
        DB-->>API: Branch created
        API-->>FE: Success
        FE->>ORG: Show branch in list
    end

    rect rgb(240, 255, 240)
        Note over ORG,EMAIL: Create IT Admin
        ORG->>FE: Navigate to IT Admins
        FE->>FE: Show empty state
        ORG->>FE: Click "Add IT Admin"

        ORG->>FE: Enter admin details
        ORG->>FE: Select branch to assign
        ORG->>FE: Enter password
        ORG->>FE: Click "Create"

        FE->>API: createITAdmin(data)
        API->>AUTH: admin.createUser()
        AUTH-->>API: auth_user_id
        API->>DB: INSERT INTO users (role='it_admin')
        DB-->>API: User created
        API->>DB: UPDATE branches SET it_admin_id
        DB-->>API: Branch updated
        API->>EMAIL: Send credentials email
        API-->>FE: Success

        FE->>ORG: Show IT Admin in list
    end

    FE->>FE: Update dashboard stats
    FE->>ORG: "Setup Complete!" message
```

### 3.3 Branch Creation Rules

```typescript
// Branch code validation
const branchCodeSchema = z.string()
  .min(1, 'Branch code is required')
  .max(10, 'Maximum 10 characters')
  .regex(/^[A-Z0-9]+$/, 'Only uppercase letters and numbers')
  .transform(val => val.toUpperCase());

// Branch form schema
const branchFormSchema = z.object({
  branch_name: z.string().min(1).max(100),
  branch_code: branchCodeSchema,
  address_line1: z.string().min(1),
  address_line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  pin_code: z.string().regex(/^\d{6}$/),
  site_contact_person: z.string().optional(),
  site_contact_phone: z.string().optional(),
  it_admin_id: z.string().nullable().optional(),
});
```

### 3.4 Technical Implementation

| Component | File Path | Purpose |
|-----------|-----------|---------|
| Dashboard | `src/pages/org-admin/Dashboard.tsx` | Overview + empty states |
| Branch Management | `src/pages/org-admin/BranchManagement.tsx` | CRUD branches |
| Bulk Upload | `src/pages/org-admin/BulkBranchUpload.tsx` | CSV upload |
| IT Admin Management | `src/pages/org-admin/ITAdminManagement.tsx` | CRUD IT admins |
| Create Branch | `src/lib/db/mutations.ts` | `createBranch()` |
| Create IT Admin | `src/lib/db/mutations.ts` | `createITAdmin()` |

---

## Stage 4: First Asset Submission

### 4.1 Complete First Asset Journey

```mermaid
sequenceDiagram
    participant ORG as Org Admin
    participant IT as IT Admin
    participant SUB as Sub-User (Employee)
    participant SYS as System

    rect rgb(240, 248, 255)
        Note over ORG,IT: IT Admin Onboarding
        ORG->>SYS: Create IT Admin
        SYS->>IT: Send credentials email
        IT->>SYS: Login to /admin
    end

    rect rgb(255, 250, 240)
        Note over IT,SYS: Asset Creation
        IT->>SYS: Navigate to Assets
        IT->>SYS: Click "Add Asset"
        IT->>SYS: Enter serial, brand, model
        IT->>SYS: Select employee to assign
        IT->>SYS: Create asset
        SYS->>SUB: Send assignment email
    end

    rect rgb(240, 255, 240)
        Note over SUB,SYS: Employee Evaluation
        SUB->>SYS: Click link in email
        SUB->>SYS: Login to /check-in
        SUB->>SYS: Start evaluation
        SUB->>SYS: Upload photos
        SUB->>SYS: Complete functional checklist
        SUB->>SYS: Complete cosmetic checklist
        SUB->>SYS: Submit evaluation
    end

    rect rgb(255, 240, 245)
        Note over SYS: Review & Approval
        SYS->>SYS: Asset enters remote review queue
        SYS->>SYS: Technician reviews & accepts
        IT->>SYS: Create batch with accepted assets
        IT->>SYS: Submit batch for approval
        ORG->>SYS: Review and approve batch
        SYS->>SYS: Pickup request created!
    end
```

### 4.2 First Asset Flowchart

```mermaid
flowchart TD
    A[IT Admin Logs In] --> B[Navigate to Assets]
    B --> C{Has Sub-Users?}

    C -->|No| D[Create Sub-User First]
    D --> E[Enter Employee Details]
    E --> F[Sub-User Created]
    F --> G[Navigate to Assets]

    C -->|Yes| G

    G --> H[Click Add Asset]
    H --> I[Fill Asset Form]
    I --> J[Select Employee to Assign]
    J --> K[Create Asset]
    K --> L[Employee Notified]

    L --> M[Employee Logs In]
    M --> N[Sees Assigned Device]
    N --> O[Starts Evaluation]
    O --> P[Uploads Photos]
    P --> Q[Completes Checklist]
    Q --> R[Submits Evaluation]

    R --> S[Remote Review Queue]
    S --> T{Review Decision}
    T -->|Accept| U[Asset Accepted]
    T -->|Reject| V[Asset Rejected]

    U --> W[IT Admin Creates Batch]
    W --> X[Adds Accepted Assets]
    X --> Y[Submits for Approval]
    Y --> Z[Org Admin Reviews]
    Z --> AA{Approval Decision}
    AA -->|Approve| AB[Pickup Created!]
    AA -->|Reject| AC[Back to IT Admin]

    V --> AD[IT Admin Notified]
    AD --> AE[Can Dispute or Accept]
```

---

## Application Status State Machine

```mermaid
stateDiagram-v2
    [*] --> pending: Application Submitted

    pending --> approved: OPS Approves
    pending --> rejected: OPS Rejects
    pending --> more_info_needed: Request Documents

    more_info_needed --> pending: Documents Uploaded

    approved --> [*]: Enterprise Active
    rejected --> [*]: Application Closed

    note right of approved
        Creates:
        - Enterprise record
        - Org Admin user
        - Enterprise wallet
    end note

    note right of rejected
        Sends rejection email
        with reason
    end note
```

---

## API Endpoints Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `createEnterpriseApplication` | Mutation | None | Submit registration |
| `fetchEnterpriseApplications` | Query | OPS+ | List applications |
| `approveEnterpriseApplication` | Mutation | OPS+ | Approve & create enterprise |
| `rejectEnterpriseApplication` | Mutation | OPS+ | Reject with reason |
| `createBranch` | Mutation | Org Admin | Create branch |
| `createITAdmin` | Mutation | Org Admin | Create IT admin |
| `checkBranchCodeExists` | Query | Org Admin | Validate uniqueness |
| `checkEmailExists` | Query | Public | Registration validation |

---

## Error Handling

### Registration Errors

| Error | Cause | User Message | Resolution |
|-------|-------|--------------|------------|
| Email exists | Duplicate registration | "This email is already registered" | Login or use different email |
| Invalid GST | Format mismatch | "Invalid GST number format" | Correct GST format |
| Upload failed | Network/size | "File upload failed" | Retry upload |
| Submission failed | Server error | "Unable to submit. Please try again." | Retry or contact support |

### Approval Errors

| Error | Cause | Admin Message | Resolution |
|-------|-------|---------------|------------|
| Auth creation failed | Email conflict | "Could not create user account" | Check email availability |
| Transaction failed | DB error | "Approval failed. Please retry." | Retry approval |
| Email send failed | SMTP error | "Approval successful but email failed" | Manually send credentials |
