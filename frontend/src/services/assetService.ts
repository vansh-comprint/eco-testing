/**
 * Asset Service - Hybrid localStorage/Supabase adapter
 *
 * This service provides a unified interface for asset operations,
 * automatically routing to either localStorage or Supabase based on configuration.
 */

import type { Asset, AssetStatus, CreateAssetInput, UpdateAssetInput, AssetGrade } from '@/types';
import { supabase, isSupabaseEnabled } from '@/lib/supabase';
import { generateId } from '@/lib/utils';

// ============================================================================
// SUPABASE OPERATIONS
// ============================================================================

async function fetchAssetsFromSupabase(enterpriseId: string): Promise<Asset[]> {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('enterprise_id', enterpriseId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Map snake_case to camelCase
  return (data || []).map(row => ({
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
  }));
}

async function createAssetInSupabase(input: CreateAssetInput): Promise<Asset> {
  const id = `ast-${generateId()}`;
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('assets')
    .insert({
      id,
      enterprise_id: input.enterpriseId,
      batch_id: input.batchId || null,
      serial_number: input.serialNumber,
      brand: input.brand,
      model: input.model,
      asset_tag: input.assetTag || null,
      specs: input.specs || null,
      purchase_date: input.purchaseDate?.toISOString() || null,
      status: 'pending_assignment',
      base_price: input.basePrice || null,
      created_at: now,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    enterpriseId: data.enterprise_id,
    batchId: data.batch_id || undefined,
    serialNumber: data.serial_number,
    brand: data.brand,
    model: data.model,
    assetTag: data.asset_tag || undefined,
    specs: data.specs as any,
    purchaseDate: data.purchase_date ? new Date(data.purchase_date) : undefined,
    status: data.status as AssetStatus,
    basePrice: data.base_price || undefined,
    createdAt: new Date(data.created_at),
  };
}

async function updateAssetInSupabase(id: string, input: UpdateAssetInput): Promise<Asset> {
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  // Map camelCase to snake_case
  if (input.status !== undefined) updateData.status = input.status;
  if (input.grade !== undefined) updateData.grade = input.grade;
  if (input.batchId !== undefined) updateData.batch_id = input.batchId;
  if (input.assignedSubUserId !== undefined) updateData.assigned_sub_user_id = input.assignedSubUserId;
  if (input.assignedAt !== undefined) updateData.assigned_at = input.assignedAt?.toISOString();
  if (input.basePrice !== undefined) updateData.base_price = input.basePrice;
  if (input.finalPrice !== undefined) updateData.final_price = input.finalPrice;
  if (input.treatmentOutcome !== undefined) updateData.treatment_outcome = input.treatmentOutcome;
  if (input.treatmentDate !== undefined) updateData.treatment_date = input.treatmentDate?.toISOString();
  if (input.recyclerPartnerId !== undefined) updateData.recycler_partner_id = input.recyclerPartnerId;
  if (input.weightKg !== undefined) updateData.weight_kg = input.weightKg;
  if (input.eprCertificateId !== undefined) updateData.epr_certificate_id = input.eprCertificateId;
  if (input.qcReport !== undefined) updateData.qc_report = input.qcReport;

  const { data, error } = await supabase
    .from('assets')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    enterpriseId: data.enterprise_id,
    batchId: data.batch_id || undefined,
    serialNumber: data.serial_number,
    brand: data.brand,
    model: data.model,
    assetTag: data.asset_tag || undefined,
    specs: data.specs as any,
    purchaseDate: data.purchase_date ? new Date(data.purchase_date) : undefined,
    assignedSubUserId: data.assigned_sub_user_id || undefined,
    assignedAt: data.assigned_at ? new Date(data.assigned_at) : undefined,
    status: data.status as AssetStatus,
    grade: data.grade as AssetGrade | undefined,
    basePrice: data.base_price || undefined,
    finalPrice: data.final_price || undefined,
    treatmentOutcome: data.treatment_outcome || undefined,
    treatmentDate: data.treatment_date ? new Date(data.treatment_date) : undefined,
    recyclerPartnerId: data.recycler_partner_id || undefined,
    weightKg: data.weight_kg || undefined,
    eprCertificateId: data.epr_certificate_id || undefined,
    qcReport: data.qc_report as any,
    createdAt: new Date(data.created_at),
    updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
  };
}

async function deleteAssetInSupabase(id: string): Promise<void> {
  const { error } = await supabase
    .from('assets')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// REALTIME SUBSCRIPTIONS
// ============================================================================

export type AssetChangeHandler = (payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Asset | null;
  old: Asset | null;
}) => void;

export function subscribeToAssetChanges(
  enterpriseId: string,
  callback: AssetChangeHandler
): (() => void) | null {
  if (!isSupabaseEnabled) return null;

  const channel = supabase
    .channel(`assets:enterprise_id=eq.${enterpriseId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'assets',
        filter: `enterprise_id=eq.${enterpriseId}`,
      },
      (payload) => {
        console.log('[AssetService] Real-time change detected:', payload);

        // Map Supabase payload to our Asset type
        const mapRow = (row: any): Asset | null => {
          if (!row) return null;
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
            createdAt: new Date(row.created_at),
            updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
          };
        };

        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: mapRow(payload.new),
          old: mapRow(payload.old),
        });
      }
    )
    .subscribe();

  // Return cleanup function
  return () => {
    supabase.removeChannel(channel);
  };
}

// ============================================================================
// PUBLIC API (Routes to localStorage or Supabase based on config)
// ============================================================================

export const AssetService = {
  /**
   * Fetch all assets for an enterprise
   */
  async fetchAssets(enterpriseId: string): Promise<Asset[] | null> {
    if (!isSupabaseEnabled) {
      // Return null to signal that localStorage should be used
      return null;
    }
    return fetchAssetsFromSupabase(enterpriseId);
  },

  /**
   * Create a new asset
   */
  async createAsset(input: CreateAssetInput): Promise<Asset | null> {
    if (!isSupabaseEnabled) {
      return null;
    }
    return createAssetInSupabase(input);
  },

  /**
   * Update an existing asset
   */
  async updateAsset(id: string, input: UpdateAssetInput): Promise<Asset | null> {
    if (!isSupabaseEnabled) {
      return null;
    }
    return updateAssetInSupabase(id, input);
  },

  /**
   * Delete an asset
   */
  async deleteAsset(id: string): Promise<boolean> {
    if (!isSupabaseEnabled) {
      return false;
    }
    await deleteAssetInSupabase(id);
    return true;
  },

  /**
   * Subscribe to real-time changes
   */
  subscribeToChanges: subscribeToAssetChanges,

  /**
   * Check if Supabase is enabled
   */
  get isEnabled() {
    return isSupabaseEnabled;
  },
};
