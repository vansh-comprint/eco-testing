/**
 * Auth API Module
 * Authentication endpoints: login, logout, OTP flows
 */

import { fetchWithAuth, fetchPublic, clearTokens } from './client';

// ============================================================================
// Types
// ============================================================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: UserResponse;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
  status: string;
  enterprise_id?: string;
  enterpriseId?: string; // Alias
  branch_id?: string;
  enterprise_name?: string;
  branch_name?: string;
  department?: string;
  parent_user_id?: string;
  created_at: string;
  last_login_at?: string;
  permissions?: string[];
}

// ============================================================================
// API
// ============================================================================

export const authApi = {
  // Login uses fetchPublic - no token refresh on 401, shows actual error
  login: (data: LoginRequest) =>
    fetchPublic<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMe: () => fetchWithAuth<UserResponse>('/auth/me'),

  logout: () => {
    clearTokens();
    return Promise.resolve({ success: true });
  },

  // Self-service password change (requires current password)
  changePassword: (data: { current_password: string; new_password: string }) =>
    fetchWithAuth<null>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Forgot password (public, sends reset link email)
  forgotPassword: (email: string) =>
    fetchPublic<null>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  // Reset password with token (public, from email link)
  resetPassword: (token: string, new_password: string) =>
    fetchPublic<null>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password }),
    }),

  // Employee OTP flow — uses fetchPublic since user is not yet authenticated
  requestOTP: (email: string) =>
    fetchPublic<{ email: string }>('/auth/employee/request-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  verifyOTP: (email: string, otp: string) =>
    fetchPublic<LoginResponse>('/auth/employee/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    }),
};
