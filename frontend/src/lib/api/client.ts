/**
 * API Client Core
 * Core utilities for REST API communication with the FastAPI backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8000/api/v1`;

// Token storage
const TOKEN_KEY = 'ecotribe_access_token';
const REFRESH_TOKEN_KEY = 'ecotribe_refresh_token';

export const getAccessToken = () => localStorage.getItem(TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);
export const setTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};
export const clearTokens = () => {
  // Remove auth tokens
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);

  // SECURITY: Clear any persisted auth state from Zustand
  // The auth store uses 'ecotribe-auth-api' as its persist key
  localStorage.removeItem('ecotribe-auth-api');

  // Note: Do NOT call sessionStorage.clear() here.
  // OPS enterprise selection (ops_selected_enterprise) is stored in sessionStorage
  // and must survive auth token cleanup to avoid breaking the enterprise selector.
};

// Force logout and redirect to login page
const forceLogout = () => {
  clearTokens();
  // Redirect to login page if not already there
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

// API Error type
export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiError;
  pagination?: PaginationMeta;
}

// Pagination metadata from backend
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

// Refresh access token
async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      setTokens(data.data.access_token, refreshToken);
      return true;
    }
  } catch {
    // Refresh failed
  }
  return false;
}

// Fetch for public endpoints (no auth, no token refresh)
export async function fetchPublic<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      const detail = data.detail;
      const message = data.message
        || (typeof detail === 'string' ? detail : detail?.message)
        || 'An error occurred';
      return {
        success: false,
        error: {
          message,
          code: response.status.toString(),
          details: data,
        },
      };
    }

    return {
      success: true,
      data: data.data,
      message: data.message,
      pagination: data.pagination,
    } as ApiResponse<T> & { pagination?: PaginationMeta };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Network error',
        code: 'NETWORK_ERROR',
      },
    };
  }
}

// Generic fetch wrapper with auth
export async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getAccessToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle 401 - try to refresh token
      if (response.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          // Retry the original request
          return fetchWithAuth<T>(endpoint, options);
        }
        // Refresh failed, force logout and redirect to login
        forceLogout();
        return {
          success: false,
          error: {
            message: 'Session expired. Please login again.',
            code: '401',
          },
        };
      }

      const detail = data.detail;
      const message = data.message
        || (typeof detail === 'string' ? detail : detail?.message)
        || 'An error occurred';
      return {
        success: false,
        error: {
          message,
          code: response.status.toString(),
          details: data,
        },
      };
    }

    // Backend returns: { code, data, message, pagination? }
    return {
      success: true,
      data: data.data,
      message: data.message,
      pagination: data.pagination,
    } as ApiResponse<T> & { pagination?: PaginationMeta };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Network error',
        code: 'NETWORK_ERROR',
      },
    };
  }
}

// Default page size for all list queries
export const DEFAULT_PAGE_SIZE = 10;

// Export API base URL for files API
export { API_BASE_URL };
