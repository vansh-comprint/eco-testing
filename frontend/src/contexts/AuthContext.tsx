import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/database';
import type { User, UserRole, Enterprise } from '@/types';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';

interface AuthContextType {
  // State
  user: User | null;
  enterprise: Enterprise | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;

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
 * AuthProvider - Secure authentication context with server-side session verification
 *
 * Security features:
 * 1. Verifies Supabase session on mount and auth state changes
 * 2. Fetches user data from database (not localStorage) to verify role
 * 3. Auto-refreshes tokens and handles session expiry
 * 4. Clears state on logout or invalid session
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [enterprise, setEnterprise] = useState<Enterprise | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Fetch user data from database based on email
   * This ensures role is always from the server, not localStorage
   */
  const fetchUserFromDatabase = useCallback(async (email: string): Promise<{ user: User | null; enterprise: Enterprise | null }> => {
    try {
      // Try users table first
      const userResult = await db.query<any>('users', {
        filters: [{ field: 'email', operator: 'ilike', value: email }],
        limit: 1,
      });

      if (userResult.data && userResult.data.length > 0) {
        const userData = userResult.data[0];

        // Check if user is active
        if (userData.status !== 'active') {
          console.warn('[Auth] User is not active:', userData.status);
          return { user: null, enterprise: null };
        }

        const fetchedUser: User = {
          id: userData.id,
          role: userData.role,
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          enterpriseId: userData.enterprise_id,
          department: userData.department,
          branchId: userData.branch_id,
          createdAt: new Date(userData.created_at),
        };

        let fetchedEnterprise: Enterprise | null = null;

        // Fetch enterprise if user has one
        if (fetchedUser.enterpriseId) {
          const enterpriseResult = await db.queryById<any>('enterprises', fetchedUser.enterpriseId);
          if (enterpriseResult.data) {
            const entData = enterpriseResult.data;
            fetchedEnterprise = {
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

            // Check if enterprise is active (skip for platform admins)
            const isPlatformAdmin = fetchedUser.role === 'super_admin' || fetchedUser.role === 'main_admin';
            if (!isPlatformAdmin && fetchedEnterprise.status !== 'active') {
              console.warn('[Auth] Enterprise is not active:', fetchedEnterprise.status);
              return { user: null, enterprise: null };
            }
          }
        }

        return { user: fetchedUser, enterprise: fetchedEnterprise };
      }

      // Try sub_users table
      const subUserResult = await db.query<any>('sub_users', {
        filters: [{ field: 'email', operator: 'ilike', value: email }],
        limit: 1,
      });

      if (subUserResult.data && subUserResult.data.length > 0) {
        const subUserData = subUserResult.data[0];

        const fetchedUser: User = {
          id: subUserData.id,
          role: 'sub_user' as UserRole,
          name: subUserData.name || email.split('@')[0],
          email: subUserData.email,
          phone: subUserData.phone,
          enterpriseId: subUserData.enterprise_id,
          department: subUserData.department,
          createdAt: new Date(subUserData.created_at),
        };

        let fetchedEnterprise: Enterprise | null = null;

        if (fetchedUser.enterpriseId) {
          const enterpriseResult = await db.queryById<any>('enterprises', fetchedUser.enterpriseId);
          if (enterpriseResult.data) {
            const entData = enterpriseResult.data;
            fetchedEnterprise = {
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

            if (fetchedEnterprise.status !== 'active') {
              console.warn('[Auth] Enterprise is not active for sub_user');
              return { user: null, enterprise: null };
            }
          }
        }

        return { user: fetchedUser, enterprise: fetchedEnterprise };
      }

      // Try logistics_admins table
      const logisticsAdminResult = await db.query<any>('logistics_admins', {
        filters: [{ field: 'email', operator: 'ilike', value: email }],
        limit: 1,
      });

      if (logisticsAdminResult.data && logisticsAdminResult.data.length > 0) {
        const adminData = logisticsAdminResult.data[0];

        if (adminData.status !== 'active') {
          console.warn('[Auth] Logistics admin is not active');
          return { user: null, enterprise: null };
        }

        const fetchedUser: User = {
          id: adminData.id,
          role: 'logistics_admin' as UserRole,
          name: adminData.name,
          email: adminData.email,
          phone: adminData.phone,
          createdAt: new Date(adminData.created_at),
        };

        return { user: fetchedUser, enterprise: null };
      }

      // Try logistics_users table
      const logisticsUserResult = await db.query<any>('logistics_users', {
        filters: [{ field: 'email', operator: 'ilike', value: email }],
        limit: 1,
      });

      if (logisticsUserResult.data && logisticsUserResult.data.length > 0) {
        const userData = logisticsUserResult.data[0];

        if (userData.status !== 'active') {
          console.warn('[Auth] Logistics user is not active');
          return { user: null, enterprise: null };
        }

        const fetchedUser: User = {
          id: userData.id,
          role: 'logistics_user' as UserRole,
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          enterpriseId: userData.logistics_admin_id, // Store logistics_admin_id for reference
          createdAt: new Date(userData.created_at),
        };

        return { user: fetchedUser, enterprise: null };
      }

      console.warn('[Auth] User not found in any table:', email);
      return { user: null, enterprise: null };
    } catch (error) {
      console.error('[Auth] Error fetching user from database:', error);
      return { user: null, enterprise: null };
    }
  }, []);

  /**
   * Handle session state - fetch user data when session exists
   */
  const handleSession = useCallback(async (currentSession: Session | null) => {
    setIsLoading(true);

    if (!currentSession?.user?.email) {
      // No valid session - clear everything
      console.log('[Auth] No session or email, clearing auth state');
      setSession(null);
      setUser(null);
      setEnterprise(null);
      setIsLoading(false);
      return;
    }

    // Verify session is not expired
    const expiresAt = currentSession.expires_at;
    if (expiresAt && expiresAt * 1000 < Date.now()) {
      console.warn('[Auth] Session expired at:', new Date(expiresAt * 1000));
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setEnterprise(null);
      setIsLoading(false);
      return;
    }

    console.log('[Auth] Session valid, fetching user from database:', currentSession.user.email);

    // Session is valid - fetch user data from database
    const { user: fetchedUser, enterprise: fetchedEnterprise } = await fetchUserFromDatabase(currentSession.user.email);

    if (!fetchedUser) {
      // User exists in Supabase Auth but not in our database
      // DON'T clear the session - just log the warning
      // This allows the auth state change listener to handle it
      console.warn('[Auth] User authenticated but not found in database:', currentSession.user.email);
      console.warn('[Auth] This might indicate database connectivity issue or user not in any user table');
      // Keep the session but don't set user - this will show as not authenticated
      setSession(null);
      setUser(null);
      setEnterprise(null);
      setIsLoading(false);
      return;
    }

    console.log('[Auth] User found in database:', fetchedUser.name, `(${fetchedUser.role})`);
    setSession(currentSession);
    setUser(fetchedUser);
    setEnterprise(fetchedEnterprise);
    setIsLoading(false);
  }, [fetchUserFromDatabase]);

  // Ref to always have latest handleSession without needing it in deps
  const handleSessionRef = useRef(handleSession);
  handleSessionRef.current = handleSession;

  /**
   * Initialize auth state on mount
   *
   * Strategy: Call getSession() immediately on mount, then set up listener
   * for subsequent changes. This is simpler and more reliable than waiting
   * for INITIAL_SESSION event which may vary across Supabase versions.
   */
  useEffect(() => {
    let mounted = true;
    let initialized = false;

    const processSession = async (currentSession: Session | null) => {
      return handleSessionRef.current(currentSession);
    };

    // Initialize auth state immediately
    const initializeAuth = async () => {
      try {
        console.log('[Auth] Initializing auth state...');
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[Auth] Error getting session:', error);
        }

        if (mounted && !initialized) {
          initialized = true;
          console.log('[Auth] Got session:', currentSession?.user?.email || 'none');
          await processSession(currentSession);
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('[Auth] Initialization error:', error);
        if (mounted && !initialized) {
          initialized = true;
          setIsLoading(false);
          setIsInitialized(true);
        }
      }
    };

    // Start initialization immediately
    initializeAuth();

    // Set up auth state change listener for subsequent changes (login/logout/refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, currentSession: Session | null) => {
        console.log('[Auth] Auth state changed:', event, currentSession?.user?.email);

        if (!mounted) return;

        // Skip INITIAL_SESSION if we've already initialized via getSession
        if (event === 'INITIAL_SESSION' && initialized) {
          console.log('[Auth] Skipping INITIAL_SESSION - already initialized');
          return;
        }

        switch (event) {
          case 'INITIAL_SESSION':
            // Handle INITIAL_SESSION only if we haven't initialized yet
            if (!initialized) {
              initialized = true;
              await processSession(currentSession);
              setIsInitialized(true);
            }
            break;
          case 'SIGNED_IN':
          case 'TOKEN_REFRESHED':
            await processSession(currentSession);
            if (!isInitialized) {
              setIsInitialized(true);
            }
            break;
          case 'SIGNED_OUT':
            setSession(null);
            setUser(null);
            setEnterprise(null);
            setIsLoading(false);
            break;
          case 'USER_UPDATED':
            if (currentSession) {
              await processSession(currentSession);
            }
            break;
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Login with email and password
   */
  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setIsLoading(false);
        return { success: false, error: error.message };
      }

      if (!data.session) {
        setIsLoading(false);
        return { success: false, error: 'No session returned' };
      }

      // handleSession will be called by onAuthStateChange
      // but we also call it here for immediate response
      await handleSession(data.session);

      // Check if user was found in database
      if (!user) {
        // Re-check after handleSession
        const { user: fetchedUser } = await fetchUserFromDatabase(email);
        if (!fetchedUser) {
          await supabase.auth.signOut();
          return { success: false, error: 'User account not found or inactive' };
        }
      }

      return { success: true };
    } catch (error) {
      console.error('[Auth] Login error:', error);
      setIsLoading(false);
      return { success: false, error: error instanceof Error ? error.message : 'Login failed' };
    }
  }, [handleSession, fetchUserFromDatabase, user]);

  /**
   * Logout - clear session and state
   */
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      // State will be cleared by onAuthStateChange
    } catch (error) {
      console.error('[Auth] Logout error:', error);
      // Force clear state even if signOut fails
      setSession(null);
      setUser(null);
      setEnterprise(null);
    }
    setIsLoading(false);
  }, []);

  /**
   * Manually refresh session
   */
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { session: newSession }, error } = await supabase.auth.refreshSession();

      if (error || !newSession) {
        console.error('[Auth] Session refresh failed:', error);
        return false;
      }

      await handleSession(newSession);
      return true;
    } catch (error) {
      console.error('[Auth] Session refresh error:', error);
      return false;
    }
  }, [handleSession]);

  /**
   * Check if user has one of the specified roles
   */
  const hasRole = useCallback((...roles: UserRole[]): boolean => {
    return user?.role ? roles.includes(user.role) : false;
  }, [user]);

  /**
   * Check if user is any admin type
   */
  const isAdmin = useCallback((): boolean => {
    return hasRole('super_admin', 'main_admin', 'org_admin', 'it_admin', 'logistics_admin');
  }, [hasRole]);

  /**
   * Check if user is platform admin (super_admin or main_admin)
   */
  const isPlatformAdmin = useCallback((): boolean => {
    return hasRole('super_admin', 'main_admin');
  }, [hasRole]);

  const value: AuthContextType = {
    user,
    enterprise,
    session,
    isAuthenticated: !!session && !!user,
    isLoading,
    isInitialized,
    login,
    logout,
    refreshSession,
    hasRole,
    isAdmin,
    isPlatformAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use auth context
 * Throws error if used outside AuthProvider
 */
export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

/**
 * Export the context for advanced use cases
 */
export { AuthContext };
