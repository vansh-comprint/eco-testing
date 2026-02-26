## 2026-02-24 — on_site_qc domain mapping

### Scan strategy used
Parallel read of all 10 target files + grep for service references. Completed in 2 tool-call rounds.

### Findings
- All 4 layers exist: model, schema, repository, service, API routes — nothing needs creation
- `OnSiteQC` model in `app/models/support.py:145-196`, `QCStatus` enum at line 41
- Schemas in `app/schemas/review.py`: Create (124), Update (140), Response (154)
- Repository in `app/repositories/review_repository.py:113-161` (inside review_repository, not own file)
- Service in `app/services/review_service.py:248-316` (OnSiteQCService class)
- Routes in `app/api/v1/reviews.py:315-429` — 3 routes under `/api/v1/reviews/onsite`

### Effectiveness score: 5 — all information found in 2 parallel read rounds, no wasted searches

### What I'd do differently next time
- Read the service file immediately alongside model/schema/repository — avoids a third round
- Check routes.py files for the target domain before checking main.py

### Learned patterns (NEW)
- All QC types (RemoteReview, FacilityQC, OnSiteQC) share one repository file: `review_repository.py`
- All QC types share one service file: `review_service.py`
- All QC types share one routes file: `reviews.py`, mounted at `/api/v1/reviews`
- OnSiteQC id prefix pattern: `osqc-{uuid4()}`
- Service layer calls `session.flush()` after `repo.create()`, never `commit()` — commit left to route
- Route layer always: `await db.commit()` → `await db.refresh(obj)` → serialize

### Landmines flagged
- `PERFORM_ONSITE_QC` permission exists (permissions.py:107) but no route uses it — POST /reviews/onsite uses PICKUP_UPDATE instead
- `OnSiteQCRepository.get_by_asset_id()` uses `scalar_one_or_none()` — will crash on multiple records per asset (no unique constraint on asset_id)
- `get_by_pickup_request()` service method has no API route
- `OnSiteQCUpdate` schema is dead code — no update route or service method
- `list_qc()` enterprise_id param not passed from route's query string — scoping relies on user.enterprise_id fallback

### Communication sent to
- Report written inline (standalone analyst task, no builder assigned)
