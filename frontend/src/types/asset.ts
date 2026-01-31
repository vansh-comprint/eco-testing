export type AssetStatus =
  | 'pending_assignment'
  | 'assigned'
  | 'check_in_started'
  | 'submitted'
  | 'remote_review'
  | 'conditionally_accepted'
  | 'remote_rejected'
  | 'disputed'
  // Pickup-related statuses (after OPS approval)
  | 'ready_for_pickup'      // OPS Manager approved, ready for IT Admin to initiate pickup
  | 'pickup_requested'      // IT Admin initiated pickup request
  | 'pickup_scheduled'      // Logistics assigned and date confirmed
  | 'pickup_failed_qc'      // Device failed on-site QC, not picked up
  | 'picked_up'             // Device collected by Logistics User
  // Warehouse flow
  | 'in_transit'
  | 'facility_qc'
  | 'final_accepted'
  | 'final_rejected'
  | 'payout_pending'
  | 'completed';

export type AssetGrade = 'A' | 'B' | 'C' | 'D';

export interface AssetSpecs {
  processor?: string;
  ram?: string;
  storage?: string;
  screenSize?: string;
  os?: string;
  gpu?: string;
}

// QC Checklist item
export interface QCChecklistItem {
  id: string;
  label: string;
  passed: boolean;
  notes?: string;
}

// QC Image
export interface QCImage {
  id: string;
  url: string;
  type: 'front' | 'back' | 'left' | 'right' | 'screen' | 'keyboard' | 'ports' | 'damage' | 'other';
  caption?: string;
  uploadedAt: Date;
}

// QC Report
export interface QCReport {
  checklist: QCChecklistItem[];
  images: QCImage[];
  notes?: string;
  grade?: AssetGrade;
  reviewer?: string;
  completedAt?: Date;
}

export type TreatmentOutcome = 'recycled' | 'refurbished' | 'resold' | 'disposed' | 'pending';

export interface Asset {
  id: string;
  enterpriseId: string;
  batchId?: string;
  serialNumber: string;
  brand: string;
  model: string;
  specs?: AssetSpecs;
  purchaseDate?: Date;
  status: AssetStatus;
  grade?: AssetGrade;
  assignedSubUserId?: string;
  assignedAt?: Date;
  basePrice?: number;
  finalPrice?: number;

  // QC Report (for reviewed/accepted assets)
  qcReport?: QCReport;

  // EPR/Treatment tracking
  treatmentOutcome?: TreatmentOutcome;
  treatmentDate?: Date;
  recyclerPartnerId?: string;
  eprCertificateId?: string;
  weightKg?: number;

  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateAssetInput {
  enterpriseId: string;
  batchId?: string;
  serialNumber: string;
  brand: string;
  model: string;
  specs?: AssetSpecs;
  purchaseDate?: Date;
  // Optional user assignment from CSV upload
  assignedEmail?: string;
  assignedName?: string;
  assignedDepartment?: string;
}

export interface UpdateAssetInput {
  batchId?: string;
  brand?: string;
  model?: string;
  specs?: AssetSpecs;
  purchaseDate?: Date;
  status?: AssetStatus;
  grade?: AssetGrade;
  // Post-QC / treatment data
  treatmentOutcome?: TreatmentOutcome;
  treatmentDate?: Date;
  recyclerPartnerId?: string;
  weightKg?: number;
  eprCertificateId?: string;
}

export interface AssignSubUserInput {
  assetId: string;
  email: string;
  phone?: string;
  name?: string;
}

// Asset status workflow
export const assetStatusFlow: Record<AssetStatus, AssetStatus[]> = {
  pending_assignment: ['assigned'],
  assigned: ['check_in_started'],
  check_in_started: ['submitted'],
  submitted: ['remote_review'],
  remote_review: ['conditionally_accepted', 'remote_rejected'],
  conditionally_accepted: ['ready_for_pickup'], // OPS approval leads to ready for pickup
  remote_rejected: ['disputed'],
  disputed: ['conditionally_accepted', 'remote_rejected'],
  // Pickup flow
  ready_for_pickup: ['pickup_requested'],
  pickup_requested: ['pickup_scheduled', 'ready_for_pickup'], // Can revert if cancelled
  pickup_scheduled: ['picked_up', 'pickup_failed_qc'], // Either picked or failed on-site QC
  pickup_failed_qc: ['ready_for_pickup', 'disputed'], // Can retry pickup or dispute
  picked_up: ['in_transit'],
  // Warehouse flow
  in_transit: ['facility_qc'],
  facility_qc: ['final_accepted', 'final_rejected'],
  final_accepted: ['payout_pending'],
  final_rejected: ['disputed'],
  payout_pending: ['completed'],
  completed: [],
};

export const assetStatusLabels: Record<AssetStatus, string> = {
  pending_assignment: 'Pending Assignment',
  assigned: 'Assigned',
  check_in_started: 'Check-in Started',
  submitted: 'Awaiting Verification',
  remote_review: 'Awaiting Verification',
  conditionally_accepted: 'Verified',
  remote_rejected: 'Rejected',
  disputed: 'Disputed',
  // Pickup statuses
  ready_for_pickup: 'Ready for Pickup',
  pickup_requested: 'Pickup Requested',
  pickup_scheduled: 'Scheduled for Pickup',
  pickup_failed_qc: 'Pickup Failed QC',
  picked_up: 'Pickup Completed',
  // Warehouse flow
  in_transit: 'In Transit',
  facility_qc: 'Facility QC',
  final_accepted: 'Verified (Final)',
  final_rejected: 'Rejected (Final)',
  payout_pending: 'Payout Pending',
  completed: 'Completed',
};

export const gradeModifiers: Record<AssetGrade, number> = {
  A: 0,
  B: -500,
  C: -1500,
  D: -3000,
};
