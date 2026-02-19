/**
 * EPR Certificates API Module
 * EPR certificate management endpoints
 */

import { fetchWithAuth, DEFAULT_PAGE_SIZE } from './client';

// ============================================================================
// Types
// ============================================================================

export interface EPRCertificateResponse {
  id: string;
  enterprise_id: string;
  batch_id?: string;
  certificate_number: string;
  status: string;
  issue_date?: string;
  expiry_date?: string;
  total_weight_kg: number;
  recycled_weight_kg?: number;
  disposed_weight_kg?: number;
  asset_ids?: string[];
  recycler_partner_id?: string;
  recycler_name?: string;
  recycler_license_number?: string;
  certificate_url?: string;
  notes?: string;
  extra_data?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
  created_by?: string;
}

export interface EPRCertificateListParams {
  skip?: number;
  limit?: number;
  status?: string;
  search?: string;
  enterprise_id?: string;
}

export interface EPRCertificateCreateRequest {
  enterprise_id?: string;
  batch_id?: string;
  total_weight_kg?: number;
  recycled_weight_kg?: number;
  disposed_weight_kg?: number;
  recycler_name?: string;
  recycler_license_number?: string;
  recycler_partner_id?: string;
  asset_ids?: string[];
  notes?: string;
}

export interface EPRCertificateUpdateRequest {
  status?: string;
  issue_date?: string;
  expiry_date?: string;
  total_weight_kg?: number;
  recycled_weight_kg?: number;
  disposed_weight_kg?: number;
  recycler_name?: string;
  recycler_license_number?: string;
  recycler_partner_id?: string;
  certificate_url?: string;
  notes?: string;
}

export interface EPRWeightTotals {
  total_weight: number;
  recycled_weight: number;
  disposed_weight: number;
}

// ============================================================================
// API
// ============================================================================

export const eprCertificatesApi = {
  list: (params: EPRCertificateListParams = {}) => {
    const query = new URLSearchParams();
    if (params.skip) query.set('skip', params.skip.toString());
    query.set('limit', (params.limit ?? DEFAULT_PAGE_SIZE).toString());
    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    if (params.enterprise_id) query.set('enterprise_id', params.enterprise_id);
    return fetchWithAuth<EPRCertificateResponse[]>(`/epr-certificates?${query.toString()}`);
  },

  get: (id: string) => fetchWithAuth<EPRCertificateResponse>(`/epr-certificates/${id}`),

  create: (data: EPRCertificateCreateRequest) =>
    fetchWithAuth<EPRCertificateResponse>('/epr-certificates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: EPRCertificateUpdateRequest) =>
    fetchWithAuth<EPRCertificateResponse>(`/epr-certificates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchWithAuth<void>(`/epr-certificates/${id}`, { method: 'DELETE' }),

  weightTotals: (enterpriseId?: string) => {
    const query = new URLSearchParams();
    if (enterpriseId) query.set('enterprise_id', enterpriseId);
    return fetchWithAuth<EPRWeightTotals>(`/epr-certificates/weight-totals?${query.toString()}`);
  },
};
