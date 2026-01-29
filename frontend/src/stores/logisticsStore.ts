import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AssetPickupRecord } from '@/types';
import { supabase } from '@/lib/supabase';

export interface LogisticsAdmin {
  id: string;
  name: string;
  companyName: string;
  phone?: string;
  email?: string;
  status: 'active' | 'inactive';
  createdAt?: Date;
}

export interface LogisticsUser {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  logisticsAdminId?: string; // Which logistics admin this user belongs to
  status: 'active' | 'inactive';
  createdAt?: Date;
}

export interface OnSiteQCInput {
  pickupRequestId: string;
  assetId: string;
  logisticsUserId: string;
  serialMatch: boolean;
  powersOn: boolean;
  condition: 'good' | 'worse' | 'failed';
  notes?: string;
  photos?: { device?: string; handover?: string };
  signature?: string;
}

export interface OnSiteQCRecord extends OnSiteQCInput {
  id: string;
  createdAt: Date;
}

interface LogisticsState {
  logisticsAdmins: LogisticsAdmin[];
  logisticsUsers: LogisticsUser[];
  qcRecords: OnSiteQCRecord[];
  isLoading: boolean;

  // Initialization
  fetchLogisticsAdmins: () => Promise<void>;
  fetchLogisticsUsers: () => Promise<void>;

  // Logistics Admin operations
  getLogisticsAdminById: (id: string) => LogisticsAdmin | undefined;
  createAdmin: (input: Omit<LogisticsAdmin, 'id' | 'status' | 'createdAt'> & { status?: 'active' | 'inactive' }) => Promise<LogisticsAdmin>;
  updateAdminStatus: (id: string, status: 'active' | 'inactive') => Promise<void>;

  // Logistics User operations
  getUsersByAdmin: (adminId: string) => LogisticsUser[];
  createUser: (input: Omit<LogisticsUser, 'id' | 'status' | 'createdAt'> & { status?: 'active' | 'inactive' }) => Promise<LogisticsUser>;
  updateUserStatus: (id: string, status: 'active' | 'inactive') => Promise<void>;

  // QC operations
  createOnSiteQC: (input: OnSiteQCInput) => Promise<OnSiteQCRecord>;
}

const genId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const useLogisticsStore = create<LogisticsState>()(
  persist(
    (set, get) => ({
      logisticsAdmins: [],
      logisticsUsers: [],
      qcRecords: [],
      isLoading: false,

      fetchLogisticsAdmins: async () => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase
            .from('logistics_admins')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Error fetching logistics admins:', error);
            return;
          }

          const admins: LogisticsAdmin[] = (data || []).map((row: any) => ({
            id: row.id,
            name: row.name,
            companyName: row.company_name,
            phone: row.phone,
            email: row.email,
            status: row.status,
            createdAt: new Date(row.created_at),
          }));

          set({ logisticsAdmins: admins });
          console.log(`✅ Fetched ${admins.length} logistics admins from DB`);
        } catch (error) {
          console.error('Failed to fetch logistics admins:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      fetchLogisticsUsers: async () => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase
            .from('logistics_users')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Error fetching logistics users:', error);
            return;
          }

          const users: LogisticsUser[] = (data || []).map((row: any) => ({
            id: row.id,
            name: row.name,
            phone: row.phone,
            email: row.email,
            logisticsAdminId: row.logistics_admin_id,
            status: row.status,
            createdAt: new Date(row.created_at),
          }));

          set({ logisticsUsers: users });
          console.log(`✅ Fetched ${users.length} logistics users from DB`);
        } catch (error) {
          console.error('Failed to fetch logistics users:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      getLogisticsAdminById: (id: string) => {
        return get().logisticsAdmins.find(a => a.id === id);
      },

      getUsersByAdmin: (adminId: string) => {
        return get().logisticsUsers.filter(u => u.logisticsAdminId === adminId && u.status === 'active');
      },

      createAdmin: async (input) => {
        set({ isLoading: true });
        const adminId = genId('ladmin');

        try {
          const { data, error } = await supabase
            .from('logistics_admins')
            .insert({
              id: adminId,
              name: input.name,
              company_name: input.companyName,
              phone: input.phone || null,
              email: input.email || null,
              status: input.status || 'active',
              created_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (error) {
            console.error('Database error creating logistics admin:', error);
            throw error;
          }

          const admin: LogisticsAdmin = {
            id: data.id,
            name: data.name,
            companyName: data.company_name,
            phone: data.phone,
            email: data.email,
            status: data.status,
            createdAt: new Date(data.created_at),
          };

          set(state => ({
            logisticsAdmins: [admin, ...state.logisticsAdmins],
            isLoading: false
          }));

          console.log(`✅ Logistics admin created in DB: ${input.name} (${input.companyName})`);
          return admin;
        } catch (error) {
          console.error('Failed to create logistics admin:', error);
          set({ isLoading: false });
          throw error;
        }
      },

      updateAdminStatus: async (id, status) => {
        try {
          const { error } = await supabase
            .from('logistics_admins')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id);

          if (error) {
            console.error('Database error updating admin status:', error);
            throw error;
          }

          set(state => ({
            logisticsAdmins: state.logisticsAdmins.map(a => (a.id === id ? { ...a, status } : a)),
          }));

          console.log(`✅ Logistics admin ${id} status updated to ${status}`);
        } catch (error) {
          console.error('Failed to update admin status:', error);
          throw error;
        }
      },

      createUser: async (input) => {
        set({ isLoading: true });
        const userId = genId('luser');

        try {
          const { data, error } = await supabase
            .from('logistics_users')
            .insert({
              id: userId,
              name: input.name,
              phone: input.phone || null,
              email: input.email || null,
              logistics_admin_id: input.logisticsAdminId || null,
              status: input.status || 'active',
              created_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (error) {
            console.error('Database error creating logistics user:', error);
            throw error;
          }

          const user: LogisticsUser = {
            id: data.id,
            name: data.name,
            phone: data.phone,
            email: data.email,
            logisticsAdminId: data.logistics_admin_id,
            status: data.status,
            createdAt: new Date(data.created_at),
          };

          set(state => ({
            logisticsUsers: [user, ...state.logisticsUsers],
            isLoading: false
          }));

          console.log(`✅ Logistics user created in DB: ${input.name}`);
          return user;
        } catch (error) {
          console.error('Failed to create logistics user:', error);
          set({ isLoading: false });
          throw error;
        }
      },

      updateUserStatus: async (id, status) => {
        try {
          const { error } = await supabase
            .from('logistics_users')
            .update({ status })
            .eq('id', id);

          if (error) {
            console.error('Database error updating user status:', error);
            throw error;
          }

          set(state => ({
            logisticsUsers: state.logisticsUsers.map(u => (u.id === id ? { ...u, status } : u)),
          }));

          console.log(`✅ Logistics user ${id} status updated to ${status}`);
        } catch (error) {
          console.error('Failed to update user status:', error);
          throw error;
        }
      },

      createOnSiteQC: async (input) => {
        set({ isLoading: true });
        const qcId = genId('osqc');

        try {
          const { data, error } = await supabase
            .from('on_site_qc')
            .insert({
              id: qcId,
              pickup_request_id: input.pickupRequestId,
              asset_id: input.assetId,
              logistics_user_id: input.logisticsUserId,
              serial_match: input.serialMatch,
              powers_on: input.powersOn,
              condition: input.condition,
              notes: input.notes || null,
              photos: input.photos || null,
              signature: input.signature || null,
              created_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (error) {
            console.error('Database error creating QC record:', error);
            throw error;
          }

          const record: OnSiteQCRecord = {
            ...input,
            id: data.id,
            createdAt: new Date(data.created_at)
          };

          set(state => ({
            qcRecords: [record, ...state.qcRecords],
            isLoading: false
          }));

          console.log(`✅ On-site QC record created in DB: ${qcId}`);
          return record;
        } catch (error) {
          console.error('Failed to create QC record:', error);
          set({ isLoading: false });
          throw error;
        }
      },
    }),
    {
      name: 'ecotribe-logistics',
      partialize: (state) => ({
        // Don't persist anything - we'll always fetch from DB
        // This is intentionally empty to avoid stale local data
      }),
    }
  )
);
