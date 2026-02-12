# Builder Agent Memory

## Cache Invalidation Patterns (2026-02-09)
- All mutations should invalidate `['sidebar-badges']` for badge count freshness
- Cross-domain invalidations: asset mutations -> batches, batch mutations -> assets, pickup mutations -> assets+batches+logistics, payout mutations -> assets+batches
- `useUpdateAssetStatus` is P0 critical — must invalidate batches, pickups, and sidebar-badges
- Batch approval/rejection transitions asset statuses on backend — must invalidate asset queries
- Some mutations use `refetchQueries` (await Promise.all) instead of `invalidateQueries` — add new invalidations after the await block
- `useUpdatePickupRequest` had `pickupKeys.lists()` which missed `pendingAssignment` and `myAssignments` queries — changed to `pickupKeys.all`
- TypeScript check: `invalidateQueries({ queryKey: ['some-key'] })` always type-safe, no new imports needed
- Pre-existing TS errors in `api-queries.ts` (limit param on PickupListParams) — not our concern

## Project Conventions
- React Query key factories: `domainKeys.all` -> `domainKeys.lists()` -> `domainKeys.list(id)` -> `domainKeys.detail(id)`
- Mutations use `onSuccess` or `onSettled` callbacks for cache invalidation
- Some critical mutations use `refetchQueries` (forced immediate) vs `invalidateQueries` (lazy)
- `queryClient` obtained via `useQueryClient()` hook in each mutation function
- Sidebar badges query key: `['sidebar-badges', branchId]` — invalidate with just `['sidebar-badges']` to match all

## Infinite Scroll Patterns (2026-02-10)
- `useInfiniteQuery` from `@tanstack/react-query` — use `initialPageParam: 0`, offset-based pagination
- `assetsApi.list()` returns `ApiResponse<AssetResponse[]>` with `{ success, data, pagination }`
- `pagination` has `{ page, limit, total, total_pages }` — use `total` for getNextPageParam
- `getNextPageParam`: count total fetched across all pages, compare to `pagination.total`
- Backend asset list only accepts single `status` enum — status group filters must stay client-side
- Backend auto-scopes IT admin queries — no need for explicit user_id param
- `DEFAULT_PAGE_SIZE` in client.ts is 10, but infinite scroll uses limit=5 for progressive loading
- `InfiniteScrollTrigger` and `InfiniteScrollInfo` components already exist in `@/components/ui`
- When replacing dual hooks (orgAdmin vs itAdmin), single `useInfiniteAssets` works because backend scoping handles it
- `activeBranchFilter` (from branch context) goes server-side; page-level `branchFilter` dropdown stays client-side
- Disputes API uses page/page_size (page-based) — `initialPageParam: 1`, not 0
- Sub-users API uses skip/limit (offset-based) — `initialPageParam: 0`
- `DisputeListParams` only has `page, page_size, status, dispute_type` — no `enterprise_id` field
- For disputes: `mapDisputeResponse` must be called on API data before returning from queryFn
- OpsDisputes has enterprise filter via asset lookup — client-side filtering, not API param

## Bulk Upload Pattern (2026-02-10)
- Backend bulk endpoints return `{ created, errors, created_count, error_count }` — NOT just an array
- `assetsApi.createBulk()` typed as `AssetBulkCreateResponse` (has errors field)
- `api-queries.ts:bulkCreateAssets()` returns full response, not just `response.data || []`
- `CSVUpload.tsx` has `BulkUploadResult` type + partial success state (`'partial'` status)
- `onUpload` prop returns `BulkUploadResult | void` so caller can pass server errors back
- `useBulkCreateSubUsers()` in `useEmployees.ts` already handles partial errors at hook level (throws when all fail, returns created array for partial)
- User bulk upload (`CSVUserUpload.tsx`) still uses unconditional success — less critical since hook handles errors

## Super Admin Infinite Scroll Patterns (2026-02-10)
- `Enterprises.tsx`: Uses `useInfiniteEnterprises()` from hooks, maps raw API response to `Enterprise` type via `useMemo`
- `AllUsers.tsx`: Inline `useInfiniteQuery` with `['users', 'infinite', roleFilter]` key — roleFilter in key triggers refetch
- `AllAssets.tsx`: Uses `useInfiniteEnterprises()` for top-level list + lazy loads batches/assets per enterprise on expand
- Lazy loading pattern: `expandedData` state record keyed by enterprise ID, with `loading: boolean` per entry
- Modal success callbacks: replace `fetchAllX()` with `queryClient.invalidateQueries({ queryKey: ['domain'] })`
- `hasNextPage` from `useInfiniteQuery` can be `undefined` — pass `hasNextPage ?? false` to InfiniteScrollTrigger

## Role-Based Context Patterns (2026-02-10)
- `useOrgBranchSafe()` returns null for IT Admin (only works in OrgBranchProvider)
- `ITAdminBranchContext` available via DashboardLayout wrapping IT Admin routes
- IT Admin branch: use `useContext(ITAdminBranchContext)?.selectedBranchId` or fallback `user.branchId`
- `isAllBranches` available on both OrgBranch and ITAdminBranch contexts
- For hiding buttons when "All Branches" selected: `isOrgAdmin && (orgBranchCtx?.isAllBranches ?? true)`

## Files Modified (Cache Fix Sprint)
- `frontend/src/App.tsx` — refetchOnWindowFocus: false -> true
- `frontend/src/hooks/useAssets.ts` — 8 mutations updated
- `frontend/src/hooks/useBatches.ts` — 9 mutations updated
- `frontend/src/hooks/usePickups.ts` — 8 pickup mutations updated (skipped location mutations)
- `frontend/src/hooks/usePayouts.ts` — 3 mutations updated
