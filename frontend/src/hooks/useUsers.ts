/**
 * useUsers - React Query hook for user management
 * Handles all user CRUD operations and cache management
 */

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  usersApi,
  type UserResponse,
  type UserCreateRequest,
  type UserUpdateRequest,
  type PasswordResetRequest,
  type UserListParams,
} from '@/lib/api/users';
import { parseApiError } from '@/lib/api/error-handler';
import { dashboardStatsKeys } from './useDashboardStats';

// Query keys for cache management
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params?: UserListParams) => [...userKeys.lists(), params] as const,
  infinite: (params: Record<string, unknown>) => [...userKeys.all, 'infinite', params] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  me: () => [...userKeys.all, 'me'] as const,
  platformAdmins: () => [...userKeys.all, 'platform-admins'] as const,
};

// ============================================
// QUERIES
// ============================================

/**
 * Fetch all users with optional filters
 */
export function useUsers(params: UserListParams = {}) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: async () => {
      const response = await usersApi.list(params);
      return response.data || [];
    },
    staleTime: 30000,
  });
}

/**
 * Fetch users with max page size (100)
 */
export function useAllUsers(params: UserListParams = {}) {
  return useQuery({
    queryKey: userKeys.list({ ...params, limit: 100 }),
    queryFn: async () => {
      const response = await usersApi.list({ ...params, limit: 100 });
      return response.data || [];
    },
    staleTime: 30000,
  });
}

/**
 * Infinite scroll hook - loads users page by page
 */
export function useInfiniteUsers(params: Omit<UserListParams, 'skip' | 'limit'> = {}) {
  return useInfiniteQuery({
    queryKey: userKeys.infinite(params as Record<string, unknown>),
    queryFn: async ({ pageParam = 0 }) => {
      const res = await usersApi.list({ ...params, skip: pageParam as number, limit: 5 });
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
 * Fetch single user by ID
 */
export function useUser(userId: string) {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: async () => {
      const response = await usersApi.get(userId);
      return response.data;
    },
    enabled: !!userId,
    staleTime: 30000,
  });
}

/**
 * Fetch current user profile
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: userKeys.me(),
    queryFn: async () => {
      const response = await usersApi.getMe();
      return response.data;
    },
    staleTime: 60000,
  });
}

/**
 * Fetch platform admins (super_admin, ops_admin, logistics_admin)
 */
export function usePlatformAdmins() {
  return useQuery({
    queryKey: userKeys.platformAdmins(),
    queryFn: async () => {
      const response = await usersApi.list({ limit: 100 });
      if (response.success && response.data) {
        const adminRoles = ['super_admin', 'ops_admin', 'logistics_admin'];
        return response.data.filter(u => adminRoles.includes(u.role));
      }
      return [] as UserResponse[];
    },
    staleTime: 30000,
  });
}

// ============================================
// MUTATIONS
// ============================================

/**
 * Create a new user
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UserCreateRequest) => {
      const response = await usersApi.create(data);
      if (!response.success) throw parseApiError(response) || new Error('Failed to create user');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.all });
    },
  });
}

/**
 * Update a user
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: UserUpdateRequest }) => {
      const response = await usersApi.update(userId, data);
      if (!response.success) throw parseApiError(response) || new Error('Failed to update user');
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Update the specific user in cache
      queryClient.setQueryData(userKeys.detail(variables.userId), data);
      // Invalidate all user queries (lists, infinite, platform admins, etc.)
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.all });
    },
  });
}

/**
 * Delete a user
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      await usersApi.delete(userId);
    },
    onSuccess: (_, userId) => {
      queryClient.removeQueries({ queryKey: userKeys.detail(userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.all });
    },
  });
}

/**
 * Reset user password (admin-initiated)
 */
export function useResetUserPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: PasswordResetRequest }) => {
      const response = await usersApi.resetPassword(userId, data);
      if (!response.success) throw parseApiError(response) || new Error('Failed to reset password');
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Update the specific user in cache (password reset might update last_modified)
      queryClient.setQueryData(userKeys.detail(variables.userId), data);
    },
  });
}

/**
 * Toggle logistics company status (admin + all field users)
 */
export function useToggleCompanyStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, activate }: { userId: string; activate: boolean }) =>
      usersApi.toggleCompanyStatus(userId, activate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.invalidateQueries({ queryKey: ['logistics-management'] });
    },
  });
}

/**
 * Update current user profile
 */
export function useUpdateCurrentUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UserUpdateRequest) => {
      const response = await usersApi.updateMe(data);
      if (!response.success) throw parseApiError(response) || new Error('Failed to update profile');
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(userKeys.me(), data);
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

// Type exports for consumers
export type { UserResponse, UserCreateRequest, UserUpdateRequest, PasswordResetRequest };

