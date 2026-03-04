/**
 * useEnterprises - React Query hook for enterprises
 * Used by OPS Admin to view and manage all enterprises
 */

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchEnterprises,
  fetchEnterpriseById,
} from '@/lib/db/api-queries';
import { enterprisesApi } from '@/lib/api';

// Query keys for cache management
export const enterpriseKeys = {
  all: ['enterprises'] as const,
  lists: () => [...enterpriseKeys.all, 'list'] as const,
  infinite: (params: Record<string, unknown>) => [...enterpriseKeys.all, 'infinite', params] as const,
  details: () => [...enterpriseKeys.all, 'detail'] as const,
  detail: (id: string) => [...enterpriseKeys.details(), id] as const,
};

// ============================================
// QUERIES
// ============================================

/**
 * Fetch all enterprises (for OPS Admin)
 */
export function useEnterprises() {
  return useQuery({
    queryKey: enterpriseKeys.lists(),
    queryFn: () => fetchEnterprises(),
    staleTime: 30000,
  });
}

/**
 * Fetch enterprises with infinite scroll (server-side pagination)
 */
export function useInfiniteEnterprises(params: Record<string, string | undefined> = {}) {
  return useInfiniteQuery({
    queryKey: enterpriseKeys.infinite(params as Record<string, unknown>),
    queryFn: async ({ pageParam = 0 }) => {
      const res = await enterprisesApi.list({ ...params, skip: pageParam as number, limit: 25 });
      return res;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((sum, p) => sum + (p.data?.length || 0), 0);
      const total = lastPage.pagination?.total ?? 0;
      if (totalFetched < total) return totalFetched;
      return undefined;
    },
    staleTime: 30000,
  });
}

/**
 * Fetch single enterprise by ID
 */
export function useEnterprise(enterpriseId: string) {
  return useQuery({
    queryKey: enterpriseKeys.detail(enterpriseId),
    queryFn: () => fetchEnterpriseById(enterpriseId),
    enabled: !!enterpriseId,
  });
}

// ============================================
// MUTATIONS
// ============================================

export interface UpdateEnterpriseInput {
  name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  status?: 'active' | 'inactive' | 'suspended';
}

/**
 * Update an enterprise
 */
export function useUpdateEnterprise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ enterpriseId, updates }: { enterpriseId: string; updates: UpdateEnterpriseInput }) => {
      const response = await enterprisesApi.update(enterpriseId, updates as any);
      if (!response.success) throw new Error(response.error?.message || 'Failed to update enterprise');
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(enterpriseKeys.detail(variables.enterpriseId), data);
      queryClient.invalidateQueries({ queryKey: enterpriseKeys.all });
    },
  });
}

/**
 * Update enterprise status
 */
export function useUpdateEnterpriseStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ enterpriseId, status }: { enterpriseId: string; status: string }) => {
      const response = await enterprisesApi.update(enterpriseId, { status: status as any });
      if (!response.success) throw new Error(response.error?.message || 'Failed to update enterprise status');
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(enterpriseKeys.detail(variables.enterpriseId), data);
      queryClient.invalidateQueries({ queryKey: enterpriseKeys.all });
    },
  });
}
