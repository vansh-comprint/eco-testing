/**
 * React Query Hooks for EPR Certificates
 * Uses REST API client (migrated from Supabase direct calls)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  eprCertificatesApi,
  type EPRCertificateResponse,
  type EPRCertificateCreateRequest,
  type EPRCertificateUpdateRequest,
  type EPRWeightTotals,
} from '@/lib/api/epr';

// Query keys for cache management
export const eprKeys = {
  all: ['epr-certificates'] as const,
  lists: () => [...eprKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...eprKeys.lists(), filters] as const,
  details: () => [...eprKeys.all, 'detail'] as const,
  detail: (id: string) => [...eprKeys.details(), id] as const,
  weightTotals: (enterpriseId: string) => [...eprKeys.all, 'weight-totals', enterpriseId] as const,
};

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Fetch EPR certificates (auto-scoped by backend based on user role)
 */
export function useEPRCertificates(params: { status?: string; search?: string } = {}) {
  return useQuery({
    queryKey: eprKeys.list(params),
    queryFn: async () => {
      const response = await eprCertificatesApi.list({
        ...params,
        limit: 1000,
      });
      return response.data ?? [];
    },
    staleTime: 30000,
  });
}

/**
 * Fetch single EPR certificate by ID
 */
export function useEPRCertificate(certificateId: string) {
  return useQuery({
    queryKey: eprKeys.detail(certificateId),
    queryFn: async () => {
      const response = await eprCertificatesApi.get(certificateId);
      return response.data;
    },
    enabled: !!certificateId,
  });
}

/**
 * Fetch weight totals for the current enterprise
 */
export function useEPRWeightTotals(enterpriseId: string) {
  return useQuery({
    queryKey: eprKeys.weightTotals(enterpriseId),
    queryFn: async () => {
      const response = await eprCertificatesApi.weightTotals(enterpriseId);
      return response.data;
    },
    enabled: !!enterpriseId,
    staleTime: 30000,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create EPR certificate
 */
export function useCreateEPRCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: EPRCertificateCreateRequest) => {
      const response = await eprCertificatesApi.create(input);
      if (!response.success) throw new Error(response.error?.message || 'Failed to create EPR certificate');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eprKeys.all });
    },
  });
}

/**
 * Update EPR certificate
 */
export function useUpdateEPRCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ certificateId, input }: { certificateId: string; input: EPRCertificateUpdateRequest }) => {
      const response = await eprCertificatesApi.update(certificateId, input);
      if (!response.success) throw new Error(response.error?.message || 'Failed to update EPR certificate');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eprKeys.all });
    },
  });
}

/**
 * Delete EPR certificate
 */
export function useDeleteEPRCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (certificateId: string) => {
      const response = await eprCertificatesApi.delete(certificateId);
      if (!response.success) throw new Error(response.error?.message || 'Failed to delete EPR certificate');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eprKeys.all });
    },
  });
}

// ============================================================================
// UTILITY CONSTANTS
// ============================================================================

export const EPR_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  issued: 'Issued',
  expired: 'Expired',
  revoked: 'Revoked',
};

export const EPR_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400',
  issued: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400',
  expired: 'bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-400',
  revoked: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400',
};

// Type re-exports for consumers
export type { EPRCertificateResponse, EPRCertificateCreateRequest, EPRCertificateUpdateRequest, EPRWeightTotals };
