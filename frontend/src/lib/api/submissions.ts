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
  user_id: string;
  device_confirmed: boolean;
  photos?: Record<string, string>;
  functional_checks?: Record<string, unknown>;
  cosmetic_checklist?: Record<string, unknown> | null;
  accessories?: Record<string, unknown> | null;
  location?: Record<string, unknown> | null;
  declaration?: Record<string, unknown> | null;
  submitted_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface SubmissionCreateRequest {
  asset_id: string;
  device_confirmed?: boolean;
  photos?: Record<string, unknown>;
  functional_checks?: Record<string, unknown>;
  cosmetic_checklist?: Record<string, unknown> | null;
  accessories?: Record<string, unknown> | null;
  location?: Record<string, unknown> | null;
  declaration: Record<string, unknown>;
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

  getByAsset: async (assetId: string) => {
    // Use list endpoint and find the matching submission
    const listResult = await fetchWithAuth<SubmissionResponse[]>(`/submissions?page_size=100`);
    if (!listResult.success || !listResult.data) {
      return { success: false, error: listResult.error } as { success: false; data?: undefined; error?: { message: string } };
    }
    const match = (listResult.data as SubmissionResponse[]).find(s => s.asset_id === assetId);
    if (match) {
      return { success: true, data: match } as { success: true; data: SubmissionResponse };
    }
    return { success: false, error: { message: 'No submission found for this asset' } } as { success: false; data?: undefined; error: { message: string } };
  },

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
