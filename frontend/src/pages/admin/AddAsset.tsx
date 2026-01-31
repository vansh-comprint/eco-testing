import { useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Laptop, CheckCircle, Info, Plus, ArrowRight, Building2 } from 'lucide-react';
import { AssetForm } from '@/components/assets';
import { useAuth, useCreateAsset, useBatches, useBatchesByITAdmin, useBranches, useBranchesByITAdmin, useApiError } from '@/hooks';
import { useOrgBranchSafe } from '@/contexts/OrgBranchContext';
import type { CreateAssetInput } from '@/hooks';

export function AddAsset() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const batchId = searchParams.get('batchId') || undefined;

  // V3: Use React Query hook for auth
  const { enterprise, user } = useAuth();
  const userId = user?.id || '';
  const enterpriseId = enterprise?.id || '';

  // V3.2: Detect if we're in Org Admin context (path starts with /org-admin)
  const isOrgAdmin = location.pathname.startsWith('/org-admin');

  // V3.2: Use different hooks based on role
  // Only enable the appropriate queries to avoid unnecessary requests
  // Org Admin: sees all batches/branches in enterprise
  // IT Admin: sees only their assigned branches
  const { data: orgBatches = [] } = useBatches(isOrgAdmin ? enterpriseId : '');
  const { data: itBatches = [] } = useBatchesByITAdmin(isOrgAdmin ? '' : userId);
  const { data: orgBranches = [] } = useBranches(isOrgAdmin ? enterpriseId : '');
  const { data: itBranches = [] } = useBranchesByITAdmin(isOrgAdmin ? '' : userId);

  const batches = isOrgAdmin ? orgBatches : itBatches;
  const branches = isOrgAdmin ? orgBranches : itBranches;
  const activeBranches = branches.filter((b: { status: string }) => b.status === 'active');
  const createAssetMutation = useCreateAsset();
  const { handleError, showSuccess } = useApiError();

  const [isLoading, setIsLoading] = useState(false);
  const [successState, setSuccessState] = useState<{ serialNumber: string } | null>(null);
  const orgBranchCtx = useOrgBranchSafe();
  const [selectedBranchId, setSelectedBranchId] = useState<string>(orgBranchCtx?.selectedBranchId || '');

  const batch = batchId ? batches.find((b: { id: string }) => b.id === batchId) : null;

  // V3.2: Determine branch_id - from batch if available, otherwise from selection or single branch
  const effectiveBranchId = batch?.branch_id || selectedBranchId || (activeBranches.length === 1 ? activeBranches[0].id : undefined);

  // V3.2: Check if branch selection is required but missing
  const needsBranchSelection = !batch && activeBranches.length > 1 && !selectedBranchId;

  const handleSubmit = async (data: CreateAssetInput) => {
    setIsLoading(true);
    try {
      // Create the asset
      await createAssetMutation.mutateAsync(data);
      setSuccessState({ serialNumber: data.serial_number });
      showSuccess('Asset Created', `Serial number: ${data.serial_number}`);
    } catch (error) {
      handleError(error, 'Creating asset');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAnother = () => {
    setSuccessState(null);
  };

  const handleGoToAssets = () => {
    navigate(isOrgAdmin ? '/org-admin/assets' : '/admin/assets');
  };

  if (!enterprise) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-white/80 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10 btn-chamfer">
        <p className="font-display text-zinc-500 uppercase tracking-wide">Enterprise not found</p>
      </div>
    );
  }

  // Success state
  if (successState) {
    return (
      <div className="max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/95 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10 btn-chamfer"
        >
          <div className="py-16 px-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.1 }}
              className="w-16 h-16 border border-emerald-400/30 bg-emerald-400/10 flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </motion.div>

            <h2 className="font-brand font-bold text-2xl text-slate-900 dark:text-white uppercase tracking-tight mb-3">
              Asset Added
            </h2>
            <p className="font-mono font-bold text-[10px] text-zinc-600 uppercase tracking-widest mb-2">
              Serial Number
            </p>
            <p className="font-mono text-xl text-ecotribe-primary mb-8">
              {successState.serialNumber}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleAddAnother}
                className="interactive px-6 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Another
              </button>
              <button
                onClick={handleGoToAssets}
                className="interactive px-6 py-3 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2"
              >
                View Assets
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-8">
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
              <Laptop className="w-7 h-7 text-ecotribe-primary" />
            </div>
            <div>
              <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-1">New</span>
              <h1 className="font-brand font-bold text-2xl md:text-3xl text-slate-900 dark:text-white uppercase tracking-tight">
                Add Asset
              </h1>
              <p className="font-display text-zinc-500 text-sm mt-1 uppercase tracking-wide">
                {batch ? `Adding to batch: ${batch.name}` : 'Enter device details manually'}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Info Card */}
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
            <p className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide mb-2">Quick Tips</p>
            <ul className="font-mono text-xs text-zinc-500 space-y-1">
              <li>• Serial numbers are case-insensitive and will be stored in uppercase</li>
              <li>• Brand and model are required for accurate valuation</li>
              <li>• Adding specs helps us provide better quotes</li>
            </ul>
          </div>
        </div>
      </motion.div>

      {/* V3.2: Branch Selection - show if no batch and user has multiple branches */}
      {!batch && activeBranches.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={`bg-white/95 dark:bg-black/40 backdrop-blur-md border p-5 ${
            needsBranchSelection ? 'border-amber-500/50' : 'border-black/10 dark:border-white/10'
          }`}
        >
          <label className="block font-mono font-bold text-[10px] text-zinc-500 uppercase tracking-widest mb-2">
            Branch <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Building2 className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${
              needsBranchSelection ? 'text-amber-500' : 'text-zinc-500'
            }`} />
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-white/[0.02] border text-slate-900 dark:text-white font-mono text-sm focus:outline-none transition-colors appearance-none select-themed cursor-pointer ${
                needsBranchSelection ? 'border-amber-500/50' : 'border-slate-200 dark:border-white/10 focus:border-ecotribe-primary/50'
              }`}
            >
              <option value="" className="bg-white dark:bg-zinc-900">Select a branch...</option>
              {activeBranches.map((branch: { id: string; branch_name: string; branch_code: string }) => (
                <option key={branch.id} value={branch.id} className="bg-white dark:bg-zinc-900">
                  {branch.branch_name} ({branch.branch_code})
                </option>
              ))}
            </select>
          </div>
          {needsBranchSelection && (
            <p className="mt-2 font-mono text-xs text-amber-500">
              Please select a branch before adding assets
            </p>
          )}
        </motion.div>
      )}

      {/* Show branch info when batch has a branch or single branch */}
      {(batch?.branch_id || (!batch && activeBranches.length === 1)) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10"
        >
          <Building2 className="w-4 h-4 text-ecotribe-primary" />
          <div>
            <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">Branch</p>
            <p className="font-display text-sm text-slate-900 dark:text-white">
              {batch?.branch_id
                ? activeBranches.find((b: { id: string }) => b.id === batch.branch_id)?.branch_name || 'Linked to batch'
                : `${activeBranches[0]?.branch_name} (${activeBranches[0]?.branch_code})`}
            </p>
          </div>
        </motion.div>
      )}

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={needsBranchSelection ? 'opacity-50 pointer-events-none' : ''}
      >
        <AssetForm
          enterpriseId={enterprise.id}
          batchId={batchId}
          branchId={effectiveBranchId}
          itAdminId={userId}
          userId={userId}
          onSubmit={handleSubmit}
          onCancel={() => navigate(-1)}
          isLoading={isLoading}
          showSelfAssign={true}
        />
      </motion.div>
    </div>
  );
}

export default AddAsset;
