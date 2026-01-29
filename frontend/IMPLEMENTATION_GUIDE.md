# ECOTRIBE V3 IMPLEMENTATION GUIDE

**Version:** 3.1
**Last Updated:** December 2024
**Purpose:** Comprehensive checklist for implementing the V3 restructure

---

## TABLE OF CONTENTS

1. [Database Changes](#1-database-changes)
2. [Role System Changes](#2-role-system-changes)
3. [Data Layer Migration](#3-data-layer-migration)
4. [Component Updates](#4-component-updates)
5. [New Features](#5-new-features)
6. [File Cleanup](#6-file-cleanup)
7. [Testing Checklist](#7-testing-checklist)

---

## 1. DATABASE CHANGES

### 1.1 Run Migration

**File:** `supabase/migrations/008_v3_restructure.sql`

Run this migration in Supabase SQL Editor. It creates:

| Table | Purpose |
|-------|---------|
| `enterprise_applications` | Registration workflow with document upload |
| `branches` | Hierarchical structure (Enterprise → Branch → IT Admin) |

And alters:

| Table | Changes |
|-------|---------|
| `users` | Added `branch_id` column |
| `batches` | Added `branch_id`, pickup details, approval fields |
| `assets` | Added `branch_id`, `it_admin_id` columns |
| `pickup_requests` | Added `batch_id` column |

**Checklist:**
- [ ] Run migration in Supabase SQL Editor
- [ ] Verify `enterprise_applications` table created
- [ ] Verify `branches` table created
- [ ] Verify `users.branch_id` column exists
- [ ] Verify `batches.branch_id` column exists
- [ ] Verify `assets.branch_id` column exists
- [ ] Verify views created: `org_admin_asset_view`, `branch_summary`, `pickup_approval_queue`

### 1.2 Database Views

Three views are created for Org Admin portal:

```sql
-- 1. org_admin_asset_view: Nested view of all assets with branch/IT admin info
-- 2. branch_summary: Aggregated stats per branch
-- 3. pickup_approval_queue: Batches pending org_admin approval
```

---

## 2. ROLE SYSTEM CHANGES

### 2.1 Role Rename: CFO → Org Admin

**File:** `src/types/user.ts`

```typescript
// OLD
export type UserRole = '...' | 'cfo' | '...';

// NEW
export type UserRole = '...' | 'org_admin' | '...';
```

**Checklist:**
- [ ] Update `UserRole` type in `src/types/user.ts`
- [ ] Update `ROLE_LABELS` map
- [ ] Update `ROLE_PERMISSIONS` map
- [ ] Update `CFO_APPROVAL_THRESHOLDS` → `ORG_ADMIN_APPROVAL_THRESHOLDS`
- [ ] Search and replace all `cfo` references in codebase

### 2.2 Role Hierarchy

```typescript
export const ROLE_HIERARCHY = {
  super_admin: 4,    // Platform owner
  ops_admin: 3,      // Ecotribe operations
  org_admin: 2,      // Enterprise admin (was CFO)
  it_admin: 1,       // Branch-level IT admin
  sub_user: 0        // Employee with device
};
```

### 2.3 Files with CFO References to Update

Run this grep to find all references:
```bash
grep -r "cfo" --include="*.ts" --include="*.tsx" src/
```

**Known files:**
- [ ] `src/types/user.ts`
- [ ] `src/stores/authStore.ts`
- [ ] `src/stores/batchStore.ts`
- [ ] `src/stores/mockData.ts`
- [ ] `src/App.tsx`
- [ ] `src/components/auth/RoleSwitcher.tsx`
- [ ] `src/layouts/DashboardLayout.tsx`
- [ ] `src/pages/cfo/*` (entire directory)

---

## 3. DATA LAYER MIGRATION

### 3.1 Remove Zustand Stores

The goal is to remove localStorage persistence and query Supabase directly.

**Install React Query:**
```bash
npm install @tanstack/react-query
```

**Files to Delete (after hooks created):**
```
src/stores/assetStore.ts      → Replace with src/hooks/useAssets.ts
src/stores/batchStore.ts      → Replace with src/hooks/useBatches.ts
src/stores/subUserStore.ts    → Replace with src/hooks/useSubUsers.ts
src/stores/pickupStore.ts     → Replace with src/hooks/usePickups.ts
src/stores/logisticsStore.ts  → Replace with src/hooks/useLogistics.ts
src/stores/submissionStore.ts → Replace with src/hooks/useSubmissions.ts
src/stores/reviewStore.ts     → Replace with src/hooks/useReviews.ts
src/stores/payoutStore.ts     → Replace with src/hooks/usePayouts.ts
src/stores/enterpriseStore.ts → Replace with src/hooks/useEnterprises.ts
src/stores/bulkUploadStore.ts → Replace with src/hooks/useBulkUploads.ts
src/stores/auditStore.ts      → Replace with src/hooks/useAuditLogs.ts
src/stores/notificationStore.ts → Replace with src/hooks/useNotifications.ts
src/stores/mockData.ts        → DELETE
src/lib/bootstrap.ts          → DELETE
```

**Files to Keep:**
```
src/stores/authStore.ts  → Keep for session management (convert to hook later)
src/stores/themeStore.ts → Keep for UI preferences (local-only)
```

### 3.2 Create Database Query Layer

**Create:** `src/lib/db/queries.ts`

```typescript
import { supabase } from '@/lib/supabase';

// Assets
export async function fetchAssets(enterpriseId: string) {
  const { data, error } = await supabase
    .from('assets')
    .select(`
      *,
      sub_users(*),
      batches(*),
      branches(*)
    `)
    .eq('enterprise_id', enterpriseId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Batches
export async function fetchBatches(enterpriseId: string) {
  const { data, error } = await supabase
    .from('batches')
    .select(`*, branches(*)`)
    .eq('enterprise_id', enterpriseId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Branches
export async function fetchBranches(enterpriseId: string) {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('enterprise_id', enterpriseId)
    .order('branch_name');

  if (error) throw error;
  return data;
}

// Branch Summary (using view)
export async function fetchBranchSummary(enterpriseId: string) {
  const { data, error } = await supabase
    .from('branch_summary')
    .select('*')
    .eq('enterprise_id', enterpriseId);

  if (error) throw error;
  return data;
}

// Pickup Approval Queue (using view)
export async function fetchPickupApprovalQueue(enterpriseId: string) {
  const { data, error } = await supabase
    .from('pickup_approval_queue')
    .select('*')
    .eq('enterprise_id', enterpriseId);

  if (error) throw error;
  return data;
}
```

**Create:** `src/lib/db/mutations.ts`

```typescript
import { supabase } from '@/lib/supabase';

// Create Branch
export async function createBranch(branch: CreateBranchInput) {
  const { data, error } = await supabase
    .from('branches')
    .insert(branch)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Approve Pickup (Org Admin)
export async function approvePickupRequest(batchId: string, orgAdminId: string, notes?: string) {
  const { data, error } = await supabase
    .from('batches')
    .update({
      status: 'approved',
      approved_by: orgAdminId,
      approved_at: new Date().toISOString(),
      org_admin_notes: notes
    })
    .eq('id', batchId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Submit Enterprise Application
export async function submitEnterpriseApplication(application: EnterpriseApplicationInput) {
  const { data, error } = await supabase
    .from('enterprise_applications')
    .insert({
      ...application,
      application_ref: await generateApplicationRef(),
      status: 'pending'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### 3.3 Create React Query Hooks

**Create:** `src/hooks/useAssets.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAssets, createAsset, updateAsset, deleteAsset } from '@/lib/db/queries';

export function useAssets(enterpriseId: string) {
  return useQuery({
    queryKey: ['assets', enterpriseId],
    queryFn: () => fetchAssets(enterpriseId),
    enabled: !!enterpriseId,
    staleTime: 30_000, // 30 seconds
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAsset,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assets', variables.enterprise_id] });
    }
  });
}
```

**Checklist for hooks:**
- [ ] Create `src/hooks/useAssets.ts`
- [ ] Create `src/hooks/useBatches.ts`
- [ ] Create `src/hooks/useSubUsers.ts`
- [ ] Create `src/hooks/useBranches.ts`
- [ ] Create `src/hooks/usePickups.ts`
- [ ] Create `src/hooks/useLogistics.ts`
- [ ] Create `src/hooks/useEnterpriseApplications.ts`
- [ ] Add QueryClientProvider to App.tsx

### 3.4 Update Components to Use Hooks

**Before (Zustand):**
```typescript
const { assets, fetchAssets } = useAssetStore();

useEffect(() => {
  fetchAssets(enterpriseId);
}, [enterpriseId]);
```

**After (React Query):**
```typescript
const { data: assets, isLoading, error } = useAssets(enterpriseId);
```

---

## 4. COMPONENT UPDATES

### 4.1 Rename CFO Directory

```bash
mv src/pages/cfo src/pages/org-admin
```

**Files to rename/update:**
- [ ] `CFODashboard.tsx` → DELETE (duplicate)
- [ ] `Dashboard.tsx` → `OrgAdminDashboard.tsx`
- [ ] `BatchApprovals.tsx` → `PickupApprovals.tsx`
- [ ] Update all imports in `index.ts`

### 4.2 Update App.tsx Routes

**Remove:**
```typescript
<Route path="/cfo" ...>
```

**Add:**
```typescript
<Route path="/org-admin" element={
  <ProtectedRoute allowedRoles={['org_admin']}>
    <DashboardLayout role="org_admin" title="Organization Admin" navItems={orgAdminNavItems} />
  </ProtectedRoute>
}>
  <Route index element={<OrgAdminDashboard />} />
  <Route path="branches" element={<BranchManagement />} />
  <Route path="it-admins" element={<ITAdminManagement />} />
  <Route path="wallet" element={<CreditsWallet />} />
  <Route path="approvals" element={<PickupApprovals />} />
  <Route path="epr" element={<EPRCertificates />} />
  <Route path="assets" element={<OrgAdminAssetView />} />
  <Route path="batches" element={<OrgAdminBatchView />} />
</Route>
```

### 4.3 Update Navigation Items

**File:** `src/App.tsx` (or separate nav config file)

```typescript
const orgAdminNavItems = [
  { label: 'Dashboard', path: '/org-admin', icon: <DashboardIcon /> },
  { label: 'Branches', path: '/org-admin/branches', icon: <BranchIcon /> },
  { label: 'IT Admins', path: '/org-admin/it-admins', icon: <UsersIcon /> },
  { label: 'Credits Wallet', path: '/org-admin/wallet', icon: <WalletIcon /> },
  { label: 'Approvals', path: '/org-admin/approvals', icon: <ApprovalIcon /> },
  { label: 'EPR Certificates', path: '/org-admin/epr', icon: <DocumentIcon /> },
];
```

---

## 5. NEW FEATURES

### 5.1 Enterprise Registration Flow

**New Files to Create:**

| File | Description |
|------|-------------|
| `src/pages/auth/EnterpriseRegister.tsx` | Multi-step registration wizard |
| `src/components/registration/DocumentRequirements.tsx` | Document checklist modal |
| `src/components/registration/CompanyDetailsForm.tsx` | Step 1: Company info |
| `src/components/registration/OrgAdminDetailsForm.tsx` | Step 2: Admin info |
| `src/components/registration/DocumentUpload.tsx` | Step 3: Document upload |
| `src/components/registration/RegistrationSuccess.tsx` | Success page |

**Admin Review Interface:**

| File | Description |
|------|-------------|
| `src/pages/ops/EnterpriseApplications.tsx` | List pending applications |
| `src/components/applications/ApplicationReview.tsx` | Review/approve/reject |

### 5.2 Branch Management

**New Files to Create:**

| File | Description |
|------|-------------|
| `src/pages/org-admin/BranchManagement.tsx` | Branch list & CRUD |
| `src/components/branches/BranchCard.tsx` | Branch display card |
| `src/components/branches/BranchForm.tsx` | Add/Edit branch modal |
| `src/components/branches/BranchITAdmins.tsx` | IT Admins per branch |

### 5.3 Org Admin Portal

**New Files to Create:**

| File | Description |
|------|-------------|
| `src/pages/org-admin/Dashboard.tsx` | Combined org admin dashboard |
| `src/pages/org-admin/PickupApprovals.tsx` | Approve IT Admin pickup requests |
| `src/pages/org-admin/CreditsWallet.tsx` | Wallet & transaction history |
| `src/components/org-admin/ITAdminToggle.tsx` | Toggle for IT Admin view |
| `src/components/org-admin/NestedAssetView.tsx` | Branch → IT Admin → Batch → Asset tree |

### 5.4 Batch Approval Flow

**Files to Modify:**

| File | Changes |
|------|---------|
| `src/pages/admin/BatchCreate.tsx` | Add pickup details form |
| `src/pages/admin/BatchDetail.tsx` | Add "Submit for Approval" button |

**New Files:**

| File | Description |
|------|-------------|
| `src/components/batches/PickupDetailsForm.tsx` | Pickup location, date, time slot |
| `src/components/batches/SubmitForApprovalModal.tsx` | Confirmation modal |

---

## 6. FILE CLEANUP

### 6.1 Files to DELETE

```
# Empty/test files
src/pages/new_file.txt          ✅ DELETED
src/pages/new_file_2.txt        ✅ DELETED

# Outdated documentation
MISSING_UI_FLOWS.md             ✅ DELETED
NEXT_STEPS.md                   ✅ DELETED
PROGRESS.md                     ✅ DELETED

# Mock data (after React Query migration)
src/stores/mockData.ts          → DELETE
src/lib/bootstrap.ts            → DELETE

# Duplicate CFO dashboard
src/pages/cfo/CFODashboard.tsx  → DELETE

# Old Zustand stores (after hooks migration)
src/stores/assetStore.ts        → DELETE
src/stores/batchStore.ts        → DELETE
src/stores/subUserStore.ts      → DELETE
src/stores/pickupStore.ts       → DELETE
src/stores/logisticsStore.ts    → DELETE
src/stores/submissionStore.ts   → DELETE
src/stores/reviewStore.ts       → DELETE
src/stores/payoutStore.ts       → DELETE
src/stores/enterpriseStore.ts   → DELETE
src/stores/bulkUploadStore.ts   → DELETE
src/stores/auditStore.ts        → DELETE
src/stores/notificationStore.ts → DELETE
```

### 6.2 Files to UPDATE

```
CLAUDE.md                       → Update architecture section
DATABASE_ARCHITECTURE.md        → Add branches, org_admin info
```

---

## 7. TESTING CHECKLIST

### 7.1 Database Tests

- [ ] Can create enterprise_application record
- [ ] Can create branch record
- [ ] Can link IT Admin to branch
- [ ] Can link batch to branch
- [ ] Can link asset to branch
- [ ] `org_admin_asset_view` returns correct data
- [ ] `branch_summary` returns correct aggregates
- [ ] `pickup_approval_queue` shows pending approvals

### 7.2 Role Tests

- [ ] Org Admin can login (was CFO)
- [ ] Org Admin sees correct dashboard
- [ ] Org Admin can view branches
- [ ] Org Admin can approve pickups
- [ ] IT Admin is scoped to their branch
- [ ] Role hierarchy is enforced

### 7.3 Flow Tests

**Enterprise Registration:**
- [ ] User can fill registration form
- [ ] Documents upload to Supabase Storage
- [ ] Application appears in admin queue
- [ ] Admin can approve/reject
- [ ] Approved enterprise gets wallet

**Branch Management:**
- [ ] Org Admin can create branch
- [ ] Org Admin can edit branch
- [ ] Org Admin can assign IT Admin to branch
- [ ] IT Admin sees only their branch's assets

**Pickup Approval:**
- [ ] IT Admin can submit batch for approval
- [ ] Org Admin sees pending approval
- [ ] Org Admin can approve with notes
- [ ] Approval auto-initiates pickup request
- [ ] Sub-users get notified

### 7.4 Data Layer Tests

- [ ] React Query fetches data on mount
- [ ] Mutations invalidate correct queries
- [ ] Loading states display correctly
- [ ] Error states display correctly
- [ ] No localStorage data dependency

---

## QUICK REFERENCE

### New Database Tables
- `enterprise_applications` - Registration workflow
- `branches` - Hierarchical structure

### New Database Views
- `org_admin_asset_view` - Nested asset view
- `branch_summary` - Branch statistics
- `pickup_approval_queue` - Approval queue

### New React Hooks
- `useAssets()` - Replace assetStore
- `useBatches()` - Replace batchStore
- `useBranches()` - New for branch management
- `useSubUsers()` - Replace subUserStore
- `usePickups()` - Replace pickupStore
- `useEnterpriseApplications()` - New for registration

### Key Routes
- `/org-admin` - Organization Admin portal (was /cfo)
- `/org-admin/branches` - Branch management
- `/org-admin/approvals` - Pickup approval queue
- `/register/enterprise` - New enterprise registration

---

*This guide is the authoritative reference for V3 implementation. The changesV3.md file contains the detailed UI specifications.*
