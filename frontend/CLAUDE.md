# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server on port 3000
npm run build        # Production build (Vite)
npm run preview      # Preview production build
npx tsc --noEmit     # TypeScript type check (not part of build)
```

## Project Overview

EcoTribe is a B2B IT asset lifecycle management platform for enterprise device trade-in workflows. The platform handles the complete process: asset intake, employee self-evaluation, RV (Residual Value) calculation, approval workflow, and logistics coordination.

**Architecture Version:** V3 (see `changesV3.md` for detailed specifications)

## Architecture

**Stack:** React 19 + TypeScript + Vite + Supabase + React Hook Form + Zod + Framer Motion

### Directory Structure

```
src/
├── components/
│   ├── ui/           # Design system (Button, Input, Card, Modal, DataTable, Toast, etc.)
│   ├── auth/         # ProtectedRoute, RoleSwitcher
│   ├── layout/       # DashboardLayout, Sidebar
│   ├── branches/     # Branch management components
│   ├── org-admin/    # Org Admin specific components
│   └── registration/ # Enterprise registration flow
├── pages/
│   ├── admin/        # IT Admin portal pages
│   ├── check-in/     # Sub-User device submission flow
│   ├── tech/         # Technician review & QC portal
│   ├── ops/          # Main Admin operations portal
│   ├── org-admin/    # Org Admin portal (finances, branches, approvals)
│   ├── super/        # Super Admin portal
│   ├── logistics-admin/ # Logistics Admin portal
│   └── logistics-user/  # Logistics User portal
├── contexts/         # React context providers
├── hooks/            # React Query hooks for data fetching
├── layouts/          # Page layout components
├── lib/
│   ├── db/           # Database queries and mutations
│   ├── supabase.ts   # Supabase client instance
│   └── design-tokens.ts
├── services/         # External service integrations
├── stores/           # Zustand stores (auth, theme, mock data, domain stores)
├── styles/           # Global CSS and Tailwind utilities
├── types/            # TypeScript interfaces
└── utils/            # Utility functions
```

### Role Hierarchy (V3)

```
Super Admin (Ecotribe Platform)
    │
    ├── OPS Admin (Ecotribe Operations)
    │
    └── Org Admin (Enterprise) ← Was CFO
            │
            ├── Branch 1
            │   └── IT Admin(s)
            │       └── Sub-Users (Employees)
            │
            └── Branch 2
                └── IT Admin(s)
                    └── Sub-Users (Employees)
```

### Seven User Roles & Portals

| Role | Portal Route | Purpose |
|------|--------------|---------|
| Super Admin | `/super` | Platform oversight, pricing config |
| OPS Admin | `/ops`, `/tech` | Operations & technician review |
| Org Admin | `/org-admin` | Enterprise admin, branches, finances, approvals |
| IT Admin | `/admin` | Branch-level asset & batch management |
| Sub-User | `/check-in` | Employee device self-evaluation |
| Logistics Admin | `/logistics-admin` | Logistics partner management |
| Logistics User | `/logistics` | Field pickups, on-site QC |

### Data Layer

**Database-First Architecture:** All data flows directly from Supabase. No localStorage caching.

**Supabase Tables:**
- `enterprises` - Company records
- `branches` - Hierarchical structure under enterprises
- `users` - All admin users with `branch_id` for IT Admins
- `sub_users` - Enterprise employees
- `assets` - Device records with `branch_id`
- `batches` - Asset collections with approval workflow
- `pickup_requests` - Logistics coordination
- `enterprise_applications` - Registration workflow
- `logistics_admins` - Logistics partner companies
- `logistics_users` - Drivers/field agents under logistics admins
- `submissions` - Employee device evaluations
- `remote_reviews` - Technician review records

**Database Views:**
- `org_admin_asset_view` - Nested view: Branch → IT Admin → Batch → Asset
- `branch_summary` - Aggregated branch statistics
- `pickup_approval_queue` - Pending approvals for Org Admin

**SQL Migrations:** Located in `supabase/migrations/`. Run in order (001-013).

### Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Key Workflows

### Enterprise Registration (V3)
1. User fills multi-step registration form
2. Uploads required documents (GST, PAN, Incorporation Cert, etc.)
3. Application goes to Super Admin/OPS Admin queue
4. Admin reviews and approves/rejects
5. On approval: Enterprise created, Org Admin account activated

### Batch Approval Flow (V3)
1. IT Admin creates batch, adds assets
2. IT Admin fills pickup details (location, date, time slot)
3. IT Admin submits batch for approval
4. Org Admin reviews and approves
5. On approval: Pickup auto-initiated, notifications sent

### Pickup Assignment (3-Tier)
1. IT Admin initiates pickup request
2. OPS Admin assigns to Logistics Admin (partner company)
3. Logistics Admin assigns to Logistics User (driver)

## Development

**Demo Accounts** (use RoleSwitcher in dev mode):
- Super Admin: superadmin@ecotribe.io
- OPS Admin: admin@ecotribe.io
- Org Admin: orgadmin@techcorp.com (was CFO)
- IT Admin: it@techcorp.com
- Sub User: employee@techcorp.com
- Logistics Admin: logistics-admin@ecotribe.io
- Logistics User: logistics-user@ecotribe.io

**Asset Status Flow:**
```
pending_assignment → assigned → check_in_started → submitted → remote_review
→ conditionally_accepted/remote_rejected → pickup_requested → pickup_scheduled
→ picked_up → in_transit → facility_qc → final_accepted/final_rejected
→ payout_pending → completed
```

## Key Patterns

- **Route protection**: `ProtectedRoute` wraps all portal routes with role-based access
- **Layout consistency**: `DashboardLayout` provides unified sidebar + header
- **Form validation**: `react-hook-form` + `zod` with `@hookform/resolvers/zod`
- **Button types**: Always add `type="button"` to buttons inside forms
- **Field naming**: Database uses snake_case, frontend uses camelCase
- **Path alias**: `@` → `./src`
- **Class utilities**: Use `clsx()` + `tailwind-merge` for conditional classes
- **Data fetching**: React Query (`@tanstack/react-query`) for server state
- **Date handling**: `date-fns` for date formatting and manipulation
- **Excel operations**: `exceljs` and `xlsx` for bulk uploads and exports

### React Query Hooks Pattern

Domain-specific hooks in `src/hooks/` wrap React Query and database queries:
- `useAssets`, `useBatches`, `useBranches`, `useEnterprises`
- `useSubUsers`, `usePickups`, `useLogistics`, `usePayouts`
- `useEnterpriseApplications`, `useDisputes`
- `useAuth` - Authentication state and operations
- `useSupabaseRealtime` - Real-time subscriptions

These hooks use `src/lib/db/queries.ts` for reads and `src/lib/db/mutations.ts` for writes.

### Type System

Types in `src/types/` are modularized by domain:
- `common.ts`, `user.ts`, `enterprise.ts`, `asset.ts`, `batch.ts`
- `submission.ts`, `review.ts`, `payout.ts`, `pickup.ts`
- `notification.ts`, `epr.ts`, `bulkUpload.ts`

All exported from `src/types/index.ts` for single-import usage.

## Legacy Directories

Some legacy directory names exist alongside current ones during V3 migration:
- `pages/cfo/` → now `pages/org-admin/`
- `pages/it-admin/` → now `pages/admin/`
- `pages/super-admin/` → now `pages/super/`
- `pages/technician/` → now `pages/tech/`

Use the current (right-side) directories for new development.

## Important References

- `changesV3.md` - Detailed V3 specifications and UI mockups
- `IMPLEMENTATION_GUIDE.md` - Step-by-step implementation checklist
- `docs/PRODUCT_FLOWS.md` - Complete user journeys, flow diagrams, API endpoints, and database models
- `DESIGNER.md` - Design system specifications
- `src/lib/db/queries.ts` - Database read operations
- `src/lib/db/mutations.ts` - Database write operations
