/**
 * Asset Service (v2) - Database Agnostic
 *
 * This is the NEW version that uses the database abstraction layer.
 * Works with ANY database (Supabase, PostgreSQL, MongoDB, LocalStorage, etc.)
 *
 * Replace the old assetService.ts with this after testing.
 */

import { db } from '@/lib/database';
import type { Asset, AssetStatus, CreateAssetInput, UpdateAssetInput, AssetGrade } from '@/types';
import { generateId } from '@/lib/utils';
import type { RealtimeSubscription } from '@/lib/database';

// Helper: Map camelCase Asset to snake_case database row
function toDbRow(asset: Partial<Asset>): Record<string, any> {
  return {
    id: asset.id,
    enterprise_id: asset.enterpriseId,
    batch_id: asset.batchId || null,
    serial_number: asset.serialNumber,
    brand: asset.brand,
    model: asset.model,
    asset_tag: asset.assetTag || null,
    specs: asset.specs || null,
    purchase_date: asset.purchaseDate?.toISOString() || null,
    assigned_sub_user_id: asset.assignedSubUserId || null,
    assigned_at: asset.assignedAt?.toISOString() || null,
    status: asset.status,
    grade: asset.grade || null,
    base_price: asset.basePrice || null,
    final_price: asset.finalPrice || null,
    treatment_outcome: asset.treatmentOutcome || null,
    treatment_date: asset.treatmentDate?.toISOString() || null,
    recycler_partner_id: asset.recyclerPartnerId || null,
    weight_kg: asset.weightKg || null,
    epr_certificate_id: asset.eprCertificateId || null,
    qc_report: asset.qcReport || null,
    created_at: asset.createdAt?.toISOString() || new Date().toISOString(),
    updated_at: asset.updatedAt?.toISOString() || null,
  };
}

// Helper: Map snake_case database row to camelCase Asset
function fromDbRow(row: any): Asset {
  return {
    id: row.id,
    enterpriseId: row.enterprise_id,
    batchId: row.batch_id || undefined,
    serialNumber: row.serial_number,
    brand: row.brand,
    model: row.model,
    assetTag: row.asset_tag || undefined,
    specs: row.specs as any,
    purchaseDate: row.purchase_date ? new Date(row.purchase_date) : undefined,
    assignedSubUserId: row.assigned_sub_user_id || undefined,
    assignedAt: row.assigned_at ? new Date(row.assigned_at) : undefined,
    status: row.status as AssetStatus,
    grade: row.grade as AssetGrade | undefined,
    basePrice: row.base_price || undefined,
    finalPrice: row.final_price || undefined,
    treatmentOutcome: row.treatment_outcome || undefined,
    treatmentDate: row.treatment_date ? new Date(row.treatment_date) : undefined,
    recyclerPartnerId: row.recycler_partner_id || undefined,
    weightKg: row.weight_kg || undefined,
    eprCertificateId: row.epr_certificate_id || undefined,
    qcReport: row.qc_report as any,
    createdAt: new Date(row.created_at),
    updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
  };
}

export const AssetService = {
  /**
   * Fetch all assets for an enterprise
   */
  async fetchAssets(enterpriseId: string): Promise<Asset[]> {
    const result = await db.query('assets', {
      filters: [{ field: 'enterprise_id', operator: 'eq', value: enterpriseId }],
      orderBy: [{ field: 'created_at', ascending: false }],
    });

    if (result.error) {
      console.error('[AssetService] Fetch failed:', result.error);
      return [];
    }

    return result.data.map(fromDbRow);
  },

  /**
   * Get asset by ID
   */
  async getAssetById(id: string): Promise<Asset | null> {
    const result = await db.queryById('assets', id);

    if (result.error) {
      console.error('[AssetService] Get by ID failed:', result.error);
      return null;
    }

    return result.data ? fromDbRow(result.data) : null;
  },

  /**
   * Get assets by SubUser ID
   */
  async getAssetsBySubUserId(subUserId: string): Promise<Asset[]> {
    const result = await db.query('assets', {
      filters: [{ field: 'assigned_sub_user_id', operator: 'eq', value: subUserId }],
    });

    if (result.error) {
      console.error('[AssetService] Fetch by SubUser failed:', result.error);
      return [];
    }

    return result.data.map(fromDbRow);
  },

  /**
   * Create a new asset
   */
  async createAsset(input: CreateAssetInput): Promise<Asset | null> {
    const id = `ast-${generateId()}`;

    const newAsset: Partial<Asset> = {
      id,
      ...input,
      status: 'pending_assignment',
      createdAt: new Date(),
    };

    const result = await db.insert('assets', toDbRow(newAsset));

    if (result.error) {
      console.error('[AssetService] Create failed:', result.error);
      return null;
    }

    return result.data ? fromDbRow(result.data) : null;
  },

  /**
   * Create multiple assets
   */
  async createAssets(inputs: CreateAssetInput[]): Promise<Asset[]> {
    const newAssets = inputs.map(input => {
      const id = `ast-${generateId()}`;
      return toDbRow({
        id,
        ...input,
        status: 'pending_assignment' as AssetStatus,
        createdAt: new Date(),
      });
    });

    const result = await db.insertMany('assets', newAssets);

    if (result.error) {
      console.error('[AssetService] Create many failed:', result.error);
      return [];
    }

    return result.data.map(fromDbRow);
  },

  /**
   * Update an asset
   */
  async updateAsset(id: string, input: UpdateAssetInput): Promise<Asset | null> {
    const updateData = toDbRow({
      ...input,
      updatedAt: new Date(),
    });

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) delete updateData[key];
    });

    const result = await db.update('assets', id, updateData);

    if (result.error) {
      console.error('[AssetService] Update failed:', result.error);
      return null;
    }

    return result.data ? fromDbRow(result.data) : null;
  },

  /**
   * Update asset status
   */
  async updateAssetStatus(id: string, status: AssetStatus, grade?: AssetGrade): Promise<Asset | null> {
    return AssetService.updateAsset(id, { status, grade });
  },

  /**
   * Delete an asset
   */
  async deleteAsset(id: string): Promise<boolean> {
    const result = await db.delete('assets', id);

    if (result.error) {
      console.error('[AssetService] Delete failed:', result.error);
      return false;
    }

    return true;
  },

  /**
   * Subscribe to real-time asset changes for an enterprise
   */
  async subscribeToChanges(
    enterpriseId: string,
    callback: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; asset: Asset | null }) => void
  ): Promise<RealtimeSubscription | null> {
    return db.subscribe(
      'assets',
      { filters: [{ field: 'enterprise_id', operator: 'eq', value: enterpriseId }] },
      (payload) => {
        const asset = payload.new ? fromDbRow(payload.new) : null;
        callback({
          eventType: payload.eventType,
          asset,
        });
      }
    );
  },
};
