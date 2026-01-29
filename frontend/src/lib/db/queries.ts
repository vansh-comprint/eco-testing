/**
 * Database Query Functions
 * All read operations from Supabase
 */

import { supabase, supabaseAdmin } from '@/lib/supabase';

// ============================================
// ASSETS
// ============================================

export async function fetchAssets(enterpriseId: string) {
  const { data, error } = await supabase
    .from('assets')
    .select(`
      *,
      sub_users:assigned_sub_user_id(*),
      batches:batch_id(*),
      branches:branch_id(*)
    `)
    .eq('enterprise_id', enterpriseId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Fetch all assets (OPS admin view)
export async function fetchAllAssets() {
  const { data, error } = await supabase
    .from('assets')
    .select(`
      *,
      sub_users:assigned_sub_user_id(*),
      batches:batch_id(*),
      branches:branch_id(*),
      enterprises:enterprise_id(id, name)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function fetchAssetById(assetId: string) {
  const { data, error } = await supabase
    .from('assets')
    .select(`
      *,
      sub_users:assigned_sub_user_id(*),
      batches:batch_id(*),
      branches:branch_id(*),
      submissions(*),
      remote_reviews(*),
      facility_qc(*)
    `)
    .eq('id', assetId)
    .single();

  if (error) throw error;
  return data;
}

export async function fetchAssetsByBranch(branchId: string) {
  const { data, error } = await supabase
    .from('assets')
    .select('*, sub_users:assigned_sub_user_id(*), batches:batch_id(*)')
    .eq('branch_id', branchId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Fetch assets for IT Admin (across all their assigned branches)
// V3.2: Supports both new schema (branches.it_admin_id) and legacy (batch.created_by)
export async function fetchAssetsByITAdmin(itAdminId: string) {
  // First try to get branches assigned to this IT admin via it_admin_id
  const { data: branches, error: branchError } = await supabase
    .from('branches')
    .select('id')
    .eq('it_admin_id', itAdminId);

  // If error or no branches found via it_admin_id, fallback to assets in batches created by this IT admin
  if (branchError || !branches || branches.length === 0) {
    // Fallback: Get batches created by this IT admin first
    const { data: batches, error: batchError } = await supabase
      .from('batches')
      .select('id')
      .eq('created_by', itAdminId);

    if (batchError) throw batchError;

    const batchIds = batches?.map(b => b.id) || [];

    if (batchIds.length === 0) {
      return []; // No batches created by this IT admin
    }

    const { data, error } = await supabase
      .from('assets')
      .select(`
        *,
        sub_users:assigned_sub_user_id(*),
        batches:batch_id(*),
        branches:branch_id(id, branch_name, branch_code)
      `)
      .in('batch_id', batchIds)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  const branchIds = branches.map(b => b.id);

  // Also get batches created by this IT admin (for assets without branch_id)
  const { data: createdBatches } = await supabase
    .from('batches')
    .select('id')
    .eq('created_by', itAdminId);

  const createdBatchIds = createdBatches?.map(b => b.id) || [];

  // Query assets that match EITHER:
  // 1. branch_id is in the IT admin's assigned branches
  // 2. OR batch_id is in batches created by this IT admin
  let query = supabase
    .from('assets')
    .select(`
      *,
      sub_users:assigned_sub_user_id(*),
      batches:batch_id(*),
      branches:branch_id(id, branch_name, branch_code)
    `);

  if (createdBatchIds.length > 0) {
    query = query.or(`branch_id.in.(${branchIds.join(',')}),batch_id.in.(${createdBatchIds.join(',')})`);
  } else {
    query = query.in('branch_id', branchIds);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function fetchAssetsByBatch(batchId: string) {
  const { data, error } = await supabase
    .from('assets')
    .select('*, sub_users:assigned_sub_user_id(*)')
    .eq('batch_id', batchId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Fetch assets assigned to a user (admin) for self-evaluation
 * Returns assets where assigned_user_id matches the given user
 */
export async function fetchSelfAssignedAssets(userId: string) {
  const { data, error } = await supabase
    .from('assets')
    .select(`
      *,
      batches:batch_id(*),
      branches:branch_id(id, branch_name, branch_code),
      submissions(*)
    `)
    .eq('assigned_user_id', userId)
    .eq('is_self_assigned', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Fetch pending self-evaluations for an admin
 * Only returns assets that need evaluation (assigned but not yet submitted)
 */
export async function fetchPendingSelfEvaluations(userId: string) {
  const { data, error } = await supabase
    .from('assets')
    .select(`
      *,
      batches:batch_id(*),
      branches:branch_id(id, branch_name, branch_code)
    `)
    .eq('assigned_user_id', userId)
    .eq('is_self_assigned', true)
    .in('status', ['assigned', 'check_in_started'])
    .order('assigned_at', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Fetch assets by multiple IDs with submissions and remote reviews
 * Used by logistics user to see full asset details during pickup
 */
export async function fetchAssetsByIds(assetIds: string[]) {
  if (!assetIds || assetIds.length === 0) return [];

  const { data, error } = await supabase
    .from('assets')
    .select(`
      *,
      sub_users:assigned_sub_user_id(*),
      batches:batch_id(*),
      submissions(*),
      remote_reviews(*)
    `)
    .in('id', assetIds);

  if (error) throw error;
  return data;
}

// ============================================
// BATCHES
// ============================================

export async function fetchBatches(enterpriseId: string) {
  const { data, error } = await supabase
    .from('batches')
    .select(`
      *,
      branches:branch_id(*),
      users:created_by(id, name, email)
    `)
    .eq('enterprise_id', enterpriseId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Fetch all batches (OPS admin view)
export async function fetchAllBatches() {
  const { data, error } = await supabase
    .from('batches')
    .select(`
      *,
      branches:branch_id(*),
      users:created_by(id, name, email),
      enterprises:enterprise_id(id, name)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function fetchBatchById(batchId: string) {
  const { data, error } = await supabase
    .from('batches')
    .select(`
      *,
      branches:branch_id(*),
      users:created_by(id, name, email),
      assets(*)
    `)
    .eq('id', batchId)
    .single();

  if (error) throw error;
  return data;
}

export async function fetchBatchesByBranch(branchId: string) {
  const { data, error } = await supabase
    .from('batches')
    .select('*, users:created_by(id, name, email)')
    .eq('branch_id', branchId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Fetch batches for IT Admin (across all their assigned branches)
// V3.2: Supports both new schema (branches.it_admin_id) and legacy (batches.created_by)
export async function fetchBatchesByITAdmin(itAdminId: string) {
  console.log('🔍 fetchBatchesByITAdmin called with userId:', itAdminId);

  // First try to get branches assigned to this IT admin via it_admin_id
  const { data: branches, error: branchError } = await supabase
    .from('branches')
    .select('id')
    .eq('it_admin_id', itAdminId);

  console.log('🔍 Branches by it_admin_id:', branches?.length || 0, 'Error:', branchError?.message, 'Full error:', branchError);

  // If error or no branches found via it_admin_id, fallback to created_by
  if (branchError || !branches || branches.length === 0) {
    console.log('🔄 Falling back to created_by filter for userId:', itAdminId);
    console.log('🔍 Reason: branchError=', !!branchError, 'branches=', branches?.length);
    // Fallback: Get batches created by this IT admin
    const { data, error } = await supabase
      .from('batches')
      .select(`
        *,
        branches:branch_id(id, branch_name, branch_code),
        users:created_by(id, name, email)
      `)
      .eq('created_by', itAdminId)
      .order('created_at', { ascending: false });

    console.log('🔍 Batches by created_by:', data?.length || 0, 'Error:', error?.message);
    if (error) throw error;
    return data;
  }

  const branchIds = branches.map(b => b.id);

  // Query batches that match EITHER:
  // 1. branch_id is in the IT admin's assigned branches
  // 2. created_by is the IT admin (for batches without branch_id)
  const { data, error } = await supabase
    .from('batches')
    .select(`
      *,
      branches:branch_id(id, branch_name, branch_code),
      users:created_by(id, name, email)
    `)
    .or(`branch_id.in.(${branchIds.join(',')}),created_by.eq.${itAdminId}`)
    .order('created_at', { ascending: false });

  console.log('🔍 Batches query result:', data?.length || 0, 'Error:', error?.message);
  if (error) throw error;
  return data;
}

// ============================================
// BRANCHES
// ============================================

export async function fetchBranches(enterpriseId: string) {
  const { data, error } = await supabase
    .from('branches')
    .select(`
      *,
      it_admin:users!branches_it_admin_id_fkey(id, name, email, phone)
    `)
    .eq('enterprise_id', enterpriseId)
    .order('branch_name');

  if (error) throw error;
  return data;
}

export async function fetchBranchById(branchId: string) {
  const { data, error } = await supabase
    .from('branches')
    .select(`
      *,
      it_admin:users!branches_it_admin_id_fkey(id, name, email, phone)
    `)
    .eq('id', branchId)
    .single();

  if (error) throw error;
  return data;
}

export async function fetchBranchSummary(enterpriseId: string) {
  const { data, error } = await supabase
    .from('branch_summary')
    .select('*')
    .eq('enterprise_id', enterpriseId);

  if (error) throw error;
  return data;
}

export async function fetchBranchesByITAdmin(userId: string) {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('it_admin_id', userId)
    .order('branch_name');

  if (error) throw error;
  return data;
}

export async function checkBranchCodeExists(enterpriseId: string, code: string) {
  const { data, error } = await supabase
    .from('branches')
    .select('id')
    .eq('enterprise_id', enterpriseId)
    .eq('branch_code', code.toUpperCase())
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

// ============================================
// SUB-USERS
// ============================================

export async function fetchSubUsers(enterpriseId: string) {
  const { data, error } = await supabase
    .from('sub_users')
    .select('*')
    .eq('enterprise_id', enterpriseId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function fetchSubUserById(subUserId: string) {
  const { data, error } = await supabase
    .from('sub_users')
    .select('*, assets(*)')
    .eq('id', subUserId)
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// USERS (IT Admins, Org Admins)
// ============================================

export async function fetchUsers(enterpriseId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('enterprise_id', enterpriseId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function fetchUsersByRole(enterpriseId: string, role: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('enterprise_id', enterpriseId)
    .eq('role', role)
    .order('name');

  if (error) throw error;
  return data;
}

// Fetch user (IT Admin/Org Admin) by email for asset assignment
export async function fetchUserByEmail(email: string, enterpriseId?: string) {
  let query = supabase
    .from('users')
    .select('id, email, name, role, enterprise_id')
    .eq('email', email.toLowerCase().trim())
    .in('role', ['it_admin', 'org_admin']);

  // Optionally filter by enterprise
  if (enterpriseId) {
    query = query.eq('enterprise_id', enterpriseId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchITAdmins(enterpriseId: string) {
  // V3.2: Fetch ALL IT admins (active and inactive) for management page
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('enterprise_id', enterpriseId)
    .eq('role', 'it_admin')
    .order('name');

  if (error) throw error;
  return data;
}

// Fetch only active IT admins (for dropdowns/assignments)
export async function fetchActiveITAdmins(enterpriseId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('enterprise_id', enterpriseId)
    .eq('role', 'it_admin')
    .eq('status', 'active')
    .order('name');

  if (error) throw error;
  return data;
}

export async function fetchITAdminBranches(enterpriseId: string) {
  // Uses the it_admin_branches view
  const { data, error } = await supabase
    .from('it_admin_branches')
    .select('*')
    .eq('enterprise_id', enterpriseId);

  if (error) throw error;
  return data;
}

// ============================================
// PICKUP REQUESTS
// ============================================

export async function fetchPickupRequests(enterpriseId: string) {
  // V3.2: Get pickup requests with branch data
  // Note: Removed all foreign key joins to avoid 400 errors - query separately

  const result = await supabase
    .from('pickup_requests')
    .select('*')
    .eq('enterprise_id', enterpriseId)
    .order('created_at', { ascending: false });

  if (result.error) throw result.error;

  // Enhance with branch data - location_id now stores branch_id
  const pickupIds = result.data?.map(p => p.id) || [];
  if (pickupIds.length > 0) {
    // Get branch info using location_id (which now contains branch_id)
    const locationIds = result.data?.map(p => p.location_id).filter(Boolean) || [];
    if (locationIds.length > 0) {
      const { data: branchData } = await supabase
        .from('branches')
        .select('id, branch_name, branch_code, address_line1, address_line2, city, state, pin_code, site_contact_person, site_contact_phone, operating_hours, special_instructions')
        .in('id', locationIds);

      if (branchData) {
        const branchMap = new Map(branchData.map(b => [b.id, b]));
        result.data?.forEach(pickup => {
          (pickup as any).branches = branchMap.get(pickup.location_id) || null;
        });
      }
    }
  }

  return result.data;
}

export async function fetchPickupRequestById(requestId: string) {
  // V3.2: Get pickup request with branch data
  // Note: Removed all foreign key joins to avoid 400 errors - query separately

  const result = await supabase
    .from('pickup_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (result.error) throw result.error;

  // Enhance with branch data - location_id now stores branch_id
  if (result.data?.location_id) {
    const { data: branchData } = await supabase
      .from('branches')
      .select('id, branch_name, branch_code, address_line1, address_line2, city, state, pin_code, site_contact_person, site_contact_phone, operating_hours, special_instructions')
      .eq('id', result.data.location_id)
      .single();

    if (branchData) {
      (result.data as any).branches = branchData;
    }
  }

  return result.data;
}

export async function fetchPickupApprovalQueue(enterpriseId: string) {
  const { data, error } = await supabase
    .from('pickup_approval_queue')
    .select('*')
    .eq('enterprise_id', enterpriseId);

  if (error) throw error;
  return data;
}

// Fetch pickup requests for IT Admin (across all their assigned branches)
// V3.2: Filter by location_id (which stores branch_id) or created_by
export async function fetchPickupsByITAdmin(itAdminId: string) {
  // Step 1: Get the branch IDs this IT admin manages
  const { data: branches, error: branchError } = await supabase
    .from('branches')
    .select('id')
    .eq('it_admin_id', itAdminId);

  // Build filter based on branches and/or created_by
  let branchIds: string[] = [];
  if (!branchError && branches && branches.length > 0) {
    branchIds = branches.map(b => b.id);
  }

  // Step 2: Get pickup requests
  // Filter by: location_id in branch IDs (V3.2) OR created_by this IT admin
  let result;

  if (branchIds.length > 0) {
    // New schema: Filter by location_id (branch) OR created_by
    result = await supabase
      .from('pickup_requests')
      .select('*')
      .or(`location_id.in.(${branchIds.join(',')}),created_by.eq.${itAdminId}`)
      .order('created_at', { ascending: false });
  } else {
    // Fallback: Filter only by created_by
    result = await supabase
      .from('pickup_requests')
      .select('*')
      .eq('created_by', itAdminId)
      .order('created_at', { ascending: false });
  }

  if (result.error) throw result.error;

  if (!result.data || result.data.length === 0) {
    return [];
  }

  // Enhance with branch data - location_id now stores branch_id
  const locationIds = result.data.map(p => p.location_id).filter(Boolean);
  if (locationIds.length > 0) {
    const { data: branchData } = await supabase
      .from('branches')
      .select('id, branch_name, branch_code, address_line1, address_line2, city, state, pin_code, site_contact_person, site_contact_phone, operating_hours, special_instructions')
      .in('id', locationIds);

    if (branchData) {
      const branchMap = new Map(branchData.map(b => [b.id, b]));
      result.data.forEach(pickup => {
        (pickup as any).branches = branchMap.get(pickup.location_id) || null;
      });
    }
  }

  return result.data;
}

// ============================================
// PICKUP LOCATIONS
// ============================================

export async function fetchPickupLocations(enterpriseId: string) {
  const { data, error } = await supabase
    .from('pickup_locations')
    .select('*')
    .eq('enterprise_id', enterpriseId)
    .order('name');

  if (error) throw error;
  return data;
}

// ============================================
// LOGISTICS
// ============================================

export async function fetchLogisticsAdmins() {
  // Use admin client to bypass RLS for logistics tables
  const { data, error } = await supabaseAdmin
    .from('logistics_admins')
    .select('*')
    .order('name');

  if (error) throw error;
  return data;
}

export async function fetchLogisticsUsers(logisticsAdminId?: string) {
  // Use admin client to bypass RLS for logistics tables
  let query = supabaseAdmin
    .from('logistics_users')
    .select('*, logistics_admins:logistics_admin_id(*)');

  if (logisticsAdminId) {
    query = query.eq('logistics_admin_id', logisticsAdminId);
  }

  const { data, error } = await query.order('name');

  if (error) throw error;
  return data;
}

// ============================================
// ENTERPRISE APPLICATIONS
// ============================================

export async function fetchEnterpriseApplications(status?: string) {
  let query = supabase
    .from('enterprise_applications')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

export async function fetchEnterpriseApplicationById(applicationId: string) {
  const { data, error } = await supabase
    .from('enterprise_applications')
    .select('*')
    .eq('id', applicationId)
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// ENTERPRISES
// ============================================

export async function fetchEnterprises() {
  const { data, error } = await supabase
    .from('enterprises')
    .select('*')
    .order('name');

  if (error) throw error;
  return data;
}

export async function fetchEnterpriseById(enterpriseId: string) {
  const { data, error } = await supabase
    .from('enterprises')
    .select('*, enterprise_wallets(*)')
    .eq('id', enterpriseId)
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// SUBMISSIONS
// ============================================

export async function fetchSubmissions(enterpriseId: string) {
  const { data, error } = await supabase
    .from('submissions')
    .select(`
      *,
      assets!inner(enterprise_id, serial_number, brand, model),
      sub_users(*)
    `)
    .eq('assets.enterprise_id', enterpriseId)
    .order('submitted_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function fetchSubmissionByAssetId(assetId: string) {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('asset_id', assetId)
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// REVIEWS
// ============================================

export async function fetchRemoteReviews(enterpriseId: string) {
  const { data, error } = await supabase
    .from('remote_reviews')
    .select(`
      *,
      assets!inner(enterprise_id, serial_number, brand, model),
      users:technician_id(name, email)
    `)
    .eq('assets.enterprise_id', enterpriseId)
    .order('reviewed_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function fetchFacilityQCs(enterpriseId: string) {
  const { data, error } = await supabase
    .from('facility_qc')
    .select(`
      *,
      assets!inner(enterprise_id, serial_number, brand, model),
      users:technician_id(name, email)
    `)
    .eq('assets.enterprise_id', enterpriseId)
    .order('completed_at', { ascending: false });

  if (error) throw error;
  return data;
}

// ============================================
// WALLETS & TRANSACTIONS
// ============================================

export async function fetchEnterpriseWallet(enterpriseId: string) {
  const { data, error } = await supabase
    .from('enterprise_wallets')
    .select('*')
    .eq('enterprise_id', enterpriseId)
    .maybeSingle();

  if (error) throw error;

  // Return default wallet if none exists
  if (!data) {
    return {
      id: null,
      enterprise_id: enterpriseId,
      available_balance: 0,
      pending_balance: 0,
      total_earned: 0,
      total_redeemed: 0,
      updated_at: null,
    };
  }

  return data;
}

export async function fetchCreditTransactions(enterpriseId: string) {
  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('enterprise_id', enterpriseId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// ============================================
// ORG ADMIN VIEW (using views)
// ============================================

export async function fetchOrgAdminAssetView(enterpriseId: string) {
  const { data, error } = await supabase
    .from('org_admin_asset_view')
    .select('*')
    .eq('enterprise_id', enterpriseId);

  if (error) throw error;
  return data;
}

// ============================================
// NOTIFICATIONS
// ============================================

export async function fetchNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data;
}

// ============================================
// AUDIT LOGS
// ============================================

export async function fetchAuditLogs(entityType: string, entityId: string) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// ============================================
// PAYOUTS
// ============================================

export async function fetchPayouts(enterpriseId: string) {
  const { data, error } = await supabase
    .from('payouts')
    .select(`
      *,
      batches:batch_id(id, name),
      processed_by_user:processed_by(id, name, email)
    `)
    .eq('enterprise_id', enterpriseId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function fetchAllPayouts() {
  const { data, error } = await supabase
    .from('payouts')
    .select(`
      *,
      batches:batch_id(id, name),
      enterprises:enterprise_id(id, name),
      processed_by_user:processed_by(id, name, email)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function fetchPayoutById(payoutId: string) {
  const { data, error } = await supabase
    .from('payouts')
    .select(`
      *,
      batches:batch_id(id, name),
      enterprises:enterprise_id(id, name),
      processed_by_user:processed_by(id, name, email)
    `)
    .eq('id', payoutId)
    .single();

  if (error) throw error;
  return data;
}
