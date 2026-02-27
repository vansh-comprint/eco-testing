/**
 * Sub-Users (Employees) API Module
 * Employee management endpoints for check-in portal
 */

import { fetchWithAuth, DEFAULT_PAGE_SIZE } from './client';

// ============================================================================
// Types
// ============================================================================

export interface SubUserResponse {
  id: string;
  email: string;
  name: string;
  phone?: string;
  department?: string;
  employee_id?: string;
  enterprise_id: string;
  branch_id?: string;
  status: string;
  role?: string;
  designation?: string;
  created_at: string;
}

export interface SubUserListParams {
  skip?: number;
  limit?: number;
  status?: string;
  search?: string;
  branch_id?: string;
  enterprise_id?: string;
}

export interface SubUserCreateRequest {
  email: string;
  name: string;
  phone?: string;
  department?: string;
  employee_id?: string;
  enterprise_id?: string;
  branch_id?: string;
  designation?: string;
  status?: string;
}

export interface SubUserBulkItem {
  email: string;
  name: string;
  phone?: string;
  department?: string;
  employee_id?: string;
  branch_id?: string;
}

export interface SubUserBulkCreateRequest {
  enterprise_id?: string;
  branch_id?: string;
  role?: string;
  users: SubUserBulkItem[];
}

export interface SubUserBulkCreateResponse {
  created: SubUserResponse[];
  errors: (string | { index: number; email: string; error: string })[];
  created_count: number;
  error_count: number;
}

// ============================================================================
// API
// ============================================================================

export const subUsersApi = {
  list: (params: SubUserListParams = {}) => {
    const query = new URLSearchParams();
    if (params.skip) query.set('skip', params.skip.toString());
    query.set('limit', (params.limit ?? DEFAULT_PAGE_SIZE).toString());
    query.set('role', 'employee');
    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    if (params.branch_id) query.set('branch_id', params.branch_id);
    if (params.enterprise_id) query.set('enterprise_id', params.enterprise_id);
    return fetchWithAuth<SubUserResponse[]>(`/users?${query.toString()}`);
  },

  get: (id: string) => fetchWithAuth<SubUserResponse>(`/users/${id}`),

  create: (data: SubUserCreateRequest) =>
    fetchWithAuth<SubUserResponse>('/users', {
      method: 'POST',
      body: JSON.stringify({ ...data, role: 'employee' }),
    }),

  update: (id: string, data: Partial<SubUserCreateRequest>) =>
    fetchWithAuth<SubUserResponse>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchWithAuth<void>(`/users/${id}`, { method: 'DELETE' }),

  invite: (data: { email: string; name: string; branch_id?: string }) =>
    fetchWithAuth<SubUserResponse>('/users', {
      method: 'POST',
      body: JSON.stringify({ ...data, role: 'employee' }),
    }),

  /**
   * Bulk create sub-users (employees) from CSV import
   * Uses POST /users/bulk endpoint
   */
  bulkCreate: (data: SubUserBulkCreateRequest) =>
    fetchWithAuth<SubUserBulkCreateResponse>('/users/bulk', {
      method: 'POST',
      body: JSON.stringify({ ...data, role: data.role || 'employee' }),
    }),
};
