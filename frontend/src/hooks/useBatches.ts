/**
 * useBatches - React Query hook replacing batchStore
 * All batch data fetching and mutations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  batchesApi,
  type BatchResponse,
  type BatchCreateRequest,
  type BatchUpdateRequest,
} from '@/lib/api/batches';
import { assetsApi } from '@/lib/api/assets';
import { assetKeys } from './useAssets';

// Query keys for cache management
export const batchKeys = {
  all: ['batches'] as const,
  lists: () => [...batchKeys.all, 'list'] as const,
  list: (enterpriseId: string) => [...batchKeys.lists(), enterpriseId] as const,
  byBranch: (branchId: string) => [...batchKeys.all, 'branch', branchId] as const,
  byITAdmin: (userId: string) => [...batchKeys.all, 'it-admin', userId] as const,
  details: () => [...batchKeys.all, 'detail'] as const,
  detail: (id: string) => [...batchKeys.details(), id] as const,
  approvalQueue: (enterpriseId: string) => [...batchKeys.all, 'approvals', enterpriseId] as const,
  pendingApproval: () => [...batchKeys.all, 'pending-approval'] as const,
};

// ============================================
// QUERIES
// ============================================

/**
 * Fetch all batches for an enterprise
 */
export function useBatches(enterpriseId: string) {
  return useQuery({
    queryKey: batchKeys.list(enterpriseId),
    queryFn: async () => {
      const response = await batchesApi.list({
        enterprise_id: enterpriseId,
        limit: 1000,
      });
      return response.data;
    },
    enabled: !!enterpriseId,
    staleTime: 30000,
  });
}

/**
 * Fetch all batches (OPS admin view - no enterprise filter)
 */
export function useAllBatches() {
  return useQuery({
    queryKey: batchKeys.all,
    queryFn: async () => {
      const response = await batchesApi.list({ limit: 1000 });
      return response.data;
    },
    staleTime: 30000,
  });
}

/**
 * Fetch single batch by ID
 */
export function useBatch(batchId: string) {
  return useQuery({
    queryKey: batchKeys.detail(batchId),
    queryFn: async () => {
      const response = await batchesApi.get(batchId);
      return response.data;
    },
    enabled: !!batchId,
  });
}

/**
 * Fetch batches by branch
 */
export function useBatchesByBranch(branchId: string) {
  return useQuery({
    queryKey: batchKeys.byBranch(branchId),
    queryFn: async () => {
      const response = await batchesApi.list({
        branch_id: branchId,
        limit: 1000,
      });
      return response.data;
    },
    enabled: !!branchId,
  });
}

/**
 * Fetch batches for IT Admin (across all their assigned branches)
 * V3.2: IT Admin can manage multiple branches - API handles role-based scoping
 */
export function useBatchesByITAdmin(userId: string) {
  return useQuery({
    queryKey: batchKeys.byITAdmin(userId),
    queryFn: async () => {
      // API handles role-based scoping automatically
      const response = await batchesApi.list({ limit: 1000 });
      return response.data;
    },
    enabled: !!userId,
    staleTime: 30000,
  });
}

/**
 * Fetch pickup approval queue for Org Admin
 */
export function usePickupApprovalQueue(enterpriseId: string) {
  return useQuery({
    queryKey: batchKeys.approvalQueue(enterpriseId),
    queryFn: async () => {
      const response = await batchesApi.pendingApproval({ limit: 100 });
      return response.data;
    },
    enabled: !!enterpriseId,
    staleTime: 10000, // Refresh more frequently for approvals
  });
}

/**
 * Fetch batches pending approval (for Org Admin)
 */
export function usePendingApprovalBatches() {
  return useQuery({
    queryKey: batchKeys.pendingApproval(),
    queryFn: async () => {
      const response = await batchesApi.pendingApproval({ limit: 100 });
      return response.data;
    },
    staleTime: 10000,
  });
}

// ============================================
// MUTATIONS
// ============================================

export interface CreateBatchInput {
  enterprise_id: string;
  branch_id?: string;
  name: string;
  created_by?: string;
  description?: string;
  estimated_value?: number;
  status?: string;
}

/**
 * Create a new batch
 */
export function useCreateBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (batch: CreateBatchInput) => {
      const apiData: BatchCreateRequest = {
        name: batch.name,
        description: batch.description,
        enterprise_id: batch.enterprise_id,
        branch_id: batch.branch_id,
      };
      const response = await batchesApi.create(apiData);
      if (!response.success) throw new Error(response.error?.message || 'Failed to create batch');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: batchKeys.all });
    },
  });
}

/**
 * Update a batch
 */
export function useUpdateBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ batchId, updates }: { batchId: string; updates: Partial<CreateBatchInput> }) => {
      const apiData: BatchUpdateRequest = {
        name: updates.name,
        description: updates.description,
      };
      const response = await batchesApi.update(batchId, apiData);
      if (!response.success) throw new Error(response.error?.message || 'Failed to update batch');
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(batchKeys.detail(variables.batchId), data);
      queryClient.invalidateQueries({ queryKey: batchKeys.all });
    },
  });
}

/**
 * Delete a batch
 */
export function useDeleteBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ batchId, deleteAssets, deleteSubUsers }: {
      batchId: string;
      deleteAssets?: boolean;
      deleteSubUsers?: boolean;
    }) => {
      await batchesApi.delete(batchId, { deleteAssets, deleteSubUsers });
    },
    onSuccess: (_, { batchId }) => {
      queryClient.removeQueries({ queryKey: batchKeys.detail(batchId) });
      queryClient.invalidateQueries({ queryKey: batchKeys.all });
    },
  });
}

export interface SubmitForApprovalInput {
  batchId: string;
  pickupDetails: {
    preferred_pickup_date: string;
    preferred_pickup_slot: string;
    pickup_priority?: string;
    it_admin_notes?: string;
    logistics_instructions?: string;
    pickup_location_override?: string;
  };
}

/**
 * Submit batch for Org Admin approval
 */
export function useSubmitBatchForApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ batchId, pickupDetails }: SubmitForApprovalInput) => {
      const response = await batchesApi.submitForApproval(batchId, {
        preferred_pickup_date: pickupDetails.preferred_pickup_date,
        preferred_pickup_slot: pickupDetails.preferred_pickup_slot,
        pickup_priority: pickupDetails.pickup_priority,
        it_admin_notes: pickupDetails.it_admin_notes,
        logistics_instructions: pickupDetails.logistics_instructions,
      });
      if (!response.success) throw new Error(response.error?.message || 'Failed to submit batch for approval');
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(batchKeys.detail(variables.batchId), data);
      queryClient.invalidateQueries({ queryKey: batchKeys.lists() });
      queryClient.invalidateQueries({ queryKey: batchKeys.all });
    },
  });
}

export interface ApproveBatchInput {
  batchId: string;
  approvedBy: string;
  notes?: string;
}

/**
 * Approve batch (Org Admin)
 */
export function useApproveBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ batchId, notes }: ApproveBatchInput) => {
      const response = await batchesApi.approve(batchId, notes);
      if (!response.success) throw new Error(response.error?.message || 'Failed to approve batch');
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(batchKeys.detail(variables.batchId), data);
      queryClient.invalidateQueries({ queryKey: batchKeys.lists() });
      queryClient.invalidateQueries({ queryKey: batchKeys.all });
      queryClient.invalidateQueries({ queryKey: ['pickups'] });
    },
  });
}

export interface ApproveBatchWithPricesInput {
  batchId: string;
  orgAdminId: string;
  prices: Array<{ assetId: string; price: number }>;
  notes?: string;
}

/**
 * Approve batch with optional per-asset pricing (Org Admin)
 * Updates asset base_price for any assets with prices, then approves batch
 * Also auto-creates a pickup request
 */
export function useApproveBatchWithPrices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ batchId, prices, notes }: ApproveBatchWithPricesInput) => {
      // First update asset prices if any
      if (prices.length > 0) {
        await Promise.all(
          prices.map(p => assetsApi.update(p.assetId, { base_price: p.price }))
        );
      }
      // Then approve the batch
      const response = await batchesApi.approve(batchId, notes);
      if (!response.success) throw new Error(response.error?.message || 'Failed to approve batch with prices');
      return { batch: response.data, pickupRequest: null };
    },
    onSuccess: (result, variables) => {
      queryClient.setQueryData(batchKeys.detail(variables.batchId), result.batch);
      queryClient.invalidateQueries({ queryKey: batchKeys.lists() });
      queryClient.invalidateQueries({ queryKey: batchKeys.all });
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
      queryClient.invalidateQueries({ queryKey: ['pickups'] });
    },
  });
}

export interface RejectBatchInput {
  batchId: string;
  rejectedBy: string;
  reason: string;
}

/**
 * Reject batch (Org Admin)
 */
export function useRejectBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ batchId, reason }: RejectBatchInput) => {
      const response = await batchesApi.reject(batchId, reason);
      if (!response.success) throw new Error(response.error?.message || 'Failed to reject batch');
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(batchKeys.detail(variables.batchId), data);
      queryClient.invalidateQueries({ queryKey: batchKeys.lists() });
      queryClient.invalidateQueries({ queryKey: batchKeys.all });
    },
  });
}

/**
 * Add asset to batch
 */
export function useAddAssetToBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assetId, batchId }: { assetId: string; batchId: string }) => {
      const response = await batchesApi.addAssets(batchId, [assetId]);
      if (!response.success) throw new Error(response.error?.message || 'Failed to add asset to batch');
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: batchKeys.detail(variables.batchId) });
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
    },
  });
}

/**
 * Remove asset from batch
 */
export function useRemoveAssetFromBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assetId, batchId }: { assetId: string; batchId: string }) => {
      const response = await batchesApi.removeAssets(batchId, [assetId]);
      if (!response.success) throw new Error(response.error?.message || 'Failed to remove asset from batch');
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: batchKeys.detail(variables.batchId) });
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
    },
  });
}

// Type exports for consumers
export type { BatchResponse };
