/**
 * Logistics API Module
 * Logistics admin and user management endpoints
 */

import { fetchWithAuth, DEFAULT_PAGE_SIZE } from './client';
import type { PickupResponse } from './pickups';

// ============================================================================
// Types
// ============================================================================

export interface LogisticsAdminResponse {
  id: string;
  company_name: string;
  contact_person: string;
  name: string;
  email: string;
  phone: string;
  gst_number?: string;
  address?: string | Record<string, unknown>;
  service_areas?: string[];
  status: string;
  created_at: string;
  updated_at?: string;
  logistics_users?: LogisticsUserResponse[];
}

export interface LogisticsUserResponse {
  id: string;
  logistics_admin_id: string;
  name: string;
  email: string;
  phone: string;
  vehicle_number?: string;
  vehicle_type?: string;
  status: string;
  created_at: string;
  updated_at?: string;
  logistics_admins?: LogisticsAdminResponse;
}

export interface LogisticsAdminListParams {
  skip?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface LogisticsUserListParams {
  skip?: number;
  limit?: number;
  logistics_admin_id?: string;
  status?: string;
  search?: string;
}

export interface LogisticsAdminCreateRequest {
  company_name: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  gst_number?: string;
  address?: string;
}

export interface LogisticsAdminUpdateRequest {
  company_name?: string;
  name?: string;
  phone?: string;
  gst_number?: string;
  address?: string;
  status?: string;
}

export interface LogisticsUserCreateRequest {
  logistics_admin_id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  vehicle_number?: string;
  vehicle_type?: string;
}

export interface LogisticsUserUpdateRequest {
  name?: string;
  phone?: string;
  vehicle_number?: string;
  vehicle_type?: string;
  status?: string;
}

// ============================================================================
// API
// ============================================================================

export const logisticsApi = {
  // ==================== ADMINS ====================

  listAdmins: (params: LogisticsAdminListParams = {}) => {
    const query = new URLSearchParams();
    if (params.skip) query.set('skip', params.skip.toString());
    query.set('limit', (params.limit ?? DEFAULT_PAGE_SIZE).toString());
    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    return fetchWithAuth<LogisticsAdminResponse[]>(`/logistics/admins?${query.toString()}`);
  },

  getAdmin: (id: string) =>
    fetchWithAuth<LogisticsAdminResponse>(`/logistics/admins/${id}`),

  createAdmin: (data: LogisticsAdminCreateRequest) =>
    fetchWithAuth<LogisticsAdminResponse>('/logistics/admins', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateAdmin: (id: string, data: LogisticsAdminUpdateRequest) =>
    fetchWithAuth<LogisticsAdminResponse>(`/logistics/admins/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteAdmin: (id: string) =>
    fetchWithAuth<void>(`/logistics/admins/${id}`, { method: 'DELETE' }),

  /** Get pickups assigned to a logistics admin */
  getAdminPickups: (adminId: string, params: { status?: string; limit?: number } = {}) => {
    const query = new URLSearchParams();
    query.set('logistics_admin_id', adminId);
    if (params.status) query.set('status', params.status);
    query.set('limit', (params.limit ?? 100).toString());
    return fetchWithAuth<PickupResponse[]>(`/pickups?${query.toString()}`);
  },

  // ==================== USERS ====================

  listUsers: (params: LogisticsUserListParams = {}) => {
    const query = new URLSearchParams();
    if (params.skip) query.set('skip', params.skip.toString());
    query.set('limit', (params.limit ?? DEFAULT_PAGE_SIZE).toString());
    if (params.logistics_admin_id) query.set('logistics_admin_id', params.logistics_admin_id);
    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    return fetchWithAuth<LogisticsUserResponse[]>(`/logistics/users?${query.toString()}`);
  },

  getUser: (id: string) =>
    fetchWithAuth<LogisticsUserResponse>(`/logistics/users/${id}`),

  createUser: (data: LogisticsUserCreateRequest) =>
    fetchWithAuth<LogisticsUserResponse>('/logistics/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateUser: (id: string, data: LogisticsUserUpdateRequest) =>
    fetchWithAuth<LogisticsUserResponse>(`/logistics/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteUser: (id: string) =>
    fetchWithAuth<void>(`/logistics/users/${id}`, { method: 'DELETE' }),

  /** Get pickups assigned to a logistics user (driver) */
  getUserPickups: (userId: string, params: { status?: string; limit?: number } = {}) => {
    const query = new URLSearchParams();
    query.set('logistics_user_id', userId);
    if (params.status) query.set('status', params.status);
    query.set('limit', (params.limit ?? 100).toString());
    return fetchWithAuth<PickupResponse[]>(`/pickups?${query.toString()}`);
  },

  /** List available (active) logistics users for assignment */
  listAvailableUsers: (logisticsAdminId: string) =>
    fetchWithAuth<LogisticsUserResponse[]>(
      `/logistics/users?logistics_admin_id=${logisticsAdminId}&status=active&limit=1000`
    ),
};
