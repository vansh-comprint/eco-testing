// EPR (Extended Producer Responsibility) Certificate Types

export type EPRCertificateStatus =
  | 'pending_generation'
  | 'generated'
  | 'pending_approval'
  | 'approved'
  | 'issued'
  | 'rejected'
  | 'expired';

export type TreatmentType = 'recycled' | 'refurbished' | 'resold' | 'disposed';

export type RecyclerPartnerStatus = 'active' | 'inactive' | 'pending_verification';

// EPR Certificate entity
export interface EPRCertificate {
  id: string;
  enterpriseId: string;
  batchId?: string;
  certificateNumber: string;
  status: EPRCertificateStatus;

  // Asset details
  assetIds: string[];
  totalAssets: number;
  totalWeight: number; // in kg

  // Treatment breakdown
  treatmentBreakdown: {
    recycled: number;
    refurbished: number;
    resold: number;
    disposed: number;
  };

  // Recycler/Partner info
  recyclerPartnerId?: string;
  recyclerPartnerName?: string;

  // Dates
  processingDate: Date;
  issuedDate?: Date;
  expiryDate?: Date;
  createdAt: Date;
  updatedAt?: Date;

  // Document URLs
  certificateUrl?: string;
  supportingDocuments?: string[];

  // Compliance info
  complianceYear: number;
  regulatoryBody?: string;

  // Notes/remarks
  notes?: string;
  rejectionReason?: string;
}

// Recycler Partner entity
export interface RecyclerPartner {
  id: string;
  name: string;
  registrationNumber: string;
  status: RecyclerPartnerStatus;

  // Contact info
  contactPerson: string;
  email: string;
  phone: string;

  // Address
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };

  // Certifications
  certifications: {
    type: string;
    number: string;
    issuedBy: string;
    validUntil: Date;
  }[];

  // Capabilities
  capabilities: TreatmentType[];
  maxCapacityKgPerMonth: number;

  // Tracking
  totalAssetsProcessed: number;
  totalWeightProcessed: number;

  createdAt: Date;
  updatedAt?: Date;
}

// Treatment Record - tracks individual asset treatment
export interface TreatmentRecord {
  id: string;
  assetId: string;
  eprCertificateId?: string;
  recyclerPartnerId: string;

  treatmentType: TreatmentType;
  treatmentDate: Date;

  // Weight/quantity
  weightKg: number;

  // For refurbished/resold
  resaleValue?: number;
  resaleBuyerId?: string;

  // For recycled
  materialRecovered?: {
    type: string;
    weightKg: number;
  }[];

  // Documents
  treatmentProof?: string;

  createdAt: Date;
}

// Input types for creating records
export interface CreateEPRCertificateInput {
  enterpriseId: string;
  batchId?: string;
  assetIds: string[];
  recyclerPartnerId?: string;
  complianceYear: number;
  notes?: string;
}

export interface CreateRecyclerPartnerInput {
  name: string;
  registrationNumber: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: RecyclerPartner['address'];
  capabilities: TreatmentType[];
  maxCapacityKgPerMonth: number;
}

export interface CreateTreatmentRecordInput {
  assetId: string;
  eprCertificateId?: string;
  recyclerPartnerId: string;
  treatmentType: TreatmentType;
  treatmentDate: Date;
  weightKg: number;
  resaleValue?: number;
  materialRecovered?: {
    type: string;
    weightKg: number;
  }[];
}

// Status labels
export const eprStatusLabels: Record<EPRCertificateStatus, string> = {
  pending_generation: 'Pending Generation',
  generated: 'Generated',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  issued: 'Issued',
  rejected: 'Rejected',
  expired: 'Expired',
};

export const treatmentTypeLabels: Record<TreatmentType, string> = {
  recycled: 'Recycled',
  refurbished: 'Refurbished',
  resold: 'Resold',
  disposed: 'Disposed',
};

export const recyclerStatusLabels: Record<RecyclerPartnerStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  pending_verification: 'Pending Verification',
};

// EPR compliance metrics
export interface EPRComplianceMetrics {
  enterpriseId: string;
  complianceYear: number;

  // Targets
  targetWeightKg: number;
  targetCertificates: number;

  // Achieved
  achievedWeightKg: number;
  achievedCertificates: number;

  // Breakdown by treatment
  breakdownByTreatment: Record<TreatmentType, number>;

  // Compliance percentage
  compliancePercentage: number;

  // Status
  isCompliant: boolean;
  shortfallKg: number;
}
