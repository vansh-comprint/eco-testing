import { useAssetStore } from '@/stores/assetStore';
import { useBatchStore } from '@/stores/batchStore';
import { useReviewStore } from '@/stores/reviewStore';
import { usePayoutStore } from '@/stores/payoutStore';
import { useAuditStore } from '@/stores/auditStore';
import { triggerNotification } from '@/stores/notificationStore';
import type { AssetStatus, AssetGrade, TreatmentOutcome } from '@/types';

interface TransitionParams {
  assetId: string;
  nextStatus: AssetStatus;
  actorId?: string;
  grade?: AssetGrade;
  metadata?: Record<string, any>;
}

interface QCParams {
  assetId: string;
  reviewerId: string;
  decision: 'final_accept' | 'final_reject';
  grade?: AssetGrade;
}

interface ReviewParams {
  assetId: string;
  reviewerId: string;
  decision: 'conditionally_accepted' | 'rejected';
  notes?: string;
  reason?: string;
}

export async function transitionAssetStatus(params: TransitionParams) {
  const assetStore = useAssetStore.getState();
  const audit = useAuditStore.getState();

  const asset = assetStore.getAssetById(params.assetId);
  if (!asset) throw new Error('Asset not found');

  const fromStatus = asset.status;
  const updated = await assetStore.updateAssetStatus(params.assetId, params.nextStatus, params.grade);

  audit.record({
    entityType: 'asset',
    entityId: params.assetId,
    action: 'status_change',
    fromStatus,
    toStatus: params.nextStatus,
    actorId: params.actorId,
    metadata: params.metadata,
  });

  // Touch batch updatedAt via batch store if needed
  if (updated.batchId) {
    useBatchStore.setState(state => ({
      batches: state.batches.map(b => (b.id === updated.batchId ? { ...b, updatedAt: new Date() } : b)),
    }));
  }

  return updated;
}

export async function handleRemoteReview(input: ReviewParams) {
  const reviewStore = useReviewStore.getState();
  const decision = input.decision === 'conditionally_accepted' ? 'conditionally_accepted' : 'remote_rejected';

  await reviewStore.createRemoteReview({
    assetId: input.assetId,
    reviewerId: input.reviewerId,
    decision: decision === 'conditionally_accepted' ? 'conditionally_accepted' : 'rejected',
    notes: input.notes,
    reason: input.reason,
  });

  await transitionAssetStatus({
    assetId: input.assetId,
    nextStatus: decision,
    actorId: input.reviewerId,
    metadata: { decision },
  });
}

export async function handleFacilityQC(input: QCParams) {
  const reviewStore = useReviewStore.getState();

  await reviewStore.createFacilityQC({
    assetId: input.assetId,
    reviewerId: input.reviewerId,
    checklistData: {
      verifyPhotos: { name: 'Photos', items: [] },
      cosmeticInspection: { name: 'Cosmetic', items: [] },
      functionalTests: { name: 'Functional', items: [] },
      portTesting: { name: 'Ports', items: [] },
      batteryHealth: { name: 'Battery', items: [] },
      storageCheck: { name: 'Storage', items: [] },
      biosAccess: { name: 'BIOS', items: [] },
    },
    decision: input.decision,
    grade: input.grade,
  });

  if (input.decision === 'final_accept') {
    await transitionAssetStatus({
      assetId: input.assetId,
      nextStatus: 'final_accepted',
      actorId: input.reviewerId,
      grade: input.grade,
      metadata: { qc: 'accept' },
    });
    await transitionAssetStatus({
      assetId: input.assetId,
      nextStatus: 'payout_pending',
      actorId: input.reviewerId,
      metadata: { qc: 'payout_ready' },
    });
  } else {
    await transitionAssetStatus({
      assetId: input.assetId,
      nextStatus: 'final_rejected',
      actorId: input.reviewerId,
      metadata: { qc: 'reject' },
    });
  }
}

export async function processPayoutBatch(params: {
  assetIds: string[];
  actorId?: string;
  amount?: number;
}) {
  const assetStore = useAssetStore.getState();
  const payoutStore = usePayoutStore.getState();
  const audit = useAuditStore.getState();

  const assets = params.assetIds
    .map(id => assetStore.getAssetById(id))
    .filter(Boolean);

  if (assets.length === 0) return null;

  // Move any final_accepted assets into payout_pending first
  for (const asset of assets) {
    if (!asset) continue;
    if (asset.status === 'final_accepted') {
      await assetStore.updateAssetStatus(asset.id, 'payout_pending');
    }
    await assetStore.updateAssetStatus(asset.id, 'completed');
    audit.record({
      entityType: 'asset',
      entityId: asset.id,
      action: 'payout_completed',
      fromStatus: asset.status,
      toStatus: 'completed',
      actorId: params.actorId,
    });
  }

  const enterpriseId = assets[0]!.enterpriseId;
  const amount = params.amount || assets.reduce((sum, a) => sum + (a?.finalPrice || a?.basePrice || 0), 0);
  const payout = await payoutStore.createPayout(enterpriseId, params.assetIds, amount, params.actorId);

  return payout;
}

export async function setTreatmentDetails(params: {
  assetId: string;
  outcome: TreatmentOutcome;
  weightKg?: number;
  recyclerPartnerId?: string;
  actorId?: string;
}) {
  const assetStore = useAssetStore.getState();
  const audit = useAuditStore.getState();

  await assetStore.updateAsset(params.assetId, {
    treatmentOutcome: params.outcome,
    weightKg: params.weightKg,
    recyclerPartnerId: params.recyclerPartnerId,
    treatmentDate: new Date(),
  });

  audit.record({
    entityType: 'asset',
    entityId: params.assetId,
    action: 'treatment_update',
    actorId: params.actorId,
    metadata: {
      outcome: params.outcome,
      weightKg: params.weightKg,
      recyclerPartnerId: params.recyclerPartnerId,
    },
  });
}

// ============================================================================
// COMPREHENSIVE WORKFLOW HANDLERS
// ============================================================================

/**
 * Handle asset pickup by logistics user
 * Updates: assetStore, auditStore, notificationStore
 * Notifies: SubUser (employee), IT Admin, Logistics Admin
 */
export async function handleAssetPickedUp(params: {
  assetId: string;
  pickupRequestId: string;
  logisticsUserId: string;
  subUserId?: string;
  itAdminId?: string;
}) {
  const assetStore = useAssetStore.getState();
  const audit = useAuditStore.getState();

  const asset = assetStore.getAssetById(params.assetId);
  if (!asset) throw new Error('Asset not found');

  const fromStatus = asset.status;

  // Update asset status
  await assetStore.updateAssetStatus(params.assetId, 'picked_up', undefined, true);

  // Record audit
  audit.record({
    entityType: 'asset',
    entityId: params.assetId,
    action: 'pickup_completed',
    fromStatus,
    toStatus: 'picked_up',
    actorId: params.logisticsUserId,
    metadata: {
      pickupRequestId: params.pickupRequestId,
    },
  });

  // Notify SubUser (employee) that their device was picked up
  if (params.subUserId || asset.assignedSubUserId) {
    triggerNotification(
      'success',
      params.subUserId || asset.assignedSubUserId!,
      'Device Picked Up',
      `Your device (${asset.brand} ${asset.model}) has been successfully collected and is on its way for processing.`
    );
  }

  // Notify IT Admin
  if (params.itAdminId) {
    triggerNotification(
      'info',
      params.itAdminId,
      'Asset Picked Up',
      `Asset ${asset.serialNumber} (${asset.brand} ${asset.model}) has been picked up by logistics.`
    );
  }

  return asset;
}

/**
 * Handle asset arriving at warehouse (in_transit → facility_qc)
 * Updates: assetStore, auditStore, notificationStore
 * Notifies: IT Admin, OPS Manager
 */
export async function handleAssetArrivedAtWarehouse(params: {
  assetId: string;
  receivedBy: string;
  itAdminId?: string;
}) {
  const assetStore = useAssetStore.getState();
  const audit = useAuditStore.getState();

  const asset = assetStore.getAssetById(params.assetId);
  if (!asset) throw new Error('Asset not found');

  const fromStatus = asset.status;

  // Transition: in_transit → facility_qc
  await assetStore.updateAssetStatus(params.assetId, 'facility_qc', undefined, true);

  // Record audit
  audit.record({
    entityType: 'asset',
    entityId: params.assetId,
    action: 'arrived_warehouse',
    fromStatus,
    toStatus: 'facility_qc',
    actorId: params.receivedBy,
  });

  // Notify IT Admin
  if (params.itAdminId) {
    triggerNotification(
      'info',
      params.itAdminId,
      'Asset Arrived at Warehouse',
      `Asset ${asset.serialNumber} has arrived at the warehouse and is queued for QC.`
    );
  }

  // Notify OPS Manager (ops_admin)
  triggerNotification(
    'info',
    'ops_admin',
    'Asset Ready for QC',
    `Asset ${asset.serialNumber} (${asset.brand} ${asset.model}) is ready for facility QC.`
  );

  return asset;
}

/**
 * Handle pickup request status change - notify all relevant parties
 */
export async function notifyPickupStatusChange(params: {
  status: string;
  locationName: string;
  assetCount: number;
  itAdminId: string;
  subUserIds?: string[];
  logisticsUserId?: string;
  scheduledDate?: Date;
}) {
  const audit = useAuditStore.getState();

  // Log status change
  audit.record({
    entityType: 'pickup',
    entityId: 'system',
    action: `pickup_${params.status}`,
    metadata: {
      locationName: params.locationName,
      assetCount: params.assetCount,
    },
  });

  // Notify based on status
  switch (params.status) {
    case 'assigned':
    case 'scheduled':
      // Notify all SubUsers about pickup schedule
      if (params.subUserIds && params.scheduledDate) {
        const dateStr = params.scheduledDate.toLocaleDateString();
        params.subUserIds.forEach(subUserId => {
          triggerNotification(
            'info',
            subUserId,
            'Pickup Scheduled',
            `Please bring your device to ${params.locationName} on ${dateStr} for pickup.`
          );
        });
      }
      break;

    case 'in_progress':
      // Notify SubUsers that pickup has started
      if (params.subUserIds) {
        params.subUserIds.forEach(subUserId => {
          triggerNotification(
            'info',
            subUserId,
            'Pickup In Progress',
            `The pickup at ${params.locationName} has started. Please ensure your device is ready.`
          );
        });
      }
      break;

    case 'completed':
      // Notify IT Admin
      triggerNotification(
        'success',
        params.itAdminId,
        'Pickup Completed',
        `All ${params.assetCount} devices from ${params.locationName} have been picked up successfully.`
      );
      break;
  }
}

/**
 * Handle conditional acceptance - move to ready_for_pickup
 * Updates: assetStore, auditStore, notificationStore
 * Notifies: IT Admin, SubUser
 */
export async function handleConditionallyAccepted(params: {
  assetId: string;
  reviewerId: string;
  itAdminId?: string;
}) {
  const assetStore = useAssetStore.getState();
  const audit = useAuditStore.getState();

  const asset = assetStore.getAssetById(params.assetId);
  if (!asset) throw new Error('Asset not found');

  // Transition to ready_for_pickup
  await assetStore.updateAssetStatus(params.assetId, 'ready_for_pickup', undefined, true);

  // Record audit
  audit.record({
    entityType: 'asset',
    entityId: params.assetId,
    action: 'approved_for_pickup',
    fromStatus: 'conditionally_accepted',
    toStatus: 'ready_for_pickup',
    actorId: params.reviewerId,
  });

  // Notify IT Admin that asset is ready for pickup
  if (params.itAdminId) {
    triggerNotification(
      'success',
      params.itAdminId,
      'Asset Ready for Pickup',
      `Asset ${asset.serialNumber} (${asset.brand} ${asset.model}) has been approved and is ready for pickup scheduling.`
    );
  }

  // Notify SubUser
  if (asset.assignedSubUserId) {
    triggerNotification(
      'success',
      asset.assignedSubUserId,
      'Device Approved',
      `Your device evaluation has been approved! IT will notify you when pickup is scheduled.`
    );
  }

  return asset;
}

/**
 * Get all stakeholders for an asset (for notification purposes)
 */
export function getAssetStakeholders(assetId: string): {
  subUserId?: string;
  itAdminId?: string;
  enterpriseId?: string;
} {
  const assetStore = useAssetStore.getState();
  const asset = assetStore.getAssetById(assetId);

  if (!asset) return {};

  return {
    subUserId: asset.assignedSubUserId,
    enterpriseId: asset.enterpriseId,
    // IT Admin ID would come from user lookup by enterpriseId + role
    // For now, we use a convention or lookup
    itAdminId: `it-admin-${asset.enterpriseId}`,
  };
}
