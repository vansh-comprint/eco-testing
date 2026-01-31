import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Batch, BatchStatus, CreateBatchInput, UpdateBatchInput, PickupApprovalInput } from '@/types';
import { generateId } from '@/lib/utils';
import { requiresOrgAdminApproval } from '@/types/batch';
import { triggerNotification } from './notificationStore';
import { db } from '@/lib/database';

// Org Admin user ID - in a real app, this would come from user/enterprise settings
const ORG_ADMIN_USER_ID = 'org-admin-1';

interface BatchState {
  batches: Batch[];
  selectedBatch: Batch | null;
  isLoading: boolean;

  // Actions
  hydrate: (batches: Batch[]) => void;
  fetchBatches: (enterpriseId: string) => Promise<void>;
  getBatchById: (id: string) => Batch | undefined;
  createBatch: (input: CreateBatchInput & { createdBy: string }) => Promise<Batch>;
  updateBatch: (id: string, input: UpdateBatchInput) => Promise<Batch>;
  updateBatchStatus: (id: string, status: BatchStatus) => Promise<Batch>;
  deleteBatch: (id: string, options?: { deleteAssets?: boolean; deleteSubUsers?: boolean }) => Promise<void>;
  setSelectedBatch: (batch: Batch | null) => void;
  activateBatch: (batchId: string) => Promise<Batch>;
  submitForApproval: (batchId: string, enterpriseName?: string) => Promise<Batch>;
  nudgeOrgAdmin: (batchId: string, enterpriseName?: string) => void;
  processApproval: (input: PickupApprovalInput & { approvedBy: string }) => Promise<Batch>;
  getBatchStats: (enterpriseId: string) => {
    total: number;
    draft: number;
    active: number;
    pendingApproval: number;
    completed: number;
    totalValue: number;
  };
}

export const useBatchStore = create<BatchState>()(
  persist(
    (set, get) => ({
  batches: [],
  selectedBatch: null,
  isLoading: false,

  hydrate: (batches: Batch[]) => {
    if (get().batches.length === 0 && batches.length > 0) {
      set({ batches });
    }
  },

  fetchBatches: async (enterpriseId: string) => {
    set({ isLoading: true });

    try {
      // Query batches from database
      const result = await db.query('batches', {
        filters: [{ field: 'enterprise_id', operator: 'eq', value: enterpriseId }]
      });

      if (result.error) {
        console.error('Database query error:', result.error.message);
        set({ isLoading: false });
        return;
      }

      if (result.data) {
        // Map database records to frontend Batch type
        const batches: Batch[] = result.data.map((dbBatch: any) => ({
          id: dbBatch.id,
          enterpriseId: dbBatch.enterprise_id,
          name: dbBatch.name,
          description: dbBatch.description || undefined,
          status: dbBatch.status,
          assetCount: dbBatch.asset_count || 0,
          acceptedCount: dbBatch.accepted_count || 0,
          rejectedCount: dbBatch.rejected_count || 0,
          pendingCount: dbBatch.pending_count || 0,
          totalPayout: dbBatch.total_payout || 0,
          estimatedValue: dbBatch.estimated_value || 0,
          requiresApproval: dbBatch.requires_approval || dbBatch.requires_cfo_approval || false,
          createdBy: dbBatch.created_by,
          submittedAt: dbBatch.submitted_at ? new Date(dbBatch.submitted_at) : undefined,
          approvedAt: dbBatch.approved_at ? new Date(dbBatch.approved_at) : undefined,
          completedAt: dbBatch.completed_at ? new Date(dbBatch.completed_at) : undefined,
          createdAt: new Date(dbBatch.created_at),
          updatedAt: dbBatch.updated_at ? new Date(dbBatch.updated_at) : undefined,
        }));

        set({ batches, isLoading: false });
        console.log(`Fetched ${batches.length} batches from database`);
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Failed to fetch batches:', error);
      set({ isLoading: false });
    }
  },

  getBatchById: (id: string) => {
    return get().batches.find(b => b.id === id);
  },

  createBatch: async (input: CreateBatchInput & { createdBy: string }) => {
    set({ isLoading: true });

    try {
      const batchId = `bat-${generateId()}`;
      const { createdBy, ...batchInput } = input;

      // Insert into database
      const result = await db.insert('batches', {
        id: batchId,
        enterprise_id: input.enterpriseId,
        name: input.name,
        description: input.description || null,
        status: 'draft',
        asset_count: 0,
        accepted_count: 0,
        rejected_count: 0,
        pending_count: 0,
        total_payout: 0,
        estimated_value: input.estimatedValue || 0,
        requires_approval: false,
        created_by: createdBy,
        created_at: new Date().toISOString(),
      });

      if (result.error) {
        throw new Error(`Database error: ${result.error.message}`);
      }

      const newBatch: Batch = {
        id: batchId,
        ...batchInput,
        status: 'draft',
        assetCount: 0,
        acceptedCount: 0,
        rejectedCount: 0,
        pendingCount: 0,
        totalPayout: 0,
        estimatedValue: input.estimatedValue || 0,
        requiresApproval: false,
        createdBy,
        createdAt: new Date(),
      };

      set(state => ({ batches: [...state.batches, newBatch], isLoading: false }));
      console.log(`Batch created: ${input.name}`);
      return newBatch;
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to create batch:', error);
      throw error;
    }
  },

  updateBatch: async (id: string, input: UpdateBatchInput) => {
    set({ isLoading: true });

    try {
      let updatedBatch: Batch | undefined;
      set(state => ({
        batches: state.batches.map(b => {
          if (b.id === id) {
            updatedBatch = { ...b, ...input, updatedAt: new Date() };
            return updatedBatch;
          }
          return b;
        }),
      }));

      if (!updatedBatch) {
        set({ isLoading: false });
        throw new Error('Batch not found');
      }

      // Update database
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (input.name) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description || null;
      if (input.status) updateData.status = input.status;
      if (input.assetCount !== undefined) updateData.asset_count = input.assetCount;
      if (input.acceptedCount !== undefined) updateData.accepted_count = input.acceptedCount;
      if (input.rejectedCount !== undefined) updateData.rejected_count = input.rejectedCount;
      if (input.pendingCount !== undefined) updateData.pending_count = input.pendingCount;
      if (input.totalPayout !== undefined) updateData.total_payout = input.totalPayout;
      if (input.estimatedValue !== undefined) updateData.estimated_value = input.estimatedValue;
      if (input.requiresApproval !== undefined) updateData.requires_approval = input.requiresApproval;
      if (input.submittedAt) updateData.submitted_at = new Date(input.submittedAt).toISOString();
      if (input.approvedAt) updateData.approved_at = new Date(input.approvedAt).toISOString();
      if (input.completedAt) updateData.completed_at = new Date(input.completedAt).toISOString();

      const result = await db.update('batches', id, updateData);

      if (result.error) {
        console.error('Database update error:', result.error.message);
      }

      set({ isLoading: false });
      console.log(`Batch updated: ${id}`);
      return updatedBatch;
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to update batch:', error);
      throw error;
    }
  },

  updateBatchStatus: async (id: string, status: BatchStatus) => {
    await new Promise(resolve => setTimeout(resolve, 200));

    let updatedBatch: Batch | undefined;
    set(state => ({
      batches: state.batches.map(b => {
        if (b.id === id) {
          updatedBatch = { ...b, status, updatedAt: new Date() };
          if (status === 'completed') {
            updatedBatch.completedAt = new Date();
          }
          return updatedBatch;
        }
        return b;
      }),
    }));

    if (!updatedBatch) throw new Error('Batch not found');
    return updatedBatch;
  },

  deleteBatch: async (id: string, options?: { deleteAssets?: boolean; deleteSubUsers?: boolean }) => {
    set({ isLoading: true });

    try {
      const batch = get().batches.find(b => b.id === id);
      if (!batch) {
        throw new Error('Batch not found');
      }

      // If cascade delete is requested, delete related assets and sub-users
      if (options?.deleteAssets || options?.deleteSubUsers) {
        // Delete assets associated with this batch
        if (options.deleteAssets) {
          console.log(`Deleting assets for batch: ${id}`);
          const deleteAssetsResult = await db.query('assets', {
            filters: [{ field: 'batch_id', operator: 'eq', value: id }]
          });

          if (deleteAssetsResult.data && deleteAssetsResult.data.length > 0) {
            for (const asset of deleteAssetsResult.data) {
              await db.delete('assets', asset.id);
            }
            console.log(`Deleted ${deleteAssetsResult.data.length} assets`);
          }
        }

        // Delete sub-users associated with this batch's enterprise
        if (options.deleteSubUsers && batch.enterpriseId) {
          console.log(`Deleting sub-users for enterprise: ${batch.enterpriseId}`);
          const deleteSubUsersResult = await db.query('sub_users', {
            filters: [{ field: 'enterprise_id', operator: 'eq', value: batch.enterpriseId }]
          });

          if (deleteSubUsersResult.data && deleteSubUsersResult.data.length > 0) {
            for (const subUser of deleteSubUsersResult.data) {
              await db.delete('sub_users', subUser.id);
            }
            console.log(`Deleted ${deleteSubUsersResult.data.length} sub-users`);
          }
        }
      }

      // Delete the batch itself
      const result = await db.delete('batches', id);

      if (result.error) {
        throw new Error(`Database error: ${result.error.message}`);
      }

      set(state => ({ batches: state.batches.filter(b => b.id !== id), isLoading: false }));

      const deletedItems = [];
      deletedItems.push('batch');
      if (options?.deleteAssets) deletedItems.push('assets');
      if (options?.deleteSubUsers) deletedItems.push('sub-users');

      console.log(`Deleted: ${deletedItems.join(', ')} for batch ${id}`);
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to delete batch:', error);
      throw error;
    }
  },

  setSelectedBatch: (batch: Batch | null) => {
    set({ selectedBatch: batch });
  },

  activateBatch: async (batchId: string) => {
    await new Promise(resolve => setTimeout(resolve, 200));

    let updatedBatch: Batch | undefined;
    set(state => ({
      batches: state.batches.map(b => {
        if (b.id === batchId) {
          // Only activate if it's a draft and doesn't require approval
          // or if it's already approved
          if (b.status === 'draft' && !b.requiresApproval) {
            updatedBatch = { ...b, status: 'pickup_in_progress' as BatchStatus, updatedAt: new Date() };
            return updatedBatch;
          } else if (b.status === 'approved') {
            updatedBatch = { ...b, status: 'pickup_in_progress' as BatchStatus, updatedAt: new Date() };
            return updatedBatch;
          }
        }
        return b;
      }),
    }));

    if (!updatedBatch) throw new Error('Batch cannot be activated');
    return updatedBatch;
  },

  submitForApproval: async (batchId: string, enterpriseName?: string) => {
    await new Promise(resolve => setTimeout(resolve, 200));

    let updatedBatch: Batch | undefined;
    set(state => ({
      batches: state.batches.map(b => {
        if (b.id === batchId) {
          const needsApproval = requiresOrgAdminApproval(b.assetCount, b.estimatedValue);
          updatedBatch = {
            ...b,
            status: needsApproval ? 'pending_approval' : 'active',
            requiresApproval: needsApproval,
            approvalStatus: needsApproval ? 'pending' : undefined,
            updatedAt: new Date(),
          };
          return updatedBatch;
        }
        return b;
      }),
    }));

    if (!updatedBatch) throw new Error('Batch not found');

    // Send notification to Org Admin if approval is required
    if (updatedBatch.requiresApproval) {
      triggerNotification(
        'batch_ready',
        ORG_ADMIN_USER_ID,
        'Batch Pending Approval',
        `Batch "${updatedBatch.name}" from ${enterpriseName || 'an enterprise'} with ${updatedBatch.assetCount} assets (₹${(updatedBatch.estimatedValue / 1000).toFixed(0)}K) requires your approval.`,
        'in_app'
      );
    }

    return updatedBatch;
  },

  nudgeOrgAdmin: (batchId: string, enterpriseName?: string) => {
    const batch = get().batches.find(b => b.id === batchId);
    if (!batch || batch.status !== 'pending_approval') return;

    triggerNotification(
      'batch_ready',
      ORG_ADMIN_USER_ID,
      'Reminder: Batch Awaiting Approval',
      `Friendly reminder: Batch "${batch.name}" from ${enterpriseName || 'an enterprise'} is still pending your approval. ${batch.assetCount} assets worth ₹${(batch.estimatedValue / 1000).toFixed(0)}K.`,
      'in_app'
    );
  },

  processApproval: async (input: PickupApprovalInput & { approvedBy: string }) => {
    await new Promise(resolve => setTimeout(resolve, 100));

    const { approvedBy, ...approvalInput } = input;
    let updatedBatch: Batch | undefined;
    set(state => ({
      batches: state.batches.map(b => {
        if (b.id === approvalInput.batchId) {
          updatedBatch = {
            ...b,
            status: approvalInput.approved ? 'active' : 'rejected',
            approvalStatus: approvalInput.approved ? 'approved' : 'rejected',
            approvedBy: approvedBy,
            approvedAt: new Date(),
            rejectionReason: approvalInput.approved ? undefined : approvalInput.rejectionReason,
            updatedAt: new Date(),
          };
          return updatedBatch;
        }
        return b;
      }),
    }));

    if (!updatedBatch) throw new Error('Batch not found');
    return updatedBatch;
  },

  getBatchStats: (enterpriseId: string) => {
    const batches = get().batches.filter(b => b.enterpriseId === enterpriseId);

    return {
      total: batches.length,
      draft: batches.filter(b => b.status === 'draft').length,
      active: batches.filter(b => ['approved', 'pickup_in_progress'].includes(b.status)).length,
      pendingApproval: batches.filter(b => b.status === 'pending_approval').length,
      completed: batches.filter(b => b.status === 'completed').length,
      totalValue: batches.reduce((sum, b) => sum + b.estimatedValue, 0),
    };
  },
    }),
    {
      name: 'ecotribe-batches',
      partialize: (state) => ({ batches: state.batches }),
    }
  )
);
