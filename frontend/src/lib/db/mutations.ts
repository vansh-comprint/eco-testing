/**
 * Database Mutation Functions
 * All write operations to Supabase
 */

import { supabase, supabaseAdmin } from '@/lib/supabase';

// ============================================
// ASSETS
// ============================================

export interface CreateAssetInput {
  enterprise_id: string;
  branch_id?: string;
  batch_id?: string;
  it_admin_id?: string;
  serial_number: string;
  brand: string;
  model: string;
  asset_tag?: string;
  specs?: Record<string, unknown>;
  purchase_date?: string;
  status?: string;
  // V3.2: Self-assignment fields
  assigned_user_id?: string;
  is_self_assigned?: boolean;
  assigned_at?: string;
}

export async function createAsset(input: CreateAssetInput) {
  const id = `ast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const { data, error } = await supabase
    .from('assets')
    .insert({
      id,
      ...input,
      status: input.status || 'pending_assignment',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createAssets(inputs: CreateAssetInput[]) {
  const assets = inputs.map((input, index) => ({
    id: `ast-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
    ...input,
    status: input.status || 'pending_assignment',
    created_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from('assets')
    .insert(assets)
    .select();

  if (error) throw error;
  return data;
}

// Alias for bulk create assets (used by useBulkCreateAssets hook)
export const bulkCreateAssets = createAssets;

export async function updateAsset(assetId: string, updates: Partial<CreateAssetInput>) {
  const { data, error } = await supabase
    .from('assets')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', assetId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAssetStatus(assetId: string, status: string) {
  const { data, error } = await supabase
    .from('assets')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', assetId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function assignAssetToSubUser(assetId: string, subUserId: string) {
  const { data, error } = await supabase
    .from('assets')
    .update({
      assigned_sub_user_id: subUserId,
      assigned_at: new Date().toISOString(),
      status: 'assigned',
      updated_at: new Date().toISOString(),
    })
    .eq('id', assetId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function unassignAsset(assetId: string) {
  const { data, error } = await supabase
    .from('assets')
    .update({
      assigned_sub_user_id: null,
      assigned_user_id: null,
      is_self_assigned: false,
      assigned_at: null,
      status: 'pending_assignment',
      updated_at: new Date().toISOString(),
    })
    .eq('id', assetId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Assign asset to an admin user (IT Admin/Org Admin) for self-evaluation
 */
export async function assignAssetToSelf(assetId: string, userId: string) {
  const { data, error } = await supabase
    .from('assets')
    .update({
      assigned_user_id: userId,
      assigned_sub_user_id: null, // Clear any sub-user assignment
      is_self_assigned: true,
      assigned_at: new Date().toISOString(),
      status: 'assigned',
      updated_at: new Date().toISOString(),
    })
    .eq('id', assetId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAsset(assetId: string) {
  const { error } = await supabase
    .from('assets')
    .delete()
    .eq('id', assetId);

  if (error) throw error;
}

// ============================================
// BATCHES
// ============================================

export interface CreateBatchInput {
  enterprise_id: string;
  branch_id?: string;
  name: string;
  description?: string;
  created_by: string;
  estimated_value?: number;
}

export async function createBatch(input: CreateBatchInput) {
  const id = `bat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  console.log('📦 createBatch input:', { id, ...input });

  const { data, error } = await supabase
    .from('batches')
    .insert({
      id,
      ...input,
      status: 'draft',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('❌ createBatch error:', error);
    throw error;
  }
  console.log('✅ createBatch success:', data);
  return data;
}

export async function updateBatch(batchId: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('batches')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', batchId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function submitBatchForApproval(
  batchId: string,
  pickupDetails: {
    preferred_pickup_date: string;
    preferred_pickup_slot: string;
    pickup_priority?: string;
    it_admin_notes?: string;
    logistics_instructions?: string;
  }
) {
  const { data, error } = await supabase
    .from('batches')
    .update({
      ...pickupDetails,
      status: 'pending_approval',
      submitted_for_approval_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', batchId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function approveBatch(batchId: string, orgAdminId: string, notes?: string) {
  const { data, error } = await supabase
    .from('batches')
    .update({
      status: 'approved',
      approved_by: orgAdminId,
      approved_at: new Date().toISOString(),
      org_admin_notes: notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', batchId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Approve batch with optional per-asset pricing
 * Updates asset base_price for any assets with prices, then approves batch
 * ALSO auto-creates a pickup request using the batch's pickup details
 */
export async function approveBatchWithPrices(
  batchId: string,
  orgAdminId: string,
  assetPrices: Array<{ assetId: string; price: number }>,
  notes?: string
): Promise<{ batch: Record<string, unknown>; pickupRequest?: Record<string, unknown> }> {
  // Step 1: Update assets that have prices (skip empty ones)
  if (assetPrices.length > 0) {
    const updates = assetPrices.map(({ assetId, price }) =>
      supabase
        .from('assets')
        .update({ base_price: price, updated_at: new Date().toISOString() })
        .eq('id', assetId)
    );
    await Promise.all(updates);
  }

  // Step 2: Calculate total (only from entered prices)
  const totalValue = assetPrices.reduce((sum, p) => sum + p.price, 0);

  // Step 3: Update batch status to approved
  const { data: batchData, error: batchError } = await supabase
    .from('batches')
    .update({
      status: 'approved',
      approval_status: 'approved',
      approved_by: orgAdminId,
      approved_at: new Date().toISOString(),
      org_admin_notes: notes,
      estimated_value: totalValue,
      updated_at: new Date().toISOString(),
    })
    .eq('id', batchId)
    .select()
    .single();

  if (batchError) throw batchError;

  // Step 4: Get all asset IDs in this batch
  const { data: batchAssets, error: assetsError } = await supabase
    .from('assets')
    .select('id')
    .eq('batch_id', batchId);

  if (assetsError) {
    console.error('[Batch Approval] Failed to fetch batch assets:', assetsError);
    // Don't throw - batch is approved, just can't auto-create pickup
    return { batch: batchData };
  }

  const assetIds = (batchAssets || []).map(a => a.id);

  // Step 5: Auto-create pickup request if we have assets and pickup details
  if (assetIds.length > 0 && batchData.branch_id) {
    try {
      console.log('[Batch Approval] Auto-creating pickup request for batch:', batchId);

      const pickupRequest = await createPickupRequest({
        enterprise_id: batchData.enterprise_id,
        batch_id: batchId,
        branch_id: batchData.branch_id,
        asset_ids: assetIds,
        preferred_date: batchData.preferred_pickup_date || undefined,
        preferred_time_slot: batchData.preferred_pickup_slot || 'morning',
        priority: batchData.pickup_priority || 'normal',
        notes: batchData.it_admin_notes || undefined,
        created_by: orgAdminId, // System-created on behalf of approval
      });

      console.log('[Batch Approval] Pickup request created:', pickupRequest?.id);
      return { batch: batchData, pickupRequest };
    } catch (pickupError) {
      console.error('[Batch Approval] Failed to auto-create pickup:', pickupError);
      // Don't throw - batch is approved, pickup creation failed
      // The IT Admin can manually create pickup if needed
      return { batch: batchData };
    }
  }

  return { batch: batchData };
}

export async function rejectBatch(batchId: string, orgAdminId: string, reason: string) {
  const { data, error } = await supabase
    .from('batches')
    .update({
      status: 'rejected',
      rejected_by: orgAdminId,
      rejected_at: new Date().toISOString(),
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', batchId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteBatch(batchId: string) {
  const { error } = await supabase
    .from('batches')
    .delete()
    .eq('id', batchId);

  if (error) throw error;
}

// ============================================
// BRANCHES
// ============================================

export interface CreateBranchInput {
  enterprise_id: string;
  branch_name: string;
  branch_code: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pin_code: string;
  pickup_point_description?: string;
  site_contact_person?: string;
  site_contact_phone?: string;
  operating_hours?: string;
  special_instructions?: string;
  it_admin_id?: string | null;
}

export async function createBranch(input: CreateBranchInput) {
  // Validate branch_code format (1-10 uppercase alphanumeric)
  const code = input.branch_code.toUpperCase().trim();
  if (!/^[A-Z0-9]{1,10}$/.test(code)) {
    throw new Error('Branch code must be 1-10 alphanumeric characters');
  }

  // Check uniqueness within enterprise
  const { data: existing } = await supabase
    .from('branches')
    .select('id')
    .eq('enterprise_id', input.enterprise_id)
    .eq('branch_code', code)
    .maybeSingle();

  if (existing) {
    throw new Error('Branch code already exists for this enterprise');
  }

  const id = `br-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Determine status based on IT admin assignment
  const status = input.it_admin_id ? 'active' : 'needs_admin';

  const { data, error } = await supabase
    .from('branches')
    .insert({
      id,
      ...input,
      branch_code: code,
      status,
      created_at: new Date().toISOString(),
    })
    .select(`
      *,
      it_admin:users!branches_it_admin_id_fkey(id, name, email)
    `)
    .single();

  if (error) throw error;
  return data;
}

export interface UpdateBranchInput extends Partial<CreateBranchInput> {
  status?: 'active' | 'inactive' | 'needs_admin';
}

export async function updateBranch(branchId: string, updates: UpdateBranchInput) {
  // Validate branch_code format if being updated
  if (updates.branch_code) {
    const code = updates.branch_code.toUpperCase().trim();
    if (!/^[A-Z0-9]{1,10}$/.test(code)) {
      throw new Error('Branch code must be 1-10 alphanumeric characters');
    }

    // Get enterprise_id from current branch
    const { data: branch } = await supabase
      .from('branches')
      .select('enterprise_id, branch_code')
      .eq('id', branchId)
      .single();

    // Check uniqueness if code is changing
    if (branch && code !== branch.branch_code) {
      const { data: existing } = await supabase
        .from('branches')
        .select('id')
        .eq('enterprise_id', branch.enterprise_id)
        .eq('branch_code', code)
        .maybeSingle();

      if (existing) {
        throw new Error('Branch code already exists for this enterprise');
      }
    }

    updates.branch_code = code;
  }

  // Auto-update status based on IT admin
  if (updates.it_admin_id !== undefined) {
    updates.status = updates.it_admin_id ? 'active' : 'needs_admin';
  }

  const { data, error } = await supabase
    .from('branches')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', branchId)
    .select(`
      *,
      it_admin:users!branches_it_admin_id_fkey(id, name, email)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function updateBranchStatus(branchId: string, status: 'active' | 'inactive' | 'needs_admin') {
  const { data, error } = await supabase
    .from('branches')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', branchId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteBranch(branchId: string) {
  const { error } = await supabase
    .from('branches')
    .delete()
    .eq('id', branchId);

  if (error) throw error;
}

// Bulk branch upload types
export interface BulkBranchInput extends Omit<CreateBranchInput, 'it_admin_id'> {
  it_admin_email?: string;
  it_admin_name?: string;
  _generated_password?: string;
}

export interface BulkBranchResult {
  branch: Record<string, unknown>;
  it_admin_created?: boolean;
  generated_password?: string;
}

export interface BulkBranchError {
  branch_code: string;
  error: string;
}

export async function bulkCreateBranches(inputs: BulkBranchInput[]): Promise<{
  results: BulkBranchResult[];
  errors: BulkBranchError[];
}> {
  const results: BulkBranchResult[] = [];
  const errors: BulkBranchError[] = [];

  // Import password generator
  const { generateSecurePassword } = await import('@/lib/utils');

  for (const input of inputs) {
    try {
      let itAdminId: string | null = null;
      let generatedPassword: string | undefined;
      let itAdminCreated = false;

      // If IT admin email provided, check if exists or create
      if (input.it_admin_email) {
        const email = input.it_admin_email.toLowerCase().trim();

        // Check if IT admin exists
        const { data: existingAdmin } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .eq('role', 'it_admin')
          .maybeSingle();

        if (existingAdmin) {
          itAdminId = existingAdmin.id;
        } else {
          // Auto-create IT admin with generated password
          generatedPassword = generateSecurePassword();

          // Create auth user
          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: generatedPassword,
            email_confirm: true,
            user_metadata: {
              name: input.it_admin_name || email.split('@')[0],
              role: 'it_admin',
            }
          });

          if (authError) {
            throw new Error(`Failed to create IT admin auth: ${authError.message}`);
          }

          // Create user record
          const { data: newAdmin, error: userError } = await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              enterprise_id: input.enterprise_id,
              role: 'it_admin',
              name: input.it_admin_name || email.split('@')[0],
              email,
              status: 'active',
              created_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (userError) {
            // Rollback auth user
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            throw new Error(`Failed to create IT admin: ${userError.message}`);
          }

          itAdminId = newAdmin.id;
          itAdminCreated = true;
        }
      }

      // Create the branch
      const branch = await createBranch({
        enterprise_id: input.enterprise_id,
        branch_name: input.branch_name,
        branch_code: input.branch_code,
        address_line1: input.address_line1,
        address_line2: input.address_line2,
        city: input.city,
        state: input.state,
        pin_code: input.pin_code,
        site_contact_person: input.site_contact_person,
        site_contact_phone: input.site_contact_phone,
        operating_hours: input.operating_hours,
        special_instructions: input.special_instructions,
        it_admin_id: itAdminId,
      });

      results.push({
        branch,
        it_admin_created: itAdminCreated,
        generated_password: generatedPassword,
      });
    } catch (e) {
      errors.push({
        branch_code: input.branch_code,
        error: e instanceof Error ? e.message : 'Unknown error',
      });
    }
  }

  return { results, errors };
}

// ============================================
// SUB-USERS
// ============================================

export interface CreateSubUserInput {
  enterprise_id: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;
}

export async function createSubUser(input: CreateSubUserInput) {
  const id = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const { data, error } = await supabase
    .from('sub_users')
    .insert({
      id,
      ...input,
      status: 'pending_invite',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createSubUsers(inputs: CreateSubUserInput[]) {
  const subUsers = inputs.map((input, index) => ({
    id: `sub-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
    ...input,
    status: 'pending_invite',
    created_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from('sub_users')
    .insert(subUsers)
    .select();

  if (error) throw error;
  return data;
}

// Alias for bulk create sub users (used by useBulkCreateSubUsers hook)
export const bulkCreateSubUsers = createSubUsers;

export async function updateSubUser(subUserId: string, updates: Partial<CreateSubUserInput>) {
  const { data, error } = await supabase
    .from('sub_users')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subUserId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSubUser(subUserId: string) {
  const { error } = await supabase
    .from('sub_users')
    .delete()
    .eq('id', subUserId);

  if (error) throw error;
}

// ============================================
// USERS (IT Admins)
// ============================================

export interface CreateUserInput {
  enterprise_id?: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  designation?: string;
}

export async function createUser(input: CreateUserInput) {
  const id = `usr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const { data, error } = await supabase
    .from('users')
    .insert({
      id,
      ...input,
      status: 'active',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateUser(userId: string, updates: Partial<CreateUserInput>) {
  const { data, error } = await supabase
    .from('users')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateUserStatus(userId: string, status: 'active' | 'inactive') {
  const { data, error } = await supabase
    .from('users')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Create IT Admin with Supabase Auth
export interface CreateITAdminInput {
  enterprise_id: string;
  name: string;
  email: string;
  phone?: string;
  password: string;
}

export async function createITAdmin(input: CreateITAdminInput) {
  const email = input.email.toLowerCase().trim();

  // Create auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      name: input.name,
      role: 'it_admin',
    }
  });

  if (authError) {
    throw new Error(`Failed to create auth user: ${authError.message}`);
  }

  // Create user record
  const { data, error } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      enterprise_id: input.enterprise_id,
      role: 'it_admin',
      name: input.name,
      email,
      phone: input.phone,
      status: 'active',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    // Rollback auth user
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    throw error;
  }

  return data;
}

// ============================================
// PICKUP REQUESTS
// ============================================

export interface CreatePickupRequestInput {
  enterprise_id: string;
  batch_id?: string;
  branch_id: string; // V3.2: Use branch instead of pickup_location
  asset_ids: string[];
  preferred_date?: string;
  preferred_time_slot: string; // Required: 'morning' | 'afternoon' | 'evening'
  priority?: string;
  notes?: string; // Maps to it_admin_notes in database
  created_by: string;
}

export async function createPickupRequest(input: CreatePickupRequestInput) {
  const id = `pr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Map input fields to database column names
  const { notes, branch_id, ...rest } = input;

  // V3.2: Try inserting with branch_id column first (new schema)
  // If that fails, fall back to location_id (old schema with FK dropped)
  let result = await supabase
    .from('pickup_requests')
    .insert({
      id,
      ...rest,
      branch_id, // Use dedicated branch_id column (after migration)
      location_id: branch_id, // Also set location_id for backward compatibility
      it_admin_notes: notes || null,
      assets: [], // Initialize empty JSONB array
      status: 'pending_assignment',
      created_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  // If insert failed due to FK constraint or missing column, try without location_id
  if (result.error && (result.error.code === '23503' || result.error.message.includes('location_id'))) {
    console.log('[Pickup] First insert failed, trying without location_id:', result.error.message);

    result = await supabase
      .from('pickup_requests')
      .insert({
        id,
        ...rest,
        branch_id, // Use branch_id column
        location_id: null, // Set null to avoid FK violation
        it_admin_notes: notes || null,
        assets: [],
        status: 'pending_assignment',
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single();
  }

  // If still failing, try without branch_id column (pre-migration schema)
  if (result.error && result.error.message.includes('branch_id')) {
    console.log('[Pickup] Second insert failed, trying without branch_id column');

    result = await supabase
      .from('pickup_requests')
      .insert({
        id,
        ...rest,
        location_id: null, // Can't use FK, set null
        it_admin_notes: notes || null,
        assets: [],
        status: 'pending_assignment',
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single();
  }

  if (result.error) throw result.error;

  // Update asset statuses to 'pickup_requested' to prevent re-selection
  if (result.data && input.asset_ids && input.asset_ids.length > 0) {
    console.log('[Pickup] Updating asset statuses for IDs:', input.asset_ids);

    // Update each asset individually to ensure we catch any failures
    const updatePromises = input.asset_ids.map(async (assetId) => {
      const { data, error } = await supabase
        .from('assets')
        .update({
          status: 'pickup_requested',
          updated_at: new Date().toISOString()
        })
        .eq('id', assetId)
        .select('id, status')
        .single();

      if (error) {
        console.error(`[Pickup] Failed to update asset ${assetId}:`, error);
        throw new Error(`Failed to update asset ${assetId}: ${error.message}`);
      }

      if (!data) {
        console.error(`[Pickup] Asset ${assetId} not found or update blocked by RLS`);
        throw new Error(`Asset ${assetId} could not be updated - may not exist or access denied`);
      }

      console.log(`[Pickup] Asset ${assetId} updated to status: ${data.status}`);
      return data;
    });

    try {
      const updatedAssets = await Promise.all(updatePromises);
      console.log('[Pickup] All assets updated successfully:', updatedAssets.length);

      // Verify all assets were updated
      if (updatedAssets.length !== input.asset_ids.length) {
        throw new Error(`Only ${updatedAssets.length} of ${input.asset_ids.length} assets were updated`);
      }
    } catch (updateError) {
      console.error('[Pickup] Asset update failed:', updateError);
      // Don't throw here - pickup was created, but warn the user
      // The pickup request is valid, just the status update failed
      console.warn('[Pickup] Pickup created but asset status update may have failed');
    }
  }

  return result.data;
}

export async function assignPickupToLogisticsAdmin(requestId: string, logisticsAdminId: string, assignedBy: string) {
  const { data, error } = await supabase
    .from('pickup_requests')
    .update({
      logistics_admin_id: logisticsAdminId,
      assigned_by: assignedBy,
      assigned_at: new Date().toISOString(),
      status: 'assigned',
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function assignPickupToLogisticsUser(
  requestId: string,
  logisticsUserId: string,
  scheduledDate?: string
) {
  const updateData: Record<string, unknown> = {
    logistics_user_id: logisticsUserId,
    status: 'scheduled',
    updated_at: new Date().toISOString(),
  };

  // Add scheduled date if provided
  if (scheduledDate) {
    updateData.scheduled_date = scheduledDate;
  }

  const { data, error } = await supabase
    .from('pickup_requests')
    .update(updateData)
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePickupRequestStatus(requestId: string, status: string) {
  const { data, error } = await supabase
    .from('pickup_requests')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Alias for updatePickupStatus
export async function updatePickupStatus(requestId: string, status: string, notes?: string) {
  const { data, error } = await supabase
    .from('pickup_requests')
    .update({
      status,
      logistics_notes: notes || undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePickupRequest(requestId: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('pickup_requests')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// PICKUP LOCATIONS
// ============================================

export interface CreatePickupLocationInput {
  enterprise_id: string;
  name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pin_code: string;
  contact_person?: string;
  contact_phone?: string;
}

export async function createPickupLocation(input: CreatePickupLocationInput) {
  const id = `loc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const { data, error } = await supabase
    .from('pickup_locations')
    .insert({
      id,
      ...input,
      status: 'active',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePickupLocation(locationId: string, updates: Partial<CreatePickupLocationInput>) {
  const { data, error } = await supabase
    .from('pickup_locations')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', locationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePickupLocation(locationId: string) {
  const { error } = await supabase
    .from('pickup_locations')
    .delete()
    .eq('id', locationId);

  if (error) throw error;
}

// ============================================
// ENTERPRISES
// ============================================

export interface UpdateEnterpriseInput {
  name?: string;
  legal_name?: string;
  gst_number?: string;
  pan_number?: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  industry?: string;
  employee_count?: number;
  address?: Record<string, unknown>;
}

export async function updateEnterprise(enterpriseId: string, updates: UpdateEnterpriseInput, updatedBy?: string) {
  const { data, error } = await supabase
    .from('enterprises')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', enterpriseId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateEnterpriseStatus(
  enterpriseId: string,
  status: 'active' | 'inactive' | 'suspended',
  updatedBy?: string
) {
  const { data, error } = await supabase
    .from('enterprises')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', enterpriseId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// ENTERPRISE APPLICATIONS
// ============================================

export interface CreateEnterpriseApplicationInput {
  company_name: string;
  gst_number: string;
  pan_number: string;
  registered_address: string;
  industry_type?: string;
  company_size?: string;
  org_admin_name: string;
  org_admin_email: string;
  org_admin_phone: string;
  org_admin_designation?: string;
  password: string; // Will be stored as password_hash
  doc_gst_certificate?: string;
  doc_pan_card?: string;
  doc_incorporation_cert?: string;
  doc_signatory_id?: string;
  doc_address_proof?: string;
  doc_company_logo?: string;
}

export async function createEnterpriseApplication(input: CreateEnterpriseApplicationInput) {
  const id = `app-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const year = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  const applicationRef = `ENT-${year}-${seq}`;

  // Extract password - will be stored as password_hash
  // Auth user will be created during approval using admin API
  const { password, ...rest } = input;

  // Create enterprise application record (no auth user yet)
  const { data, error } = await supabase
    .from('enterprise_applications')
    .insert({
      id,
      ...rest,
      password_hash: password, // Store password for auth user creation during approval
      application_ref: applicationRef,
      status: 'pending',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Supabase error creating enterprise application:', error);
    throw error;
  }
  return data;
}

export async function approveEnterpriseApplication(applicationId: string, reviewerId: string, notes?: string) {
  // Step 1: Get the application data
  const { data: application, error: fetchError } = await supabase
    .from('enterprise_applications')
    .select('*')
    .eq('id', applicationId)
    .single();

  if (fetchError) throw fetchError;
  if (!application) throw new Error('Application not found');

  // Generate application reference if not exists
  const applicationRef = application.application_ref || `ENT-${Date.now().toString(36).toUpperCase()}`;

  // Step 2: Create Supabase Auth user using admin API
  // This allows login without email confirmation
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: application.org_admin_email,
    password: application.password_hash, // Use stored password
    email_confirm: true, // Auto-confirm email since admin approved
    user_metadata: {
      name: application.org_admin_name,
      role: 'org_admin',
    }
  });

  if (authError) {
    console.error('Failed to create Supabase Auth user:', authError);
    throw new Error(`Failed to create authentication user: ${authError.message}`);
  }

  if (!authData.user) {
    throw new Error('Failed to create authentication user');
  }

  const authUserId = authData.user.id;

  // Step 3: Create the enterprise record
  // Only include columns that exist in the enterprises table
  const enterpriseId = `ent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { data: enterprise, error: enterpriseError } = await supabase
    .from('enterprises')
    .insert({
      id: enterpriseId,
      name: application.company_name,
      contact_email: application.org_admin_email,
      contact_phone: application.org_admin_phone,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (enterpriseError) {
    // Rollback: delete auth user if enterprise creation fails
    await supabaseAdmin.auth.admin.deleteUser(authUserId);
    throw enterpriseError;
  }

  // Step 4: Create the org_admin user in users table
  // Use the auth user ID from the newly created auth user
  const { data: orgAdmin, error: userError } = await supabase
    .from('users')
    .insert({
      id: authUserId, // Use the Supabase Auth user ID
      enterprise_id: enterprise.id,
      role: 'org_admin', // Organization admin role
      name: application.org_admin_name,
      email: application.org_admin_email,
      phone: application.org_admin_phone,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (userError) {
    // Rollback: delete the enterprise and auth user if user creation fails
    await supabase.from('enterprises').delete().eq('id', enterprise.id);
    await supabaseAdmin.auth.admin.deleteUser(authUserId);
    throw userError;
  }

  // Step 5: Create enterprise wallet for the enterprise
  const walletId = `wal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { error: walletError } = await supabase
    .from('enterprise_wallets')
    .insert({
      id: walletId,
      enterprise_id: enterprise.id,
      available_balance: 0,
      pending_balance: 0,
      total_earned: 0,
      total_redeemed: 0,
      updated_at: new Date().toISOString(),
    });

  if (walletError) {
    console.error('Failed to create enterprise wallet:', walletError);
    // Non-critical - wallet can be created later
  }

  // Step 5: Update application status to approved
  const { data, error } = await supabase
    .from('enterprise_applications')
    .update({
      status: 'approved',
      application_ref: applicationRef,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      review_notes: notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
    .select()
    .single();

  if (error) throw error;

  // Return combined data
  return {
    application: data,
    enterprise,
    orgAdmin,
  };
}

export async function rejectEnterpriseApplication(applicationId: string, reviewerId: string, reason: string) {
  const { data, error } = await supabase
    .from('enterprise_applications')
    .update({
      status: 'rejected',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function requestMoreInfo(applicationId: string, reviewerId: string, message: string) {
  const { data, error } = await supabase
    .from('enterprise_applications')
    .update({
      status: 'more_info_requested',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      review_notes: message,
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// SUBMISSIONS
// ============================================

export interface CreateSubmissionInput {
  asset_id: string;
  sub_user_id: string;
  device_confirmed: boolean;
  photos?: Record<string, unknown>;
  functional_checks?: Record<string, unknown>;
  cosmetic_checklist?: Record<string, unknown>;
  accessories?: Record<string, unknown>;
  declaration?: Record<string, unknown>;
}

export async function createSubmission(input: CreateSubmissionInput) {
  const id = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const { data, error } = await supabase
    .from('submissions')
    .insert({
      id,
      ...input,
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// REVIEWS
// ============================================

export interface CreateRemoteReviewInput {
  asset_id: string;
  technician_id: string;
  decision: 'conditionally_accepted' | 'rejected';
  notes?: string;
  reason?: string;
}

export async function createRemoteReview(input: CreateRemoteReviewInput) {
  const id = `rr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const { data, error } = await supabase
    .from('remote_reviews')
    .insert({
      id,
      ...input,
      reviewed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export interface CreateFacilityQCInput {
  asset_id: string;
  technician_id: string;
  decision: 'final_accept' | 'final_reject';
  grade?: string;
  checklist_data?: Record<string, unknown>;
  discrepancies?: string[];
  notes?: string;
}

export async function createFacilityQC(input: CreateFacilityQCInput) {
  const id = `qc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const { data, error } = await supabase
    .from('facility_qc')
    .insert({
      id,
      ...input,
      completed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// LOGISTICS
// ============================================

export interface CreateLogisticsAdminInput {
  name: string;
  company_name: string;
  phone?: string;
  email: string; // Required for auth
  password: string; // Required for auth
}

export async function createLogisticsAdmin(input: CreateLogisticsAdminInput) {
  const email = input.email.toLowerCase().trim();

  // Creating logistics admin auth account

  // Step 0: Check if admin with this email already exists
  const { data: existingAdmin, error: checkError } = await supabaseAdmin
    .from('logistics_admins')
    .select('id, email')
    .eq('email', email)
    .maybeSingle();

  if (checkError) {
    console.error('[Logistics Admin] Error checking for existing admin:', checkError);
    throw new Error(`Failed to check for existing admin: ${checkError.message}`);
  }

  if (existingAdmin) {
    console.error('[Logistics Admin] Admin already exists:', existingAdmin);
    throw new Error(`A logistics admin with email ${email} already exists`);
  }

  // Step 1: Create Supabase Auth account
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      name: input.name,
      phone: input.phone,
      role: 'logistics_admin',
      company_name: input.company_name,
    },
  });

  if (authError) {
    console.error('[Logistics Admin] Auth creation failed:', authError);
    throw new Error(`Failed to create auth user: ${authError.message}`);
  }

  if (!authData.user) {
    throw new Error('Failed to create auth user: No user returned');
  }

  const userId = authData.user.id;
  // Auth account created for logistics admin

  // Step 2: Create record in logistics_admins table (use admin client to bypass RLS)
  const { data, error } = await supabaseAdmin
    .from('logistics_admins')
    .insert({
      id: userId, // Use auth user ID
      name: input.name,
      email,
      phone: input.phone,
      company_name: input.company_name,
      status: 'active',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    // Rollback: delete auth user if database insert fails
    console.error('[Logistics Admin] Database insert failed:', error);
    console.error('[Logistics Admin] Error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    // Rolling back logistics admin auth user
    await supabaseAdmin.auth.admin.deleteUser(userId);
    throw new Error(`Failed to create logistics admin: ${error.message} (${error.code})`);
  }

  // Logistics admin created successfully
  return data;
}

export interface CreateLogisticsUserInput {
  logistics_admin_id: string;
  name: string;
  phone: string;
  email: string; // Required for auth
  password: string; // Required for auth
}

export async function createLogisticsUser(input: CreateLogisticsUserInput) {
  const email = input.email.toLowerCase().trim();

  // Creating logistics user auth account

  // Step 0: Check if user with this email already exists in logistics_users
  const { data: existingUser, error: checkError } = await supabaseAdmin
    .from('logistics_users')
    .select('id, email')
    .eq('email', email)
    .maybeSingle();

  if (checkError) {
    console.error('[Logistics User] Error checking for existing user:', checkError);
    throw new Error(`Failed to check for existing user: ${checkError.message}`);
  }

  if (existingUser) {
    console.error('[Logistics User] User already exists:', existingUser);
    throw new Error(`A logistics user with email ${email} already exists`);
  }

  // Step 1: Create Supabase Auth account
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      name: input.name,
      phone: input.phone,
      role: 'logistics_user',
    },
  });

  if (authError) {
    console.error('[Logistics User] Auth creation failed:', authError);
    throw new Error(`Failed to create auth user: ${authError.message}`);
  }

  if (!authData.user) {
    throw new Error('Failed to create auth user: No user returned');
  }

  const userId = authData.user.id;
  // Auth account created for logistics user

  // Step 2: Create record in logistics_users table (use admin client to bypass RLS)
  const { data, error } = await supabaseAdmin
    .from('logistics_users')
    .insert({
      id: userId, // Use auth user ID
      logistics_admin_id: input.logistics_admin_id,
      name: input.name,
      email,
      phone: input.phone,
      status: 'active',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    // Rollback: delete auth user if database insert fails
    console.error('[Logistics User] Database insert failed:', error);
    console.error('[Logistics User] Error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    // Rolling back logistics user auth user
    await supabaseAdmin.auth.admin.deleteUser(userId);
    throw new Error(`Failed to create logistics user: ${error.message} (${error.code})`);
  }

  // Logistics user created successfully
  return data;
}

export async function updateLogisticsAdmin(adminId: string, updates: Partial<CreateLogisticsAdminInput>) {
  const { data, error } = await supabase
    .from('logistics_admins')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', adminId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateLogisticsUser(userId: string, updates: Partial<CreateLogisticsUserInput>) {
  const { data, error } = await supabase
    .from('logistics_users')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// NOTIFICATIONS
// ============================================

export interface CreateNotificationInput {
  recipient_type: 'user' | 'enterprise' | 'role';
  recipient_id: string;
  channel?: 'in_app' | 'email' | 'whatsapp' | 'sms';
  type?: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  action_url?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      id,
      ...input,
      channel: input.channel || 'in_app',
      type: input.type || 'info',
      status: 'sent',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function markNotificationAsRead(notificationId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .update({
      status: 'read',
      read_at: new Date().toISOString(),
    })
    .eq('id', notificationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// AUDIT LOGS
// ============================================

export interface CreateAuditLogInput {
  entity_type: string;
  entity_id: string;
  action: string;
  from_status?: string;
  to_status?: string;
  actor_id: string;
  actor_type?: 'user' | 'system';
  metadata?: Record<string, unknown>;
}

export async function createAuditLog(input: CreateAuditLogInput) {
  const id = `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const { data, error } = await supabase
    .from('audit_logs')
    .insert({
      id,
      ...input,
      actor_type: input.actor_type || 'user',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
