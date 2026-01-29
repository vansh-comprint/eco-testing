/**
 * Branches API Module
 * Branch management endpoints
 */

import { fetchWithAuth, DEFAULT_PAGE_SIZE } from './client';

// ============================================================================
// Types
// ============================================================================

export interface BranchResponse {
  id: string;
  enterprise_id: string;
  branch_name: string;
  branch_code: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pin_code: string;
  pickup_point_description?: string;
  site_contact_person?: string;
  site_contact_phone?: string;
  operating_hours?: string;
  special_instructions?: string;
  status: string;
  created_at: string;
  updated_at?: string;
  it_admin_id?: string | null;
  it_admin?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  } | null;
  it_admin_count?: number;
  asset_count?: number;
}

export interface BranchListParams {
  skip?: number;
  limit?: number;
  status?: string;
  search?: string;
  enterprise_id?: string;
}

export interface BranchCreateRequest {
  branch_name: string;
  branch_code: string;
  enterprise_id?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pin_code: string;
  pickup_point_description?: string;
  site_contact_person?: string;
  site_contact_phone?: string;
  operating_hours?: string;
  special_instructions?: string;
}

export interface BranchUpdateRequest {
  branch_name?: string;
  branch_code?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pin_code?: string;
  pickup_point_description?: string;
  site_contact_person?: string;
  site_contact_phone?: string;
  operating_hours?: string;
  special_instructions?: string;
  status?: string;
  it_admin_id?: string | null;
}

// ============================================================================
// API
// ============================================================================

export interface BranchSummary {
  id: string;
  enterprise_id: string;
  branch_name: string;
  branch_code: string;
  city: string;
  state: string;
  status: string;
  it_admin_count: number;
  asset_count: number;
  pending_assets: number;
  completed_assets: number;
}

export interface BulkBranchCreateRequest {
  branches: Array<BranchCreateRequest & { it_admin_email?: string }>;
}

export interface BulkBranchResult {
  created: BranchResponse[];
  errors: Array<{ index: number; error: string }>;
  created_count: number;
  error_count: number;
}

export const branchesApi = {
  list: (params: BranchListParams = {}) => {
    const query = new URLSearchParams();
    if (params.skip) query.set('skip', params.skip.toString());
    query.set('limit', (params.limit ?? DEFAULT_PAGE_SIZE).toString());
    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    if (params.enterprise_id) query.set('enterprise_id', params.enterprise_id);
    return fetchWithAuth<BranchResponse[]>(`/branches?${query.toString()}`);
  },

  get: (id: string) => fetchWithAuth<BranchResponse>(`/branches/${id}`),

  create: (data: BranchCreateRequest) =>
    fetchWithAuth<BranchResponse>('/branches', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: BranchUpdateRequest) =>
    fetchWithAuth<BranchResponse>(`/branches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchWithAuth<void>(`/branches/${id}`, { method: 'DELETE' }),

  /** Get branch summary with aggregated statistics */
  getSummary: (enterpriseId: string) =>
    fetchWithAuth<BranchSummary[]>(`/branches/summary?enterprise_id=${enterpriseId}`),

  /** Get branches managed by a specific IT Admin */
  getByITAdmin: (userId: string) =>
    fetchWithAuth<BranchResponse[]>(`/branches?it_admin_id=${userId}`),

  /** Check if branch code already exists for enterprise */
  checkCodeExists: (enterpriseId: string, code: string) =>
    fetchWithAuth<{ exists: boolean }>(`/branches/check-code?enterprise_id=${enterpriseId}&code=${encodeURIComponent(code)}`),

  /** Bulk create branches */
  bulkCreate: (enterpriseId: string, data: BulkBranchCreateRequest) =>
    fetchWithAuth<BulkBranchResult>(`/branches/bulk?enterprise_id=${enterpriseId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
