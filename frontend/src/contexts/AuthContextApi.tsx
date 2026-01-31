/**
 * AuthContext (API-based)
 *
 * This context provides authentication using the REST API.
 *
 * Configure VITE_API_URL environment variable
 */

import { createContext, useContext, useEffect, useCallback, type ReactNode } from 'react';
import { useAuthStoreApi } from '@/stores/authStoreApi';
import type { User, UserRole, Enterprise } from '@/types';

interface AuthContextType {
  // State
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
  refreshSession: () => Promise<boolean>;
  clearError: () => void;

  // Role checks
  hasRole: (...roles: UserRole[]) => boolean;
  isAdmin: () => boolean;
  isPlatformAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProviderApi - Authentication context using REST API
 *
 * Features:
 * 1. Uses JWT tokens stored in localStorage
 * 2. Automatic token refresh on 401
 * 3. Fetches user data from backend API
 * 4. Enterprise data fetching for enterprise users
 */
export function AuthProviderApi({ children }: AuthProviderProps) {
  const {
    user,
    enterprise,
    isAuthenticated,
    isLoading,
    isInitialized,
    error,
    login: storeLogin,
    loginWithOTP: storeLoginWithOTP,
    requestOTP: storeRequestOTP,
    logout: storeLogout,
    refreshUser,
    clearError,
    hasRole,
    isAdmin,
    isPlatformAdmin,
    initialize,
  } = useAuthStoreApi();

  // Initialize auth state on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  /**
   * Login with email and password
   */
  const login = useCallback(
    async (email: string, password: string) => {
      return storeLogin(email, password);
    },
    [storeLogin]
  );

  /**
   * Login with OTP (for employees)
   */
  const loginWithOTP = useCallback(
    async (email: string, otp: string) => {
      return storeLoginWithOTP(email, otp);
    },
    [storeLoginWithOTP]
  );

  /**
   * Request OTP for employee login
   */
  const requestOTP = useCallback(
    async (email: string) => {
      return storeRequestOTP(email);
    },
    [storeRequestOTP]
  );

  /**
   * Logout
   */
  const logout = useCallback(() => {
    storeLogout();
  }, [storeLogout]);

  /**
   * Refresh session / user data
   */
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      await refreshUser();
      return true;
    } catch {
      return false;
    }
  }, [refreshUser]);

  const value: AuthContextType = {
    user,
    enterprise,
    isAuthenticated,
    isLoading,
    isInitialized,
    error,
    login,
    loginWithOTP,
    requestOTP,
    logout,
    refreshSession,
    clearError,
    hasRole,
    isAdmin,
    isPlatformAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 * Throws error if used outside AuthProviderApi
 */
export function useAuthContextApi() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContextApi must be used within an AuthProviderApi');
  }
  return context;
}

/**
 * Export the context for advanced use cases
 */
export { AuthContext as AuthContextApiContext };
