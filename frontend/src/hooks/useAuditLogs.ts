/**
 * React Query Hooks for Audit Logs
 * Handles audit history operations for review tracking
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAuditHistory,
  fetchRecentAuditLogs,
  fetchAuditLogsByActor,
} from '@/lib/db/queries';
import { createAuditLog, CreateAuditLogInput } from '@/lib/db/mutations';

// Query keys
export const auditKeys = {
  all: ['audit-logs'] as const,
  lists: () => [...auditKeys.all, 'list'] as const,
  history: (entityType: string, entityId: string) =>
    [...auditKeys.all, 'history', entityType, entityId] as const,
  recent: (limit?: number, entityType?: string) =>
    [...auditKeys.all, 'recent', limit, entityType] as const,
  byActor: (actorId: string) => [...auditKeys.all, 'by-actor', actorId] as const,
};

// Types
export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  from_status?: string;
  to_status?: string;
  actor_id?: string;
  actor_type?: 'user' | 'system';
  metadata?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  // Enhanced with actor details
  actor?: {
    name: string;
    email: string;
  } | null;
}

/**
 * Fetch audit history for a specific entity
 * Returns full audit trail with actor details
 */
export function useAuditHistory(entityType: string, entityId: string) {
  return useQuery({
    queryKey: auditKeys.history(entityType, entityId),
    queryFn: async () => {
      const data = await fetchAuditHistory(entityType, entityId);
      return (data || []) as AuditLog[];
    },
    enabled: !!entityType && !!entityId,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Fetch recent audit logs (for dashboard/admin view)
 * Optionally filter by entity type
 */
export function useRecentAuditLogs(limit = 50, entityType?: string) {
  return useQuery({
    queryKey: auditKeys.recent(limit, entityType),
    queryFn: async () => {
      const data = await fetchRecentAuditLogs(limit, entityType);
      return (data || []) as AuditLog[];
    },
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Fetch audit logs by actor (who did what)
 */
export function useAuditLogsByActor(actorId: string, limit = 100) {
  return useQuery({
    queryKey: auditKeys.byActor(actorId),
    queryFn: async () => {
      const data = await fetchAuditLogsByActor(actorId, limit);
      return (data || []) as AuditLog[];
    },
    enabled: !!actorId,
    staleTime: 30000,
  });
}

/**
 * Create audit log mutation
 * Use this to log review actions
 */
export function useCreateAuditLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAuditLogInput) => {
      return await createAuditLog(input);
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: auditKeys.history(variables.entity_type, variables.entity_id),
      });
      queryClient.invalidateQueries({
        queryKey: auditKeys.lists(),
      });
    },
  });
}

/**
 * Helper function to format audit action for display
 */
export function formatAuditAction(action: string): string {
  const actionMap: Record<string, string> = {
    // Application reviews
    application_document_reviewed: 'Document Reviewed',
    application_approved: 'Application Approved',
    application_rejected: 'Application Rejected',
    application_info_requested: 'More Info Requested',
    // Asset reviews
    remote_review_accepted: 'Remote Review Accepted',
    remote_review_rejected: 'Remote Review Rejected',
    // Facility QC
    facility_qc_completed: 'Facility QC Completed',
    facility_qc_accepted: 'Final QC Accepted',
    facility_qc_rejected: 'Final QC Rejected',
    // Pickup assignments
    pickup_assigned: 'Pickup Assigned',
    pickup_reassigned: 'Pickup Reassigned',
    pickup_completed: 'Pickup Completed',
    pickup_cancelled: 'Pickup Cancelled',
    // Batch actions
    batch_approved: 'Batch Approved',
    batch_rejected: 'Batch Rejected',
    batch_submitted: 'Batch Submitted',
    // Enterprise actions
    enterprise_updated: 'Enterprise Updated',
    enterprise_status_changed: 'Status Changed',
    // Generic
    created: 'Created',
    updated: 'Updated',
    deleted: 'Deleted',
  };

  return actionMap[action] || action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Helper to get action color class based on action type
 */
export function getAuditActionColor(action: string): string {
  if (action.includes('approved') || action.includes('accepted') || action.includes('completed')) {
    return 'text-emerald-500';
  }
  if (action.includes('rejected') || action.includes('cancelled')) {
    return 'text-red-500';
  }
  if (action.includes('requested') || action.includes('assigned')) {
    return 'text-amber-500';
  }
  return 'text-blue-500';
}
