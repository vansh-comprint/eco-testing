# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EcoTribe is a B2B IT asset lifecycle management platform for enterprise device trade-in workflows. It handles asset intake, employee self-evaluation, RV (Residual Value) calculation, approval workflows, and logistics coordination.

**Architecture:** FastAPI Backend (REST API) + React 19 Frontend (SPA)

```
backend/   - FastAPI REST API (Python 3.11, async)
frontend/  - React 19 + TypeScript + Vite
```

## Commands

### Backend
```bash
cd backend
venv\Scripts\activate                              # Activate venv (Windows)
uvicorn app.main:app --reload --port 8000          # Dev server
pytest                                              # Run all tests
pytest tests/test_auth.py                           # Single test file
pytest -k "test_login"                              # Single test by name
alembic upgrade head                                # Apply migrations
alembic revision --autogenerate -m "description"   # Create migration
black app/                                          # Format (line-length 100)
ruff check app/                                     # Lint
mypy app/                                           # Type check
```

### Frontend
```bash
cd frontend
npm run dev              # Dev server on port 3000
npm run build            # Production build (Vite)
npx tsc --noEmit         # Type check
npm test                 # Playwright E2E tests
npm run test:headed      # E2E with browser visible
```

### Production Deployment
```bash
./deploy.sh    # Build & start both (backend:2228, frontend:1228)
./stop.sh      # Stop both services
```

## Architecture

### Backend Layers (Clean Architecture)

```
API Routes (app/api/v1/) → Services (app/services/) → Repositories (app/repositories/) → DB
```

- **Routes**: FastAPI endpoints, dependency injection for auth/permissions/DB session
- **Services**: Business logic, orchestrate repositories, enforce state machine
- **Repositories**: Inherit from `BaseRepository[T]` (generic CRUD), raw SQLAlchemy queries
- **Models**: Inherit `AuditMixin` (auto `created_at`, `updated_at`, `created_by`, `updated_by`)

All database operations are async (`AsyncSession`, `asyncpg`).

### Backend Key Patterns

**Standardized Response Format** — all endpoints return:
```json
{"code": 200, "data": {...}, "message": "Success", "pagination": {...}}
```
Use `success_response()` and `error_response()` from `app/utils/`.

**Permission System**: 100+ granular permissions in `app/core/permissions.py`. Routes use:
```python
current_user: User = Depends(require_permission(Permission.ASSET_READ))
```

**Scoped Data Access**: `app/utils/scoping.py` auto-filters queries by user's role/enterprise/branch. Super Admin sees all; IT Admin sees only their branch.

**Asset State Machine**: `app/utils/state_machine.py` defines valid status transitions. Services enforce this — never update asset status directly in routes.

**Custom Exception Hierarchy**: `EcoTribeException` base with `AuthenticationError(401)`, `AuthorizationError(403)`, `NotFoundError(404)`, `ValidationError(422)`, `ConflictError(409)`, `BusinessLogicError(400)`.

**JWT Auth**: Access tokens (8h) + refresh tokens (7d). Token rotation on refresh. Database-backed blacklist (`token_blacklist` table) + in-memory cache. Session limiter (max 5 concurrent per user).

**Middleware Stack** (order matters — outermost first):
CORS → ErrorHandler → Logging → RateLimiter → SecurityHeaders

### Frontend Architecture

**State Management**:
- Server state: React Query (`@tanstack/react-query`) — 18 hook modules in `src/hooks/`
- Client state: Zustand stores in `src/stores/` (auth, theme, batch wizard, etc.)
- Forms: React Hook Form + Zod validation

**Modular API Client** (`src/lib/api/`):
- `client.ts` — Core fetch with auto token refresh (mutex-protected), page unload guard
- 24 domain modules: `auth.ts`, `assets.ts`, `batches.ts`, `branches.ts`, etc.
- `index.ts` — Barrel export for backward compat (old `api.ts` re-exports from here)

**React Query Hook Pattern** (every domain follows this):
```typescript
// Key factory for cache invalidation
export const assetKeys = {
  all: ['assets'] as const,
  lists: () => [...assetKeys.all, 'list'] as const,
  list: (params) => [...assetKeys.lists(), params] as const,
  detail: (id) => [...assetKeys.all, 'detail', id] as const,
};
// Query hooks (useAssets, useAsset) + Mutation hooks (useCreateAsset, useUpdateAsset)
```

**Auth Flow**:
1. `AuthContextApi` wraps app, calls `authStore.initialize()` on mount
2. Tokens stored in localStorage, auto-attached by `client.ts`
3. On 401: auto refresh with mutex (prevents race conditions)
4. Page unload guard prevents token clearing during hard refresh
5. `onRehydrateStorage` forces `isInitialized=false` to prevent stale access

**Role Mapping** (backward compat in `authStoreApi.ts`):
`main_admin` → `ops_admin`, `technician` → `ops_admin`, `sub_user` → `employee`

**Path alias**: `@` → `./src`

## 7 User Roles & Portals

| Role | DB Value | Portal Route | Purpose |
|------|----------|--------------|---------|
| Super Admin | `super_admin` | `/super` | Platform oversight, pricing |
| OPS Admin | `main_admin` | `/ops`, `/tech` | Operations & technician QC (dual portal) |
| Org Admin | `org_admin` | `/org-admin` | Enterprise admin, branches, finances |
| IT Admin | `it_admin` | `/admin` | Branch-level asset & batch management |
| Employee | `sub_user` | `/check-in` | Device self-evaluation |
| Logistics Admin | `logistics_admin` | `/logistics-admin` | Partner company management |
| Logistics User | `logistics_user` | `/logistics` | Field pickups, on-site QC |

OPS Admin has dual portal: `/ops/*` (admin functions) and `/tech/*` (review/QC). Enterprise selection stored in `sessionStorage`.

## Asset Status Flow

```
pending_assignment → assigned → check_in_started → submitted → remote_review
→ conditionally_accepted/remote_rejected → pickup_requested → pickup_scheduled
→ picked_up → in_transit → facility_qc → final_accepted/final_rejected
→ payout_pending → completed
```

## Key Workflows

**Batch Approval**: IT Admin creates batch → adds assets → submits for approval → Org Admin approves → Pickup auto-initiated

**Pickup Assignment (3-Tier)**: IT Admin initiates → OPS Admin assigns to Logistics Admin → Logistics Admin assigns to Logistics User

**Enterprise Registration**: Multi-step form with document uploads → Super/OPS Admin reviews → On approval: Enterprise + Org Admin created

## Environment Configuration

### Backend (`backend/.env`)
```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/ecotribe
JWT_SECRET_KEY=your-secret-key
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:8000/api/v1
```

## Migration Status (Supabase → REST API)

Most hooks are migrated to REST API. Still using Supabase directly:
- Pickup locations CRUD (needs backend endpoints)
- Some page components with direct Supabase calls (`BranchManagement`, `BulkBranchUpload`, `UploadAssets`, some OPS/Super Admin modals)

See `TODO.md` for detailed migration tracking.

## Database

PostgreSQL via Supabase. Alembic migrations in `backend/alembic/versions/` (001-011).

Key tables: `users`, `sub_users`, `enterprises`, `branches`, `assets`, `batches`, `submissions`, `remote_reviews`, `facility_reviews`, `pickup_requests`, `logistics_admins`, `logistics_users`, `payouts`, `disputes`, `token_blacklist`, `epr_certificates`.
