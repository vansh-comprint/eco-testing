/**
 * Logistics & On-Site QC Types
 * Used by Logistics Users during pickup execution
 */

export type OnSiteQCResult = 'pass' | 'fail';

export interface OnSiteQCCheck {
  serialNumberMatch: boolean;      // Does S/N match what was submitted?
  devicePowersOn: boolean;         // Can the device boot?
  conditionMatch: boolean;         // Does physical condition match submission?
  notes?: string;                  // Any additional observations
}

export interface OnSiteQC {
  id: string;
  assetId: string;
  pickupRequestId: string;

  // QC Checks
  checks: OnSiteQCCheck;
  result: OnSiteQCResult;          // Overall result

  // Photos
  photoUrls: string[];             // On-site verification photos

  // Failure Details (if result === 'fail')
  failureReason?: string;
  failureCategory?:
    | 'serial_mismatch'
    | 'device_not_powering'
    | 'condition_mismatch'
    | 'device_not_available'
    | 'other';

  // Metadata
  performedBy: string;             // Logistics User ID
  performedAt: Date;
  location: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
}

export interface PickupProof {
  id: string;
  pickupRequestId: string;

  // Proof of Pickup
  signatureName: string;           // Who handed over the devices
  signatureTitle?: string;         // Their role/title
  signatureImageUrl?: string;      // Digital signature image
  handoverPhotoUrls: string[];     // Photos of devices being handed over

  // Packing & Transport
  packagingPhotoUrls?: string[];   // How devices were packed
  transportPhotoUrls?: string[];   // Devices loaded in vehicle

  // Summary
  totalDevicesCollected: number;
  deviceConditionNotes?: string;

  // Metadata
  collectedBy: string;             // Logistics User ID
  collectedAt: Date;
  location: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
}

export interface CreateOnSiteQCInput {
  assetId: string;
  checks: OnSiteQCCheck;
  photoUrls: string[];
  failureReason?: string;
  failureCategory?: OnSiteQC['failureCategory'];
}

export interface CreatePickupProofInput {
  pickupRequestId: string;
  signatureName: string;
  signatureTitle?: string;
  signatureImageUrl?: string;
  handoverPhotoUrls: string[];
  packagingPhotoUrls?: string[];
  transportPhotoUrls?: string[];
  totalDevicesCollected: number;
  deviceConditionNotes?: string;
}

export interface LogisticsUserStats {
  totalPickupsCompleted: number;
  totalDevicesCollected: number;
  averageQCPassRate: number;
  currentAssignedPickups: number;
  upcomingPickups: number;
}
