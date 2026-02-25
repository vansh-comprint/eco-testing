# EcoTribe Bug Catalog — 2026-02-25

> **Total Bugs: 40** | Fixed: 40 | Open: 0 | All bugs resolved!

---

## GROUP 1: Logistics Admin Portal (6 bugs)

| ID | Page | Summary | Type | Severity | Status |
|----|------|---------|------|----------|--------|
| LA-01 | Dashboard > Asset Details | Assign button popup modal missing dropdown for selecting logistics user (should match Assignment section dropdown) | UI/UX | Medium | **FIXED** (8c49e70, bf35e90) |
| LA-02 | Users | Logistics user deactivation not working | Functional | High | **FIXED** (a18126a) |
| LA-03 | Dashboard | KPI card "Field Users" redirects to Assignments instead of Users section | Navigation | Medium | **FIXED** (e92b3ad) |
| LA-04 | Dashboard | KPI card "Completed" redirects to Assignments but completed assets don't appear | Data/Filter | Medium | **FIXED** (e92b3ad) |
| LA-05 | Assignments | Missing filter or stats card showing unassigned logistics users | Feature Gap | Medium | **FIXED** (e92b3ad) |
| LA-06 | Users | Edit logistics user form — phone number field has no validation and no inline error messages | Validation | Low | **FIXED** (pre-existing — real-time validation already implemented) |

---

## GROUP 2: Logistics User Portal (1 bug)

| ID | Page | Summary | Type | Severity | Status |
|----|------|---------|------|----------|--------|
| LU-01 | Main View | Cards should appear below the search bar, not alongside/above it | UI/Layout | Low | **FIXED** (pre-existing — layout already correct: filter above, cards in grid below) |

---

## GROUP 3: OPS Admin Portal (2 bugs)

| ID | Page | Summary | Type | Severity | Status |
|----|------|---------|------|----------|--------|
| OA-01 | Pickup | Missing dropdown for assigning logistics user to pickup | UI/Feature | High | **FIXED** (bb9ed33) |
| OA-02 | Enterprise > Details | No option for editing IT Admin and Employee from enterprise detail page | Feature Gap | Medium | **FIXED** (8c49e70) |

---

## GROUP 4: IT Admin Portal (12 bugs)

| ID | Page | Summary | Type | Severity | Status |
|----|------|---------|------|----------|--------|
| IT-01 | Employee | Employees are not getting deactivated | Functional | High | **FIXED** (a18126a) |
| IT-02 | Employee | Employee details are not getting updated | Functional | High | **FIXED** (edc8422) |
| IT-03 | Employee | Missing filter-by-branch when IT admin has multiple branches assigned | Filter/Feature | Medium | **FIXED** (8066c97) |
| IT-04 | Settings | Bank section should NOT appear for IT Admin | UI/Permissions | Medium | **FIXED** (8066c97) |
| IT-05 | Settings | Enterprise fields should NOT be editable by IT Admin | Permissions | Medium | **FIXED** (8066c97) |
| IT-06 | Settings > Pickup Location | Cannot delete or update existing pickup locations | Functional | High | **FIXED** (a0b1e20) |
| IT-07 | Settings > Add Location | Missing opening/closing days and hours fields in the form | Feature Gap | Medium | **FIXED** (8c49e70) |
| IT-08 | Settings > Add Location | Pickup location form fields should use dropdowns | UI/UX | Low | **FIXED** (8c49e70) |
| IT-09 | Assets | Bulk action card (assign/add to batch/delete) UI not proper — should be one line with cross icon in top-right | UI/Layout | Low | **FIXED** (pre-existing — horizontal layout with X button already implemented) |
| IT-10 | Assets | Employee dropdown in asset creation should filter by selected branch (currently shows all branches' employees) | Filter/Logic | Medium | **FIXED** (8066c97) |
| IT-11 | Assets > Bulk Upload | File selection and CSV/Excel button not working from Assets page (works from Batch > Add Asset > Bulk Upload) | Functional | High | **FIXED** (af7d666) |
| IT-12 | Pickups | Filtering and stats card not in sync | Data/Filter | Medium | **FIXED** (8c2e813) |

---

## GROUP 5: Employee Portal (1 bug)

| ID | Page | Summary | Type | Severity | Status |
|----|------|---------|------|----------|--------|
| EM-01 | Device Check-in | After asset journey is completed, status is not updating in user breadcrumb path — submission status stays stuck, doesn't go to "done" | State/UI | Medium | **FIXED** (8c49e70) |

---

## GROUP 6: Org Admin Portal (15 bugs)

| ID | Page | Summary | Type | Severity | Status |
|----|------|---------|------|----------|--------|
| OR-01 | Finance > Request Redemption | Clicking request button gives error "Access denied. Required permission: payout_process" — make this "Coming Soon" instead | Permissions/UX | Medium | **FIXED** (8066c97) |
| OR-02 | Finance > Reports | Year/Month/Week/Quarter filter not working | Filter | Medium | **FIXED** (8c2e813) |
| OR-03 | Assets > Batch Export | IT Admin name missing in exported Excel — shows "Äî" instead | Export/Data | Medium | **FIXED** (8066c97) |
| OR-04 | Finance > Reports Export | Excel file includes enterprise DB column ID — should not expose internal IDs | Export/Data | Low | **FIXED** (8c49e70) |
| OR-05 | Assets Export | Export shows batch ID instead of batch name | Export/Data | Low | **FIXED** (8066c97) |
| OR-06 | Assets | Listing UI is not proper; distance between status and branch columns off; should use same asset modal as other portals | UI/Consistency | Medium | **FIXED** (8c49e70, 6cf5627) |
| OR-07 | Ops Branch > Batches | Batch status not updating after payouts are processed (same issue on IT Admin side) | State/Logic | High | **FIXED** (7120b95) |
| OR-08 | Disputes | KPI cards not showing data | Data | Medium | **FIXED** (e92b3ad) |
| OR-09 | Disputes | Status filter not working | Filter | Medium | **FIXED** (8c2e813) |
| OR-10 | Employee > Bulk Upload | Should require branch selection before template download; "select all" should give branch dropdown in Excel; upload should show inline note about target branches | Feature Enhancement | Medium | **FIXED** (8c49e70) |
| OR-11 | Batches | Expected value not appearing on batch listing card; stats card not updated with batch value even though assets have values | Data/Display | Medium | **FIXED** (8066c97) |
| OR-12 | IT Admin > Bulk Upload | Shows "user already exists" error only after upload instead of catching it upfront with other validation errors | Validation Order | Low | **FIXED** (6cf5627) |
| OR-13 | IT Admin | Unassigning IT Admin from a branch is failing | Functional | High | **FIXED** (edc8422) |
| OR-14 | Branch Details | Clicking employees/assets in branch details should filter by that branch | Filter/Navigation | Medium | **FIXED** (8066c97) |
| OR-15 | Batches | Should be filtered by branches; stats should be branch-specific; use filtered API calls | Filter/Data | Medium | **FIXED** (8c2e813) |

---

## GROUP 7: Super Admin Portal (4 bugs)

| ID | Page | Summary | Type | Severity | Status |
|----|------|---------|------|----------|--------|
| SA-01 | Dashboard | Stats and user counts not matching | Data | Medium | **FIXED** (8c49e70) |
| SA-02 | QC | Filters only work client-side — need server-side filtering | Filter/Backend | High | **FIXED** (2a71e01) |
| SA-03 | Disputes | KPI cards not showing data | Data | Medium | **FIXED** (e92b3ad) |
| SA-04 | Analytics | Export report gives JSON file instead of Excel | Export | Medium | **FIXED** (8066c97) |

---

## GROUP 8: Cross-Portal (1 bug)

| ID | Page | Summary | Type | Severity | Status |
|----|------|---------|------|----------|--------|
| CP-01 | EPR Certificate | OPS Admin should be able to push/send EPR Certificate to Org Admin; should be visible in Org Admin portal | Feature Gap | High | **FIXED** (e92b3ad) |

---

## Fix History

| Commit | Date | Bugs Fixed | Description |
|--------|------|------------|-------------|
| a18126a | 2026-02-25 | LA-02, IT-01 | Fix user deactivation: dynamic permission check on PUT/PATCH /users endpoints |
| edc8422 | 2026-02-25 | OR-13, IT-02 | Fix IT Admin unassign (frontend `null` vs `undefined`), backend bidirectional sync, GET /users dynamic permission |
| e92b3ad | 2026-02-25 | CP-01, LA-05, LA-03, LA-04, OR-08, SA-03 | EPR certificate push, logistics admin indicators, KPI card fixes, dashboard stats |
| bb9ed33 | 2026-02-25 | OA-01 | Logistics user assignment dropdown in pickup queue |
| a0b1e20 | 2026-02-25 | IT-06 | Fix pickup location CRUD: align frontend types with backend API contract |
| af7d666 | 2026-02-25 | IT-11 | Fix bulk upload from Assets page: add inline branch selector |
| 7120b95 | 2026-02-25 | OR-07 | Fix batch status not updating after payout processing |
| 2a71e01 | 2026-02-25 | SA-02 | Add server-side enterprise filtering to Super Admin QC queue |
| 8c2e813 | 2026-02-25 | OR-02, OR-09, IT-12, OR-15 | Fix filter sync: server-side filtering, dispute status filter, pickup stats, branch-scoped batches |
| 8066c97 | 2026-02-25 | SA-04, OR-03, OR-05, IT-04, IT-05, IT-03, IT-10, OR-14, OR-11, OR-01 | Fix exports (CSV/batch names/em-dash), IT Admin permissions, branch-scoping, batch values, Coming Soon |
| 8c49e70 | 2026-02-25 | EM-01, SA-01, OA-02, LA-01, IT-07, IT-08, OR-06, OR-10, OR-04 | Progress bar terminal state, dashboard labels, enterprise editing, logistics assign, location form, asset table, bulk upload gating |
| bf35e90 | 2026-02-25 | LA-01 | Improve logistics assign modal — filter active users, better empty state messaging |
| 6cf5627 | 2026-02-25 | OR-12 | Upfront batch email validation with enterprise_id scoping; asset bulk upload branch validation + batch column |

---

## Summary by Severity

| Severity | Total | Fixed | Open | Bug IDs (Open) |
|----------|-------|-------|------|----------------|
| **High** | 10 | 10 | 0 | — |
| **Medium** | 22 | 22 | 0 | — |
| **Low** | 8 | 8 | 0 | — |

## All 40 bugs resolved!

### Notes on Low-Priority Bugs
- **LA-06**: Real-time phone validation with inline errors was already implemented in UserManagement.tsx
- **LU-01**: Layout was already correct — filter bar above, assignment cards in grid below
- **IT-09**: Bulk action bar already had correct horizontal layout with X close button
- **OR-05**: Fixed in batch export to use batch name instead of batch ID
