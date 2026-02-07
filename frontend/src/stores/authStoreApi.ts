/**
 * Auth Store (API-based)
 *
 * This store uses the REST API for authentication.
 *
 * Configure VITE_API_URL environment variable
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole, Enterprise, Address, EnterpriseStatus } from '@/types';
import {
  authApi,
  enterprisesApi,
  setTokens,
  clearTokens,
  getAccessToken,
  type UserResponse,
} from '@/lib/api';

interface AuthState {
  user: User | null;
  enterprise: Enterprise | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithOTP: (email: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  requestOTP: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
  setEnterprise: (enterprise: Enterprise | null) => void;
  clearError: () => void;
  initialize: () => Promise<void>;

  // Role checks
  hasRole: (...roles: UserRole[]) => boolean;
  isAdmin: () => boolean;
  isPlatformAdmin: () => boolean;

  // Dev tool (for RoleSwitcher)
  switchRole: (role: UserRole) => void;
}

// Map backend role to frontend role type
function mapRole(backendRole: string): UserRole {
  const roleMap: Record<string, UserRole> = {
    super_admin: 'super_admin',
    ops_admin: 'ops_admin',
    main_admin: 'ops_admin',       // Backwards compat: old cached main_admin maps to ops_admin
    technician: 'ops_admin',       // Backwards compat: old technician users map to ops_admin
    org_admin: 'org_admin',
    it_admin: 'it_admin',
    employee: 'employee',
    sub_user: 'employee',          // Backwards compat: old sub_user maps to employee
    logistics_admin: 'logistics_admin',
    logistics_user: 'logistics_user',
  };
  return roleMap[backendRole.toLowerCase()] || ('employee' as UserRole);
}

// Convert API response to User type
function toUser(response: UserResponse): User {
  return {
    id: response.id,
    email: response.email,
    name: response.name,
    phone: response.phone,
    role: mapRole(response.role),
    enterpriseId: response.enterprise_id,
    branchId: response.branch_id,
    department: response.department,
    createdAt: new Date(response.created_at),
    lastLoginAt: response.last_login_at ? new Date(response.last_login_at) : undefined,
  };
}

export const useAuthStoreApi = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      enterprise: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      error: null,

      /**
       * Initialize auth state on app load
       * Checks for existing token and fetches user data
       */
      initialize: async () => {
        // Guard: prevent concurrent initialization (e.g., rapid hard refreshes)
        if (get().isLoading) return;

        const token = getAccessToken();
        if (!token) {
          set({
            user: null,
            enterprise: null,
            isAuthenticated: false,
            isInitialized: true,
            isLoading: false,
          });
          return;
        }

        set({ isLoading: true });

        try {
          const response = await authApi.getMe();
          if (response.success && response.data) {
            const user = toUser(response.data);
            let enterprise: Enterprise | null = null;

            // Fetch enterprise if user has one
            if (user.enterpriseId) {
              const enterpriseResponse = await enterprisesApi.get(user.enterpriseId);
              if (enterpriseResponse.success && enterpriseResponse.data) {
                const entData = enterpriseResponse.data;
                enterprise = {
                  id: entData.id,
                  name: entData.name,
                  gstNumber: entData.gst_number,
                  address: entData.address as Address | undefined,
                  status: entData.status as EnterpriseStatus,
                  contactPerson: entData.contact_person,
                  contactEmail: entData.contact_email,
                  contactPhone: entData.contact_phone,
                  createdAt: new Date(entData.created_at),
                };
              }
            }

            set({
              user,
              enterprise,
              isAuthenticated: true,
              isLoading: false,
              isInitialized: true,
            });
          } else {
            // Distinguish network/transient errors from real auth failures.
            // On hard refresh, the browser aborts in-flight requests which come back
            // as NETWORK_ERROR or PAGE_UNLOADING — do NOT clear tokens for these.
            const errorCode = response.error?.code;
            const isTransientError = errorCode === 'NETWORK_ERROR' || errorCode === 'PAGE_UNLOADING';

            if (isTransientError) {
              // Keep tokens and persisted auth state — next navigation will retry
              set({
                isLoading: false,
                isInitialized: true,
              });
            } else {
              // Genuine auth failure (401, invalid token, etc.) — clear session
              clearTokens();
              set({
                user: null,
                enterprise: null,
                isAuthenticated: false,
                isLoading: false,
                isInitialized: true,
              });
            }
          }
        } catch (error) {
          // Catch block fires for abort errors, network failures, etc.
          // Do NOT clear tokens — keep persisted state, let next API call handle auth.
          console.error('[AuthStoreApi] Initialize error (keeping tokens):', error);
          set({
            isLoading: false,
            isInitialized: true,
          });
        }
      },

      /**
       * Login with email and password
       */
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authApi.login({ email, password });

          if (response.success && response.data) {
            setTokens(response.data.access_token, response.data.refresh_token);
            const user = toUser(response.data.user);
            let enterprise: Enterprise | null = null;

            // Fetch enterprise if user has one
            if (user.enterpriseId) {
              const enterpriseResponse = await enterprisesApi.get(user.enterpriseId);
              if (enterpriseResponse.success && enterpriseResponse.data) {
                const entData = enterpriseResponse.data;
                enterprise = {
                  id: entData.id,
                  name: entData.name,
                  gstNumber: entData.gst_number,
                  address: entData.address as Address | undefined,
                  status: entData.status as EnterpriseStatus,
                  contactPerson: entData.contact_person,
                  contactEmail: entData.contact_email,
                  contactPhone: entData.contact_phone,
                  createdAt: new Date(entData.created_at),
                };
              }
            }

            set({
              user,
              enterprise,
              isAuthenticated: true,
              isLoading: false,
              isInitialized: true,
            });

            return { success: true };
          }

          // API returned error
          const errorMessage = response.error?.message || 'Invalid credentials';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      /**
       * Request OTP for employee login
       */
      requestOTP: async (email: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authApi.requestOTP(email);

          if (response.success) {
            set({ isLoading: false });
            return { success: true };
          }

          const errorMessage = response.error?.message || 'Failed to send OTP';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to send OTP';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      /**
       * Login with OTP (for employees)
       */
      loginWithOTP: async (email: string, otp: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authApi.verifyOTP(email, otp);

          if (response.success && response.data) {
            setTokens(response.data.access_token, response.data.refresh_token);
            const user = toUser(response.data.user);
            let enterprise: Enterprise | null = null;

            // Fetch enterprise if user has one
            if (user.enterpriseId) {
              const enterpriseResponse = await enterprisesApi.get(user.enterpriseId);
              if (enterpriseResponse.success && enterpriseResponse.data) {
                const entData = enterpriseResponse.data;
                enterprise = {
                  id: entData.id,
                  name: entData.name,
                  gstNumber: entData.gst_number,
                  address: entData.address as Address | undefined,
                  status: entData.status as EnterpriseStatus,
                  contactPerson: entData.contact_person,
                  contactEmail: entData.contact_email,
                  contactPhone: entData.contact_phone,
                  createdAt: new Date(entData.created_at),
                };
              }
            }

            set({
              user,
              enterprise,
              isAuthenticated: true,
              isLoading: false,
              isInitialized: true,
            });

            return { success: true };
          }

          const errorMessage = response.error?.message || 'Invalid OTP';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'OTP verification failed';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      /**
       * Logout - invalidate server-side session, then clear local tokens
       */
      logout: () => {
        // Call backend logout to invalidate tokens server-side (fire-and-forget)
        authApi.logout().catch(() => {
          // Ignore errors — we're clearing local state regardless
        });
        clearTokens();
        set({
          user: null,
          enterprise: null,
          isAuthenticated: false,
          isInitialized: false,
          error: null,
        });
      },

      /**
       * Refresh user data from API
       */
      refreshUser: async () => {
        try {
          const response = await authApi.getMe();
          if (response.success && response.data) {
            const user = toUser(response.data);
            set({ user, isAuthenticated: true });
          }
        } catch (error) {
          console.error('[AuthStoreApi] Refresh user error:', error);
        }
      },

      /**
       * Set user directly (for dev tools)
       */
      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user });
      },

      /**
       * Set enterprise directly
       */
      setEnterprise: (enterprise: Enterprise | null) => {
        set({ enterprise });
      },

      /**
       * Clear error state
       */
      clearError: () => set({ error: null }),

      /**
       * Check if user has one of the specified roles
       */
      hasRole: (...roles: UserRole[]): boolean => {
        const { user } = get();
        return user?.role ? roles.includes(user.role) : false;
      },

      /**
       * Check if user is any admin type
       */
      isAdmin: (): boolean => {
        return get().hasRole('super_admin', 'ops_admin', 'org_admin', 'it_admin', 'logistics_admin');
      },

      /**
       * Check if user is platform admin (super_admin or ops_admin)
       */
      isPlatformAdmin: (): boolean => {
        return get().hasRole('super_admin', 'ops_admin');
      },

      /**
       * Dev tool: switch role for testing (development only)
       * Note: This only changes the local state, not the actual user role
       */
      switchRole: (role: UserRole) => {
        if (!import.meta.env.DEV) {
          console.error('switchRole is only available in development');
          return;
        }
        set((state) => ({
          user: state.user ? { ...state.user, role } : null,
        }));
      },
    }),
    {
      name: 'ecotribe-auth-api',
      partialize: (state) => ({
        // Only persist these fields - NOT isInitialized!
        // isInitialized should always start false and be set by initialize()
        user: state.user,
        enterprise: state.enterprise,
        isAuthenticated: state.isAuthenticated,
        // DO NOT persist isInitialized - this caused the page refresh redirect bug
        // On page load, we always need to re-validate tokens via initialize()
      }),
      onRehydrateStorage: () => (state) => {
        // After rehydration, force isInitialized to false so initialize() must run.
        // Also clear auth state — initialize() will re-establish it from the token.
        // This prevents stale persisted state from granting unauthorized access.
        if (state) {
          state.isInitialized = false;
          state.isAuthenticated = false;
        }
      },
    }
  )
);

// Selector hooks for convenience
export const useUser = () => useAuthStoreApi((state) => state.user);
export const useEnterprise = () => useAuthStoreApi((state) => state.enterprise);
export const useIsAuthenticated = () => useAuthStoreApi((state) => state.isAuthenticated);
export const useIsInitialized = () => useAuthStoreApi((state) => state.isInitialized);
export const useUserRole = () => useAuthStoreApi((state) => state.user?.role);
export const useAuthError = () => useAuthStoreApi((state) => state.error);
export const useAuthLoading = () => useAuthStoreApi((state) => state.isLoading);
