# EcoTribe Key Workflows

**Purpose:** This file documents all critical user workflows in the EcoTribe platform. Consult this when implementing or modifying any user-facing flow.

**Last Updated:** December 2024 (V3)

---

## 1. Enterprise Registration Flow (V3 NEW)

### Actors
- **Applicant** (future Org Admin)
- **Super Admin / OPS Admin** (reviewer)

### Steps
```
┌─────────────────────────────────────────────────────────────────┐
│ 1. APPLY                                                         │
│    Applicant fills multi-step form:                              │
│    Step 1: Company Details (name, GST, PAN, address)            │
│    Step 2: Org Admin Details (name, email, phone, designation)  │
│    Step 3: Document Upload (GST cert, PAN card, incorporation)  │
│    Step 4: Set Password                                          │
│    → Creates enterprise_applications record (status: 'pending') │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. REVIEW                                                        │
│    Admin reviews in /ops/applications or /super/applications    │
│    - View all uploaded documents                                 │
│    - Verify GST/PAN numbers                                      │
│    - Check company legitimacy                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌──────────────────────────┐    ┌──────────────────────────────────┐
│ 3a. APPROVE               │    │ 3b. REJECT / REQUEST INFO         │
│ - Create enterprise       │    │ - Set status to 'rejected' or     │
│ - Create org_admin user   │    │   'info_requested'                │
│ - Create enterprise_wallet│    │ - Send email with reason          │
│ - Send welcome email      │    │ - Applicant can resubmit          │
└──────────────────────────┘    └──────────────────────────────────┘
```

### Database Tables
- `enterprise_applications` - Application records
- `enterprises` - Created on approval
- `users` - Org Admin created on approval
- `enterprise_wallets` - Auto-created via trigger

### Files
- `src/pages/auth/EnterpriseRegister.tsx` (TO CREATE)
- `src/pages/ops/EnterpriseApplications.tsx` (TO CREATE)
- `src/hooks/useEnterpriseApplications.ts` ✅ Created

---

## 2. Asset Lifecycle Flow

### Actors
- **IT Admin** - Creates and manages assets
- **Sub-User** (Employee) - Self-evaluates assigned device
- **Technician** - Remote review
- **OPS Admin** - Oversees process

### Status Flow
```
pending_assignment → assigned → check_in_started → submitted
       ↓                                              ↓
       └── IT Admin creates asset                     └── Sub-user submits evaluation
                                                           ↓
                                              ┌────────────┴────────────┐
                                              ▼                         ▼
                                     conditionally_accepted      remote_rejected
                                              │
                                              ▼
                                     pickup_requested → pickup_scheduled → picked_up
                                                                              │
                                                                              ▼
                                                                         in_transit
                                                                              │
                                                                              ▼
                                                                        facility_qc
                                                                              │
                                                       ┌──────────────────────┴─────────────┐
                                                       ▼                                     ▼
                                               final_accepted                         final_rejected
                                                       │
                                                       ▼
                                               payout_pending → completed
```

### Files
- `src/pages/admin/AssetList.tsx` - Asset management
- `src/pages/admin/AddAsset.tsx` - Create asset
- `src/pages/check-in/DeviceSubmit.tsx` - Sub-user evaluation
- `src/hooks/useAssets.ts` ✅ Created

---

## 3. Batch Approval Flow (V3 CHANGED)

### Actors
- **IT Admin** - Creates batch, submits for approval
- **Org Admin** - Approves/rejects pickup requests
- **Logistics** - Executes pickup

### Steps (V3 New Flow)
```
┌─────────────────────────────────────────────────────────────────┐
│ 1. CREATE BATCH (IT Admin)                                       │
│    - Create batch with name/description                          │
│    - Add assets to batch                                         │
│    - Batch status: 'draft'                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. SUBMIT FOR APPROVAL (IT Admin)                                │
│    - Fill pickup details form:                                   │
│      • Preferred pickup date                                     │
│      • Time slot (morning/afternoon/evening)                     │
│      • Priority (normal/urgent)                                  │
│      • IT Admin notes                                            │
│      • Logistics instructions                                    │
│    - Status changes to 'pending_approval'                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. REVIEW (Org Admin)                                            │
│    - Views in /org-admin/approvals                               │
│    - Reviews batch details, asset count, pickup info             │
│    - Can approve or reject                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌──────────────────────────┐    ┌──────────────────────────────────┐
│ 4a. APPROVE               │    │ 4b. REJECT                        │
│ - Status: 'approved'      │    │ - Status: 'rejected'              │
│ - Auto-create             │    │ - Record rejection reason         │
│   pickup_request          │    │ - Notify IT Admin                 │
│ - Notify logistics        │    │ - IT Admin can resubmit           │
└──────────────────────────┘    └──────────────────────────────────┘
```

### Database Tables
- `batches` - With V3 pickup fields
- `pickup_requests` - Created on approval
- `assets` - Linked to batch

### Files
- `src/pages/admin/BatchCreate.tsx` - Create batch
- `src/pages/admin/BatchDetail.tsx` - Submit for approval
- `src/pages/org-admin/PickupApprovals.tsx` - Org Admin review
- `src/hooks/useBatches.ts` ✅ Created

---

## 4. Pickup Assignment Flow (3-Tier)

### Actors
- **OPS Admin** - Assigns to Logistics Admin
- **Logistics Admin** - Assigns to Logistics User
- **Logistics User** (Driver) - Executes pickup

### Steps
```
┌─────────────────────────────────────────────────────────────────┐
│ 1. PICKUP REQUEST CREATED                                        │
│    - From batch approval OR IT Admin direct request              │
│    - Status: 'pending'                                           │
│    - Visible in OPS Admin queue                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. TIER 1: OPS Admin → Logistics Admin                           │
│    - OPS Admin views all pending pickups                         │
│    - Assigns to a Logistics Admin (partner company)              │
│    - Status: 'assigned_to_admin'                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. TIER 2: Logistics Admin → Logistics User                      │
│    - Logistics Admin sees assigned pickups                       │
│    - Assigns to available Logistics User (driver)                │
│    - Status: 'assigned_to_user'                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. TIER 3: Logistics User Executes                               │
│    - Driver sees pickup in mobile view                           │
│    - Navigates to location                                       │
│    - Performs on-site QC                                         │
│    - Collects devices                                            │
│    - Uploads proof of pickup                                     │
│    - Status: 'completed'                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Files
- `src/pages/ops/PickupQueue.tsx` - OPS Admin view
- `src/pages/logistics-admin/LogisticsAssignmentQueue.tsx` - Logistics Admin
- `src/pages/logistics-user/LogisticsAssignments.tsx` - Driver view
- `src/hooks/usePickups.ts` ✅ Created
- `src/hooks/useLogistics.ts` ✅ Created

---

## 5. Branch Management Flow (V3 NEW)

### Actors
- **Org Admin** - Manages branches and IT Admins

### Hierarchy
```
Enterprise (Org Admin)
    │
    ├── Branch 1 (e.g., Mumbai Office)
    │   ├── IT Admin A
    │   │   └── Sub-Users (employees)
    │   └── IT Admin B
    │       └── Sub-Users
    │
    └── Branch 2 (e.g., Delhi Office)
        └── IT Admin C
            └── Sub-Users
```

### Operations
1. **Create Branch** - Org Admin creates branch with address, contact info
2. **Assign IT Admin** - IT Admin is assigned to exactly one branch
3. **Branch Stats** - View asset count, batch count, IT Admin count per branch
4. **Branch Pickup Location** - Default pickup point for that branch

### Files
- `src/pages/org-admin/BranchManagement.tsx` (TO CREATE)
- `src/components/branches/BranchCard.tsx` (TO CREATE)
- `src/components/branches/BranchForm.tsx` (TO CREATE)
- `src/hooks/useBranches.ts` ✅ Created

---

## 6. Wallet & Credits Flow (V3)

### Actors
- **Org Admin** - Views and manages enterprise wallet

### Flow
```
Asset Completed → Credits Added to Pending Balance
                              │
                              ▼
                   Credits Release (after 30 days or verification)
                              │
                              ▼
                   Available Balance (can redeem)
                              │
                              ▼
                   Redemption Request → Bank Transfer
```

### Files
- `src/pages/org-admin/CreditsWallet.tsx` (TO CREATE)
- Database: `enterprise_wallets`, `credit_transactions`

---

## Quick Reference: Role to Routes

| Role | Portal | Key Routes |
|------|--------|------------|
| Super Admin | `/super` | enterprises, admins, logistics, pricing |
| OPS Admin | `/ops` | reviews, pickups, enterprises, assets |
| Org Admin | `/org-admin` | branches, approvals, wallet, reports |
| IT Admin | `/admin` | batches, assets, sub-users, pickups |
| Sub User | `/check-in` | submit device, view status |
| Logistics Admin | `/logistics-admin` | assignments, users |
| Logistics User | `/logistics` | my pickups |

---

## Quick Reference: Status Meanings

### Batch Status
| Status | Meaning |
|--------|---------|
| `draft` | IT Admin is adding assets |
| `pending_approval` | Waiting for Org Admin |
| `approved` | Pickup authorized |
| `rejected` | Org Admin rejected |
| `pickup_scheduled` | Logistics assigned |
| `picked_up` | Devices collected |
| `completed` | All assets processed |

### Pickup Status
| Status | Meaning |
|--------|---------|
| `pending` | Awaiting assignment |
| `assigned_to_admin` | Logistics Admin has it |
| `assigned_to_user` | Driver assigned |
| `in_progress` | Driver en route |
| `completed` | Devices collected |
| `cancelled` | Pickup cancelled |
