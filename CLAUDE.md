# CLAUDE.md - EcoTribe Unified Platform

## Project Overview

EcoTribe is a B2B IT asset lifecycle management platform for enterprise device trade-in workflows.

**Architecture:** FastAPI Backend (REST API) + React Frontend (SPA)

This is the unified platform combining:
- `backend/` - FastAPI REST API (from eco-back)
- `frontend/` - React 19 + TypeScript + Vite (from eco-main)

## Quick Start

### Backend (FastAPI)
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env .env.local  # Edit with your database URL

# Run database migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload --port 8000
```

### Frontend (React)
```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env  # Edit VITE_API_URL if needed

# Start development server
npm run dev
```

## Environment Configuration

### Backend (.env)
```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/ecotribe
JWT_SECRET_KEY=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
DEBUG=True
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000/api/v1
```

## 7 User Roles

| Role | Portal Route | Purpose |
|------|--------------|---------|
| Super Admin | `/super` | Platform oversight, pricing config |
| OPS Admin (main_admin) | `/ops`, `/tech` | Operations & technician review |
| Org Admin | `/org-admin` | Enterprise admin, branches, finances, approvals |
| IT Admin | `/admin` | Branch-level asset & batch management |
| Sub-User (employee) | `/check-in` | Employee device self-evaluation |
| Logistics Admin | `/logistics-admin` | Logistics partner management |
| Logistics User | `/logistics` | Field pickups, on-site QC |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │   Pages     │  │  Components  │  │   Stores (Zustand) │ │
│  │  (7 portals)│  │     (ui/)    │  │   authStoreApi     │ │
│  └──────┬──────┘  └──────────────┘  └─────────┬──────────┘ │
│         │                                      │            │
│         └──────────────┬───────────────────────┘            │
│                        │                                     │
│              ┌─────────▼─────────┐                          │
│              │    src/lib/api.ts │  REST API Client         │
│              │    (JWT tokens)   │                          │
│              └─────────┬─────────┘                          │
└────────────────────────┼────────────────────────────────────┘
                         │ HTTP/HTTPS
┌────────────────────────▼────────────────────────────────────┐
│                      Backend (FastAPI)                       │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │  API Routes │  │   Services   │  │   Repositories     │ │
│  │  (v1/*.py)  │  │              │  │   (SQLAlchemy)     │ │
│  └──────┬──────┘  └──────┬───────┘  └─────────┬──────────┘ │
│         │                │                     │            │
│         └────────────────┼─────────────────────┘            │
│                          │                                   │
│              ┌───────────▼───────────┐                      │
│              │   PostgreSQL Database │                      │
│              │      (Supabase)       │                      │
│              └───────────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

## Key Files

### Backend
| Path | Purpose |
|------|---------|
| `app/main.py` | FastAPI application entry point |
| `app/core/config.py` | Settings and environment variables |
| `app/core/database.py` | SQLAlchemy async engine |
| `app/api/v1/` | API route handlers |
| `app/models/` | SQLAlchemy ORM models |
| `app/services/` | Business logic |
| `app/repositories/` | Data access layer |
| `alembic/` | Database migrations |

### Frontend
| Path | Purpose |
|------|---------|
| `src/App.tsx` | Main application with routing |
| `src/lib/api.ts` | REST API client (~1200 lines) |
| `src/stores/authStoreApi.ts` | JWT-based auth state (Zustand) |
| `src/contexts/AuthContextApi.tsx` | Auth React context |
| `src/hooks/` | React Query data fetching hooks |
| `src/pages/` | Portal pages (admin, ops, org-admin, etc.) |
| `src/components/ui/` | Design system components |

## Authentication Flow

1. User submits email/password via login form
2. Frontend calls `POST /api/v1/auth/login`
3. Backend validates credentials, returns JWT tokens
4. Frontend stores tokens in localStorage
5. `api.ts` automatically attaches token to all requests
6. On 401, `api.ts` attempts token refresh
7. If refresh fails, user is logged out

## API Response Format

All API responses follow this structure:
```json
{
  "code": 200,
  "data": { ... },
  "message": "Success"
}
```

Error responses:
```json
{
  "code": 400,
  "data": null,
  "message": "Error description"
}
```

## Common Commands

### Backend
```bash
# Run tests
pytest

# Run with auto-reload
uvicorn app.main:app --reload

# Create migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head
```

### Frontend
```bash
# Development
npm run dev

# Build for production
npm run build

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

## Development Workflow

1. Start backend: `uvicorn app.main:app --reload --port 8000`
2. Start frontend: `npm run dev` (port 3000/5173)
3. Frontend proxies API calls to backend via VITE_API_URL
4. Test at http://localhost:3000 or http://localhost:5173

## Migration Notes

### From Supabase Direct to REST API
The frontend was migrated from direct Supabase calls (BaaS pattern) to REST API calls:

- **Old**: `supabase.from('table').select()`
- **New**: `api.get('/endpoint')`

Auth migration:
- **Old**: `useAuthStore` (Supabase auth)
- **New**: `useAuthStoreApi` (JWT via REST API)

The `src/lib/api.ts` file contains the complete REST API client with:
- Token management (access + refresh)
- Automatic token refresh on 401
- All domain APIs (auth, users, assets, batches, etc.)

## Testing Roles

Use the demo accounts or create test users:
- Super Admin: Platform-wide access
- OPS Admin: Operations management
- Org Admin: Enterprise management
- IT Admin: Branch-level access
- Sub-User: Employee device submission
- Logistics Admin: Partner management
- Logistics User: Field operations

## Database

The platform uses PostgreSQL (can use Supabase PostgreSQL).

Tables include:
- `users` - All admin users
- `sub_users` - Enterprise employees
- `enterprises` - Company records
- `branches` - Hierarchical structure
- `assets` - Device records
- `batches` - Asset collections
- `submissions` - Employee evaluations
- `remote_reviews` - Technician reviews
- `facility_reviews` - QC reviews
- `pickup_requests` - Logistics coordination
- `logistics_admins` - Partner companies
- `logistics_users` - Field agents
- `payouts` - Financial records
- `notifications` - Alerts
- `disputes` - Issue resolution
