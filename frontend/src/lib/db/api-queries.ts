/**
 * API-based Query Functions
 * All read operations from REST API
 */

import {
  enterprisesApi,
  usersApi,
  assetsApi,
  batchesApi,
  branchesApi,
  pickupsApi,
  logisticsApi,
  enterpriseApplicationsApi,
} from '@/lib/api';

// ============================================
// ENTERPRISES
// ============================================

export async function fetchEnterprises() {
  const response = await enterprisesApi.list({ limit: 100 });
  return response.data || [];
}

export async function fetchEnterpriseById(enterpriseId: string) {
  const response = await enterprisesApi.get(enterpriseId);
  return response.data;
}

// ============================================
// ENTERPRISE APPLICATIONS
// ============================================

export async function fetchEnterpriseApplications(status?: string) {
  const response = await enterpriseApplicationsApi.list({ status: status as any });
  return response.data || [];
}

export async function fetchEnterpriseApplicationById(id: string) {
  const response = await enterpriseApplicationsApi.get(id);
  return response.data;
}

// ============================================
// USERS
// ============================================

export async function fetchAllUsers() {
  const response = await usersApi.list({ limit: 1000 });
  return response.data || [];
}

export async function fetchUserById(userId: string) {
  const response = await usersApi.get(userId);
  return response.data;
}

export async function fetchUsersByEnterprise(enterpriseId: string) {
  const response = await usersApi.list({ enterprise_id: enterpriseId, limit: 1000 });
  return response.data || [];
}

// ============================================
// ASSETS
// ============================================

export async function fetchAllAssets() {
  const response = await assetsApi.list({ limit: 100 });
  return response.data || [];
}

export async function fetchAssets(enterpriseId: string) {
  const response = await assetsApi.list({ enterprise_id: enterpriseId, limit: 100 });
  return response.data || [];
}

export async function fetchAssetById(assetId: string) {
  const response = await assetsApi.get(assetId);
  return response.data;
}

export async function fetchAssetsByBranch(branchId: string) {
  const response = await assetsApi.list({ branch_id: branchId });
  return response.data || [];
}

export async function fetchAssetsByBatch(batchId: string) {
  const response = await assetsApi.list({ batch_id: batchId });
  return response.data || [];
}

/**
 * Fetch assets by IT Admin (returns assets from branches they manage)
 * Uses the assets API with no enterprise filter - backend handles scoping
 */
export async function fetchAssetsByITAdmin(itAdminId: string) {
  // The backend /assets endpoint already supports filtering by the current user's scope
  // For IT admins, it returns only assets in their assigned branches
  const response = await assetsApi.list({ limit: 100 });
  return response.data || [];
}

/**
 * Fetch self-assigned assets for a user
 */
export async function fetchSelfAssignedAssets(userId: string) {
  // Self-assigned assets are assets where the user is both the IT admin and the assigned user
  const response = await assetsApi.list({ limit: 100 });
  const assets = response.data || [];
  // Filter client-side for self-assigned (assigned_to_user_id matches the current user)
  return Array.isArray(assets) ? assets.filter((a: any) => a.assigned_to_user_id === userId) : [];
}

/**
 * Fetch pending self-evaluations
 */
export async function fetchPendingSelfEvaluations(userId: string) {
  const response = await assetsApi.list({ status: 'pending_evaluation', limit: 100 });
  return response.data || [];
}

// ============================================
// ASSET MUTATIONS (via REST API)
// ============================================

export async function createAsset(input: {
  serial_number: string;
  brand?: string;
  model?: string;
  enterprise_id?: string;
  branch_id?: string;
  batch_id?: string;
  device_type?: string;
  asset_tag?: string;
  specs?: Record<string, unknown>;
  purchase_date?: string;
  assigned_to_user_id?: string;
}) {
  const response = await assetsApi.create({
    serial_number: input.serial_number,
    brand: input.brand,
    model: input.model,
    enterprise_id: input.enterprise_id,
    branch_id: input.branch_id,
    batch_id: input.batch_id,
    device_type: input.device_type || 'laptop',
    asset_tag: input.asset_tag,
    specs: input.specs,
    purchase_date: input.purchase_date,
    assigned_to_user_id: input.assigned_to_user_id,
  });
  if (!response.success) throw new Error(response.error?.message || 'Failed to create asset');
  return response.data;
}

export async function updateAsset(id: string, input: Record<string, unknown>) {
  const response = await assetsApi.update(id, input as any);
  if (!response.success) throw new Error(response.error?.message || 'Failed to update asset');
  return response.data;
}

export async function deleteAsset(id: string) {
  const response = await assetsApi.delete(id);
  if (!response.success) throw new Error(response.error?.message || 'Failed to delete asset');
  return true;
}

export async function assignAssetToSubUser(assetId: string, subUserId: string) {
  const response = await assetsApi.assign(assetId, subUserId);
  if (!response.success) throw new Error(response.error?.message || 'Failed to assign asset');
  return response.data;
}

export async function assignAssetToSelf(assetId: string, userId: string) {
  const response = await assetsApi.update(assetId, { assigned_to_user_id: userId });
  if (!response.success) throw new Error(response.error?.message || 'Failed to self-assign asset');
  return response.data;
}

export async function unassignAsset(assetId: string) {
  const response = await assetsApi.unassign(assetId);
  if (!response.success) throw new Error(response.error?.message || 'Failed to unassign asset');
  return response.data;
}

export async function updateAssetStatus(assetId: string, status: string) {
  const response = await assetsApi.update(assetId, { status } as any);
  if (!response.success) throw new Error(response.error?.message || 'Failed to update asset status');
  return response.data;
}

export async function bulkCreateAssets(assets: Array<Record<string, unknown>>) {
  // Backend AssetBulkCreate expects enterprise_id, branch_id, batch_id at top level
  const first = assets[0] || {};
  const payload = {
    enterprise_id: first.enterprise_id as string | undefined,
    branch_id: first.branch_id as string | undefined,
    batch_id: first.batch_id as string | undefined,
    assets: assets.map(({ enterprise_id, branch_id, batch_id, it_admin_id, ...item }) => item),
  };
  const response = await assetsApi.createBulk(payload as any);
  if (!response.success) throw new Error(response.error?.message || 'Failed to bulk create assets');
  return response.data || [];
}

// ============================================
// BATCHES
// ============================================

export async function fetchAllBatches() {
  const response = await batchesApi.list({ limit: 1000 });
  return response.data || [];
}

export async function fetchBatches(enterpriseId: string) {
  const response = await batchesApi.list({ enterprise_id: enterpriseId, limit: 1000 });
  return response.data || [];
}

export async function fetchBatchById(batchId: string) {
  const response = await batchesApi.get(batchId);
  return response.data;
}

export async function fetchBatchesByStatus(status: string) {
  const response = await batchesApi.list({ status: status as any });
  return response.data || [];
}

// ============================================
// BRANCHES
// ============================================

export async function fetchBranches(enterpriseId: string) {
  const response = await branchesApi.list({ enterprise_id: enterpriseId });
  return response.data || [];
}

export async function fetchBranchById(branchId: string) {
  const response = await branchesApi.get(branchId);
  return response.data;
}

// ============================================
// PICKUP REQUESTS
// ============================================

export async function fetchAllPickupRequests() {
  const response = await pickupsApi.list({ limit: 1000 });
  return response.data || [];
}

export async function fetchPickupRequests(enterpriseId: string) {
  const response = await pickupsApi.list({ enterprise_id: enterpriseId, limit: 1000 });
  return response.data || [];
}

export async function fetchPickupRequestById(pickupId: string) {
  const response = await pickupsApi.get(pickupId);
  return response.data;
}

export async function fetchPickupRequestsByStatus(status: string) {
  const response = await pickupsApi.list({ status: status as any });
  return response.data || [];
}

// ============================================
// LOGISTICS
// ============================================

export async function fetchLogisticsAdmins() {
  const response = await logisticsApi.listAdmins();
  return response.data || [];
}

export async function fetchLogisticsAdminById(id: string) {
  const response = await logisticsApi.getAdmin(id);
  return response.data;
}

export async function fetchLogisticsUsers(logisticsAdminId?: string) {
  const response = await logisticsApi.listUsers({ logistics_admin_id: logisticsAdminId });
  return response.data || [];
}

export async function fetchLogisticsUserById(id: string) {
  const response = await logisticsApi.getUser(id);
  return response.data;
}
