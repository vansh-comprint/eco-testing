# PRD: Ecotribe B2B Refurbished Asset Pick-Up Platform

## Version 3.0 - Major Revision

# CONTENTS

- [Abstract](#-abstract)
- [Business Objectives](#-business-objectives)
- [KPI](#-kpi)
- [Success Criteria](#-success-criteria)
- [Platform Roles & Hierarchy](#-platform-roles--hierarchy)
- [User Personas](#-user-personas)
- [User Journeys](#-user-journeys)
- [Core Platform Flow](#-core-platform-flow)
- [Scenarios](#-scenarios)
- [Functional Requirements by Role](#-functional-requirements-by-role)
- [Asset Intake Specification](#-asset-intake-specification)
- [End-User Evaluation Specification](#-end-user-evaluation-specification)
- [Internal Agent Specification](#-internal-agent-specification)
- [Logistics Specification](#-logistics-specification)
- [Warehouse QC Specification](#-warehouse-qc-specification)
- [Credits & Wallet Specification](#-credits--wallet-specification)
- [Notification Specification](#-notification-specification)
- [Data Model Specification](#-data-model-specification)
- [Access & Permissions Specification](#-access--permissions-specification)
- [Audit & Compliance Specification](#-audit--compliance-specification)
- [EPR Certificate Specification](#-epr-certificate-specification)
- [Authentication Specification](#-authentication-specification)
- [Non-Functional Requirements](#-non-functional-requirements)
- [Edge Cases & Exceptions](#-edge-cases--exceptions)
- [Future Roadmap](#-future-roadmap)

---

## 📝 Abstract

Ecotribe provides a B2B platform enabling enterprises to trade in used IT assets (laptops, desktops, etc.) for credits that can be redeemed for cash or products. The platform orchestrates a complete chain-of-custody workflow with multiple stakeholders working in coordination.

**Core Value Proposition:**
1. Enterprises upload asset data and assign employees for self-evaluation
2. A programmatic Internal Agent runs diagnostics on devices
3. Logistics partners pick up working devices after basic on-site verification
4. Ecotribe warehouse performs detailed QC and releases credits
5. Enterprise CFO manages credit wallet and redemptions
6. EPR certificates issued for compliance

**Platform Owner:** Ecotribe (not ASUS — ASUS is a product redemption partner only)

---

## 🎯 Business Objectives

- Automate asset intake → evaluation → pickup → QC → credits release
- Reduce dependency on manual inspection through programmatic agent diagnostics
- Create tamper-proof audit trail with photos, agent reports, and QC records
- Enable partial batch pickups for operational flexibility
- Provide credit-based rewards with bonus incentives for product redemption
- Support enterprise ESG reporting with EPR certificates

---

## 📊 KPI

| GOAL | METRIC | TARGET |
|------|--------|--------|
| Evaluation Completion | % of Sub-Users completing evaluation | >90% within 72hrs |
| Agent Adoption | % of users successfully running internal agent | >80% |
| Pickup Success | % of scheduled pickups completed | >95% |
| On-Site QC Pass | % passing Logistics User basic QC | >90% |
| Warehouse QC Pass | % passing detailed warehouse QC | >85% |
| Credit Accuracy | Deviation between estimated and final credits | <10% |
| Credit Redemption | % of credits redeemed within 90 days | >70% |
| SLA Adherence | % completed within 10 days (eval to credits) | >85% |

---

## 🏆 Success Criteria

**Launch Success (First 8-12 weeks):**
- 15+ enterprises onboarded
- 1000+ assets processed end-to-end
- 90% evaluation completion rate
- <5% pickup failures
- Credit system fully operational

**Platform Success (6 months):**
- 50+ enterprises active
- 5000+ assets processed monthly
- Positive unit economics
- Enterprise referral program active

---

## 👥 Platform Roles & Hierarchy

### Role Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                         ECOTRIBE                                 │
│                     (Platform Owner)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│    ENTERPRISE SIDE          ECOTRIBE OPS         LOGISTICS       │
│    ──────────────          ───────────          ──────────       │
│                                                                  │
│    ┌──────────┐            ┌───────────┐       ┌──────────────┐ │
│    │ IT Admin │◄─────────►│OPS Manager│◄─────►│Logistics Admin│ │
│    └────┬─────┘            └─────┬─────┘       └───────┬──────┘ │
│         │                        │                     │         │
│    ┌────┴─────┐                  │              ┌──────┴──────┐  │
│    │   CFO    │                  │              │Logistics User│ │
│    └────┬─────┘                  │              └─────────────┘  │
│         │                        │                               │
│    ┌────┴─────┐            ┌─────┴─────┐                        │
│    │ Sub-User │            │ Warehouse │                        │
│    │(Employee)│            │  QC Team  │                        │
│    └──────────┘            └───────────┘                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Communication Flow

- **IT Admin ↔ OPS Manager ↔ Logistics Admin**: Same level, always in loop
- **IT Admin → Sub-Users**: Assigns assets, tracks completion
- **OPS Manager → Warehouse QC**: Manages QC process, decides credit adjustments
- **Logistics Admin → Logistics Users**: Assigns pickups, supervises field operations
- **CFO**: Manages credits wallet, redemptions, EPR certificates (separate from operations)

---

## 👤 User Personas

### IT Admin (Enterprise)
- Uploads bulk asset data
- Assigns Sub-Users to assets
- Tracks evaluation and pickup status
- Coordinates with OPS Manager and Logistics Admin
- **NO access to**: Credits, payments, EPR certificates

### CFO (Enterprise Finance)
- Manages enterprise credit wallet
- Views credit balance and transaction history
- Initiates withdrawals and product redemptions
- Downloads EPR certificates
- Views financial reports
- **NO access to**: Asset operations, logistics coordination

### Sub-User (Enterprise Employee)
- Receives evaluation link
- Downloads and runs Internal Agent
- Completes photo upload and manual checks
- Provides digital declaration
- Coordinates pickup with Logistics User
- Tracks personal asset status

### OPS Manager (Ecotribe)
- Reviews Internal Agent reports
- Monitors all enterprise assets
- Oversees warehouse QC process
- **Decides credit adjustments for QC failures**
- Releases credits to enterprise wallets
- Coordinates with IT Admins and Logistics Admins

### Logistics Admin (Logistics Partner)
- Manages logistics company operations
- Assigns Logistics Users to pickups
- Monitors pickup performance
- Handles exceptions and escalations
- Views all assigned pickups

### Logistics User (Field Personnel)
- Receives pickup assignments
- Performs on-site basic QC:
  - Serial number verification
  - Visible damage check (matches report)
  - Device powers on
- Picks up all working devices
- Uploads proof of pickup
- Delivers to Ecotribe warehouse

### Warehouse QC Team (Ecotribe)
- Receives devices from Logistics Users
- Performs detailed QC inspection
- Grades devices (A/B/C/D/Fail)
- Reports findings to OPS Manager
- Flags discrepancies

---

## 🚶‍♀️ User Journeys

### Journey 1: IT Admin — Managing Asset Trade-In

Priya is an IT Admin at a 200-person company refreshing 50 laptops.

1. Priya logs into Ecotribe portal
2. Downloads Excel template, fills 50 asset details with employee emails
3. Uploads Excel file, system validates (48 valid, 2 errors)
4. Fixes errors, re-uploads, all 50 cases created
5. Employees receive evaluation links via email + WhatsApp
6. Priya monitors dashboard: 40 completed, 8 pending, 2 stalled
7. She nudges stalled employees or reassigns
8. OPS Manager reviews agent reports, marks assets as "Ready for Pickup"
9. Priya sees 40 assets ready for pickup
10. **Priya selects 30 Bangalore assets, clicks "Initiate Pickup"**
11. **Logistics Admin receives request, assigns Logistics User**
12. **Priya monitors: Sees pickup scheduled for tomorrow 2-4 PM**
13. **Priya tracks: 28 picked up, 2 failed on-site QC (won't power on)**
14. Devices delivered to warehouse
15. **Priya sees: "Warehouse QC in Progress"**
16. QC complete, Priya sees status: "Credits Released"
17. **Priya initiates pickup for remaining 10 Mumbai assets**
18. Process repeats
19. Priya's work is done — CFO handles credits and EPR

### Journey 2: Sub-User — Completing Evaluation

Rahul is a marketing executive with an assigned laptop for trade-in.

1. Receives WhatsApp + email with evaluation link
2. Clicks link, enters OTP
3. Confirms device: "Yes, this is my laptop" (serial shown)
4. Downloads Internal Agent application
5. Runs agent — it scans hardware, serial, diagnostics
6. Agent uploads report automatically
7. Rahul continues with manual steps:
   - Uploads 10 photos (guided capture)
   - Answers functional checklist
   - Confirms GPS location (current device location)
   - Signs digital declaration
8. Submits evaluation
9. Gets confirmation: "Evaluation complete. You will be notified when pickup is scheduled."
10. **[IT Admin initiates pickup for company facility]**
11. Rahul receives notification: "Please bring your laptop to IT Office, Floor 3, tomorrow by 2 PM"
12. Rahul brings device to designated location
13. Logistics User at facility does quick check:
    - "Serial number?" ✓
    - "I see the dent you mentioned on the lid" ✓
    - "Let me check if it powers on..." ✓
14. Logistics User: "All good, I'll take this now"
15. Logistics User takes photo of device + Rahul's ID
16. Rahul gets confirmation: "Device handed over successfully"
17. Done — Rahul has no visibility into credits/payments

### Journey 3: OPS Manager — Overseeing Operations

Amit is an Ecotribe OPS Manager.

1. Morning: Reviews dashboard
   - 150 new evaluations completed overnight
   - 12 agent reports flagged for review
   - 45 devices pending warehouse QC
2. Reviews flagged agent reports — 3 show hardware issues
3. Marks 3 as "Needs attention during pickup"
4. Approves remaining 147 for logistics scheduling
5. Checks warehouse QC queue:
   - 40 devices passed, full credits
   - 5 devices have issues not reported by user
6. Reviews 5 problem devices:
   - Device 1: Battery dead (user said 2+ hrs) → Reduces credits by 20%
   - Device 2: Screen crack not in photos → Reduces credits by 30%
   - Device 3: Wrong charger included → Reduces credits by ₹500
   - etc.
7. Releases credits to enterprise wallets
8. Notifies IT Admins of completion

### Journey 4: CFO — Managing Credits & Redemption

Meera is the CFO at Test Corp. IT Admin Priya's batch is complete.

1. Receives notification: "45,000 credits added to your wallet"
2. Logs into Ecotribe portal
3. Views wallet dashboard:
   - Balance: 45,000 credits
   - Pending: 5,000 credits (devices in QC)
   - Transaction history shows all credits
4. Reviews credit breakdown by asset (optional detail view)
5. Decides to redeem:
   - 20,000 credits → Cash (₹20,000)
   - 20,000 credits → ASUS laptops (₹22,000 worth at 1:1.1)
   - 5,000 credits → Keep for later
6. Initiates cash withdrawal → Bank transfer
7. Initiates product redemption → Selects ASUS products from catalog
8. Downloads EPR certificates for compliance team
9. Generates quarterly sustainability report

### Journey 5: Logistics User — Pickup & Basic QC

Suresh is a Logistics User assigned to pickup 5 devices from Test Corp.

1. Receives assignment notification on portal + WhatsApp
2. Views assignment:
   - Company: Test Corp
   - Address: 123 Tech Park
   - Devices: 5 laptops
   - Time slot: 2-4 PM
   - Contact: Priya (IT Admin)
3. Arrives at location, meets employees one by one
4. For each device:
   - Opens app, scans/enters serial number
   - Compares to expected serial → ✓ Match
   - Reviews reported damage: "Dent on lid"
   - Physically checks: "Yes, I see the dent" → ✓ Match
   - Powers on device → ✓ Works
   - Marks: "Basic QC Passed"
5. One device doesn't power on:
   - User: "It was working yesterday!"
   - Suresh marks: "Basic QC Failed - Does not power on"
   - Does NOT pick up this device
6. Picks up 4 working devices
7. Takes photo of each device + ID of person handing over
8. Uploads pickup proof
9. Delivers 4 devices to Ecotribe warehouse
10. Warehouse team scans receipt

### Journey 6: Logistics Admin — Managing Operations

Vikram runs a logistics company partnered with Ecotribe.

1. Morning: Logs into Logistics Admin portal
2. Views today's assignments:
   - 25 pickups scheduled
   - 5 Logistics Users available
3. Assigns pickups to users based on location
4. Monitors real-time status:
   - 15 completed
   - 8 in progress
   - 2 exceptions (user not available)
5. Handles exception: Reassigns to tomorrow, notifies IT Admin
6. End of day: Reviews completion report
7. Flags underperforming Logistics User for training

---

## 🔄 Core Platform Flow

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 1: ASSET INTAKE                        │
└─────────────────────────────────────────────────────────────────┘
                              │
        [IT Admin Uploads Assets via Excel]
                              │
        [System Validates + Creates Cases]
                              │
        [Sub-Users Assigned + Notified]
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PHASE 2: EVALUATION                            │
└─────────────────────────────────────────────────────────────────┘
                              │
        [Sub-User Receives Link (Email + WhatsApp)]
                              │
        [Sub-User Downloads Internal Agent]
                              │
        [Agent Runs Diagnostics → Report to OPS Manager]
                              │
        [Sub-User Completes Manual Evaluation]
            - 10 Photos
            - Functional Checklist  
            - GPS Confirmation
            - Digital Declaration
            (NO pickup details - IT Admin decides location)
                              │
        [Evaluation Submitted]
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 PHASE 3: OPS REVIEW                              │
└─────────────────────────────────────────────────────────────────┘
                              │
        [OPS Manager Reviews Agent Report + User Submission]
                              │
              ┌───────────────┴───────────────┐
              │                               │
        [Approved]                    [Flagged/Rejected]
              │                               │
              ▼                               ▼
   [Ready for Pickup]              [IT Admin Notified]
   (Status Updated)                [Sub-User Re-evaluates]
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              PHASE 4: PICKUP INITIATION (IT ADMIN)               │
└─────────────────────────────────────────────────────────────────┘
                              │
        [IT Admin Reviews Ready Assets]
                              │
        [IT Admin Selects Assets for Pickup]
            - Single asset or batch
            - Filter by department
                              │
        [IT Admin Selects Pickup Location]
            - From saved enterprise locations
            - e.g., "Bangalore HQ - IT Office, Floor 3"
                              │
        [IT Admin Sets Pickup Date/Time]
                              │
        [IT Admin Clicks "Initiate Pickup"]
                              │
        [Sub-Users Notified]
            - "Bring your device to [Location] on [Date]"
                              │
        [Pickup Request Sent to Logistics Admin]
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 PHASE 5: LOGISTICS                               │
└─────────────────────────────────────────────────────────────────┘
                              │
        [Logistics Admin Receives Pickup Request]
                              │
        [Logistics Admin Assigns Logistics User]
                              │
        [IT Admin Sees Assignment + Scheduled Date]  ← Oversight
                              │
        [Logistics User Receives Assignment]
                              │
        [Logistics User Arrives On-Site]
                              │
        [On-Site Basic QC]
            - Serial Number Match ✓
            - Reported Damage Match ✓
            - Device Powers On ✓
                              │
              ┌───────────────┴───────────────┐
              │                               │
        [QC Pass]                      [QC Fail]
              │                               │
              ▼                               ▼
   [Device Picked Up]              [Device NOT Picked Up]
   [Proof Uploaded]                [IT Admin Notified]
              │
        [IT Admin Sees Pickup Confirmed]  ← Oversight
              │
        [Devices Delivered to Warehouse]
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 PHASE 6: WAREHOUSE QC                            │
└─────────────────────────────────────────────────────────────────┘
                              │
        [Warehouse Team Receives Devices]
                              │
        [Detailed QC Inspection]
            - Verify all specs
            - Functional tests
            - Cosmetic grading
            - Compare to user report
                              │
              ┌───────────────┴───────────────┐
              │                               │
        [QC Pass]                      [QC Issues Found]
              │                               │
              ▼                               ▼
   [Full Credits]              [OPS Manager Reviews]
                                      │
                               [Decides Credit Reduction]
                                      │
                               [Reduced Credits]
                                      │
                    (Device NOT returned to enterprise)
                              │
        [IT Admin Sees "QC Complete" Status]  ← Oversight
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 PHASE 7: CREDITS & REDEMPTION                    │
└─────────────────────────────────────────────────────────────────┘
                              │
        [Ecotribe Releases Credits to Enterprise Wallet]
                              │
        [CFO Notified]
                              │
        [CFO Views Wallet Balance]
                              │
        [CFO Initiates Redemption]
            - Cash Withdrawal (1:1)
            - ASUS Products (1:1.1)
            - Comprint Products (1:1.05)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 PHASE 8: EPR & COMPLIANCE                        │
└─────────────────────────────────────────────────────────────────┘
                              │
        [EPR Certificate Generated]
                              │
        [CFO Downloads for Compliance]
```

### IT Admin Pickup Initiation Flow

```
[IT Admin Views Dashboard]
        │
        ▼
[Filter: "Ready for Pickup" Status]
        │
        ▼
[See List of Evaluated Assets]
    - Employee name
    - Device details
    - Evaluation date
    - Pickup address
        │
        ▼
[Select Assets for Pickup]
    □ Asset 1 - Rahul - Dell Latitude - Bangalore
    □ Asset 2 - Priya - HP ProBook - Bangalore  
    □ Asset 3 - Amit - Lenovo ThinkPad - Mumbai
    ☑ Select All Bangalore (2)
        │
        ▼
[Click "Initiate Pickup"]
        │
        ▼
[Confirm Pickup Request]
    - 2 devices selected
    - Location: Bangalore office
    - Preferred date range (optional)
        │
        ▼
[Request Submitted]
        │
        ▼
[Logistics Admin Notified]
        │
        ▼
[IT Admin Sees Status: "Pickup Requested"]
        │
        ▼
[Logistics Admin Assigns → Status: "Pickup Scheduled"]
        │
        ▼
[IT Admin Monitors Progress]
    - See assigned Logistics User
    - See scheduled date/time
    - Track pickup completion
    - View proof of pickup
```

### IT Admin Logistics Oversight

```
IT Admin can see for their enterprise's devices:

┌─────────────────────────────────────────────────────────────┐
│                 LOGISTICS TRACKING VIEW                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Pickup Request #PR-001          Status: In Progress         │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Devices: 5 laptops                                          │
│  Location: Bangalore Office                                  │
│  Requested: 15 Jan 2024                                      │
│                                                              │
│  Timeline:                                                   │
│  ✓ Pickup Requested ──────────── 15 Jan, 10:00 AM           │
│  ✓ Assigned to Logistics ─────── 15 Jan, 11:30 AM           │
│      Logistics User: Suresh (ABC Logistics)                  │
│  ✓ Pickup Scheduled ──────────── 17 Jan, 2-4 PM             │
│  ◐ Pickup In Progress ─────────── 17 Jan, 2:15 PM           │
│      3 of 5 devices picked up                                │
│  ○ Delivered to Warehouse                                    │
│  ○ QC Complete                                               │
│                                                              │
│  Device Status:                                              │
│  ┌──────────┬────────────┬─────────────┬──────────────────┐ │
│  │ Serial   │ Employee   │ Status      │ Notes            │ │
│  ├──────────┼────────────┼─────────────┼──────────────────┤ │
│  │ ABC123   │ Rahul      │ Picked Up   │ ✓                │ │
│  │ DEF456   │ Priya      │ Picked Up   │ ✓                │ │
│  │ GHI789   │ Amit       │ Picked Up   │ ✓                │ │
│  │ JKL012   │ Sneha      │ Pending     │ User unavailable │ │
│  │ MNO345   │ Vikram     │ QC Failed   │ Won't power on   │ │
│  └──────────┴────────────┴─────────────┴──────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Partial Pickup Flow (IT Admin Controlled)

```
[Batch of 50 Assets]
        │
        ├── Day 1: 30 devices ready → Picked up
        │           20 devices pending (Sub-User not done)
        │
        ├── Day 2: 15 more devices ready → Picked up
        │           5 devices stalled
        │
        └── Day 3: 5 devices → IT Admin marks as exception
        
[Each Pickup Updates Individually]
        │
        ├── Picked up devices → Warehouse QC → Credits released
        │
        └── Credits added per device (not waiting for batch)
```

---

## 📖 Scenarios

### Asset Intake Scenarios

| ID | Scenario | Outcome |
|----|----------|---------|
| S1.1 | IT Admin uploads valid Excel (50 assets) | All cases created, invites sent |
| S1.2 | Excel has duplicate serials | Duplicates rejected with error |
| S1.3 | Excel missing required fields | Rows rejected, error report shown |
| S1.4 | Sub-User email invalid | Row rejected |
| S1.5 | Serial already exists in system | Row rejected, link to existing |

### Evaluation Scenarios

| ID | Scenario | Outcome |
|----|----------|---------|
| S2.1 | Sub-User completes full evaluation | Ready for OPS review |
| S2.2 | Agent fails to run (permission denied) | User prompted to retry, manual fallback |
| S2.3 | Agent report shows hardware issue | Flagged for OPS Manager |
| S2.4 | Photos are blurry | Auto-detect, prompt retake |
| S2.5 | User doesn't respond for 72hrs | Stalled, IT Admin notified |
| S2.6 | User reports device lost | Police report required |

### Logistics Scenarios

| ID | Scenario | Outcome |
|----|----------|---------|
| S3.1 | IT Admin initiates pickup for 10 ready assets | Pickup request created, Logistics Admin notified |
| S3.2 | IT Admin initiates pickup for assets in multiple cities | Separate pickup requests per city |
| S3.3 | Logistics User completes pickup | Proof uploaded, delivered to warehouse |
| S3.4 | Serial number doesn't match | Pickup rejected, IT Admin notified |
| S3.5 | Device doesn't power on | Pickup rejected for that device, IT Admin notified |
| S3.6 | Damage worse than reported | Noted, proceed with pickup (warehouse decides) |
| S3.7 | User not available | Exception logged, IT Admin notified, rescheduled |
| S3.8 | Partial pickup (some devices unavailable) | Available devices picked, others marked pending |
| S3.9 | IT Admin cancels pickup request | Request cancelled if not yet assigned |

### Warehouse QC Scenarios

| ID | Scenario | Outcome |
|----|----------|---------|
| S4.1 | Device matches report perfectly | Full credits |
| S4.2 | Minor issue not reported | OPS Manager reduces credits 10-20% |
| S4.3 | Major issue not reported | OPS Manager reduces credits 30-50% |
| S4.4 | Device non-functional (worked at pickup) | OPS Manager decides, significant reduction |
| S4.5 | Wrong device received | Escalation, investigation |

### Credits & Redemption Scenarios

| ID | Scenario | Outcome |
|----|----------|---------|
| S5.1 | CFO withdraws cash | 1:1 rate, bank transfer initiated |
| S5.2 | CFO redeems ASUS products | 1:1.1 rate, product order placed |
| S5.3 | CFO redeems Comprint products | 1:1.05 rate, product order placed |
| S5.4 | Insufficient credits for redemption | Error, cannot proceed |
| S5.5 | Partial credits (QC pending) | Shows available vs pending |

---

## 🧰 Functional Requirements by Role

### IT Admin Functions

| Feature | User Story | Access |
|---------|-----------|--------|
| Dashboard | View asset status overview | ✓ |
| Upload Assets | Bulk upload via Excel | ✓ |
| Download Template | Get Excel template | ✓ |
| View Cases | List all assets with filters | ✓ |
| View Evaluation | See Sub-User submissions (photos, checklist) | ✓ Read-only |
| View Agent Report | See Internal Agent diagnostic results | ✓ Read-only |
| Assign Sub-Users | Assign employees to assets | ✓ |
| Reassign Sub-Users | Change assignment if stalled | ✓ |
| Resend Invite | Resend evaluation link | ✓ |
| Mark Exception | Close stalled asset with reason | ✓ |
| **Initiate Pickup** | **Request pickup for ready assets (single or batch)** | ✓ |
| **View Logistics Status** | **Track pickup scheduling, assignment, and completion** | ✓ |
| **Logistics Oversight** | **Monitor logistics of their enterprise's devices** | ✓ |
| Export Data | Export asset data to CSV | ✓ |
| **Credits/Wallet** | **NO ACCESS** | ✗ |
| **Payments** | **NO ACCESS** | ✗ |
| **EPR Certificates** | **NO ACCESS** | ✗ |

### CFO Functions

| Feature | User Story | Access |
|---------|-----------|--------|
| Wallet Dashboard | View credit balance, pending, history | ✓ |
| Transaction History | View all credit additions and redemptions | ✓ |
| Asset Credit Detail | View credits earned per asset | ✓ Read-only |
| Cash Withdrawal | Redeem credits for cash (1:1) | ✓ |
| Product Redemption | Redeem for ASUS (1:1.1) or Comprint (1:1.05) | ✓ |
| Product Catalog | Browse available products | ✓ |
| Withdrawal History | Track past withdrawals and orders | ✓ |
| EPR Certificates | View and download all certificates | ✓ |
| Financial Reports | Generate credit/redemption reports | ✓ |
| **Asset Operations** | **NO ACCESS** | ✗ |
| **Logistics Coordination** | **NO ACCESS** | ✗ |

### Sub-User Functions

| Feature | User Story | Access |
|---------|-----------|--------|
| OTP Login | Access via secure link | ✓ |
| Device Confirmation | Confirm assigned device | ✓ |
| Download Agent | Download Internal Agent application | ✓ |
| Run Agent | Execute diagnostic agent | ✓ |
| Photo Capture | Upload 10 guided photos | ✓ |
| Functional Checklist | Answer condition questions | ✓ |
| GPS Confirmation | Confirm device location | ✓ |
| Digital Declaration | Sign accuracy declaration | ✓ |
| Submit Evaluation | Complete and submit | ✓ |
| View Status | Track own asset status | ✓ Read-only |
| Pickup Notification | Receive where/when to bring device | ✓ Read-only |
| **Pickup Location/Time** | **NO ACCESS (IT Admin decides)** | ✗ |
| **Credits/Wallet** | **NO ACCESS** | ✗ |

### OPS Manager Functions

| Feature | User Story | Access |
|---------|-----------|--------|
| Dashboard | Platform-wide overview | ✓ |
| All Enterprises | View all enterprise assets | ✓ |
| Agent Reports | Review diagnostic reports | ✓ |
| Flag/Approve | Approve for pickup or flag issues | ✓ |
| Warehouse QC Queue | View devices pending QC | ✓ |
| QC Results | Review warehouse QC findings | ✓ |
| Credit Adjustment | Decide credit reduction for QC failures | ✓ |
| Release Credits | Trigger credit release to enterprise | ✓ |
| Communication | Message IT Admins, Logistics Admins | ✓ |
| Reports | Operational reports and analytics | ✓ |

### Logistics Admin Functions

| Feature | User Story | Access |
|---------|-----------|--------|
| Dashboard | View all assigned pickups | ✓ |
| User Management | Manage Logistics Users | ✓ |
| Assign Pickups | Assign pickups to Logistics Users | ✓ |
| Monitor Progress | Track real-time pickup status | ✓ |
| Handle Exceptions | Reschedule, reassign failed pickups | ✓ |
| Performance Reports | View Logistics User performance | ✓ |
| Communication | Coordinate with OPS Manager, IT Admins | ✓ |

### Logistics User Functions

| Feature | User Story | Access |
|---------|-----------|--------|
| Assignment View | See assigned pickups | ✓ |
| Pickup Details | View address, contact, device list | ✓ |
| On-Site QC | Perform basic QC checklist | ✓ |
| Serial Verification | Scan/enter serial, verify match | ✓ |
| Damage Verification | Check reported damage matches | ✓ |
| Power On Test | Verify device powers on | ✓ |
| Mark QC Result | Pass or Fail each device | ✓ |
| Upload Proof | Photo of device + person | ✓ |
| Complete Pickup | Mark pickup done | ✓ |
| Delivery Confirmation | Confirm delivery to warehouse | ✓ |
| WhatsApp Updates | Receive assignment notifications | ✓ |

---

## 📥 Asset Intake Specification

### Required Asset Fields (Excel Upload)

| Field | Required | Format | Notes |
|-------|----------|--------|-------|
| Employee Name | Yes | Text | Full name |
| Employee Email | Yes | Email | For evaluation invite |
| Employee Phone | Yes | Phone | With country code, for OTP |
| Device Make | Yes | Text | Dell, HP, Lenovo, etc. |
| Device Model | Yes | Text | Model name/number |
| Serial Number | Yes | Text | Unique identifier |
| CPU Configuration | Yes | Text | e.g., "Intel Core i5-1135G7" |
| RAM | Yes | Text | e.g., "16GB DDR4" |
| Storage Type | Yes | Dropdown | SSD / HDD |
| Storage Capacity | Yes | Text | e.g., "512GB" |
| GPU | Optional | Text | e.g., "NVIDIA MX450" or "Integrated" |
| Assignment Start Date | Yes | Date | YYYY-MM-DD, for depreciation |
| Department | Optional | Text | For internal tracking |
| Asset Tag | Optional | Text | Internal asset ID |

### Bulk Upload Rules

- Accepted formats: XLSX, CSV
- Maximum rows per upload: 500
- Hard validations (row rejected):
  - Duplicate serial numbers
  - Missing required fields
  - Invalid email/phone format
  - Invalid date format
- Soft validations (warning):
  - Assignment date in future

### System Behavior

1. Parse and validate file
2. Show validation summary: X valid, Y errors
3. IT Admin can proceed with valid rows
4. For each valid row:
   - Create case ID
   - Send invite (Email + WhatsApp)
   - Notify OPS Manager

---

## 📱 End-User Evaluation Specification

### Login & Verification

| Step | Description |
|------|-------------|
| 1 | Sub-User receives secure link (Email + WhatsApp) |
| 2 | Clicks link, enters OTP (10 min validity, 3 attempts) |
| 3 | Session bound to specific asset |

### Evaluation Steps

**Step 1: Device Confirmation**
- System shows: Make, Model, Serial Number
- User confirms: "Is this your device?" (Yes/No)
- If No → Flag to IT Admin

**Step 2: Download & Run Internal Agent**
- Download link for agent application
- User runs agent with required permissions
- Agent performs diagnostics
- Report auto-uploaded
- User clicks "Agent Complete" to proceed

**Step 3: Photo Capture (10 Mandatory)**

| # | Photo | Instructions |
|---|-------|--------------|
| 1 | Top Lid | Closed laptop from above |
| 2 | Bottom | Underside with vents |
| 3 | Left Side | All ports visible |
| 4 | Right Side | All ports visible |
| 5 | Screen | Powered on, max brightness |
| 6 | Keyboard | Full keyboard from above |
| 7 | Trackpad | Close-up of trackpad |
| 8 | Ports Close-up | Detailed port condition |
| 9 | Charger + Cable | Charger and cable together |
| 10 | Damage | Any visible damage (optional if none) |

**Step 4: Functional Checklist**

| Category | Options |
|----------|---------|
| Power | Yes / No |
| Battery | <30 min / 30-60 min / 1-2 hrs / 2+ hrs |
| Screen | Dead pixels / Discoloration / Scratches / Pressure marks / None |
| Keyboard | All working / Sticky keys / Non-functional keys |
| Trackpad | Working / Partial / Broken |
| Ports | All working / Some not working / None working |
| Hinges | Stable / Wobbly / Broken |
| Audio | Working / Muffled / Dead |
| Camera | Working / Blurred / Dead |
| Mic | Working / Partial / Dead |
| Wi-Fi | Working / Inconsistent / Dead |
| Body | Minor scratches / Major dents / Cracks / Panel separation / None |
| Charger | Present / Missing / Damaged |

**Step 5: GPS Confirmation**
- Auto-capture coordinates (current device location)
- Used for verification purposes
- No pickup address needed (IT Admin decides pickup location)

**Step 6: Digital Declaration**
- Checkbox: "I confirm all information is accurate"
- Digital signature capture
- Submit

---

## 🤖 Internal Agent Specification

### Overview

The Internal Agent is a downloadable software application that runs diagnostics on the device being traded in. It provides programmatic verification of hardware specs and condition.

### Delivery Method

- Download link sent in evaluation flow
- User downloads and runs with admin permissions
- Agent executes diagnostics
- Report uploaded automatically to Ecotribe servers

### Diagnostic Capabilities (To Be Defined)

| Category | Checks |
|----------|--------|
| System Info | Serial number, Make, Model verification |
| Hardware | CPU, RAM, Storage specs confirmation |
| Battery | Health percentage, cycle count |
| Storage | SMART status, health indicators |
| Display | Resolution, refresh rate confirmation |
| Network | Wi-Fi adapter status |
| Ports | USB/HDMI detection (if possible) |

### Report Output

- JSON report uploaded to server
- Attached to asset QC record
- Sent to OPS Manager for review
- Compared against user's manual inputs

### Failure Handling

| Scenario | Action |
|----------|--------|
| User denies permissions | Prompt retry, explain necessity |
| Agent fails to run | Manual fallback, flag for OPS review |
| Agent report incomplete | Accept partial, flag for review |
| Specs mismatch with upload | Flag discrepancy for OPS Manager |

### Future Development

- Detailed spec to be defined
- May include remote desktop verification
- May include automated photo capture

---

## 🚀 IT Admin Pickup Initiation Specification

### Overview

IT Admin has full control over pickup logistics. They decide:
- **When** to initiate pickup
- **Where** the pickup happens (company facility/office location)
- **Which assets** to include in each pickup batch

Sub-Users only complete device evaluation — they do NOT provide pickup details.

### Pickup Location Management

IT Admin manages pickup locations for their enterprise:

**Enterprise Pickup Locations (Managed by IT Admin)**

| Field | Required | Description |
|-------|----------|-------------|
| Location Name | Yes | e.g., "Bangalore HQ", "Mumbai Office" |
| Address | Yes | Full address |
| City | Yes | City name |
| PIN Code | Yes | For logistics routing |
| Contact Person | Yes | Site coordinator name |
| Contact Phone | Yes | Site coordinator phone |
| Operating Hours | Yes | e.g., "Mon-Fri, 9 AM - 6 PM" |
| Special Instructions | Optional | Gate pass, parking, security check |

IT Admin can:
- Add multiple pickup locations
- Edit location details
- Set default location
- Deactivate locations

### Pickup Initiation Flow

```
[Assets in "Ready for Pickup" Status]
        │
        ▼
[IT Admin Views Ready Assets]
    - Filter by department
    - Filter by evaluation date
    - Search by employee/serial
        │
        ▼
[IT Admin Selects Assets]
    - Individual selection (checkbox)
    - Select all on page
    - Select all matching filter
        │
        ▼
[Click "Initiate Pickup"]
        │
        ▼
[Select Pickup Location]
    - Choose from saved enterprise locations
    - Or add new location
        │
        ▼
[Set Pickup Details]
    - Preferred date (or date range)
    - Preferred time slot
    - Priority (Normal / Urgent)
    - Notes for logistics team
        │
        ▼
[Review Pickup Request Summary]
    - Total devices: X
    - Pickup location: [Address]
    - Contact person: [Name, Phone]
    - Employees to notify: List
        │
        ▼
[Confirm & Submit]
        │
        ▼
[System Actions]
    - Pickup request created
    - Logistics Admin notified
    - Sub-Users notified: "Bring device to [Location] on [Date]"
    - IT Admin sees status: "Pickup Requested"
```

### Sub-User Notification on Pickup

When IT Admin initiates pickup, Sub-Users receive:

```
📦 Device Pickup Scheduled

Hi Rahul,

Your laptop (Dell Latitude 5520 - Serial: ABC123) is scheduled for pickup.

📍 Location: Test Corp, Floor 3, IT Office
📅 Date: 17 January 2024
⏰ Time: 2:00 PM - 4:00 PM

Please bring your laptop with charger to the above location.

Contact: Priya Sharma (IT Admin) - +91 98765 43210

Questions? Reply to this message.
```

### Pickup Models Supported

**Model 1: Centralized Pickup (Recommended)**
- All employees bring devices to one location (e.g., IT Office)
- Logistics User comes once, picks up all devices
- Most efficient for logistics

```
[50 Employees] → [Bring to IT Office] → [1 Logistics Visit] → [50 Devices Picked]
```

**Model 2: Multi-Location Pickup**
- Enterprise has multiple offices
- IT Admin creates separate pickup requests per location
- Logistics visits each location

```
[30 Bangalore employees] → [Bangalore Office] → [Logistics Visit 1]
[20 Mumbai employees] → [Mumbai Office] → [Logistics Visit 2]
```

**Model 3: Desk Pickup (Premium/Optional)**
- Logistics User goes to each employee's desk
- Higher logistics cost
- For special cases only

```
[Request includes employee desk locations]
[Logistics User visits each desk]
[More time-consuming, higher cost]
```

### Selection Rules

| Rule | Description |
|------|-------------|
| Status requirement | Only "Ready for Pickup" assets can be selected |
| Single location per request | All selected assets go to one pickup location |
| Minimum selection | 1 asset minimum |
| Maximum selection | 100 assets per request (system limit) |
| Mixed locations | Creates separate requests automatically |

### IT Admin Pickup Dashboard

| View | Description |
|------|-------------|
| Ready for Pickup | Assets waiting for IT Admin to initiate |
| Pickup Requested | Requests submitted, awaiting Logistics Admin assignment |
| Pickup Scheduled | Assigned and scheduled, date/time confirmed |
| Pickup In Progress | Logistics User currently at location |
| Pickup Completed | All devices in request picked up |
| Pickup Exceptions | Failed pickups, no-shows, issues |

### IT Admin Actions on Pickup Requests

| Action | When Available | Description |
|--------|----------------|-------------|
| View Details | Always | See all devices, status, timeline |
| Edit Location | Before assignment | Change pickup location |
| Edit Date/Time | Before assignment | Change preferred schedule |
| Cancel Request | Before assignment | Cancel entire request |
| Remove Device | Before pickup | Remove single device from request |
| Add Notes | Always | Add instructions for logistics |
| Notify Sub-Users | Always | Re-send pickup notification to employees |
| Contact Logistics | After assignment | Message logistics team |
| Reschedule | After exception | Request new pickup date |
| Mark No-Show | During pickup | Mark employee who didn't show up |

### Notifications to IT Admin

| Event | Notification |
|-------|--------------|
| Pickup request submitted | Confirmation with request ID |
| Logistics User assigned | Assignment details, scheduled date |
| Pickup date confirmed | Final date/time from logistics |
| Pickup started | Logistics User arrived at location |
| Each device picked up | Real-time update |
| Employee no-show | Alert with employee name |
| Pickup completed | Summary of picked/missed |
| Device delivered to warehouse | Status update |
| Warehouse QC complete | Final status per device |

### Employee No-Show Handling

If Sub-User doesn't bring device to pickup location:

```
[Pickup Day]
        │
[Sub-User doesn't show up]
        │
        ▼
[Logistics User marks "No-Show"]
        │
        ▼
[IT Admin notified immediately]
        │
        ▼
[IT Admin Options:]
    - Contact employee directly
    - Include in next pickup batch
    - Mark as exception
    - Reassign to different employee
```

---

## 🚚 Logistics Specification

### Logistics Roles

**Logistics Admin:**
- Company/Head level
- Manages multiple Logistics Users
- Assigns and supervises pickups
- Handles exceptions

**Logistics User:**
- Field personnel
- Performs pickups
- Conducts on-site basic QC
- Uploads proof

### Logistics Admin Portal

| Feature | Description |
|---------|-------------|
| Dashboard | Overview of all pickups (scheduled, in progress, completed, exceptions) |
| User Management | Add/remove Logistics Users, view performance |
| Assignment Queue | Unassigned pickups ready for assignment |
| Assign Pickup | Assign to Logistics User based on location/availability |
| Monitor Progress | Real-time status of all pickups |
| Exception Handling | View and resolve exceptions |
| Reports | Performance metrics, completion rates |

### Logistics User Portal/App

| Feature | Description |
|---------|-------------|
| My Assignments | List of assigned pickups |
| Pickup Details | Address, contact, device list, time slot |
| Navigation | Map link to pickup location |
| On-Site QC Checklist | Step-by-step basic QC |
| Serial Scanner | Camera-based serial number capture |
| Photo Upload | Capture proof photos |
| Mark Complete | Confirm pickup done |
| Delivery Confirmation | Confirm drop at warehouse |
| WhatsApp Integration | Receive notifications |

### On-Site Basic QC by Logistics User

```
For each device:

[Step 1: Serial Verification]
    - Scan or enter serial number
    - System checks against expected
    - ✓ Match / ✗ Mismatch
    - If mismatch → Cannot pickup, flag

[Step 2: Damage Verification]
    - View reported damages from user
    - Physically inspect device
    - Confirm: "Damage matches report?" (Yes/No/Worse)
    - If Worse → Note, proceed (warehouse decides)

[Step 3: Power On Test]
    - Ask user to power on device
    - Verify: "Device powers on?" (Yes/No)
    - If No → Cannot pickup this device

[Step 4: Decision]
    - All checks pass → Mark "QC Passed", Pickup
    - Any critical fail → Mark "QC Failed", Do NOT pickup
```

### Pickup Proof Requirements

| Proof | Required |
|-------|----------|
| Photo of device | Yes |
| Photo of person handing over | Yes |
| Person's name confirmation | Yes |
| Timestamp | Auto-captured |
| GPS coordinates | Auto-captured |
| Logistics User signature | Yes |

### Partial Batch Pickup

- Batch may contain multiple devices
- Logistics User can pickup available/passed devices
- Unavailable/failed devices remain pending
- Each device status updates individually
- Multiple pickup trips allowed for same batch

### Delivery to Warehouse

- Logistics User delivers devices to Ecotribe warehouse
- Warehouse team scans devices in
- Handover confirmation from both parties
- Devices enter Warehouse QC queue

---

## 🏭 Warehouse QC Specification

### QC Process

```
[Devices Received from Logistics]
        ↓
[Warehouse Team Scans In]
        ↓
[Detailed QC Inspection]
        ↓
[Compare Against:]
    - Original user evaluation (photos, checklist)
    - Internal Agent report
    - Logistics User on-site QC notes
        ↓
[Grade Assignment]
        ↓
[Report to OPS Manager]
        ↓
[OPS Manager Reviews Discrepancies]
        ↓
[Credit Decision]
```

### QC Checklist (Warehouse)

| Section | Checks |
|---------|--------|
| Identity | Serial match, Make/Model match |
| Cosmetic | Scratches, dents, cracks (grade severity) |
| Screen | Dead pixels, discoloration, cracks, pressure marks |
| Keyboard | All keys functional, no sticky keys |
| Trackpad | Responsive, no damage |
| Ports | Test all USB, HDMI, audio, charging ports |
| Battery | Run diagnostic, verify health % |
| Storage | Verify capacity, SMART status |
| Audio | Test speakers, headphone jack |
| Camera/Mic | Test functionality |
| Wi-Fi | Connection test |
| Charger | Verify included, functional |

### Grading System

| Grade | Condition | Credit Impact |
|-------|-----------|---------------|
| A | Excellent - Like new | 100% credits |
| B | Good - Minor wear | 100% credits |
| C | Fair - Visible wear, fully functional | 90-95% credits |
| D | Poor - Significant wear, functional issues | 70-85% credits |
| Fail | Major issues, non-functional | 50% or less |

### Discrepancy Handling

If warehouse QC finds issues not reported by user:

| Discrepancy Type | Action |
|------------------|--------|
| Minor cosmetic (missed scratches) | Note, minor credit reduction (5-10%) |
| Moderate issue (dead pixels, sticky keys) | OPS Manager reviews, 15-25% reduction |
| Major issue (cracked screen, dead battery) | OPS Manager reviews, 30-50% reduction |
| Non-functional device | OPS Manager reviews, significant reduction |
| Wrong device/serial mismatch | Escalation, investigation |

**Important:** Device is NOT returned to enterprise. Credit adjustment is the only recourse.

### Credit Release

After QC complete:
1. Warehouse team submits QC report
2. OPS Manager reviews (especially discrepancies)
3. OPS Manager decides final credit amount
4. OPS Manager triggers credit release
5. Credits added to enterprise wallet
6. CFO notified

---

## 💳 Credits & Wallet Specification

### Credit System Overview

- 1 Credit = ₹1 base value
- Credits earned based on device value and condition
- Credits released by Ecotribe after warehouse QC
- Only CFO can manage wallet and redemptions

### Redemption Rates

| Redemption Type | Rate | Example |
|-----------------|------|---------|
| Cash Withdrawal | 1:1 | 10,000 credits = ₹10,000 |
| ASUS Products | 1:1.1 | 10,000 credits = ₹11,000 worth |
| Comprint Products | 1:1.05 | 10,000 credits = ₹10,500 worth |

### CFO Wallet Dashboard

| Widget | Description |
|--------|-------------|
| Available Balance | Credits ready for redemption |
| Pending Credits | Credits from devices in QC |
| Total Earned | Lifetime credits earned |
| Total Redeemed | Lifetime credits redeemed |
| Recent Transactions | Last 10 credit movements |

### Transaction Types

| Type | Direction | Description |
|------|-----------|-------------|
| Credit Addition | + | Credits released after QC |
| Cash Withdrawal | - | Redeemed for bank transfer |
| Product Redemption | - | Redeemed for products |
| Credit Adjustment | +/- | OPS Manager adjustment (rare) |

### Transaction History View

| Column | Description |
|--------|-------------|
| Date/Time | When transaction occurred |
| Type | Addition/Withdrawal/Redemption |
| Amount | Credits involved |
| Reference | Asset IDs or Order ID |
| Status | Completed/Pending/Failed |
| Balance After | Running balance |

### Cash Withdrawal Flow

```
[CFO Initiates Withdrawal]
        ↓
[Enter Amount] (max = available balance)
        ↓
[Confirm Bank Details]
        ↓
[Submit Request]
        ↓
[Ecotribe Processes]
        ↓
[Bank Transfer Initiated]
        ↓
[Transfer Complete]
        ↓
[Status Updated in Wallet]
```

### Product Redemption Flow

```
[CFO Browses Product Catalog]
        ↓
[Selects Products]
    - ASUS laptops, peripherals (1:1.1 rate)
    - Comprint products (1:1.05 rate)
        ↓
[Cart Shows Credit Cost]
        ↓
[Confirm Order]
        ↓
[Credits Deducted]
        ↓
[Order Placed with Vendor]
        ↓
[Delivery Scheduled]
        ↓
[Order Delivered]
```

### Credit Calculation (Per Device)

```
Base Value (from device specs)
    - CPU tier × RAM × Storage type × Storage capacity
    - Apply depreciation based on age
    
Condition Adjustment
    - Based on warehouse QC grade
    - A/B = 100%, C = 90-95%, D = 70-85%, Fail = 50% or less
    
Final Credits = Base Value × Condition %
```

---

## 🔔 Notification Specification

### IT Admin Notifications

| Event | Email | WhatsApp |
|-------|-------|----------|
| Upload successful | ✓ | |
| Sub-User completed evaluation | ✓ | |
| Asset flagged by OPS | ✓ | ✓ |
| Evaluation stalled (72hrs) | ✓ | ✓ |
| Pickup scheduled | ✓ | |
| Pickup completed | ✓ | |
| On-site QC failed | ✓ | ✓ |
| Warehouse QC complete | ✓ | |

### CFO Notifications

| Event | Email | WhatsApp |
|-------|-------|----------|
| Credits released to wallet | ✓ | ✓ |
| Withdrawal processed | ✓ | |
| Product order shipped | ✓ | |
| EPR certificate ready | ✓ | |

### Sub-User Notifications

| Event | Email | WhatsApp |
|-------|-------|----------|
| Evaluation invite | ✓ | ✓ |
| Reminder (24hrs) | ✓ | ✓ |
| Reminder (48hrs) | ✓ | ✓ |
| Evaluation submitted | ✓ | ✓ |
| **Pickup scheduled - bring device to location** | ✓ | ✓ |
| **Pickup reminder (1 day before)** | ✓ | ✓ |
| Device handed over | ✓ | ✓ |

### OPS Manager Notifications

| Event | Email | WhatsApp |
|-------|-------|----------|
| New evaluations completed | ✓ | |
| Agent report flagged | ✓ | ✓ |
| Devices received at warehouse | ✓ | |
| QC discrepancy found | ✓ | ✓ |

### Logistics Admin Notifications

| Event | Email | WhatsApp |
|-------|-------|----------|
| New pickups assigned | ✓ | |
| Pickup exception | ✓ | ✓ |
| Daily pickup summary | ✓ | |

### Logistics User Notifications

| Event | Email | WhatsApp |
|-------|-------|----------|
| New assignment | | ✓ |
| Assignment updated | | ✓ |
| Pickup reminder | | ✓ |

---

## 🗄️ Data Model Specification

### Core Entities

**Enterprise**
```
- enterprise_id (PK)
- name
- gst_number
- address
- created_at
```

**User (IT Admin, CFO)**
```
- user_id (PK)
- enterprise_id (FK)
- name
- email
- phone
- role (IT_ADMIN, CFO)
- created_at
```

**Sub-User**
```
- sub_user_id (PK)
- enterprise_id (FK)
- name
- email
- phone
- created_at
```

**Asset**
```
- asset_id (PK)
- case_id (unique)
- enterprise_id (FK)
- sub_user_id (FK)
- serial_number
- make
- model
- cpu
- ram
- storage_type
- storage_capacity
- gpu
- assignment_date
- status
- created_at
```

**Evaluation**
```
- evaluation_id (PK)
- asset_id (FK)
- photos (JSON)
- functional_checks (JSON)
- gps_coordinates
- declaration_signature
- submitted_at
```

**Agent Report**
```
- report_id (PK)
- asset_id (FK)
- diagnostics (JSON)
- specs_verified (JSON)
- flags (JSON)
- created_at
```

**Logistics Assignment**
```
- assignment_id (PK)
- asset_ids (array)
- logistics_admin_id (FK)
- logistics_user_id (FK)
- scheduled_date
- time_slot
- status
- created_at
```

**On-Site QC**
```
- onsite_qc_id (PK)
- asset_id (FK)
- logistics_user_id (FK)
- serial_match (boolean)
- damage_match (enum)
- powers_on (boolean)
- result (PASS/FAIL)
- notes
- created_at
```

**Pickup Proof**
```
- proof_id (PK)
- asset_id (FK)
- logistics_user_id (FK)
- device_photo
- handover_photo
- person_name
- gps_coordinates
- timestamp
```

**Warehouse QC**
```
- warehouse_qc_id (PK)
- asset_id (FK)
- inspector_id (FK)
- checklist_results (JSON)
- grade (A/B/C/D/FAIL)
- discrepancies (JSON)
- notes
- created_at
```

**Credit Transaction**
```
- transaction_id (PK)
- enterprise_id (FK)
- type (CREDIT/WITHDRAWAL/REDEMPTION/ADJUSTMENT)
- amount
- reference_ids (array of asset_ids or order_id)
- status
- created_at
```

**Enterprise Wallet**
```
- wallet_id (PK)
- enterprise_id (FK)
- available_balance
- pending_balance
- total_earned
- total_redeemed
- updated_at
```

**Product Order**
```
- order_id (PK)
- enterprise_id (FK)
- products (JSON)
- credits_used
- cash_value
- redemption_type (ASUS/COMPRINT)
- status
- created_at
```

**EPR Certificate**
```
- certificate_id (PK)
- enterprise_id (FK)
- asset_ids (array)
- certificate_number
- issue_date
- total_weight
- treatment_summary (JSON)
- pdf_url
- created_at
```

---

## 🔐 Authentication Specification

### Overview

The platform uses **Supabase Auth** for password-based authentication. All users are created in both Supabase Auth and the database `users` table with synchronized UUIDs.

### Authentication Flow

```
[User enters email + password]
        │
        ▼
[Supabase Auth: signInWithPassword()]
        │
        ├── Success → [Query users table by email]
        │                    │
        │                    ├── User found → Login successful
        │                    │
        │                    └── User NOT found → Error: "Account setup incomplete"
        │                        (User exists in Auth but not in DB)
        │
        └── Failure → [Query users table by email]
                            │
                            ├── User found → Error: Supabase Auth message
                            │               (Wrong password, etc.)
                            │
                            └── User NOT found → Error: "User not found"
```

### User Creation Flow (All Roles)

When creating any user (Super Admin, Main Admin, IT Admin, CFO, Logistics Admin, Logistics User, Sub-User):

```
[Admin fills user form with password]
        │
        ▼
[Step 1: Create in Supabase Auth]
    supabaseAdmin.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,  // Auto-confirm
      user_metadata: { name, phone }
    })
        │
        ▼
[Get UUID from Auth response]
        │
        ▼
[Step 2: Create in Database]
    db.insert('users', {
      id: authUser.id,  // Same UUID
      email: user.email,
      name: user.name,
      role: user.role,
      status: 'active',
      ...
    })
```

### Password Requirements

| Requirement | Specification |
|-------------|---------------|
| Minimum length | 8 characters |
| Required at | User creation time |
| Storage | Supabase Auth (hashed) |
| Reset | Via Supabase Auth (future) |

### Login Error Handling

| Error Code | Meaning | User Message |
|------------|---------|--------------|
| `true` | Login successful | Navigate to portal |
| `false` | User not found anywhere | "User not found. Please check your email address." |
| `AUTH_NO_DB_RECORD` | Auth succeeded, no DB record | "Account setup incomplete. Contact your administrator." |
| `string` | Supabase Auth error | Display the error message (e.g., "Invalid login credentials") |

### Role-Based Portals

| Role | Login Redirect | Password Required |
|------|----------------|-------------------|
| Super Admin | `/super` | Yes |
| Main Admin | `/ops` | Yes |
| IT Admin | `/admin` | Yes |
| CFO | `/cfo` | Yes |
| Logistics Admin | `/logistics-admin` | Yes |
| Logistics User | `/logistics` | Yes |
| Sub-User | `/check-in` | Yes |

### User Creation by Portal

| Portal | Who Creates | Roles They Can Create |
|--------|-------------|----------------------|
| Super Admin | Platform operator | Main Admin, Logistics Admin, Logistics User, IT Admin, CFO, Sub-User (for any enterprise) |
| CFO | Enterprise CFO | IT Admin (for their enterprise) |
| Enterprise Registration | Self-registration | IT Admin (optional, with enterprise) |

### Supabase Auth Configuration

The platform uses two Supabase clients:

| Client | Key Type | Purpose |
|--------|----------|---------|
| `supabase` | Anon Key | User login (`signInWithPassword`) |
| `supabaseAdmin` | Service Role Key | Admin operations (`auth.admin.createUser`, `auth.admin.deleteUser`) |

### Seed Scripts (Development)

**clear-and-seed.js** - Wipes all data and creates initial Super Admin:

```javascript
// Clears:
// 1. All Supabase Auth users
// 2. Database tables: sub_users, users, pickup_locations, enterprise_wallets, enterprises

// Creates:
// 1. Super Admin in Supabase Auth (email + password)
// 2. Super Admin in users table (same UUID)
```

Default Super Admin credentials:
- Email: `super@eco.com`
- Password: `superadmin`

---

## 🔐 Access & Permissions Specification

### Permission Matrix

| Feature | IT Admin | CFO | Sub-User | OPS Manager | Logistics Admin | Logistics User |
|---------|----------|-----|----------|-------------|-----------------|----------------|
| Upload Assets | ✓ | | | | | |
| View Own Assets | ✓ | ✓ (credits only) | Own only | ✓ All | | |
| Assign Sub-Users | ✓ | | | | | |
| View Evaluations | ✓ | | Own only | ✓ | | |
| View Agent Reports | ✓ | | | ✓ | | |
| Approve for Pickup | | | | ✓ | | |
| **Initiate Pickup** | **✓** | | | | | |
| **Cancel Pickup Request** | **✓** | | | | | |
| **View Logistics Status** | **✓** | | Own only | ✓ | ✓ | Own only |
| Assign Logistics User | | | | ✓ | ✓ | |
| Perform On-Site QC | | | | | | ✓ |
| Upload Pickup Proof | | | | | | ✓ |
| View Warehouse QC | | | | ✓ | | |
| Adjust Credits | | | | ✓ | | |
| Release Credits | | | | ✓ | | |
| View Wallet | | ✓ | | | | |
| Withdraw Cash | | ✓ | | | | |
| Redeem Products | | ✓ | | | | |
| Download EPR | | ✓ | | ✓ | | |

---

## 📋 Audit & Compliance Specification

### Audit Trail

Every action logged with:
- Timestamp (UTC)
- User ID and role
- Action type
- Entity affected
- Before/after values
- IP address

### Logged Events

- Asset created/updated
- Evaluation submitted
- Agent report received
- On-site QC performed
- Pickup completed
- Warehouse QC completed
- Credits released/adjusted
- Withdrawal/redemption processed
- EPR certificate generated

---

## 📜 EPR Certificate Specification

### Access

- **CFO only** can view and download EPR certificates
- IT Admin has NO access

### Generation Trigger

Certificate generated when:
1. Batch of assets fully picked up
2. Warehouse QC complete
3. Credits released
4. Treatment paths assigned

### Certificate Contents

- Certificate ID
- Enterprise details
- Asset summary (count, weight by category)
- Treatment outcomes (Recycled/Refurbished)
- Recycler partner details
- Ecotribe declaration
- QR code for verification
- Digital signature

### CFO EPR Features

| Feature | Description |
|---------|-------------|
| Certificate List | View all generated certificates |
| Download PDF | Individual certificate download |
| Batch Download | Multiple certificates as ZIP |
| Verification Link | Shareable verification URL |
| Compliance Reports | Quarterly/annual summaries |

---

## ⚙️ Non-Functional Requirements

| Requirement | Specification |
|-------------|---------------|
| Mobile-first | Sub-User and Logistics User flows optimized for mobile |
| Response time | <3 seconds for all API calls |
| Uptime | 99.5% availability |
| Security | Data encrypted at rest and in transit |
| Scalability | Handle 500+ concurrent users |
| File upload | Chunked upload, max 10MB per image |

---

## 🚨 Edge Cases & Exceptions

| Scenario | Handling |
|----------|----------|
| Sub-User doesn't complete in 72hrs | Stalled, IT Admin notified |
| Agent fails to run | Manual fallback allowed, flagged |
| Serial mismatch at pickup | Pickup rejected, IT Admin notified |
| Device doesn't power on at pickup | Pickup rejected for that device |
| Warehouse finds major undisclosed issue | Credits reduced, not returned |
| CFO tries to withdraw more than balance | Error, cannot proceed |
| Logistics User unavailable | Logistics Admin reassigns |
| Enterprise disputes credit reduction | OPS Manager reviews, can adjust |

---

## 🔮 Future Roadmap

| Feature | Priority |
|---------|----------|
| Internal Agent full spec | High |
| Mobile app for Logistics User | High |
| Automated credit calculation | Medium |
| Product catalog integration | Medium |
| Real-time pickup tracking | Low |
| AI-based damage detection | Low |
| Blockchain EPR verification | Low |

---

*Document Version: 3.1*
*Major Revision: Role restructuring, Credits system, Logistics hierarchy, CFO-only finance*
*v3.1: Added Authentication Specification - Supabase Auth integration with password-based login, dual user creation (Auth + DB), error handling*
*Status: Ready for Review*
