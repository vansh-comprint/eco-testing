/**
 * React Query Hooks for EPR Certificates
 * Handles EPR certificate CRUD operations and recycler partner management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchEPRCertificates,
  fetchAllEPRCertificates,
  fetchEPRCertificateById,
  fetchRecyclerPartners,
  fetchRecyclerPartnerById,
  fetchEPRComplianceMetrics,
} from '@/lib/db/queries';
import {
  createEPRCertificate,
  updateEPRCertificate,
  approveEPRCertificate,
  issueEPRCertificate,
  rejectEPRCertificate,
  deleteEPRCertificate,
  createRecyclerPartner,
  updateRecyclerPartner,
  deleteRecyclerPartner,
} from '@/lib/db/mutations';

// Query keys
export const eprKeys = {
  all: ['epr-certificates'] as const,
  lists: () => [...eprKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...eprKeys.lists(), filters] as const,
  details: () => [...eprKeys.all, 'detail'] as const,
  detail: (id: string) => [...eprKeys.details(), id] as const,
  byEnterprise: (enterpriseId: string) => [...eprKeys.all, 'byEnterprise', enterpriseId] as const,
  metrics: (enterpriseId: string, year?: number) => [...eprKeys.all, 'metrics', enterpriseId, year] as const,
};

export const recyclerKeys = {
  all: ['recycler-partners'] as const,
  lists: () => [...recyclerKeys.all, 'list'] as const,
  details: () => [...recyclerKeys.all, 'detail'] as const,
  detail: (id: string) => [...recyclerKeys.details(), id] as const,
};

// Types
export interface EPRCertificate {
  id: string;
  enterprise_id: string;
  batch_id?: string;
  recycler_partner_id?: string;
  certificate_number: string;
  compliance_year: number;
  weight_kg?: number;
  total_weight_kg?: number; // Old schema field name - fallback
  category?: string;
  treatment_type?: 'recycled' | 'refurbished' | 'resold' | 'disposed';
  treatment_summary?: Record<string, unknown>; // Old schema field
  status?: 'pending_generation' | 'generated' | 'pending_approval' | 'approved' | 'issued' | 'rejected' | 'expired';
  issue_date?: string;
  expiry_date?: string;
  notes?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at?: string;
  // Joined data
  enterprises?: {
    id: string;
    name: string;
  };
  batches?: {
    id: string;
    name: string;
    asset_count: number;
  };
  recycler_partners?: {
    id: string;
    name: string;
    registration_number: string;
  };
}

export interface RecyclerPartner {
  id: string;
  name: string;
  registration_number: string;
  status: 'active' | 'inactive' | 'suspended';
  contact_person: string;
  email: string;
  phone: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  capabilities: string[];
  certifications?: string[];
  processing_capacity_kg?: number;
  created_at: string;
  updated_at?: string;
}

export interface EPRComplianceMetrics {
  totalWeight: number;
  targetWeight: number;
  compliancePercentage: number;
  certificateCount: number;
  pendingCount: number;
  issuedCount: number;
  byCategory: Record<string, number>;
  byTreatmentType: Record<string, number>;
}

export interface CreateEPRCertificateInput {
  enterprise_id: string;
  batch_id?: string;
  recycler_partner_id?: string;
  certificate_number?: string;
  compliance_year: number;
  weight_kg: number;
  category: string;
  treatment_type: 'recycled' | 'refurbished' | 'resold' | 'disposed';
  notes?: string;
}

export interface UpdateEPRCertificateInput {
  recycler_partner_id?: string;
  certificate_number?: string;
  weight_kg?: number;
  category?: string;
  treatment_type?: 'recycled' | 'refurbished' | 'resold' | 'disposed';
  status?: string;
  issue_date?: string;
  expiry_date?: string;
  notes?: string;
  rejection_reason?: string;
}

export interface CreateRecyclerPartnerInput {
  name: string;
  registration_number: string;
  contact_person: string;
  email: string;
  phone: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  capabilities: string[];
  certifications?: string[];
  processing_capacity_kg?: number;
}

// ============================================================================
// EPR CERTIFICATE QUERIES
// ============================================================================

// Fetch EPR certificates by enterprise
export function useEPRCertificates(enterpriseId: string) {
  return useQuery({
    queryKey: eprKeys.byEnterprise(enterpriseId),
    queryFn: () => fetchEPRCertificates(enterpriseId),
    enabled: !!enterpriseId,
  });
}

// Fetch all EPR certificates (for Super Admin / OPS Admin)
export function useAllEPRCertificates() {
  return useQuery({
    queryKey: eprKeys.lists(),
    queryFn: () => fetchAllEPRCertificates(),
  });
}

// Fetch single EPR certificate by ID
export function useEPRCertificate(certificateId: string) {
  return useQuery({
    queryKey: eprKeys.detail(certificateId),
    queryFn: () => fetchEPRCertificateById(certificateId),
    enabled: !!certificateId,
  });
}

// Fetch EPR compliance metrics
export function useEPRComplianceMetrics(enterpriseId: string, complianceYear?: number) {
  return useQuery({
    queryKey: eprKeys.metrics(enterpriseId, complianceYear),
    queryFn: () => fetchEPRComplianceMetrics(enterpriseId, complianceYear),
    enabled: !!enterpriseId,
  });
}

// ============================================================================
// EPR CERTIFICATE MUTATIONS
// ============================================================================

// Create EPR certificate
export function useCreateEPRCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateEPRCertificateInput) => createEPRCertificate(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: eprKeys.all });
      queryClient.invalidateQueries({ queryKey: eprKeys.byEnterprise(variables.enterprise_id) });
    },
  });
}

// Update EPR certificate
export function useUpdateEPRCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ certificateId, input }: { certificateId: string; input: UpdateEPRCertificateInput }) =>
      updateEPRCertificate(certificateId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eprKeys.all });
    },
  });
}

// Approve EPR certificate
export function useApproveEPRCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      certificateId,
      approvedBy,
      issueDate,
      expiryDate,
    }: {
      certificateId: string;
      approvedBy: string;
      issueDate?: string;
      expiryDate?: string;
    }) => approveEPRCertificate(certificateId, approvedBy, issueDate, expiryDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eprKeys.all });
    },
  });
}

// Issue EPR certificate
export function useIssueEPRCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (certificateId: string) => issueEPRCertificate(certificateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eprKeys.all });
    },
  });
}

// Reject EPR certificate
export function useRejectEPRCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ certificateId, rejectionReason }: { certificateId: string; rejectionReason: string }) =>
      rejectEPRCertificate(certificateId, rejectionReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eprKeys.all });
    },
  });
}

// Delete EPR certificate
export function useDeleteEPRCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (certificateId: string) => deleteEPRCertificate(certificateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eprKeys.all });
    },
  });
}

// ============================================================================
// RECYCLER PARTNER QUERIES
// ============================================================================

// Fetch all recycler partners
export function useRecyclerPartners() {
  return useQuery({
    queryKey: recyclerKeys.lists(),
    queryFn: () => fetchRecyclerPartners(),
  });
}

// Fetch single recycler partner by ID
export function useRecyclerPartner(partnerId: string) {
  return useQuery({
    queryKey: recyclerKeys.detail(partnerId),
    queryFn: () => fetchRecyclerPartnerById(partnerId),
    enabled: !!partnerId,
  });
}

// ============================================================================
// RECYCLER PARTNER MUTATIONS
// ============================================================================

// Create recycler partner
export function useCreateRecyclerPartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateRecyclerPartnerInput) => createRecyclerPartner(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recyclerKeys.all });
    },
  });
}

// Update recycler partner
export function useUpdateRecyclerPartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      partnerId,
      input,
    }: {
      partnerId: string;
      input: Partial<CreateRecyclerPartnerInput> & { status?: 'active' | 'inactive' | 'suspended' };
    }) => updateRecyclerPartner(partnerId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recyclerKeys.all });
    },
  });
}

// Delete recycler partner
export function useDeleteRecyclerPartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (partnerId: string) => deleteRecyclerPartner(partnerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recyclerKeys.all });
    },
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const EPR_STATUS_LABELS: Record<string, string> = {
  pending_generation: 'Pending Generation',
  generated: 'Generated',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  issued: 'Issued',
  rejected: 'Rejected',
  expired: 'Expired',
};

export const EPR_STATUS_COLORS: Record<string, string> = {
  pending_generation: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-400',
  generated: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400',
  pending_approval: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-400',
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400',
  issued: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400',
  expired: 'bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-400',
};

export const TREATMENT_TYPE_LABELS: Record<string, string> = {
  recycled: 'Recycled',
  refurbished: 'Refurbished',
  resold: 'Resold',
  disposed: 'Disposed',
};

export const TREATMENT_TYPE_COLORS: Record<string, string> = {
  recycled: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400',
  refurbished: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400',
  resold: 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-400',
  disposed: 'bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-400',
};
