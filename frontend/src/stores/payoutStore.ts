import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId } from '@/lib/utils';
import { db } from '@/lib/database';

// Internal payout type used by the store (differs from API Payout type)
interface StorePayout {
  id: string;
  enterpriseId: string;
  batchId?: string;
  amount: number;
  status: string;
  processedAt?: Date;
  processedBy?: string;
  referenceId: string;
  items: { assetId: string; amount: number }[];
  createdAt: Date;
}

interface PayoutState {
  payouts: StorePayout[];
  isLoading: boolean;
  createPayout: (enterpriseId: string, assetIds: string[], amount: number, processedBy?: string) => Promise<StorePayout>;
  getPayoutsByEnterprise: (enterpriseId: string) => StorePayout[];
}

export const usePayoutStore = create<PayoutState>()(
  persist(
    (set, get) => ({
      payouts: [],
      isLoading: false,

      createPayout: async (enterpriseId, assetIds, amount, processedBy) => {
        set({ isLoading: true });

        try {
          const payoutId = `pyt-${generateId()}`;
          const referenceId = `PREF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
          const items = assetIds.map(id => ({ assetId: id, amount: Math.round(amount / assetIds.length) }));

          // Insert into database
          const result = await db.insert('payouts', {
            id: payoutId,
            enterprise_id: enterpriseId,
            batch_id: null,
            amount,
            status: 'processed',
            processed_at: new Date().toISOString(),
            processed_by: processedBy || null,
            reference_id: referenceId,
            items: items,
            created_at: new Date().toISOString(),
          }) as { data: any; error: { message: string } | null };

          if (result.error) {
            throw new Error(`Database error: ${result.error.message}`);
          }

          const newPayout: StorePayout = {
            id: payoutId,
            enterpriseId,
            batchId: undefined,
            amount,
            status: 'processed',
            processedAt: new Date(),
            processedBy,
            referenceId,
            items,
            createdAt: new Date(),
          };

          set(state => ({
            payouts: [newPayout, ...state.payouts],
            isLoading: false,
          }));

          console.log(`✅ Payout created: ${referenceId}`);
          return newPayout;
        } catch (error) {
          set({ isLoading: false });
          console.error('Failed to create payout:', error);
          throw error;
        }
      },

      getPayoutsByEnterprise: (enterpriseId: string) => {
        return get().payouts.filter(p => p.enterpriseId === enterpriseId);
      },
    }),
    {
      name: 'ecotribe-payouts',
      partialize: (state) => ({ payouts: state.payouts }),
    }
  )
);
