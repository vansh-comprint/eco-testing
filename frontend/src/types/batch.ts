// Batch types - V3 Updated

export type BatchStatus =
  | 'draft'
  | 'pending_approval'        // Awaits Org Admin approval
  | 'approved'                // Org Admin approved
  | 'rejected'                // Org Admin rejected
  | 'pickup_in_progress'      // At least one pickup created
  | 'completed'
  | 'cancelled';

export interface BatchProgressStats {
  total: number;
  pending_assignment: number;
  assigned: number;
  in_review: number;
  verified: number;
  in_pickup: number;
  picked_up: number;
  completed: number;
  rejected: number;
}

export interface Batch {
  id: string;
  enterpriseId: string;
  branchId?: string;          // V3: Batch belongs to a branch
  name: string;
  description?: string;
  status: BatchStatus;
  assetCount: number;
  acceptedCount: number;
  rejectedCount: number;
  pendingCount: number;
  totalPayout: number;
  estimatedValue: number;

  // V3: Pickup details (IT Admin fills when submitting for approval)
  pickupLocationOverride?: string;
  preferredPickupDate?: string;
  preferredPickupSlot?: 'morning' | 'afternoon' | 'evening';
  pickupPriority?: 'normal' | 'urgent';
  itAdminNotes?: string;
  logisticsInstructions?: string;

  // Approval fields (Org Admin approval)
  requiresApproval: boolean;
  submittedForApprovalAt?: Date;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
  orgAdminNotes?: string;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;

  // EPR tracking
  eprCertificateId?: string;
  eprStatus?: 'not_started' | 'pending' | 'issued';

  // Progress (computed by backend)
  progress?: BatchProgressStats;

  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
  completedAt?: Date;
}

export interface CreateBatchInput {
  enterpriseId: string;
  branchId?: string;          // V3: Required for branch-scoped batches
  name: string;
  description?: string;
  estimatedValue?: number;
}

export interface UpdateBatchInput {
  name?: string;
  description?: string;
  status?: BatchStatus;
  assetCount?: number;
  acceptedCount?: number;
  rejectedCount?: number;
  pendingCount?: number;
  totalPayout?: number;
  estimatedValue?: number;
  requiresApproval?: boolean;
  submittedAt?: Date;
  approvedAt?: Date;
  completedAt?: Date;
}

// Pickup approval input
export interface PickupApprovalInput {
  batchId: string;
  approved: boolean;
  rejectionReason?: string;
  notes?: string;
}

// Migration: Legacy CFOApprovalInput removed. Use PickupApprovalInput instead.

export const batchStatusLabels: Record<BatchStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  pickup_in_progress: 'Pickup In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// V3: Check if batch requires Org Admin approval based on thresholds
export function requiresOrgAdminApproval(assetCount: number, estimatedValue: number): boolean {
  const thresholds = {
    batchSize: 50,
    batchValue: 500000,
  };
  return assetCount >= thresholds.batchSize || estimatedValue >= thresholds.batchValue;
}

// Migration: Legacy requiresCfoApproval removed. Use requiresOrgAdminApproval instead.
