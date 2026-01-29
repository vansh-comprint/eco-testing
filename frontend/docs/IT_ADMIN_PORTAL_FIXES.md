# IT Admin Portal Connection Fixes - V3.2

## Executive Summary

The IT Admin portal has **critical UI-database disconnections**. Pages are using enterprise-wide hooks (`useAssets(enterpriseId)`, `useBatches(enterpriseId)`) instead of IT Admin-scoped hooks (`useAssetsByITAdmin(userId)`, `useBatchesByITAdmin(userId)`).

**Impact**: IT Admins can see data from ALL branches across the enterprise instead of only their assigned branches. This is a **data security/visibility issue**.

---

## Background: V3.2 Schema Change

### Old Schema (V3.0)
- `users.branch_id` → Branch (1 IT Admin belongs to 1 Branch)
- Relationship: Many IT Admins → One Branch

### New Schema (V3.2)
- `branches.it_admin_id` → User (Each Branch has 1 IT Admin)
- Relationship: One IT Admin → Many Branches
- IT Admin can manage multiple branches

### How Filtering Works
1. Get IT Admin's user ID
2. Query branches where `it_admin_id = userId`
3. Filter assets/batches/pickups by those branch IDs

---

## Detailed Task List

### PHASE 1: Fix IT Admin Portal Pages

Each file below needs the import and hook changes documented.

---

#### Task 1: BatchList.tsx ✅ COMPLETED

**File**: `src/pages/admin/BatchList.tsx`

**Changes Made**:
```typescript
// Import change (line 20)
- import { useAuth, useBatches, useAssets, useUpdateBatch } from '@/hooks';
+ import { useAuth, useBatchesByITAdmin, useAssetsByITAdmin, useUpdateBatch } from '@/hooks';

// Variable change (line 51)
- const enterpriseId = enterprise?.id || '';
+ const userId = user?.id || '';

// Hook change (lines 54-55)
- const { data: batches = [], isLoading: batchesLoading } = useBatches(enterpriseId);
- const { data: assets = [], isLoading: assetsLoading } = useAssets(enterpriseId);
+ const { data: batches = [], isLoading: batchesLoading } = useBatchesByITAdmin(userId);
+ const { data: assets = [], isLoading: assetsLoading } = useAssetsByITAdmin(userId);
```

---

#### Task 2: AssetList.tsx ✅ COMPLETED

**File**: `src/pages/admin/AssetList.tsx`

**Changes Made**:
```typescript
// Import change (line 25)
- import { useAuth, useAssets, useBatches, useSubUsers, ... } from '@/hooks';
+ import { useAuth, useAssetsByITAdmin, useBatchesByITAdmin, useSubUsers, ... } from '@/hooks';

// Variable change (line 53)
+ const userId = user?.id || '';

// Hook change (lines 60-62)
- const { data: assets = [], isLoading: assetsLoading } = useAssets(enterpriseId);
- const { data: batches = [], isLoading: batchesLoading } = useBatches(enterpriseId);
+ const { data: assets = [], isLoading: assetsLoading } = useAssetsByITAdmin(userId);
+ const { data: batches = [], isLoading: batchesLoading } = useBatchesByITAdmin(userId);
// Note: subUsers stays as useSubUsers(enterpriseId) - enterprise-wide is intentional
```

---

#### Task 3: AddAsset.tsx ✅ COMPLETED

**File**: `src/pages/admin/AddAsset.tsx`

**Changes Made**:
```typescript
// Import change (line 6)
- import { useAuth, useCreateAsset, useBatches } from '@/hooks';
+ import { useAuth, useCreateAsset, useBatchesByITAdmin } from '@/hooks';

// Variable change (lines 15-16)
- const { enterprise } = useAuth();
- const enterpriseId = enterprise?.id || '';
+ const { enterprise, user } = useAuth();
+ const userId = user?.id || '';

// Hook change (line 19)
- const { data: batches = [] } = useBatches(enterpriseId);
+ const { data: batches = [] } = useBatchesByITAdmin(userId);
```

---

#### Task 4: BatchDetail.tsx ⏳ PENDING

**File**: `src/pages/admin/BatchDetail.tsx`

**Current Code** (lines 21, 34, 41-42):
```typescript
import { useAuth, useBatches, useAssets, useSubmitBatchForApproval, ... } from '@/hooks';
// ...
const enterpriseId = enterprise?.id || '';
// ...
const { data: batches = [], isLoading: batchesLoading } = useBatches(enterpriseId);
const { data: assets = [], isLoading: assetsLoading } = useAssets(enterpriseId);
```

**Required Changes**:
```typescript
import { useAuth, useBatchesByITAdmin, useAssetsByITAdmin, useSubmitBatchForApproval, ... } from '@/hooks';
// ...
const userId = user?.id || '';
// ...
const { data: batches = [], isLoading: batchesLoading } = useBatchesByITAdmin(userId);
const { data: assets = [], isLoading: assetsLoading } = useAssetsByITAdmin(userId);
```

---

#### Task 5: PickupRequests.tsx ⏳ PENDING

**File**: `src/pages/admin/PickupRequests.tsx`

**Current Code** (lines 20, 52, 57):
```typescript
import { useAuth, usePickupRequests, usePickupLocations, useAssets } from '@/hooks';
// ...
const enterpriseId = enterprise?.id || '';
// ...
const { data: assets = [], isLoading: assetsLoading } = useAssets(enterpriseId);
```

**Required Changes**:
```typescript
import { useAuth, usePickupRequests, usePickupLocations, useAssetsByITAdmin } from '@/hooks';
// ...
const userId = user?.id || '';
// ...
const { data: assets = [], isLoading: assetsLoading } = useAssetsByITAdmin(userId);
```

**Note**: Pickup requests themselves don't have `usePickupsByITAdmin` yet. Will add in Phase 2.

---

#### Task 6: InitiatePickup.tsx ⏳ PENDING

**File**: `src/pages/admin/InitiatePickup.tsx`

**Current Code** (lines 16, 37, 41):
```typescript
import { useAuth, usePickupLocations, useAssets, useCreatePickupRequest } from '@/hooks';
// ...
const enterpriseId = enterprise?.id || '';
// ...
const { data: assets = [], isLoading: assetsLoading } = useAssets(enterpriseId);
```

**Required Changes**:
```typescript
import { useAuth, usePickupLocations, useAssetsByITAdmin, useCreatePickupRequest } from '@/hooks';
// ...
const userId = user?.id || '';
// ...
const { data: assets = [], isLoading: assetsLoading } = useAssetsByITAdmin(userId);
```

---

#### Task 7: SubUserList.tsx ⏳ PENDING

**File**: `src/pages/admin/SubUserList.tsx`

**Current Code** (line ~48):
```typescript
const { data: assets = [], isLoading: assetsLoading } = useAssets(enterpriseId);
```

**Required Changes**:
```typescript
const userId = user?.id || '';
// ...
const { data: assets = [], isLoading: assetsLoading } = useAssetsByITAdmin(userId);
// Note: subUsers stays enterprise-wide
```

---

#### Task 8: AssetDetail.tsx ⏳ PENDING

**File**: `src/pages/admin/AssetDetail.tsx`

**Current Code** (lines ~63-65):
```typescript
const { data: assets = [] } = useAssets(enterpriseId);
const { data: batches = [] } = useBatches(enterpriseId);
const { data: subUsers = [] } = useSubUsers(enterpriseId);
```

**Required Changes**:
```typescript
const userId = user?.id || '';
// ...
const { data: assets = [] } = useAssetsByITAdmin(userId);
const { data: batches = [] } = useBatchesByITAdmin(userId);
const { data: subUsers = [] } = useSubUsers(enterpriseId); // Keep enterprise-wide
```

---

#### Task 9: UploadAssets.tsx ⏳ PENDING

**File**: `src/pages/admin/UploadAssets.tsx`

**Current Code** (line ~44):
```typescript
const { data: batches = [] } = useBatches(enterpriseId);
```

**Required Changes**:
```typescript
const userId = user?.id || '';
// ...
const { data: batches = [] } = useBatchesByITAdmin(userId);
```

---

### PHASE 2: Add Pickup IT Admin Hook

The pickup requests need a new IT Admin-scoped hook. Currently `usePickupRequests(enterpriseId)` returns all pickups for the enterprise.

---

#### Task 10: Add fetchPickupsByITAdmin Query

**File**: `src/lib/db/queries.ts`

**Add this function**:
```typescript
// Fetch pickup requests for IT Admin (across all their assigned branches)
export async function fetchPickupsByITAdmin(itAdminId: string) {
  // Step 1: Get the branch IDs this IT admin manages
  const { data: branches, error: branchError } = await supabase
    .from('branches')
    .select('id')
    .eq('it_admin_id', itAdminId);

  if (branchError) throw branchError;

  const branchIds = branches?.map(b => b.id) || [];

  if (branchIds.length === 0) {
    return []; // IT Admin has no assigned branches
  }

  // Step 2: Get batches from these branches
  const { data: batchIds, error: batchError } = await supabase
    .from('batches')
    .select('id')
    .in('branch_id', branchIds);

  if (batchError) throw batchError;

  const batchIdList = batchIds?.map(b => b.id) || [];

  if (batchIdList.length === 0) {
    return []; // No batches in IT Admin's branches
  }

  // Step 3: Get pickup requests for those batches
  const { data, error } = await supabase
    .from('pickup_requests')
    .select(`
      *,
      batches:batch_id(*),
      pickup_locations:pickup_location_id(*)
    `)
    .in('batch_id', batchIdList)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
```

---

#### Task 11: Add usePickupsByITAdmin Hook

**File**: `src/hooks/usePickups.ts`

**Add to pickupKeys**:
```typescript
export const pickupKeys = {
  all: ['pickups'] as const,
  // ... existing keys
  byITAdmin: (userId: string) => [...pickupKeys.all, 'it-admin', userId] as const,
};
```

**Add hook**:
```typescript
/**
 * Fetch pickup requests for IT Admin (across all their assigned branches)
 * V3.2: IT Admin can manage multiple branches
 */
export function usePickupsByITAdmin(userId: string) {
  return useQuery({
    queryKey: pickupKeys.byITAdmin(userId),
    queryFn: () => fetchPickupsByITAdmin(userId),
    enabled: !!userId,
    staleTime: 30000,
  });
}
```

---

#### Task 12: Export New Hook

**File**: `src/hooks/index.ts`

**Add to usePickups exports**:
```typescript
export {
  // ... existing exports
  usePickupsByITAdmin,  // Add this
  pickupKeys,
} from './usePickups';
```

---

#### Task 13: Update PickupRequests.tsx to Use New Hook

**File**: `src/pages/admin/PickupRequests.tsx`

After implementing the hook, update:
```typescript
// Change import
import { useAuth, usePickupsByITAdmin, usePickupLocations, useAssetsByITAdmin } from '@/hooks';

// Change hook usage
const userId = user?.id || '';
const { data: pickupRequests = [], isLoading: requestsLoading } = usePickupsByITAdmin(userId);
```

---

### PHASE 3: Build Verification

#### Task 14: Run Build

```bash
npm run build
```

**Expected**: Build succeeds with no TypeScript errors

---

## Files Reference

### Files Already Fixed ✅
- `src/pages/admin/Dashboard.tsx` - Uses IT Admin-scoped hooks correctly
- `src/pages/admin/BatchList.tsx` - Fixed
- `src/pages/admin/AssetList.tsx` - Fixed
- `src/pages/admin/AddAsset.tsx` - Fixed

### Files To Fix ⏳
- `src/pages/admin/BatchDetail.tsx`
- `src/pages/admin/PickupRequests.tsx`
- `src/pages/admin/InitiatePickup.tsx`
- `src/pages/admin/SubUserList.tsx`
- `src/pages/admin/AssetDetail.tsx`
- `src/pages/admin/UploadAssets.tsx`

### Files To Create/Modify for New Hook ⏳
- `src/lib/db/queries.ts` - Add `fetchPickupsByITAdmin`
- `src/hooks/usePickups.ts` - Add `usePickupsByITAdmin`
- `src/hooks/index.ts` - Export new hook

---

## Sub-Users Scope Decision

**Decision: Keep Enterprise-Wide** (no change needed)

Rationale:
- Sub-users (employees) may work across branches in real-world scenarios
- An employee might be assigned devices from different branches
- Any IT Admin can assign assets to any employee
- Simplifies the system - no database migration needed
- No security concern - sub-users just see their own assigned assets

---

## Testing Checklist

After completing all fixes:

1. [ ] Login as IT Admin with multiple branches assigned
2. [ ] BatchList shows only batches from assigned branches
3. [ ] AssetList shows only assets from assigned branches
4. [ ] BatchDetail shows correct batch and assets
5. [ ] PickupRequests shows only pickups from assigned branches
6. [ ] InitiatePickup shows only ready assets from assigned branches
7. [ ] SubUserList shows enterprise-wide sub-users (correct)
8. [ ] AssetDetail shows correct asset with correct batch dropdown
9. [ ] UploadAssets batch dropdown shows only assigned branches' batches
10. [ ] Dashboard stats are accurate for assigned branches only
