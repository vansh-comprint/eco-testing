import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { triggerNotification } from './notificationStore';
import { useAuditStore } from './auditStore';
import type {
  PickupLocation,
  CreatePickupLocationInput,
  PickupRequest,
  CreatePickupRequestInput,
  UpdatePickupRequestInput,
  AssignPickupInput,
  PickupRequestStatus,
  AssetPickupRecord,
  PickupStats,
  PickupRequestSummary,
} from '@/types';
import { useAssetStore } from './assetStore';
import { db } from '@/lib/database';

interface PickupState {
  // Pickup Locations
  pickupLocations: PickupLocation[];

  // Pickup Requests
  pickupRequests: PickupRequest[];

  isLoading: boolean;

  // Pickup Location Actions
  getLocationsByEnterprise: (enterpriseId: string) => PickupLocation[];
  getLocationById: (id: string) => PickupLocation | undefined;
  createLocation: (input: CreatePickupLocationInput) => Promise<PickupLocation>;
  updateLocation: (id: string, updates: Partial<PickupLocation>) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;
  setDefaultLocation: (id: string, enterpriseId: string) => Promise<void>;

  // Pickup Request Actions
  getRequestsByEnterprise: (enterpriseId: string) => PickupRequest[];
  getRequestById: (id: string) => PickupRequest | undefined;
  getPendingAssignmentRequests: () => PickupRequest[];
  getRequestsForLogisticsAdmin: (logisticsAdminId: string) => PickupRequest[];
  getAssignedRequests: (logisticsUserId: string) => PickupRequest[];
  createPickupRequest: (input: CreatePickupRequestInput, enterpriseId: string, createdBy: string) => Promise<PickupRequest>;
  updatePickupRequest: (id: string, updates: UpdatePickupRequestInput) => Promise<void>;
  assignToLogisticsAdmin: (pickupRequestId: string, logisticsAdminId: string, assignedBy: string) => Promise<void>;
  assignPickupRequest: (input: AssignPickupInput, assignedBy: string) => Promise<void>;
  updateRequestStatus: (id: string, status: PickupRequestStatus) => Promise<void>;
  cancelRequest: (id: string, cancelledBy: string, reason?: string) => Promise<void>;
  removeAssetFromRequest: (requestId: string, assetId: string) => Promise<void>;
  updateAssetPickupStatus: (requestId: string, assetId: string, record: Partial<AssetPickupRecord>) => Promise<void>;
  completePickup: (requestId: string, pickedAssetIds: string[], failedAssetIds: string[]) => Promise<void>;

  // Stats
  getPickupStats: (enterpriseId: string) => PickupStats;
  getPickupRequestSummary: () => PickupRequestSummary;
}

const generateId = () => `pickup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const generateLocationId = () => `loc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const usePickupStore = create<PickupState>()(
  persist(
    (set, get) => ({
      pickupLocations: [],
      pickupRequests: [],
      isLoading: false,

      // Pickup Location Actions
      getLocationsByEnterprise: (enterpriseId: string) => {
        return get().pickupLocations.filter(l => l.enterpriseId === enterpriseId && l.isActive);
      },

      getLocationById: (id: string) => {
        return get().pickupLocations.find(l => l.id === id);
      },

      createLocation: async (input: CreatePickupLocationInput) => {
        set({ isLoading: true });

        try {
          const locationId = generateLocationId();
          const locations = get().pickupLocations;
          const hasDefault = locations.some(l => l.enterpriseId === input.enterpriseId && l.isDefault);
          const isDefault = input.isDefault || !hasDefault;

          // Insert into database
          const result = await db.insert('pickup_locations', {
            id: locationId,
            enterprise_id: input.enterpriseId,
            name: input.name,
            address: input.address,
            contact_person: input.contactPerson || null,
            contact_phone: input.contactPhone || null,
            is_default: isDefault,
            is_active: true,
            created_at: new Date().toISOString(),
          });

          if (result.error) {
            throw new Error(`Database error: ${result.error.message}`);
          }

          const newLocation: PickupLocation = {
            id: locationId,
            ...input,
            isDefault,
            isActive: true,
            createdAt: new Date(),
          };

          // If this is set as default, unset others
          if (newLocation.isDefault) {
            set(state => ({
              pickupLocations: state.pickupLocations.map(l =>
                l.enterpriseId === input.enterpriseId ? { ...l, isDefault: false } : l
              ),
            }));
          }

          set(state => ({
            pickupLocations: [...state.pickupLocations, newLocation],
            isLoading: false,
          }));

          console.log(`✅ Pickup location created: ${input.name}`);
          return newLocation;
        } catch (error) {
          set({ isLoading: false });
          console.error('Failed to create pickup location:', error);
          throw error;
        }
      },

      updateLocation: async (id: string, updates: Partial<PickupLocation>) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 300));

        set(state => ({
          pickupLocations: state.pickupLocations.map(l =>
            l.id === id ? { ...l, ...updates, updatedAt: new Date() } : l
          ),
          isLoading: false,
        }));
      },

      deleteLocation: async (id: string) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 300));

        // Soft delete - mark as inactive
        set(state => ({
          pickupLocations: state.pickupLocations.map(l =>
            l.id === id ? { ...l, isActive: false } : l
          ),
          isLoading: false,
        }));
      },

      setDefaultLocation: async (id: string, enterpriseId: string) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 300));

        set(state => ({
          pickupLocations: state.pickupLocations.map(l => {
            if (l.enterpriseId !== enterpriseId) return l;
            return { ...l, isDefault: l.id === id };
          }),
          isLoading: false,
        }));
      },

      // Pickup Request Actions
      getRequestsByEnterprise: (enterpriseId: string) => {
        return get().pickupRequests.filter(r => r.enterpriseId === enterpriseId);
      },

      getRequestById: (id: string) => {
        return get().pickupRequests.find(r => r.id === id);
      },

      getPendingAssignmentRequests: () => {
        return get().pickupRequests.filter(r => r.status === 'pending_assignment');
      },

      getRequestsForLogisticsAdmin: (logisticsAdminId: string) => {
        return get().pickupRequests.filter(r =>
          r.logisticsAdminId === logisticsAdminId &&
          r.status !== 'completed' && r.status !== 'cancelled'
        );
      },

      getAssignedRequests: (logisticsUserId: string) => {
        return get().pickupRequests.filter(r =>
          (r.assignedToUserId === logisticsUserId || r.logisticsUserId === logisticsUserId) &&
          r.status !== 'completed' && r.status !== 'cancelled'
        );
      },

      createPickupRequest: async (input: CreatePickupRequestInput, enterpriseId: string, createdBy: string) => {
        set({ isLoading: true });

        try {
          const pickupId = generateId();
          const location = get().pickupLocations.find(l => l.id === input.locationId);
          if (!location) {
            set({ isLoading: false });
            throw new Error('Pickup location not found');
          }

          // Create asset records
          const assetRecords: AssetPickupRecord[] = input.assetIds.map(assetId => ({
            assetId,
            subUserId: '', // Will be populated from asset data
            status: 'pending' as const,
          }));

          // Insert into database
          // Note: special_instructions may not exist in older schemas, use it_admin_notes as combined field
          const combinedNotes = [input.specialInstructions, input.notes].filter(Boolean).join('\n\n');
          const result = await db.insert('pickup_requests', {
            id: pickupId,
            enterprise_id: enterpriseId,
            location_id: input.locationId,
            asset_ids: input.assetIds,
            assets: assetRecords,
            preferred_date: input.preferredDate ? new Date(input.preferredDate).toISOString() : null,
            preferred_time_slot: input.preferredTimeSlot || null,
            priority: input.priority || 'normal',
            it_admin_notes: combinedNotes || null,
            status: 'pending_assignment',
            picked_asset_ids: [],
            failed_asset_ids: [],
            created_by: createdBy,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          if (result.error) {
            throw new Error(`Database error: ${result.error.message}`);
          }

          const newRequest: PickupRequest = {
            id: pickupId,
            enterpriseId,
            locationId: input.locationId,
            location,
            assetIds: input.assetIds,
            assets: assetRecords,
            preferredDate: input.preferredDate,
            preferredTimeSlot: input.preferredTimeSlot,
            priority: input.priority || 'normal',
            specialInstructions: input.specialInstructions,
            itAdminNotes: input.notes,
            status: 'pending_assignment',
            pickedAssetIds: [],
            failedAssetIds: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy,
          };

          // Update asset statuses to pickup_requested
          const assetStore = useAssetStore.getState();
          for (const assetId of input.assetIds) {
            assetStore.updateAssetStatus(assetId, 'pickup_requested');
          }

          set(state => ({
            pickupRequests: [...state.pickupRequests, newRequest],
            isLoading: false,
          }));

          // Notify Logistics Admin about new pickup request
          triggerNotification(
            'info',
            'logistics_admin',
            'New Pickup Request',
            `New pickup request for ${location.name} with ${input.assetIds.length} assets`
          );

          console.log(`✅ Pickup request created: ${pickupId}`);
          return newRequest;
        } catch (error) {
          set({ isLoading: false });
          console.error('Failed to create pickup request:', error);
          throw error;
        }
      },

      updatePickupRequest: async (id: string, updates: UpdatePickupRequestInput) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 300));

        set(state => ({
          pickupRequests: state.pickupRequests.map(r =>
            r.id === id ? { ...r, ...updates, updatedAt: new Date() } : r
          ),
          isLoading: false,
        }));
      },

      assignToLogisticsAdmin: async (pickupRequestId: string, logisticsAdminId: string, assignedBy: string) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 500));

        const request = get().pickupRequests.find(r => r.id === pickupRequestId);
        if (!request) {
          set({ isLoading: false });
          throw new Error('Pickup request not found');
        }

        set(state => ({
          pickupRequests: state.pickupRequests.map(r =>
            r.id === pickupRequestId ? {
              ...r,
              logisticsAdminId,
              assignedBy,
              updatedAt: new Date(),
            } : r
          ),
          isLoading: false,
        }));

        // Notify Logistics Admin about new assignment
        triggerNotification(
          'info',
          logisticsAdminId,
          'New Pickup Assignment',
          `You have been assigned a pickup request for ${request.location?.name || 'a location'} with ${request.assetIds.length} assets`
        );

        console.log(`✅ Pickup ${pickupRequestId} assigned to Logistics Admin ${logisticsAdminId}`);
      },

      assignPickupRequest: async (input: AssignPickupInput, assignedBy: string) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 500));

        const request = get().pickupRequests.find(r => r.id === input.pickupRequestId);
        if (!request) {
          set({ isLoading: false });
          throw new Error('Pickup request not found');
        }

        set(state => ({
          pickupRequests: state.pickupRequests.map(r =>
            r.id === input.pickupRequestId ? {
              ...r,
              assignedToUserId: input.logisticsUserId,
              logisticsUserId: input.logisticsUserId,
              assignedAt: new Date(),
              assignedBy,
              scheduledDate: input.scheduledDate,
              internalNotes: input.internalNotes,
              logisticsNotes: input.internalNotes,
              status: 'assigned' as const,
              updatedAt: new Date(),
            } : r
          ),
          isLoading: false,
        }));

        // Notify Logistics User about assignment
        const dateStr = input.scheduledDate ? new Date(input.scheduledDate).toLocaleDateString() : 'TBD';
        triggerNotification(
          'info',
          input.logisticsUserId,
          'New Pickup Assignment',
          `You have been assigned a pickup at ${request.location?.name || 'location'} for ${dateStr}`
        );
      },

      updateRequestStatus: async (id: string, status: PickupRequestStatus) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 300));

        const request = get().pickupRequests.find(r => r.id === id);
        if (!request) {
          set({ isLoading: false });
          return;
        }

        // Update asset statuses based on request status
        const assetStore = useAssetStore.getState();
        const audit = useAuditStore.getState();

        // Collect SubUser IDs for notifications
        const subUserIds: Set<string> = new Set();

        if (status === 'scheduled') {
          for (const assetId of request.assetIds) {
            const asset = assetStore.getAssetById(assetId);
            if (asset?.assignedSubUserId) {
              subUserIds.add(asset.assignedSubUserId);
            }
            assetStore.updateAssetStatus(assetId, 'pickup_scheduled');
          }
        }

        if (status === 'in_progress') {
          for (const assetId of request.assetIds) {
            const asset = assetStore.getAssetById(assetId);
            if (asset?.assignedSubUserId) {
              subUserIds.add(asset.assignedSubUserId);
            }
          }
        }

        set(state => ({
          pickupRequests: state.pickupRequests.map(r =>
            r.id === id ? {
              ...r,
              status,
              ...(status === 'assigned' && { assignedAt: new Date() }),
              ...(status === 'scheduled' && { scheduledAt: new Date() }),
              ...(status === 'in_progress' && { startedAt: new Date() }),
              ...(status === 'completed' && { completedAt: new Date() }),
            } : r
          ),
          isLoading: false,
        }));

        // Record audit trail
        audit.record({
          entityType: 'pickup',
          entityId: id,
          action: `status_change_${status}`,
          fromStatus: request.status,
          toStatus: status,
          actorId: request.logisticsUserId,
          metadata: {
            locationName: request.location?.name,
            assetCount: request.assetIds.length,
          },
        });

        // Send notifications based on status change
        const dateStr = request.scheduledDate ? new Date(request.scheduledDate).toLocaleDateString() : 'soon';

        if (status === 'scheduled') {
          // Notify Logistics User
          if (request.logisticsUserId) {
            triggerNotification(
              'success',
              request.logisticsUserId,
              'Pickup Scheduled',
              `Your pickup at ${request.location?.name || 'location'} is scheduled for ${dateStr}`
            );
          }

          // Notify IT Admin
          triggerNotification(
            'info',
            request.createdBy,
            'Pickup Scheduled',
            `Pickup at ${request.location?.name || 'location'} has been scheduled for ${dateStr}`
          );

          // Notify all SubUsers whose devices are scheduled for pickup
          subUserIds.forEach(subUserId => {
            triggerNotification(
              'info',
              subUserId,
              'Pickup Scheduled',
              `Your device pickup has been scheduled for ${dateStr}. Please ensure your device is ready at ${request.location?.name || 'the pickup location'}.`
            );
          });
        }

        if (status === 'in_progress') {
          // Notify IT Admin that pickup has started
          triggerNotification(
            'info',
            request.createdBy,
            'Pickup Started',
            `Pickup at ${request.location?.name || 'location'} has started`
          );

          // Notify SubUsers that pickup is in progress
          subUserIds.forEach(subUserId => {
            triggerNotification(
              'info',
              subUserId,
              'Pickup In Progress',
              `The pickup at ${request.location?.name || 'your location'} has started. Please have your device ready for collection.`
            );
          });
        }
      },

      cancelRequest: async (id: string, cancelledBy: string, reason?: string) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 300));

        const request = get().pickupRequests.find(r => r.id === id);
        if (!request) {
          set({ isLoading: false });
          return;
        }

        // Revert asset statuses to ready_for_pickup
        const assetStore = useAssetStore.getState();
        for (const assetId of request.assetIds) {
          assetStore.updateAssetStatus(assetId, 'ready_for_pickup', undefined, true);
        }

        set(state => ({
          pickupRequests: state.pickupRequests.map(r =>
            r.id === id ? {
              ...r,
              status: 'cancelled' as const,
              cancelledAt: new Date(),
              cancelledBy,
              cancellationReason: reason,
              updatedAt: new Date(),
            } : r
          ),
          isLoading: false,
        }));
      },

      removeAssetFromRequest: async (requestId: string, assetId: string) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 300));

        // Revert this asset's status
        useAssetStore.getState().updateAssetStatus(assetId, 'ready_for_pickup');

        set(state => ({
          pickupRequests: state.pickupRequests.map(r => {
            if (r.id !== requestId) return r;
            return {
              ...r,
              assetIds: r.assetIds.filter(id => id !== assetId),
              assets: r.assets.map(a =>
                a.assetId === assetId ? { ...a, status: 'removed' as const } : a
              ),
            };
          }),
          isLoading: false,
        }));
      },

      updateAssetPickupStatus: async (requestId: string, assetId: string, record: Partial<AssetPickupRecord>) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 300));

        // Note: Asset status in assetStore is updated only when pickup is completed via completePickup()
        // This keeps the pickup record status separate from the actual asset status until completion

        set(state => ({
          pickupRequests: state.pickupRequests.map(r => {
            if (r.id !== requestId) return r;
            return {
              ...r,
              assets: r.assets.map(a =>
                a.assetId === assetId ? { ...a, ...record } : a
              ),
              updatedAt: new Date(),
            };
          }),
          isLoading: false,
        }));
      },

      completePickup: async (requestId: string, pickedAssetIds: string[], failedAssetIds: string[]) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 500));

        const request = get().pickupRequests.find(r => r.id === requestId);
        if (!request) {
          set({ isLoading: false });
          throw new Error('Pickup request not found');
        }

        // Update asset statuses with advanced transitions
        const assetStore = useAssetStore.getState();
        const audit = useAuditStore.getState();

        // Collect SubUser IDs to notify
        const subUserIdsToNotifySuccess: Set<string> = new Set();
        const subUserIdsToNotifyFailed: Set<string> = new Set();

        // Picked assets: pickup_scheduled → picked_up → in_transit
        for (const assetId of pickedAssetIds) {
          const asset = assetStore.getAssetById(assetId);
          const fromStatus = asset?.status;

          await assetStore.updateAssetStatus(assetId, 'picked_up', undefined, true);
          // Immediately transition to in_transit (ready for warehouse)
          await assetStore.updateAssetStatus(assetId, 'in_transit', undefined, true);

          // Collect SubUser for notification
          if (asset?.assignedSubUserId) {
            subUserIdsToNotifySuccess.add(asset.assignedSubUserId);
          }

          // Record audit trail for each picked asset
          audit.record({
            entityType: 'asset',
            entityId: assetId,
            action: 'pickup_completed',
            fromStatus,
            toStatus: 'in_transit',
            actorId: request.logisticsUserId,
            metadata: {
              pickupRequestId: requestId,
              locationName: request.location?.name,
            },
          });
        }

        // Failed QC assets: pickup_scheduled → pickup_failed_qc → ready_for_pickup (for retry)
        for (const assetId of failedAssetIds) {
          const asset = assetStore.getAssetById(assetId);
          const fromStatus = asset?.status;

          await assetStore.updateAssetStatus(assetId, 'pickup_failed_qc', undefined, true);
          // Revert to ready_for_pickup so IT Admin can retry
          await assetStore.updateAssetStatus(assetId, 'ready_for_pickup', undefined, true);

          // Collect SubUser for notification
          if (asset?.assignedSubUserId) {
            subUserIdsToNotifyFailed.add(asset.assignedSubUserId);
          }

          // Record audit trail for failed assets
          audit.record({
            entityType: 'asset',
            entityId: assetId,
            action: 'pickup_failed_qc',
            fromStatus,
            toStatus: 'ready_for_pickup',
            actorId: request.logisticsUserId,
            metadata: {
              pickupRequestId: requestId,
              locationName: request.location?.name,
              reason: 'Failed on-site QC',
            },
          });
        }

        const allProcessed = request.assetIds.length === (pickedAssetIds.length + failedAssetIds.length);

        set(state => ({
          pickupRequests: state.pickupRequests.map(r =>
            r.id === requestId ? {
              ...r,
              pickedAssetIds,
              failedAssetIds,
              status: allProcessed ? 'completed' : 'partially_completed',
              completedAt: allProcessed ? new Date() : undefined,
              updatedAt: new Date(),
            } : r
          ),
          isLoading: false,
        }));

        // Record audit trail for pickup request completion
        audit.record({
          entityType: 'pickup',
          entityId: requestId,
          action: allProcessed ? 'pickup_completed' : 'pickup_partially_completed',
          actorId: request.logisticsUserId,
          metadata: {
            locationName: request.location?.name,
            pickedCount: pickedAssetIds.length,
            failedCount: failedAssetIds.length,
          },
        });

        // === COMPREHENSIVE NOTIFICATIONS ===
        const statusText = allProcessed ? 'completed' : 'partially completed';

        // 1. Notify SubUsers whose devices were successfully picked up
        subUserIdsToNotifySuccess.forEach(subUserId => {
          triggerNotification(
            'success',
            subUserId,
            'Device Picked Up',
            `Your device has been successfully collected and is on its way for final processing. You will receive updates as it progresses.`
          );
        });

        // 2. Notify SubUsers whose devices failed QC
        subUserIdsToNotifyFailed.forEach(subUserId => {
          triggerNotification(
            'warning',
            subUserId,
            'Device Pickup Issue',
            `There was an issue with your device during pickup QC. IT will contact you to reschedule.`
          );
        });

        // 3. Notify IT Admin (creator)
        if (failedAssetIds.length > 0) {
          triggerNotification(
            'warning',
            request.createdBy,
            'Pickup Completed with QC Failures',
            `Pickup at ${request.location?.name || 'location'} ${statusText}. ${pickedAssetIds.length} picked, ${failedAssetIds.length} failed QC and reverted for retry.`
          );
        } else {
          triggerNotification(
            'success',
            request.createdBy,
            'Pickup Completed Successfully',
            `All ${pickedAssetIds.length} assets from ${request.location?.name || 'location'} picked up and in transit.`
          );
        }

        // 4. Notify Logistics Admin
        triggerNotification(
          allProcessed ? 'success' : 'warning',
          'logistics_admin',
          `Pickup ${statusText}`,
          `${request.location?.name || 'Location'}: ${pickedAssetIds.length} picked, ${failedAssetIds.length} failed QC`
        );

        // 5. Notify OPS Admin for oversight
        triggerNotification(
          'info',
          'ops_admin',
          'Pickup Update',
          `Pickup at ${request.location?.name || 'location'} ${statusText}. ${pickedAssetIds.length} devices now in transit.`
        );
      },

      // Stats
      getPickupStats: (enterpriseId: string) => {
        const assets = useAssetStore.getState().assets.filter(a => a.enterpriseId === enterpriseId);
        const requests = get().pickupRequests.filter(r => r.enterpriseId === enterpriseId);

        const totalAssets = requests.reduce((sum, r) => sum + r.assetIds.length, 0);
        const pickedAssets = requests.reduce((sum, r) => sum + r.pickedAssetIds.length, 0);
        const failedAssets = requests.reduce((sum, r) => sum + r.failedAssetIds.length, 0);

        return {
          readyForPickup: assets.filter(a => a.status === 'ready_for_pickup').length,
          pendingAssignment: requests.filter(r => r.status === 'pending_assignment').length,
          requested: requests.filter(r => r.status === 'pending_assignment').length, // Legacy
          assigned: requests.filter(r => r.status === 'assigned').length,
          scheduled: requests.filter(r => r.status === 'scheduled').length,
          inProgress: requests.filter(r => r.status === 'in_progress').length,
          completed: requests.filter(r => r.status === 'completed').length,
          cancelled: requests.filter(r => r.status === 'cancelled').length,
          exceptions: requests.reduce((sum, r) =>
            sum + (r.assets || []).filter(a => a.status === 'no_show' || a.status === 'qc_failed').length, 0
          ),
          totalAssets,
          pickedAssets,
          failedAssets,
          pendingAssets: totalAssets - pickedAssets - failedAssets,
        };
      },

      getPickupRequestSummary: () => {
        const requests = get().pickupRequests;
        const totalAssets = requests.reduce((sum, r) => sum + r.assetIds.length, 0);
        const pickedAssets = requests.reduce((sum, r) => sum + r.pickedAssetIds.length, 0);
        const failedAssets = requests.reduce((sum, r) => sum + r.failedAssetIds.length, 0);

        return {
          totalRequests: requests.length,
          pendingAssignment: requests.filter(r => r.status === 'pending_assignment').length,
          assigned: requests.filter(r => r.status === 'assigned').length,
          inProgress: requests.filter(r => r.status === 'in_progress').length,
          completed: requests.filter(r => r.status === 'completed').length,
          cancelled: requests.filter(r => r.status === 'cancelled').length,
          totalAssets,
          pickedAssets,
          failedAssets,
          pendingAssets: totalAssets - pickedAssets - failedAssets,
        };
      },
    }),
    {
      name: 'ecotribe-pickup-store',
      partialize: (state) => ({
        pickupLocations: state.pickupLocations,
        pickupRequests: state.pickupRequests,
      }),
    }
  )
);
