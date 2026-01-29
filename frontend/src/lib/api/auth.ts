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
  branch_id?: string;
  enterprise_name?: string;
  branch_name?: string;
  department?: string;
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

  // Employee OTP flow
  requestOTP: (email: string) =>
    fetchWithAuth<{ email: string }>('/auth/employee/request-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  verifyOTP: (email: string, otp: string) =>
    fetchWithAuth<LoginResponse>('/auth/employee/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    }),
};
