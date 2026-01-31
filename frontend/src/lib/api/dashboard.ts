/**
 * Dashboard API Module
 * Badge counts and summary data endpoints
 */

import { fetchWithAuth } from './client';

// ============================================================================
// Types
// ============================================================================

export interface BadgeCounts {
  // IT Admin
  batches?: number;
  assets?: number;
  pickups?: number;

  // Org Admin
  approvals?: number;

  // OPS Admin / Super Admin
  applications?: number;
  reviews?: number;
  qc?: number;
  opsPickups?: number;
  disputes?: number;

  // Logistics Admin
  assignments?: number;

  // Logistics User
  myPickups?: number;
}

// ============================================================================
// API
// ============================================================================

export const dashboardApi = {
  getBadges: (params?: { branch_id?: string | null }) => {
    const query = params?.branch_id ? `?branch_id=${params.branch_id}` : '';
    return fetchWithAuth<BadgeCounts>(`/dashboard/badges${query}`);
  },
};
