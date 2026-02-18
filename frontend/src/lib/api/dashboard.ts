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

export interface DashboardStats {
  // Asset counts (Org Admin, IT Admin, OPS Admin)
  asset_total?: number;
  asset_completed?: number;
  asset_pending?: number;
  asset_pending_assignment?: number;
  asset_in_review?: number;
  asset_accepted?: number;
  asset_rejected?: number;

  // Asset rates (IT Admin)
  acceptance_rate?: number;
  pending_rate?: number;
  review_rate?: number;

  // Financial (Org Admin, OPS Admin)
  total_payout_value?: number;
  pending_payout_value?: number;
  pending_approval_value?: number;

  // Batch pipeline (Org Admin, IT Admin)
  batch_draft?: number;
  batch_pending_approval?: number;
  batch_approved?: number;
  batch_pickup_in_progress?: number;
  batch_completed?: number;
  batch_rejected?: number;
  batch_total?: number;
  batch_active?: number;
  batch_total_value?: number;
  batch_completion_rate?: number;

  // Branch (Org Admin)
  branch_total?: number;
  branch_active?: number;
  branch_without_admin?: number;

  // IT Admin counts (Org Admin)
  it_admin_active?: number;
  it_admin_total?: number;

  // Pickup (Org Admin, Logistics Admin)
  active_pickups?: number;
  pickup_pending_assignment?: number;
  pickup_assigned?: number;
  pickup_in_progress?: number;
  pickup_completed?: number;

  // Dispute (Org Admin, OPS Admin)
  pending_disputes?: number;

  // Stalled (Org Admin, IT Admin)
  stalled_batches?: number;
  stalled_assets?: number;

  // Enterprise (OPS Admin, Super Admin, Logistics Admin)
  enterprise_total?: number;
  enterprise_active?: number;
  enterprise_inactive?: number;
  enterprise_count?: number;

  // User counts (Super Admin)
  user_total?: number;
  user_count?: number;
  admin_count?: number;
  user_super_admin?: number;
  user_ops_admin?: number;
  user_it_admin?: number;
  user_org_admin?: number;
  user_logistics_admin?: number;
  user_logistics_user?: number;
  user_logistics?: number;

  // Employee
  my_assets?: number;
  pending?: number;
  submitted?: number;

  // Logistics Admin
  field_user_count?: number;

  // OPS Admin
  pending_review?: number;
  pending_qc?: number;
  pending_payout?: number;
  in_progress?: number;
  asset_conditionally_accepted?: number;
  asset_ready_for_pickup?: number;
}

// ============================================================================
// API
// ============================================================================

export const dashboardApi = {
  getBadges: (params?: { branch_id?: string | null }) => {
    const query = params?.branch_id ? `?branch_id=${params.branch_id}` : '';
    return fetchWithAuth<BadgeCounts>(`/dashboard/badges${query}`);
  },
  getStats: (params?: { branch_id?: string | null; enterprise_id?: string | null }) => {
    const searchParams = new URLSearchParams();
    if (params?.branch_id) searchParams.set('branch_id', params.branch_id);
    if (params?.enterprise_id) searchParams.set('enterprise_id', params.enterprise_id);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return fetchWithAuth<DashboardStats>(`/dashboard/stats${query}`);
  },
};
