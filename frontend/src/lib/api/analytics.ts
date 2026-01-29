/**
 * Analytics API Module
 * Platform statistics and reporting endpoints
 */

import { fetchWithAuth } from './client';

// ============================================================================
// Types
// ============================================================================

export interface PlatformStats {
  total_enterprises: number;
  total_users: number;
  total_assets: number;
  monthly_revenue: number;
}

export interface AssetDistribution {
  distribution: Record<string, number>;
  raw: Record<string, number>;
}

export interface MonthlyTrend {
  month: string;
  assets_processed: number;
}

// ============================================================================
// API
// ============================================================================

export const analyticsApi = {
  getPlatformStats: () =>
    fetchWithAuth<PlatformStats>('/analytics/platform-stats'),

  getAssetDistribution: () =>
    fetchWithAuth<AssetDistribution>('/analytics/asset-distribution'),

  getMonthlyTrends: (months = 6) =>
    fetchWithAuth<{ trends: MonthlyTrend[] }>(`/analytics/monthly-trends?months=${months}`),
};
