# User Personas

## Overview

EcoTribe serves 7 distinct user personas across 3 organizational contexts:
- **Platform** (EcoTribe): Super Admin, OPS Admin, Technician
- **Enterprise** (Clients): Org Admin, IT Admin, Sub-User
- **Logistics** (Partners): Logistics Admin, Logistics User

---

## 1. Super Admin

### Profile
| Attribute | Value |
|-----------|-------|
| **Role ID** | `super_admin` |
| **Organization** | EcoTribe (Platform Owner) |
| **Portal URL** | `/super` |
| **Access Level** | 5 (Highest) |

### Goals
- Maintain platform health and uptime
- Onboard new enterprise customers
- Configure platform-wide pricing and policies
- Monitor all operations across the platform
- Manage logistics partner relationships

### Permissions
```typescript
permissions: ['*'] // Full access to everything
```

### Key Actions
| Action | Route | Description |
|--------|-------|-------------|
| View Dashboard | `/super` | Platform-wide metrics and health |
| Manage Enterprises | `/super/enterprises` | CRUD all enterprises |
| Review Applications | `/super/applications` | Approve/reject registrations |
| Manage Admins | `/super/admins` | Create OPS admins, org admins |
| Configure Pricing | `/super/pricing` | Set base prices, grades, multipliers |
| Manage Logistics | `/super/logistics` | Add logistics partners |
| View Analytics | `/super/analytics` | Platform-wide reporting |

### Entry Points
- Direct login at `/login`
- SSO integration (if configured)

### Technical Implementation
```
Portal: src/pages/super/
Layout: src/layouts/SuperLayout.tsx
Auth Check: role === 'super_admin'
```

---

## 2. OPS Admin (Operations Administrator)

### Profile
| Attribute | Value |
|-----------|-------|
| **Role ID** | `main_admin` |
| **Organization** | EcoTribe Operations Team |
| **Portal URLs** | `/ops`, `/tech` |
| **Access Level** | 4 |

### Goals
- Process enterprise registration applications
- Monitor asset flow through the system
- Assign pickups to logistics partners
- Process payouts efficiently
- Handle disputes and escalations

### Permissions
```typescript
permissions: [
  'review_applications',
  'manage_enterprises',
  'assign_pickups',
  'process_payouts',
  'handle_disputes',
  'remote_review',
  'facility_qc'
]
```

### Key Actions
| Action | Route | Description |
|--------|-------|-------------|
| View Dashboard | `/ops` | Operations overview |
| Review Applications | `/ops/applications` | Enterprise registration queue |
| Manage Enterprises | `/ops/enterprises/:id` | View/edit enterprise details |
| Review Assets | `/ops/assets` | Asset pipeline view |
| Remote Review | `/tech/remote-review` | Review submitted evaluations |
| Facility QC | `/tech/facility-qc` | Final quality control |
| Assign Pickups | `/ops/pickups` | Assign to logistics partners |
| Process Payouts | `/ops/payouts` | Financial processing |
| Handle Disputes | `/ops/disputes` | Dispute resolution |

### Entry Points
- Direct login at `/login`
- Email notification links

### Technical Implementation
```
Portal: src/pages/ops/, src/pages/tech/
Layout: src/layouts/OpsLayout.tsx
Auth Check: role === 'main_admin'
```

### Workflow Diagram
```mermaid
flowchart TD
    A[Start Day] --> B{Check Dashboard}
    B --> C[Pending Applications?]
    C -->|Yes| D[Review Applications]
    C -->|No| E[Check Review Queue]

    D --> D1{Decision}
    D1 -->|Approve| D2[Create Enterprise + Org Admin]
    D1 -->|Reject| D3[Send Rejection Email]
    D1 -->|Need Info| D4[Request Documents]

    E --> F[Remote Review Queue]
    F --> G[Review Submissions]
    G --> G1{Accept/Reject}
    G1 -->|Accept| G2[Mark Conditionally Accepted]
    G1 -->|Reject| G3[Mark Rejected + Reason]

    B --> H[Pickup Queue]
    H --> I[Assign to Logistics Admin]

    B --> J[Payout Queue]
    J --> K[Process Payouts]

    B --> L[Disputes]
    L --> M[Resolve Disputes]
```

---

## 3. Org Admin (Enterprise Administrator)

### Profile
| Attribute | Value |
|-----------|-------|
| **Role ID** | `org_admin` |
| **Organization** | Client Enterprise (e.g., TechCorp, Infosys) |
| **Portal URL** | `/org-admin` |
| **Access Level** | 3 |

### Goals
- Manage enterprise branches efficiently
- Onboard and oversee IT Admins
- Approve batch pickup requests
- Track enterprise financials
- Ensure compliance (EPR certificates)

### Permissions
```typescript
permissions: [
  'manage_branches',
  'manage_it_admins',
  'approve_pickups',
  'view_wallet',
  'download_reports',
  'view_epr_certificates'
]
```

### Key Actions
| Action | Route | Description |
|--------|-------|-------------|
| View Dashboard | `/org-admin` | Enterprise overview |
| Manage Branches | `/org-admin/branches` | CRUD branches |
| Bulk Upload Branches | `/org-admin/branches/upload` | CSV/Excel upload |
| Manage IT Admins | `/org-admin/it-admins` | CRUD IT admins |
| Approve Pickups | `/org-admin/approvals` | Review batch submissions |
| View Wallet | `/org-admin/wallet` | Credits, transactions |
| Download Reports | `/org-admin/reports` | Export data |
| EPR Certificates | `/org-admin/epr-certificates` | Compliance docs |

### Entry Points
- Welcome email after enterprise approval
- Direct login at `/login`
- Password reset flow

### Technical Implementation
```
Portal: src/pages/org-admin/
Layout: src/layouts/OrgAdminLayout.tsx
Auth Check: role === 'org_admin' && enterprise_id matches
```

### Workflow Diagram
```mermaid
flowchart TD
    A[Login] --> B[Dashboard]

    subgraph Setup["Initial Setup"]
        C[Create Branches]
        D[Bulk Upload Branches]
        E[Create IT Admins]
        F[Assign IT Admins to Branches]
    end

    subgraph Daily["Daily Operations"]
        G[Review Pending Approvals]
        H{Approve/Reject?}
        I[Approve - Set Prices]
        J[Reject - Add Feedback]
    end

    subgraph Financial["Financial Tracking"]
        K[Check Wallet Balance]
        L[View Transaction History]
        M[Request Withdrawal]
    end

    subgraph Compliance["Compliance"]
        N[Download EPR Certificates]
        O[Generate Reports]
    end

    B --> Setup
    B --> Daily
    B --> Financial
    B --> Compliance

    G --> H
    H -->|Approve| I
    H -->|Reject| J
    I --> P[Pickup Auto-Created]
```

---

## 4. IT Admin (Branch IT Administrator)

### Profile
| Attribute | Value |
|-----------|-------|
| **Role ID** | `it_admin` |
| **Organization** | Assigned to enterprise branch(es) |
| **Portal URL** | `/admin` |
| **Access Level** | 2 |

### Goals
- Efficiently intake and manage assets
- Coordinate with employees for evaluations
- Create batches and initiate pickups
- Track asset status through lifecycle
- Manage sub-users (employees)

### Permissions
```typescript
permissions: [
  'manage_assets',
  'manage_batches',
  'manage_sub_users',
  'initiate_pickups',
  'view_submissions',
  'self_evaluate'
]
```

### Key Actions
| Action | Route | Description |
|--------|-------|-------------|
| View Dashboard | `/admin` | Branch overview |
| List Assets | `/admin/assets` | All assets table |
| Add Asset | `/admin/assets/add` | Single asset form |
| Bulk Upload | `/admin/assets/upload` | CSV/Excel upload |
| Asset Details | `/admin/assets/:id` | View/edit asset |
| List Batches | `/admin/batches` | All batches |
| Create Batch | `/admin/batches/create` | New batch |
| Batch Details | `/admin/batches/:id` | Manage batch assets |
| Pickup Requests | `/admin/pickups` | View pickup status |
| Initiate Pickup | `/admin/pickups/initiate` | Create pickup request |
| Sub-Users | `/admin/sub-users` | Employee management |
| My Evaluations | `/admin/my-evaluations` | Self-assigned assets |

### Entry Points
- Credentials from Org Admin
- Direct login at `/login`

### Technical Implementation
```
Portal: src/pages/admin/
Layout: src/layouts/AdminLayout.tsx
Auth Check: role === 'it_admin'
Data Scoping: Filter by branches where it_admin_id === user.id
```

### Workflow Diagram
```mermaid
flowchart TD
    A[Login] --> B[Dashboard]

    subgraph AssetIntake["Asset Intake"]
        C[Add Single Asset]
        D[Bulk Upload Assets]
        E[Assign to Employee]
        F[Self-Assign for Evaluation]
    end

    subgraph Monitoring["Monitor Progress"]
        G[Track Evaluations]
        H[View Submissions]
        I[Check Review Status]
    end

    subgraph BatchOps["Batch Operations"]
        J[Create Batch]
        K[Add Assets to Batch]
        L[Fill Pickup Details]
        M[Submit for Approval]
    end

    subgraph PickupOps["Pickup Coordination"]
        N[View Pickup Status]
        O[Coordinate with Logistics]
        P[Confirm Pickup Complete]
    end

    B --> AssetIntake
    B --> Monitoring
    B --> BatchOps
    B --> PickupOps

    C --> E
    D --> E
    E --> G
    F --> Q[Complete Self-Evaluation]

    I -->|Approved| J
    J --> K --> L --> M
    M --> N
```

---

## 5. Sub-User (Employee)

### Profile
| Attribute | Value |
|-----------|-------|
| **Role ID** | `sub_user` |
| **Organization** | Employee at client enterprise |
| **Portal URL** | `/check-in` |
| **Access Level** | 0 (Lowest) |

### Goals
- Complete device evaluations quickly
- Submit accurate information
- Track submission status
- Get support when needed

### Permissions
```typescript
permissions: [
  'view_assigned_assets',
  'submit_evaluation',
  'view_submission_status'
]
```

### Key Actions
| Action | Route | Description |
|--------|-------|-------------|
| My Submissions | `/check-in` | List of assigned devices |
| Start Evaluation | `/check-in/submit/:assetId` | Begin evaluation |
| View Status | `/check-in` | Track submission progress |
| Get Help | `/check-in/help` | FAQ and support |

### Entry Points
- Email notification when asset assigned
- Link in assignment email
- Direct login at `/login`

### Technical Implementation
```
Portal: src/pages/check-in/
Layout: src/layouts/CheckInLayout.tsx
Auth Check: role === 'sub_user'
Data Scoping: Only assets where assigned_sub_user_id === user.id
```

### Workflow Diagram
```mermaid
flowchart TD
    A[Receive Assignment Email] --> B[Click Link / Login]
    B --> C[My Submissions Page]
    C --> D[See Assigned Device]
    D --> E[Click Start Evaluation]

    subgraph Evaluation["Evaluation Process"]
        F[Upload Photos]
        G[Front View]
        H[Back View]
        I[Screen]
        J[Keyboard]
        K[All Sides]

        L[Functional Checklist]
        M[Power On?]
        N[Display Works?]
        O[Keyboard Works?]
        P[Touchpad Works?]
        Q[Ports Work?]
        R[Battery Health?]

        S[Cosmetic Assessment]
        T[Screen Scratches]
        U[Body Dents]
        V[Keyboard Wear]
        W[Overall Condition]

        X[Additional Notes]
    end

    E --> F
    F --> G & H & I & J & K
    K --> L
    L --> M & N & O & P & Q & R
    R --> S
    S --> T & U & V & W
    W --> X

    X --> Y[Review Summary]
    Y --> Z[Submit]
    Z --> AA[Confirmation]
    AA --> AB[Track Status on Dashboard]
```

---

## 6. Logistics Admin (Partner Manager)

### Profile
| Attribute | Value |
|-----------|-------|
| **Role ID** | `logistics_admin` |
| **Organization** | Third-party logistics company |
| **Portal URL** | `/logistics-admin` |
| **Access Level** | 2 |

### Goals
- Manage pickup assignments efficiently
- Optimize driver routes and schedules
- Ensure timely pickups
- Maintain driver performance

### Permissions
```typescript
permissions: [
  'view_assigned_pickups',
  'manage_logistics_users',
  'assign_pickups_to_drivers',
  'view_pickup_status'
]
```

### Key Actions
| Action | Route | Description |
|--------|-------|-------------|
| View Dashboard | `/logistics-admin` | Pickup overview |
| Assignment Queue | `/logistics-admin/assignments` | Incoming pickups |
| Manage Users | `/logistics-admin/users` | Driver management |
| Assign to Driver | `/logistics-admin/assignments` | Route assignment |

### Entry Points
- Credentials from EcoTribe OPS/Super
- Direct login at `/login`

### Technical Implementation
```
Portal: src/pages/logistics-admin/
Layout: src/layouts/LogisticsAdminLayout.tsx
Auth Check: Verify in logistics_admins table
Data Scoping: pickup_requests.logistics_admin_id === user.id
```

### Workflow Diagram
```mermaid
flowchart TD
    A[Login] --> B[Dashboard]

    subgraph Incoming["Incoming Assignments"]
        C[View New Pickups]
        D[Check Pickup Details]
        E[Review Asset Count]
        F[Note Location/Date]
    end

    subgraph Assignment["Driver Assignment"]
        G[View Available Drivers]
        H[Check Driver Workload]
        I[Assign Pickup to Driver]
        J[Set Schedule Date/Time]
    end

    subgraph Monitoring["Monitor Progress"]
        K[Track Active Pickups]
        L[View Completion Status]
        M[Handle Exceptions]
    end

    subgraph UserMgmt["Driver Management"]
        N[Add New Driver]
        O[Deactivate Driver]
        P[View Driver Performance]
    end

    B --> Incoming
    B --> Monitoring
    B --> UserMgmt

    C --> D --> E --> F --> G
    G --> H --> I --> J
    J --> K
```

---

## 7. Logistics User (Driver/Field Agent)

### Profile
| Attribute | Value |
|-----------|-------|
| **Role ID** | `logistics_user` |
| **Organization** | Works under Logistics Admin |
| **Portal URL** | `/logistics` |
| **Access Level** | 1 |

### Goals
- Complete assigned pickups on time
- Perform accurate on-site QC
- Document pickup evidence
- Handle exceptions properly

### Permissions
```typescript
permissions: [
  'view_my_pickups',
  'perform_onsite_qc',
  'update_pickup_status',
  'upload_pickup_evidence'
]
```

### Key Actions
| Action | Route | Description |
|--------|-------|-------------|
| My Pickups | `/logistics` | Today's assignments |
| Pickup Details | `/logistics/pickup/:id` | Full pickup info |
| On-site QC | `/logistics/pickup/:id/qc` | Device verification |
| Complete Pickup | `/logistics/pickup/:id` | Mark complete |

### Entry Points
- Credentials from Logistics Admin
- Mobile-optimized login
- Push notifications for new assignments

### Technical Implementation
```
Portal: src/pages/logistics-user/
Layout: src/layouts/LogisticsLayout.tsx
Auth Check: Verify in logistics_users table
Data Scoping: pickup_requests.logistics_user_id === user.id
```

### Workflow Diagram
```mermaid
flowchart TD
    A[Start Day] --> B[Check My Pickups]
    B --> C[View Today's Assignments]

    C --> D[Select First Pickup]
    D --> E[View Details]
    E --> F[Navigate to Location]

    F --> G[Arrive at Site]
    G --> H[Meet Site Contact]

    subgraph QC["On-Site QC Process"]
        I[Collect Devices]
        J[Verify Serial Numbers]
        K[Quick Physical Check]
        L[Take Photos]
        M{All Pass QC?}
    end

    H --> I --> J --> K --> L --> M

    M -->|Yes| N[Mark All Collected]
    M -->|Some Fail| O[Mark Failed Items]
    M -->|Major Issue| P[Escalate to Admin]

    N --> Q[Get Acknowledgment]
    O --> Q
    Q --> R[Complete Pickup]
    R --> S[Move to Next Pickup]
    S --> D

    P --> T[Contact Logistics Admin]
    T --> U{Resolution}
    U -->|Proceed| Q
    U -->|Cancel| V[Mark Pickup Failed]
```

---

## Persona Comparison Matrix

| Aspect | Super Admin | OPS Admin | Org Admin | IT Admin | Sub-User | Logistics Admin | Logistics User |
|--------|-------------|-----------|-----------|----------|----------|-----------------|----------------|
| **Org Type** | Platform | Platform | Enterprise | Enterprise | Enterprise | Partner | Partner |
| **Portal** | `/super` | `/ops` | `/org-admin` | `/admin` | `/check-in` | `/logistics-admin` | `/logistics` |
| **Data Scope** | All | All | Own Enterprise | Own Branches | Own Assets | Own Pickups | Own Pickups |
| **Primary Task** | Configure | Operate | Approve | Manage | Evaluate | Assign | Execute |
| **Decision Level** | Strategic | Tactical | Approval | Operational | Task | Assignment | Field |
| **Tech Savviness** | High | High | Medium-High | Medium | Low-Medium | Medium | Low-Medium |
| **Usage Frequency** | Daily | Continuous | Daily | Daily | Per Device | Daily | Continuous |

---

## Role Hierarchy Access Control

```mermaid
graph TD
    subgraph Access["Data Access Hierarchy"]
        SA[Super Admin] -->|Full Access| ALL[All Data]
        OPS[OPS Admin] -->|Full Access| ALL

        ORG[Org Admin] -->|Enterprise Scope| ENT[Enterprise Data]
        ENT --> BRANCH[All Branches]
        ENT --> ITADMIN[All IT Admins]
        ENT --> ASSETS[All Assets]

        IT[IT Admin] -->|Branch Scope| MYBRANCH[My Branches]
        MYBRANCH --> MYASSETS[Branch Assets]
        MYBRANCH --> MYSUBS[Branch Sub-Users]

        SUB[Sub-User] -->|Self Scope| MINE[My Assigned Assets]

        LA[Logistics Admin] -->|Partner Scope| MYPICKUPS[My Pickups]
        MYPICKUPS --> MYDRIVERS[My Drivers]

        LU[Logistics User] -->|Self Scope| MYROUTE[My Assigned Pickups]
    end
```

---

## Authentication Flow by Persona

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Auth as Supabase Auth
    participant DB as Database
    participant Store as Auth Store

    User->>Frontend: Enter email/password
    Frontend->>Auth: signInWithPassword()
    Auth-->>Frontend: Auth token + user ID

    Frontend->>DB: Query users table
    alt Found in users
        DB-->>Frontend: User profile (super/ops/org/it admin)
    else Not in users
        Frontend->>DB: Query sub_users table
        alt Found
            DB-->>Frontend: Sub-user profile
        else Not in sub_users
            Frontend->>DB: Query logistics_admins
            alt Found
                DB-->>Frontend: Logistics admin profile
            else Not found
                Frontend->>DB: Query logistics_users
                DB-->>Frontend: Logistics user profile
            end
        end
    end

    Frontend->>DB: Fetch enterprise data (if applicable)
    DB-->>Frontend: Enterprise details

    Frontend->>Store: Set user, enterprise, role
    Store-->>Frontend: State updated

    Frontend->>Frontend: Redirect to role portal
```
