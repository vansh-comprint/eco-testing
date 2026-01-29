/**
 * Analytics Hooks
 * React Query hooks for platform analytics data
 */

import { useQuery } from '@tanstack/react-query';
import { fetchAnalyticsData } from '@/lib/db/queries';

// Query Keys
export const analyticsKeys = {
  all: ['analytics'] as const,
  data: () => [...analyticsKeys.all, 'data'] as const,
};

// Main analytics hook
export function useAnalyticsData() {
  return useQuery({
    queryKey: analyticsKeys.data(),
    queryFn: fetchAnalyticsData,
    staleTime: 60 * 1000, // 1 minute - analytics data can be slightly stale
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

// Types for analytics data
export interface AnalyticsData {
  // Totals
  totalEnterprises: number;
  activeEnterprises: number;
  totalUsers: number;
  totalAdminUsers: number;
  totalSubUsers: number;
  totalAssets: number;
  totalPickups: number;
  totalPayouts: number;
  totalLogisticsAdmins: number;
  totalLogisticsUsers: number;

  // Revenue
  totalRevenue: number;
  totalCredits: number;

  // Growth
  monthlyGrowth: {
    enterprises: number;
    users: number;
    assets: number;
  };

  // Distributions
  roleDistribution: Record<string, number>;
  assetStatusDistribution: Record<string, number>;

  // Pickup stats
  pendingPickups: number;
  completedPickups: number;
  assignedPickups: number;

  // Recent activity
  recentActivity: {
    newEnterprises: number;
    newAssets: number;
    newPickups: number;
  };
}
