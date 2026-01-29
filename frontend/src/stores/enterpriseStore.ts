import { create } from 'zustand';
import type { Enterprise } from '@/types';
import { db } from '@/lib/database';

interface EnterpriseState {
  enterprises: Enterprise[];
  isLoading: boolean;

  // Actions
  fetchEnterprises: () => Promise<void>;
  getEnterpriseById: (id: string) => Enterprise | undefined;
}

export const useEnterpriseStore = create<EnterpriseState>((set, get) => ({
  enterprises: [],
  isLoading: false,

  fetchEnterprises: async () => {
    set({ isLoading: true });
    try {
      const result = await db.query<any>('enterprises', {
        orderBy: [{ field: 'created_at', ascending: false }],
      });

      if (result.error) {
        console.error('Error fetching enterprises:', result.error);
        set({ enterprises: [], isLoading: false });
      } else {
        const enterprises: Enterprise[] = result.data.map((row: any) => ({
          id: row.id,
          name: row.name,
          gstNumber: row.gst_number,
          address: row.address,
          bankDetails: row.bank_details,
          status: row.status,
          contactPerson: row.contact_person,
          contactEmail: row.contact_email,
          contactPhone: row.contact_phone,
          logoUrl: row.logo_url,
          createdAt: new Date(row.created_at),
          updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
        }));
        set({ enterprises, isLoading: false });
      }
    } catch (error) {
      console.error('Error fetching enterprises:', error);
      set({ enterprises: [], isLoading: false });
    }
  },

  getEnterpriseById: (id: string) => {
    return get().enterprises.find(e => e.id === id);
  },
}));
