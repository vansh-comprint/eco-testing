/**
 * API Client Core
 * Core utilities for REST API communication with the FastAPI backend
 */

// Resolve API base URL:
// 1. Explicit VITE_API_URL always wins (set at build time, used as-is)
// 2. Localhost/127.0.0.1 → same host, backend port 8000
// 3. Production → same origin + /api/v1 (reverse proxy routes to backend)
const resolveApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl;

  const { protocol, hostname, host } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:8000/api/v1`;
  }

  // Production: use same origin (nginx reverse proxy routes /api/v1 → backend)
  return `${protocol}//${host}/api/v1`;
};

const API_BASE_URL = resolveApiBaseUrl();

// Page unload detection — prevents token clearing during hard refresh / navigation
let isPageUnloading = false;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    isPageUnloading = true;
  });
}

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
  // Do NOT clear tokens during page unload (hard refresh / navigation).
  // The new page will handle auth initialization fresh.
  if (isPageUnloading) return;

  clearTokens();
  // Redirect to login page if not already there
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

/**
 * Extract human-readable error message from a backend error response.
 *
 * Priority:
 * 1. 422 field-level errors in data.data.errors[].message  (our standardized format)
 * 2. data.message  (generic message like "Validation error")
 * 3. Pydantic detail array  (FastAPI native 422)
 * 4. detail string / detail.message
 * 5. Fallback
 */
function extractErrorMessage(data: any, status: number): string {
  // 422: prefer field-level messages from our standardized error format
  if (status === 422 && data.data?.errors && Array.isArray(data.data.errors)) {
    const fieldMessages = data.data.errors
      .map((e: any) => e.message || e.msg)
      .filter(Boolean);
    if (fieldMessages.length > 0) return fieldMessages.join('; ');
  }

  if (data.message) return data.message;

  const detail = data.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((d: any) => d.msg).filter(Boolean).join('; ') || 'Validation error';
  }
  if (detail?.message) return detail.message;

  return 'An error occurred';
}

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
  aggregates?: Record<string, number>;
}

// Pagination metadata from backend
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

// Refresh access token (with mutex to prevent concurrent refresh race conditions)
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  // If a refresh is already in progress, wait for it instead of firing another
  if (refreshPromise) return refreshPromise;

  refreshPromise = doRefreshAccessToken();
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function doRefreshAccessToken(): Promise<boolean> {
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
      const newAccess = data.data?.access_token;
      const newRefresh = data.data?.refresh_token;
      if (!newAccess) return false;
      // Use rotated refresh token if provided, otherwise keep current one
      setTokens(newAccess, newRefresh || refreshToken);
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
      return {
        success: false,
        error: {
          message: extractErrorMessage(data, response.status),
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
      aggregates: data.aggregates,
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

      return {
        success: false,
        error: {
          message: extractErrorMessage(data, response.status),
          code: response.status.toString(),
          details: data,
        },
      };
    }

    // Backend returns: { code, data, message, pagination?, aggregates? }
    return {
      success: true,
      data: data.data,
      message: data.message,
      pagination: data.pagination,
      aggregates: data.aggregates,
    } as ApiResponse<T> & { pagination?: PaginationMeta };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Network error',
        code: isPageUnloading ? 'PAGE_UNLOADING' : 'NETWORK_ERROR',
      },
    };
  }
}

// Default page size for all list queries
export const DEFAULT_PAGE_SIZE = 10;

// Export API base URL for files API
export { API_BASE_URL };
