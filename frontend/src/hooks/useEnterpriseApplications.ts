/**
 * useEnterpriseApplications - React Query hook for V3 enterprise registration
 * Handles the new registration workflow: Apply -> Review -> Approve/Reject
 */

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardStatsKeys } from './useDashboardStats';
import {
  enterpriseApplicationsApi,
  type EnterpriseApplicationResponse,
  type EnterpriseApplicationCreateRequest,
  type EnterpriseApplicationUpdateDocsRequest,
  type EnterpriseApplicationListParams,
  type EnterpriseApplicationStats,
} from '@/lib/api/applications';
import { filesApi } from '@/lib/api/files';
import { enterpriseKeys } from './useEnterprises';

// Query keys for cache management
export const applicationKeys = {
  all: ['enterpriseApplications'] as const,
  lists: () => [...applicationKeys.all, 'list'] as const,
  list: (status?: string) => [...applicationKeys.lists(), status] as const,
  infinite: (params: Record<string, unknown>) => [...applicationKeys.all, 'infinite', params] as const,
  details: () => [...applicationKeys.all, 'detail'] as const,
  detail: (id: string) => [...applicationKeys.details(), id] as const,
  pending: () => [...applicationKeys.all, 'pending'] as const,
};

// ============================================
// QUERIES
// ============================================

/**
 * Fetch application status counts (for KPI cards)
 */
export function useApplicationStats() {
  return useQuery({
    queryKey: [...applicationKeys.all, 'stats'] as const,
    queryFn: async () => {
      const response = await enterpriseApplicationsApi.stats();
      return (response.data ?? { pending: 0, approved: 0, rejected: 0, more_info_requested: 0, total: 0 }) as EnterpriseApplicationStats;
    },
    staleTime: 15000,
  });
}

/**
 * Fetch all enterprise applications (optionally filtered by status)
 */
export function useEnterpriseApplications(status?: string) {
  return useQuery({
    queryKey: applicationKeys.list(status),
    queryFn: async () => {
      const response = await enterpriseApplicationsApi.list({ status, limit: 100 });
      return response.data || [];
    },
    staleTime: 30000,
  });
}

/**
 * Fetch pending applications (for admin review queue)
 */
export function usePendingApplications() {
  return useQuery({
    queryKey: applicationKeys.pending(),
    queryFn: async () => {
      const response = await enterpriseApplicationsApi.list({ status: 'pending', limit: 100 });
      return response.data || [];
    },
    staleTime: 10000, // Refresh more frequently for pending items
  });
}

/**
 * Fetch single application by ID
 */
export function useEnterpriseApplication(applicationId: string) {
  return useQuery({
    queryKey: applicationKeys.detail(applicationId),
    queryFn: async () => {
      const response = await enterpriseApplicationsApi.get(applicationId);
      return response.data;
    },
    enabled: !!applicationId,
  });
}

/**
 * Infinite scroll hook - loads enterprise applications 5 at a time via REST API
 */
export function useInfiniteEnterpriseApplications(params: Omit<EnterpriseApplicationListParams, 'skip' | 'limit'> = {}) {
  return useInfiniteQuery({
    queryKey: applicationKeys.infinite(params as Record<string, unknown>),
    queryFn: async ({ pageParam = 0 }) => {
      const res = await enterpriseApplicationsApi.list({ ...params, skip: pageParam as number, limit: 5 });
      return res;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((sum, p) => sum + (p.data?.length || 0), 0);
      const total = lastPage.pagination?.total ?? 0;
      if (totalFetched < total) return totalFetched;
      return undefined;
    },
    staleTime: 10000,
  });
}

// ============================================
// MUTATIONS
// ============================================

// Legacy type for backward compatibility
export interface CreateEnterpriseApplicationInput {
  company_name: string;
  gst_number: string;
  pan_number: string;
  registered_address: string;
  industry_type?: string;
  company_size?: string;
  org_admin_name: string;
  org_admin_email: string;
  org_admin_phone: string;
  org_admin_designation?: string;
  password: string;
  doc_gst_certificate?: string;
  doc_pan_card?: string;
  doc_incorporation_cert?: string;
  doc_signatory_id?: string;
  doc_address_proof?: string;
  doc_company_logo?: string;
}

/**
 * Submit a new enterprise application
 */
export function useCreateEnterpriseApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (application: CreateEnterpriseApplicationInput) => {
      const apiData: EnterpriseApplicationCreateRequest = {
        company_name: application.company_name,
        gst_number: application.gst_number,
        pan_number: application.pan_number,
        registered_address: application.registered_address,
        industry_type: application.industry_type,
        company_size: application.company_size,
        org_admin_name: application.org_admin_name,
        org_admin_email: application.org_admin_email,
        org_admin_phone: application.org_admin_phone,
        org_admin_designation: application.org_admin_designation,
        password: application.password,
        doc_gst_certificate: application.doc_gst_certificate,
        doc_pan_card: application.doc_pan_card,
        doc_incorporation_cert: application.doc_incorporation_cert,
        doc_signatory_id: application.doc_signatory_id,
        doc_address_proof: application.doc_address_proof,
        doc_company_logo: application.doc_company_logo,
      };
      const response = await enterpriseApplicationsApi.create(apiData);
      if (!response.success) throw new Error(response.error?.message || 'Failed to submit application');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.all });
    },
  });
}

/**
 * Approve an enterprise application
 * Creates enterprise, org_admin user, and wallet
 */
export function useApproveEnterpriseApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ applicationId, reviewedBy, notes }: {
      applicationId: string;
      reviewedBy: string;
      notes?: string;
    }) => {
      const response = await enterpriseApplicationsApi.approve(applicationId, notes);
      if (!response.success) throw new Error(response.error?.message || 'Failed to approve application');
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.detail(variables.applicationId) });
      queryClient.invalidateQueries({ queryKey: applicationKeys.all });
      queryClient.invalidateQueries({ queryKey: enterpriseKeys.all });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-badges'] });
      queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.all });
    },
  });
}

/**
 * Reject an enterprise application
 */
export function useRejectEnterpriseApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ applicationId, reviewedBy, reason }: {
      applicationId: string;
      reviewedBy: string;
      reason: string;
    }) => {
      const response = await enterpriseApplicationsApi.reject(applicationId, reason);
      if (!response.success) throw new Error(response.error?.message || 'Failed to reject application');
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.detail(variables.applicationId) });
      queryClient.invalidateQueries({ queryKey: applicationKeys.all });
      queryClient.invalidateQueries({ queryKey: ['sidebar-badges'] });
      queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.all });
    },
  });
}

/**
 * Request more information from applicant
 */
export function useRequestMoreInfo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ applicationId, reviewedBy, notes }: {
      applicationId: string;
      reviewedBy: string;
      notes: string;
    }) => {
      const response = await enterpriseApplicationsApi.requestMoreInfo(applicationId, notes);
      if (!response.success) throw new Error(response.error?.message || 'Failed to request more info');
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.detail(variables.applicationId) });
      queryClient.invalidateQueries({ queryKey: applicationKeys.all });
    },
  });
}

/**
 * Update application documents (for resubmission after info request)
 */
export function useUpdateApplicationDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ applicationId, documents }: {
      applicationId: string;
      documents: EnterpriseApplicationUpdateDocsRequest;
    }) => {
      const response = await enterpriseApplicationsApi.updateDocuments(applicationId, documents);
      if (!response.success) throw new Error(response.error?.message || 'Failed to update documents');
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.detail(variables.applicationId) });
      queryClient.invalidateQueries({ queryKey: applicationKeys.all });
    },
  });
}

/**
 * Upload document via API
 */
export function useUploadDocument() {
  return useMutation({
    mutationFn: async ({ file, path }: { file: File; path: string }) => {
      // Extract folder from path (e.g., "documents/enterprise-apps/123/gst.pdf" -> "documents/enterprise-apps/123")
      const folder = path.split('/').slice(0, -1).join('/') || 'documents';
      const response = await filesApi.upload(file, folder);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Upload failed');
      }
      return response.data.file_url;
    },
  });
}

/**
 * Check if GST number already exists
 */
export function useCheckGSTExists() {
  return useMutation({
    mutationFn: async (gstNumber: string) => {
      const response = await enterpriseApplicationsApi.checkGSTExists(gstNumber);
      return response.data?.exists ?? false;
    },
  });
}

/**
 * Check if email already exists
 */
export function useCheckEmailExists() {
  return useMutation({
    mutationFn: async (email: string) => {
      const response = await enterpriseApplicationsApi.checkEmailExists(email);
      return response.data?.exists ?? false;
    },
  });
}

// Type exports for consumers
export type { EnterpriseApplicationResponse };
