import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Asset, AssetStatus, CreateAssetInput, UpdateAssetInput, AssetGrade } from '@/types';
import { assetStatusFlow } from '@/types/asset';
import { generateId } from '@/lib/utils';
import { useBatchStore } from './batchStore';
import { db } from '@/lib/database';

interface AssetFilters {
  status?: AssetStatus | 'all';
  batchId?: string;
  search?: string;
}

interface AssetState {
  assets: Asset[];
  selectedAsset: Asset | null;
  filters: AssetFilters;
  isLoading: boolean;

  // Actions
  hydrate: (assets: Asset[]) => void;
  clearLocalStorage: () => void;
  fetchAssets: (enterpriseId: string) => Promise<void>;
  getAssetById: (id: string) => Asset | undefined;
  getAssetsBySubUserId: (subUserId: string) => Asset[];
  createAsset: (input: CreateAssetInput) => Promise<Asset>;
  createAssets: (inputs: CreateAssetInput[]) => Promise<Asset[]>;
  updateAsset: (id: string, input: UpdateAssetInput, forceStatus?: boolean) => Promise<Asset>;
  updateAssetStatus: (id: string, status: AssetStatus, grade?: AssetGrade, force?: boolean) => Promise<Asset>;
  deleteAsset: (id: string) => Promise<void>;
  assignSubUser: (assetId: string, subUserId: string) => Promise<void>;
  unassignAsset: (assetId: string) => Promise<void>;
  unassignSubUser: (subUserId: string) => Promise<void>;
  setFilters: (filters: AssetFilters) => void;
  setSelectedAsset: (asset: Asset | null) => void;
  getFilteredAssets: () => Asset[];
  recalculateBatchMetrics: (batchId?: string, assetsOverride?: Asset[]) => void;
  getAssetStats: (enterpriseId: string) => {
    total: number;
    pending: number;
    inReview: number;
    accepted: number;
    rejected: number;
  };
}

export const useAssetStore = create<AssetState>()(
  persist(
    (set, get) => ({
  assets: [],
  selectedAsset: null,
  filters: { status: 'all' },
  isLoading: false,

  hydrate: (assets: Asset[]) => {
    // Only seed if store is empty to preserve user state
    if (get().assets.length === 0 && assets.length > 0) {
      set({ assets });
      get().recalculateBatchMetrics();
    }
  },

  clearLocalStorage: () => {
    // Clear assets from localStorage and state
    localStorage.removeItem('ecotribe-asset-store');
    set({ assets: [], selectedAsset: null, filters: { status: 'all' } });
    console.log('✅ Cleared asset localStorage');
  },

  fetchAssets: async (enterpriseId: string) => {
    set({ isLoading: true });

    try {
      // Query assets from database
      const result = await db.query('assets', {
        filters: [{ field: 'enterprise_id', operator: 'eq', value: enterpriseId }]
      });

      if (result.error) {
        console.error('Database query error:', result.error.message);
        set({ isLoading: false });
        return;
      }

      if (result.data) {
        // Map database records to frontend Asset type
        const assets: Asset[] = result.data.map((dbAsset: any) => ({
          id: dbAsset.id,
          enterpriseId: dbAsset.enterprise_id,
          batchId: dbAsset.batch_id || undefined,
          serialNumber: dbAsset.serial_number,
          brand: dbAsset.brand,
          model: dbAsset.model,
          assetTag: dbAsset.asset_tag || undefined,
          specs: dbAsset.specs || undefined,
          purchaseDate: dbAsset.purchase_date ? new Date(dbAsset.purchase_date) : undefined,
          assignedSubUserId: dbAsset.assigned_sub_user_id || undefined,
          assignedAt: dbAsset.assigned_at ? new Date(dbAsset.assigned_at) : undefined,
          status: dbAsset.status,
          grade: dbAsset.grade || undefined,
          basePrice: dbAsset.base_price || undefined,
          finalPrice: dbAsset.final_price || undefined,
          createdAt: new Date(dbAsset.created_at),
          updatedAt: dbAsset.updated_at ? new Date(dbAsset.updated_at) : undefined,
        }));

        set({ assets, isLoading: false });
        console.log(`✅ Fetched ${assets.length} assets from database`);
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Failed to fetch assets:', error);
      set({ isLoading: false });
    }
  },

  getAssetById: (id: string) => {
    return get().assets.find(a => a.id === id);
  },

  getAssetsBySubUserId: (subUserId: string) => {
    return get().assets.filter(a => a.assignedSubUserId === subUserId);
  },

  createAsset: async (input: CreateAssetInput) => {
    set({ isLoading: true });

    try {
      const assetId = `ast-${generateId()}`;

      // Insert into database
      const result = await db.insert('assets', {
        id: assetId,
        enterprise_id: input.enterpriseId,
        batch_id: input.batchId || null,
        serial_number: input.serialNumber,
        brand: input.brand,
        model: input.model,
        asset_tag: input.assetTag || null,
        specs: input.specs || null,
        purchase_date: input.purchaseDate ? new Date(input.purchaseDate).toISOString() : null,
        assigned_sub_user_id: input.assignedSubUserId || null,
        assigned_at: input.assignedAt ? new Date(input.assignedAt).toISOString() : null,
        status: 'pending_assignment',
        grade: input.grade || null,
        base_price: input.basePrice || null,
        final_price: input.finalPrice || null,
        created_at: new Date().toISOString(),
      });

      if (result.error) {
        throw new Error(`Database error: ${result.error.message}`);
      }

      const newAsset: Asset = {
        id: assetId,
        ...input,
        status: 'pending_assignment',
        createdAt: new Date(),
      };

      let nextAssets: Asset[] = [];
      set(state => {
        nextAssets = [...state.assets, newAsset];
        return { assets: nextAssets, isLoading: false };
      });

      if (newAsset.batchId) {
        get().recalculateBatchMetrics(newAsset.batchId, nextAssets);
      }

      console.log(`✅ Asset created: ${input.serialNumber}`);
      return newAsset;
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to create asset:', error);
      throw error;
    }
  },

  createAssets: async (inputs: (CreateAssetInput & { assignedSubUserId?: string; status?: AssetStatus; assignedAt?: Date })[]) => {
    set({ isLoading: true });

    try {
      const newAssets: Asset[] = [];

      // Process each asset
      for (const input of inputs) {
        const assetId = `ast-${generateId()}`;
        const { assignedSubUserId, status, assignedAt, assignedEmail, assignedName, assignedDepartment, ...rest } = input as CreateAssetInput & { assignedSubUserId?: string; status?: AssetStatus; assignedAt?: Date };

        try {
          // Insert into database
          const result = await db.insert('assets', {
            id: assetId,
            enterprise_id: input.enterpriseId,
            batch_id: input.batchId || null,
            serial_number: input.serialNumber,
            brand: input.brand,
            model: input.model,
            asset_tag: input.assetTag || null,
            specs: input.specs || null,
            purchase_date: input.purchaseDate ? new Date(input.purchaseDate).toISOString() : null,
            assigned_sub_user_id: assignedSubUserId || null,
            assigned_at: assignedAt ? new Date(assignedAt).toISOString() : null,
            status: status || 'pending_assignment',
            grade: input.grade || null,
            base_price: input.basePrice || null,
            final_price: input.finalPrice || null,
            created_at: new Date().toISOString(),
          });

          if (result.error) {
            console.error(`Database error for ${input.serialNumber}:`, result.error.message);
            continue; // Skip this asset if database insert fails
          }

          const newAsset: Asset = {
            id: assetId,
            ...rest,
            status: status || 'pending_assignment' as AssetStatus,
            assignedSubUserId,
            assignedAt,
            createdAt: new Date(),
          };

          newAssets.push(newAsset);
          console.log(`✅ Asset created: ${input.serialNumber}`);
        } catch (error) {
          console.error(`Failed to create asset ${input.serialNumber}:`, error);
          // Continue with next asset
        }
      }

      let nextAssets: Asset[] = [];
      set(state => {
        nextAssets = [...state.assets, ...newAssets];
        return { assets: nextAssets, isLoading: false };
      });

      const batchIds = Array.from(new Set(newAssets.map(a => a.batchId).filter(Boolean))) as string[];
      batchIds.forEach(batchId => get().recalculateBatchMetrics(batchId, nextAssets));

      console.log(`✅ Bulk asset upload complete: ${newAssets.length}/${inputs.length} assets created`);
      return newAssets;
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to create assets:', error);
      throw error;
    }
  },

  updateAsset: async (id: string, input: UpdateAssetInput, forceStatus = false) => {
    set({ isLoading: true });

    try {
      let updatedAsset: Asset | undefined;
      let nextAssets: Asset[] = [];
      let previousBatchId: string | undefined;

      set(state => {
        nextAssets = state.assets.map(a => {
          if (a.id === id) {
            previousBatchId = a.batchId;
            // Enforce status flow if status is provided
            if (input.status && !forceStatus) {
              const allowedNext = assetStatusFlow[a.status] || [];
              const sameStatus = a.status === input.status;
              if (!sameStatus && !allowedNext.includes(input.status)) {
                // Invalid transition - skip status change
                updatedAsset = { ...a, ...input, status: a.status, updatedAt: new Date() };
                return updatedAsset;
              }
            }

            updatedAsset = { ...a, ...input, updatedAt: new Date() };
            return updatedAsset;
          }
          return a;
        });
        return { assets: nextAssets };
      });

      if (!updatedAsset) {
        set({ isLoading: false });
        throw new Error('Asset not found');
      }

      // Update database with snake_case fields
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (input.serialNumber) updateData.serial_number = input.serialNumber;
      if (input.brand) updateData.brand = input.brand;
      if (input.model) updateData.model = input.model;
      if (input.assetTag !== undefined) updateData.asset_tag = input.assetTag || null;
      if (input.specs !== undefined) updateData.specs = input.specs || null;
      if (input.purchaseDate !== undefined) updateData.purchase_date = input.purchaseDate ? new Date(input.purchaseDate).toISOString() : null;
      if (input.assignedSubUserId !== undefined) updateData.assigned_sub_user_id = input.assignedSubUserId || null;
      if (input.assignedAt !== undefined) updateData.assigned_at = input.assignedAt ? new Date(input.assignedAt).toISOString() : null;
      if (input.status) updateData.status = input.status;
      if (input.grade !== undefined) updateData.grade = input.grade || null;
      if (input.basePrice !== undefined) updateData.base_price = input.basePrice || null;
      if (input.finalPrice !== undefined) updateData.final_price = input.finalPrice || null;
      if (input.batchId !== undefined) updateData.batch_id = input.batchId || null;

      const result = await db.update('assets', id, updateData);

      if (result.error) {
        console.error('Database update error:', result.error.message);
        // Don't throw - we've already updated local state
      }

      if (updatedAsset?.batchId) {
        get().recalculateBatchMetrics(updatedAsset.batchId, nextAssets);
      }
      if (previousBatchId && previousBatchId !== updatedAsset?.batchId) {
        get().recalculateBatchMetrics(previousBatchId, nextAssets);
      }

      set({ isLoading: false });
      console.log(`✅ Asset updated: ${id}`);
      return updatedAsset;
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to update asset:', error);
      throw error;
    }
  },

  updateAssetStatus: async (id: string, status: AssetStatus, grade?: AssetGrade, force = false) => {
    console.log('⚙️ [AssetStore] updateAssetStatus called:', {
      assetId: id,
      newStatus: status,
      grade,
      force
    });

    let currentAsset = get().assets.find(a => a.id === id);
    console.log('⚙️ [AssetStore] Current asset status:', currentAsset?.status);

    set({ isLoading: true });

    try {
      // If asset not in local state, try fetching from database
      if (!currentAsset) {
        console.log('⚙️ [AssetStore] Asset not in local state, fetching from database...');
        const result = await db.query('assets', {
          filters: [{ field: 'id', operator: 'eq', value: id }],
          limit: 1,
        });

        if (result.data && result.data.length > 0) {
          const dbAsset = result.data[0];
          // Convert snake_case to camelCase for local state
          currentAsset = {
            id: dbAsset.id,
            enterpriseId: dbAsset.enterprise_id,
            batchId: dbAsset.batch_id,
            serialNumber: dbAsset.serial_number,
            brand: dbAsset.brand,
            model: dbAsset.model,
            specs: dbAsset.specs,
            purchaseDate: dbAsset.purchase_date ? new Date(dbAsset.purchase_date) : undefined,
            status: dbAsset.status as AssetStatus,
            grade: dbAsset.grade as AssetGrade | undefined,
            assignedSubUserId: dbAsset.assigned_sub_user_id,
            assignedAt: dbAsset.assigned_at ? new Date(dbAsset.assigned_at) : undefined,
            basePrice: dbAsset.base_price,
            finalPrice: dbAsset.final_price,
            qcReport: dbAsset.qc_report,
            treatmentOutcome: dbAsset.treatment_outcome,
            treatmentDate: dbAsset.treatment_date ? new Date(dbAsset.treatment_date) : undefined,
            recyclerPartnerId: dbAsset.recycler_partner_id,
            eprCertificateId: dbAsset.epr_certificate_id,
            weightKg: dbAsset.weight_kg,
            createdAt: new Date(dbAsset.created_at),
            updatedAt: dbAsset.updated_at ? new Date(dbAsset.updated_at) : undefined,
          };
          // Add to local state
          set(state => ({ assets: [...state.assets, currentAsset!] }));
          console.log('✅ [AssetStore] Asset fetched from database and added to local state');
        }
      }

      if (!currentAsset) {
        set({ isLoading: false });
        console.error('❌ [AssetStore] Asset not found in local state or database:', id);
        throw new Error('Asset not found');
      }

      let updatedAsset: Asset | undefined;
      let nextAssets: Asset[] = [];
      set(state => {
        nextAssets = state.assets.map(a => {
          if (a.id === id) {
            // Enforce status transitions unless forced
            const allowedNext = assetStatusFlow[a.status] || [];
            const sameStatus = a.status === status;

            console.log('⚙️ [AssetStore] Status transition check:', {
              currentStatus: a.status,
              desiredStatus: status,
              allowedNext,
              sameStatus,
              force,
              willUpdate: force || sameStatus || allowedNext.includes(status)
            });

            if (!force && !sameStatus && !allowedNext.includes(status)) {
              console.log('❌ [AssetStore] Status transition BLOCKED - invalid flow');
              return a;
            }

            updatedAsset = { ...a, status, grade: grade || a.grade, updatedAt: new Date() };
            console.log('✅ [AssetStore] Status transition ALLOWED, new status:', updatedAsset.status);
            return updatedAsset;
          }
          return a;
        });
        return { assets: nextAssets };
      });

      if (!updatedAsset) {
        set({ isLoading: false });
        console.error('❌ [AssetStore] Asset update failed:', id);
        throw new Error('Asset update failed');
      }

      // Update database
      const result = await db.update('assets', id, {
        status,
        grade: grade || null,
        updated_at: new Date().toISOString(),
      });

      if (result.error) {
        console.error('Database update error:', result.error.message);
        // Don't throw - we've already updated local state
      }

      if (updatedAsset?.batchId) {
        get().recalculateBatchMetrics(updatedAsset.batchId, nextAssets);
      }

      set({ isLoading: false });
      console.log('⚙️ [AssetStore] updateAssetStatus completed, returning asset with status:', updatedAsset.status);
      return updatedAsset;
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to update asset status:', error);
      throw error;
    }
  },

  deleteAsset: async (id: string) => {
    set({ isLoading: true });

    try {
      // Delete from database
      const result = await db.delete('assets', id);

      if (result.error) {
        throw new Error(`Database error: ${result.error.message}`);
      }

      let removedBatchId: string | undefined;
      let nextAssets: Asset[] = [];
      set(state => {
        const remaining = state.assets.filter(a => {
          if (a.id === id) {
            removedBatchId = a.batchId;
            return false;
          }
          return true;
        });
        nextAssets = remaining;
        return { assets: remaining, isLoading: false };
      });

      if (removedBatchId) {
        get().recalculateBatchMetrics(removedBatchId, nextAssets);
      }

      console.log(`✅ Asset deleted: ${id}`);
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to delete asset:', error);
      throw error;
    }
  },

  assignSubUser: async (assetId: string, subUserId: string) => {
    const now = new Date();

    // Update database first
    const result = await db.update('assets', assetId, {
      status: 'assigned',
      assigned_sub_user_id: subUserId,
      assigned_at: now.toISOString(),
      updated_at: now.toISOString(),
    });

    if (result.error) {
      console.error('Failed to assign sub-user in database:', result.error.message);
      throw new Error(`Database error: ${result.error.message}`);
    }

    // Update local state
    let batchId: string | undefined;
    let nextAssets: Asset[] = [];
    set(state => {
      nextAssets = state.assets.map(a => {
        if (a.id === assetId) {
          batchId = a.batchId;
          return {
            ...a,
            status: 'assigned' as AssetStatus,
            assignedSubUserId: subUserId,
            assignedAt: now,
            updatedAt: now,
          };
        }
        return a;
      });
      return { assets: nextAssets };
    });

    if (batchId) {
      get().recalculateBatchMetrics(batchId, nextAssets);
    }

    console.log(`✅ Asset ${assetId} assigned to sub-user ${subUserId}`);
  },

  unassignAsset: async (assetId: string) => {
    const currentAsset = get().assets.find(a => a.id === assetId);

    // Only allow unassign from early stages
    if (!currentAsset || !['pending_assignment', 'assigned'].includes(currentAsset.status)) {
      console.log('Cannot unassign asset - not in valid state');
      return;
    }

    const now = new Date();

    // Update database first
    const result = await db.update('assets', assetId, {
      status: 'pending_assignment',
      assigned_sub_user_id: null,
      assigned_at: null,
      updated_at: now.toISOString(),
    });

    if (result.error) {
      console.error('Failed to unassign asset in database:', result.error.message);
      throw new Error(`Database error: ${result.error.message}`);
    }

    // Update local state
    let batchId: string | undefined;
    let nextAssets: Asset[] = [];
    set(state => {
      nextAssets = state.assets.map(a => {
        if (a.id === assetId) {
          batchId = a.batchId;
          return {
            ...a,
            status: 'pending_assignment' as AssetStatus,
            assignedSubUserId: undefined,
            assignedAt: undefined,
            updatedAt: now,
          };
        }
        return a;
      });
      return { assets: nextAssets };
    });

    if (batchId) {
      get().recalculateBatchMetrics(batchId, nextAssets);
    }

    console.log(`✅ Asset ${assetId} unassigned`);
  },

  unassignSubUser: async (subUserId: string) => {
    // Cascade unassign: remove sub-user assignment from all their assets
    // Only unassign if asset is in early stages (pending_assignment or assigned)
    const assetsToUnassign = get().assets.filter(
      a => a.assignedSubUserId === subUserId && ['pending_assignment', 'assigned'].includes(a.status)
    );

    if (assetsToUnassign.length === 0) {
      console.log('No assets to unassign for sub-user:', subUserId);
      return;
    }

    const now = new Date();

    // Update each asset in the database
    for (const asset of assetsToUnassign) {
      const result = await db.update('assets', asset.id, {
        status: 'pending_assignment',
        assigned_sub_user_id: null,
        assigned_at: null,
        updated_at: now.toISOString(),
      });

      if (result.error) {
        console.error(`Failed to unassign asset ${asset.id}:`, result.error.message);
      }
    }

    // Update local state
    let affectedBatchIds = new Set<string>();
    let nextAssets: Asset[] = [];
    set(state => {
      nextAssets = state.assets.map(a => {
        if (a.assignedSubUserId === subUserId && ['pending_assignment', 'assigned'].includes(a.status)) {
          if (a.batchId) affectedBatchIds.add(a.batchId);
          return {
            ...a,
            status: 'pending_assignment' as AssetStatus,
            assignedSubUserId: undefined,
            assignedAt: undefined,
            updatedAt: now,
          };
        }
        return a;
      });
      return { assets: nextAssets };
    });

    affectedBatchIds.forEach(batchId => get().recalculateBatchMetrics(batchId, nextAssets));
    console.log(`✅ Unassigned ${assetsToUnassign.length} assets from sub-user ${subUserId}`);
  },

  setFilters: (filters: AssetFilters) => {
    set({ filters });
  },

  setSelectedAsset: (asset: Asset | null) => {
    set({ selectedAsset: asset });
  },

  getFilteredAssets: () => {
    const { assets, filters } = get();

    return assets.filter(asset => {
      // Status filter
      if (filters.status && filters.status !== 'all' && asset.status !== filters.status) {
        return false;
      }

      // Batch filter
      if (filters.batchId && asset.batchId !== filters.batchId) {
        return false;
      }

      // Search filter
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const matchesSearch =
          asset.serialNumber.toLowerCase().includes(search) ||
          asset.brand.toLowerCase().includes(search) ||
          asset.model.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      return true;
    });
  },

  getAssetStats: (enterpriseId: string) => {
    const assets = get().assets.filter(a => a.enterpriseId === enterpriseId);

    return {
      total: assets.length,
      // Pending should only be unassigned assets
      pending: assets.filter(a => a.status === 'pending_assignment').length,
      // In Review includes all in-progress statuses from assignment to facility QC
      inReview: assets.filter(a => ['assigned', 'check_in_started', 'submitted', 'remote_review', 'conditionally_accepted', 'pickup_requested', 'pickup_scheduled', 'picked_up', 'in_transit', 'facility_qc'].includes(a.status)).length,
      accepted: assets.filter(a => ['final_accepted', 'payout_pending', 'completed'].includes(a.status)).length,
      rejected: assets.filter(a => ['remote_rejected', 'final_rejected', 'disputed'].includes(a.status)).length,
    };
  },

  recalculateBatchMetrics: (batchId?: string, assetsOverride?: Asset[]) => {
    const assets = assetsOverride || get().assets;
    const targetBatchIds = batchId
      ? [batchId]
      : Array.from(new Set(assets.map(a => a.batchId).filter(Boolean))) as string[];

    targetBatchIds.forEach(id => {
      const batchAssets = assets.filter(a => a.batchId === id);
      if (batchAssets.length === 0) return;

      const acceptedCount = batchAssets.filter(a =>
        ['conditionally_accepted', 'final_accepted', 'payout_pending', 'completed'].includes(a.status)
      ).length;
      const rejectedCount = batchAssets.filter(a =>
        ['remote_rejected', 'final_rejected'].includes(a.status)
      ).length;

      const metrics = {
        assetCount: batchAssets.length,
        acceptedCount,
        rejectedCount,
        pendingCount: Math.max(batchAssets.length - acceptedCount - rejectedCount, 0),
        estimatedValue: batchAssets.reduce((sum, a) => sum + (a.basePrice || 0), 0),
        totalPayout: batchAssets.reduce((sum, a) => sum + (a.finalPrice || 0), 0),
        updatedAt: new Date(),
      };

      useBatchStore.setState(state => ({
        batches: state.batches.map(b => (b.id === id ? { ...b, ...metrics } : b)),
      }));
    });
  },
    }),
    {
      name: 'ecotribe-asset-store',
      partialize: (state) => ({ assets: state.assets }),
    }
  )
);
