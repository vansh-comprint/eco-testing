# Analyst Agent Memory — EcoTribe Backend

## Project Stack
- FastAPI + SQLAlchemy async (asyncpg) + PostgreSQL (Supabase)
- All users in single `users` table (unified model), differentiated by `role` column
- 7 roles: super_admin, ops_admin, org_admin, it_admin, employee, logistics_admin, logistics_user

## Key Architectural Patterns

### Service Layer Pattern
- `update_user()` always calls `await self.db.commit()` + `await self.db.refresh(user)` explicitly
- `delete_user()` does NOT call `db.commit()` — relies on FastAPI DI lifecycle (inconsistency)
- Side-effects handled BEFORE commit, within same transaction

### FK Constraint Summary (users.id references)
- `assets.assigned_to_user_id` → SET NULL
- `submissions.user_id` → CASCADE DELETE
- `pickup_requests.logistics_admin_id` → SET NULL
- `pickup_requests.logistics_user_id` → SET NULL
- `pickup_requests.assigned_by_id` → SET NULL
- `branches.it_admin_id` → SET NULL
- `disputes.raised_by_user_id` → SET NULL
- `disputes.assigned_to_user_id` → SET NULL
- `disputes.resolved_by_user_id` → SET NULL
- `remote_reviews.reviewer_id` → SET NULL
- `facility_qc.reviewer_id` → SET NULL
- `on_site_qc.performed_by_user_id` → SET NULL
- `notifications.user_id` → CASCADE DELETE
- `audit_logs.user_id` → SET NULL
- `users.parent_user_id` (self-ref) → SET NULL
- `enterprise_applications.reviewed_by` → SET NULL

### ORM Cascade Landmine
`User.assigned_disputes` has `cascade="all, delete-orphan"` (user.py:158-163).
This DELETES Dispute records (not just unassigns) when a user with assigned disputes is deleted.
The FK constraint says SET NULL but ORM cascade overrides this behavior.

## Known Issues / Landmines

### delete_user() missing side-effects (user_service.py:381-404)
- Does NOT call `_handle_deactivation_side_effects()` before deletion
- Branch status not updated to `needs_admin` when IT Admin deleted (FK only NULLs it_admin_id)
- Child logistics_users orphaned (ACTIVE, no parent) when logistics_admin deleted
- Asset status stays `check_in_started` when employee deleted (submission cascade-deleted but asset not reset)
- Pickup request status not reverted when logistics user/admin deleted

### Service Layer Pattern — Repository Commit Behavior
- `BranchRepository.update()` calls `db.commit()` + `db.refresh()` — NOT just flush
- `BranchRepository.create()` calls `db.commit()` + `db.refresh()` — same pattern
- Any ORM mutations in the same session BEFORE `repository.update()` will be committed implicitly
- This is implicit coupling — works but is a code smell

### Scan Strategy Effectiveness
- Reading service + repository + models in parallel = most efficient approach
- FK constraints must be read from model files directly (not inferred)
- Always check ORM relationship cascade settings alongside FK constraints — they can conflict
- Always verify repository.update() behavior before flagging "missing commit" — base repo returns entity as-is, but concrete repos override with commit

## Frontend Pickup Flow (Logistics User) — Mapped 2026-02-24

### What exists in pickups.ts API client
- `pickupsApi.list()` → GET `/pickups?...`
- `pickupsApi.listPendingAssignment()` → GET `/pickups/pending-assignment`
- `pickupsApi.listMyAssignments()` → GET `/pickups/my-assignments`
- `pickupsApi.get(id)` → GET `/pickups/{id}`
- `pickupsApi.create(data)` → POST `/pickups`
- `pickupsApi.update(id, data)` → PUT `/pickups/{id}`
- `pickupsApi.assignToLogisticsAdmin(id, adminId)` → POST `/pickups/{id}/assign-admin`
- `pickupsApi.assignToLogisticsUser(id, userId, date)` → POST `/pickups/{id}/assign-user`
- `pickupsApi.start(id)` → POST `/pickups/{id}/start`
- `pickupsApi.complete(id, data?)` → POST `/pickups/{id}/complete`
- `pickupsApi.cancel(id, reason)` → POST `/pickups/{id}/cancel`
- NO `fail()`, `partial()`, or `reschedule()` functions exist

### What does NOT exist yet (needs adding)
- `pickupsApi.fail(id, data)` — for partial/all-failed cases
- `pickupsApi.partial(id, data)` — for mixed success/fail cases
- Hook: `useFailPickup` / `usePartialPickup`
- The component uses `useUpdatePickupStatus` for fail/partial — which falls through to `pickupsApi.update(id, {})` with empty body (broken)

### useLogisticsUserPickups
- Defined in `useLogistics.ts:329`
- Calls `logisticsApi.getUserPickups(userId)` → GET `/pickups?logistics_user_id={id}&limit=100`
- Does NOT use `/pickups/my-assignments` endpoint

### pickupStore.ts status
- Legacy Zustand store backed by direct Supabase (`db` import from `@/lib/database`)
- NOT used by Assignments.tsx — that page uses React Query hooks
- Store is vestigial/orphaned for the logistics user flow

## Bulk Upload Components Map (Mapped 2026-02-26)

### All Bulk Upload Entry Points
| Component | Route | Role | Type |
|-----------|-------|------|------|
| `BulkUserUpload.tsx` (pages/admin) | `/admin/employees/upload`, `/org-admin/employees/upload` | IT Admin / Org Admin | Employee bulk |
| `CSVUserUpload.tsx` (components/users) | Used inside BulkUserUpload | — | Employee upload widget |
| `CSVUpload.tsx` (components/assets) | Used inside UploadAssets | — | Asset upload widget |
| `UploadAssets.tsx` (pages/admin) | `/admin/assets/upload` | IT Admin / Org Admin | Asset bulk |
| `BulkBranchUpload.tsx` (pages/org-admin) | `/org-admin/branches/upload` | Org Admin | Branch bulk |
| `BulkITAdminUpload.tsx` (pages/org-admin) | `/org-admin/it-admins/upload` | Org Admin | IT Admin bulk |

### Backend Bulk Endpoints
- `POST /users/bulk` → `user_service.create_users_bulk()` — uses `user_item.branch_id or bulk_data.branch_id` (FIXED)
- `POST /assets/bulk` → `asset_service.create_assets_bulk()` — uses only `bulk_data.branch_id` (top-level only, NO per-asset branch)
- `POST /users/bulk` (for IT Admins via `useBulkCreateITAdmins`) — no branch_id in payload; branch assigned via `PATCH /branches/{id}` afterward

### Branch Handling Status Per Component
- **CSVUserUpload.tsx**: FIXED. Uses `branch_code` column, per-row resolution, blocks on invalid/missing codes
- **UploadAssets.tsx + CSVUpload.tsx**: Uses `branch_name` (not `branch_code`). Per-row `branch_id` is resolved in `CSVUpload.handleUpload` but then DISCARDED by `bulkCreateAssets()` which takes only `assets[0].branch_id` as top-level. Assets backend schema also has no per-item branch_id. Functionally consistent because all assets in one batch go to same branch — but this architectural pattern differs from user bulk.
- **BulkBranchUpload.tsx**: No branch_id issue — creates branches, doesn't assign them to branches.
- **BulkITAdminUpload.tsx**: Uses `branch_name` for lookup. Branch assignment happens via a separate PATCH per-IT-admin after creation. No blocking on invalid/missing branch (only warning). This is intentional (branch is optional for IT admins).

### Key Schema Facts
- `AssetBulkItem` (backend schema) has NO `branch_id` field — branch is top-level on `AssetBulkCreate`
- `UserBulkItem` (backend schema) HAS `branch_id` field — per-row branch supported
- `bulkCreateAssets()` in api-queries.ts extracts `branch_id` from `assets[0]` only — safe only when all assets share same branch
