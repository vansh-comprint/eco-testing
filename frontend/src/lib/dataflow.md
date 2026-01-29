# EcoTribe Data Flow Documentation

This document outlines how data flows between stores and which updates trigger cross-store notifications.

## Store Dependencies

```
                     ┌─────────────────┐
                     │   authStore     │
                     │   (User Auth)   │
                     └────────┬────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  enterpriseStore │  │   assetStore    │  │  subUserStore   │
│                 │◄─┤   (Core Data)   │◄─┤                 │
└─────────────────┘  └────────┬────────┘  └─────────────────┘
                              │
    ┌─────────────────────────┼─────────────────────────┐
    │                         │                         │
    ▼                         ▼                         ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  batchStore     │  │ submissionStore │  │  reviewStore    │
│                 │  │                 │  │                 │
└─────────────────┘  └────────┬────────┘  └────────┬────────┘
                              │                    │
                              └──────────┬─────────┘
                                         │
                                         ▼
                              ┌─────────────────┐
                              │  pickupStore    │
                              │                 │
                              └────────┬────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
         ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
         │ logisticsStore  │ │  payoutStore    │ │  auditStore     │
         │                 │ │                 │ │                 │
         └─────────────────┘ └─────────────────┘ └─────────────────┘
                                                          │
                                                          ▼
                                               ┌─────────────────┐
                                               │notificationStore│
                                               │                 │
                                               └─────────────────┘
```

## Key Workflow Transitions

### 1. Asset Assignment (IT Admin → SubUser)

**Trigger:** IT Admin assigns asset to SubUser

**Stores Updated:**
- `assetStore`: Status → `assigned`, `assignedSubUserId` set
- `batchStore`: Metrics recalculated
- `auditStore`: Assignment logged
- `notificationStore`: SubUser notified

**Code Location:** `assetStore.assignSubUser()`

---

### 2. Device Submission (SubUser → Remote Review)

**Trigger:** SubUser completes evaluation and submits

**Stores Updated:**
- `submissionStore`: New submission created
- `assetStore`: Status → `submitted` → `remote_review`
- `auditStore`: Submission logged
- `notificationStore`:
  - IT Admin notified (new submission)
  - Main Admin notified (work in queue)

**Code Location:** `submissionStore.submitDevice()`

---

### 3. Remote Review Decision (Technician)

**Trigger:** Technician reviews submission

**Stores Updated:**
- `reviewStore`: Remote review created
- `assetStore`: Status → `conditionally_accepted` OR `remote_rejected`
- `batchStore`: Metrics recalculated
- `auditStore`: Review logged
- `notificationStore`:
  - SubUser notified (device approved/rejected)
  - IT Admin notified

**Code Location:** `reviewStore.createRemoteReview()` → `workflow.handleRemoteReview()`

---

### 4. OPS Approval (Ready for Pickup)

**Trigger:** OPS Manager approves conditionally accepted devices

**Stores Updated:**
- `assetStore`: Status → `ready_for_pickup`
- `auditStore`: Approval logged
- `notificationStore`:
  - IT Admin notified (ready for pickup scheduling)
  - SubUser notified (device approved)

**Code Location:** `workflow.handleConditionallyAccepted()`

---

### 5. Pickup Request Creation (IT Admin)

**Trigger:** IT Admin creates pickup request

**Stores Updated:**
- `pickupStore`: New pickup request created
- `assetStore`: Status → `pickup_requested` for all assets
- `auditStore`: Request logged
- `notificationStore`:
  - Logistics Admin notified (new request)

**Code Location:** `pickupStore.createPickupRequest()`

---

### 6. Pickup Assignment (Logistics Admin)

**Trigger:** Logistics Admin assigns pickup to Logistics User

**Stores Updated:**
- `pickupStore`: Request status → `assigned`
- `notificationStore`:
  - Logistics User notified (new assignment)

**Code Location:** `pickupStore.assignPickupRequest()`

---

### 7. Pickup Scheduled

**Trigger:** Pickup request gets scheduled date

**Stores Updated:**
- `pickupStore`: Request status → `scheduled`
- `assetStore`: Status → `pickup_scheduled` for all assets
- `auditStore`: Status change logged
- `notificationStore`:
  - Logistics User notified
  - IT Admin notified
  - **All SubUsers notified** (pickup date/location)

**Code Location:** `pickupStore.updateRequestStatus()`

---

### 8. Pickup In Progress

**Trigger:** Logistics User starts pickup

**Stores Updated:**
- `pickupStore`: Request status → `in_progress`
- `auditStore`: Status change logged
- `notificationStore`:
  - IT Admin notified
  - **All SubUsers notified** (pickup started)

**Code Location:** `pickupStore.updateRequestStatus()`

---

### 9. Pickup Completion (Logistics User) ⭐ CRITICAL

**Trigger:** Logistics User completes pickup with QC results

**Stores Updated:**
- `pickupStore`: Request status → `completed` OR `partially_completed`
- `assetStore`:
  - Picked assets: `pickup_scheduled` → `picked_up` → `in_transit`
  - Failed assets: `pickup_scheduled` → `pickup_failed_qc` → `ready_for_pickup`
- `logisticsStore`: On-site QC records created
- `auditStore`:
  - Each asset pickup logged
  - Request completion logged
- `notificationStore`:
  - **SubUsers (success)**: "Device picked up successfully"
  - **SubUsers (failed)**: "Issue during pickup QC"
  - IT Admin: Pickup summary
  - Logistics Admin: Pickup summary
  - Main Admin (OPS): Oversight notification

**Code Location:** `pickupStore.completePickup()`

---

### 10. Warehouse Arrival

**Trigger:** Assets arrive at warehouse

**Stores Updated:**
- `assetStore`: Status → `facility_qc`
- `auditStore`: Arrival logged
- `notificationStore`:
  - IT Admin notified
  - Main Admin notified (QC queue)

**Code Location:** `workflow.handleAssetArrivedAtWarehouse()`

---

### 11. Facility QC (Warehouse Technician)

**Trigger:** Warehouse technician completes QC

**Stores Updated:**
- `reviewStore`: Facility QC record created
- `assetStore`:
  - Accept: `facility_qc` → `final_accepted` → `payout_pending`
  - Reject: `facility_qc` → `final_rejected`
- `batchStore`: Metrics recalculated
- `auditStore`: QC result logged
- `notificationStore`:
  - IT Admin notified
  - CFO notified (if payout ready)
  - SubUser notified (final status)

**Code Location:** `reviewStore.createFacilityQC()` → `workflow.handleFacilityQC()`

---

### 12. Payout Processing (CFO)

**Trigger:** CFO processes payout batch

**Stores Updated:**
- `payoutStore`: Payout record created
- `assetStore`: Status → `completed` for all assets
- `enterpriseStore`: Wallet balance updated (pending → available)
- `auditStore`: Payout logged
- `notificationStore`:
  - IT Admin notified
  - Enterprise admin notified

**Code Location:** `workflow.processPayoutBatch()`

---

## Notification Matrix

| Event | SubUser | IT Admin | Logistics Admin | Logistics User | Main Admin | CFO |
|-------|---------|----------|-----------------|----------------|------------|-----|
| Asset Assigned | ✅ | - | - | - | - | - |
| Submission Created | - | ✅ | - | - | ✅ | - |
| Remote Review Complete | ✅ | ✅ | - | - | - | - |
| Ready for Pickup | ✅ | ✅ | - | - | - | - |
| Pickup Request Created | - | - | ✅ | - | - | - |
| Pickup Assigned | - | - | - | ✅ | - | - |
| Pickup Scheduled | ✅ | ✅ | - | ✅ | - | - |
| Pickup In Progress | ✅ | ✅ | - | - | - | - |
| Pickup Completed | ✅ | ✅ | ✅ | - | ✅ | - |
| Asset at Warehouse | - | ✅ | - | - | ✅ | - |
| Facility QC Complete | ✅ | ✅ | - | - | ✅ | ✅ |
| Payout Processed | - | ✅ | - | - | - | ✅ |

---

## Audit Trail Events

Every significant action is logged to `auditStore` with:
- `entityType`: 'asset' | 'batch' | 'pickup' | 'user' | 'enterprise' | 'payout'
- `entityId`: ID of the entity
- `action`: Action performed
- `fromStatus`: Previous status (if applicable)
- `toStatus`: New status (if applicable)
- `actorId`: User who performed the action
- `metadata`: Additional context

---

## Testing Cross-Store Updates

To verify all updates propagate correctly:

1. **Check Asset Status**: After any workflow action, verify asset status in:
   - Asset Detail page
   - IT Admin Dashboard stats
   - SubUser Dashboard
   - Batch metrics

2. **Check Notifications**: After any workflow action, verify notifications appear for:
   - All relevant stakeholders per the Notification Matrix
   - Use RoleSwitcher to check each portal

3. **Check Audit Trail**: All actions should appear in audit log with correct:
   - Entity type and ID
   - Status transitions
   - Actor identification
