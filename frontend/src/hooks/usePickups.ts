/**
 * usePickups - React Query hook replacing pickupStore
 * Handles pickup requests and logistics coordination
 *
 * MIGRATED: Now uses REST API instead of direct Supabase calls
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  pickupsApi,
  pickupLocationsApi,
  type PickupResponse,
  type PickupCreateRequest,
  type PickupUpdateRequest,
  type PickupLocationResponse,
  type PickupLocationCreateRequest,
  type PickupLocationUpdateRequest,
} from '@/lib/api/pickups';
import { assetKeys } from './useAssets';
import { batchKeys } from './useBatches';

// Query keys for cache management
export const pickupKeys = {
  all: ['pickups'] as const,
  lists: () => [...pickupKeys.all, 'list'] as const,
  list: (enterpriseId: string) => [...pickupKeys.lists(), enterpriseId] as const,
  details: () => [...pickupKeys.all, 'detail'] as const,
  detail: (id: string) => [...pickupKeys.details(), id] as const,
  pendingAssignment: () => [...pickupKeys.all, 'pending-assignment'] as const,
  myAssignments: () => [...pickupKeys.all, 'my-assignments'] as const,
  byStatus: (status: string) => [...pickupKeys.all, 'status', status] as const,
  byITAdmin: (userId: string) => [...pickupKeys.all, 'it-admin', userId] as const,
};

// ============================================
// QUERIES
// ============================================

/**
 * Fetch all pickup requests (for OPS Admin - uses API with role-based filtering)
 */
export function useAllPickupRequests() {
  return useQuery({
    queryKey: pickupKeys.all,
    queryFn: async () => {
      const response = await pickupsApi.list({ pageSize: 100 });
      return response.data;
    },
    staleTime: 10000, // Refresh frequently for ops
  });
}

/**
 * Fetch all pickup requests for an enterprise
 */
export function usePickupRequests(enterpriseId: string) {
  return useQuery({
    queryKey: pickupKeys.list(enterpriseId),
    queryFn: async () => {
      const response = await pickupsApi.list({ pageSize: 100 });
      // Filter by enterprise if needed (API handles role-based scoping)
      return response.data;
    },
    enabled: !!enterpriseId,
    staleTime: 30000,
  });
}

/**
 * Fetch single pickup request by ID
 */
export function usePickupRequest(requestId: string) {
  return useQuery({
    queryKey: pickupKeys.detail(requestId),
    queryFn: async () => {
      const response = await pickupsApi.get(requestId);
      return response.data;
    },
    enabled: !!requestId,
  });
}

/**
 * Fetch pending pickup requests (for assignment by OPS Admin)
 */
export function usePendingPickups() {
  return useQuery({
    queryKey: pickupKeys.pendingAssignment(),
    queryFn: async () => {
      const response = await pickupsApi.listPendingAssignment({ pageSize: 100 });
      return response.data;
    },
    staleTime: 10000,
  });
}

/**
 * Fetch pickups assigned to current user (logistics admin/user)
 */
export function useMyAssignments() {
  return useQuery({
    queryKey: pickupKeys.myAssignments(),
    queryFn: async () => {
      const response = await pickupsApi.listMyAssignments({ pageSize: 100 });
      return response.data;
    },
    staleTime: 30000,
  });
}

/**
 * Fetch pickup requests for IT Admin (across all their assigned branches)
 * V3.2: IT Admin can manage multiple branches
 */
export function usePickupsByITAdmin(userId: string) {
  return useQuery({
    queryKey: pickupKeys.byITAdmin(userId),
    queryFn: async () => {
      // Use general list - API handles role-based scoping
      const response = await pickupsApi.list({ pageSize: 100 });
      return response.data;
    },
    enabled: !!userId,
    staleTime: 30000,
  });
}

// ============================================
// MUTATIONS
// ============================================

export interface CreatePickupRequestInput {
  enterprise_id?: string;
  batch_id?: string;
  branch_id: string; // V3.2: Use branch_id instead of location_id
  asset_ids: string[];
  preferred_date?: string;
  preferred_time_slot: string;
  priority?: string;
  notes?: string;
  created_by?: string;
}

/**
 * Create a new pickup request
 */
export function useCreatePickupRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreatePickupRequestInput) => {
      const apiData: PickupCreateRequest = {
        enterprise_id: request.enterprise_id,
        batch_id: request.batch_id,
        location_id: request.branch_id, // Map branch_id to location_id
        asset_ids: request.asset_ids,
        preferred_date: request.preferred_date,
        preferred_time_slot: request.preferred_time_slot,
        special_instructions: request.notes,
      };
      const response = await pickupsApi.create(apiData);
      return response.data;
    },
    onSuccess: async (data) => {
      // Force refetch to ensure asset status updates are reflected immediately
      await Promise.all([
        queryClient.refetchQueries({ queryKey: pickupKeys.all }),
        queryClient.refetchQueries({ queryKey: assetKeys.all }),
        queryClient.refetchQueries({ queryKey: batchKeys.all }),
      ]);
    },
  });
}

/**
 * Update a pickup request
 */
export function useUpdatePickupRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, updates }: { requestId: string; updates: Partial<CreatePickupRequestInput> }) => {
      const apiData: PickupUpdateRequest = {
        location_id: updates.branch_id,
        preferred_date: updates.preferred_date,
        preferred_time_slot: updates.preferred_time_slot,
        special_instructions: updates.notes,
      };
      const response = await pickupsApi.update(requestId, apiData);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(pickupKeys.detail(variables.requestId), data);
      queryClient.invalidateQueries({ queryKey: pickupKeys.lists() });
    },
  });
}

/**
 * Assign pickup to Logistics Admin (Tier 1)
 * OPS Admin -> Logistics Admin
 */
export function useAssignToLogisticsAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, logisticsAdminId }: { requestId: string; logisticsAdminId: string }) => {
      const response = await pickupsApi.assignToLogisticsAdmin(requestId, logisticsAdminId);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(pickupKeys.detail(variables.requestId), data);
      queryClient.invalidateQueries({ queryKey: pickupKeys.all });
    },
  });
}

/**
 * Assign pickup to Logistics User (Tier 2)
 * Logistics Admin -> Logistics User (driver)
 */
export function useAssignToLogisticsUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, logisticsUserId, scheduledDate }: {
      requestId: string;
      logisticsUserId: string;
      scheduledDate?: string;
    }) => {
      const response = await pickupsApi.assignToLogisticsUser(requestId, logisticsUserId, scheduledDate);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(pickupKeys.detail(variables.requestId), data);
      queryClient.invalidateQueries({ queryKey: pickupKeys.all });
      queryClient.invalidateQueries({ queryKey: ['logistics'] });
    },
  });
}

/**
 * Start a pickup (Logistics User action)
 */
export function useStartPickup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const response = await pickupsApi.start(requestId);
      return response.data;
    },
    onSuccess: async (data, requestId) => {
      queryClient.setQueryData(pickupKeys.detail(requestId), data);
      await Promise.all([
        queryClient.refetchQueries({ queryKey: pickupKeys.all }),
        queryClient.refetchQueries({ queryKey: ['logistics'] }),
      ]);
    },
  });
}

/**
 * Complete pickup (mark as picked up)
 * Also transitions all pickup assets through the backend
 */
export function useCompletePickup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, notes }: { requestId: string; notes?: string }) => {
      const response = await pickupsApi.complete(requestId, { notes });
      return response.data;
    },
    onSuccess: async (_, variables) => {
      // Force immediate refetch of all pickup-related queries
      await Promise.all([
        queryClient.refetchQueries({ queryKey: pickupKeys.detail(variables.requestId) }),
        queryClient.refetchQueries({ queryKey: pickupKeys.all }),
        queryClient.refetchQueries({ queryKey: ['logistics'] }),
        queryClient.refetchQueries({ queryKey: assetKeys.all }),
      ]);
    },
  });
}

/**
 * Cancel pickup request
 */
export function useCancelPickup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      const response = await pickupsApi.cancel(requestId, reason);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: pickupKeys.detail(variables.requestId) });
      queryClient.invalidateQueries({ queryKey: pickupKeys.all });
    },
  });
}

/**
 * Update pickup status (generic status update)
 * @deprecated Use specific action hooks (useStartPickup, useCompletePickup, useCancelPickup) instead
 */
export function useUpdatePickupStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, status, notes }: {
      requestId: string;
      status: string;
      notes?: string;
    }) => {
      // Map status to appropriate API call
      if (status === 'completed') {
        const response = await pickupsApi.complete(requestId, { notes });
        return response.data;
      }
      if (status === 'cancelled') {
        const response = await pickupsApi.cancel(requestId, notes || 'Cancelled');
        return response.data;
      }
      if (status === 'in_progress') {
        const response = await pickupsApi.start(requestId);
        return response.data;
      }
      // For other statuses, use update
      const response = await pickupsApi.update(requestId, {});
      return response.data;
    },
    onSuccess: async (data, variables) => {
      queryClient.setQueryData(pickupKeys.detail(variables.requestId), data);
      await Promise.all([
        queryClient.refetchQueries({ queryKey: pickupKeys.all }),
        queryClient.refetchQueries({ queryKey: pickupKeys.byStatus(variables.status) }),
        queryClient.refetchQueries({ queryKey: ['logistics'] }),
        queryClient.refetchQueries({ queryKey: assetKeys.all }),
      ]);
    },
  });
}

// ============================================
// PICKUP LOCATIONS (Migrated to REST API)
// ============================================

/**
 * Fetch pickup locations for an enterprise
 */
export function usePickupLocations(enterpriseId: string) {
  return useQuery({
    queryKey: [...pickupKeys.all, 'locations', enterpriseId],
    queryFn: async () => {
      const response = await pickupLocationsApi.list(enterpriseId);
      return response.data?.locations ?? [];
    },
    enabled: !!enterpriseId,
    staleTime: 60000,
  });
}

/**
 * Create a new pickup location
 */
export function useCreatePickupLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (location: {
      enterprise_id: string;
      name: string;
      address: string;
      city?: string;
      state?: string;
      pin_code?: string;
      contact_person?: string;
      contact_phone?: string;
      operating_hours?: string;
      special_instructions?: string;
      is_default?: boolean;
    }) => {
      const response = await pickupLocationsApi.create(location);
      return response.data;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: [...pickupKeys.all, 'locations', data.enterprise_id] });
      }
    },
  });
}

/**
 * Update a pickup location
 */
export function useUpdatePickupLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ locationId, updates }: { locationId: string; updates: PickupLocationUpdateRequest }) => {
      const response = await pickupLocationsApi.update(locationId, updates);
      return response.data;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: [...pickupKeys.all, 'locations', data.enterprise_id] });
      }
    },
  });
}

/**
 * Delete a pickup location
 */
export function useDeletePickupLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ locationId, enterpriseId }: { locationId: string; enterpriseId: string }) => {
      await pickupLocationsApi.delete(locationId);
      return { locationId, enterpriseId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...pickupKeys.all, 'locations', data.enterpriseId] });
    },
  });
}

/**
 * Set a pickup location as default
 */
export function useSetDefaultPickupLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ locationId, enterpriseId }: { locationId: string; enterpriseId: string }) => {
      const response = await pickupLocationsApi.setDefault(locationId);
      return { ...response.data, enterpriseId };
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: [...pickupKeys.all, 'locations', data.enterpriseId] });
      }
    },
  });
}

// Re-export for backward compatibility
export { pickupKeys as pickupQueryKeys };

// Type exports for consumers
export type {
  PickupResponse,
  PickupCreateRequest,
  PickupLocationResponse,
  PickupLocationCreateRequest,
  PickupLocationUpdateRequest,
};
