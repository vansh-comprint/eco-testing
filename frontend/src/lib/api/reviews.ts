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
  reviewer_id: string;
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
  page?: number;
  page_size?: number;
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

export interface FacilityQCCreateRequest {
  asset_id: string;
  decision: string;
  grade?: string;
  final_value?: number;
  functional_tests?: Record<string, unknown>;
  cosmetic_assessment?: Record<string, unknown>;
  hardware_tests?: Record<string, unknown>;
  photos?: Record<string, unknown>;
  notes?: string;
  rejection_reason?: string;
}

export interface OnSiteQCCreateRequest {
  asset_id: string;
  pickup_request_id: string;
  physical_condition_ok: boolean;
  powers_on: boolean;
  screen_ok: boolean;
  keyboard_ok?: boolean | null;
  ports_ok: boolean;
  photo_urls?: string[];
  notes?: string;
  extra_data?: Record<string, unknown>;
}

export interface OnSiteQCResponse {
  id: string;
  asset_id: string;
  pickup_request_id: string | null;
  performed_by_user_id?: string;
  status: string;
  physical_condition_ok: boolean;
  powers_on: boolean;
  screen_ok: boolean;
  keyboard_ok?: boolean | null;
  ports_ok: boolean;
  photo_urls?: string[];
  notes?: string;
  performed_at: string;
  extra_data?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// API
// ============================================================================

export const reviewsApi = {
  listRemote: (params: ReviewListParams = {}) => {
    const query = new URLSearchParams();
    query.set('page', (params.page ?? 1).toString());
    query.set('page_size', (params.page_size ?? DEFAULT_PAGE_SIZE).toString());
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
    query.set('page', (params.page ?? 1).toString());
    query.set('page_size', (params.page_size ?? DEFAULT_PAGE_SIZE).toString());
    if (params.decision) query.set('decision', params.decision);
    return fetchWithAuth<FacilityQCResponse[]>(`/reviews/facility?${query.toString()}`);
  },

  getFacility: (id: string) => fetchWithAuth<FacilityQCResponse>(`/reviews/facility/${id}`),

  createFacility: (data: FacilityQCCreateRequest) =>
    fetchWithAuth<FacilityQCResponse>('/reviews/facility', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listOnsite: (params: ReviewListParams = {}) => {
    const query = new URLSearchParams();
    query.set('page', (params.page ?? 1).toString());
    query.set('page_size', (params.page_size ?? DEFAULT_PAGE_SIZE).toString());
    if (params.status) query.set('status', params.status);
    return fetchWithAuth<OnSiteQCResponse[]>(`/reviews/onsite?${query.toString()}`);
  },

  getOnsite: (id: string) => fetchWithAuth<OnSiteQCResponse>(`/reviews/onsite/${id}`),

  createOnsite: (data: OnSiteQCCreateRequest) =>
    fetchWithAuth<OnSiteQCResponse>('/reviews/onsite', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getOnsiteByPickup: (pickupRequestId: string) =>
    fetchWithAuth<OnSiteQCResponse[]>(`/reviews/onsite/by-pickup/${pickupRequestId}`),
};
