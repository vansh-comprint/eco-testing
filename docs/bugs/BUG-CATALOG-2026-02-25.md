# EcoTribe Bug Catalog — 2026-02-25

> **Total Bugs: 40** | Fixed: 15 | Open: 25 | Grouped by portal/role

---

## GROUP 1: Logistics Admin Portal (6 bugs)

| ID | Page | Summary | Type | Severity | Status |
|----|------|---------|------|----------|--------|
| LA-01 | Dashboard > Asset Details | Assign button popup modal missing dropdown for selecting logistics user (should match Assignment section dropdown) | UI/UX | Medium | OPEN |
| LA-02 | Users | Logistics user deactivation not working | Functional | High | **FIXED** (a18126a) |
| LA-03 | Dashboard | KPI card "Field Users" redirects to Assignments instead of Users section | Navigation | Medium | **FIXED** (e92b3ad) |
| LA-04 | Dashboard | KPI card "Completed" redirects to Assignments but completed assets don't appear | Data/Filter | Medium | **FIXED** (e92b3ad) |
| LA-05 | Assignments | Missing filter or stats card showing unassigned logistics users | Feature Gap | Medium | **FIXED** (e92b3ad) |
| LA-06 | Users | Edit logistics user form — phone number field has no validation and no inline error messages | Validation | Low | OPEN |

---

## GROUP 2: Logistics User Portal (1 bug)

| ID | Page | Summary | Type | Severity | Status |
|----|------|---------|------|----------|--------|
| LU-01 | Main View | Cards should appear below the search bar, not alongside/above it | UI/Layout | Low | OPEN |

---

## GROUP 3: OPS Admin Portal (2 bugs)

| ID | Page | Summary | Type | Severity | Status |
|----|------|---------|------|----------|--------|
| OA-01 | Pickup | Missing dropdown for assigning logistics user to pickup | UI/Feature | High | **FIXED** (bb9ed33) |
| OA-02 | Enterprise > Details | No option for editing IT Admin and Employee from enterprise detail page | Feature Gap | Medium | OPEN |

---

## GROUP 4: IT Admin Portal (10 bugs)

| ID | Page | Summary | Type | Severity | Status |
|----|------|---------|------|----------|--------|
| IT-01 | Employee | Employees are not getting deactivated | Functional | High | **FIXED** (a18126a) |
| IT-02 | Employee | Employee details are not getting updated | Functional | High | **FIXED** (edc8422) |
| IT-03 | Employee | Missing filter-by-branch when IT admin has multiple branches assigned | Filter/Feature | Medium | OPEN |
| IT-04 | Settings | Bank section should NOT appear for IT Admin | UI/Permissions | Medium | OPEN |
| IT-05 | Settings | Enterprise fields should NOT be editable by IT Admin | Permissions | Medium | OPEN |
| IT-06 | Settings > Pickup Location | Cannot delete or update existing pickup locations | Functional | High | **FIXED** (a0b1e20) |
| IT-07 | Settings > Add Location | Missing opening/closing days and hours fields in the form | Feature Gap | Medium | OPEN |
| IT-08 | Settings > Add Location | Pickup location form fields should use dropdowns | UI/UX | Low | OPEN |
| IT-09 | Assets | Bulk action card (assign/add to batch/delete) UI not proper — should be one line with cross icon in top-right | UI/Layout | Low | OPEN |
| IT-10 | Assets | Employee dropdown in asset creation should filter by selected branch (currently shows all branches' employees) | Filter/Logic | Medium | OPEN |
| IT-11 | Assets > Bulk Upload | File selection and CSV/Excel button not working from Assets page (works from Batch > Add Asset > Bulk Upload) | Functional | High | **FIXED** (af7d666) |
| IT-12 | Pickups | Filtering and stats card not in sync | Data/Filter | Medium | OPEN |

---

## GROUP 5: Employee Portal (1 bug)

| ID | Page | Summary | Type | Severity | Status |
|----|------|---------|------|----------|--------|
| EM-01 | Device Check-in | After asset journey is completed, status is not updating in user breadcrumb path — submission status stays stuck, doesn't go to "done" | State/UI | Medium | OPEN |

---

## GROUP 6: Org Admin Portal (14 bugs)

| ID | Page | Summary | Type | Severity | Status |
|----|------|---------|------|----------|--------|
| OR-01 | Finance > Request Redemption | Clicking request button gives error "Access denied. Required permission: payout_process" — make this "Coming Soon" instead | Permissions/UX | Medium | OPEN |
| OR-02 | Finance > Reports | Year/Month/Week/Quarter filter not working | Filter | Medium | OPEN |
| OR-03 | Assets > Batch Export | IT Admin name missing in exported Excel — shows "Äî" instead | Export/Data | Medium | OPEN |
| OR-04 | Finance > Reports Export | Excel file includes enterprise DB column ID — should not expose internal IDs | Export/Data | Low | OPEN |
| OR-05 | Assets Export | Export shows batch ID instead of batch name | Export/Data | Low | OPEN |
| OR-06 | Assets | Listing UI is not proper; distance between status and branch columns off; should use same asset modal as other portals | UI/Consistency | Medium | OPEN |
| OR-07 | Ops Branch > Batches | Batch status not updating after payouts are processed (same issue on IT Admin side) | State/Logic | High | **FIXED** (7120b95) |
| OR-08 | Disputes | KPI cards not showing data | Data | Medium | **FIXED** (e92b3ad) |
| OR-09 | Disputes | Status filter not working | Filter | Medium | OPEN |
| OR-10 | Employee > Bulk Upload | Should require branch selection before template download; "select all" should give branch dropdown in Excel; upload should show inline note about target branches | Feature Enhancement | Medium | OPEN |
| OR-11 | Batches | Expected value not appearing on batch listing card; stats card not updated with batch value even though assets have values | Data/Display | Medium | OPEN |
| OR-12 | IT Admin > Bulk Upload | Shows "user already exists" error only after upload instead of catching it upfront with other validation errors | Validation Order | Low | OPEN |
| OR-13 | IT Admin | Unassigning IT Admin from a branch is failing | Functional | High | **FIXED** (edc8422) |
| OR-14 | Branch Details | Clicking employees/assets in branch details should filter by that branch | Filter/Navigation | Medium | OPEN |
| OR-15 | Batches | Should be filtered by branches; stats should be branch-specific; use filtered API calls | Filter/Data | Medium | OPEN |

---

## GROUP 7: Super Admin Portal (4 bugs)

| ID | Page | Summary | Type | Severity | Status |
|----|------|---------|------|----------|--------|
| SA-01 | Dashboard | Stats and user counts not matching | Data | Medium | OPEN |
| SA-02 | QC | Filters only work client-side — need server-side filtering | Filter/Backend | High | **FIXED** (2a71e01) |
| SA-03 | Disputes | KPI cards not showing data | Data | Medium | **FIXED** (e92b3ad) |
| SA-04 | Analytics | Export report gives JSON file instead of Excel | Export | Medium | OPEN |

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

---

## Summary by Severity

| Severity | Total | Fixed | Open | Bug IDs (Open) |
|----------|-------|-------|------|----------------|
| **High** | 10 | 10 | 0 | — |
| **Medium** | 22 | 4 | 18 | LA-01, OA-02, IT-03, IT-04, IT-05, IT-07, IT-10, IT-12, EM-01, OR-01, OR-02, OR-03, OR-06, OR-09, OR-10, OR-11, OR-14, OR-15, SA-01, SA-04 |
| **Low** | 8 | 0 | 8 | LA-06, LU-01, IT-08, IT-09, OR-04, OR-05, OR-12 |

## Remaining Open by Priority

### High Priority (0 remaining)
All HIGH priority bugs are fixed!

### Medium Priority (18 remaining)
1. OR-02, OR-09, IT-12, OR-15 — Filters not working across portals
2. OR-03, OR-05, SA-04 — Export issues (Excel format/data)
3. IT-03, IT-10, OR-14 — Branch-scoping missing
4. OR-11 — Batch value display
5. IT-04, IT-05 — IT Admin Settings permissions
6. OR-01 — Payout permission error → "Coming Soon"
7. OR-06 — Asset listing UI consistency
8. OR-10 — Bulk upload branch selection
9. EM-01 — Employee check-in status stuck
10. OA-02 — Enterprise detail editing
11. IT-07 — Pickup location form fields
12. LA-01 — Logistics admin asset assign dropdown
13. SA-01 — Super Admin dashboard stats

### Low Priority (8 remaining)
14. LA-06, IT-08, IT-09, LU-01, OR-04, OR-12 — UI/validation/layout issues
