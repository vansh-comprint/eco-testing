import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Info, Building2 } from 'lucide-react';
import { CSVUserUpload } from '@/components/users';
import { BackButton, BranchSelector } from '@/components/ui';
import { useAuth, useCreateSubUsers, usePortalBasePath, useBranches, useBranchesByITAdmin } from '@/hooks';
import type { CreateSubUserInput } from '@/types';

interface BulkUserUploadProps {
  enterpriseId?: string;
}

export function BulkUserUpload({ enterpriseId: propEnterpriseId }: BulkUserUploadProps = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const portalBase = usePortalBasePath();

  // V3: Use React Query hooks
  const { enterprise, user } = useAuth();
  const createSubUsersMutation = useCreateSubUsers();

  const isOrgAdmin = user?.role === 'org_admin' || location.pathname.startsWith('/org-admin');
  const resolvedEnterpriseId = propEnterpriseId || enterprise?.id || '';

  // Branch selection state
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  // Fetch branches for branch_code resolution and pre-selection UI
  const { data: orgBranches = [] } = useBranches(isOrgAdmin ? resolvedEnterpriseId : '');
  const { data: itBranches = [] } = useBranchesByITAdmin(!isOrgAdmin ? (user?.id || '') : '');
  const branches = isOrgAdmin ? orgBranches : itBranches;

  // IT Admin: auto-select if only one branch
  const activeBranches = branches.filter((b: { status: string }) => b.status === 'active');
  const autoSelectedBranchId = !isOrgAdmin && activeBranches.length === 1
    ? activeBranches[0].id
    : selectedBranchId;

  const handleUpload = async (users: CreateSubUserInput[]) => {
    await createSubUsersMutation.mutateAsync(users);
  };

  if (!resolvedEnterpriseId) {
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
          <BackButton className="mb-6" />

          <div className="flex items-start gap-5">
            <div className="w-14 h-14 border border-ecotribe-primary/30 bg-ecotribe-primary/10 flex items-center justify-center">
              <Users className="w-7 h-7 text-ecotribe-primary" />
            </div>
            <div>
              <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-1">Bulk</span>
              <h1 className="font-brand font-bold text-2xl md:text-3xl text-white uppercase tracking-tight">
                Import Employees
              </h1>
              <p className="font-display text-zinc-500 text-sm mt-1 uppercase tracking-wide">
                Upload multiple users via CSV
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
              <li>• Required column: email</li>
              <li>• Optional: name, phone, department, branch_code</li>
              <li>• Supported departments: Engineering, Marketing, HR, Finance, Operations, Sales, IT, Other</li>
              <li>• Sub-users will receive email invites automatically</li>
              <li>• Duplicate emails will be flagged as errors</li>
            </ul>
          </div>
        </div>
      </motion.div>

      {/* Branch Pre-Selection */}
      {resolvedEnterpriseId && activeBranches.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white/95 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10 p-5"
        >
          <p className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-3">
            Default Branch (applied to all uploaded employees)
          </p>
          <BranchSelector
            enterpriseId={resolvedEnterpriseId}
            userId={!isOrgAdmin ? (user?.id || '') : undefined}
            value={selectedBranchId || null}
            onChange={(branchId) => setSelectedBranchId(branchId || '')}
            label="Branch"
            placeholder="Select branch (optional)..."
            required={isOrgAdmin}
            showAddNew={false}
            filterActive={true}
          />
        </motion.div>
      )}

      {/* Auto-selected branch info for single-branch IT Admin */}
      {!isOrgAdmin && activeBranches.length === 1 && autoSelectedBranchId && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 font-mono text-xs text-blue-700 dark:text-blue-400">
          <Building2 className="w-4 h-4 flex-shrink-0" />
          All employees will be assigned to branch: <span className="font-bold">{activeBranches[0].branch_name || activeBranches[0].name}</span>
        </div>
      )}

      {/* CSV Upload Component */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <CSVUserUpload
          enterpriseId={resolvedEnterpriseId}
          branchId={autoSelectedBranchId || undefined}
          branches={activeBranches}
          onUpload={handleUpload}
          onCancel={() => navigate(`${portalBase}/employees`)}
        />
      </motion.div>
    </div>
  );
}

export default BulkUserUpload;
