// Batch types - V3 Updated

export type BatchStatus =
  | 'draft'
  | 'pending_approval'        // V3: Was 'pending_cfo_approval' - awaits Org Admin approval
  | 'approved'                // V3: Was 'cfo_approved'
  | 'rejected'                // V3: Was 'cfo_rejected'
  | 'active'
  | 'in_progress'
  | 'pickup_scheduled'        // V3: New - after approval, pickup is scheduled
  | 'picked_up'               // V3: New - devices collected
  | 'completed'
  | 'cancelled';

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

  // V3: Approval fields (was CFO approval)
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

// V3: Pickup approval input (was CFOApprovalInput)
export interface PickupApprovalInput {
  batchId: string;
  approved: boolean;
  rejectionReason?: string;
  notes?: string;
}

// Deprecated: Use PickupApprovalInput instead
export interface CFOApprovalInput extends PickupApprovalInput {}

export const batchStatusLabels: Record<BatchStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',     // V3: Was 'Pending CFO Approval'
  approved: 'Approved',                     // V3: Was 'CFO Approved'
  rejected: 'Rejected',                     // V3: Was 'CFO Rejected'
  active: 'Active',
  in_progress: 'In Progress',
  pickup_scheduled: 'Pickup Scheduled',     // V3: New
  picked_up: 'Picked Up',                   // V3: New
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

// Deprecated: Use requiresOrgAdminApproval instead
export const requiresCfoApproval = requiresOrgAdminApproval;
