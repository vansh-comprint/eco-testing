/**
 * useSubUsers - React Query hook replacing subUserStore
 * Sub-users are enterprise employees who submit their devices
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import {
  subUsersApi,
  type SubUserResponse,
  type SubUserBulkItem,
  type SubUserCreateRequest,
} from '@/lib/api/sub-users';
import { assetsApi } from '@/lib/api/assets';
import { assetKeys } from './useAssets';

// Query keys for cache management
export const subUserKeys = {
  all: ['subUsers'] as const,
  lists: () => [...subUserKeys.all, 'list'] as const,
  list: (enterpriseId: string) => [...subUserKeys.lists(), enterpriseId] as const,
  infinite: (params: Record<string, unknown>) => [...subUserKeys.all, 'infinite', params] as const,
  details: () => [...subUserKeys.all, 'detail'] as const,
  detail: (id: string) => [...subUserKeys.details(), id] as const,
};

// ============================================
// QUERIES
// ============================================

/**
 * Fetch all sub-users for an enterprise
 */
export function useSubUsers(enterpriseId: string) {
  return useQuery({
    queryKey: subUserKeys.list(enterpriseId),
    queryFn: async () => {
      const response = await subUsersApi.list({
        enterprise_id: enterpriseId,
        limit: 100,
      });
      return response.data;
    },
    enabled: !!enterpriseId,
    staleTime: 30000,
  });
}

/**
 * Fetch all sub-users across all enterprises (for OPS Admin)
 */
export function useAllSubUsers() {
  return useQuery({
    queryKey: [...subUserKeys.all, 'all'],
    queryFn: async () => {
      const response = await subUsersApi.list({ limit: 100 });
      return response.data;
    },
    staleTime: 30000,
  });
}

/**
 * Infinite scroll hook - loads sub-users page by page via skip/limit
 */
export function useInfiniteSubUsers(params: { enterprise_id: string; [key: string]: string | undefined } = { enterprise_id: '' }) {
  return useInfiniteQuery({
    queryKey: subUserKeys.infinite(params as Record<string, unknown>),
    queryFn: async ({ pageParam = 0 }) => {
      const res = await subUsersApi.list({ ...params, skip: pageParam as number, limit: 5 });
      return res;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((sum, p) => sum + (p.data?.length || 0), 0);
      const total = lastPage.pagination?.total ?? 0;
      if (totalFetched < total) return totalFetched;
      return undefined;
    },
    enabled: !!params.enterprise_id,
    staleTime: 30000,
  });
}

/**
 * Fetch single sub-user by ID
 */
export function useSubUser(subUserId: string) {
  return useQuery({
    queryKey: subUserKeys.detail(subUserId),
    queryFn: async () => {
      const response = await subUsersApi.get(subUserId);
      return response.data;
    },
    enabled: !!subUserId,
  });
}

// ============================================
// MUTATIONS
// ============================================

// Legacy type for backward compatibility
export interface CreateSubUserInput {
  enterprise_id: string;
  branch_id?: string;
  email: string;
  name?: string;
  phone?: string;
  department?: string;
  employee_id?: string;
  designation?: string;
  status?: string;
}

/**
 * Create a new sub-user
 */
export function useCreateSubUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subUser: CreateSubUserInput) => {
      const apiData: SubUserCreateRequest = {
        enterprise_id: subUser.enterprise_id,
        branch_id: subUser.branch_id,
        email: subUser.email,
        name: subUser.name || subUser.email.split('@')[0],
        phone: subUser.phone,
        department: subUser.department,
        employee_id: subUser.employee_id,
      };
      const response = await subUsersApi.create(apiData);
      if (!response.success) throw new Error(response.error?.message || 'Failed to create sub-user');
      return response.data;
    },
    onSuccess: (data) => {
      if (data) queryClient.invalidateQueries({ queryKey: subUserKeys.list(data.enterprise_id) });
      queryClient.invalidateQueries({ queryKey: subUserKeys.all });
    },
  });
}

/**
 * Update a sub-user
 */
export function useUpdateSubUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ subUserId, updates }: { subUserId: string; updates: Partial<CreateSubUserInput> }) => {
      const response = await subUsersApi.update(subUserId, {
        email: updates.email,
        name: updates.name,
        phone: updates.phone,
        department: updates.department,
        employee_id: updates.employee_id,
        branch_id: updates.branch_id,
      });
      if (!response.success) throw new Error(response.error?.message || 'Failed to update sub-user');
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(subUserKeys.detail(variables.subUserId), data);
      queryClient.invalidateQueries({ queryKey: subUserKeys.lists() });
    },
  });
}

/**
 * Delete a sub-user
 */
export function useDeleteSubUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subUserId: string) => {
      await subUsersApi.delete(subUserId);
    },
    onSuccess: (_, subUserId) => {
      queryClient.removeQueries({ queryKey: subUserKeys.detail(subUserId) });
      queryClient.invalidateQueries({ queryKey: subUserKeys.lists() });
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
      queryClient.invalidateQueries({ queryKey: ['sidebar-badges'] });
    },
  });
}

/**
 * Bulk create sub-users (CSV import)
 * Uses backend API (POST /users/bulk)
 */
export function useBulkCreateSubUsers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subUsers: CreateSubUserInput[]) => {
      // Transform to API format
      const users: SubUserBulkItem[] = subUsers.map(u => ({
        email: u.email,
        name: u.name || u.email.split('@')[0],
        phone: u.phone,
        department: u.department,
        employee_id: u.employee_id,
      }));

      // Get enterprise_id and branch_id from first user (all should be same)
      const enterprise_id = subUsers[0]?.enterprise_id;
      const branch_id = subUsers[0]?.branch_id;

      const response = await subUsersApi.bulkCreate({
        enterprise_id,
        branch_id,
        users,
      });

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to bulk create users');
      }

      const result = response.data;

      // Throw if all failed
      if (result.error_count > 0 && result.created_count === 0) {
        const errorMsg = result.errors.map(e => `${e.email}: ${e.error}`).join(', ');
        throw new Error(`Failed to create users: ${errorMsg}`);
      }

      return result.created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subUserKeys.all });
    },
  });
}

/**
 * Alias for useBulkCreateSubUsers - used in bulk upload flows
 */
export const useCreateSubUsers = useBulkCreateSubUsers;

/**
 * Assign asset to sub-user
 * Updates the asset with assigned_sub_user_id via the assets API
 */
export function useAssignAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ subUserId, assetId }: { subUserId: string; assetId: string }) => {
      const response = await assetsApi.update(assetId, {
        assigned_to_user_id: subUserId,
        status: 'assigned',
      });
      if (!response.success) throw new Error(response.error?.message || 'Failed to assign asset');
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: subUserKeys.detail(variables.subUserId) });
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
      queryClient.invalidateQueries({ queryKey: ['sidebar-badges'] });
    },
  });
}

/**
 * Send invitation email to sub-user
 * @deprecated Invitation logic should be handled by backend when creating user
 */
export function useSendSubUserInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subUserId: string) => {
      // Update user to mark invitation sent - backend should handle email
      const response = await subUsersApi.update(subUserId, {});
      // In production, this would trigger an email via backend
      return response.data;
    },
    onSuccess: (data, subUserId) => {
      queryClient.setQueryData(subUserKeys.detail(subUserId), data);
      queryClient.invalidateQueries({ queryKey: subUserKeys.lists() });
    },
  });
}

/**
 * Resend invitation to multiple sub-users
 * @deprecated Bulk invitation should be a dedicated backend endpoint
 */
export function useBulkSendInvitations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subUserIds: string[]) => {
      // For now, update each user individually
      const results = await Promise.all(
        subUserIds.map(id => subUsersApi.update(id, {}))
      );
      return results.map(r => r.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subUserKeys.all });
    },
  });
}

// Type exports for consumers
export type { SubUserResponse };
