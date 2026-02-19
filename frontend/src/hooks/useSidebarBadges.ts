/**
 * useSidebarBadges - Provides action-required badge counts for sidebar navigation.
 *
 * Fetches counts from a single backend endpoint (GET /dashboard/badges)
 * instead of pulling full entity lists and filtering client-side.
 *
 * When an IT Admin selects a branch, the branch_id is passed to the
 * backend so badge counts reflect the scoped branch.
 */

import { useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { dashboardApi, type BadgeCounts } from '@/lib/api';
import { ITAdminBranchContext } from '@/contexts/ITAdminBranchContext';

export type SidebarBadges = BadgeCounts;

export function useSidebarBadges(): SidebarBadges {
  const { isAuthenticated, user } = useAuth();
  const itBranchCtx = useContext(ITAdminBranchContext);

  // Only pass branch_id for IT Admin when a specific branch is selected
  const branchId = user?.role === 'it_admin' ? itBranchCtx?.selectedBranchId ?? null : null;

  const { data } = useQuery({
    queryKey: ['sidebar-badges', branchId],
    queryFn: async () => {
      const res = await dashboardApi.getBadges(
        branchId ? { branch_id: branchId } : undefined
      );
      // fetchWithAuth returns ApiResponse<BadgeCounts> with { success, data }
      return (res.data ?? {}) as BadgeCounts;
    },
    enabled: isAuthenticated,
    refetchInterval: 60_000, // refresh every 60 seconds
    staleTime: 30_000,
  });

  return data ?? {};
}

/**
 * Get badge count for a specific nav path
 */
export function getBadgeForPath(badges: SidebarBadges, path: string): number | undefined {
  const pathBadgeMap: Record<string, keyof SidebarBadges> = {
    // IT Admin
    '/admin/batches': 'batches',
    '/admin/pickups': 'pickups',

    // Org Admin
    '/org-admin/approvals': 'approvals',
    '/org-admin/disputes': 'disputes',
    '/org-admin/pickups': 'pickups',

    // OPS Admin
    '/ops/applications': 'applications',
    '/ops/pickups': 'opsPickups',
    '/ops/reviews': 'reviews',
    '/ops/qc': 'qc',
    '/ops/disputes': 'disputes',

    // Super Admin
    '/super/applications': 'applications',
    '/super/pickups': 'opsPickups',
    '/super/reviews': 'reviews',
    '/super/qc': 'qc',
    '/super/disputes': 'disputes',

    // Review & QC
    '/review/queue': 'reviews',
    '/review/qc': 'qc',
    '/review/disputes': 'disputes',

    // Logistics Admin
    '/logistics-admin/assignments': 'assignments',

    // Logistics User
    '/logistics': 'myPickups',
  };

  const badgeKey = pathBadgeMap[path];
  return badgeKey ? badges[badgeKey] : undefined;
}
