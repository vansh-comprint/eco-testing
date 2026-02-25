/**
 * useReviews - React Query hooks for review endpoints
 * Covers Remote Reviews, Facility QC, and On-Site QC
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  reviewsApi,
  type OnSiteQCCreateRequest,
  type OnSiteQCResponse,
} from '@/lib/api/reviews';
import { pickupKeys } from './usePickups';
import { assetKeys } from './useAssets';

export const reviewKeys = {
  all: ['reviews'] as const,
  onsite: () => [...reviewKeys.all, 'onsite'] as const,
  onsiteByPickup: (pickupId: string) => [...reviewKeys.onsite(), 'by-pickup', pickupId] as const,
  onsiteDetail: (id: string) => [...reviewKeys.onsite(), 'detail', id] as const,
};

/**
 * Fetch on-site QC records for a specific pickup request
 */
export function useOnsiteQCByPickup(pickupRequestId: string) {
  return useQuery({
    queryKey: reviewKeys.onsiteByPickup(pickupRequestId),
    queryFn: async () => {
      const response = await reviewsApi.getOnsiteByPickup(pickupRequestId);
      return response.data ?? [];
    },
    enabled: !!pickupRequestId,
    staleTime: 30000,
  });
}

/**
 * Create an on-site QC record for an asset during pickup
 */
export function useCreateOnSiteQC() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: OnSiteQCCreateRequest) => {
      const response = await reviewsApi.createOnsite(data);
      if (!response.success) throw new Error(response.error?.message || 'Failed to create on-site QC');
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.onsiteByPickup(variables.pickup_request_id) });
      queryClient.invalidateQueries({ queryKey: reviewKeys.onsite() });
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
      queryClient.invalidateQueries({ queryKey: pickupKeys.detail(variables.pickup_request_id) });
    },
  });
}

export type { OnSiteQCCreateRequest, OnSiteQCResponse };
