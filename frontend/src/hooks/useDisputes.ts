/**
 * React Query Hooks for Disputes
 * Handles dispute CRUD operations via REST API
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { disputesApi, type DisputeResponse, type DisputeListParams } from '@/lib/api/disputes';

// Query keys
export const disputeKeys = {
  all: ['disputes'] as const,
  lists: () => [...disputeKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...disputeKeys.lists(), filters] as const,
  infinite: (params: Record<string, unknown>) => [...disputeKeys.all, 'infinite', params] as const,
  details: () => [...disputeKeys.all, 'detail'] as const,
  detail: (id: string) => [...disputeKeys.details(), id] as const,
  byAsset: (assetId: string) => [...disputeKeys.all, 'byAsset', assetId] as const,
  byEnterprise: (enterpriseId: string) => [...disputeKeys.all, 'byEnterprise', enterpriseId] as const,
};

// Types
export interface Dispute {
  id: string;
  asset_id: string;
  raised_by: string;
  reason: string;
  description?: string;
  evidence?: string[];
  status: string;
  type: string;
  resolution?: 'upheld' | 'overturned' | 'partial';
  resolved_by?: string;
  resolver_notes?: string;
  resolved_at?: string;
  created_at: string;
  // Joined data
  assets?: {
    id: string;
    brand: string;
    model: string;
    serial_number: string;
    status: string;
    enterprise_id: string;
    qc_report?: Record<string, unknown>;
  };
  raised_by_user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  resolved_by_user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateDisputeInput {
  asset_id: string;
  raised_by: string;
  reason: string;
  description?: string;
  evidence?: string[];
}

export interface ResolveDisputeInput {
  disputeId: string;
  resolution: 'upheld' | 'overturned' | 'partial';
  resolved_by: string;
  resolver_notes?: string;
}

// Fetch all disputes
export function useAllDisputes() {
  return useQuery({
    queryKey: disputeKeys.lists(),
    queryFn: async () => {
      const result = await disputesApi.list({ page_size: 100 });
      if (!result.success) throw new Error(result.error?.message || 'Failed to fetch disputes');
      return (result.data || []).map(mapDisputeResponse);
    },
  });
}

// Map API response to local Dispute type
function mapDisputeResponse(d: DisputeResponse): Dispute {
  return {
    id: d.id,
    asset_id: d.asset_id,
    raised_by: d.raised_by_user_id,
    reason: d.dispute_type,
    description: d.description,
    evidence: d.evidence_urls,
    status: d.status,
    type: d.dispute_type,
    resolution: d.resolution as Dispute['resolution'],
    resolved_by: d.resolved_by_user_id,
    resolved_at: d.resolved_at,
    created_at: d.created_at,
  };
}

// Infinite scroll hook - loads disputes page by page
export function useInfiniteDisputes(params: Omit<DisputeListParams, 'page' | 'page_size'> = {}) {
  return useInfiniteQuery({
    queryKey: disputeKeys.infinite(params as Record<string, unknown>),
    queryFn: async ({ pageParam = 1 }) => {
      const res = await disputesApi.list({ ...params, page: pageParam as number, page_size: 5 });
      if (!res.success) throw new Error(res.error?.message || 'Failed to fetch disputes');
      return { data: (res.data || []).map(mapDisputeResponse), pagination: res.pagination };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((sum, p) => sum + (p.data?.length || 0), 0);
      const total = lastPage.pagination?.total ?? 0;
      if (totalFetched < total) return (lastPage.pagination?.page ?? 0) + 1;
      return undefined;
    },
    staleTime: 30000,
  });
}

// Fetch disputes by enterprise
export function useDisputesByEnterprise(enterpriseId: string) {
  return useQuery({
    queryKey: disputeKeys.byEnterprise(enterpriseId),
    queryFn: async () => {
      // Fetch all disputes and filter by enterprise's assets
      const result = await disputesApi.list({ page_size: 100 });
      if (!result.success) throw new Error(result.error?.message || 'Failed to fetch disputes');

      // Note: Server-side filtering by enterprise would be better
      // For now, return all disputes - the page can filter client-side if needed
      return (result.data || []).map(mapDisputeResponse);
    },
    enabled: !!enterpriseId,
  });
}

// Fetch single dispute by ID
export function useDispute(disputeId: string) {
  return useQuery({
    queryKey: disputeKeys.detail(disputeId),
    queryFn: async () => {
      const result = await disputesApi.get(disputeId);
      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Dispute not found');
      }
      return mapDisputeResponse(result.data);
    },
    enabled: !!disputeId,
  });
}

// Fetch dispute by asset ID
export function useDisputeByAsset(assetId: string) {
  return useQuery({
    queryKey: disputeKeys.byAsset(assetId),
    queryFn: async () => {
      // Fetch all disputes and filter by asset_id client-side
      // Note: A dedicated API endpoint would be better
      const result = await disputesApi.list({ page_size: 100 });
      if (!result.success) throw new Error(result.error?.message || 'Failed to fetch disputes');
      const dispute = result.data?.find(d => d.asset_id === assetId);
      return dispute ? mapDisputeResponse(dispute) : null;
    },
    enabled: !!assetId,
  });
}

// Create dispute mutation
export function useCreateDispute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateDisputeInput) => {
      const result = await disputesApi.create({
        asset_id: input.asset_id,
        dispute_type: input.reason,
        description: input.description || '',
        evidence_urls: input.evidence,
      });

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Failed to create dispute');
      }

      return mapDisputeResponse(result.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: disputeKeys.all });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-badges'] });
    },
  });
}

// Resolve dispute mutation
export function useResolveDispute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ResolveDisputeInput) => {
      const result = await disputesApi.resolve(input.disputeId, input.resolution);

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to resolve dispute');
      }

      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: disputeKeys.all });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-badges'] });
    },
  });
}

// Pending disputes (unresolved)
export function usePendingDisputes() {
  return useQuery({
    queryKey: [...disputeKeys.lists(), { status: 'pending' }],
    queryFn: async () => {
      const result = await disputesApi.list({ status: 'pending', page_size: 100 });
      if (!result.success) throw new Error(result.error?.message || 'Failed to fetch pending disputes');
      return (result.data || []).map(mapDisputeResponse);
    },
  });
}
