/**
 * Assets API Module
 * Asset management endpoints
 */

import { fetchWithAuth, DEFAULT_PAGE_SIZE } from './client';

// ============================================================================
// Types
// ============================================================================

export interface AssetResponse {
  id: string;
  serial_number: string;
  asset_tag?: string;
  device_type?: string;
  category?: string;
  type?: string;
  brand?: string;
  model?: string;
  specs?: Record<string, unknown>;
  processor?: string;
  ram?: string;
  storage?: string;
  purchase_date?: string;
  status: string;
  enterprise_id: string;
  enterprise_name?: string;
  branch_id?: string;
  branch_name?: string;
  branches?: { branch_name: string };
  enterprises?: { name: string };
  batch_id?: string;
  assigned_to?: string;
  assigned_to_user_id?: string;
  assigned_at?: string;
  grade?: string;
  base_price?: number;
  final_price?: number;
  condition_grade?: string;
  estimated_value?: number;
  final_value?: number;
  created_at: string;
  updated_at?: string;
}

export interface AssetListParams {
  skip?: number;
  limit?: number;
  status?: string;
  batch_id?: string;
  branch_id?: string;
  enterprise_id?: string;
  search?: string;
}

export interface AssetCreateRequest {
  serial_number: string;
  asset_tag?: string;
  device_type: string;
  brand?: string;
  model?: string;
  enterprise_id?: string;
  branch_id?: string;
  batch_id?: string;
  specs?: Record<string, unknown>;
  purchase_date?: string;
  assigned_to_user_id?: string;
}

export interface AssetUpdateRequest {
  asset_tag?: string;
  brand?: string;
  model?: string;
  status?: string;
  branch_id?: string;
  batch_id?: string;
  assigned_to_user_id?: string;
  condition_grade?: string;
  estimated_value?: number;
  final_price?: number;
  base_price?: number;
}

export interface AssetBulkCreateRequest {
  enterprise_id?: string;
  branch_id?: string;
  batch_id?: string;
  assets: AssetCreateRequest[];
}

export interface AssetBulkCreateResponse {
  created: AssetResponse[];
  errors: { index: number; serial_number: string; error: string }[];
  created_count: number;
  error_count: number;
}

// ============================================================================
// API
// ============================================================================

export const assetsApi = {
  list: (params: AssetListParams = {}) => {
    const query = new URLSearchParams();
    if (params.skip) query.set('skip', params.skip.toString());
    query.set('limit', (params.limit ?? DEFAULT_PAGE_SIZE).toString());
    if (params.status) query.set('status', params.status);
    if (params.batch_id) query.set('batch_id', params.batch_id);
    if (params.branch_id) query.set('branch_id', params.branch_id);
    if (params.enterprise_id) query.set('enterprise_id', params.enterprise_id);
    if (params.search) query.set('search', params.search);
    return fetchWithAuth<AssetResponse[]>(`/assets?${query.toString()}`);
  },

  get: (id: string) => fetchWithAuth<AssetResponse>(`/assets/${id}`),

  create: (data: AssetCreateRequest) =>
    fetchWithAuth<AssetResponse>('/assets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  createBulk: (data: AssetBulkCreateRequest) =>
    fetchWithAuth<AssetBulkCreateResponse>('/assets/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: AssetUpdateRequest) =>
    fetchWithAuth<AssetResponse>(`/assets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchWithAuth<void>(`/assets/${id}`, { method: 'DELETE' }),

  assign: (id: string, userId: string) =>
    fetchWithAuth<AssetResponse>(`/assets/${id}/assign?assigned_to_user_id=${encodeURIComponent(userId)}`, {
      method: 'POST',
    }),

  unassign: (id: string) =>
    fetchWithAuth<AssetResponse>(`/assets/${id}/unassign`, {
      method: 'POST',
    }),

  transitionStatus: (id: string, newStatus: string) =>
    fetchWithAuth<AssetResponse>(`/assets/${id}/status?new_status=${encodeURIComponent(newStatus)}`, {
      method: 'PATCH',
    }),
};
