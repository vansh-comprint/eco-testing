# Breaker Agent Memory — EcoTribe

## Project Bug Profile
- This project is prone to: SQLAlchemy ORM cascade conflicts with DB-level FK constraints
- Critical area: User model relationships — cascade="all, delete-orphan" fights ondelete="SET NULL"
- Focus future attacks on: cascade vs DB FK conflicts, relationship collection mutation before delete

## Effective Attack Patterns (ordered by success rate)
1. **Cascade conflict check** — HITS: found BUG-1 in user deletion task
   - Look for `cascade="all, delete-orphan"` on relationships where DB FK has `ondelete="SET NULL"`
   - SQLAlchemy Python cascade fires first, deletes rows that DB would have just nulled
   - Write standalone aiosqlite test to confirm (use Windows path for DB file)

2. **Pre-delete nullify coverage** — HITS: found partial gap in user deletion task
   - When code pre-nullifies only SOME related objects before delete
   - Check if non-pre-nullified objects in cascade="all, delete-orphan" relationship still get deleted

3. **Transaction rollback path** — MISSES: get_db() dependency handles rollback correctly
   - FastAPI get_db() in database.py does except Exception: await session.rollback()
   - Double commit is safe (SQLAlchemy handles empty commit as no-op)

4. **Identity map modify+delete** — MISSES: SQLAlchemy handles this correctly
   - Setting attrs on object then calling session.delete() is safe
   - SQLAlchemy coalesces pending changes and issues just DELETE

5. **Race condition on same user** — MISSES: safe due to READ COMMITTED + NotFoundError
   - Second concurrent delete raises NotFoundError → rollback via get_db()

## Known Safe Patterns in This Codebase
- get_db() dependency: rollback on exception, double-commit is no-op
- Single role field (String) — no multi-role users possible
- Session identity map — same session, same PK = same Python object

## Test Infrastructure Notes
- venv/Scripts/python.exe uses Python 3.11 but pip shows packages installed for system Python 3.13
- Use system `python` command for standalone tests (has aiosqlite installed)
- SQLite DB path MUST use Windows format: "C:/Users/DELL/AppData/Local/Temp/filename.db"
  (Not /tmp/ — that's Linux path, causes "unable to open database file" error on Windows)
- Use `python` not `venv/Scripts/python.exe` for aiosqlite tests

## Key Files
- User model: `app/models/user.py` — lines 157-163 (assigned_disputes cascade bug)
- User service: `app/services/user_service.py` — delete_user (381-438), deactivation side effects (777+)
- User repo: `app/repositories/user_repository.py` — delete() uses flush not commit
- Enterprise repo: `app/repositories/enterprise_repository.py` — update()/delete() call db.commit() directly
- Enterprise service: `app/services/enterprise_service.py` — deactivate_enterprise (135-222), delete_enterprise (280-304)
- DB session: `app/core/database.py` — get_db() handles rollback on exception

## Repository Pattern Inconsistency (project-wide)
- UserRepository: uses db.flush() — caller controls commit timing
- EnterpriseRepository: uses db.commit() directly — auto-commits inside repository methods
- Check each repository for this pattern when investigating transaction integrity

## RESTRICT FK Trap (confirmed bug in delete_enterprise)
- PickupRequest.location_id → PickupLocation.id: ondelete="RESTRICT"
- PickupLocation.enterprise_id → Enterprise.id: ondelete="CASCADE"
- delete_enterprise() guards only against active users, NOT pickup_requests
- If any pickup_requests exist (even CANCELLED), delete → IntegrityError 500 in PostgreSQL
- SQLite doesn't enforce RESTRICT — always test this class of bug with PostgreSQL logic in mind

## Attack Pattern Added: RESTRICT FK gap check
- When a service has delete guards, check ALL FK constraints pointing to deleted entity
- Not just the ones the guard explicitly checks for
- RESTRICT is stricter than SET NULL/CASCADE — even cancelled/historical rows block deletion

## Migration Downgrade Safety Pattern (2026-02-24)
- When downgrade reverts nullable=True back to nullable=False:
  - MUST add UPDATE guard before alter_column: `op.execute("UPDATE t SET col = 'sentinel' WHERE col IS NULL")`
  - Without guard: PostgreSQL raises "column cannot be set to not-null constraint" if any NULLs exist
  - Both pickup_request_id AND keyboard_ok had this issue in migration 034
- Severity: LOW in production (downgrades are rare), but REAL defect
- Check this pattern on every migration that reverts nullable columns

## Branch Code Bulk Upload Bugs (2026-02-26)

### New Attack Patterns (HIT)
6. **Async loading race condition** — HITS: branches=[] (still loading) bypasses all validation
   - branchRequiredPerRow = !branchId && branches.length > 0: FALSE when branches=[]
   - Both per-row validation AND handleUpload noBranchRows check are skipped
   - Applies to any feature where validation depends on a loaded list
   - Check: is the validation gate guarded by "list.length > 0"?

7. **Frontend overrides CSV per-row data in handleUpload** — HITS: UploadAssets.tsx
   - CSVUpload.tsx builds branch_id per-row from CSV
   - UploadAssets.tsx step 4 (lines 185/201) OVERWRITES branch_id with effectiveBranchId
   - CSV branch column is cosmetically validated but has no effect on actual assignment
   - Pattern: when parent page remaps CSV-built objects before sending to API

8. **Backend missing per-item enterprise/branch cross-validation** — HITS: user_service.py
   - bulk_create: user_item.branch_id used without checking branch.enterprise_id == bulk.enterprise_id
   - Pattern: any per-item field that is a foreign key to a scoped entity needs ownership check
   - Single user create has same gap

9. **Sync gap: create vs update for bidirectional FK** — HITS: branch_service.py
   - update_branch syncs admin.branch_id = branch_id (line 216-234)
   - create_branch and bulk_create_branches do NOT sync (only set branch.it_admin_id)
   - Pattern: when update path syncs a bidirectional field but create path doesn't

### Known Safe in This Codebase (branch flows)
- empty-string branch_id: Python falsy, bulk_data fallback works correctly
- branch_name alias in CSV: double-check (code OR name) in both validation and upload
- branchId prop closure: handleUpload is NOT useCallback, always sees fresh value
- IT Admin multi-branch template: isOrgAdmin=false path correct, dropdown generated

## Branch Deactivation Bugs (2026-02-27)

### New Attack Patterns (HIT)
10. **Deactivation guard split-path gap** — HITS: branch deactivation task
    - preview_deactivation() and update_branch() are TWO separate code paths
    - preview checks active batches; update_branch() guard did NOT
    - Pattern: when a "preview" function and the actual "execute" function duplicate guard logic,
      they often diverge — always compare them for missing checks

11. **can_deactivate vs blocking_reasons inconsistency** — HITS: branch deactivation task
    - blocking_reasons list included active batches BUT can_deactivate boolean ignored them
    - Can_deactivate=True + non-empty blocking_reasons = contradictory API response
    - Frontend showed green "safe" + Deactivate button + red batch warning simultaneously
    - Pattern: whenever a boolean "can_X" and a list "X_reasons" are computed separately,
      check that the boolean is the logical AND of all reasons

12. **FK ondelete SET NULL scope gap** — HITS: branch deactivation task
    - Batch.branch_id has ondelete="SET NULL" — fires on branch DELETE, not status change
    - transfer_dependents() moved assets but NOT their parent Batch.branch_id
    - Pattern: when transferring child records (assets), always check if grandparent records
      (batches) have their own FK that also needs updating

### Known Safe in This Codebase (branch deactivation flows)
- Cross-enterprise transfer guard: present in transfer_dependents() (enterprise_id check)
- Inactive target branch guard: present (status != ACTIVE check)
- Race condition (TOCTOU): guards re-query DB fresh on each call — safe
- IT Admin BRANCH_UPDATE permission: correctly absent (only READ + CREATE assigned)
- Frontend modal state: handleClose() resets all 8 state vars — clean

## OnSiteQC Fix 3 — What Was Solid (2026-02-24)
- All import chains: CLEAN (no import errors)
- Route ordering: CORRECT (by-pickup/{id} before {qc_id} in registration)
- Cascade change save-update,merge: FUNCTIONALLY CORRECT (no delete/delete-orphan)
- Status injection prevention: CORRECT (status not in OnSiteQCCreate schema)
- server-side performed_at: CORRECT
- Ownership/membership/duplicate checks: ALL PRESENT
- Permissions PERFORM_ONSITE_QC + PICKUP_VIEW: BOTH assigned to logistics_user
- NULL unique constraint semantics: CORRECT (PostgreSQL treats (asset_id, NULL) as distinct)
