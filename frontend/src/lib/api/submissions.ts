/**
 * Submissions API Module
 * Employee device submission endpoints (check-in flow)
 */

import { fetchWithAuth, DEFAULT_PAGE_SIZE } from './client';

// ============================================================================
// Types
// ============================================================================

export interface SubmissionResponse {
  id: string;
  asset_id: string;
  employee_id: string;
  status: string;
  device_confirmed: boolean;
  photos?: Record<string, string>;
  functional_checks?: Record<string, unknown>;
  declaration_accepted: boolean;
  created_at: string;
  submitted_at?: string;
}

export interface SubmissionCreateRequest {
  asset_id: string;
  device_confirmed?: boolean;
  photos?: Record<string, string>;
  functional_checks?: Record<string, unknown>;
  declaration_accepted?: boolean;
  condition_data?: Record<string, unknown>;
}

export interface SubmissionListParams {
  skip?: number;
  limit?: number;
  status?: string;
  asset_id?: string;
}

// ============================================================================
// API
// ============================================================================

export const submissionsApi = {
  list: (params: SubmissionListParams = {}) => {
    const query = new URLSearchParams();
    if (params.skip) query.set('skip', params.skip.toString());
    query.set('limit', (params.limit ?? DEFAULT_PAGE_SIZE).toString());
    if (params.status) query.set('status', params.status);
    if (params.asset_id) query.set('asset_id', params.asset_id);
    return fetchWithAuth<SubmissionResponse[]>(`/submissions?${query.toString()}`);
  },

  get: (id: string) => fetchWithAuth<SubmissionResponse>(`/submissions/${id}`),

  create: (data: SubmissionCreateRequest) =>
    fetchWithAuth<SubmissionResponse>('/submissions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<SubmissionCreateRequest>) =>
    fetchWithAuth<SubmissionResponse>(`/submissions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  submit: (id: string) =>
    fetchWithAuth<SubmissionResponse>(`/submissions/${id}/submit`, { method: 'POST' }),
};
