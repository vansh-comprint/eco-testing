/**
 * Enterprise Applications API Module
 * Enterprise registration and approval workflow endpoints
 */

import { fetchWithAuth, fetchPublic, DEFAULT_PAGE_SIZE } from './client';

// ============================================================================
// Types
// ============================================================================

export interface EnterpriseApplicationResponse {
  id: string;
  application_ref?: string;
  company_name: string;
  legal_name?: string;
  gst_number?: string;
  pan_number?: string;
  registered_address?: string;
  industry_type?: string;
  company_size?: string;
  org_admin_name: string;
  org_admin_email: string;
  org_admin_phone?: string;
  org_admin_designation?: string;
  industry?: string;
  employee_count?: number;
  city?: string;
  status: 'pending' | 'approved' | 'rejected' | 'more_info_requested';
  documents?: Record<string, string>;
  doc_gst_certificate?: string;
  doc_pan_card?: string;
  doc_incorporation_cert?: string;
  doc_signatory_id?: string;
  doc_address_proof?: string;
  doc_company_logo?: string;
  created_at: string;
  updated_at?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
  admin_notes?: string;
}

export interface EnterpriseApplicationListParams {
  skip?: number;
  limit?: number;
  status?: string;
}

export interface EnterpriseApplicationCreateRequest {
  company_name: string;
  legal_name?: string;
  gst_number?: string;
  pan_number?: string;
  registered_address?: string;
  industry_type?: string;
  industry?: string;
  company_size?: string;
  employee_count?: number;
  org_admin_name: string;
  org_admin_email: string;
  org_admin_phone?: string;
  org_admin_designation?: string;
  password?: string;
  doc_gst_certificate?: string;
  doc_pan_card?: string;
  doc_incorporation_cert?: string;
  doc_signatory_id?: string;
  doc_address_proof?: string;
  doc_company_logo?: string;
}

export interface EnterpriseApplicationUpdateDocsRequest {
  doc_gst_certificate?: string;
  doc_pan_card?: string;
  doc_incorporation_cert?: string;
  doc_signatory_id?: string;
  doc_address_proof?: string;
  doc_company_logo?: string;
}

// ============================================================================
// API
// ============================================================================

export interface EnterpriseApplicationStats {
  pending: number;
  approved: number;
  rejected: number;
  more_info_requested: number;
  total: number;
}

export const enterpriseApplicationsApi = {
  stats: () =>
    fetchWithAuth<EnterpriseApplicationStats>('/enterprises/applications/stats'),

  list: (params: EnterpriseApplicationListParams = {}) => {
    const query = new URLSearchParams();
    if (params.skip) query.set('skip', params.skip.toString());
    query.set('limit', (params.limit ?? DEFAULT_PAGE_SIZE).toString());
    if (params.status) query.set('status', params.status);
    return fetchWithAuth<EnterpriseApplicationResponse[]>(`/enterprises/applications?${query.toString()}`);
  },

  get: (id: string) =>
    fetchWithAuth<EnterpriseApplicationResponse>(`/enterprises/applications/${id}`),

  create: (data: EnterpriseApplicationCreateRequest) =>
    fetchPublic<EnterpriseApplicationResponse>('/enterprises/applications', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  approve: (id: string, notes?: string) =>
    fetchWithAuth<EnterpriseApplicationResponse>(`/enterprises/applications/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ review_notes: notes }),
    }),

  reject: (id: string, reason: string) =>
    fetchWithAuth<EnterpriseApplicationResponse>(`/enterprises/applications/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  /** Request more information from the applicant */
  requestMoreInfo: (id: string, notes: string) =>
    fetchWithAuth<EnterpriseApplicationResponse>(`/enterprises/applications/${id}/request-info`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),

  /** Update application documents (for resubmission after info request) */
  updateDocuments: (id: string, documents: EnterpriseApplicationUpdateDocsRequest) =>
    fetchWithAuth<EnterpriseApplicationResponse>(`/enterprises/applications/${id}/documents`, {
      method: 'PUT',
      body: JSON.stringify(documents),
    }),

  /** Check if GST number already exists (public endpoint — no auth needed) */
  checkGSTExists: (gstNumber: string) =>
    fetchPublic<{ exists: boolean }>(`/enterprises/applications/check-gst?gst_number=${encodeURIComponent(gstNumber)}`),

  /** Check if email already exists (public endpoint — no auth needed) */
  checkEmailExists: (email: string) =>
    fetchPublic<{ exists: boolean }>(`/enterprises/applications/check-email?email=${encodeURIComponent(email)}`),
};
