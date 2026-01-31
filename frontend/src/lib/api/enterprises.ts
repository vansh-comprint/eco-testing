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
  pan_number?: string;
  address?: Record<string, unknown>;
  industry?: string;
  company_size?: string;
  employee_count?: number;
  contact_person?: string;
  contact_email?: string;
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
};
