# Analyst Agent Memory

## EcoTribe Frontend Auth System Security Audit (2026-02-10)

### Token Storage Architecture
- **Access token**: `ecotribe_access_token` (localStorage)
- **Refresh token**: `ecotribe_refresh_token` (localStorage)
- **Auth state**: `ecotribe-auth-api` (Zustand persist key, localStorage)
- **[SECURITY ISSUE]**: localStorage vulnerable to XSS

### Token Refresh Flow (client.ts:94-133)
- Mutex protection, automatic retry, rotation support
- **[ISSUE]**: No max retry limit — infinite loop if refresh 401s

### Auth Key Facts
- Role mapping: main_admin→ops_admin, technician→ops_admin, sub_user→employee
- onRehydrateStorage forces isInitialized=false on app load (GOOD)
- Production: VITE_API_URL=https://api-wrapper.ecotribe.co/api/v1

---

## EcoTribe Branch Bulk Upload Deep Audit (2026-02-19)

### Feature Scope
Org Admin portal only. Entry: `/org-admin/branches` → "Bulk Upload" button → `/org-admin/branches/upload`

### Files Map (by edit sequence)
1. `backend/app/models/enterprise.py:147-214` — Branch model + BranchStatus enum
2. `backend/app/schemas/branch.py` — BranchCreate, BranchUpdate, BranchBulkCreate, BranchBulkCreateItem
3. `backend/app/repositories/branch_repository.py` — DB ops, get_by_code
4. `backend/app/services/branch_service.py` — Business logic, bulk_create_branches
5. `backend/app/api/v1/branches.py` — Endpoints (GET/POST/PUT/DELETE)
6. `frontend/src/lib/api/branches.ts` — API client, types
7. `frontend/src/hooks/useBranches.ts` — React Query hooks + mutations
8. `frontend/src/pages/org-admin/BulkBranchUpload.tsx` — Upload page (3-step wizard)
9. `frontend/src/pages/org-admin/BranchManagement.tsx` — Branch list page, single-branch form
10. `frontend/src/lib/validation.ts:229-252` — validateBranchCode(), branchCodeSchema

### Backend Endpoints
- `GET /branches` — list with scoping
- `POST /branches` — single create
- `GET /branches/summary` — aggregated stats
- `POST /branches/bulk?enterprise_id=X` — bulk create (accepts BranchBulkCreate)
- `GET /branches/{branch_id}` — single get
- `PUT /branches/{branch_id}` — update
- `DELETE /branches/{branch_id}` — delete
- **[MISSING]** `GET /branches/check-code` — endpoint called by frontend, NOT IMPLEMENTED in backend

### [LANDMINE] Missing `check-code` Endpoint
Frontend calls `GET /branches/check-code?enterprise_id=X&code=Y` in two places:
- `BulkBranchUpload.tsx:380-386` — called during CSV validation loop
- `BranchManagement.tsx:772-781` — called on branch code input change
Backend `branches.py` has NO such endpoint → returns 404/422.
Frontend silently ignores check errors (catch{} swallows) — duplicate codes not caught until upload fails.

### [LANDMINE] `needs_admin` Status Discrepancy
- **DB** (dbschema.txt:25): `DEFAULT 'needs_admin'` with CHECK constraint `('active','inactive','needs_admin')`
- **Backend BranchStatus enum** (enterprise.py:147-152): ONLY `ACTIVE='active'`, `INACTIVE='inactive'`
- **Backend service**: creates ALL branches with `BranchStatus.ACTIVE.value` regardless of it_admin_id
- **Frontend**: displays/handles `needs_admin` status, filters by it in BranchManagement.tsx:118
- **Conflict**: Frontend expects `needs_admin`, backend always creates `active`, DB supports all 3
- **Impact**: Bulk upload shows warning "will have needs_admin status" — but backend sets active

### [LANDMINE] `it_admin_name` Field — Frontend/Backend Mismatch
- CSV template has `it_admin_name` column (template instructions, validation display)
- Frontend ParsedRow interface includes `it_admin_name` (BulkBranchUpload.tsx:42)
- Frontend sends `it_admin_name` in upload payload (BulkBranchUpload.tsx:454)
- **Backend BranchBulkCreateItem** (branch.py:114-133): NO `it_admin_name` field
- Backend bulk create only uses `it_admin_email` to look up existing user — if not found, ERRORS OUT
- **Frontend PROMISE vs REALITY**: Template says "creates new account if needed" — backend does NOT create IT Admins, just looks them up
- IT Admin creation only happens in single-branch form (BranchManagement.tsx:292-300) via separate `createITAdmin` call

### [LANDMINE] Bulk Upload IT Admin Auto-Create NOT Implemented
Backend `bulk_create_branches` service (branch_service.py:283-303):
- If `it_admin_email` not found → adds to `errors` array, SKIPS the branch entirely
- Does NOT create a new IT Admin account
- Frontend template/instructions say it will create one → false promise
- The `generated_password` field in UploadResult interface is always undefined/empty
- `newAdminsCount` stat in results page always 0

### Database Schema Key Facts
- `branches` table unique constraint: `(enterprise_id, branch_code)` — migration 018
- FK `enterprise_id → enterprises.id` (CASCADE)
- FK `it_admin_id → users.id` (SET NULL)
- Default status in DB: `needs_admin` — but backend overrides to `active`

### Single-Branch Form vs Bulk Upload Field Comparison
Single form has these fields ABSENT from bulk CSV:
- `pickup_point_description` (textarea)
- `special_instructions` (textarea)
- `opening_day` / `closing_day` (day dropdowns, Mon-Sat)
- `opening_hours` / `closing_hours` (time dropdowns, 30-min intervals)
  - Combined into `operating_hours` string: "Mon-Sat 09:00 - 18:00"
- IT Admin inline creation (full form: name, email, phone, password)

Bulk CSV uses a free-text `operating_hours` field (no day/time structure).

### State/City Fields — No Dropdown
- Both single form and bulk CSV use free-text `state` and `city` inputs
- Indian states list exists in `CreateEnterprise.tsx:38-45` and `EnterpriseRegister.tsx:79`
- Neither branch form nor bulk upload uses this list — plain text input only
- Bulk CSV validation only checks letters-only regex, no state name validation

### Scoping & Authorization
- `can_access_enterprise()` in `scoping.py` controls bulk create access
- Org Admin has `enterprise_id` on their user record — auto-scoped
- IT Admin has `BRANCH_CREATE` but NOT `BRANCH_UPDATE`/`BRANCH_DELETE` — cannot bulk upload (no BRANCH_UPDATE needed for bulk, but bulk endpoint uses BRANCH_CREATE permission — OK)
- `BulkBranchUpload.tsx` only rendered for `canManageBranches` which is `isOrgAdmin` only (line 171)

### Transactional Behavior
- Bulk create: loop with per-item error collection
- Uses `self.db.flush()` per branch (not add+commit per item)
- Single `db.commit()` at end if any successes (line 331-332)
- Partial success possible: some created, some errored
- `db.refresh()` NOT called after commit — `_enrich_branches_batch` called on unfresh objects
- No rollback on partial failure — successfully flushed branches remain

### Frontend Validation (BulkBranchUpload.tsx:344-430)
Row-level checks:
1. Required fields presence
2. `validateBranchCode()` — format only (1-10 alphanumeric uppercase)
3. Duplicate check within file (Set-based)
4. `branchesApi.checkCodeExists()` — calls missing endpoint, silently ignored
5. PIN code: `/^\d{6}$/`
6. IT admin email format regex
7. IT admin email existence check via `usersApi.list()` (warns "will be created" if not found)

### No Tests
- No test files found for branch feature in backend or frontend
- `backend/tests/` has test_auth.py but no test_branches.py

### Scan Effectiveness: 5/5
- Grepping for check.code first revealed the missing endpoint immediately
- Following BranchStatus enum in model caught needs_admin discrepancy
- Comparing template columns to BranchBulkCreateItem schema caught it_admin_name gap
