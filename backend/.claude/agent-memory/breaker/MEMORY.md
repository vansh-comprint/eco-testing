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

## OnSiteQC Fix 3 — What Was Solid (2026-02-24)
- All import chains: CLEAN (no import errors)
- Route ordering: CORRECT (by-pickup/{id} before {qc_id} in registration)
- Cascade change save-update,merge: FUNCTIONALLY CORRECT (no delete/delete-orphan)
- Status injection prevention: CORRECT (status not in OnSiteQCCreate schema)
- server-side performed_at: CORRECT
- Ownership/membership/duplicate checks: ALL PRESENT
- Permissions PERFORM_ONSITE_QC + PICKUP_VIEW: BOTH assigned to logistics_user
- NULL unique constraint semantics: CORRECT (PostgreSQL treats (asset_id, NULL) as distinct)
