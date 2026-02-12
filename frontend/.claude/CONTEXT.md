# CLAUDE CONTEXT FILE

**Purpose:** This file provides essential context for Claude Code when working on the EcoTribe V3 codebase. **ALWAYS read this file first** when the conversation is compacted or when starting a new task.

**Last Updated:** December 2024
**Current Task:** V3 Major Restructure based on `changesV3.md`

---

## FIRST: CONSULT THE RIGHT FILES

Before starting ANY task, consult the appropriate reference files:

### Task Type → Files to Read First

| Task Type | Read These Files First |
|-----------|------------------------|
| **UI/Design** | `DESIGNER.md` → Color system, glassmorphism, typography, components |
| **Database** | `DATABASE_ARCHITECTURE.md` → Schema, adapters, query patterns |
| **User Flows** | `WORKFLOWS.md` → Complete flow diagrams, status meanings |
| **New Feature** | `changesV3.md` → V3 specifications, `IMPLEMENTATION_GUIDE.md` |
| **API/Data** | `src/lib/db/queries.ts`, `src/lib/db/mutations.ts` → Query functions |
| **Hooks** | `src/hooks/index.ts` → Available React Query hooks |
| **Types** | `src/types/` → TypeScript interfaces |
| **Routes** | `src/App.tsx` → Route definitions |
| **Migrations** | `supabase/migrations/` → Database schema history |

### Quick Reference: Key Documentation Files

```
📁 Root Documentation
├── CLAUDE.md              # Architecture overview, commands
├── DESIGNER.md            # Complete design system (MUST READ for UI)
├── WORKFLOWS.md           # User flow diagrams (MUST READ for features)
├── changesV3.md           # V3 specifications (MUST READ for new work)
├── IMPLEMENTATION_GUIDE.md # Implementation checklist
├── DATABASE_ARCHITECTURE.md # Database abstraction layer
└── SUPABASE_SETUP.md      # Supabase configuration

📁 .claude/
├── CONTEXT.md             # THIS FILE - session context
└── plans/                 # Planning documents

📁 src/lib/
├── db/queries.ts          # All Supabase query functions
├── db/mutations.ts        # All Supabase mutation functions
├── supabase.ts            # Supabase client
└── dataflow.md            # Data flow diagrams
```

---

## IMPLEMENTATION PROGRESS

### COMPLETED ✅
1. ✅ Database migration (`008_v3_restructure.sql`)
2. ✅ React Query installed (`@tanstack/react-query`)
3. ✅ Database layer: `src/lib/db/queries.ts`, `mutations.ts`
4. ✅ React Query hooks: All in `src/hooks/`
5. ✅ QueryClientProvider in App.tsx
6. ✅ CFO → Org Admin in types and routes
7. ✅ Old stores marked deprecated

### REMAINING ⏳
- ⏳ Migrate existing pages to React Query hooks
- ⏳ Create new Org Admin pages (BranchManagement, CreditsWallet)
- ⏳ Create branch components (BranchCard, BranchForm)
- ⏳ Create enterprise registration flow
- ⏳ Delete deprecated Zustand stores

---

## V3 ARCHITECTURE SUMMARY

### Role Hierarchy
```
Super Admin (Platform)
    ├── OPS Admin (Operations)
    └── Org Admin (Enterprise) ← WAS CFO
            ├── Branch 1 ← NEW
            │   └── IT Admin(s) → Sub-Users
            └── Branch 2 ← NEW
                └── IT Admin(s) → Sub-Users
```

### Data Flow Pattern (V3)
```typescript
// ❌ OLD: Zustand Store (localStorage)
const { assets } = useAssetStore();

// ✅ NEW: React Query + Supabase
import { useAssets } from '@/hooks';
const { data: assets, isLoading } = useAssets(enterpriseId);
```

### Key Routes
| Role | Route | Portal |
|------|-------|--------|
| Super Admin | `/super` | Platform management |
| OPS Admin | `/ops` | Operations |
| Org Admin | `/org-admin` | Enterprise (was `/cfo`) |
| IT Admin | `/admin` | Asset management |
| Sub User | `/check-in` | Device submission |
| Logistics Admin | `/logistics-admin` | Assignment |
| Logistics User | `/logistics` | Pickups |

---

## DATABASE SCHEMA (V3 Additions)

### New Tables
- `enterprise_applications` - Registration workflow
- `branches` - Hierarchical structure

### Altered Tables
- `users` + `branch_id` (IT Admin belongs to branch)
- `batches` + `branch_id`, pickup fields, approval fields
- `assets` + `branch_id`, `it_admin_id`
- `pickup_requests` + `batch_id`

### Database Views
- `org_admin_asset_view` - Nested asset view
- `branch_summary` - Branch statistics
- `pickup_approval_queue` - Pending approvals

---

## CODE PATTERNS

### Using React Query Hooks
```typescript
// Import from @/hooks
import { useAssets, useCreateAsset, useBatches } from '@/hooks';

// Query (read)
const { data, isLoading, error } = useAssets(enterpriseId);

// Mutation (write)
const createAsset = useCreateAsset();
createAsset.mutate({ enterprise_id, serial_number, brand, model });

// With options
const { data } = useAssets(enterpriseId, { enabled: !!enterpriseId });
```

### Design System (from DESIGNER.md)
```typescript
// Glass card
<div className="bg-white/75 dark:bg-zinc-900/85 backdrop-blur-md border border-lime-500/15">

// Primary button
<Button className="bg-lime-500 hover:bg-lime-400 text-black font-semibold">

// Stat box with left accent
<div className="border-l-4 border-l-emerald-500 bg-white/75 dark:bg-zinc-900/85">
```

### Form Pattern
```typescript
// Always use type="button" for non-submit buttons
<button type="button" onClick={handleClick}>Cancel</button>

// Form with react-hook-form + zod
const form = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: { ... }
});
```

---

## STORES STATUS

### KEEP (UI/Session Only)
- `authStore.ts` - Authentication state
- `themeStore.ts` - Theme preferences

### DEPRECATED (Use React Query)
All other stores in `src/stores/` are deprecated. Use hooks from `@/hooks` instead:
- `useAssetStore` → `useAssets`
- `useBatchStore` → `useBatches`
- `useSubUserStore` → `useSubUsers`
- `usePickupStore` → `usePickupRequests`
- `useLogisticsStore` → `useLogisticsAdmins`, `useLogisticsUsers`

---

## QUICK COMMANDS

```bash
# Start development
npm run dev

# Find CFO references (should be minimal now)
grep -r "cfo" --include="*.ts" --include="*.tsx" src/

# Find Zustand store usage (to migrate)
grep -r "useAssetStore\|useBatchStore" --include="*.tsx" src/

# Run build to check for errors
npm run build
```

---

## CRITICAL REMINDERS

1. **NEVER use localStorage** for data - always query Supabase
2. **CFO is now Org Admin** - use `org_admin` role
3. **Branches are required** - IT Admin must belong to a branch
4. **Batch approval required** - IT Admin cannot initiate pickup directly
5. **React Query for data** - useQuery/useMutation, not Zustand
6. **Design System** - Read DESIGNER.md before any UI work
7. **Workflows** - Read WORKFLOWS.md before implementing flows
8. **Types** - Always check `src/types/` for existing interfaces

---

## WHEN STARTING A NEW TASK

### For UI/Design Tasks:
1. Read `DESIGNER.md` - Get color system, component patterns
2. Check `src/components/ui/` - Existing UI components
3. Follow glassmorphism, typography, and spacing guidelines

### For Database/Backend Tasks:
1. Read `DATABASE_ARCHITECTURE.md` - Understand abstraction layer
2. Check `supabase/migrations/` - Current schema
3. Use `src/lib/db/queries.ts` and `mutations.ts` patterns

### For Feature Implementation:
1. Read `WORKFLOWS.md` - Understand the user flow
2. Read `changesV3.md` - V3 specifications
3. Check existing hooks in `src/hooks/`
4. Follow the React Query + Supabase pattern

### For Bug Fixes:
1. Read this CONTEXT.md - Understand V3 changes
2. Check if the code uses old Zustand stores (needs migration)
3. Use React Query DevTools to debug data issues

---

## FILES CREATED IN V3

```
src/lib/db/
├── queries.ts      # All Supabase query functions
└── mutations.ts    # All Supabase mutation functions

src/hooks/
├── index.ts                  # Central exports
├── useAssets.ts              # Asset hooks
├── useBatches.ts             # Batch hooks
├── useBranches.ts            # Branch hooks (NEW)
├── useSubUsers.ts            # Sub-user hooks
├── usePickups.ts             # Pickup hooks
├── useLogistics.ts           # Logistics hooks
└── useEnterpriseApplications.ts  # Registration hooks (NEW)

supabase/migrations/
└── 008_v3_restructure.sql    # V3 database changes

Documentation/
├── WORKFLOWS.md              # User flow documentation (NEW)
└── .claude/CONTEXT.md        # This file (UPDATED)
```
