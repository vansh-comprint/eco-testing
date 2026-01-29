# OPS Admin & Technician Journeys

## Overview

OPS Admin handles platform operations through two portals:
- `/ops` - Operations management (applications, pickups, payouts)
- `/tech` - Technical review (remote review, facility QC)

```mermaid
flowchart LR
    subgraph OPS["OPS Admin Responsibilities"]
        A[Enterprise Applications]
        B[Pickup Assignment]
        C[Payout Processing]
        D[Dispute Resolution]
    end

    subgraph TECH["Technician Responsibilities"]
        E[Remote Review]
        F[Facility QC]
        G[Grading]
    end

    OPS --> TECH
```

---

## Journey 1: Enterprise Application Review

### 1.1 Application Review Flow

```mermaid
sequenceDiagram
    participant PROSPECT as Prospect
    participant OPS as OPS Admin
    participant FE as Frontend<br/>(EnterpriseApplications.tsx)
    participant API as Supabase API
    participant DB as Database
    participant AUTH as Supabase Auth
    participant EMAIL as Email Service

    PROSPECT->>API: Submit application
    API->>DB: INSERT INTO enterprise_applications
    API->>EMAIL: Notify OPS admins
    EMAIL->>OPS: "New application pending"

    OPS->>FE: Navigate to /ops/applications
    FE->>API: fetchEnterpriseApplications('pending')
    API->>DB: SELECT * FROM enterprise_applications WHERE status = 'pending'
    DB-->>API: Applications list
    API-->>FE: Display queue

    OPS->>FE: Click application row
    FE->>FE: Open detail modal
    OPS->>FE: Review company info
    OPS->>FE: Review documents

    alt Approve
        OPS->>FE: Click "Approve"
        FE->>FE: Show confirmation

        FE->>API: approveEnterpriseApplication(id)
        API->>DB: BEGIN TRANSACTION

        API->>DB: INSERT INTO enterprises
        API->>AUTH: admin.createUser(orgAdminEmail)
        API->>DB: INSERT INTO users (role='org_admin')
        API->>DB: INSERT INTO enterprise_wallets
        API->>DB: UPDATE enterprise_applications SET status='approved'

        API->>DB: COMMIT
        API->>EMAIL: Send welcome email
        EMAIL->>PROSPECT: Credentials + welcome

    else Reject
        OPS->>FE: Click "Reject"
        FE->>FE: Open reason modal
        OPS->>FE: Enter rejection reason
        FE->>API: rejectEnterpriseApplication(id, reason)
        API->>DB: UPDATE SET status='rejected'
        API->>EMAIL: Send rejection email

    else Request Info
        OPS->>FE: Click "Request More Info"
        FE->>API: requestMoreInfo(id, details)
        API->>DB: UPDATE SET status='more_info_needed'
        API->>EMAIL: Send request email
    end
```

### 1.2 Application Status Flow

```mermaid
stateDiagram-v2
    [*] --> pending: Application Submitted

    pending --> approved: OPS Approves
    pending --> rejected: OPS Rejects
    pending --> more_info_needed: Need Documents

    more_info_needed --> pending: Documents Provided

    approved --> [*]: Enterprise Active
    rejected --> [*]: Closed
```

---

## Journey 2: Remote Review (Technician)

### 2.1 Complete Review Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         REMOTE REVIEW WORKFLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TRIGGER: Sub-user submits device evaluation                                │
│                                                                             │
│  TECHNICIAN ACTIONS                        SYSTEM RESPONSES                 │
│  ──────────────────                        ─────────────────                │
│                                                                             │
│  1. Login to /tech                         Load technician dashboard        │
│         ↓                                                                   │
│  2. Navigate to Remote Review              Load review queue                │
│         ↓                                                                   │
│  3. View queue stats:                      Display:                         │
│     • Total pending                        • Count by enterprise            │
│     • Priority items                       • Oldest submissions             │
│         ↓                                                                   │
│  4. Select submission to review            Open review panel                │
│         ↓                                                                   │
│  5. Examine device photos:                 Full-screen viewer               │
│     • Front view                           • Zoom capability                │
│     • Back view                            • Compare angles                 │
│     • Screen                                                               │
│     • Keyboard                                                             │
│     • All sides                                                            │
│         ↓                                                                   │
│  6. Review functional checklist            Compare with photos              │
│     • Power, display, keyboard             • Look for discrepancies         │
│     • Touchpad, ports, audio                                               │
│         ↓                                                                   │
│  7. Review cosmetic ratings                Verify against photos            │
│     • Screen condition                                                     │
│     • Body condition                                                       │
│     • Keyboard wear                                                        │
│         ↓                                                                   │
│  8. Make assessment decision:                                              │
│                                                                             │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │                         ACCEPT                                   │    │
│     │  • Evaluation appears accurate                                   │    │
│     │  • Photos match description                                      │    │
│     │  • Device eligible for program                                   │    │
│     │  → Status: "conditionally_accepted"                              │    │
│     │  → Asset ready for pickup batch                                  │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │                         REJECT                                   │    │
│     │  • Photos unclear or wrong device                                │    │
│     │  • Functional issues not disclosed                               │    │
│     │  • Device not eligible (too old/damaged)                         │    │
│     │  → Enter rejection reason                                        │    │
│     │  → Status: "remote_rejected"                                     │    │
│     │  → IT Admin notified                                             │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  9. Move to next submission                Update dashboard stats          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Review Sequence Diagram

```mermaid
sequenceDiagram
    participant SUB as Sub-User
    participant TECH as Technician
    participant FE as Frontend<br/>(RemoteReview.tsx)
    participant API as Supabase API
    participant DB as Database
    participant IT as IT Admin

    SUB->>API: Submit evaluation
    API->>DB: INSERT INTO submissions
    API->>DB: UPDATE assets SET status = 'submitted'

    TECH->>FE: Navigate to /tech/remote-review
    FE->>API: fetchRemoteReviewQueue()
    API->>DB: SELECT assets WHERE status = 'submitted'
    DB-->>API: Pending reviews
    API-->>FE: Display queue

    TECH->>FE: Click submission
    FE->>API: fetchAssetWithSubmission(assetId)
    API->>DB: SELECT asset, submission, photos
    DB-->>API: Full data
    API-->>FE: Display review panel

    TECH->>FE: Review photos (zoom, compare)
    TECH->>FE: Review functional checklist
    TECH->>FE: Review cosmetic ratings

    alt Accept
        TECH->>FE: Click "Accept"
        FE->>API: createRemoteReview(assetId, 'accepted')
        API->>DB: INSERT INTO remote_reviews (status='accepted')
        API->>DB: UPDATE assets SET status = 'conditionally_accepted'
        API-->>FE: Success

    else Reject
        TECH->>FE: Click "Reject"
        FE->>FE: Open reason modal
        TECH->>FE: Select/enter reason
        FE->>API: createRemoteReview(assetId, 'rejected', reason)
        API->>DB: INSERT INTO remote_reviews (status='rejected')
        API->>DB: UPDATE assets SET status = 'remote_rejected'
        API->>IT: Notify IT Admin
        API-->>FE: Success
    end

    FE->>TECH: Show next submission
```

### 2.3 Review Panel UI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  REMOTE REVIEW                                              [Queue: 45]     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Dell Latitude 5520 • SN: ABC123456                                        │
│  Enterprise: TechCorp • Submitted: Dec 5, 2025 at 2:30 PM                  │
│                                                                             │
├──────────────────────────────────┬──────────────────────────────────────────┤
│                                  │                                          │
│  PHOTOS                          │  EVALUATION DETAILS                      │
│  ┌────────────────────────────┐  │                                          │
│  │                            │  │  FUNCTIONAL CHECKLIST                    │
│  │      [Selected Photo]      │  │  ───────────────────                    │
│  │        (Zoomable)          │  │  ✓ Powers on                            │
│  │                            │  │  ✓ Display works                        │
│  └────────────────────────────┘  │  ✓ Keyboard functional                  │
│                                  │  ✓ Touchpad works                       │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐  │  ⚠ USB ports: Partial                   │
│  │F │ │B │ │S │ │K │ │L │ │R │  │  ✓ Audio works                          │
│  └──┘ └──┘ └──┘ └──┘ └──┘ └──┘  │  ✓ Webcam works                         │
│  Front Back Scrn Keyb Left Rght │  ⚠ Battery: Fair                         │
│                                  │                                          │
│                                  │  COSMETIC ASSESSMENT                     │
│                                  │  ────────────────────                   │
│                                  │  Screen scratches: Minor                 │
│                                  │  Body scratches: None                    │
│                                  │  Body dents: None                        │
│                                  │  Keyboard wear: Minor                    │
│                                  │                                          │
│                                  │  NOTES FROM EMPLOYEE                     │
│                                  │  ────────────────────                   │
│                                  │  "One USB-C port loose. Battery lasts   │
│                                  │   about 4 hours. Charger included."     │
│                                  │                                          │
├──────────────────────────────────┴──────────────────────────────────────────┤
│                                                                             │
│  TECHNICIAN NOTES                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                                    [ ✗ Reject ]       [ ✓ Accept ]          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.4 Common Rejection Reasons

| Reason | Description |
|--------|-------------|
| `unclear_photos` | Photos are blurry or don't show device clearly |
| `wrong_device` | Photos appear to be of different device |
| `undisclosed_damage` | Visible damage not mentioned in checklist |
| `device_ineligible` | Device too old or not in supported list |
| `inconsistent_info` | Checklist doesn't match visible condition |
| `missing_photos` | Required photo angles missing |

---

## Journey 3: Facility QC (Grading)

### 3.1 Facility QC Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FACILITY QC WORKFLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TRIGGER: Device arrives at EcoTribe facility (status = 'in_transit')       │
│                                                                             │
│  TECHNICIAN ACTIONS                        SYSTEM RESPONSES                 │
│  ──────────────────                        ─────────────────                │
│                                                                             │
│  1. Receive shipment                       Mark devices as "facility_qc"    │
│         ↓                                                                   │
│  2. Navigate to /tech/facility-qc          Load QC queue                    │
│         ↓                                                                   │
│  3. Select device for QC                   Show device details              │
│         ↓                                                                   │
│  4. Scan serial number                     Verify against system            │
│         ↓                                                                   │
│  5. Comprehensive testing:                                                 │
│     ┌──────────────────────────────────────────────────────────────────┐   │
│     │  FUNCTIONAL TESTS                                                │   │
│     │  • Boot to OS                        ✓ Pass / ✗ Fail             │   │
│     │  • Display test pattern              ✓ Pass / ✗ Fail             │   │
│     │  • Keyboard all keys                 ✓ Pass / ✗ Fail             │   │
│     │  • Touchpad/mouse                    ✓ Pass / ✗ Fail             │   │
│     │  • All USB ports                     ✓ Pass / ✗ Fail             │   │
│     │  • Audio output/input                ✓ Pass / ✗ Fail             │   │
│     │  • Webcam/microphone                 ✓ Pass / ✗ Fail             │   │
│     │  • WiFi connectivity                 ✓ Pass / ✗ Fail             │   │
│     │  • Bluetooth pairing                 ✓ Pass / ✗ Fail             │   │
│     │  • Battery health check              ___% capacity               │   │
│     │  • Data wiped verification           ✓ Confirmed                 │   │
│     └──────────────────────────────────────────────────────────────────┘   │
│         ↓                                                                   │
│  6. Cosmetic inspection:                                                   │
│     • Detailed examination under light                                     │
│     • Document all blemishes                                               │
│     • Photograph any new discoveries                                       │
│         ↓                                                                   │
│  7. Decision:                                                              │
│                                                                             │
│     ┌──────────────────────────────────────────────────────────────────┐   │
│     │  FINAL ACCEPT                                                    │   │
│     │  • All tests pass (or acceptable failures)                       │   │
│     │  • Assign grade: A, B, C, or D                                   │   │
│     │  → Status: "final_accepted"                                      │   │
│     │  → Proceeds to payout calculation                                │   │
│     └──────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│     ┌──────────────────────────────────────────────────────────────────┐   │
│     │  FINAL REJECT                                                    │   │
│     │  • Critical functional failure                                   │   │
│     │  • Major undisclosed damage                                      │   │
│     │  • Device ineligible after inspection                            │   │
│     │  → Enter detailed reason                                         │   │
│     │  → Status: "final_rejected"                                      │   │
│     │  → Can be disputed                                               │   │
│     └──────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Grading System

```mermaid
flowchart TD
    A[Device Passes QC] --> B{Grading Assessment}

    B --> C{Functional Score}
    C -->|100%| D[Full Marks]
    C -->|90-99%| E[Minor Issues]
    C -->|80-89%| F[Some Issues]
    C -->|<80%| G[Major Issues]

    B --> H{Cosmetic Score}
    H -->|Like New| I[Excellent]
    H -->|Light Wear| J[Good]
    H -->|Visible Wear| K[Fair]
    H -->|Heavy Wear| L[Poor]

    D & I --> M[Grade A]
    D & J --> N[Grade B]
    E & I --> N
    E & J --> N
    E & K --> O[Grade C]
    F & J --> O
    F & K --> O
    G --> P[Grade D]
    L --> P

    M --> Q[Premium Value]
    N --> R[Standard Value]
    O --> S[Reduced Value]
    P --> T[Parts Value Only]
```

### 3.3 Grade Definitions

| Grade | Functional | Cosmetic | Value Impact |
|-------|------------|----------|--------------|
| **A** | 100% working | Like new | 100% base price |
| **B** | Minor issues | Light wear | 80% base price |
| **C** | Some issues | Visible wear | 60% base price |
| **D** | Major issues | Heavy wear | 30% (parts only) |

---

## Journey 4: Pickup Assignment (OPS)

### 4.1 Assignment Flow

```mermaid
sequenceDiagram
    participant ORG as Org Admin
    participant OPS as OPS Admin
    participant FE as Frontend<br/>(PickupQueue.tsx)
    participant API as Supabase API
    participant DB as Database
    participant LA as Logistics Admin

    Note over ORG: Org Admin approves batch
    ORG->>API: approveBatch()
    API->>DB: INSERT INTO pickup_requests

    OPS->>FE: Navigate to /ops/pickups
    FE->>API: fetchPendingPickups()
    API->>DB: SELECT * FROM pickup_requests WHERE status = 'pending_assignment'
    DB-->>API: Pending pickups
    API-->>FE: Display queue

    OPS->>FE: Select pickup
    FE->>FE: Show pickup details

    OPS->>FE: Click "Assign"
    FE->>API: fetchLogisticsAdmins()
    API->>DB: SELECT * FROM logistics_admins WHERE status = 'active'
    DB-->>API: Available partners
    API-->>FE: Populate dropdown

    OPS->>FE: Select logistics partner
    OPS->>FE: Add notes (optional)
    OPS->>FE: Confirm assignment

    FE->>API: assignPickupToLogisticsAdmin(pickupId, laId)
    API->>DB: UPDATE pickup_requests SET logistics_admin_id, status='assigned'
    API->>LA: Send notification
    API-->>FE: Success

    FE->>OPS: Show confirmation
```

---

## Journey 5: Payout Processing

### 5.1 Payout Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PAYOUT PROCESSING                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TRIGGER: Device completes facility QC with "final_accepted" status         │
│                                                                             │
│  SYSTEM CALCULATION                        OPS ACTIONS                      │
│  ──────────────────                        ───────────                      │
│                                                                             │
│  1. Calculate final value:                 Review calculation               │
│     Base Price × Grade Multiplier          • Verify pricing                 │
│     - Any deductions                       • Check for errors               │
│         ↓                                                                   │
│  2. Generate payout record                 Review payout batch              │
│         ↓                                                                   │
│  3. OPS Admin reviews                      Approve or hold                  │
│         ↓                                                                   │
│  4. Process payout:                        Confirm processing               │
│     • Credit enterprise wallet                                             │
│     • Create transaction record                                            │
│     • Update asset status                                                  │
│         ↓                                                                   │
│  5. Notify enterprise                      Track in reports                 │
│     • Org Admin gets notification                                          │
│     • Transaction visible in wallet                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Payout Calculation

```typescript
interface PayoutCalculation {
  asset_id: string;
  base_price: number;         // Set during approval
  grade: 'A' | 'B' | 'C' | 'D';
  grade_multiplier: number;   // A=1.0, B=0.8, C=0.6, D=0.3
  deductions: {
    reason: string;
    amount: number;
  }[];
  final_value: number;        // base_price * grade_multiplier - deductions
}

// Example calculation
const calculation = {
  asset_id: 'asset-123',
  base_price: 15000,
  grade: 'B',
  grade_multiplier: 0.8,
  deductions: [
    { reason: 'Missing charger', amount: 500 }
  ],
  final_value: 15000 * 0.8 - 500  // = 11,500
};
```

---

## Journey 6: Dispute Resolution

### 6.1 Dispute Flow

```mermaid
stateDiagram-v2
    [*] --> open: Dispute Raised

    open --> under_review: OPS Takes Case

    under_review --> resolved_accepted: Rule in Favor
    under_review --> resolved_rejected: Uphold Rejection
    under_review --> escalated: Needs Management

    escalated --> resolved_accepted: Management Decision
    escalated --> resolved_rejected: Management Decision

    resolved_accepted --> [*]: Asset Proceeds
    resolved_rejected --> [*]: Asset Remains Rejected
```

### 6.2 Dispute Types

| Type | Trigger | Disputed By |
|------|---------|-------------|
| Remote Review Rejection | Asset rejected during remote review | IT Admin |
| Pickup QC Failure | Asset failed on-site QC | IT Admin |
| Facility QC Rejection | Asset failed final QC | IT Admin |
| Grading Dispute | Disagree with assigned grade | Org Admin |
| Payout Amount | Disagree with calculated value | Org Admin |

---

## Technical Implementation

### OPS Portal Components

| Component | File Path | Purpose |
|-----------|-----------|---------|
| Dashboard | `src/pages/ops/Dashboard.tsx` | Overview metrics |
| Applications | `src/pages/ops/EnterpriseApplications.tsx` | Review registrations |
| Enterprises | `src/pages/ops/Enterprises.tsx` | Manage enterprises |
| Pickup Queue | `src/pages/ops/PickupQueue.tsx` | Assign pickups |
| Payouts | `src/pages/ops/PayoutProcessing.tsx` | Process payouts |
| Disputes | `src/pages/ops/DisputeQueue.tsx` | Handle disputes |
| Logistics | `src/pages/ops/OpsLogistics.tsx` | Manage partners |

### Tech Portal Components

| Component | File Path | Purpose |
|-----------|-----------|---------|
| Dashboard | `src/pages/tech/Dashboard.tsx` | Review metrics |
| Remote Review | `src/pages/tech/RemoteReview.tsx` | Photo/checklist review |
| Facility QC | `src/pages/tech/FacilityQC.tsx` | Hands-on testing |

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `fetchEnterpriseApplications(status)` | Get applications |
| `approveEnterpriseApplication(id)` | Approve registration |
| `rejectEnterpriseApplication(id, reason)` | Reject registration |
| `fetchRemoteReviewQueue()` | Get pending reviews |
| `createRemoteReview(assetId, decision)` | Submit review |
| `fetchFacilityQCQueue()` | Get devices at facility |
| `completeFacilityQC(assetId, data)` | Complete QC |
| `fetchPendingPickups()` | Get unassigned pickups |
| `assignPickupToLogisticsAdmin(id, laId)` | Assign pickup |
| `fetchPayoutQueue()` | Get pending payouts |
| `processPayouts(assetIds)` | Process batch payouts |
