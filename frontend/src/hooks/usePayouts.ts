/**
 * usePayouts - React Query hook for payout data
 * V3.2: All payout data fetching and mutations via REST API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardStatsKeys } from './useDashboardStats';
import { payoutsApi } from '@/lib/api/payouts';
import { assetKeys } from './useAssets';
import { batchKeys } from './useBatches';

// Query keys for cache management
export const payoutKeys = {
  all: ['payouts'] as const,
  lists: () => [...payoutKeys.all, 'list'] as const,
  list: (enterpriseId: string) => [...payoutKeys.lists(), enterpriseId] as const,
  details: () => [...payoutKeys.all, 'detail'] as const,
  detail: (id: string) => [...payoutKeys.details(), id] as const,
};

// ============================================
// QUERIES
// ============================================

/**
 * Fetch all payouts for an enterprise
 */
export function usePayouts(enterpriseId: string) {
  return useQuery({
    queryKey: payoutKeys.list(enterpriseId),
    queryFn: async () => {
      const response = await payoutsApi.list({ page: 1, page_size: 100 });
      if (!response.success) throw new Error(response.error?.message || 'Failed to fetch payouts');
      return response.data || [];
    },
    enabled: !!enterpriseId,
    staleTime: 30000,
  });
}

/**
 * Fetch all payouts (OPS admin view - no enterprise filter)
 */
export function useAllPayouts() {
  return useQuery({
    queryKey: payoutKeys.all,
    queryFn: async () => {
      const response = await payoutsApi.list({ page: 1, page_size: 100 });
      if (!response.success) throw new Error(response.error?.message || 'Failed to fetch payouts');
      return response.data || [];
    },
    staleTime: 30000,
  });
}

/**
 * Fetch single payout by ID
 */
export function usePayout(payoutId: string) {
  return useQuery({
    queryKey: payoutKeys.detail(payoutId),
    queryFn: async () => {
      const response = await payoutsApi.get(payoutId);
      if (!response.success) throw new Error(response.error?.message || 'Failed to fetch payout');
      return response.data;
    },
    enabled: !!payoutId,
  });
}

// ============================================
// MUTATIONS
// ============================================

export interface CreatePayoutInput {
  enterprise_id: string;
  batch_id?: string;
  amount: number;
  reference_id?: string;
  // asset_ids and items are intentionally excluded — backend does not accept them.
  // The payout API only accepts enterprise_id, batch_id, amount, method, and notes.
}

/**
 * Create a new payout via REST API
 */
export function useCreatePayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payout: CreatePayoutInput) => {
      const response = await payoutsApi.create({
        enterprise_id: payout.enterprise_id,
        batch_id: payout.batch_id,
        amount: payout.amount,
        method: 'wallet',
        notes: payout.reference_id ? `Ref: ${payout.reference_id}` : undefined,
      });

      if (!response.success) throw new Error(response.error?.message || 'Failed to create payout');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payoutKeys.all });
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
      queryClient.invalidateQueries({ queryKey: batchKeys.all });
      queryClient.invalidateQueries({ queryKey: ['sidebar-badges'] });
      queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.all });
    },
  });
}

export interface UpdatePayoutStatusInput {
  payoutId: string;
  status: 'pending' | 'processing' | 'processed' | 'completed' | 'failed';
  processedBy?: string;
  transactionId?: string;
}

/**
 * Update payout status via REST API
 */
export function useUpdatePayoutStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ payoutId, status, transactionId }: UpdatePayoutStatusInput) => {
      if (status === 'completed' || status === 'processed') {
        const response = await payoutsApi.process(payoutId, 'complete', { transaction_reference: transactionId || undefined });
        if (!response.success) throw new Error(response.error?.message || 'Failed to update payout');
        return response.data;
      }
      if (status === 'failed') {
        const response = await payoutsApi.process(payoutId, 'fail', { failure_reason: 'Marked as failed' });
        if (!response.success) throw new Error(response.error?.message || 'Failed to update payout');
        return response.data;
      }
      throw new Error(`Status update to '${status}' not yet supported via REST API`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: payoutKeys.detail(variables.payoutId) });
      queryClient.invalidateQueries({ queryKey: payoutKeys.all });
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
      queryClient.invalidateQueries({ queryKey: batchKeys.all });
    },
  });
}

/**
 * Mark payout as completed with transaction details via REST API
 */
export function useCompletePayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      payoutId,
      transactionId
    }: {
      payoutId: string;
      transactionId: string;
    }) => {
      const response = await payoutsApi.process(payoutId, 'complete', { transaction_reference: transactionId });
      if (!response.success) throw new Error(response.error?.message || 'Failed to complete payout');
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: payoutKeys.detail(variables.payoutId) });
      queryClient.invalidateQueries({ queryKey: payoutKeys.all });
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
      queryClient.invalidateQueries({ queryKey: batchKeys.all });
      queryClient.invalidateQueries({ queryKey: ['sidebar-badges'] });
      queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.all });
    },
  });
}
