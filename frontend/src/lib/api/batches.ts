/**
 * Batches API Module
 * Batch management and approval workflow endpoints
 */

import { fetchWithAuth, DEFAULT_PAGE_SIZE } from './client';

// ============================================================================
// Types
// ============================================================================

export interface BatchResponse {
  id: string;
  name: string;
  description?: string;
  status: string;
  enterprise_id: string;
  branch_id?: string;
  created_by?: string;
  it_admin_id?: string;
  asset_count: number;
  accepted_count: number;
  rejected_count: number;
  pending_count: number;
  estimated_value: number;
  total_payout: number;
  pickup_location_override?: string;
  preferred_pickup_date?: string;
  preferred_pickup_slot?: string;
  pickup_priority: string;
  it_admin_notes?: string;
  logistics_instructions?: string;
  requires_approval: boolean;
  submitted_for_approval_at?: string;
  approved_by?: string;
  approved_at?: string;
  org_admin_notes?: string;
  rejected_by?: string;
  rejected_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at?: string;
  created_by_name?: string;
  branch_name?: string;
  total_estimated_value?: number;
  // Progress stats (computed by backend)
  progress?: {
    total: number;
    pending_assignment: number;
    assigned: number;
    in_review: number;
    verified: number;
    in_pickup: number;
    picked_up: number;
    completed: number;
    rejected: number;
  };
}

export interface BatchListParams {
  skip?: number;
  limit?: number;
  status?: string;
  statuses?: string;
  search?: string;
  enterprise_id?: string;
  branch_id?: string;
  sort_by?: string;
}

export interface BatchCreateRequest {
  name: string;
  description?: string;
  enterprise_id?: string;
  branch_id?: string;
  status?: string;
}

export interface BatchUpdateRequest {
  name?: string;
  description?: string;
  status?: string;
  pickup_address?: Record<string, unknown>;
  pickup_date?: string;
  pickup_time_slot?: string;
}

export interface BatchSubmitForApprovalRequest {
  preferred_pickup_date: string;
  preferred_pickup_slot: string;
  pickup_priority?: string;
  pickup_location_override?: string;
  it_admin_notes?: string;
  logistics_instructions?: string;
}

// ============================================================================
// API
// ============================================================================

export const batchesApi = {
  list: (params: BatchListParams = {}) => {
    const query = new URLSearchParams();
    if (params.skip) query.set('skip', params.skip.toString());
    query.set('limit', (params.limit ?? DEFAULT_PAGE_SIZE).toString());
    if (params.status) query.set('status', params.status);
    if (params.statuses) query.set('statuses', params.statuses);
    if (params.search) query.set('search', params.search);
    if (params.enterprise_id) query.set('enterprise_id', params.enterprise_id);
    if (params.branch_id) query.set('branch_id', params.branch_id);
    if (params.sort_by) query.set('sort_by', params.sort_by);
    return fetchWithAuth<BatchResponse[]>(`/batches?${query.toString()}`);
  },

  get: (id: string) => fetchWithAuth<BatchResponse>(`/batches/${id}`),

  create: (data: BatchCreateRequest) =>
    fetchWithAuth<BatchResponse>('/batches', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: BatchUpdateRequest) =>
    fetchWithAuth<BatchResponse>(`/batches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string, options?: { deleteAssets?: boolean; deleteSubUsers?: boolean }) => {
    const params = new URLSearchParams();
    if (options?.deleteAssets) params.set('delete_assets', 'true');
    if (options?.deleteSubUsers) params.set('delete_sub_users', 'true');
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchWithAuth<void>(`/batches/${id}${query}`, { method: 'DELETE' });
  },

  addAssets: (id: string, assetIds: string[]) =>
    fetchWithAuth<BatchResponse>(`/batches/${id}/assets`, {
      method: 'POST',
      body: JSON.stringify({ asset_ids: assetIds }),
    }),

  removeAssets: (id: string, assetIds: string[]) =>
    fetchWithAuth<BatchResponse>(`/batches/${id}/assets`, {
      method: 'DELETE',
      body: JSON.stringify({ asset_ids: assetIds }),
    }),

  submitForApproval: (id: string, data: BatchSubmitForApprovalRequest) =>
    fetchWithAuth<BatchResponse>(`/batches/${id}/submit-for-approval`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  approve: (id: string, notes?: string) =>
    fetchWithAuth<BatchResponse>(`/batches/${id}/approval`, {
      method: 'POST',
      body: JSON.stringify({ action: 'approve', org_admin_notes: notes }),
    }),

  reject: (id: string, reason: string, notes?: string) =>
    fetchWithAuth<BatchResponse>(`/batches/${id}/approval`, {
      method: 'POST',
      body: JSON.stringify({ action: 'reject', rejection_reason: reason, org_admin_notes: notes }),
    }),

  pendingApproval: (params: { skip?: number; limit?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.skip) query.set('skip', params.skip.toString());
    query.set('limit', (params.limit ?? DEFAULT_PAGE_SIZE).toString());
    return fetchWithAuth<BatchResponse[]>(`/batches/pending-approval?${query.toString()}`);
  },
};
