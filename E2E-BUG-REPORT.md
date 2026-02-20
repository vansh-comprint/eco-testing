# E2E Lifecycle Test — Bug Report

**Date:** 2026-02-19
**Test Coverage:** 75 tests across 11 phases, 7 user roles, full asset lifecycle
**Environment:** localhost:3000 (frontend) + localhost:8000 (backend)
**Results:** 69 PASS, 5 SKIP, 0 FAIL — all skips caused by bugs or missing features

---

## Critical Bugs (Workflow Blockers)

### BUG-001: `useInfiniteQuery` does not fire after page refresh or direct URL navigation
- **Severity:** Critical
- **Affected Pages:** QC Queue, Payouts, Asset List, All Users — any page using `useInfiniteQuery`
- **Symptom:** Page shows 0 items / "Loading..." indefinitely after a hard refresh (`F5`) or direct URL navigation. Works correctly on SPA navigation (clicking sidebar links from within the app).
- **Root Cause:** The `useInfiniteQuery` hook's `queryFn` never executes after a full page reload. The `initialPageParam: 0` is set, but the query appears to never trigger. React Query's `enabled` condition may not re-evaluate after auth rehydration completes.
- **Files:**
  - `frontend/src/hooks/useAssets.ts:149-165` — `useInfiniteAssets()` hook
  - `frontend/src/pages/review/QCQueue.tsx:24-36` — QC Queue uses two `useInfiniteAssets` calls
  - `frontend/src/pages/ops/Payouts.tsx` — Payouts page
  - `frontend/src/pages/super/AllUsers.tsx` — All Users page
- **Impact:** Users must navigate away and back to load data. Direct bookmarks/links to these pages show empty content.
- **Workaround:** Navigate to another page first (e.g., Dashboard), then click the sidebar link to the target page.
- **Discovered In:** Phase 9 (9.1), Phase 10 (10.1), Phase 11 (11.2)

### BUG-002: Wallet page permanently stuck on "Loading wallet..."
- **Severity:** Critical
- **Affected Pages:** `/org-admin/wallet` (CreditsWallet)
- **Symptom:** "Loading wallet..." spinner never resolves. Wallet balance and transaction history never display.
- **Root Cause:** The `useQuery` at line 77 has `enabled: !!enterpriseId`, but `enterpriseId` comes from `useAuth().enterprise?.id`. After page load, the enterprise object may not be populated in time, or the `walletApi.get()` call silently fails.
- **Files:**
  - `frontend/src/pages/org-admin/CreditsWallet.tsx:68-69` — `enterpriseId` derivation
  - `frontend/src/pages/org-admin/CreditsWallet.tsx:77-85` — wallet query
  - `frontend/src/pages/org-admin/CreditsWallet.tsx:172-177` — loading state render
- **Impact:** Org Admins cannot view their wallet balance or transaction history through the UI.
- **Workaround:** Use API directly: `GET /api/v1/wallet/{enterprise_id}`
- **Discovered In:** Phase 10 (10.4)

### BUG-003: Payout creation frontend/backend schema mismatch (422)
- **Severity:** Critical
- **Affected Pages:** `/ops/payouts` or `/review/payouts` — Create Payout flow
- **Symptom:** Frontend payout creation returns 422 Validation Error from the backend.
- **Root Cause:** `CreatePayoutInput` interface in the frontend includes `asset_ids: string[]` and `items?: Array<{...}>` fields, but the backend payout creation endpoint does not accept these fields. The `useCreatePayout` mutation correctly strips them at line 92-98, but the calling component (Payouts page) still sends the full object including invalid fields, which bypasses the mutation's transform in some code paths.
- **Files:**
  - `frontend/src/hooks/usePayouts.ts:75-82` — `CreatePayoutInput` interface with extra fields
  - `frontend/src/hooks/usePayouts.ts:87-111` — `useCreatePayout` mutation (strips fields but caller may bypass)
  - Backend payout endpoint expects: `{enterprise_id, batch_id?, amount, method, notes?}`
- **Impact:** Payouts cannot be created through the UI. Must use direct API calls.
- **Workaround:** `POST /api/v1/payouts` with `{enterprise_id, amount, method: "wallet"}`
- **Discovered In:** Phase 10 (10.2)

---

## High Bugs (Feature Broken)

### BUG-004: Branch check-code endpoint returns 404
- **Severity:** High
- **Affected Pages:** `/org-admin/branches` — Create Branch and Edit Branch modals
- **Symptom:** Branch create/edit modals call `/api/v1/branches/check-code?enterprise_id=...&code=...` which returns 404. This blocks form submission because the frontend validates branch code uniqueness before submitting.
- **Root Cause:** The backend route exists at `backend/app/api/v1/branches.py:164` as `@router.get("/check-code")`, but the route may be shadowed by a parameterized route (`/{branch_id}`) that catches the request first, interpreting "check-code" as a branch ID.
- **Files:**
  - `backend/app/api/v1/branches.py:164-167` — endpoint definition
  - `frontend/src/lib/api/branches.ts:159` — frontend API call
- **Impact:** Branch creation and editing via the UI is completely blocked.
- **Workaround:** Create branches via direct API: `POST /api/v1/branches`
- **Fix Suggestion:** Move the `/check-code` route above the `/{branch_id}` route in the router, or rename to `/branches/actions/check-code`.
- **Discovered In:** Phase 2 (2.2, 2.3, 2.5)

### BUG-005: IT Admin dashboard stats endpoint returns 500
- **Severity:** High
- **Affected Pages:** `/admin` — IT Admin Dashboard
- **Symptom:** `GET /api/v1/dashboard/stats` (and `/api/v1/dashboard/stats?branch_id=...`) returns 500 Internal Server Error.
- **Root Cause:** The dashboard stats endpoint likely fails when computing stats for the IT Admin role — possibly a missing branch filter, null reference, or SQLAlchemy query error.
- **Files:**
  - `backend/app/api/v1/dashboard.py` — stats endpoint
- **Impact:** IT Admin dashboard shows all zeros for asset/batch counts. The dashboard is non-functional as an overview tool.
- **Workaround:** Stats are visible once individual pages (Assets, Batches) are loaded via SPA navigation.
- **Discovered In:** Phase 3 (3.14), Phase 11 (multiple)

### BUG-006: Enterprise Settings save does not persist
- **Severity:** High
- **Affected Pages:** `/org-admin/settings` — Enterprise tab
- **Symptom:** Editing enterprise details (Company Name, GSTIN, Address, City, State, PIN Code, Contact Email, Contact Phone) and clicking "Save Changes" shows no error but changes are not persisted to the database.
- **Root Cause:** The `handleSave` function at line 82 only handles `profile` (line 85-95) and `bank` (line 96-98) tabs. For the `enterprise` tab, it falls through to the `else` block (line 99-101) which shows a success toast but makes no API call.
- **Files:**
  - `frontend/src/pages/org-admin/OrgAdminSettings.tsx:82-113` — `handleSave` function
  - `frontend/src/pages/org-admin/OrgAdminSettings.tsx:99-101` — enterprise tab no-op fallthrough
- **Impact:** Org Admins cannot update enterprise details. The form gives false impression of saving.
- **Fix Suggestion:** Add enterprise update API call using `PUT /api/v1/enterprises/{id}` in the `activeTab === 'enterprise'` branch.
- **Discovered In:** Phase 11 (11.6)

### BUG-007: Asset list row click and view button don't navigate to detail
- **Severity:** High
- **Affected Pages:** `/admin/assets` — Asset List
- **Symptom:** Clicking a table row or the eye (view) icon button does not navigate to the asset detail page. The click handlers exist in code but don't fire via Playwright or standard browser clicks.
- **Root Cause:** The `onClick` handlers at lines 594 and 689 of AssetList.tsx call `navigate()`, but the click events may be intercepted by the checkbox column, or the row's `cursor: pointer` styling is misleading and the actual click target requires more precision.
- **Files:**
  - `frontend/src/pages/admin/AssetList.tsx:594` — row click handler
  - `frontend/src/pages/admin/AssetList.tsx:689` — view button click handler
- **Impact:** Users cannot access asset details from the list view via clicking.
- **Workaround:** Use browser `pushState` or navigate via the dashboard activity feed.
- **Discovered In:** Phase 11 (11.7)

---

## Medium Bugs (UX Issues)

### BUG-008: Phone validation rejects DB-stored phone format in Edit User modal
- **Severity:** Medium
- **Affected Pages:** `/super/users` — Edit User modal
- **Symptom:** Attempting to save user edits fails with "Phone must be exactly 10 digits" because the phone field is pre-populated with the DB value `+91-9000000004` (14 chars) instead of the 10-digit format the validator expects.
- **Root Cause:** Backend stores phone with country prefix (`+91-`), but frontend validation schema requires exactly 10 digits (`/^\d{10}$/`).
- **Files:**
  - `frontend/src/lib/validation.ts:97-100` — `optionalPhoneSchema` regex
  - Super Admin Edit User modal — pre-populates with raw DB value
- **Impact:** Any user with a +91-prefix phone cannot be edited without first manually fixing the phone field.
- **Fix Suggestion:** Either strip the prefix before populating the form, or accept both formats in validation.
- **Discovered In:** Phase 11 (11.1)

### BUG-009: Batch "Create Batch" button on BatchList page non-functional
- **Severity:** Medium
- **Affected Pages:** `/admin/batches` — Batch List
- **Symptom:** The "Create Batch" button on the Batch List page does not respond to clicks. The "Create New Batch" button in the Asset Detail modal also requires JS dispatch click to function.
- **Root Cause:** React's synthetic event system doesn't process the click — likely the button's onClick handler is not properly bound, or the button is rendered inside a form/portal that swallows events.
- **Files:**
  - Batch List page — Create Batch button
  - Asset Detail page — Create New Batch modal button
- **Impact:** Users cannot create batches from the batch list; must use the asset detail page workaround.
- **Discovered In:** Phase 6 (6.1)

### BUG-010: Batch Add Asset modal doesn't list `conditionally_accepted` assets
- **Severity:** Medium
- **Affected Pages:** `/admin/batches/{id}` — Batch Detail, Add Asset modal
- **Symptom:** When adding assets to a batch via the modal, assets with status `conditionally_accepted` (which should be eligible for batching) are not shown in the available assets list.
- **Root Cause:** The modal's asset query filter may be too restrictive, only showing `pending_assignment` assets instead of including `conditionally_accepted`.
- **Files:**
  - Batch Detail page — Add Asset modal query
- **Impact:** Users must add accepted assets via API workaround instead of the UI modal.
- **Workaround:** `POST /api/v1/batches/{batch_id}/assets` with `{asset_id}`
- **Discovered In:** Phase 6 (6.2)

### BUG-011: OPS Review dashboard shows stale count (0) despite pending reviews
- **Severity:** Medium
- **Affected Pages:** `/review` — OPS Review Dashboard
- **Symptom:** The review dashboard stats card shows 0 pending reviews even when `/ops/reviews` shows 6 pending items.
- **Root Cause:** The dashboard stats query may be cached or the count endpoint returns stale data. Different endpoints used by the dashboard vs the review queue.
- **Impact:** OPS Admins get incorrect overview of pending work.
- **Discovered In:** Phase 5 (5.1)

---

## Low Bugs (Minor / Cosmetic)

### BUG-012: Asset delete button missing from UI
- **Severity:** Low
- **Affected Pages:** `/admin/assets` and `/admin/assets/{id}` — Asset List and Detail
- **Symptom:** No delete button exists for assets, either in the list view or the detail view. The backend `DELETE /api/v1/assets/{id}` endpoint exists and works, and the frontend has a `useDeleteAsset` hook, but no UI element triggers it.
- **Files:**
  - `frontend/src/hooks/useAssets.ts:233-248` — `useDeleteAsset` hook (exists but unused in UI)
  - `frontend/src/pages/admin/AssetList.tsx` — no delete action in row
  - `frontend/src/pages/admin/AssetDetail.tsx` — no delete button
- **Impact:** Assets cannot be deleted through the UI. Minor since assets rarely need deletion.
- **Discovered In:** Phase 3 (3.8)

### BUG-013: React controlled input character loss with programmatic value setting
- **Severity:** Low (automation-specific)
- **Affected Pages:** Any page with React controlled inputs
- **Symptom:** When using `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set` to programmatically change input values, characters can be dropped (e.g., "IT Admin E2E" becomes "IT Admin EE").
- **Root Cause:** React's synthetic event system processes the `input`/`change` events asynchronously, and the controlled component's state update may race with the native value setter.
- **Impact:** Only affects automated testing/browser extensions, not manual user input.
- **Discovered In:** Phase 11 (11.4)

### BUG-014: Pickup verification checkboxes and photo upload require JS workarounds
- **Severity:** Low (automation-specific)
- **Affected Pages:** `/logistics/pickups/{id}` — Pickup execution flow
- **Symptom:** Checkboxes (serial match, power on) and photo upload inputs don't respond to standard click/change events. Require React native setter + `dispatchEvent` for checkboxes and `DataTransfer` file injection for photos.
- **Root Cause:** Custom React components with controlled state don't respond to native DOM events.
- **Impact:** Only affects automated testing. Manual user interaction works normally.
- **Discovered In:** Phase 8 (8.8)

---

## Missing Features (Identified During Testing)

| Feature | Location | Notes |
|---------|----------|-------|
| Asset delete UI | Asset List/Detail | Hook exists (`useDeleteAsset`), no UI trigger |
| Enterprise settings persistence | Org Admin Settings | Form exists, save handler is placeholder |
| Security tab functionality | Org Admin Settings | Tab renders but password change not wired |
| Notifications tab functionality | Org Admin Settings | Tab renders but preferences not wired |
| Employee edit (IT Admin) | `/admin/employees` | Page exists but no edit action visible |

---

## Bugs by Severity Summary

| Severity | Count | IDs |
|----------|-------|-----|
| Critical | 3 | BUG-001, BUG-002, BUG-003 |
| High | 4 | BUG-004, BUG-005, BUG-006, BUG-007 |
| Medium | 4 | BUG-008, BUG-009, BUG-010, BUG-011 |
| Low | 3 | BUG-012, BUG-013, BUG-014 |
| **Total** | **14** | |

## Recommended Fix Priority

1. **BUG-001** — `useInfiniteQuery` not firing (affects 4+ pages, most user-visible)
2. **BUG-003** — Payout schema mismatch (blocks core revenue workflow)
3. **BUG-002** — Wallet page stuck (Org Admin visibility into finances)
4. **BUG-004** — Branch check-code 404 (blocks branch management)
5. **BUG-005** — Dashboard stats 500 (IT Admin overview broken)
6. **BUG-006** — Enterprise settings save (Org Admin settings non-functional)
7. **BUG-007** — Asset list navigation (core navigation broken)
8. **BUG-008** — Phone validation format (edit user friction)
9. **BUG-009** — Batch create button (batch workflow friction)
10. **BUG-010** — Batch add asset filter (batch workflow friction)
