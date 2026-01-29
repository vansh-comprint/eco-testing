import type { Address, BankDetails } from './common';

export type EnterpriseStatus = 'active' | 'inactive' | 'pending_verification';

// Pickup Location managed by IT Admin
export interface PickupLocation {
  id: string;
  enterpriseId: string;
  name: string; // e.g., "Bangalore HQ", "Mumbai Office"
  address: string;
  city: string;
  pinCode: string;
  contactPerson: string;
  contactPhone: string;
  operatingHours: string; // e.g., "Mon-Fri, 9 AM - 6 PM"
  specialInstructions?: string; // Gate pass, parking, etc.
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreatePickupLocationInput {
  enterpriseId: string;
  name: string;
  address: string;
  city: string;
  pinCode: string;
  contactPerson: string;
  contactPhone: string;
  operatingHours: string;
  specialInstructions?: string;
  isDefault?: boolean;
}

export interface Enterprise {
  id: string;
  name: string;
  gstNumber?: string;
  address?: Address;
  bankDetails?: BankDetails;
  status: EnterpriseStatus;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  logoUrl?: string;
  pickupLocations?: PickupLocation[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateEnterpriseInput {
  name: string;
  gstNumber?: string;
  address?: Address;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface UpdateEnterpriseInput {
  name?: string;
  gstNumber?: string;
  address?: Address;
  bankDetails?: BankDetails;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  logoUrl?: string;
}

export interface EnterpriseStats {
  totalAssets: number;
  pendingAssets: number;
  acceptedAssets: number;
  rejectedAssets: number;
  totalPayout: number;
  pendingPayout: number;
}
