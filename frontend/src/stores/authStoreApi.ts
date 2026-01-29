/**
 * Auth Store (API-based)
 *
 * This store uses the REST API for authentication instead of direct Supabase calls.
 * Part of the backend migration from BaaS to REST API architecture.
 *
 * To migrate:
 * 1. Replace imports from 'authStore' with 'authStoreApi'
 * 2. Update components to handle the new auth flow
 * 3. Configure VITE_API_URL environment variable
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole, Enterprise } from '@/types';
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
    main_admin: 'main_admin',
    ops_admin: 'main_admin', // Map ops_admin to main_admin
    technician: 'technician',
    org_admin: 'org_admin',
    it_admin: 'it_admin',
    employee: 'sub_user',
    sub_user: 'sub_user',
    logistics_admin: 'logistics_admin',
    logistics_user: 'logistics_user',
  };
  return roleMap[backendRole.toLowerCase()] || ('sub_user' as UserRole);
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
        const token = getAccessToken();
        if (!token) {
          set({ isInitialized: true, isLoading: false });
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
                  address: entData.address,
                  status: entData.status,
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
            // Token invalid or expired
            clearTokens();
            set({
              user: null,
              enterprise: null,
              isAuthenticated: false,
              isLoading: false,
              isInitialized: true,
            });
          }
        } catch (error) {
          console.error('[AuthStoreApi] Initialize error:', error);
          clearTokens();
          set({
            user: null,
            enterprise: null,
            isAuthenticated: false,
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
                  address: entData.address,
                  status: entData.status,
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
                  address: entData.address,
                  status: entData.status,
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
       * Logout - clear tokens and state
       */
      logout: () => {
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
        return get().hasRole('super_admin', 'main_admin', 'org_admin', 'it_admin', 'logistics_admin');
      },

      /**
       * Check if user is platform admin (super_admin or main_admin)
       */
      isPlatformAdmin: (): boolean => {
        return get().hasRole('super_admin', 'main_admin');
      },

      /**
       * Dev tool: switch role for testing
       * Note: This only changes the local state, not the actual user role
       */
      switchRole: (role: UserRole) => {
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
        // After rehydration, force isInitialized to false so initialize() must run
        if (state) {
          state.isInitialized = false;
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
