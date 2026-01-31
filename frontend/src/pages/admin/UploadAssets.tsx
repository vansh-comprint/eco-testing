import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Upload, Info } from 'lucide-react';
import { CSVUpload, type BulkUploadMetadata } from '@/components/assets';
import { useAuth, useSubUsers, useBulkCreateSubUsers, useBatches, useBatchesByITAdmin, useBulkCreateAssets, useBranches, useBranchesByITAdmin } from '@/hooks';
import { usersApi } from '@/lib/api/users';

// V3: Input type for creating assets with snake_case
interface CreateAssetInput {
  enterprise_id: string;
  batch_id?: string;
  branch_id?: string;    // V3.2: Branch assignment
  it_admin_id?: string;  // V3.2: IT Admin who created the asset
  serial_number: string;
  brand: string;
  model: string;
  asset_tag?: string;
  specs?: Record<string, unknown>;
  assigned_to_user_id?: string;
  assigned_email?: string;
  assigned_name?: string;
  assigned_department?: string;
}

// V3: Input type for creating sub users with snake_case
interface CreateSubUserInput {
  enterprise_id: string;
  name: string;
  email: string;
  department?: string;
}

export function UploadAssets() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const batchId = searchParams.get('batchId') || undefined;

  // V3: Use React Query hook for auth
  const { user, enterprise } = useAuth();
  const enterpriseId = enterprise?.id || '';
  const userId = user?.id || '';

  // V3.2: Detect if we're in Org Admin context
  const isOrgAdmin = user?.role === 'org_admin' || location.pathname.startsWith('/org-admin');

  // V3.2: React Query hooks - use different data sources based on role
  // Only enable the appropriate queries to avoid unnecessary requests
  const { data: subUsers = [] } = useSubUsers(enterpriseId);
  const { data: orgBatches = [] } = useBatches(isOrgAdmin ? enterpriseId : '');
  const { data: itBatches = [] } = useBatchesByITAdmin(isOrgAdmin ? '' : userId);
  const { data: orgBranches = [] } = useBranches(isOrgAdmin ? enterpriseId : '');
  const { data: itBranches = [] } = useBranchesByITAdmin(isOrgAdmin ? '' : userId);

  const batches = isOrgAdmin ? orgBatches : itBatches;
  const branches = isOrgAdmin ? orgBranches : itBranches;
  const activeBranches = branches.filter((b: { status: string }) => b.status === 'active');
  const bulkCreateSubUsersMutation = useBulkCreateSubUsers();
  const bulkCreateAssetsMutation = useBulkCreateAssets();

  const batch = batchId ? batches.find((b: { id: string }) => b.id === batchId) : null;

  // V3.2: Determine branch_id - from batch if available, otherwise first active branch
  const effectiveBranchId = batch?.branch_id || (activeBranches.length > 0 ? activeBranches[0].id : undefined);

  const handleUpload = async (assets: CreateAssetInput[], metadata: BulkUploadMetadata) => {
    if (!enterprise || !user) return;

    // Step 1: Collect unique emails and check if they are IT Admins first
    const emailsNeedingSubUsers = new Set<string>();
    const emailToAssetData = new Map<string, { name?: string; department?: string }>();
    const emailToUserId = new Map<string, { id: string; isSelf: boolean }>(); // IT Admin/Org Admin users

    // First pass: Check all unique emails against users table (IT Admins/Org Admins)
    const uniqueEmails = [...new Set(assets.filter(a => a.assigned_email).map(a => a.assigned_email!.toLowerCase()))];

    for (const email of uniqueEmails) {
      // Check if email matches an IT Admin/Org Admin via REST API
      let adminUser: { id: string; email: string } | null = null;
      try {
        const resp = await usersApi.list({ enterprise_id: enterprise.id, search: email, limit: 1 });
        const users = resp.data || [];
        if (Array.isArray(users)) {
          adminUser = users.find(u => u.email.toLowerCase() === email && ['it_admin', 'org_admin'].includes(u.role)) || null;
        }
      } catch { /* ignore */ }
      if (adminUser) {
        // This is an IT Admin or Org Admin - use assigned_user_id
        emailToUserId.set(email, {
          id: adminUser.id,
          isSelf: adminUser.id === user.id,
        });
      } else {
        // Check if sub-user already exists
        const existingSubUser = subUsers.find(
          u => u.email.toLowerCase() === email && u.enterprise_id === enterprise.id
        );
        if (!existingSubUser) {
          emailsNeedingSubUsers.add(email);
          // Store the name/department from first occurrence
          const assetWithEmail = assets.find(a => a.assigned_email?.toLowerCase() === email);
          if (assetWithEmail && !emailToAssetData.has(email)) {
            emailToAssetData.set(email, {
              name: assetWithEmail.assigned_name,
              department: assetWithEmail.assigned_department,
            });
          }
        }
      }
    }

    // Step 2: Create sub-users for new emails (only those not matched to IT Admins)
    let newSubUsers: Array<{ id: string; email: string }> = [];
    if (emailsNeedingSubUsers.size > 0) {
      const subUserInputs: CreateSubUserInput[] = Array.from(emailsNeedingSubUsers).map(email => {
        const data = emailToAssetData.get(email);
        return {
          enterprise_id: enterprise.id,
          email,
          name: data?.name || email.split('@')[0], // Use email prefix if no name
          department: data?.department,
        };
      });
      const result = await bulkCreateSubUsersMutation.mutateAsync(subUserInputs);
      newSubUsers = result || [];
    }

    // Step 3: Build email -> subUserId map (existing + new)
    const emailToSubUserId = new Map<string, string>();

    // Add existing sub-users
    subUsers
      .filter(u => u.enterprise_id === enterprise.id)
      .forEach(u => emailToSubUserId.set(u.email.toLowerCase(), u.id));

    // Add newly created sub-users
    newSubUsers.forEach(u => emailToSubUserId.set(u.email.toLowerCase(), u.id));

    // Step 4: Map assets with assigned_user_id OR assigned_sub_user_id
    // V3.2: Include branch_id and it_admin_id for proper branch association
    const assetsWithAssignments = assets.map(asset => {
      const email = asset.assigned_email?.toLowerCase();

      // First check if it's an IT Admin/Org Admin
      const adminData = email ? emailToUserId.get(email) : undefined;
      if (adminData) {
        // Assign to IT Admin/Org Admin
        return {
          enterprise_id: asset.enterprise_id,
          batch_id: asset.batch_id,
          branch_id: effectiveBranchId,  // V3.2: Branch assignment
          it_admin_id: user.id,           // V3.2: IT Admin who uploaded
          serial_number: asset.serial_number,
          brand: asset.brand,
          model: asset.model,
          asset_tag: asset.asset_tag,
          specs: asset.specs,
          assigned_to_user_id: adminData.id,
        };
      }

      // Fall back to sub-user assignment
      const subUserId = email ? emailToSubUserId.get(email) : undefined;
      return {
        enterprise_id: asset.enterprise_id,
        batch_id: asset.batch_id,
        branch_id: effectiveBranchId,  // V3.2: Branch assignment
        it_admin_id: user.id,           // V3.2: IT Admin who uploaded
        serial_number: asset.serial_number,
        brand: asset.brand,
        model: asset.model,
        asset_tag: asset.asset_tag,
        specs: asset.specs,
        assigned_to_user_id: subUserId,
      };
    });

    // Step 5: Create all assets
    const createdAssets = await bulkCreateAssetsMutation.mutateAsync(assetsWithAssignments);

    // Count IT Admin assignments for tracking
    const itAdminAssignments = assetsWithAssignments.filter(a => a.assigned_to_user_id).length;

    // Step 6: Bulk upload tracking metadata
    // TODO: Add bulk_uploads REST API endpoint when needed for audit trail
    // For now, upload tracking is handled via the created assets themselves
    console.info(`Bulk upload complete: ${createdAssets.length} assets created, ${newSubUsers.length} users created, ${itAdminAssignments} IT admin assignments`);
  };

  if (!enterprise) {
    return (
      <div className="flex items-center justify-center min-h-[400px] border border-white/10 bg-slate-50 dark:bg-white/[0.02]">
        <p className="font-display text-zinc-500 uppercase tracking-wide">Enterprise not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-white/10 pb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={() => navigate(-1)}
            className="interactive flex items-center gap-2 text-zinc-500 hover:text-ecotribe-primary transition-colors font-mono text-xs uppercase tracking-widest mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-start gap-5">
            <div className="w-14 h-14 border border-ecotribe-primary/30 bg-ecotribe-primary/10 flex items-center justify-center">
              <Upload className="w-7 h-7 text-ecotribe-primary" />
            </div>
            <div>
              <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-1">Bulk</span>
              <h1 className="font-brand font-bold text-2xl md:text-3xl text-white uppercase tracking-tight">
                Upload Assets
              </h1>
              <p className="font-display text-zinc-500 text-sm mt-1 uppercase tracking-wide">
                {batch ? `Adding to batch: ${batch.name}` : 'Upload multiple assets via CSV'}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tips Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="border border-blue-400/20 bg-blue-400/5 p-5"
      >
        <div className="flex gap-4">
          <div className="w-10 h-10 border border-blue-400/30 flex items-center justify-center flex-shrink-0">
            <Info className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="font-display font-bold text-sm text-white uppercase tracking-wide mb-2">CSV Upload Tips</p>
            <ul className="font-mono text-xs text-zinc-500 space-y-1">
              <li>• Download our template for the correct format</li>
              <li>• Required columns: serialNumber, brand, model</li>
              <li>• Optional: Add assignedEmail, assignedName, assignedDepartment to pre-assign users</li>
              <li>• Sub-users will receive email invites automatically when assets are assigned</li>
              <li>• Duplicate serial numbers will be flagged as errors</li>
            </ul>
          </div>
        </div>
      </motion.div>

      {/* CSV Upload Component */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <CSVUpload
          enterpriseId={enterprise.id}
          batchId={batchId}
          onUpload={handleUpload}
          onCancel={() => navigate(isOrgAdmin ? '/org-admin/assets' : '/admin/assets')}
        />
      </motion.div>
    </div>
  );
}

export default UploadAssets;
