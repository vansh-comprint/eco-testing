# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server on port 3000
npm run build        # Production build (Vite)
npm run preview      # Preview production build
npx tsc --noEmit     # TypeScript type check
npm test             # Playwright E2E tests
npm run test:headed  # E2E with browser visible
npm run test:debug   # Playwright debug mode
```

## Architecture

**Stack:** React 19 + TypeScript + Vite + React Query + Zustand + React Hook Form + Zod + Framer Motion + Tailwind CSS

### Data Layer

**REST API first.** Most data flows through `src/lib/api/` modules → React Query hooks in `src/hooks/`.

Some legacy Supabase direct calls remain (pickup locations, some page components). New code should always use the REST API client.

**API Client** (`src/lib/api/`):
- `client.ts` — Core fetch, token management, auto-refresh (mutex-protected), page unload guard
- 24 domain modules (`auth.ts`, `assets.ts`, `batches.ts`, etc.)
- `index.ts` — Barrel export; old monolithic `api.ts` re-exports from here

**React Query Hooks** (`src/hooks/`):
- Each domain has a key factory + query hooks + mutation hooks
- 30-second stale time, 1 retry default
- Cache invalidation via hierarchical key factories

**Client State** (Zustand in `src/stores/`):
- `authStoreApi` — JWT tokens, user session (persisted to localStorage)
- `useThemeStore` — Dark mode
- `useBatchStore`, `usePickupStore`, `useSubmissionStore` — Form wizard state

### Role-Based Portals (7 portals)

| Portal | Route | Role |
|--------|-------|------|
| IT Admin | `/admin/*` | `it_admin` |
| Org Admin | `/org-admin/*` | `org_admin` |
| OPS Admin | `/ops/*` + `/tech/*` | `main_admin` |
| Super Admin | `/super/*` | `super_admin` |
| Employee | `/check-in/*` | `sub_user` |
| Logistics Admin | `/logistics-admin/*` | `logistics_admin` |
| Logistics User | `/logistics/*` | `logistics_user` |

Each portal wrapped in `<ProtectedRoute roles={[...]}>` with `<DashboardLayout>`.

OPS Admin has dual portal: `/ops/*` (admin) and `/tech/*` (review/QC) with different layouts.

### Auth

`AuthContextApi` wraps app → `authStore.initialize()` on mount → `ProtectedRoute` checks role.

Role mapping for backward compat: `main_admin` → `ops_admin`, `technician` → `ops_admin`, `sub_user` → `employee`.

Token refresh uses mutex to prevent race conditions. Page unload guard prevents token clearing on hard refresh.

## Key Patterns

- **Path alias**: `@` → `./src`
- **Class utilities**: `clsx()` + `tailwind-merge` for conditional classes
- **Form pattern**: `useForm` + `zodResolver` + mutation hook + toast on success/error
- **Button in forms**: Always add `type="button"` to non-submit buttons inside forms
- **Field naming**: Backend uses snake_case, frontend uses camelCase
- **Date handling**: `date-fns`
- **Excel operations**: `exceljs` and `xlsx` for bulk uploads/exports
- **Error handling**: `useApiError` hook + typed error classes in `src/lib/api/errors.ts`

## Asset Status Flow

```
pending_assignment → assigned → check_in_started → submitted → remote_review
→ conditionally_accepted/remote_rejected → pickup_requested → pickup_scheduled
→ picked_up → in_transit → facility_qc → final_accepted/final_rejected
→ payout_pending → completed
```

## Legacy Directories

Old directory names still exist alongside current ones:
- `pages/cfo/` → use `pages/org-admin/`
- `pages/it-admin/` → use `pages/admin/`
- `pages/super-admin/` → use `pages/super/`
- `pages/technician/` → use `pages/tech/`

Use the current (right-side) directories for all new development.
