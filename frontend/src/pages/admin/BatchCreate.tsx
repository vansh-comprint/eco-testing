import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Package,
  CheckCircle,
  AlertTriangle,
  Info,
  Plus,
  Upload,
  ArrowRight,
  Building2
} from 'lucide-react';
import { useAuth, useCreateBatch, useBranches, useBranchesByITAdmin, useApiError } from '@/hooks';
import { useOrgBranchSafe } from '@/contexts/OrgBranchContext';
import { BranchSelector } from '@/components/ui';

export function BatchCreate() {
  const navigate = useNavigate();
  const location = useLocation();
  // V3: Use React Query hook for auth
  const { enterprise, user } = useAuth();
  const userId = user?.id || '';
  const enterpriseId = enterprise?.id || '';

  // V3.2: Detect if we're in Org Admin context
  const isOrgAdmin = user?.role === 'org_admin' || location.pathname.startsWith('/org-admin');
  const basePath = isOrgAdmin ? '/org-admin' : '/admin';

  // V3.2: Fetch branches - Only enable the appropriate query based on role
  const { data: orgBranches = [] } = useBranches(isOrgAdmin ? enterpriseId : '');
  const { data: itBranches = [] } = useBranchesByITAdmin(isOrgAdmin ? '' : userId);
  const branches = isOrgAdmin ? orgBranches : itBranches;
  const activeBranches = branches.filter((b: { status: string }) => b.status === 'active');

  // V3: React Query mutation for batch creation
  const createBatchMutation = useCreateBatch();
  const { handleError, showSuccess } = useApiError();
  const orgBranchCtx = useOrgBranchSafe();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    branchId: orgBranchCtx?.selectedBranchId || '',
    estimatedAssets: '',
  });

  // Sync branch selection when org branch context changes (fixes wrong branch pre-selected)
  useEffect(() => {
    if (isOrgAdmin && orgBranchCtx?.selectedBranchId) {
      setFormData(prev => ({ ...prev, branchId: orgBranchCtx.selectedBranchId! }));
    }
  }, [isOrgAdmin, orgBranchCtx?.selectedBranchId]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [createdBatch, setCreatedBatch] = useState<{ id: string; name: string } | null>(null);
  const [submitError, setSubmitError] = useState<string>('');

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Batch name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Batch name must be at least 3 characters';
    }

    // V3.2: Require branch selection if IT Admin has multiple branches
    if (activeBranches.length > 1 && !formData.branchId) {
      newErrors.branchId = 'Please select a branch for this batch';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // V3: Updated to use React Query mutation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!enterprise) {
      setSubmitError('No enterprise found. Please logout and login again.');
      return;
    }

    if (!user) {
      setSubmitError('No user found. Please logout and login again.');
      return;
    }

    setIsLoading(true);
    setSubmitError('');
    try {
      // V3.2: Auto-select branch if IT Admin has only one, otherwise use selected
      const selectedBranchId = activeBranches.length === 1
        ? activeBranches[0].id
        : formData.branchId || undefined;

      console.log('📝 Creating batch with user.id:', user.id, 'enterprise.id:', enterprise.id, 'branch_id:', selectedBranchId);
      // V3: Use mutation with snake_case field names
      // Note: Approval happens at pickup submission, not batch creation
      const batch = await createBatchMutation.mutateAsync({
        enterprise_id: enterprise.id,
        branch_id: selectedBranchId,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        created_by: user.id,
      });
      console.log('✅ Batch created with id:', batch?.id, 'created_by:', batch?.created_by, 'branch_id:', batch?.branch_id);

      setCreatedBatch({
        id: batch?.id || '',
        name: batch?.name || '',
      });
      showSuccess('Batch Created', `Batch "${batch?.name}" created successfully`);
    } catch (error: unknown) {
      handleError(error, 'Creating batch');
      const errorMessage = error instanceof Error ? error.message : 'Failed to create batch. Please try again.';
      setSubmitError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (createdBatch) {
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
              Batch Created
            </h2>
            <p className="font-mono font-bold text-[10px] text-zinc-600 uppercase tracking-widest mb-2">
              Batch Name
            </p>
            <p className="font-display font-bold text-xl text-ecotribe-primary uppercase mb-6">
              {createdBatch.name}
            </p>

            <p className="font-display text-sm text-zinc-500 mb-8 uppercase tracking-wide">
              You can now add assets to this batch
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate(`${isOrgAdmin ? '/org-admin' : '/admin'}/assets/new?batchId=${createdBatch.id}`)}
                className="interactive px-6 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Manually
              </button>
              <button
                onClick={() => navigate(`${isOrgAdmin ? '/org-admin' : '/admin'}/assets/upload?batchId=${createdBatch.id}`)}
                className="interactive px-6 py-3 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload CSV
              </button>
            </div>

            <button
              onClick={() => navigate(isOrgAdmin ? '/org-admin/batches' : '/admin/batches')}
              className="interactive mt-6 font-mono text-xs text-zinc-600 hover:text-ecotribe-primary uppercase tracking-widest transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              View All Batches
              <ArrowRight className="w-3 h-3" />
            </button>
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
              <Package className="w-7 h-7 text-ecotribe-primary" />
            </div>
            <div>
              <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-1">New</span>
              <h1 className="font-brand font-bold text-2xl md:text-3xl text-slate-900 dark:text-white uppercase tracking-tight">
                Create Batch
              </h1>
              <p className="font-display text-zinc-500 text-sm mt-1 uppercase tracking-wide">
                Group assets together for organized processing
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/95 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10 btn-chamfer"
        >
          <div className="p-5 border-b border-black/10 dark:border-white/10">
            <h2 className="font-display font-bold text-sm text-black dark:text-white uppercase tracking-wide">Batch Details</h2>
          </div>
          <div className="p-5 space-y-5">
            {/* V3.2: Branch Selection - show if IT Admin has multiple branches or allow creating */}
            {activeBranches.length > 1 && (
              <BranchSelector
                enterpriseId={enterpriseId}
                userId={isOrgAdmin ? undefined : userId}
                value={formData.branchId}
                onChange={(id) => handleChange('branchId', id || '')}
                label="Branch"
                placeholder="Select or add a branch..."
                required
                error={errors.branchId}
                showAddNew={isOrgAdmin} // Only Org Admin can create branches
              />
            )}

            {/* Show single branch info if IT Admin has only one */}
            {activeBranches.length === 1 && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                <Building2 className="w-4 h-4 text-ecotribe-primary" />
                <div>
                  <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">Branch</p>
                  <p className="font-display text-sm text-slate-900 dark:text-white">
                    {activeBranches[0].branch_name} ({activeBranches[0].branch_code})
                  </p>
                </div>
              </div>
            )}

            {/* Batch Name */}
            <div>
              <label className="block font-mono font-bold text-[10px] text-zinc-500 uppercase tracking-widest mb-2">
                Batch Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Q4 2024 IT Refresh"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
              />
              {errors.name && (
                <p className="mt-2 font-mono text-xs text-red-400">{errors.name}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block font-mono font-bold text-[10px] text-zinc-500 uppercase tracking-widest mb-2">
                Description
              </label>
              <textarea
                placeholder="Optional description for this batch..."
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-ecotribe-primary/50 transition-colors resize-none"
              />
            </div>

            {/* Estimated Assets */}
            <div>
              <label className="block font-mono font-bold text-[10px] text-zinc-500 uppercase tracking-widest mb-2">
                Estimated Assets
              </label>
              <input
                type="number"
                placeholder="e.g., 25"
                value={formData.estimatedAssets}
                onChange={(e) => handleChange('estimatedAssets', e.target.value)}
                min={0}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
              />
            </div>
          </div>
        </motion.div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="border border-blue-400/20 bg-blue-400/5 p-5"
        >
          <div className="flex gap-4">
            <div className="w-10 h-10 border border-blue-400/30 flex items-center justify-center flex-shrink-0">
              <Info className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide mb-2">What's Next</p>
              <ul className="font-mono text-xs text-zinc-500 space-y-1">
                <li>• Add assets manually one at a time</li>
                <li>• Upload a CSV file for bulk import</li>
                <li>• Assign employees to devices in the batch</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Error Message */}
        {submitError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-red-500/20 bg-red-500/5 p-5"
          >
            <div className="flex gap-4">
              <div className="w-10 h-10 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="font-display font-bold text-sm text-red-400 uppercase tracking-wide mb-1">
                  Error Creating Batch
                </p>
                <p className="font-mono text-xs text-zinc-500">{submitError}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-end gap-3 pt-4"
        >
          <button
            type="button"
            onClick={() => navigate(`${basePath}/batches`)}
            disabled={isLoading}
            className="interactive px-6 py-3 text-zinc-500 hover:text-slate-900 dark:hover:text-white font-mono font-bold text-xs uppercase tracking-widest transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="interactive px-6 py-3 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-black/30 border-t-black animate-spin" />
            ) : (
              <Package className="w-4 h-4" />
            )}
            Create Batch
          </button>
        </motion.div>
      </form>
    </div>
  );
}

export default BatchCreate;
