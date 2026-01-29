export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Payout {
  id: string;
  batchId: string;
  assetId: string;
  enterpriseId: string;
  basePrice: number;
  gradeModifier: number;
  logisticsCharge: number;
  finalAmount: number;
  status: PayoutStatus;
  transactionId?: string;
  paidAt?: Date;
  createdAt: Date;
}

export interface PayoutSummary {
  totalAssets: number;
  totalBasePrice: number;
  totalGradeModifier: number;
  totalLogisticsCharge: number;
  totalFinalAmount: number;
  pendingCount: number;
  completedCount: number;
}

export interface PricingCatalog {
  id: string;
  brand: string;
  model: string;
  specs?: {
    processor?: string;
    ram?: string;
    storage?: string;
  };
  basePrice: number;
  gradeModifiers: {
    A: number;
    B: number;
    C: number;
    D: number;
  };
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreatePricingInput {
  brand: string;
  model: string;
  specs?: {
    processor?: string;
    ram?: string;
    storage?: string;
  };
  basePrice: number;
  gradeModifiers?: {
    A: number;
    B: number;
    C: number;
    D: number;
  };
}

export const defaultGradeModifiers = {
  A: 0,
  B: -500,
  C: -1500,
  D: -3000,
};

export const LOGISTICS_CHARGE = 150;

export const payoutStatusLabels: Record<PayoutStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
};
