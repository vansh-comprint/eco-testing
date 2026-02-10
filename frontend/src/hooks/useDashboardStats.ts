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
  scoped: (branchId: string | null) => [...dashboardStatsKeys.all, branchId] as const,
};

export function useDashboardStats(): { stats: DashboardStats; isLoading: boolean } {
  const { isAuthenticated, user } = useAuth();
  const itBranchCtx = useContext(ITAdminBranchContext);

  // Only pass branch_id for IT Admin when a specific branch is selected
  const branchId = user?.role === 'it_admin' ? itBranchCtx?.selectedBranchId ?? null : null;

  const { data, isLoading } = useQuery({
    queryKey: dashboardStatsKeys.scoped(branchId),
    queryFn: async () => {
      const res = await dashboardApi.getStats(
        branchId ? { branch_id: branchId } : undefined
      );
      return (res.data ?? {}) as DashboardStats;
    },
    enabled: isAuthenticated,
    staleTime: 30_000,       // 30 seconds
    refetchInterval: 60_000, // auto-refresh every 60 seconds
  });

  return { stats: data ?? {}, isLoading };
}
