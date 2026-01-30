/**
 * Users API Module
 * User management endpoints
 */

import { fetchWithAuth, DEFAULT_PAGE_SIZE } from './client';
import type { UserResponse } from './auth';

// Re-export UserResponse for convenience
export type { UserResponse };

// ============================================================================
// Types
// ============================================================================

export interface UserListParams {
  skip?: number;
  limit?: number;
  role?: string;
  status?: string;
  search?: string;
  enterprise_id?: string;
}

export interface UserCreateRequest {
  email: string;
  name: string;
  phone?: string;
  role: string;
  password?: string;
  enterprise_id?: string;
  branch_id?: string;
  parent_user_id?: string;  // For logistics_user → logistics_admin hierarchy
}

export interface UserUpdateRequest {
  name?: string;
  phone?: string;
  status?: string;
  branch_id?: string;
}

export interface PasswordResetRequest {
  new_password: string;
}

// ============================================================================
// API
// ============================================================================

export interface ITAdminWithBranches extends UserResponse {
  branch_count: number;
  branches?: Array<{
    id: string;
    branch_name: string;
    branch_code: string;
  }>;
}

export interface BulkUserCreateRequest {
  users: UserCreateRequest[];
  role?: string;
  enterprise_id?: string;
  branch_id?: string;
}

export interface BulkUserResult {
  created: UserResponse[];
  errors: Array<{ email: string; error: string }>;
  created_count: number;
  error_count: number;
}

export const usersApi = {
  list: (params: UserListParams = {}) => {
    const query = new URLSearchParams();
    if (params.skip) query.set('skip', params.skip.toString());
    query.set('limit', (params.limit ?? DEFAULT_PAGE_SIZE).toString());
    if (params.role) query.set('role', params.role);
    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    if (params.enterprise_id) query.set('enterprise_id', params.enterprise_id);
    return fetchWithAuth<UserResponse[]>(`/users?${query.toString()}`);
  },

  get: (id: string) => fetchWithAuth<UserResponse>(`/users/${id}`),

  getMe: () => fetchWithAuth<UserResponse>('/users/me'),

  updateMe: (data: UserUpdateRequest) =>
    fetchWithAuth<UserResponse>('/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  create: (data: UserCreateRequest) =>
    fetchWithAuth<UserResponse>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UserUpdateRequest) =>
    fetchWithAuth<UserResponse>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchWithAuth<void>(`/users/${id}`, { method: 'DELETE' }),

  /** List IT admins for an enterprise */
  listITAdmins: (enterpriseId: string, status?: string) => {
    const query = new URLSearchParams();
    query.set('enterprise_id', enterpriseId);
    query.set('role', 'it_admin');
    if (status) query.set('status', status);
    query.set('limit', '1000');
    return fetchWithAuth<UserResponse[]>(`/users?${query.toString()}`);
  },

  /** List IT admins with their branch counts */
  listITAdminsWithBranches: (enterpriseId: string) =>
    fetchWithAuth<ITAdminWithBranches[]>(`/users/it-admins?enterprise_id=${enterpriseId}`),

  /** Bulk create users (IT admins, sub-users, etc.) */
  bulkCreate: (data: BulkUserCreateRequest) =>
    fetchWithAuth<BulkUserResult>('/users/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Reset user password (admin-initiated) */
  resetPassword: (userId: string, data: PasswordResetRequest) =>
    fetchWithAuth<UserResponse>(`/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
