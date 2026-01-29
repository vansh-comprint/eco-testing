# Logistics Journeys

## Overview

The logistics system involves two personas:
- **Logistics Admin**: Partner company manager who receives and assigns pickups
- **Logistics User**: Field agent (driver) who performs actual pickups

## System Overview

```mermaid
flowchart LR
    subgraph EcoTribe["EcoTribe Platform"]
        OPS[OPS Admin]
    end

    subgraph LogisticsPartner["Logistics Partner"]
        LA[Logistics Admin]
        LU1[Driver 1]
        LU2[Driver 2]
        LU3[Driver 3]
    end

    subgraph Enterprise["Enterprise"]
        BRANCH[Branch Location]
    end

    OPS -->|Assigns Pickup| LA
    LA -->|Assigns Route| LU1
    LA -->|Assigns Route| LU2
    LU1 -->|Picks Up From| BRANCH
```

---

## Journey 1: Logistics Admin - Receiving Assignments

### 1.1 Assignment Queue Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LOGISTICS ADMIN - ASSIGNMENT QUEUE                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TRIGGER: OPS Admin assigns pickup to this Logistics Admin                  │
│                                                                             │
│  LOGISTICS ADMIN ACTIONS                   SYSTEM RESPONSES                 │
│  ───────────────────────                   ─────────────────                │
│                                                                             │
│  1. Receive notification                   Email + In-app notification      │
│         ↓                                                                   │
│  2. Login to /logistics-admin              Load dashboard                   │
│         ↓                                                                   │
│  3. View dashboard stats:                  Display:                         │
│     • Pending assignments                  • Count of new pickups           │
│     • Assigned to drivers                  • Count scheduled                │
│     • In progress                          • Count active                   │
│     • Completed today                      • Count done                     │
│         ↓                                                                   │
│  4. Navigate to Assignment Queue           Load pending pickups             │
│         ↓                                                                   │
│  5. View pickup details:                                                   │
│     • Enterprise name                                                      │
│     • Branch address                                                       │
│     • Asset count                                                          │
│     • Requested date/time                                                  │
│     • Priority level                                                       │
│         ↓                                                                   │
│  6. Select driver to assign                Show available drivers           │
│         ↓                                                                   │
│  7. Set scheduled date/time                Confirm or modify               │
│         ↓                                                                   │
│  8. Assign pickup                          • Update pickup status          │
│                                            • Notify driver                  │
│                                            • Notify enterprise              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Assignment Sequence Diagram

```mermaid
sequenceDiagram
    participant OPS as OPS Admin
    participant LA as Logistics Admin
    participant FE as Frontend<br/>(AssignmentQueue.tsx)
    participant API as Supabase API
    participant DB as Database
    participant LU as Logistics User

    Note over OPS: OPS Admin assigns pickup
    OPS->>API: assignPickupToLogisticsAdmin(pickupId, laId)
    API->>DB: UPDATE pickup_requests SET logistics_admin_id = ?
    API->>LA: Send notification

    LA->>FE: Login to /logistics-admin
    FE->>API: fetchLogisticsAdminPickups(laId)
    API->>DB: SELECT * FROM pickup_requests WHERE logistics_admin_id = ?
    DB-->>API: Pickups list
    API-->>FE: Display dashboard

    LA->>FE: Navigate to Assignment Queue
    FE->>FE: Filter pickups by status='pending_assignment'

    LA->>FE: Click pickup to view details
    FE->>API: fetchPickupDetails(pickupId)
    API->>DB: SELECT pickup, branch, assets
    DB-->>API: Full pickup data
    API-->>FE: Display detail panel

    LA->>FE: Click "Assign Driver"
    FE->>API: fetchAvailableLogisticsUsers(laId)
    API->>DB: SELECT * FROM logistics_users WHERE logistics_admin_id = ? AND status = 'active'
    DB-->>API: Available drivers
    API-->>FE: Populate driver dropdown

    LA->>FE: Select driver
    LA->>FE: Set scheduled date/time
    LA->>FE: Click "Assign"

    FE->>API: assignPickupToLogisticsUser(pickupId, luId, scheduledDate)
    API->>DB: UPDATE pickup_requests SET logistics_user_id, scheduled_date, status='scheduled'
    API->>LU: Send notification
    DB-->>API: Success
    API-->>FE: Assignment confirmed

    FE->>LA: Show success toast
    FE->>FE: Move pickup to "Assigned" list
```

---

## Journey 2: Logistics Admin - Driver Management

### 2.1 Create Driver Flow

```mermaid
sequenceDiagram
    participant LA as Logistics Admin
    participant FE as Frontend<br/>(UserManagement.tsx)
    participant API as Supabase API
    participant AUTH as Supabase Auth
    participant DB as Database
    participant EMAIL as Email Service

    LA->>FE: Navigate to /logistics-admin/users
    FE->>API: fetchLogisticsUsers(laId)
    API->>DB: SELECT * FROM logistics_users WHERE logistics_admin_id = ?
    DB-->>API: Drivers list
    API-->>FE: Display list

    LA->>FE: Click "Add Driver"
    FE->>FE: Open form modal

    LA->>FE: Enter driver details
    LA->>FE: Enter email + password
    LA->>FE: Click "Create"

    FE->>API: createLogisticsUser(data)

    API->>AUTH: admin.createUser({email, password})
    AUTH-->>API: auth_user_id

    API->>DB: INSERT INTO logistics_users (id, logistics_admin_id, ...)
    DB-->>API: User created

    API->>EMAIL: Send credentials email
    EMAIL-->>API: Sent

    API-->>FE: Success
    FE->>LA: Show confirmation
    FE->>FE: Update list
```

### 2.2 Driver Status Management

| Status | Meaning | Can Be Assigned |
|--------|---------|-----------------|
| `active` | Available for pickups | Yes |
| `inactive` | Temporarily unavailable | No |
| `on_leave` | Extended absence | No |

---

## Journey 3: Logistics User - Daily Pickup Flow

### 3.1 Complete Pickup Journey

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LOGISTICS USER - PICKUP JOURNEY                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MORNING ROUTINE                                                           │
│  ───────────────                                                           │
│  1. Login to /logistics                    Load "My Pickups"               │
│  2. View today's assignments               • Sorted by time slot           │
│  3. Check route order                      • Map view available            │
│                                                                             │
│  FOR EACH PICKUP                                                           │
│  ───────────────                                                           │
│  4. View pickup details:                                                   │
│     • Enterprise & branch name                                             │
│     • Full address                                                         │
│     • Site contact person + phone                                          │
│     • Asset list (serial numbers)                                          │
│     • Special instructions                                                 │
│         ↓                                                                   │
│  5. Navigate to location                   Open in Maps app                │
│         ↓                                                                   │
│  6. Arrive at site                         Click "Start Pickup"            │
│         ↓                                                                   │
│  7. Meet site contact                      Verify identity                 │
│         ↓                                                                   │
│  ON-SITE QC (per asset)                                                    │
│  ────────────────────                                                      │
│  8. Scan/verify serial number              Match with system               │
│         ↓                                                                   │
│  9. Quick physical check:                                                  │
│     • Device matches description?                                          │
│     • Major damage not shown in photos?                                    │
│     • All reported parts present?                                          │
│         ↓                                                                   │
│  10. Decision per asset:                                                   │
│      ┌──────────────┐  ┌──────────────┐                                   │
│      │    ACCEPT    │  │    REJECT    │                                   │
│      │  Collect it  │  │  Leave it    │                                   │
│      └──────────────┘  └──────────────┘                                   │
│         ↓                                                                   │
│  11. Take verification photo               Document collection             │
│         ↓                                                                   │
│  COMPLETE PICKUP                                                           │
│  ───────────────                                                           │
│  12. Get acknowledgment                    Site contact signature          │
│         ↓                                                                   │
│  13. Complete pickup in app                • Update statuses               │
│                                            • Upload photos                 │
│                                            • Record any issues             │
│         ↓                                                                   │
│  14. Move to next pickup                   Dashboard updates               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Pickup Sequence Diagram

```mermaid
sequenceDiagram
    participant LU as Logistics User
    participant FE as Frontend<br/>(Assignments.tsx)
    participant API as Supabase API
    participant DB as Database
    participant STORAGE as Supabase Storage

    LU->>FE: Login to /logistics
    FE->>API: fetchLogisticsUserPickups(luId)
    API->>DB: SELECT pickups with branch, assets
    DB-->>API: Today's pickups
    API-->>FE: Display pickup list

    LU->>FE: Select pickup
    FE->>FE: Show pickup detail

    LU->>FE: Click "Start Pickup"
    FE->>API: updatePickupStatus('in_progress')
    API->>DB: UPDATE pickup_requests SET status = 'in_progress'

    Note over LU: Driver arrives at location

    rect rgb(240, 248, 255)
        Note over LU,DB: On-Site QC Process
        loop For each asset
            LU->>FE: Scan/enter serial number
            FE->>FE: Verify against asset list

            LU->>FE: Perform quick inspection

            alt Asset Passes
                LU->>FE: Mark as "Collected"
                FE->>API: updateAssetStatus(assetId, 'picked_up')
            else Asset Fails
                LU->>FE: Mark as "Failed QC"
                LU->>FE: Enter rejection reason
                FE->>API: updateAssetStatus(assetId, 'pickup_failed_qc')
            end
        end
    end

    LU->>FE: Take verification photos
    FE->>STORAGE: Upload photos
    STORAGE-->>FE: Photo URLs

    LU->>FE: Get acknowledgment (signature/OTP)
    LU->>FE: Click "Complete Pickup"

    FE->>API: completePickup(pickupId, data)
    API->>DB: UPDATE pickup_requests SET status = 'completed'
    API->>DB: INSERT INTO on_site_qc
    DB-->>API: Success
    API-->>FE: Pickup completed

    FE->>LU: Show completion summary
    FE->>FE: Update dashboard
```

### 3.3 On-Site QC Checklist

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ON-SITE QC CHECKLIST                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Asset: Dell Latitude 5520                                                 │
│  Serial: ABC123456                                                         │
│                                                                             │
│  VERIFICATION                                         RESULT               │
│  ────────────────────────────────────────────────────────────              │
│  □ Serial number matches system record               [ ✓ ]                 │
│  □ Device matches brand/model in submission          [ ✓ ]                 │
│  □ Device powers on                                  [ ✓ ]                 │
│  □ No major undisclosed damage                       [ ✓ ]                 │
│  □ All reported accessories present                  [ ✗ ]                 │
│                                                                             │
│  NOTES                                                                     │
│  ─────                                                                     │
│  Missing charger - was listed as included                                  │
│                                                                             │
│  DECISION                                                                  │
│  ────────                                                                  │
│  ○ Accept (collect device)                                                 │
│  ● Accept with note (collect, flag issue)                                  │
│  ○ Reject (leave device)                                                   │
│                                                                             │
│                                        [Cancel]    [Confirm Decision]      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Journey 4: Exception Handling

### 4.1 Common Exceptions

```mermaid
flowchart TD
    A[Exception Occurs] --> B{Type?}

    B -->|Site Inaccessible| C[Contact Site Contact]
    C --> C1{Resolved?}
    C1 -->|Yes| D[Proceed with Pickup]
    C1 -->|No| E[Reschedule Pickup]

    B -->|Device Not Available| F[Document in App]
    F --> G[Mark Asset as "Not Available"]
    G --> H[Complete Partial Pickup]

    B -->|Major Discrepancy| I[Take Photos]
    I --> J[Contact Logistics Admin]
    J --> K{Decision}
    K -->|Accept| D
    K -->|Reject| L[Mark Failed QC]
    K -->|Escalate| M[Contact OPS Admin]

    B -->|Site Contact Absent| N[Wait/Call]
    N --> N1{Available in 30min?}
    N1 -->|Yes| O[Wait]
    O --> D
    N1 -->|No| E
```

### 4.2 Exception Handling Actions

| Exception | Driver Action | System Update |
|-----------|---------------|---------------|
| Site locked | Call contact, wait 30min, then reschedule | Add note to pickup |
| Device missing | Mark specific asset as "not available" | Asset status unchanged |
| Wrong device | Take photos, reject | Asset marked "pickup_failed_qc" |
| Severe damage | Document, contact admin for decision | Wait for instruction |
| Contact absent | Attempt contact, reschedule if no response | Update scheduled date |

---

## Journey 5: Pickup Status Flow

### 5.1 Status State Machine

```mermaid
stateDiagram-v2
    [*] --> pending_assignment: Pickup Created

    pending_assignment --> assigned: LA Assigns to Driver

    assigned --> scheduled: Driver Confirms Schedule

    scheduled --> in_progress: Driver Starts Pickup

    in_progress --> completed: All Assets Collected
    in_progress --> partially_completed: Some Assets Collected

    partially_completed --> completed: Remaining Rescheduled

    completed --> [*]

    note right of pending_assignment
        Waiting for
        Logistics Admin
    end note

    note right of in_progress
        Driver at site
        performing QC
    end note
```

### 5.2 Asset Status During Pickup

| Before Pickup | After Successful QC | After Failed QC |
|---------------|---------------------|-----------------|
| `pickup_scheduled` | `picked_up` | `pickup_failed_qc` |

---

## Technical Implementation

### Logistics Admin Components

| Component | File Path | Purpose |
|-----------|-----------|---------|
| Dashboard | `src/pages/logistics-admin/Dashboard.tsx` | Overview stats |
| Assignment Queue | `src/pages/logistics-admin/AssignmentQueue.tsx` | Pending pickups |
| User Management | `src/pages/logistics-admin/UserManagement.tsx` | Driver CRUD |

### Logistics User Components

| Component | File Path | Purpose |
|-----------|-----------|---------|
| My Pickups | `src/pages/logistics-user/Assignments.tsx` | Today's routes |
| Pickup Detail | `src/pages/logistics-user/PickupDetail.tsx` | Single pickup |
| On-Site QC | `src/pages/logistics-user/OnSiteQC.tsx` | QC checklist |

### API Endpoints

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `fetchLogisticsAdminPickups(laId)` | LA | Get assigned pickups |
| `fetchAvailableLogisticsUsers(laId)` | LA | Get active drivers |
| `assignPickupToLogisticsUser(pickupId, luId)` | LA | Assign to driver |
| `fetchLogisticsUserPickups(luId)` | LU | Get my pickups |
| `updatePickupStatus(pickupId, status)` | LU | Update progress |
| `completePickup(pickupId, data)` | LU | Finish pickup |
| `createLogisticsUser(data)` | LA | Add driver |

### Database Tables

```sql
-- logistics_admins
CREATE TABLE logistics_admins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  company_name TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- logistics_users
CREATE TABLE logistics_users (
  id TEXT PRIMARY KEY,
  logistics_admin_id TEXT REFERENCES logistics_admins(id),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  vehicle_number TEXT,
  vehicle_type TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- on_site_qc (pickup evidence)
CREATE TABLE on_site_qc (
  id TEXT PRIMARY KEY,
  pickup_request_id TEXT REFERENCES pickup_requests(id),
  logistics_user_id TEXT REFERENCES logistics_users(id),
  asset_id TEXT REFERENCES assets(id),
  qc_passed BOOLEAN,
  rejection_reason TEXT,
  photos TEXT[], -- Array of URLs
  notes TEXT,
  collected_at TIMESTAMP
);
```

---

## Mobile Considerations

The Logistics User portal is designed mobile-first for field use.

### Key Features

| Feature | Implementation |
|---------|----------------|
| Offline Support | Cache today's pickups locally |
| GPS Navigation | Deep link to Google Maps/Waze |
| Camera Integration | Native camera for photos |
| Barcode Scanner | Scan serial numbers |
| Push Notifications | New assignment alerts |
| Signature Capture | Touch signature pad |
