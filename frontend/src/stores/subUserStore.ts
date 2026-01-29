import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SubUser, CreateSubUserInput } from '@/types';
import { db } from '@/lib/database';
import { supabase } from '@/lib/supabase';

interface SubUserFilters {
  search?: string;
  department?: string;
}

interface SubUserState {
  subUsers: SubUser[];
  selectedSubUser: SubUser | null;
  filters: SubUserFilters;
  isLoading: boolean;

  // Actions
  hydrate: (subUsers: SubUser[]) => void;
  fetchSubUsers: (enterpriseId: string) => Promise<void>;
  getSubUserById: (id: string) => SubUser | undefined;
  createSubUser: (input: CreateSubUserInput) => Promise<SubUser>;
  createSubUsers: (inputs: CreateSubUserInput[]) => Promise<SubUser[]>;
  updateSubUser: (id: string, input: Partial<CreateSubUserInput>) => Promise<void>;
  deleteSubUser: (id: string) => Promise<void>;
  setFilters: (filters: SubUserFilters) => void;
  setSelectedSubUser: (subUser: SubUser | null) => void;
  getFilteredSubUsers: (enterpriseId: string) => SubUser[];
  getSubUserStats: (enterpriseId: string) => {
    total: number;
    byDepartment: Record<string, number>;
    recentlyAdded: number;
  };
}

const generateId = () => `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const generateToken = () => `tok_${Math.random().toString(36).substr(2, 16)}`;

export const useSubUserStore = create<SubUserState>()(
  persist(
    (set, get) => ({
      subUsers: [],
      selectedSubUser: null,
      filters: {},
      isLoading: false,

      hydrate: (subUsers: SubUser[]) => {
        if (get().subUsers.length === 0 && subUsers.length > 0) {
          set({ subUsers });
        }
      },

      fetchSubUsers: async (enterpriseId: string) => {
        set({ isLoading: true });

        try {
          // Query sub_users from database
          const result = await db.query('sub_users', {
            filters: [{ field: 'enterprise_id', operator: 'eq', value: enterpriseId }]
          });

          if (result.error) {
            console.error('Database query error:', result.error.message);
            set({ isLoading: false });
            return;
          }

          if (result.data) {
            // Map database records to frontend SubUser type
            const subUsers: SubUser[] = result.data.map((dbUser: any) => ({
              id: dbUser.id,
              enterpriseId: dbUser.enterprise_id,
              email: dbUser.email,
              name: dbUser.name || dbUser.email,
              phone: dbUser.phone || undefined,
              department: dbUser.department || undefined,
              token: dbUser.token,
              tokenExpiresAt: dbUser.token_expires_at ? new Date(dbUser.token_expires_at) : undefined,
              createdAt: new Date(dbUser.created_at),
            }));

            set({ subUsers, isLoading: false });
            console.log(`✅ Fetched ${subUsers.length} sub-users from database`);
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          console.error('Failed to fetch sub-users:', error);
          set({ isLoading: false });
        }
      },

      getSubUserById: (id: string) => {
        return get().subUsers.find(s => s.id === id);
      },

      createSubUser: async (input: CreateSubUserInput) => {
        set({ isLoading: true });

        try {
          const userId = generateId();
          const token = generateToken();
          const demoPassword = 'demo123'; // Demo password for all users

          // Step 1: Create Supabase Auth user
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: input.email,
            password: demoPassword,
            options: {
              data: {
                name: input.name || input.email,
                role: 'sub_user',
              },
            },
          });

          if (authError) {
            console.warn('Auth creation failed:', authError.message);
            // Continue anyway - we'll just create the database record
          }

          // Step 2: Create database record in sub_users table
          const result = await db.insert('sub_users', {
            id: userId,
            enterprise_id: input.enterpriseId,
            email: input.email,
            name: input.name || input.email,
            phone: input.phone || '',
            department: input.department || null,
            token: token,
            created_at: new Date().toISOString(),
          });

          if (result.error) {
            throw new Error(`Database error: ${result.error.message}`);
          }

          const newSubUser: SubUser = {
            id: userId,
            ...input,
            token,
            tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            createdAt: new Date(),
          };

          set(state => ({
            subUsers: [...state.subUsers, newSubUser],
            isLoading: false,
          }));

          console.log(`✅ Sub-user created: ${input.email} (Password: ${demoPassword})`);
          return newSubUser;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      createSubUsers: async (inputs: CreateSubUserInput[]) => {
        set({ isLoading: true });

        try {
          const demoPassword = 'demo123'; // Demo password for all users
          const newSubUsers: SubUser[] = [];

          // Process each user
          for (const input of inputs) {
            const userId = generateId();
            const token = generateToken();

            try {
              // Step 1: Create Supabase Auth user
              const { error: authError } = await supabase.auth.signUp({
                email: input.email,
                password: demoPassword,
                options: {
                  data: {
                    name: input.name || input.email,
                    role: 'sub_user',
                  },
                },
              });

              if (authError) {
                console.warn(`Auth creation failed for ${input.email}:`, authError.message);
                // Continue anyway - we'll create the database record
              }

              // Step 2: Create database record in sub_users table
              const result = await db.insert('sub_users', {
                id: userId,
                enterprise_id: input.enterpriseId,
                email: input.email,
                name: input.name || input.email,
                phone: input.phone || '',
                department: input.department || null,
                token: token,
                created_at: new Date().toISOString(),
              });

              if (result.error) {
                console.error(`Database error for ${input.email}:`, result.error.message);
                continue; // Skip this user if database insert fails
              }

              const newSubUser: SubUser = {
                id: userId,
                ...input,
                token,
                tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                createdAt: new Date(),
              };

              newSubUsers.push(newSubUser);
              console.log(`✅ Sub-user created: ${input.email}`);
            } catch (error) {
              console.error(`Failed to create user ${input.email}:`, error);
              // Continue with next user
            }
          }

          set(state => ({
            subUsers: [...state.subUsers, ...newSubUsers],
            isLoading: false,
          }));

          console.log(`✅ Bulk upload complete: ${newSubUsers.length}/${inputs.length} users created (Password: ${demoPassword})`);
          return newSubUsers;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      updateSubUser: async (id: string, input: Partial<CreateSubUserInput>) => {
        set({ isLoading: true });

        try {
          // Update database
          const updateData: any = {};
          if (input.name !== undefined) updateData.name = input.name;
          if (input.email !== undefined) updateData.email = input.email;
          if (input.phone !== undefined) updateData.phone = input.phone;
          if (input.department !== undefined) updateData.department = input.department;

          const result = await db.update('sub_users', id, updateData);

          if (result.error) {
            throw new Error(`Database error: ${result.error.message}`);
          }

          set(state => ({
            subUsers: state.subUsers.map(s =>
              s.id === id ? { ...s, ...input } : s
            ),
            isLoading: false,
          }));

          console.log(`✅ Sub-user updated: ${id}`);
        } catch (error) {
          set({ isLoading: false });
          console.error('Failed to update sub-user:', error);
          throw error;
        }
      },

      deleteSubUser: async (id: string) => {
        set({ isLoading: true });

        try {
          // Delete from database
          const result = await db.delete('sub_users', id);

          if (result.error) {
            throw new Error(`Database error: ${result.error.message}`);
          }

          set(state => ({
            subUsers: state.subUsers.filter(s => s.id !== id),
            isLoading: false,
          }));

          console.log(`✅ Sub-user deleted: ${id}`);
        } catch (error) {
          set({ isLoading: false });
          console.error('Failed to delete sub-user:', error);
          throw error;
        }
      },

      setFilters: (filters: SubUserFilters) => {
        set({ filters });
      },

      setSelectedSubUser: (subUser: SubUser | null) => {
        set({ selectedSubUser: subUser });
      },

      getFilteredSubUsers: (enterpriseId: string) => {
        const { subUsers, filters } = get();
        let filtered = subUsers.filter(s => s.enterpriseId === enterpriseId);

        if (filters.search) {
          const search = filters.search.toLowerCase();
          filtered = filtered.filter(
            s =>
              s.name?.toLowerCase().includes(search) ||
              s.email.toLowerCase().includes(search) ||
              s.department?.toLowerCase().includes(search)
          );
        }

        if (filters.department) {
          filtered = filtered.filter(s => s.department === filters.department);
        }

        return filtered;
      },

      getSubUserStats: (enterpriseId: string) => {
        const subUsers = get().subUsers.filter(s => s.enterpriseId === enterpriseId);
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const byDepartment: Record<string, number> = {};
        subUsers.forEach(s => {
          const dept = s.department || 'Unassigned';
          byDepartment[dept] = (byDepartment[dept] || 0) + 1;
        });

        return {
          total: subUsers.length,
          byDepartment,
          recentlyAdded: subUsers.filter(s => new Date(s.createdAt) >= sevenDaysAgo).length,
        };
      },
    }),
    {
      name: 'ecotribe-subuser-store',
      partialize: (state) => ({ subUsers: state.subUsers }),
    }
  )
);
