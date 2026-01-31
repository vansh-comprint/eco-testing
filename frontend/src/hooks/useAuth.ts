import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStoreApi, useUser, useEnterprise, useIsAuthenticated, useIsInitialized, useUserRole } from '@/stores';
import type { UserRole } from '@/types';

/**
 * Custom hook for authentication utilities
 * Wraps the API-based auth store with navigation and convenience methods
 *
 * Uses authStoreApi for REST API authentication
 */
export function useAuth() {
  const navigate = useNavigate();
  const user = useUser();
  const enterprise = useEnterprise();
  const isAuthenticated = useIsAuthenticated();
  const isInitialized = useIsInitialized();
  const role = useUserRole();
  const { login, logout, switchRole, isLoading } = useAuthStoreApi();

  const handleLogin = useCallback(async (email: string, password: string) => {
    const result = await login(email, password);
    if (result.success) {
      const currentUser = useAuthStoreApi.getState().user;
      navigate(getRoleDefaultPath(currentUser?.role));
    }
    return result.success;
  }, [login, navigate]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const handleSwitchRole = useCallback((newRole: UserRole) => {
    switchRole(newRole);
    navigate(getRoleDefaultPath(newRole));
  }, [switchRole, navigate]);

  // Check if user has one of the specified roles
  const hasRole = useCallback((...roles: UserRole[]) => {
    return role ? roles.includes(role) : false;
  }, [role]);

  // Check if user is admin (super_admin or ops_admin)
  const isAdmin = useCallback(() => {
    return hasRole('super_admin', 'ops_admin');
  }, [hasRole]);

  // Check if user is enterprise user (it_admin or employee)
  const isEnterpriseUser = useCallback(() => {
    return hasRole('it_admin', 'employee');
  }, [hasRole]);

  return {
    user,
    enterprise,
    isAuthenticated,
    isInitialized,
    role,
    isLoading,
    login: handleLogin,
    logout: handleLogout,
    switchRole: handleSwitchRole,
    hasRole,
    isAdmin,
    isEnterpriseUser,
  };
}

function getRoleDefaultPath(role?: UserRole): string {
  switch (role) {
    case 'super_admin':
      return '/super';
    case 'ops_admin':
      return '/ops';
    case 'org_admin':
      return '/org-admin';
    case 'it_admin':
      return '/admin';
    case 'employee':
      return '/check-in';
    case 'logistics_admin':
      return '/logistics-admin';
    case 'logistics_user':
      return '/logistics';
    default:
      return '/login';
  }
}
