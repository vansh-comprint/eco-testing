/**
 * Disputes API Module
 * Dispute management and resolution endpoints
 */

import { fetchWithAuth, DEFAULT_PAGE_SIZE } from './client';

// ============================================================================
// Types
// ============================================================================

export interface DisputeResponse {
  id: string;
  asset_id: string;
  raised_by_user_id: string;
  assigned_to_user_id?: string;
  dispute_type: string;
  status: string;
  description: string;
  evidence_urls?: string[];
  resolution?: string;
  resolved_at?: string;
  resolved_by_user_id?: string;
  extra_data?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

export interface DisputeListParams {
  skip?: number;
  limit?: number;
  status?: string;
  dispute_type?: string;
}

export interface DisputeCreateRequest {
  asset_id: string;
  dispute_type: string;
  description: string;
  evidence_urls?: string[];
}

// ============================================================================
// API
// ============================================================================

export const disputesApi = {
  list: (params: DisputeListParams = {}) => {
    const query = new URLSearchParams();
    if (params.skip) query.set('skip', params.skip.toString());
    query.set('limit', (params.limit ?? DEFAULT_PAGE_SIZE).toString());
    if (params.status) query.set('status', params.status);
    if (params.dispute_type) query.set('dispute_type', params.dispute_type);
    return fetchWithAuth<DisputeResponse[]>(`/disputes?${query.toString()}`);
  },

  get: (id: string) => fetchWithAuth<DisputeResponse>(`/disputes/${id}`),

  create: (data: DisputeCreateRequest) =>
    fetchWithAuth<DisputeResponse>('/disputes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<DisputeCreateRequest>) =>
    fetchWithAuth<DisputeResponse>(`/disputes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  assign: (id: string, assignedToUserId: string) =>
    fetchWithAuth<DisputeResponse>(`/disputes/${id}/assign?assigned_to_user_id=${assignedToUserId}`, {
      method: 'POST',
    }),

  resolve: (id: string, resolution: string) =>
    fetchWithAuth<DisputeResponse>(`/disputes/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution }),
    }),
};
