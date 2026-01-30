/**
 * useSidebarBadges - Provides action-required badge counts for sidebar navigation.
 *
 * Fetches counts from a single backend endpoint (GET /dashboard/badges)
 * instead of pulling full entity lists and filtering client-side.
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { dashboardApi, type BadgeCounts } from '@/lib/api';

export type SidebarBadges = BadgeCounts;

export function useSidebarBadges(): SidebarBadges {
  const { isAuthenticated } = useAuth();

  const { data } = useQuery({
    queryKey: ['sidebar-badges'],
    queryFn: async () => {
      const res = await dashboardApi.getBadges();
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
    '/admin/assets': 'assets',
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

    // Technician
    '/tech/review': 'reviews',
    '/tech/qc': 'qc',
    '/tech/disputes': 'disputes',

    // Logistics Admin
    '/logistics-admin/assignments': 'assignments',

    // Logistics User
    '/logistics': 'myPickups',
  };

  const badgeKey = pathBadgeMap[path];
  return badgeKey ? badges[badgeKey] : undefined;
}
