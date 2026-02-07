/**
 * useAssets - React Query hook replacing assetStore
 * All asset data fetching and mutations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAssets,
  fetchAllAssets,
  fetchAssetById,
  fetchAssetsByBranch,
  fetchAssetsByBatch,
  fetchAssetsByITAdmin,
  fetchSelfAssignedAssets,
  fetchPendingSelfEvaluations,
  createAsset,
  updateAsset,
  deleteAsset,
  assignAssetToSubUser,
  assignAssetToSelf,
  unassignAsset,
  updateAssetStatus,
  bulkCreateAssets,
} from '@/lib/db/api-queries';

// Query keys for cache management
export const assetKeys = {
  all: ['assets'] as const,
  lists: () => [...assetKeys.all, 'list'] as const,
  list: (enterpriseId: string) => [...assetKeys.lists(), enterpriseId] as const,
  byBranch: (branchId: string) => [...assetKeys.all, 'branch', branchId] as const,
  byBatch: (batchId: string) => [...assetKeys.all, 'batch', batchId] as const,
  byITAdmin: (userId: string) => [...assetKeys.all, 'it-admin', userId] as const,
  selfAssigned: (userId: string) => [...assetKeys.all, 'self-assigned', userId] as const,
  pendingEvaluations: (userId: string) => [...assetKeys.all, 'pending-evaluations', userId] as const,
  details: () => [...assetKeys.all, 'detail'] as const,
  detail: (id: string) => [...assetKeys.details(), id] as const,
};

// ============================================
// QUERIES
// ============================================

/**
 * Fetch all assets for an enterprise
 */
export function useAssets(enterpriseId: string) {
  return useQuery({
    queryKey: assetKeys.list(enterpriseId),
    queryFn: () => fetchAssets(enterpriseId),
    enabled: !!enterpriseId,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Fetch all assets (OPS admin view - no enterprise filter)
 */
export function useAllAssets() {
  return useQuery({
    queryKey: assetKeys.all,
    queryFn: () => fetchAllAssets(),
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Fetch single asset by ID
 */
export function useAsset(assetId: string) {
  return useQuery({
    queryKey: assetKeys.detail(assetId),
    queryFn: () => fetchAssetById(assetId),
    enabled: !!assetId,
  });
}

/**
 * Fetch assets by branch
 */
export function useAssetsByBranch(branchId: string) {
  return useQuery({
    queryKey: assetKeys.byBranch(branchId),
    queryFn: () => fetchAssetsByBranch(branchId),
    enabled: !!branchId,
  });
}

/**
 * Fetch assets by batch
 */
export function useAssetsByBatch(batchId: string) {
  return useQuery({
    queryKey: assetKeys.byBatch(batchId),
    queryFn: () => fetchAssetsByBatch(batchId),
    enabled: !!batchId,
  });
}

/**
 * Fetch assets for IT Admin (across all their assigned branches)
 * V3.2: IT Admin can manage multiple branches
 */
export function useAssetsByITAdmin(userId: string) {
  return useQuery({
    queryKey: assetKeys.byITAdmin(userId),
    queryFn: () => fetchAssetsByITAdmin(userId),
    enabled: !!userId,
    staleTime: 30000,
  });
}

/**
 * Fetch all self-assigned assets for an admin user
 * Used to show full history of self-evaluations
 */
export function useSelfAssignedAssets(userId: string) {
  return useQuery({
    queryKey: assetKeys.selfAssigned(userId),
    queryFn: () => fetchSelfAssignedAssets(userId),
    enabled: !!userId,
    staleTime: 30000,
  });
}

/**
 * Fetch pending self-evaluations for an admin user
 * Only returns assets that need evaluation (assigned but not yet submitted)
 */
export function usePendingSelfEvaluations(userId: string) {
  return useQuery({
    queryKey: assetKeys.pendingEvaluations(userId),
    queryFn: () => fetchPendingSelfEvaluations(userId),
    enabled: !!userId,
    staleTime: 10000, // Refresh more frequently for pending items
  });
}

// ============================================
// MUTATIONS
// ============================================

export interface CreateAssetInput {
  enterprise_id: string;
  branch_id?: string;
  batch_id?: string;
  it_admin_id?: string;
  serial_number: string;
  brand: string;
  model: string;
  asset_tag?: string;
  device_type?: string;  // V3.2: Made optional, defaults in database
  specs?: Record<string, unknown>;
  purchase_date?: string;
  assigned_to_user_id?: string;
  status?: string;
  grade?: string;
  condition_grade?: string;
  // CSV bulk upload: user assignment fields (used by UploadAssets to create sub-users)
  assigned_email?: string;
  assigned_name?: string;
  assigned_department?: string;
}

/**
 * Create a new asset
 */
export function useCreateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (asset: CreateAssetInput) => createAsset(asset),
    onSuccess: () => {
      // Invalidate all asset queries (lists, byBatch, byBranch, byITAdmin, etc.)
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
    },
  });
}

/**
 * Update an asset
 */
export function useUpdateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assetId, updates }: { assetId: string; updates: Partial<CreateAssetInput> }) =>
      updateAsset(assetId, updates),
    onSuccess: (data, variables) => {
      // Update the specific asset in cache
      queryClient.setQueryData(assetKeys.detail(variables.assetId), data);
      // Invalidate all asset queries (lists, byBranch, byITAdmin, etc.)
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
    },
  });
}

/**
 * Delete an asset
 */
export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assetId: string) => deleteAsset(assetId),
    onSuccess: (_, assetId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: assetKeys.detail(assetId) });
      // Invalidate all asset queries (lists, byBranch, byITAdmin, etc.)
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
    },
  });
}

/**
 * Assign asset to sub-user
 */
export function useAssignAssetToSubUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assetId, subUserId }: { assetId: string; subUserId: string }) =>
      assignAssetToSubUser(assetId, subUserId),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(assetKeys.detail(variables.assetId), data);
      // Invalidate all asset queries (lists, byBranch, byITAdmin, etc.)
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
    },
  });
}

/**
 * Assign asset to self (IT Admin/Org Admin for self-evaluation)
 */
export function useAssignAssetToSelf() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assetId, userId }: { assetId: string; userId: string }) =>
      assignAssetToSelf(assetId, userId),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(assetKeys.detail(variables.assetId), data);
      // Invalidate all asset queries including self-assigned
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
    },
  });
}

/**
 * Unassign asset from sub-user
 */
export function useUnassignAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assetId: string) => unassignAsset(assetId),
    onSuccess: (data, assetId) => {
      queryClient.setQueryData(assetKeys.detail(assetId), data);
      // Invalidate all asset queries (lists, byBranch, byITAdmin, etc.)
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
    },
  });
}

/**
 * Update asset status
 */
export function useUpdateAssetStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assetId, status }: { assetId: string; status: string }) =>
      updateAssetStatus(assetId, status),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(assetKeys.detail(variables.assetId), data);
      // Invalidate all asset queries (lists, byBranch, byITAdmin, etc.)
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
    },
  });
}

/**
 * Bulk create assets
 */
export function useBulkCreateAssets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assets: CreateAssetInput[]) => bulkCreateAssets(assets as unknown as Record<string, unknown>[]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
    },
  });
}
