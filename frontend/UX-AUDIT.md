# EcoTribe Frontend UX Audit — Full Issue Registry

**Date:** 2026-02-12
**Analysts:** 3 parallel agents (Forms/Inputs, Navigation/Layout, Error Handling)
**Scope:** 90+ page components, 18 hook files, 4 modal components, 24 API modules
**Overall Score:** 7/10 — solid foundation, critical gaps in feedback and data freshness

---

## TIER 1 — Users Get Stuck (Critical/Blocking)

### T1-1: RemoteReview Silent Validation Failure
- **File:** `src/pages/review/RemoteReview.tsx` lines 78-87
- **Problem:** `handleSubmitReview` returns early when rejection reason or grade is missing, but shows NO error feedback. Button stays enabled. User clicks repeatedly, nothing happens.
- **Fix:** Add toast/inline error before each early return.

### T1-2: Signup Form Data Loss on Error
- **File:** `src/pages/auth/SignupPage.tsx` lines 105-157
- **Problem:** 3-step registration form stores data in React state only. Backend error at step 3 → user refreshes → all data gone. No localStorage persistence, no beforeunload warning.
- **Fix:** Persist form draft to localStorage on every change, restore on mount, clear on success.

### T1-3: Global Mutation Error Handling Gap
- **Files:** `src/hooks/useAssets.ts` (8 mutations), `useBatches.ts` (10), `usePickups.ts` (10), `useUsers.ts` (5), `useEmployees.ts` (8), `useEnterprises.ts` (3+)
- **Problem:** ~33+ mutations have NO default `onError` handler. Pages must manually wrap in try/catch. If a page forgets, failures are completely silent.
- **Fix:** Add global `MutationCache({ onError })` in App.tsx QueryClient config — catches all unhandled mutation errors with a single toast.

---

## TIER 2 — Users Get Confused (High Priority)

### T2-1: No Stale Data Indicator on Dashboards
- **Files:** `src/pages/admin/Dashboard.tsx`, `src/pages/check-in/Dashboard.tsx`, `src/pages/ops/MainAdminDashboard.tsx`, `src/pages/org-admin/OrgAdminDashboard.tsx`, `src/pages/review/ReviewDashboard.tsx`
- **Problem:** Stats shown with zero indication of data freshness. No "Last updated: 2 min ago", no manual refresh button. Users may make decisions on stale cached data.
- **Fix:** Use React Query `dataUpdatedAt` to show relative timestamp + add refresh icon button.

### T2-2: Bulk Operations Black Box
- **File:** `src/pages/admin/AssetList.tsx` lines 252-370
- **Problem:** Bulk delete/assign/add-to-batch loops through assets with single spinner, no per-item progress. Error at item #23/50 → "failed" but which 22 succeeded? Unknown.
- **Fix:** Add progress counter ("Deleting 23/50...") + partial success reporting.

### T2-3: No Retry on Network Errors
- **Files:** `src/components/ui/Toast.tsx`, `src/lib/api/error-handler.ts`
- **Problem:** Network error shows toast "Check your internet" that auto-dismisses in 4s. No retry button. User must re-fill form and re-submit.
- **Fix:** Add optional `onRetry` callback to Toast component. Wire up for network/5xx errors.

### T2-4: Double-Submit Risk on Mutation Buttons
- **Files:** `src/pages/admin/BatchDetail.tsx` (pickup creation), multiple other pages
- **Problem:** Buttons disable during async but show no spinner icon. User uncertain if click registered.
- **Fix:** Replace disabled-only buttons with Loader2 spinner + "Processing..." text pattern.

### T2-5: Toast Auto-Dismiss Too Fast for Critical Actions
- **File:** `src/components/ui/Toast.tsx` line 38
- **Problem:** Default 4s duration for ALL toasts including critical confirmations (batch approved, pickup created). Users miss them.
- **Fix:** Allow duration override in `showSuccess()`. Use 6-8s for critical actions.

### T2-6: RemoteReview No Success Toast
- **File:** `src/pages/review/RemoteReview.tsx` lines 78-110
- **Problem:** After submitting review, navigates to queue with no success confirmation. User unsure if review saved.
- **Fix:** Add success toast before navigation.

### T2-7: Employee Invite Partial Failure Misreported
- **File:** `src/pages/admin/EmployeeInvite.tsx` lines 166-192
- **Problem:** Shows "10 invited successfully" even if 2 failed (email already exists). `setSuccessCount(invites.length)` assumes all succeeded.
- **Fix:** Read result from mutation response, show partial success with failure details.

---

## TIER 3 — Users Get Annoyed (Polish)

### T3-1: Status Badges Without Tooltips
- **Files:** All list pages using Badge component
- **Problem:** Statuses like "conditionally_accepted", "remote_rejected" shown as badges with no hover tooltip explaining what they mean or what's next.
- **Fix:** Extend Badge to accept tooltip prop. Add status descriptions.

### T3-2: Missing "End of List" Indicator
- **Files:** `src/pages/admin/AssetList.tsx`, `src/pages/admin/PickupRequests.tsx`, `src/pages/admin/DisputeList.tsx`
- **Problem:** User scrolls to bottom of infinite list, nothing loads, no visual indicator. `InfiniteScrollInfo` component exists but isn't used on all pages.
- **Fix:** Add InfiniteScrollInfo to all pages using infinite scroll.

### T3-3: Submit Buttons Enabled When Form Invalid
- **File:** `src/pages/admin/BatchCreate.tsx` lines 372-383
- **Problem:** Submit only disabled during loading, not when name is empty. User clicks 5 times before reading error.
- **Fix:** Compute `isFormValid` and disable submit until valid.

### T3-4: DeleteBatchModal Traps User During Hang
- **File:** `src/components/ui/DeleteBatchModal.tsx` lines 30-36
- **Problem:** If delete hangs (network timeout), X button disabled, Escape doesn't work. User must refresh page.
- **Fix:** Allow close with confirmation during operation.

### T3-5: Photo Upload No Size/Format Validation
- **File:** `src/pages/check-in/DeviceSubmit.tsx` lines 108-124
- **Problem:** No validation for file size or format. 50MB image bloats state, submission may fail.
- **Fix:** Validate max 5MB, accept only JPG/PNG/WEBP.

### T3-6: Search Not Debounced
- **Files:** `src/pages/admin/AssetList.tsx`, `src/pages/admin/EmployeeList.tsx`, etc.
- **Problem:** Filters 1000+ items on every keystroke. UI lag on large datasets.
- **Fix:** Add useDebounce hook (300ms) for search inputs.

### T3-7: No Session Timeout Warning
- **File:** `src/lib/api/client.ts`
- **Problem:** JWT expires → silent 401 → redirect to login. No "session expiring" warning.
- **Fix:** Check token expiry periodically, show warning 5 min before.

### T3-8: Mobile Stat Boxes Text Wrapping
- **Files:** `src/pages/admin/AssetList.tsx`, `src/pages/admin/BatchList.tsx`
- **Problem:** Labels like "Ready for Pickup" wrap mid-word on small screens.
- **Fix:** Shorten labels on mobile or use single column.

### T3-9: No Breadcrumbs on Detail Pages
- **Files:** All detail pages (AssetDetail, BatchDetail, SubmissionDetail, etc.)
- **Problem:** Back arrow exists but no breadcrumb trail. Deep navigation is disorienting.
- **Fix:** Create Breadcrumb component, add to detail pages.

### T3-10: Stat Boxes Not Keyboard Accessible
- **Files:** All dashboard/list stat boxes
- **Problem:** Clickable `<div>` elements with onClick, no tabIndex, no keyboard nav.
- **Fix:** Use `<button>` elements instead.

### T3-11: Employee Invite No Max Limit
- **File:** `src/pages/admin/EmployeeInvite.tsx` lines 151-153
- **Problem:** No limit on invite rows. User could add 1000, crash browser.
- **Fix:** Cap at 50 per batch with warning toast.

### T3-12: BatchCreate Estimated Assets Field Unused
- **File:** `src/pages/admin/BatchCreate.tsx` lines 297-310
- **Problem:** Field shown but data not sent to backend. Silent data loss.
- **Fix:** Either wire up or remove the field.

---

## Positive Patterns (Keep These)

- 145 instances of error handling across 36 files
- Confirmation modals for all destructive actions
- Escape key support in modals
- Global MutationCache invalidates sidebar-badges after every mutation
- Token refresh with mutex protection
- Mobile card layout fallback in DataTable
- Framer Motion stagger animations on lists
- refetchOnWindowFocus for auto-freshness
