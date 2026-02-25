/**
 * Enterprises API Module
 * Enterprise management endpoints
 */

import { fetchWithAuth, DEFAULT_PAGE_SIZE } from './client';

// ============================================================================
// Types
// ============================================================================

export interface EnterpriseResponse {
  id: string;
  name: string;
  legal_name?: string;
  gst_number?: string;
  gstin?: string;
  pan_number?: string;
  address?: Record<string, unknown>;
  industry?: string;
  company_size?: string;
  companySize?: string;
  employee_count?: number;
  contact_person?: string;
  contact_email?: string;
  contactEmail?: string;
  contact_phone?: string;
  email?: string;
  city?: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

export interface EnterpriseListParams {
  skip?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface EnterpriseCreateRequest {
  name: string;
  legal_name?: string;
  gst_number?: string;
  pan_number?: string;
  address?: Record<string, unknown>;
  industry?: string;
  company_size?: string;
  employee_count?: number;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
}

export interface EnterpriseUpdateRequest {
  name?: string;
  legal_name?: string;
  gst_number?: string;
  pan_number?: string;
  address?: Record<string, unknown>;
  industry?: string;
  company_size?: string;
  employee_count?: number;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  status?: string;
}

export interface EnterpriseDeactivationPreview {
  enterprise_id: string;
  enterprise_name: string;
  total_users_to_deactivate: number;
  users_by_role: Record<string, number>;
  batches_to_cancel: number;
  pickups_to_cancel: number;
  branches_affected: number;
}

export interface EnterpriseDeactivationResult {
  enterprise_id: string;
  users_deactivated: number;
  batches_cancelled: number;
  pickups_cancelled: number;
  reason: string;
}

// ============================================================================
// API
// ============================================================================

export const enterprisesApi = {
  list: (params: EnterpriseListParams = {}) => {
    const query = new URLSearchParams();
    if (params.skip) query.set('skip', params.skip.toString());
    query.set('limit', (params.limit ?? DEFAULT_PAGE_SIZE).toString());
    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    return fetchWithAuth<EnterpriseResponse[]>(`/enterprises?${query.toString()}`);
  },

  get: (id: string) => fetchWithAuth<EnterpriseResponse>(`/enterprises/${id}`),

  create: (data: EnterpriseCreateRequest) =>
    fetchWithAuth<EnterpriseResponse>('/enterprises', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: EnterpriseUpdateRequest) =>
    fetchWithAuth<EnterpriseResponse>(`/enterprises/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchWithAuth<void>(`/enterprises/${id}`, { method: 'DELETE' }),

  previewDeactivation: (id: string) =>
    fetchWithAuth<EnterpriseDeactivationPreview>(`/enterprises/${id}/deactivation-preview`),

  deactivate: (id: string, reason: string) =>
    fetchWithAuth<EnterpriseDeactivationResult>(`/enterprises/${id}/deactivate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
};
