/**
 * useBranches - React Query hook for branch management
 * V3.2: Branch -> IT Admin (1 IT Admin can manage multiple branches)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  branchesApi,
  type BranchResponse,
  type BranchCreateRequest,
  type BranchUpdateRequest,
  type BranchSummary,
} from '@/lib/api/branches';
import {
  usersApi,
  type UserResponse,
  type ITAdminWithBranches,
  type UserCreateRequest,
} from '@/lib/api/users';

// Query keys for cache management
export const branchKeys = {
  all: ['branches'] as const,
  lists: () => [...branchKeys.all, 'list'] as const,
  list: (enterpriseId: string) => [...branchKeys.lists(), enterpriseId] as const,
  details: () => [...branchKeys.all, 'detail'] as const,
  detail: (id: string) => [...branchKeys.details(), id] as const,
  summary: (enterpriseId: string) => [...branchKeys.all, 'summary', enterpriseId] as const,
  byITAdmin: (userId: string) => [...branchKeys.all, 'by-it-admin', userId] as const,
  codeCheck: (enterpriseId: string, code: string) => [...branchKeys.all, 'code-check', enterpriseId, code] as const,
};

export const itAdminKeys = {
  all: ['it-admins'] as const,
  list: (enterpriseId: string) => [...itAdminKeys.all, enterpriseId] as const,
  active: (enterpriseId: string) => [...itAdminKeys.all, 'active', enterpriseId] as const,
  branches: (enterpriseId: string) => [...itAdminKeys.all, 'branches', enterpriseId] as const,
};

// ============================================
// QUERIES
// ============================================

/**
 * Fetch all branches for an enterprise
 * Includes IT admin info via join
 */
export function useBranches(enterpriseId: string) {
  return useQuery({
    queryKey: branchKeys.list(enterpriseId),
    queryFn: async () => {
      const response = await branchesApi.list({ enterprise_id: enterpriseId, limit: 1000 });
      return response.data || [];
    },
    enabled: !!enterpriseId,
    staleTime: 60000,
  });
}

/**
 * Fetch single branch by ID
 */
export function useBranch(branchId: string) {
  return useQuery({
    queryKey: branchKeys.detail(branchId),
    queryFn: async () => {
      const response = await branchesApi.get(branchId);
      return response.data;
    },
    enabled: !!branchId,
  });
}

/**
 * Fetch branch summary with aggregated stats
 * Uses the API's summary endpoint
 */
export function useBranchSummary(enterpriseId: string) {
  return useQuery({
    queryKey: branchKeys.summary(enterpriseId),
    queryFn: async () => {
      const response = await branchesApi.getSummary(enterpriseId);
      return response.data || [];
    },
    enabled: !!enterpriseId,
    staleTime: 30000,
  });
}

/**
 * Fetch all branches managed by an IT Admin
 */
export function useBranchesByITAdmin(userId: string) {
  return useQuery({
    queryKey: branchKeys.byITAdmin(userId),
    queryFn: async () => {
      const response = await branchesApi.getByITAdmin(userId);
      return response.data || [];
    },
    enabled: !!userId,
    staleTime: 60000,
  });
}

/**
 * Check if branch code exists (for validation)
 */
export function useCheckBranchCodeExists(enterpriseId: string, code: string) {
  return useQuery({
    queryKey: branchKeys.codeCheck(enterpriseId, code),
    queryFn: async () => {
      const response = await branchesApi.checkCodeExists(enterpriseId, code);
      return response.data?.exists ?? false;
    },
    enabled: !!enterpriseId && !!code && code.length >= 1,
    staleTime: 0, // Always fetch fresh
  });
}

/**
 * Fetch all IT Admins for an enterprise (active + inactive)
 * Use for management/listing pages
 */
export function useITAdmins(enterpriseId: string) {
  return useQuery({
    queryKey: itAdminKeys.list(enterpriseId),
    queryFn: async () => {
      const response = await usersApi.listITAdmins(enterpriseId);
      return response.data || [];
    },
    enabled: !!enterpriseId,
    staleTime: 30000,
  });
}

/**
 * Fetch only active IT Admins for an enterprise
 * Use for dropdowns and assignments
 */
export function useActiveITAdmins(enterpriseId: string) {
  return useQuery({
    queryKey: itAdminKeys.active(enterpriseId),
    queryFn: async () => {
      const response = await usersApi.listITAdmins(enterpriseId, 'active');
      return response.data || [];
    },
    enabled: !!enterpriseId,
    staleTime: 30000,
  });
}

/**
 * Fetch IT Admins with their branch counts
 * Uses the API's specialized endpoint
 */
export function useITAdminBranches(enterpriseId: string) {
  return useQuery({
    queryKey: itAdminKeys.branches(enterpriseId),
    queryFn: async () => {
      const response = await usersApi.listITAdminsWithBranches(enterpriseId);
      return response.data || [];
    },
    enabled: !!enterpriseId,
    staleTime: 30000,
  });
}

// ============================================
// MUTATIONS
// ============================================

// Legacy type for backward compatibility
export interface CreateBranchInput {
  enterprise_id: string;
  branch_name: string;
  branch_code: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pin_code: string;
  pickup_point_description?: string;
  site_contact_person?: string;
  site_contact_phone?: string;
  operating_hours?: string;
  special_instructions?: string;
  it_admin_id?: string;
}

/**
 * Create a new branch
 */
export function useCreateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (branch: CreateBranchInput) => {
      const apiData: BranchCreateRequest = {
        branch_name: branch.branch_name,
        branch_code: branch.branch_code,
        enterprise_id: branch.enterprise_id,
        address_line1: branch.address_line1,
        address_line2: branch.address_line2,
        city: branch.city,
        state: branch.state,
        pin_code: branch.pin_code,
        pickup_point_description: branch.pickup_point_description,
        site_contact_person: branch.site_contact_person,
        site_contact_phone: branch.site_contact_phone,
        operating_hours: branch.operating_hours,
        special_instructions: branch.special_instructions,
      };
      const response = await branchesApi.create(apiData);
      if (!response.success) throw new Error(response.error?.message || 'Failed to create branch');

      // If IT admin specified, assign them to the branch
      if (branch.it_admin_id && response.data) {
        await branchesApi.update(response.data.id, { it_admin_id: branch.it_admin_id });
      }

      return response.data;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: branchKeys.list(data.enterprise_id) });
        queryClient.invalidateQueries({ queryKey: branchKeys.summary(data.enterprise_id) });
        if (data.it_admin_id) {
          queryClient.invalidateQueries({ queryKey: branchKeys.byITAdmin(data.it_admin_id) });
          queryClient.invalidateQueries({ queryKey: itAdminKeys.branches(data.enterprise_id) });
        }
      }
    },
  });
}

/**
 * Update a branch (including IT admin assignment)
 */
export function useUpdateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ branchId, updates }: { branchId: string; updates: BranchUpdateRequest }) => {
      const response = await branchesApi.update(branchId, updates);
      if (!response.success) throw new Error(response.error?.message || 'Failed to update branch');
      return response.data;
    },
    onSuccess: (data, variables) => {
      if (data) {
        queryClient.setQueryData(branchKeys.detail(variables.branchId), data);
        queryClient.invalidateQueries({ queryKey: branchKeys.lists() });
        queryClient.invalidateQueries({ queryKey: branchKeys.summary(data.enterprise_id) });
        queryClient.invalidateQueries({ queryKey: itAdminKeys.branches(data.enterprise_id) });
        // Invalidate IT admin branches queries
        if (data.it_admin_id) {
          queryClient.invalidateQueries({ queryKey: branchKeys.byITAdmin(data.it_admin_id) });
        }
      }
    },
  });
}

/**
 * Delete a branch
 */
export function useDeleteBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (branchId: string) => {
      await branchesApi.delete(branchId);
    },
    onSuccess: (_, branchId) => {
      queryClient.removeQueries({ queryKey: branchKeys.detail(branchId) });
      queryClient.invalidateQueries({ queryKey: branchKeys.lists() });
      queryClient.invalidateQueries({ queryKey: branchKeys.all });
      queryClient.invalidateQueries({ queryKey: itAdminKeys.all });
    },
  });
}

/**
 * Update branch status (active/inactive/needs_admin)
 */
export function useUpdateBranchStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ branchId, status }: { branchId: string; status: 'active' | 'inactive' | 'needs_admin' }) => {
      const response = await branchesApi.update(branchId, { status });
      if (!response.success) throw new Error(response.error?.message || 'Failed to update branch status');
      return response.data;
    },
    onSuccess: (data, variables) => {
      if (data) {
        queryClient.setQueryData(branchKeys.detail(variables.branchId), data);
        queryClient.invalidateQueries({ queryKey: branchKeys.lists() });
        queryClient.invalidateQueries({ queryKey: branchKeys.summary(data.enterprise_id) });
      }
    },
  });
}

// Legacy type for backward compatibility
export interface BulkBranchInput {
  enterprise_id: string;
  branch_name: string;
  branch_code: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pin_code: string;
  pickup_point_description?: string;
  site_contact_person?: string;
  site_contact_phone?: string;
  operating_hours?: string;
  special_instructions?: string;
  it_admin_email?: string;
}

/**
 * Bulk create branches with optional IT admin creation
 */
export function useBulkCreateBranches() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inputs: BulkBranchInput[]) => {
      if (inputs.length === 0) return { created: [], errors: [] };

      const enterpriseId = inputs[0].enterprise_id;
      const response = await branchesApi.bulkCreate(enterpriseId, {
        branches: inputs.map(b => ({
          branch_name: b.branch_name,
          branch_code: b.branch_code,
          address_line1: b.address_line1,
          address_line2: b.address_line2,
          city: b.city,
          state: b.state,
          pin_code: b.pin_code,
          pickup_point_description: b.pickup_point_description,
          site_contact_person: b.site_contact_person,
          site_contact_phone: b.site_contact_phone,
          operating_hours: b.operating_hours,
          special_instructions: b.special_instructions,
          it_admin_email: b.it_admin_email,
        })),
      });

      if (response.error_count > 0 && response.created_count === 0) {
        const errorMsg = response.errors.map(e => `Row ${e.index}: ${e.error}`).join(', ');
        throw new Error(`Failed to create branches: ${errorMsg}`);
      }

      return { created: response.created, errors: response.errors };
    },
    onSuccess: (_, variables) => {
      if (variables.length > 0) {
        queryClient.invalidateQueries({ queryKey: branchKeys.list(variables[0].enterprise_id) });
        queryClient.invalidateQueries({ queryKey: branchKeys.summary(variables[0].enterprise_id) });
        queryClient.invalidateQueries({ queryKey: itAdminKeys.list(variables[0].enterprise_id) });
        queryClient.invalidateQueries({ queryKey: itAdminKeys.branches(variables[0].enterprise_id) });
      }
    },
  });
}

// ============================================
// IT ADMIN MUTATIONS
// ============================================

/**
 * Create a new IT Admin via REST API
 */
export function useCreateITAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      enterprise_id: string;
      name: string;
      email: string;
      phone?: string;
      password: string;
      branch_id?: string;
    }) => {
      const apiData: UserCreateRequest = {
        email: input.email,
        name: input.name,
        phone: input.phone,
        role: 'it_admin',
        password: input.password,
        enterprise_id: input.enterprise_id,
        branch_id: input.branch_id,
      };
      const response = await usersApi.create(apiData);
      if (!response.success) throw new Error(response.error?.message || 'Failed to create IT admin');
      return response.data;
    },
    onSuccess: (data) => {
      if (data && data.enterprise_id) {
        queryClient.invalidateQueries({ queryKey: itAdminKeys.list(data.enterprise_id) });
        queryClient.invalidateQueries({ queryKey: itAdminKeys.branches(data.enterprise_id) });
        // Also invalidate branch queries so branch pages reflect the new IT admin assignment
        queryClient.invalidateQueries({ queryKey: branchKeys.lists() });
        queryClient.invalidateQueries({ queryKey: branchKeys.summary(data.enterprise_id) });
      }
    },
  });
}

/**
 * Update IT Admin details (name, phone, branch)
 */
export function useUpdateITAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: { name?: string; phone?: string; branch_id?: string } }) => {
      const response = await usersApi.update(userId, data);
      if (!response.success) throw new Error(response.error?.message || 'Failed to update IT admin');
      return response.data;
    },
    onSuccess: (data) => {
      if (data && data.enterprise_id) {
        queryClient.invalidateQueries({ queryKey: itAdminKeys.list(data.enterprise_id) });
        queryClient.invalidateQueries({ queryKey: itAdminKeys.branches(data.enterprise_id) });
        queryClient.invalidateQueries({ queryKey: branchKeys.lists() });
        queryClient.invalidateQueries({ queryKey: branchKeys.summary(data.enterprise_id) });
      }
    },
  });
}

/**
 * Bulk create IT Admins via REST API
 */
export function useBulkCreateITAdmins() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inputs: Array<{
      enterprise_id: string;
      name: string;
      email: string;
      phone?: string;
      password: string;
    }>) => {
      const users: UserCreateRequest[] = inputs.map(input => ({
        email: input.email,
        name: input.name,
        phone: input.phone,
        role: 'it_admin',
        password: input.password,
        enterprise_id: input.enterprise_id,
      }));

      const response = await usersApi.bulkCreate({ users, role: 'it_admin' });

      if (response.error_count > 0 && response.created_count === 0) {
        const errorMsg = response.errors.map(e => `${e.email}: ${e.error}`).join(', ');
        throw new Error(`Failed to create IT admins: ${errorMsg}`);
      }

      return { results: response.created, errors: response.errors };
    },
    onSuccess: (_, variables) => {
      if (variables.length > 0) {
        queryClient.invalidateQueries({ queryKey: itAdminKeys.list(variables[0].enterprise_id) });
        queryClient.invalidateQueries({ queryKey: itAdminKeys.branches(variables[0].enterprise_id) });
      }
    },
  });
}

/**
 * Update IT Admin status
 */
export function useUpdateITAdminStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: 'active' | 'inactive' }) => {
      const response = await usersApi.update(userId, { status });
      if (!response.success) throw new Error(response.error?.message || 'Failed to update IT admin status');
      return response.data;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: itAdminKeys.list(data.enterprise_id) });
        queryClient.invalidateQueries({ queryKey: itAdminKeys.branches(data.enterprise_id) });
      }
    },
  });
}

// Type exports for consumers
export type { BranchResponse, BranchSummary, ITAdminWithBranches };
