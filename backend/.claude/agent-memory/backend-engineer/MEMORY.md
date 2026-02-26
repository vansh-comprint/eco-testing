# Backend Engineer Memory — EcoTribe

## Project conventions (confirmed)

### ID prefixes
- RemoteReview: `rr-{uuid4}`
- FacilityQC: `fqc-{uuid4}`
- OnSiteQC: `osqc-{uuid4}`

### Error handling pattern in routes
- `ValueError` from service → `HTTPException(400, detail=str(e))`
- All routes wrap in try/except; commit after service call, rollback on error
- `await db.refresh(obj)` always after `await db.commit()` before serialization

### Serialization pattern
- Routes use `_entity_to_dict()` helper functions (NOT Pydantic `.model_dump()`)
- These helpers live at top of the On-Site QC section in `reviews.py`

### Service layer validation order (OnSiteQC create — established pattern)
1. Asset exists check
2. Pickup exists check
3. Pickup status guard (must be IN_PROGRESS)
4. Ownership check (role-specific)
5. Asset membership check (asset in pickup.asset_ids)
6. Duplicate check
7. Auto-derive computed fields (status from checks)
8. Construct ORM object with server-side timestamps

### Route ordering critical rule
- Static path segments MUST come before path parameter routes in FastAPI
- `/onsite/by-pickup/{pickup_request_id}` MUST be declared before `/onsite/{qc_id}`
- Otherwise FastAPI matches "by-pickup" as a qc_id

### Permission mapping (confirmed from permissions.py)
- `PERFORM_ONSITE_QC` — only `LOGISTICS_USER` role has this
- `PICKUP_VIEW` — OPS Admin, IT Admin, Org Admin, Logistics Admin, Logistics User
- Use `PERFORM_ONSITE_QC` (not `PICKUP_UPDATE`) for the onsite QC create endpoint

### Alembic migration patterns
- File naming: `{NNN}_{description}.py`
- `down_revision` must point to previous migration's `revision` string exactly
- Always make column nullable BEFORE changing FK cascade (ALTER COLUMN then DROP/CREATE FK)

### CASCADE vs SET NULL decision
- Use CASCADE when child records have no independent value (e.g., sub-items of a draft)
- Use SET NULL when child records are forensic/audit evidence (e.g., QC records outliving pickup)

### keyboard_ok nullable pattern
- Device-type-aware fields should be nullable, not required
- Service derives `status` by excluding None values from the checks list
