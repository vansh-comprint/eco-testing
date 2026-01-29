import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole, Enterprise } from '@/types';
import { db } from '@/lib/database';
import { supabase } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  enterprise: Enterprise | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  // login returns: true (success), false (user not found), or string (error message)
  login: (email: string, password?: string) => Promise<boolean | string>;
  sendMagicLink: (email: string) => Promise<boolean>;
  loginAsSubUser: (email: string) => Promise<boolean>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  setUser: (user: User | null) => void;
  hydrateEnterprise: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      enterprise: null,
      isAuthenticated: false,
      isLoading: false,

      // Login with email and password using Supabase Auth
      // Returns: true (success), false (user not found), or string (specific error message)
      login: async (email: string, password?: string): Promise<boolean | string> => {
        set({ isLoading: true });

        try {
          console.log('🔐 Logging in:', email);

          let authSucceeded = false;
          let authErrorMessage = '';

          // Try Supabase Auth first if password provided
          if (password) {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
              email,
              password,
            });

            if (authError) {
              console.warn('Supabase Auth error:', authError.message);
              authErrorMessage = authError.message;
            } else if (authData.user) {
              console.log('✅ Supabase Auth successful');
              authSucceeded = true;
            }
          }

          // Query users table to get user details
          const userResult = await db.query<any>('users', {
            filters: [{ field: 'email', operator: 'ilike', value: email }],
            limit: 1,
          });

          let user: User | null = null;
          let enterprise: Enterprise | null = null;

          if (userResult.data && userResult.data.length > 0) {
            const userData = userResult.data[0];

            // Check if user is active
            if (userData.status !== 'active') {
              console.warn('User is not active:', userData.status);
              set({ isLoading: false });
              return false;
            }

            user = {
              id: userData.id,
              role: userData.role,
              name: userData.name,
              email: userData.email,
              phone: userData.phone,
              enterpriseId: userData.enterprise_id,
              department: userData.department,
              createdAt: new Date(userData.created_at),
            };

            // Fetch enterprise if user has one
            if (user.enterpriseId) {
              const enterpriseResult = await db.queryById<any>('enterprises', user.enterpriseId);
              if (enterpriseResult.data) {
                const entData = enterpriseResult.data;
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
          } else {
            // Check sub_users table
            const subUserResult = await db.query<any>('sub_users', {
              filters: [{ field: 'email', operator: 'ilike', value: email }],
              limit: 1,
            });

            if (subUserResult.data && subUserResult.data.length > 0) {
              const subUserData = subUserResult.data[0];
              user = {
                id: subUserData.id,
                role: 'sub_user',
                name: subUserData.name || email.split('@')[0],
                email: subUserData.email,
                phone: subUserData.phone,
                enterpriseId: subUserData.enterprise_id,
                department: subUserData.department,
                createdAt: new Date(subUserData.created_at),
              };

              // Fetch enterprise
              if (user.enterpriseId) {
                const enterpriseResult = await db.queryById<any>('enterprises', user.enterpriseId);
                if (enterpriseResult.data) {
                  const entData = enterpriseResult.data;
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
            } else {
              // Check logistics_admins table
              const logisticsAdminResult = await db.query<any>('logistics_admins', {
                filters: [{ field: 'email', operator: 'ilike', value: email }],
                limit: 1,
              });

              if (logisticsAdminResult.data && logisticsAdminResult.data.length > 0) {
                const adminData = logisticsAdminResult.data[0];

                // Check if user is active
                if (adminData.status !== 'active') {
                  console.warn('Logistics admin is not active:', adminData.status);
                  set({ isLoading: false });
                  return false;
                }

                user = {
                  id: adminData.id,
                  role: 'logistics_admin',
                  name: adminData.name,
                  email: adminData.email,
                  phone: adminData.phone,
                  createdAt: new Date(adminData.created_at),
                };
              } else {
                // Check logistics_users table
                const logisticsUserResult = await db.query<any>('logistics_users', {
                  filters: [{ field: 'email', operator: 'ilike', value: email }],
                  limit: 1,
                });

                if (logisticsUserResult.data && logisticsUserResult.data.length > 0) {
                  const userData = logisticsUserResult.data[0];

                  // Check if user is active
                  if (userData.status !== 'active') {
                    console.warn('Logistics user is not active:', userData.status);
                    set({ isLoading: false });
                    return false;
                  }

                  user = {
                    id: userData.id,
                    role: 'logistics_user',
                    name: userData.name,
                    email: userData.email,
                    phone: userData.phone,
                    createdAt: new Date(userData.created_at),
                    // Store logistics_admin_id for reference
                    enterpriseId: userData.logistics_admin_id,
                  };
                }
              }
            }
          }

          if (!user) {
            console.warn('User not found in database:', email);
            set({ isLoading: false });

            // Return specific error messages based on auth status
            if (authSucceeded) {
              // User exists in Supabase Auth but not in users table
              return 'AUTH_NO_DB_RECORD';
            } else if (authErrorMessage) {
              // Supabase Auth failed (wrong password, etc.)
              return authErrorMessage;
            }
            // User not found anywhere
            return false;
          }

          console.log('✅ Login successful:', user.name, `(${user.role})`);

          set({
            user,
            enterprise,
            isAuthenticated: true,
            isLoading: false,
          });

          return true;
        } catch (error) {
          console.error('Login error:', error);
          set({ isLoading: false });
          return error instanceof Error ? error.message : 'Login failed';
        }
      },

      // Magic link - stub for future implementation
      sendMagicLink: async (email: string) => {
        set({ isLoading: true });

        try {
          // For now, just login directly (for testing)
          // In the future, this will send an actual magic link email
          console.log('📧 Magic link requested for:', email);
          const success = await get().login(email);
          return success;
        } catch (error) {
          console.error('Magic link error:', error);
          set({ isLoading: false });
          return false;
        }
      },

      loginAsSubUser: async (email: string) => {
        return get().login(email);
      },

      logout: async () => {
        await supabase.auth.signOut();
        set({
          user: null,
          enterprise: null,
          isAuthenticated: false,
        });
      },

      // Dev tool: switch between roles for testing
      switchRole: async (role: UserRole) => {
        set({ isLoading: true });
        try {
          // Query database for a user with this role
          const userResult = await db.query<any>('users', {
            filters: [{ field: 'role', operator: 'eq', value: role }],
            limit: 1,
          });

          if (userResult.data && userResult.data.length > 0) {
            const userData = userResult.data[0];
            const user: User = {
              id: userData.id,
              role: userData.role,
              name: userData.name,
              email: userData.email,
              phone: userData.phone,
              enterpriseId: userData.enterprise_id,
              department: userData.department,
              createdAt: new Date(userData.created_at),
            };

            let enterprise: Enterprise | null = null;
            if (user.enterpriseId) {
              const enterpriseResult = await db.queryById<any>('enterprises', user.enterpriseId);
              if (enterpriseResult.data) {
                const entData = enterpriseResult.data;
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
            });
          } else {
            console.warn('No user found with role:', role);
            set({ isLoading: false });
          }
        } catch (error) {
          console.error('Error switching role:', error);
          set({ isLoading: false });
        }
      },

      setUser: async (user: User | null) => {
        if (user) {
          let enterprise: Enterprise | null = null;
          // Skip enterprise hydration for logistics roles (they don't belong to enterprises)
          // logistics_user stores logistics_admin_id in enterpriseId field
          const isLogisticsRole = user.role === 'logistics_admin' || user.role === 'logistics_user';
          if (user.enterpriseId && !isLogisticsRole) {
            try {
              const enterpriseResult = await db.queryById<any>('enterprises', user.enterpriseId);
              if (enterpriseResult.data) {
                const entData = enterpriseResult.data;
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
            } catch (error) {
              console.error('Error fetching enterprise:', error);
            }
          }
          set({ user, enterprise, isAuthenticated: true });
        } else {
          set({ user: null, enterprise: null, isAuthenticated: false });
        }
      },

      hydrateEnterprise: async () => {
        const { user, enterprise } = get();

        // Skip enterprise hydration for logistics roles (they don't belong to enterprises)
        // logistics_user stores logistics_admin_id in enterpriseId field
        if (user?.role === 'logistics_admin' || user?.role === 'logistics_user') {
          return;
        }

        // If user exists with enterpriseId but enterprise is not loaded, fetch it
        if (user?.enterpriseId && !enterprise) {
          console.log('🔄 Hydrating enterprise data for user:', user.email);
          try {
            const enterpriseResult = await db.queryById<any>('enterprises', user.enterpriseId);
            if (enterpriseResult.data) {
              const entData = enterpriseResult.data;
              const loadedEnterprise: Enterprise = {
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
              set({ enterprise: loadedEnterprise });
              console.log('✅ Enterprise data loaded:', loadedEnterprise.name);
            } else {
              console.warn('⚠️ Enterprise not found for ID:', user.enterpriseId);
            }
          } catch (error) {
            console.error('❌ Error hydrating enterprise:', error);
          }
        }
      },
    }),
    {
      name: 'ecotribe-auth',
      partialize: (state) => ({
        user: state.user,
        enterprise: state.enterprise,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Selector hooks for convenience
export const useUser = () => useAuthStore((state) => state.user);
export const useEnterprise = () => useAuthStore((state) => state.enterprise);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useUserRole = () => useAuthStore((state) => state.user?.role);
