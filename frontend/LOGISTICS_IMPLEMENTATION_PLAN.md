# Logistics Flow Implementation Plan

## Overview
Implement the complete logistics workflow as specified in the PRD, enabling IT Admins to initiate pickups, Logistics Admins to manage operations, and Logistics Users to perform on-site QC.

---

## Phase 1: Data Model & Type Definitions

### 1.1 Create Pickup Location Type
**File:** `src/types/location.ts`

```typescript
export interface PickupLocation {
  id: string;
  enterpriseId: string;
  name: string; // e.g., "Bangalore HQ"
  address: {
    street: string;
    city: string;
    state: string;
    pinCode: string;
    country: string;
  };
  contactPerson: string;
  contactPhone: string;
  operatingHours: string; // e.g., "Mon-Fri, 9 AM - 6 PM"
  specialInstructions?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateLocationInput {
  name: string;
  address: Address;
  contactPerson: string;
  contactPhone: string;
  operatingHours: string;
  specialInstructions?: string;
  isDefault?: boolean;
}
```

### 1.2 Create Pickup Request Type
**File:** `src/types/pickup.ts`

```typescript
export type PickupRequestStatus =
  | 'pending' // Created, waiting for logistics admin assignment
  | 'assigned' // Assigned to logistics user
  | 'scheduled' // Date/time confirmed
  | 'in_progress' // Logistics user on-site
  | 'completed' // All devices processed
  | 'cancelled' // IT Admin cancelled
  | 'exception'; // Issues occurred

export interface PickupRequest {
  id: string;
  enterpriseId: string;
  createdBy: string; // IT Admin user ID
  assetIds: string[]; // Assets included in this pickup

  // Location details
  locationId: string;
  location: PickupLocation;

  // Scheduling
  preferredDate?: Date;
  preferredTimeSlot?: string; // e.g., "2-4 PM"
  scheduledDate?: Date;
  scheduledTimeSlot?: string;
  priority: 'normal' | 'urgent';

  // Assignment
  logisticsAdminId?: string;
  logisticsUserId?: string;
  assignedAt?: Date;

  // Status
  status: PickupRequestStatus;
  notes?: string; // IT Admin notes for logistics

  // Tracking
  createdAt: Date;
  updatedAt?: Date;
  completedAt?: Date;
}

export interface PickupRequestSummary {
  totalDevices: number;
  pickedUp: number;
  failed: number;
  pending: number;
}
```

### 1.3 Create On-Site QC Type
**File:** `src/types/logistics.ts`

```typescript
export type OnSiteQCResult = 'pass' | 'fail';

export interface OnSiteQC {
  id: string;
  assetId: string;
  pickupRequestId: string;
  logisticsUserId: string;

  // QC Checks
  serialMatch: boolean;
  damageMatch: 'yes' | 'no' | 'worse';
  powersOn: boolean;

  // Results
  result: OnSiteQCResult;
  notes?: string;
  failureReason?: string;

  // Proof
  devicePhoto?: string;
  handoverPhoto?: string;
  personName: string;
  gpsCoordinates?: { lat: number; lng: number };

  timestamp: Date;
}

export interface PickupProof {
  id: string;
  assetId: string;
  pickupRequestId: string;
  logisticsUserId: string;
  devicePhoto: string;
  handoverPhoto: string;
  personName: string;
  personId?: string; // Employee ID
  signature?: string;
  gpsCoordinates: { lat: number; lng: number };
  timestamp: Date;
}
```

### 1.4 Update Asset Status Flow
**File:** `src/types/asset.ts`

Update the status flow to include logistics statuses:
```typescript
export const assetStatusFlow: Record<AssetStatus, AssetStatus[]> = {
  pending_assignment: ['assigned'],
  assigned: ['check_in_started'],
  check_in_started: ['submitted'],
  submitted: ['remote_review'],
  remote_review: ['conditionally_accepted', 'remote_rejected'],
  conditionally_accepted: ['pickup_requested'], // NEW
  pickup_requested: ['pickup_scheduled'], // NEW
  pickup_scheduled: ['onsite_qc'], // NEW
  onsite_qc: ['in_transit', 'pickup_failed'], // NEW
  pickup_failed: ['pickup_requested'], // Can retry
  in_transit: ['facility_qc'],
  facility_qc: ['final_accepted', 'final_rejected'],
  // ... rest of the flow
};
```

---

## Phase 2: Zustand Stores

### 2.1 Location Store
**File:** `src/stores/locationStore.ts`

```typescript
interface LocationState {
  locations: PickupLocation[];
  isLoading: boolean;

  // Actions
  fetchLocations: (enterpriseId: string) => Promise<void>;
  getLocationById: (id: string) => PickupLocation | undefined;
  createLocation: (input: CreateLocationInput) => Promise<PickupLocation>;
  updateLocation: (id: string, input: Partial<CreateLocationInput>) => Promise<PickupLocation>;
  deleteLocation: (id: string) => Promise<void>;
  setDefaultLocation: (id: string) => Promise<void>;
}
```

### 2.2 Pickup Store
**File:** `src/stores/pickupStore.ts`

```typescript
interface PickupState {
  pickupRequests: PickupRequest[];
  onSiteQCs: OnSiteQC[];
  pickupProofs: PickupProof[];
  isLoading: boolean;

  // Actions
  fetchPickupRequests: (enterpriseId?: string) => Promise<void>;
  getPickupRequestById: (id: string) => PickupRequest | undefined;

  // IT Admin Actions
  createPickupRequest: (input: CreatePickupRequestInput) => Promise<PickupRequest>;
  updatePickupRequest: (id: string, updates: Partial<PickupRequest>) => Promise<void>;
  cancelPickupRequest: (id: string) => Promise<void>;

  // Logistics Admin Actions
  assignPickup: (requestId: string, logisticsUserId: string, scheduledDate: Date, timeSlot: string) => Promise<void>;

  // Logistics User Actions
  performOnSiteQC: (input: OnSiteQC) => Promise<void>;
  uploadPickupProof: (input: PickupProof) => Promise<void>;
  completePickup: (requestId: string) => Promise<void>;

  // Queries
  getReadyForPickupAssets: (enterpriseId: string) => Asset[];
  getPickupsByStatus: (status: PickupRequestStatus) => PickupRequest[];
}
```

---

## Phase 3: Enterprise Locations Management

### 3.1 Locations List Page
**File:** `src/pages/admin/PickupLocations.tsx`

**Features:**
- List all enterprise pickup locations
- Add new location button
- Edit/Delete actions
- Set default location
- Activate/Deactivate locations

**UI Components:**
- Table with location details
- Add/Edit location modal/form
- Confirmation dialogs
- Default location badge

### 3.2 Location Form
**File:** `src/components/admin/LocationForm.tsx`

**Fields:**
- Location name
- Full address (street, city, state, pin code)
- Contact person name & phone
- Operating hours (text or time picker)
- Special instructions (textarea)
- Set as default checkbox
- Active/Inactive toggle

### 3.3 Add to IT Admin Routes
**File:** `src/App.tsx`

```typescript
// IT Admin routes
<Route path="pickup-locations" element={<PickupLocations />} />
<Route path="pickup-locations/new" element={<LocationForm />} />
<Route path="pickup-locations/:locationId" element={<LocationForm />} />
```

---

## Phase 4: IT Admin Pickup Initiation

### 4.1 "Ready for Pickup" Assets View
**File:** `src/pages/admin/ReadyForPickup.tsx`

**Features:**
- Filter assets with status `conditionally_accepted`
- Multi-select checkboxes
- Filter by department, location, date
- Search by employee name/serial number
- Bulk actions toolbar
- Asset details preview

**Columns:**
- Checkbox
- Device (brand, model, serial)
- Employee name
- Evaluation date
- Department
- Actions

### 4.2 Pickup Initiation Flow
**File:** `src/pages/admin/InitiatePickup.tsx`

**Step 1: Review Selected Assets**
- List of selected assets
- Total count
- Remove individual assets

**Step 2: Select Pickup Location**
- Dropdown of saved locations
- "Add New Location" option
- Show full address & contact details

**Step 3: Set Pickup Details**
- Preferred date (date picker)
- Preferred time slot (dropdown)
- Priority (Normal/Urgent)
- Notes for logistics team (textarea)

**Step 4: Review & Confirm**
- Summary of all details
- List of Sub-Users to be notified
- Confirm button

### 4.3 Pickup Requests Dashboard
**File:** `src/pages/admin/PickupRequests.tsx`

**Tabs:**
- Pending Assignment
- Scheduled
- In Progress
- Completed
- Exceptions

**For each request:**
- Request ID
- Devices count
- Location
- Status
- Assigned logistics user (if assigned)
- Scheduled date/time
- Actions (View Details, Cancel, Edit)

### 4.4 Pickup Request Detail View
**File:** `src/pages/admin/PickupRequestDetail.tsx`

**Sections:**
- Request summary (ID, status, dates)
- Location details
- Logistics assignment (admin, user, contact)
- Timeline visualization
- Device status table (asset, employee, status, notes)
- Actions (Edit, Cancel, Contact Logistics, Notify Employees)

### 4.5 Update IT Admin Dashboard
**File:** `src/pages/admin/Dashboard.tsx`

**Add widgets:**
- "Ready for Pickup" count with CTA
- "Pending Pickup Requests" count
- "In Progress Pickups" count

---

## Phase 5: Logistics Admin Portal

### 5.1 Logistics Admin Dashboard
**File:** `src/pages/logistics/Dashboard.tsx`

**Widgets:**
- Today's Pickups (scheduled count)
- In Progress (current count)
- Completed Today (count)
- Exceptions (count)
- Unassigned Pickups (count)

**Recent Activity:**
- Latest pickup requests
- Recent completions
- Active exceptions

### 5.2 Assignment Queue
**File:** `src/pages/logistics/AssignmentQueue.tsx`

**Features:**
- List of unassigned pickup requests
- Enterprise name, location, devices count
- Preferred date/time
- Priority indicator
- Assign to logistics user action
- Batch assignment

### 5.3 Assign Pickup Modal
**File:** `src/components/logistics/AssignPickupModal.tsx`

**Fields:**
- Select Logistics User (dropdown)
- Confirm scheduled date
- Confirm time slot
- Additional notes
- Assign button

### 5.4 Logistics Users Management
**File:** `src/pages/logistics/LogisticsUsers.tsx`

**Features:**
- List all logistics users
- Add new user
- View performance metrics
- Activate/Deactivate
- Assigned pickups count

### 5.5 Monitor Progress
**File:** `src/pages/logistics/MonitorProgress.tsx`

**Features:**
- Real-time pickup status
- Map view (optional)
- Filter by status, user, date
- Device-level status
- Exception handling

---

## Phase 6: Logistics User Portal

### 6.1 Logistics User Dashboard
**File:** `src/pages/logistics-user/Dashboard.tsx`

**Mobile-first design:**
- My Assignments (today)
- Upcoming Assignments
- Completed Today
- Quick actions

### 6.2 Assignment Detail & Navigation
**File:** `src/pages/logistics-user/AssignmentDetail.tsx`

**Features:**
- Pickup request details
- Location with map link
- Contact information (IT Admin)
- Device list
- Start Pickup button

### 6.3 On-Site QC Flow
**File:** `src/pages/logistics-user/OnSiteQC.tsx`

**Step-by-step for each device:**

**Step 1: Serial Verification**
- Input field (manual entry or scanner)
- Compare with expected serial
- Match indicator (✓/✗)

**Step 2: Damage Verification**
- Show reported damages from evaluation
- Checklist to confirm each damage
- "Damage matches report?" (Yes/No/Worse than reported)
- Notes field

**Step 3: Power On Test**
- Instruction: "Ask user to power on device"
- "Device powers on?" (Yes/No)
- If No, auto-mark as fail

**Step 4: QC Result**
- Auto-calculated based on checks
- Pass: Pick up device
- Fail: Do NOT pick up, explain to user
- Capture proof if passed

**Step 5: Pickup Proof (if passed)**
- Photo of device
- Photo of person handing over
- Person's name confirmation
- GPS auto-capture
- Submit

### 6.4 Pickup Summary
**File:** `src/pages/logistics-user/PickupSummary.tsx`

**Features:**
- List of picked devices (count)
- List of failed devices (count)
- Delivery to warehouse button
- Completion confirmation

### 6.5 Delivery Confirmation
**File:** `src/pages/logistics-user/DeliveryConfirmation.tsx`

**Features:**
- Warehouse location
- Scan/Enter warehouse receipt
- Handover confirmation
- Complete pickup button

---

## Phase 7: Integration & Status Flow

### 7.1 Update Asset Status Transitions
**File:** `src/stores/assetStore.ts`

**Add new status update functions:**
- `markReadyForPickup(assetId)` - After conditionally_accepted
- `createPickupRequest(assetIds)` - Set status to pickup_requested
- `schedulePickup(assetIds)` - Set status to pickup_scheduled
- `performOnSiteQC(assetId, result)` - Set to in_transit or pickup_failed
- `deliverToWarehouse(assetIds)` - Set to facility_qc

### 7.2 Update SubmissionDetail Component
**File:** `src/pages/admin/SubmissionDetail.tsx`

**Changes to approve/reject flow:**
```typescript
const handleApprove = async () => {
  await updateAssetStatus(asset.id, 'conditionally_accepted');
  // Status: conditionally_accepted = "Ready for Pickup"
  alert('Device approved! Now ready for pickup initiation.');
  navigate('/admin/ready-for-pickup');
};
```

### 7.3 Update RemoteReviewQueue
**File:** `src/pages/ops/RemoteReviewQueue.tsx`

**Add filter:**
- "Conditionally Accepted (Ready for Pickup)" tab

### 7.4 Connect IT Admin Flow
**File:** `src/pages/admin/Dashboard.tsx`

**Update status counts:**
- Show "Ready for Pickup" count
- Link to ReadyForPickup page
- Show "Pending Pickup Requests" count
- Link to PickupRequests page

---

## Phase 8: Notifications & Updates

### 8.1 Notification Types

**To Sub-Users:**
```typescript
// When IT Admin initiates pickup
{
  type: 'pickup_scheduled',
  title: 'Device Pickup Scheduled',
  message: 'Bring your laptop to [Location] on [Date] at [Time]',
  data: {
    assetId,
    location,
    date,
    timeSlot,
    contactPerson,
    contactPhone
  }
}

// Reminder (1 day before)
{
  type: 'pickup_reminder',
  title: 'Pickup Tomorrow',
  message: 'Reminder: Bring your device tomorrow...'
}

// Pickup confirmed
{
  type: 'pickup_confirmed',
  title: 'Device Handed Over',
  message: 'Your device has been successfully picked up'
}
```

**To IT Admin:**
```typescript
// When logistics user assigned
{
  type: 'pickup_assigned',
  title: 'Pickup Assigned',
  message: 'Pickup request assigned to [Logistics User]'
}

// When pickup starts
{
  type: 'pickup_started',
  title: 'Pickup In Progress',
  message: 'Logistics user arrived at location'
}

// When device picked up
{
  type: 'device_picked',
  title: 'Device Picked Up',
  message: '[Device] picked up successfully'
}

// When device fails on-site QC
{
  type: 'onsite_qc_failed',
  title: 'Pickup Failed',
  message: '[Device] failed on-site QC - [Reason]'
}
```

**To Logistics Users:**
```typescript
// New assignment
{
  type: 'new_assignment',
  title: 'New Pickup Assignment',
  message: 'You have been assigned a pickup at [Location]'
}
```

---

## Implementation Order (Recommended)

### Week 1: Foundation
1. ✅ Create all type definitions
2. ✅ Create location store
3. ✅ Create pickup store
4. ✅ Update asset status flow

### Week 2: IT Admin Features
1. ✅ Build Pickup Locations management
2. ✅ Build "Ready for Pickup" view
3. ✅ Build Pickup Initiation flow
4. ✅ Build Pickup Requests dashboard
5. ✅ Update IT Admin dashboard

### Week 3: Logistics Admin
1. ✅ Build Logistics Admin dashboard
2. ✅ Build Assignment Queue
3. ✅ Build Logistics Users management
4. ✅ Build Monitor Progress view

### Week 4: Logistics User
1. ✅ Build Logistics User dashboard (mobile-first)
2. ✅ Build On-Site QC flow
3. ✅ Build Pickup Proof capture
4. ✅ Build Delivery Confirmation

### Week 5: Integration & Polish
1. ✅ Connect all status transitions
2. ✅ Implement notifications
3. ✅ Test entire flow end-to-end
4. ✅ Fix bugs and edge cases
5. ✅ Update documentation

---

## Testing Checklist

### IT Admin Flow
- [ ] Can create and manage pickup locations
- [ ] Can see "Ready for Pickup" assets
- [ ] Can initiate pickup for single asset
- [ ] Can initiate pickup for batch
- [ ] Can select location from saved list
- [ ] Can set preferred date/time
- [ ] Can view pickup request status
- [ ] Can track logistics assignment
- [ ] Can see device-level status
- [ ] Can cancel pickup request
- [ ] Receives notifications at each step

### Logistics Admin Flow
- [ ] Can see unassigned pickup requests
- [ ] Can assign to logistics user
- [ ] Can set scheduled date/time
- [ ] Can monitor progress
- [ ] Can handle exceptions
- [ ] Can view performance metrics

### Logistics User Flow
- [ ] Can see assigned pickups
- [ ] Can navigate to location
- [ ] Can perform on-site QC for each device
- [ ] Serial verification works correctly
- [ ] Damage verification works correctly
- [ ] Power on test works correctly
- [ ] Can upload pickup proof
- [ ] Can mark pickup complete
- [ ] Can confirm delivery to warehouse
- [ ] Receives WhatsApp notifications

### Sub-User Flow
- [ ] Receives pickup notification after IT Admin initiates
- [ ] Notification shows correct location & time
- [ ] Receives reminder 1 day before
- [ ] Receives confirmation after handover
- [ ] Can track device status in dashboard

### Status Flow
- [ ] Asset transitions: conditionally_accepted → pickup_requested
- [ ] Asset transitions: pickup_requested → pickup_scheduled
- [ ] Asset transitions: pickup_scheduled → onsite_qc
- [ ] Asset transitions: onsite_qc → in_transit (if passed)
- [ ] Asset transitions: onsite_qc → pickup_failed (if failed)
- [ ] Asset transitions: in_transit → facility_qc
- [ ] Failed pickups can be retried

---

## Files to Create (Summary)

### Types
- `src/types/location.ts`
- `src/types/pickup.ts`
- `src/types/logistics.ts` (update)

### Stores
- `src/stores/locationStore.ts`
- `src/stores/pickupStore.ts`

### IT Admin Pages
- `src/pages/admin/PickupLocations.tsx`
- `src/pages/admin/ReadyForPickup.tsx`
- `src/pages/admin/InitiatePickup.tsx`
- `src/pages/admin/PickupRequests.tsx`
- `src/pages/admin/PickupRequestDetail.tsx`

### IT Admin Components
- `src/components/admin/LocationForm.tsx`
- `src/components/admin/PickupRequestCard.tsx`
- `src/components/admin/AssetSelectionTable.tsx`

### Logistics Admin Pages
- `src/pages/logistics/Dashboard.tsx`
- `src/pages/logistics/AssignmentQueue.tsx`
- `src/pages/logistics/LogisticsUsers.tsx`
- `src/pages/logistics/MonitorProgress.tsx`

### Logistics Admin Components
- `src/components/logistics/AssignPickupModal.tsx`
- `src/components/logistics/PickupCard.tsx`

### Logistics User Pages
- `src/pages/logistics-user/Dashboard.tsx`
- `src/pages/logistics-user/AssignmentDetail.tsx`
- `src/pages/logistics-user/OnSiteQC.tsx`
- `src/pages/logistics-user/PickupSummary.tsx`
- `src/pages/logistics-user/DeliveryConfirmation.tsx`

### Logistics User Components
- `src/components/logistics-user/QCChecklist.tsx`
- `src/components/logistics-user/ProofCapture.tsx`
- `src/components/logistics-user/DeviceCard.tsx`

---

## API Integration Points (Future)

When backend is ready, these endpoints will be needed:

### Locations
- `GET /api/locations?enterpriseId={id}`
- `POST /api/locations`
- `PUT /api/locations/:id`
- `DELETE /api/locations/:id`

### Pickup Requests
- `GET /api/pickup-requests?enterpriseId={id}`
- `POST /api/pickup-requests`
- `PUT /api/pickup-requests/:id`
- `DELETE /api/pickup-requests/:id`
- `POST /api/pickup-requests/:id/assign`
- `POST /api/pickup-requests/:id/cancel`

### On-Site QC
- `POST /api/onsite-qc`
- `POST /api/pickup-proof`
- `POST /api/pickup-requests/:id/complete`

### Notifications
- `POST /api/notifications/pickup-scheduled`
- `POST /api/notifications/pickup-reminder`
- `POST /api/notifications/pickup-confirmed`

---

## Notes

1. **Mobile-First:** Logistics User portal must be fully mobile-responsive
2. **Offline Support:** Consider adding offline QC capability (sync later)
3. **Photo Compression:** Compress photos before upload to save bandwidth
4. **GPS Accuracy:** Handle cases where GPS is unavailable
5. **WhatsApp Integration:** Use WhatsApp API for logistics user notifications
6. **Real-time Updates:** Consider WebSocket for live status updates
7. **Barcode Scanner:** Integrate camera-based serial number scanning
8. **Map Integration:** Use Google Maps API for navigation
