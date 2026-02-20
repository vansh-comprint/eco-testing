/**
 * Disputes API Module
 * Dispute management and resolution endpoints
 */

import { fetchWithAuth } from './client';

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
  page?: number;
  page_size?: number;
  status?: string;
  dispute_type?: string;
  search?: string;
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
    query.set('page', (params.page ?? 1).toString());
    query.set('page_size', (params.page_size ?? 100).toString());
    if (params.status) query.set('status', params.status);
    if (params.dispute_type) query.set('dispute_type', params.dispute_type);
    if (params.search) query.set('search', params.search);
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
