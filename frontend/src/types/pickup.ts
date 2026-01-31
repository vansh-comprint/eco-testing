import type { PickupLocation } from './enterprise';

// Pickup Request Status
export type PickupRequestStatus =
  | 'pending'                       // Created, waiting for Logistics Admin assignment
  | 'assigned_to_logistics_admin'   // Assigned to a Logistics Admin
  | 'assigned_to_logistics_user'    // Logistics Admin assigned to a field driver
  | 'scheduled'                     // Date/time confirmed
  | 'in_progress'                   // Logistics User at location
  | 'completed'                     // All devices processed
  | 'failed'                        // Pickup failed
  | 'cancelled';                    // Request cancelled

// Priority levels
export type PickupPriority = 'low' | 'normal' | 'high' | 'urgent';

// Time slots for pickup
export type PickupTimeSlot = 'morning' | 'afternoon' | 'evening';

export const pickupTimeSlotLabels: Record<PickupTimeSlot, string> = {
  morning: '9:00 AM - 12:00 PM',
  afternoon: '12:00 PM - 4:00 PM',
  evening: '4:00 PM - 7:00 PM',
};

// Individual asset pickup status within a request
export type AssetPickupStatus =
  | 'pending'        // Waiting for pickup
  | 'picked_up'      // Successfully picked up
  | 'no_show'        // Employee didn't show up
  | 'qc_failed'      // Failed on-site QC
  | 'removed';       // Removed from request by IT Admin

export interface AssetPickupRecord {
  assetId: string;
  subUserId: string;
  status: AssetPickupStatus;
  pickedUpAt?: Date;
  notes?: string;
  qcResult?: {
    serialMatch: boolean;
    damageMatch: boolean;
    powersOn: boolean;
    notes?: string;
  };
}

// Pickup Request created by IT Admin
export interface PickupRequest {
  id: string;
  enterpriseId: string;
  locationId: string;
  location: PickupLocation;
  batchId?: string;                // Optional: group multiple pickups

  // Assets included in this request
  assetIds: string[];
  assets: AssetPickupRecord[];

  // Schedule
  preferredDate: Date;
  preferredTimeSlot: PickupTimeSlot;
  confirmedDate?: Date;
  confirmedTimeSlot?: PickupTimeSlot;
  scheduledDate?: Date;            // When Logistics User will actually pickup

  // Priority and notes
  priority: PickupPriority;
  specialInstructions?: string;    // From IT Admin
  itAdminNotes?: string;
  logisticsNotes?: string;         // Internal notes from Logistics Admin
  internalNotes?: string;

  // Assignment
  logisticsAdminId?: string;
  assignedToUserId?: string;       // Logistics User ID (alias for logisticsUserId)
  logisticsUserId?: string;
  assignedAt?: Date;
  assignedBy?: string;             // Logistics Admin ID

  // Status tracking
  status: PickupRequestStatus;

  // Results (filled after pickup)
  pickedAssetIds: string[];        // Assets successfully picked
  failedAssetIds: string[];        // Assets that failed on-site QC

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelledBy?: string;
  cancellationReason?: string;

  // Created by
  createdBy: string; // IT Admin user ID
}

export interface CreatePickupRequestInput {
  locationId: string;
  assetIds: string[];
  preferredDate: Date;
  preferredTimeSlot: PickupTimeSlot;
  priority?: PickupPriority;
  specialInstructions?: string;
  notes?: string;
}

export interface UpdatePickupRequestInput {
  locationId?: string;
  assetIds?: string[];
  preferredDate?: Date;
  preferredTimeSlot?: PickupTimeSlot;
  priority?: PickupPriority;
  specialInstructions?: string;
  status?: PickupRequestStatus;
}

export interface AssignPickupInput {
  pickupRequestId: string;
  logisticsUserId: string;
  scheduledDate?: Date;
  internalNotes?: string;
}

// Stats for pickup dashboard
export interface PickupStats {
  readyForPickup: number;      // Assets ready to be included in pickup
  pendingAssignment: number;   // Requests waiting for assignment
  requested: number;           // Pending requests (legacy)
  assigned: number;            // Assigned to logistics users
  scheduled: number;           // Confirmed pickups
  inProgress: number;          // Ongoing pickups
  completed: number;           // Completed pickups
  cancelled: number;           // Cancelled requests
  exceptions: number;          // No-shows, QC failures

  // Asset stats
  totalAssets: number;
  pickedAssets: number;
  failedAssets: number;
  pendingAssets: number;
}

export interface PickupRequestSummary {
  totalRequests: number;
  pendingAssignment: number;
  assigned: number;
  inProgress: number;
  completed: number;
  cancelled: number;

  totalAssets: number;
  pickedAssets: number;
  failedAssets: number;
  pendingAssets: number;
}

export interface PickupCalendarEvent {
  id: string;
  pickupRequestId: string;
  date: Date;
  locationName: string;
  assetCount: number;
  status: PickupRequestStatus;
  assignedToName?: string;
}
