# EcoTribe Unified Platform - TODO

## Architecture Note

**Source of Truth:**
- **eco-back** → Code styling, structure, TypeScript patterns
- **eco-main** → UI design, user flows

**After UI audit is complete, we need to:**
1. Review frontend code against eco-back patterns
2. Refactor code styling to match eco-back standards
3. Ensure TypeScript patterns align with eco-back conventions
4. Keep UI and flows from eco-main

---

## Current Work: Comprehensive UI Audit

### Completed Fixes (All Navigation Issues)
- [x] Dashboard.tsx: "Invite Sub-Users" button → fixed to `/admin/sub-users/invite`
- [x] Dashboard.tsx: Batch row click → fixed to use `${basePath}/batches/`
- [x] PickupRequests.tsx: Request row click → fixed to use `${basePath}/pickups/`
- [x] PickupRequestDetail.tsx: Back/Cancel buttons → fixed to use `${basePath}/pickups`
- [x] LogisticsAssignments.tsx: View button → fixed to use `${basePath}/pickups/`
- [x] LogisticsAssignments.tsx: Back link → fixed to use `${basePath}/logistics`
- [x] Logistics.tsx: Pickup row click → fixed to use `${basePath}/pickups/`
- [x] LogisticsUsers.tsx: Added basePath support, fixed back link

### New Components Created
- [x] BranchSelector component with inline branch creation
- [x] EmployeeSelector component with inline employee creation

### Integration
- [x] BranchSelector integrated into BatchCreate.tsx

### UI Audit Progress

**IT Admin Portal:**
- [x] Dashboard - Quick Actions working, navigation fixed
- [x] SubUserList - All buttons working correctly
- [x] AssetList - All buttons working correctly
- [x] BatchList - All buttons working correctly
- [x] PickupRequests - Navigation fixed
- [x] BatchDetail - Using basePath correctly
- [x] AssetDetail - Using basePath correctly
- [x] SubUserDetail - Using basePath correctly
- [x] PickupRequestDetail - Navigation fixed to use basePath
- [x] LogisticsAssignments - Navigation fixed
- [x] LogisticsUsers - Navigation fixed
- [x] Logistics - Navigation fixed

**Org Admin Portal:**
- [x] BranchManagement - Uses basePath correctly
- [x] BranchDetail - Uses basePath correctly
- [x] ITAdminManagement - Portal-specific paths (correct)
- [x] ITAdminInvite - Portal-specific paths (correct)
- [x] BulkBranchUpload - Portal-specific paths (correct)
- [x] PickupApprovals - No external navigation issues

**OPS Admin Portal:**
- [x] Dashboard/MainAdminDashboard - No clickable navigation issues
- [x] EnterpriseList - Uses `/ops/enterprises/` (portal-specific)
- [x] EnterpriseDetail - Uses `/ops/enterprises` back navigation (correct)
- [x] OpsAssets - Uses `/ops/assets/` (portal-specific)
- [x] OpsDisputes - All inline interactions, no navigation issues
- [x] OpsLogistics - Modal-based interactions, no navigation issues
- [x] PayoutProcessing - All inline/modal interactions
- [x] PickupQueue - All inline/modal interactions
- [x] RemoteReviewQueue - Uses `/ops/submissions/` (portal-specific)
- [x] EnterpriseApplications - All inline/modal interactions

**Super Admin Portal:**
- [x] Dashboard - Uses `/super/...` paths throughout (correct)
- [x] Enterprises - Uses `/super/enterprises/create`, `/super/applications` (correct)
- [x] All other pages use portal-specific `/super/...` paths

**Logistics Admin Portal:**
- [x] Dashboard - Uses `/logistics-admin/pickups/` (portal-specific)
- [x] AssignmentQueue - Modal-based interactions, no navigation issues

**Logistics User Portal:**
- [x] Assignments - All inline interactions, no external navigation

**Sub-User (Check-In) Portal:**
- [x] Dashboard - Uses `/check-in/submit/`, `/check-in/help` (portal-specific)
- [x] DeviceSubmit - Uses `/check-in`, `/check-in/success` (correct)

---

## Post-Audit Tasks

### Code Quality Analysis (Follow eco-back patterns)

**Analysis Complete - Findings:**

#### ✅ TypeScript Configuration
- [x] Strict mode ENABLED in tsconfig.json (good!)
- [x] Modern ES2022 target
- [x] Path aliases configured correctly

#### ✅ Critical Issues (Fixed)

1. **Silent Mutation Failures** ✅
   - [x] Created `useApiError` hook with `handleError()`, `showSuccess()`, etc.
   - [x] Updated AddAsset.tsx to show toast on errors
   - [x] Updated BatchCreate.tsx to show toast on errors

2. **Global Error Handling** ✅
   - [x] Created `src/lib/api/errors.ts` with exception hierarchy
   - [x] Created `src/lib/api/error-handler.ts` for centralized handling
   - [x] Created `src/lib/api/index.ts` barrel export

3. **Error Type Alignment** ✅
   - [x] Created matching error types: AuthenticationError (401), NotFoundError (404), ValidationError (400), ConflictError (409), etc.
   - [x] Added type guards: isApiError(), isAuthenticationError(), etc.

#### ✅ Medium Priority (Completed)

4. **API Client Refactoring** ✅
   - [x] Split 1534-line api.ts into 18 domain modules
   - [x] Created `src/lib/api/client.ts` - Core utilities (fetchWithAuth, token mgmt)
   - [x] Created domain modules: auth, users, enterprises, assets, batches, branches, sub-users, pickups, submissions, reviews, applications, disputes, notifications, payouts, analytics, pricing, logistics, files
   - [x] Updated `src/lib/api/index.ts` - Barrel export for backward compatibility
   - [x] Old `api.ts` now re-exports from modular structure

#### 🟡 Medium Priority (Remaining)

5. **Input Validation**
   - [ ] Manual validation in components
   - [ ] Zod schemas exist but not integrated with react-hook-form
   - [ ] Need: Consistent Zod + react-hook-form pattern

6. **Mixed Data Sources**
   - [ ] Some hooks use Supabase directly (queries.ts)
   - [ ] Some hooks use REST API (api-queries.ts)
   - [ ] Need: Complete migration to REST API

#### ✅ Good Patterns Already in Place
- [x] React Query hooks well-structured with query keys
- [x] Type system organized by domain (14 modular files)
- [x] Zustand for auth state management
- [x] 30-second stale time, 1 retry configuration

---

## Completed: Error Handling Implementation

### Phase 1: Create Error Types & Utils ✅
- [x] Created `src/lib/api/errors.ts` with exception hierarchy
- [x] Created `src/lib/api/error-handler.ts` for centralized handling
- [x] Created `src/lib/api/index.ts` barrel export

### Phase 2: Toast Integration ✅
- [x] Created `useApiError` hook for mutation error handling
- [x] Exported from `src/hooks/index.ts`

### Phase 3: Component Updates (In Progress)
- [x] Updated AddAsset.tsx to use toast on errors
- [x] Updated BatchCreate.tsx to use toast on errors
- [x] Updated SubUserInvite.tsx to use toast on errors
- [x] Updated InitiatePickup.tsx to use toast on errors
- [x] Updated BatchDetail.tsx to use toast on errors
- [x] Updated DeviceSubmit.tsx (check-in flow) to use toast on errors
- [x] Updated EnterpriseApplications.tsx (OPS Admin) to use toast on errors
- [x] Updated ITAdminInvite.tsx (Org Admin) to use toast on errors
- [x] Updated PickupApprovals.tsx (Org Admin) to use toast on errors
- [ ] Update remaining forms as needed (~30 more files)

### Files Created:

**Error Handling (Phase 1-3):**
- `src/lib/api/errors.ts` - Error type classes matching backend
- `src/lib/api/error-handler.ts` - Error display utilities
- `src/hooks/useApiError.ts` - Hook for error handling with toasts

**API Client Refactoring (18 domain modules):**
- `src/lib/api/client.ts` - Core utilities (fetchWithAuth, token management, types)
- `src/lib/api/auth.ts` - Authentication (login, logout, OTP)
- `src/lib/api/users.ts` - User management
- `src/lib/api/enterprises.ts` - Enterprise CRUD
- `src/lib/api/assets.ts` - Asset management
- `src/lib/api/batches.ts` - Batch workflow & approvals
- `src/lib/api/branches.ts` - Branch management
- `src/lib/api/sub-users.ts` - Employee (sub-user) management
- `src/lib/api/pickups.ts` - Pickup coordination
- `src/lib/api/submissions.ts` - Device submissions (check-in)
- `src/lib/api/reviews.ts` - Remote & facility QC reviews
- `src/lib/api/applications.ts` - Enterprise applications
- `src/lib/api/disputes.ts` - Dispute resolution
- `src/lib/api/notifications.ts` - User notifications
- `src/lib/api/payouts.ts` - Payouts & wallet
- `src/lib/api/analytics.ts` - Platform statistics
- `src/lib/api/pricing.ts` - Pricing rules & calculations
- `src/lib/api/logistics.ts` - Logistics admin/user management
- `src/lib/api/files.ts` - File uploads
- `src/lib/api/index.ts` - Barrel export (backward compatibility)

---

### Supabase to REST API Migration (ARCH-001)

**Goal:** Migrate all frontend data operations from direct Supabase calls to REST API to ensure all business logic (including state machine validation) is enforced.

**Completed Hooks (2026-01-27):**
- [x] `usePickups.ts` - Core pickup operations migrated to REST API
  - `useAllPickupRequests()` → `pickupsApi.list()`
  - `usePendingPickups()` → `pickupsApi.listPendingAssignment()`
  - `useMyAssignments()` → `pickupsApi.listMyAssignments()` (NEW)
  - `useCreatePickupRequest()` → `pickupsApi.create()`
  - `useCompletePickup()` → `pickupsApi.complete()`
  - `useCancelPickup()` → `pickupsApi.cancel()`
  - `useStartPickup()` → `pickupsApi.start()` (NEW)
- [x] `pickups.ts` API module expanded with all backend endpoints
- [x] `useSubUsers.ts` - All operations migrated to REST API
  - `useSubUsers()` → `subUsersApi.list()`
  - `useAllSubUsers()` → `subUsersApi.list()`
  - `useSubUser()` → `subUsersApi.get()`
  - `useCreateSubUser()` → `subUsersApi.create()`
  - `useUpdateSubUser()` → `subUsersApi.update()`
  - `useDeleteSubUser()` → `subUsersApi.delete()`
  - `useBulkCreateSubUsers()` → `subUsersApi.bulkCreate()`
  - `useAssignAsset()` → `assetsApi.update()`
- [x] `useBatches.ts` - All operations migrated to REST API
  - All query functions use `batchesApi`
  - All mutation functions use `batchesApi`
- [x] `useBranches.ts` - All operations migrated to REST API
  - Expanded `branches.ts` API with summary, checkCodeExists, bulkCreate
  - Expanded `users.ts` API with listITAdmins, listITAdminsWithBranches, bulkCreate
  - All query functions use `branchesApi` and `usersApi`
  - All mutation functions use `branchesApi` and `usersApi`
- [x] `useLogistics.ts` - All operations migrated to REST API
  - Expanded `logistics.ts` API with full CRUD for admins and users
  - Added getAdminPickups, getUserPickups, listAvailableUsers
  - All query functions use `logisticsApi`
  - All mutation functions use `logisticsApi`
- [x] `useEnterpriseApplications.ts` - All operations migrated to REST API
  - Expanded `applications.ts` API with requestMoreInfo, updateDocuments, checkGSTExists, checkEmailExists
  - All query functions use `enterpriseApplicationsApi`
  - All mutation functions use `enterpriseApplicationsApi` and `filesApi`

**Still Using Supabase (Legacy - needs backend endpoints):**
- [ ] `usePickupLocations()` - needs backend endpoint for pickup_locations table
- [ ] `useCreatePickupLocation()` - needs backend endpoint
- [ ] `useUpdatePickupLocation()` - needs backend endpoint
- [ ] `useDeletePickupLocation()` - needs backend endpoint
- [ ] `useSetDefaultPickupLocation()` - needs backend endpoint

**Page Components with Direct Supabase (lower priority):**
- [ ] `pages/org-admin/BranchManagement.tsx`
- [ ] `pages/org-admin/BulkBranchUpload.tsx`
- [ ] `pages/admin/UploadAssets.tsx`
- [ ] `pages/ops/EnterpriseApplications.tsx`
- [ ] `pages/ops/PayoutProcessing.tsx`
- [ ] Various Super Admin modals

**Impact:** All major hook operations now go through the REST API, ensuring state machine validation and business logic enforcement.

---

### Functionality Testing
- [ ] Test all 7 user roles end-to-end
- [ ] Test batch approval workflow
- [ ] Test pickup request workflow
- [ ] Test asset assignment workflow
- [ ] Test sub-user invitation workflow

---

## Build Status
- Build: ✅ Passing
- Warnings: Dynamic imports (non-critical)
- Chunk size: 3.39MB (could benefit from code-splitting)
