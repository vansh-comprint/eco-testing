/**
 * useDashboardStats - Provides role-specific aggregated stats for dashboard stat cards.
 *
 * Fetches counts/sums from a single backend endpoint (GET /dashboard/stats)
 * instead of pulling full entity lists and filtering client-side.
 *
 * Mirrors the useSidebarBadges pattern exactly.
 */

import { useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { dashboardApi, type DashboardStats } from '@/lib/api';
import { ITAdminBranchContext } from '@/contexts/ITAdminBranchContext';

export const dashboardStatsKeys = {
  all: ['dashboard-stats'] as const,
  scoped: (branchId: string | null, enterpriseId?: string | null) =>
    [...dashboardStatsKeys.all, branchId, enterpriseId ?? null] as const,
};

export function useDashboardStats(opts?: {
  enterpriseId?: string | null;
  branchId?: string | null;
}): { stats: DashboardStats; isLoading: boolean } {
  const { isAuthenticated, user } = useAuth();
  const itBranchCtx = useContext(ITAdminBranchContext);

  // Pass branch_id for IT Admin (from context) or from explicit caller opt
  const branchId = opts?.branchId ?? (user?.role === 'it_admin' ? itBranchCtx?.selectedBranchId ?? null : null);
  const enterpriseId = opts?.enterpriseId ?? null;

  const { data, isLoading } = useQuery({
    queryKey: dashboardStatsKeys.scoped(branchId, enterpriseId),
    queryFn: async () => {
      const params: { branch_id?: string; enterprise_id?: string } = {};
      if (branchId) params.branch_id = branchId;
      if (enterpriseId) params.enterprise_id = enterpriseId;
      const res = await dashboardApi.getStats(
        Object.keys(params).length > 0 ? params : undefined
      );
      return (res.data ?? {}) as DashboardStats;
    },
    enabled: isAuthenticated,
    staleTime: 30_000,       // 30 seconds
    refetchInterval: 60_000, // auto-refresh every 60 seconds
  });

  return { stats: data ?? {}, isLoading };
}
