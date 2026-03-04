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
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  company_name?: string;
  contact_person?: string;
  address?: string | Record<string, unknown>;
  city?: string;
  state?: string;
  is_active?: boolean;
  created_at: string;
  last_login_at?: string;
}

export interface LogisticsUserResponse {
  id: string;
  parent_user_id: string;
  name: string;
  email: string;
  phone: string;
  vehicle_number?: string;
  vehicle_type?: string;
  status: string;
  created_at: string;
  updated_at?: string;
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
  email?: string;
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
    query.set('role', 'logistics_admin');
    if (params.skip) query.set('skip', params.skip.toString());
    query.set('limit', (params.limit ?? DEFAULT_PAGE_SIZE).toString());
    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    return fetchWithAuth<LogisticsAdminResponse[]>(`/users?${query.toString()}`);
  },

  getAdmin: (id: string) =>
    fetchWithAuth<LogisticsAdminResponse>(`/users/${id}`),

  createAdmin: (data: LogisticsAdminCreateRequest) =>
    fetchWithAuth<LogisticsAdminResponse>('/users', {
      method: 'POST',
      body: JSON.stringify({ ...data, role: 'logistics_admin' }),
    }),

  updateAdmin: (id: string, data: LogisticsAdminUpdateRequest) =>
    fetchWithAuth<LogisticsAdminResponse>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteAdmin: (id: string) =>
    fetchWithAuth<void>(`/users/${id}`, { method: 'DELETE' }),

  /** Get pickups assigned to a logistics admin */
  getAdminPickups: (adminId: string, params: { status?: string; limit?: number } = {}) => {
    const query = new URLSearchParams();
    query.set('logistics_admin_id', adminId);
    if (params.status) query.set('status', params.status);
    query.set('page_size', Math.min(params.limit ?? 100, 100).toString());
    return fetchWithAuth<PickupResponse[]>(`/pickups?${query.toString()}`);
  },

  // ==================== USERS ====================

  listUsers: (params: LogisticsUserListParams = {}) => {
    const query = new URLSearchParams();
    if (params.skip) query.set('skip', params.skip.toString());
    query.set('limit', (params.limit ?? DEFAULT_PAGE_SIZE).toString());
    query.set('role', 'logistics_user');
    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    if (params.logistics_admin_id) query.set('logistics_admin_id', params.logistics_admin_id);
    return fetchWithAuth<LogisticsUserResponse[]>(`/users?${query.toString()}`);
  },

  getUser: (id: string) =>
    fetchWithAuth<LogisticsUserResponse>(`/users/${id}`),

  createUser: (data: LogisticsUserCreateRequest) =>
    fetchWithAuth<LogisticsUserResponse>('/users', {
      method: 'POST',
      body: JSON.stringify({ ...data, role: 'logistics_user', parent_user_id: data.logistics_admin_id }),
    }),

  updateUser: (id: string, data: LogisticsUserUpdateRequest) =>
    fetchWithAuth<LogisticsUserResponse>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  updateUserStatus: (id: string, status: 'active' | 'inactive') =>
    fetchWithAuth<LogisticsUserResponse>(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  deleteUser: (id: string) =>
    fetchWithAuth<void>(`/users/${id}`, { method: 'DELETE' }),

  /** Get pickups assigned to a logistics user (driver) */
  getUserPickups: (userId: string, params: { status?: string; limit?: number } = {}) => {
    const query = new URLSearchParams();
    query.set('logistics_user_id', userId);
    if (params.status) query.set('status', params.status);
    query.set('page_size', Math.min(params.limit ?? 100, 100).toString());
    return fetchWithAuth<PickupResponse[]>(`/pickups?${query.toString()}`);
  },

  /** List available (active) logistics users for assignment */
  listAvailableUsers: (logisticsAdminId: string) =>
    fetchWithAuth<LogisticsUserResponse[]>(
      `/users?role=logistics_user&status=active&limit=500${logisticsAdminId ? `&parent_user_id=${logisticsAdminId}` : ''}`
    ),
};
