# EcoTribe Bug Catalog — 2026-02-25

> **Total Bugs: 40** | Grouped by portal/role | Status: `OPEN` unless noted

---

## GROUP 1: Logistics Admin Portal (6 bugs)

| ID | Page | Summary | Type | Severity |
|----|------|---------|------|----------|
| LA-01 | Dashboard > Asset Details | Assign button popup modal missing dropdown for selecting logistics user (should match Assignment section dropdown) | UI/UX | Medium |
| LA-02 | Users | Logistics user deactivation not working | Functional | High |
| LA-03 | Dashboard | KPI card "Field Users" redirects to Assignments instead of Users section | Navigation | Medium |
| LA-04 | Dashboard | KPI card "Completed" redirects to Assignments but completed assets don't appear | Data/Filter | Medium |
| LA-05 | Assignments | Missing filter or stats card showing unassigned logistics users | Feature Gap | Medium |
| LA-06 | Users | Edit logistics user form — phone number field has no validation and no inline error messages | Validation | Low |

---

## GROUP 2: Logistics User Portal (1 bug)

| ID | Page | Summary | Type | Severity |
|----|------|---------|------|----------|
| LU-01 | Main View | Cards should appear below the search bar, not alongside/above it | UI/Layout | Low |

---

## GROUP 3: OPS Admin Portal (2 bugs)

| ID | Page | Summary | Type | Severity |
|----|------|---------|------|----------|
| OA-01 | Pickup | Missing dropdown for assigning logistics user to pickup | UI/Feature | High |
| OA-02 | Enterprise > Details | No option for editing IT Admin and Employee from enterprise detail page | Feature Gap | Medium |

---

## GROUP 4: IT Admin Portal (10 bugs)

| ID | Page | Summary | Type | Severity |
|----|------|---------|------|----------|
| IT-01 | Employee | Employees are not getting deactivated | Functional | High |
| IT-02 | Employee | Employee details are not getting updated | Functional | High |
| IT-03 | Employee | Missing filter-by-branch when IT admin has multiple branches assigned | Filter/Feature | Medium |
| IT-04 | Settings | Bank section should NOT appear for IT Admin | UI/Permissions | Medium |
| IT-05 | Settings | Enterprise fields should NOT be editable by IT Admin | Permissions | Medium |
| IT-06 | Settings > Pickup Location | Cannot delete or update existing pickup locations | Functional | High |
| IT-07 | Settings > Add Location | Missing opening/closing days and hours fields in the form | Feature Gap | Medium |
| IT-08 | Settings > Add Location | Pickup location form fields should use dropdowns | UI/UX | Low |
| IT-09 | Assets | Bulk action card (assign/add to batch/delete) UI not proper — should be one line with cross icon in top-right | UI/Layout | Low |
| IT-10 | Assets | Employee dropdown in asset creation should filter by selected branch (currently shows all branches' employees) | Filter/Logic | Medium |
| IT-11 | Assets > Bulk Upload | File selection and CSV/Excel button not working from Assets page (works from Batch > Add Asset > Bulk Upload) | Functional | High |
| IT-12 | Pickups | Filtering and stats card not in sync | Data/Filter | Medium |

---

## GROUP 5: Employee Portal (1 bug)

| ID | Page | Summary | Type | Severity |
|----|------|---------|------|----------|
| EM-01 | Device Check-in | After asset journey is completed, status is not updating in user breadcrumb path — submission status stays stuck, doesn't go to "done" | State/UI | Medium |

---

## GROUP 6: Org Admin Portal (14 bugs)

| ID | Page | Summary | Type | Severity |
|----|------|---------|------|----------|
| OR-01 | Finance > Request Redemption | Clicking request button gives error "Access denied. Required permission: payout_process" — make this "Coming Soon" instead | Permissions/UX | Medium |
| OR-02 | Finance > Reports | Year/Month/Week/Quarter filter not working | Filter | Medium |
| OR-03 | Assets > Batch Export | IT Admin name missing in exported Excel — shows "Äî" instead | Export/Data | Medium |
| OR-04 | Finance > Reports Export | Excel file includes enterprise DB column ID — should not expose internal IDs | Export/Data | Low |
| OR-05 | Assets Export | Export shows batch ID instead of batch name | Export/Data | Low |
| OR-06 | Assets | Listing UI is not proper; distance between status and branch columns off; should use same asset modal as other portals | UI/Consistency | Medium |
| OR-07 | Ops Branch > Batches | Batch status not updating after payouts are processed (same issue on IT Admin side) | State/Logic | High |
| OR-08 | Disputes | KPI cards not showing data | Data | Medium |
| OR-09 | Disputes | Status filter not working | Filter | Medium |
| OR-10 | Employee > Bulk Upload | Should require branch selection before template download; "select all" should give branch dropdown in Excel; upload should show inline note about target branches | Feature Enhancement | Medium |
| OR-11 | Batches | Expected value not appearing on batch listing card; stats card not updated with batch value even though assets have values | Data/Display | Medium |
| OR-12 | IT Admin > Bulk Upload | Shows "user already exists" error only after upload instead of catching it upfront with other validation errors | Validation Order | Low |
| OR-13 | IT Admin | Unassigning IT Admin from a branch is failing | Functional | High |
| OR-14 | Branch Details | Clicking employees/assets in branch details should filter by that branch | Filter/Navigation | Medium |
| OR-15 | Batches | Should be filtered by branches; stats should be branch-specific; use filtered API calls | Filter/Data | Medium |

---

## GROUP 7: Super Admin Portal (4 bugs)

| ID | Page | Summary | Type | Severity |
|----|------|---------|------|----------|
| SA-01 | Dashboard | Stats and user counts not matching | Data | Medium |
| SA-02 | QC | Filters only work client-side — need server-side filtering | Filter/Backend | High |
| SA-03 | Disputes | KPI cards not showing data | Data | Medium |
| SA-04 | Analytics | Export report gives JSON file instead of Excel | Export | Medium |

---

## GROUP 8: Cross-Portal (1 bug)

| ID | Page | Summary | Type | Severity |
|----|------|---------|------|----------|
| CP-01 | EPR Certificate | OPS Admin should be able to push/send EPR Certificate to Org Admin; should be visible in Org Admin portal | Feature Gap | High |

---

## Summary by Severity

| Severity | Count | Bug IDs |
|----------|-------|---------|
| **High** | 10 | LA-02, OA-01, IT-01, IT-02, IT-06, IT-11, OR-07, OR-13, SA-02, CP-01 |
| **Medium** | 22 | LA-01, LA-03, LA-04, LA-05, OA-02, IT-03, IT-04, IT-05, IT-07, IT-10, IT-12, EM-01, OR-01, OR-02, OR-03, OR-06, OR-08, OR-09, OR-10, OR-11, OR-14, OR-15, SA-01, SA-03, SA-04 |
| **Low** | 8 | LA-06, LU-01, IT-08, IT-09, OR-04, OR-05, OR-12 |

## Summary by Type

| Category | Count | Description |
|----------|-------|-------------|
| Functional (broken) | 7 | Features that don't work at all |
| Filter/Data | 10 | Filters not working, data not showing |
| UI/Layout/UX | 7 | Visual/layout issues |
| Permissions | 3 | Wrong access or missing restrictions |
| Export | 4 | Export files wrong format/data |
| Feature Gap | 4 | Missing functionality |
| Validation | 3 | Missing input validation |
| State/Logic | 2 | State machine or status update issues |

## Cross-Cutting Patterns

1. **Deactivation broken across portals**: LA-02 (logistics user), IT-01 (employee) — likely same root cause in user service
2. **KPI cards not showing data**: LA-03/LA-04, OR-08, SA-03 — likely shared KPI component or endpoint issue
3. **Filters not working**: OR-02, OR-09, SA-02, IT-12, OR-15 — mix of client-side only and broken server-side
4. **Export issues**: OR-03, OR-04, OR-05, SA-04 — Excel generation needs audit across all export endpoints
5. **Branch-scoping missing**: IT-03, IT-10, OR-14, OR-15 — multiple pages need branch-level filtering
6. **Batch status/value not updating**: OR-07, OR-11 — batch aggregate calculations may be broken
