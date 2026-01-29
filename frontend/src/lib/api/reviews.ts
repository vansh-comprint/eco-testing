/**
 * Reviews API Module
 * Remote review and facility QC endpoints
 */

import { fetchWithAuth, DEFAULT_PAGE_SIZE } from './client';

// ============================================================================
// Types
// ============================================================================

export interface RemoteReviewResponse {
  id: string;
  asset_id: string;
  submission_id?: string;
  reviewer_id: string;
  decision: string;
  condition_grade?: string;
  adjusted_value?: number;
  notes?: string;
  review_data?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

export interface FacilityQCResponse {
  id: string;
  asset_id: string;
  technician_id: string;
  decision: string;
  physical_grade?: string;
  functional_grade?: string;
  cosmetic_grade?: string;
  final_value?: number;
  defects_found?: string[];
  notes?: string;
  qc_data?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

export interface ReviewListParams {
  skip?: number;
  limit?: number;
  decision?: string;
  status?: string;
}

export interface RemoteReviewCreateRequest {
  asset_id: string;
  submission_id?: string;
  decision: string;
  grade?: string;
  estimated_value?: number;
  notes?: string;
  rejection_reason?: string;
  checklist_results?: Record<string, unknown>;
}

// ============================================================================
// API
// ============================================================================

export const reviewsApi = {
  listRemote: (params: ReviewListParams = {}) => {
    const query = new URLSearchParams();
    if (params.skip) query.set('skip', params.skip.toString());
    query.set('limit', (params.limit ?? DEFAULT_PAGE_SIZE).toString());
    if (params.decision) query.set('decision', params.decision);
    return fetchWithAuth<RemoteReviewResponse[]>(`/reviews/remote?${query.toString()}`);
  },

  getRemote: (id: string) => fetchWithAuth<RemoteReviewResponse>(`/reviews/remote/${id}`),

  createRemote: (data: RemoteReviewCreateRequest) =>
    fetchWithAuth<RemoteReviewResponse>('/reviews/remote', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateRemote: (id: string, data: Partial<RemoteReviewCreateRequest>) =>
    fetchWithAuth<RemoteReviewResponse>(`/reviews/remote/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  listFacility: (params: ReviewListParams = {}) => {
    const query = new URLSearchParams();
    if (params.skip) query.set('skip', params.skip.toString());
    query.set('limit', (params.limit ?? DEFAULT_PAGE_SIZE).toString());
    if (params.decision) query.set('decision', params.decision);
    return fetchWithAuth<FacilityQCResponse[]>(`/reviews/facility?${query.toString()}`);
  },

  getFacility: (id: string) => fetchWithAuth<FacilityQCResponse>(`/reviews/facility/${id}`),

  listOnsite: (params: ReviewListParams = {}) => {
    const query = new URLSearchParams();
    if (params.skip) query.set('skip', params.skip.toString());
    query.set('limit', (params.limit ?? DEFAULT_PAGE_SIZE).toString());
    if (params.status) query.set('status', params.status);
    return fetchWithAuth<FacilityQCResponse[]>(`/reviews/onsite?${query.toString()}`);
  },

  getOnsite: (id: string) => fetchWithAuth<FacilityQCResponse>(`/reviews/onsite/${id}`),
};
