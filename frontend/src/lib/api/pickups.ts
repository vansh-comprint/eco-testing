/**
 * Pickups API Module
 * Pickup request and logistics coordination endpoints
 */

import { fetchWithAuth, DEFAULT_PAGE_SIZE } from './client';

// ============================================================================
// Types
// ============================================================================

export interface PickupResponse {
  id: string;
  enterprise_id: string;
  location_id?: string;
  batch_id?: string;
  branch_id?: string;
  logistics_admin_id?: string;
  logistics_user_id?: string;
  asset_ids: string[];
  asset_count?: number;
  picked_asset_ids?: string[];
  assets?: Array<{
    id?: string;
    asset_id?: string;
    serial_number?: string;
    brand?: string;
    model?: string;
    status: string;
    qcResult?: { serialMatch?: boolean; powersOn?: boolean };
  }>;
  preferred_date?: string;
  preferred_time_slot?: string;
  scheduled_date?: string;
  confirmed_date?: string;
  confirmed_time_slot?: string;
  assigned_at?: string;
  scheduled_at?: string;
  started_at?: string;
  assigned_by_id?: string;
  status: string;
  priority: string;
  special_instructions?: string;
  it_admin_notes?: string;
  logistics_notes?: string;
  completed_at?: string;
  proof_of_pickup?: unknown;
  created_at: string;
  updated_at?: string;
  // Joined data
  enterprise_name?: string;
  branch_name?: string;
  pickup_location?: {
    id: string;
    name: string;
    address: string;
    city?: string;
    state?: string;
    pin_code?: string;
    contact_person?: string;
    contact_phone?: string;
    operating_hours?: string;
  };
  pickup_locations?: {
    id: string;
    name: string;
    address: string;
    city?: string;
    state?: string;
    pin_code?: string;
    contact_person?: string;
    contact_phone?: string;
    operating_hours?: string;
  };
  branches?: {
    branch_name: string;
    branch_code?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    pin_code?: string;
    site_contact_person?: string;
    site_contact_phone?: string;
    operating_hours?: string;
  };
}

export interface PickupListParams {
  page?: number;
  pageSize?: number;
  limit?: number;
  status?: string;
  enterprise_id?: string;
  search?: string;
}

export interface PickupCreateRequest {
  enterprise_id?: string;
  batch_id?: string;
  branch_id: string;
  asset_ids: string[];
  preferred_date?: string;
  preferred_time_slot: string;
  special_instructions?: string;
}

export interface PickupUpdateRequest {
  location_id?: string;
  preferred_date?: string;
  preferred_time_slot?: string;
  special_instructions?: string;
}

export interface PickupCompleteRequest {
  notes?: string;
  proof_of_pickup?: unknown;
}

// ============================================================================
// Pickup Location Types
// ============================================================================

export interface PickupLocationResponse {
  id: string;
  enterprise_id: string;
  name: string;
  address: string;
  address_line1?: string; // For backward compat
  city?: string;
  state?: string;
  pin_code?: string;
  country: string;
  contact_person?: string;
  contact_phone?: string;
  operating_hours?: string;
  special_instructions?: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface PickupLocationCreateRequest {
  enterprise_id?: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  pin_code?: string;
  contact_person?: string;
  contact_phone?: string;
  operating_hours?: string;
  special_instructions?: string;
  is_default?: boolean;
}

export interface PickupLocationUpdateRequest {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  pin_code?: string;
  contact_person?: string;
  contact_phone?: string;
  operating_hours?: string;
  special_instructions?: string;
  is_default?: boolean;
  is_active?: boolean;
}

// ============================================================================
// API
// ============================================================================

export const pickupsApi = {
  /**
   * List pickup requests with role-based filtering
   */
  list: (params: PickupListParams = {}) => {
    const query = new URLSearchParams();
    query.set('page', (params.page ?? 1).toString());
    query.set('page_size', (params.limit ?? params.pageSize ?? DEFAULT_PAGE_SIZE).toString());
    if (params.status) query.set('status', params.status);
    if (params.enterprise_id) query.set('enterprise_id', params.enterprise_id);
    if (params.search) query.set('search', params.search);
    return fetchWithAuth<PickupResponse[]>(`/pickups?${query.toString()}`);
  },

  /**
   * Get pickups pending OPS admin assignment
   */
  listPendingAssignment: (params: { page?: number; pageSize?: number } = {}) => {
    const query = new URLSearchParams();
    query.set('page', (params.page ?? 1).toString());
    query.set('page_size', (params.pageSize ?? DEFAULT_PAGE_SIZE).toString());
    return fetchWithAuth<PickupResponse[]>(`/pickups/pending-assignment?${query.toString()}`);
  },

  /**
   * Get pickups assigned to current user (logistics admin/user)
   */
  listMyAssignments: (params: { page?: number; pageSize?: number } = {}) => {
    const query = new URLSearchParams();
    query.set('page', (params.page ?? 1).toString());
    query.set('page_size', (params.pageSize ?? DEFAULT_PAGE_SIZE).toString());
    return fetchWithAuth<PickupResponse[]>(`/pickups/my-assignments?${query.toString()}`);
  },

  /**
   * Get a single pickup request by ID
   */
  get: (id: string) => fetchWithAuth<PickupResponse>(`/pickups/${id}`),

  /**
   * Create a new pickup request
   */
  create: (data: PickupCreateRequest) =>
    fetchWithAuth<PickupResponse>('/pickups', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Update a pickup request
   */
  update: (id: string, data: PickupUpdateRequest) =>
    fetchWithAuth<PickupResponse>(`/pickups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /**
   * Assign pickup to logistics admin (OPS Admin action)
   */
  assignToLogisticsAdmin: (id: string, logisticsAdminId: string) =>
    fetchWithAuth<PickupResponse>(`/pickups/${id}/assign-admin`, {
      method: 'POST',
      body: JSON.stringify({ logistics_admin_id: logisticsAdminId }),
    }),

  /**
   * Assign pickup to logistics user (Logistics Admin action)
   */
  assignToLogisticsUser: (id: string, logisticsUserId: string, scheduledDate?: string) =>
    fetchWithAuth<PickupResponse>(`/pickups/${id}/assign-user`, {
      method: 'POST',
      body: JSON.stringify({ logistics_user_id: logisticsUserId, scheduled_date: scheduledDate }),
    }),

  /**
   * Start a pickup (Logistics User action)
   */
  start: (id: string) =>
    fetchWithAuth<PickupResponse>(`/pickups/${id}/start`, {
      method: 'POST',
    }),

  /**
   * Complete a pickup (Logistics User action)
   */
  complete: (id: string, data?: PickupCompleteRequest) =>
    fetchWithAuth<PickupResponse>(`/pickups/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(data ?? {}),
    }),

  /**
   * Cancel a pickup request
   */
  cancel: (id: string, reason: string) =>
    fetchWithAuth<PickupResponse>(`/pickups/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
};

// ============================================================================
// Pickup Locations API
// ============================================================================

export const pickupLocationsApi = {
  /**
   * List pickup locations for an enterprise
   */
  list: (enterpriseId: string, includeInactive = false) => {
    const query = new URLSearchParams();
    query.set('enterprise_id', enterpriseId);
    if (includeInactive) query.set('include_inactive', 'true');
    return fetchWithAuth<{ locations: PickupLocationResponse[]; total: number }>(
      `/pickups/locations?${query.toString()}`
    );
  },

  /**
   * Get a single pickup location by ID
   */
  get: (id: string) =>
    fetchWithAuth<PickupLocationResponse>(`/pickups/locations/${id}`),

  /**
   * Create a new pickup location
   */
  create: (data: PickupLocationCreateRequest) =>
    fetchWithAuth<PickupLocationResponse>('/pickups/locations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Update a pickup location
   */
  update: (id: string, data: PickupLocationUpdateRequest) =>
    fetchWithAuth<PickupLocationResponse>(`/pickups/locations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /**
   * Delete a pickup location (soft delete)
   */
  delete: (id: string) =>
    fetchWithAuth<void>(`/pickups/locations/${id}`, {
      method: 'DELETE',
    }),

  /**
   * Set a pickup location as the default for its enterprise
   */
  setDefault: (id: string) =>
    fetchWithAuth<PickupLocationResponse>(`/pickups/locations/${id}/set-default`, {
      method: 'POST',
    }),
};
