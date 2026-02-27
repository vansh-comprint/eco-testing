/**
 * Centralized Status Display Labels
 * User-friendly labels for asset and batch statuses
 *
 * Key changes from V2:
 * - "In Progress" → "Awaiting Verification" (for submitted items)
 * - "Accepted" → "Verified"
 * - "Scheduled" → "Scheduled for Pickup"
 * - "Picked Up" → "Pickup Completed"
 * - Legacy status keys kept as backwards-compatible aliases for old database values
 */

import type { AssetStatus, BatchStatus } from '@/types';

// ============================================
// ASSET STATUS DISPLAY
// ============================================

export interface StatusDisplayConfig {
  label: string;
  variant: 'default' | 'success' | 'warning' | 'error' | 'info';
  description?: string;
}

export const ASSET_STATUS_DISPLAY: Record<AssetStatus, StatusDisplayConfig> = {
  pending_assignment: {
    label: 'Pending Assignment',
    variant: 'default',
    description: 'Asset is waiting to be assigned to an employee'
  },
  assigned: {
    label: 'Assigned',
    variant: 'info',
    description: 'Asset has been assigned to an employee for check-in'
  },
  check_in_started: {
    label: 'Check-in Started',
    variant: 'info',
    description: 'Employee has started the check-in process'
  },
  submitted: {
    label: 'Awaiting Verification',
    variant: 'warning',
    description: 'Submission complete, waiting for remote verification'
  },
  remote_review: {
    label: 'Awaiting Verification',
    variant: 'warning',
    description: 'Under remote review by reviewer'
  },
  conditionally_accepted: {
    label: 'Verified',
    variant: 'success',
    description: 'Conditionally verified, ready for pickup'
  },
  remote_rejected: {
    label: 'Rejected',
    variant: 'error',
    description: 'Rejected during remote verification'
  },
  disputed: {
    label: 'Disputed',
    variant: 'warning',
    description: 'Asset is under dispute review'
  },
  ready_for_pickup: {
    label: 'Ready for Pickup',
    variant: 'success',
    description: 'Asset is ready to be picked up'
  },
  pickup_requested: {
    label: 'Pickup Requested',
    variant: 'info',
    description: 'Pickup request has been submitted'
  },
  pickup_scheduled: {
    label: 'Scheduled for Pickup',
    variant: 'info',
    description: 'Pickup has been scheduled'
  },
  pickup_failed_qc: {
    label: 'Pickup Failed QC',
    variant: 'error',
    description: 'Device failed on-site QC during pickup'
  },
  picked_up: {
    label: 'Pickup Completed',
    variant: 'success',
    description: 'Asset has been picked up'
  },
  in_transit: {
    label: 'In Transit',
    variant: 'info',
    description: 'Asset is in transit to facility'
  },
  facility_qc: {
    label: 'Quality Check',
    variant: 'warning',
    description: 'Asset is undergoing facility QC'
  },
  final_accepted: {
    label: 'Verified (Final)',
    variant: 'success',
    description: 'Asset has passed final verification'
  },
  final_rejected: {
    label: 'Rejected (Final)',
    variant: 'error',
    description: 'Asset was rejected during final QC'
  },
  payout_pending: {
    label: 'Payout Pending',
    variant: 'warning',
    description: 'Waiting for payout processing'
  },
  completed: {
    label: 'Completed',
    variant: 'success',
    description: 'Asset processing complete'
  },
};

// Filter dropdown options for asset list
export const ASSET_STATUS_FILTER_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Pending Assignment', value: 'pending_assignment' },
  { label: 'Assigned', value: 'assigned' },
  { label: 'Check-in Started', value: 'check_in_started' },
  { label: 'Awaiting Verification', value: 'submitted' },
  { label: 'Awaiting Verification (All)', value: 'in_review' },
  { label: 'Verified (All)', value: 'accepted' },
  { label: 'Rejected (All)', value: 'rejected' },
  { label: 'Verified (Remote)', value: 'conditionally_accepted' },
  { label: 'Rejected (Remote)', value: 'remote_rejected' },
  { label: 'Disputed', value: 'disputed' },
  { label: 'Ready for Pickup', value: 'ready_for_pickup' },
  { label: 'Pickup Requested', value: 'pickup_requested' },
  { label: 'Scheduled for Pickup', value: 'pickup_scheduled' },
  { label: 'Pickup Completed', value: 'picked_up' },
  { label: 'In Transit', value: 'in_transit' },
  { label: 'Quality Check', value: 'facility_qc' },
  { label: 'Verified (Final)', value: 'final_accepted' },
  { label: 'Rejected (Final)', value: 'final_rejected' },
  { label: 'Payout Pending', value: 'payout_pending' },
  { label: 'Completed', value: 'completed' },
];

// Status groups for filtering
export const ASSET_STATUS_GROUPS: Record<string, AssetStatus[]> = {
  in_review: ['submitted', 'remote_review', 'facility_qc'],
  accepted: ['conditionally_accepted', 'final_accepted', 'ready_for_pickup', 'pickup_requested', 'pickup_scheduled', 'pickup_failed_qc', 'picked_up', 'in_transit', 'payout_pending'],
  rejected: ['remote_rejected', 'final_rejected', 'disputed'],
  awaiting_verification: ['submitted', 'remote_review'],
  // V3.2: Ready for pickup - only assets explicitly approved for pickup by org admin
  ready_for_pickup: ['ready_for_pickup'],
  // Verified by remote review but not yet org-admin approved
  verified: ['conditionally_accepted'],
  // V3.2: In progress excludes conditionally_accepted (those are ready for pickup)
  in_progress: ['assigned', 'check_in_started', 'submitted', 'remote_review', 'pickup_requested', 'pickup_scheduled', 'picked_up', 'in_transit', 'facility_qc'],
  // Matches backend asset_in_review stat: all in-flight statuses (review + pickup + transit + QC)
  processing: ['assigned', 'check_in_started', 'submitted', 'remote_review', 'disputed', 'ready_for_pickup', 'pickup_requested', 'pickup_scheduled', 'pickup_failed_qc', 'picked_up', 'in_transit', 'facility_qc'],
  // Matches backend _ASSET_ACCEPTED: conditionally_accepted + final_accepted + ready_for_pickup
  ready: ['conditionally_accepted', 'final_accepted', 'ready_for_pickup'],
};

// Helper function to get display config
export function getAssetStatusDisplay(status: AssetStatus): StatusDisplayConfig {
  return ASSET_STATUS_DISPLAY[status] || { label: status, variant: 'default' };
}

// ============================================
// BATCH STATUS DISPLAY
// ============================================

export const BATCH_STATUS_DISPLAY: Record<string, StatusDisplayConfig> = {
  draft: {
    label: 'Draft',
    variant: 'default',
    description: 'Batch is being prepared'
  },
  pending_approval: {
    label: 'Pending Approval',
    variant: 'warning',
    description: 'Waiting for Org Admin approval'
  },
  // Backwards-compatible aliases for legacy DB status strings
  pending_cfo_approval: {
    label: 'Pending Org Admin Approval',
    variant: 'warning',
    description: 'Waiting for Org Admin approval'
  },
  approved: {
    label: 'Approved',
    variant: 'success',
    description: 'Batch has been approved'
  },
  cfo_approved: {
    label: 'Org Admin Approved',
    variant: 'success',
    description: 'Batch has been approved'
  },
  rejected: {
    label: 'Rejected',
    variant: 'error',
    description: 'Batch was rejected'
  },
  cfo_rejected: {
    label: 'Org Admin Rejected',
    variant: 'error',
    description: 'Batch was rejected'
  },
  pickup_in_progress: {
    label: 'Pickup In Progress',
    variant: 'info',
    description: 'Pickup has been initiated for this batch'
  },
  // Backwards-compatible aliases for legacy DB status strings
  active: {
    label: 'Active',
    variant: 'info',
    description: 'Batch is currently being processed'
  },
  in_progress: {
    label: 'Processing',
    variant: 'info',
    description: 'Assets in batch are being processed'
  },
  completed: {
    label: 'Completed',
    variant: 'success',
    description: 'All assets in batch have been processed'
  },
  cancelled: {
    label: 'Cancelled',
    variant: 'default',
    description: 'Batch has been cancelled'
  },
};

// Filter dropdown options for batch list
export const BATCH_STATUS_FILTER_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'Pending Approval', value: 'pending_approval' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Pickup In Progress', value: 'pickup_in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

// Helper function to get display config
export function getBatchStatusDisplay(status: BatchStatus): StatusDisplayConfig {
  return BATCH_STATUS_DISPLAY[status] || { label: status, variant: 'default' };
}

// ============================================
// PICKUP STATUS DISPLAY
// ============================================

export const PICKUP_STATUS_DISPLAY: Record<string, StatusDisplayConfig> = {
  pending: { label: 'Pending', variant: 'default' },
  assigned_to_logistics_admin: { label: 'Assigned to Admin', variant: 'info' },
  assigned_to_logistics_user: { label: 'Assigned to Driver', variant: 'info' },
  scheduled: { label: 'Scheduled', variant: 'info' },
  in_progress: { label: 'In Progress', variant: 'warning' },
  completed: { label: 'Completed', variant: 'success' },
  failed: { label: 'Failed', variant: 'error' },
  cancelled: { label: 'Cancelled', variant: 'default' },
};

// ============================================
// SUB-USER STATUS DISPLAY
// ============================================

export const SUB_USER_STATUS_DISPLAY: Record<string, StatusDisplayConfig> = {
  pending_invite: { label: 'Pending Invite', variant: 'default' },
  invited: { label: 'Invited', variant: 'info' },
  active: { label: 'Active', variant: 'success' },
  inactive: { label: 'Inactive', variant: 'default' },
};

// ============================================
// USER/IT ADMIN STATUS DISPLAY
// ============================================

export const USER_STATUS_DISPLAY: Record<string, StatusDisplayConfig> = {
  active: { label: 'Active', variant: 'success' },
  inactive: { label: 'Inactive', variant: 'default' },
  suspended: { label: 'Suspended', variant: 'error' },
};
