/**
 * useLogistics - React Query hook replacing logisticsStore
 * Handles logistics admins and logistics users (drivers)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  logisticsApi,
  type LogisticsAdminResponse,
  type LogisticsUserResponse,
  type LogisticsAdminCreateRequest,
  type LogisticsAdminUpdateRequest,
  type LogisticsUserCreateRequest,
  type LogisticsUserUpdateRequest,
} from '@/lib/api/logistics';
import { parseApiError } from '@/lib/api/error-handler';
import { pickupKeys } from './usePickups';

// Query keys for cache management
export const logisticsKeys = {
  all: ['logistics'] as const,
  admins: () => [...logisticsKeys.all, 'admins'] as const,
  adminsList: () => [...logisticsKeys.admins(), 'list'] as const,
  adminDetail: (id: string) => [...logisticsKeys.admins(), 'detail', id] as const,
  adminPickups: (id: string) => [...logisticsKeys.admins(), 'pickups', id] as const,
  users: () => [...logisticsKeys.all, 'users'] as const,
  usersList: (adminId?: string) => [...logisticsKeys.users(), 'list', adminId] as const,
  userDetail: (id: string) => [...logisticsKeys.users(), 'detail', id] as const,
  userPickups: (id: string) => [...logisticsKeys.users(), 'pickups', id] as const,
  availableUsers: (adminId: string) => [...logisticsKeys.users(), 'available', adminId] as const,
};

// ============================================
// QUERIES - LOGISTICS ADMINS
// ============================================

/**
 * Fetch all logistics admins
 */
export function useLogisticsAdmins() {
  return useQuery({
    queryKey: logisticsKeys.adminsList(),
    queryFn: async () => {
      const response = await logisticsApi.listAdmins({ limit: 500 });
      return response.data || [];
    },
    staleTime: 60000,
  });
}

/**
 * Fetch single logistics admin by ID
 */
export function useLogisticsAdmin(adminId: string) {
  return useQuery({
    queryKey: logisticsKeys.adminDetail(adminId),
    queryFn: async () => {
      const response = await logisticsApi.getAdmin(adminId);
      return response.data;
    },
    enabled: !!adminId,
  });
}

// ============================================
// QUERIES - LOGISTICS USERS
// ============================================

/**
 * Fetch logistics users (optionally filtered by admin)
 */
export function useLogisticsUsers(logisticsAdminId?: string) {
  return useQuery({
    queryKey: logisticsKeys.usersList(logisticsAdminId),
    queryFn: async () => {
      const response = await logisticsApi.listUsers({
        logistics_admin_id: logisticsAdminId,
        limit: 500,
      });
      return response.data || [];
    },
    staleTime: 60000,
  });
}

/**
 * Fetch single logistics user by ID
 */
export function useLogisticsUser(userId: string) {
  return useQuery({
    queryKey: logisticsKeys.userDetail(userId),
    queryFn: async () => {
      const response = await logisticsApi.getUser(userId);
      return response.data;
    },
    enabled: !!userId,
  });
}

/**
 * Fetch available logistics users for assignment
 */
export function useAvailableLogisticsUsers(logisticsAdminId: string) {
  return useQuery({
    queryKey: logisticsKeys.availableUsers(logisticsAdminId),
    queryFn: async () => {
      const response = await logisticsApi.listAvailableUsers(logisticsAdminId);
      return response.data || [];
    },
    enabled: !!logisticsAdminId,
    staleTime: 30000,
  });
}

// ============================================
// MUTATIONS - LOGISTICS ADMINS
// ============================================

// Legacy type for backward compatibility
export interface CreateLogisticsAdminInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  company_name: string;
  gst_number?: string;
  address?: string;
}

/**
 * Create a new logistics admin (partner company)
 */
export function useCreateLogisticsAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (admin: CreateLogisticsAdminInput) => {
      const apiData: LogisticsAdminCreateRequest = {
        company_name: admin.company_name,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        password: admin.password,
        gst_number: admin.gst_number,
        address: admin.address,
      };
      const response = await logisticsApi.createAdmin(apiData);
      if (!response.success) throw parseApiError(response) || new Error('Failed to create logistics admin');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logisticsKeys.all });
    },
  });
}

/**
 * Update a logistics admin
 */
export function useUpdateLogisticsAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ adminId, updates }: { adminId: string; updates: Partial<CreateLogisticsAdminInput> }) => {
      const apiData: LogisticsAdminUpdateRequest = {
        company_name: updates.company_name,
        name: updates.name,
        phone: updates.phone,
        gst_number: updates.gst_number,
        address: updates.address,
      };
      const response = await logisticsApi.updateAdmin(adminId, apiData);
      if (!response.success) throw parseApiError(response) || new Error('Failed to update logistics admin');
      return response.data;
    },
    onSuccess: (data, variables) => {
      if (data) {
        queryClient.setQueryData(logisticsKeys.adminDetail(variables.adminId), data);
      }
      queryClient.invalidateQueries({ queryKey: logisticsKeys.all });
    },
  });
}

/**
 * Delete a logistics admin
 */
export function useDeleteLogisticsAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (adminId: string) => {
      await logisticsApi.deleteAdmin(adminId);
    },
    onSuccess: (_, adminId) => {
      queryClient.removeQueries({ queryKey: logisticsKeys.adminDetail(adminId) });
      queryClient.invalidateQueries({ queryKey: logisticsKeys.all });
      queryClient.invalidateQueries({ queryKey: pickupKeys.all });
    },
  });
}

// ============================================
// MUTATIONS - LOGISTICS USERS
// ============================================

// Legacy type for backward compatibility
export interface CreateLogisticsUserInput {
  logistics_admin_id: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  vehicle_number?: string;
  vehicle_type?: string;
}

/**
 * Create a new logistics user (driver)
 */
export function useCreateLogisticsUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (user: CreateLogisticsUserInput) => {
      const apiData: LogisticsUserCreateRequest = {
        logistics_admin_id: user.logistics_admin_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        password: user.password || '',
        vehicle_number: user.vehicle_number,
        vehicle_type: user.vehicle_type,
      };
      const response = await logisticsApi.createUser(apiData);
      if (!response.success) throw parseApiError(response) || new Error('Failed to create logistics user');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logisticsKeys.all });
    },
  });
}

/**
 * Update a logistics user
 */
export function useUpdateLogisticsUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<CreateLogisticsUserInput> }) => {
      const apiData: LogisticsUserUpdateRequest = {
        name: updates.name,
        email: updates.email,
        phone: updates.phone,
      };
      const response = await logisticsApi.updateUser(userId, apiData);
      if (!response.success) throw parseApiError(response) || new Error('Failed to update logistics user');
      return response.data;
    },
    onSuccess: (data, variables) => {
      if (data) {
        queryClient.setQueryData(logisticsKeys.userDetail(variables.userId), data);
      }
      queryClient.invalidateQueries({ queryKey: logisticsKeys.all });
    },
  });
}

/**
 * Delete a logistics user
 */
export function useDeleteLogisticsUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      await logisticsApi.deleteUser(userId);
    },
    onSuccess: (_, userId) => {
      queryClient.removeQueries({ queryKey: logisticsKeys.userDetail(userId) });
      queryClient.invalidateQueries({ queryKey: logisticsKeys.all });
      queryClient.invalidateQueries({ queryKey: pickupKeys.all });
    },
  });
}

/**
 * Update logistics user status
 */
export function useUpdateLogisticsUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: 'active' | 'inactive' }) => {
      const response = await logisticsApi.updateUserStatus(userId, status);
      if (!response.success) throw parseApiError(response) || new Error('Failed to update logistics user status');
      return response.data;
    },
    onSuccess: (data, variables) => {
      if (data) {
        queryClient.setQueryData(logisticsKeys.userDetail(variables.userId), data);
      }
      queryClient.invalidateQueries({ queryKey: logisticsKeys.all });
      queryClient.invalidateQueries({ queryKey: pickupKeys.all });
    },
  });
}

/**
 * Fetch pickups assigned to a logistics admin
 */
export function useLogisticsAdminPickups(logisticsAdminId: string) {
  return useQuery({
    queryKey: logisticsKeys.adminPickups(logisticsAdminId),
    queryFn: async () => {
      const response = await logisticsApi.getAdminPickups(logisticsAdminId, { limit: 500 });
      return response.data || [];
    },
    enabled: !!logisticsAdminId,
    staleTime: 10000,
  });
}

/**
 * Fetch pickups assigned to a logistics user (driver)
 */
export function useLogisticsUserPickups(logisticsUserId: string) {
  return useQuery({
    queryKey: logisticsKeys.userPickups(logisticsUserId),
    queryFn: async () => {
      const response = await logisticsApi.getUserPickups(logisticsUserId, { limit: 500 });
      return response.data || [];
    },
    enabled: !!logisticsUserId,
    staleTime: 10000,
  });
}

// Type exports for consumers
export type { LogisticsAdminResponse, LogisticsUserResponse };
