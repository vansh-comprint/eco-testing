/**
 * BranchDeactivationModal
 * Multi-step modal for safely deactivating a branch.
 * Step 1: Preview impact
 * Step 2: Transfer or Remove dependents (if blocked)
 * Step 3: Execute deactivation
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  AlertTriangle,
  Loader2,
  Building2,
  Users,
  Package,
  CheckCircle2,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import {
  useBranchDeactivationPreview,
  useTransferBranchDependents,
  useBulkDeleteBranchDependents,
  useUpdateBranchStatus,
  useBranches,
} from '@/hooks';
import type { BranchDeactivationPreview, BranchResponse } from '@/lib/api/branches';

interface BranchDeactivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
  branchName: string;
  enterpriseId: string;
  onDeactivated: () => void;
}

type ModalStep = 'preview' | 'action' | 'results';
type ActionTab = 'transfer' | 'remove';

const severityStyles = {
  danger: {
    row: 'border-red-500/20 bg-red-500/5',
    icon: 'text-red-400',
  },
  warning: {
    row: 'border-amber-500/20 bg-amber-500/5',
    icon: 'text-amber-400',
  },
  safe: {
    row: 'border-emerald-500/20 bg-emerald-500/5',
    icon: 'text-emerald-400',
  },
};

function PreviewItem({
  icon,
  label,
  severity,
}: {
  icon: React.ReactNode;
  label: string;
  severity: 'danger' | 'warning' | 'safe';
}) {
  const styles = severityStyles[severity];
  return (
    <div className={`flex items-start gap-3 px-3 py-2.5 border ${styles.row}`}>
      <span className={`mt-0.5 flex-shrink-0 ${styles.icon}`}>
        {severity === 'safe' ? <CheckCircle2 className="w-4 h-4" /> : icon}
      </span>
      <p className={`font-mono text-xs leading-relaxed ${severity === 'safe' ? 'text-zinc-400' : 'text-white/80'}`}>
        {label}
      </p>
    </div>
  );
}

export function BranchDeactivationModal({
  isOpen,
  onClose,
  branchId,
  branchName,
  enterpriseId,
  onDeactivated,
}: BranchDeactivationModalProps) {
  const [step, setStep] = useState<ModalStep>('preview');
  const [actionTab, setActionTab] = useState<ActionTab>('transfer');
  const [targetBranchId, setTargetBranchId] = useState('');
  const [transferEmployees, setTransferEmployees] = useState(true);
  const [transferAssets, setTransferAssets] = useState(true);
  const [deleteEmployees, setDeleteEmployees] = useState(true);
  const [deleteAssets, setDeleteAssets] = useState(true);
  const [actionError, setActionError] = useState('');
  const [actionResults, setActionResults] = useState<{
    type: 'transfer' | 'remove';
    employees?: number;
    assets?: number;
    skipped?: number;
  } | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Re-fetch preview after actions complete (step 3 re-check)
  const [refetchTrigger, setRefetchTrigger] = useState(false);

  const { data: preview, isLoading: previewLoading } = useBranchDeactivationPreview(
    branchId,
    isOpen
  );

  // Post-action preview for step 3 re-check
  const { data: freshPreview, isLoading: freshPreviewLoading, refetch: refetchPreview } =
    useBranchDeactivationPreview(branchId, refetchTrigger);

  const { data: allBranches = [] } = useBranches(enterpriseId);
  const transferMutation = useTransferBranchDependents();
  const removeMutation = useBulkDeleteBranchDependents();
  const updateBranchStatus = useUpdateBranchStatus();

  // Active branches in same enterprise, excluding current
  const targetBranches = (allBranches as BranchResponse[]).filter(
    (b) => b.id !== branchId && b.status === 'active'
  );

  const activePreview: BranchDeactivationPreview | null | undefined =
    step === 'results' ? freshPreview : preview;
  const activeLoading = step === 'results' ? freshPreviewLoading : previewLoading;

  const handleClose = () => {
    if (isDeactivating || transferMutation.isPending || removeMutation.isPending) return;
    // Reset all state when closing
    setStep('preview');
    setActionTab('transfer');
    setTargetBranchId('');
    setActionError('');
    setActionResults(null);
    setRefetchTrigger(false);
    setIsDeactivating(false);
    onClose();
  };

  const handleExecuteAction = async () => {
    setActionError('');

    if (actionTab === 'transfer') {
      if (!targetBranchId) {
        setActionError('Please select a target branch.');
        return;
      }
      try {
        const result = await transferMutation.mutateAsync({
          branchId,
          data: {
            target_branch_id: targetBranchId,
            transfer_employees: transferEmployees,
            transfer_assets: transferAssets,
          },
        });
        setActionResults({
          type: 'transfer',
          employees: result?.employees_transferred,
          assets: result?.assets_transferred,
          skipped: result?.assets_skipped,
        });
        setRefetchTrigger(true);
        // Small delay then refetch to get updated preview
        setTimeout(() => refetchPreview(), 300);
        setStep('results');
      } catch (err: unknown) {
        setActionError(err instanceof Error ? err.message : 'Transfer failed. Please try again.');
      }
    } else {
      try {
        const result = await removeMutation.mutateAsync({
          branchId,
          data: {
            delete_employees: deleteEmployees,
            delete_assets: deleteAssets,
          },
        });
        setActionResults({
          type: 'remove',
          employees: result?.employees_deactivated,
          assets: result?.assets_deleted,
          skipped: result?.assets_skipped,
        });
        setRefetchTrigger(true);
        setTimeout(() => refetchPreview(), 300);
        setStep('results');
      } catch (err: unknown) {
        setActionError(err instanceof Error ? err.message : 'Remove operation failed. Please try again.');
      }
    }
  };

  const handleDeactivate = async () => {
    setIsDeactivating(true);
    try {
      await updateBranchStatus.mutateAsync({ branchId, status: 'inactive' });
      handleClose();
      onDeactivated();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to deactivate branch.');
      setIsDeactivating(false);
    }
  };

  const isBusy =
    isDeactivating ||
    transferMutation.isPending ||
    removeMutation.isPending ||
    updateBranchStatus.isPending;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-zinc-950 border border-amber-500/30 shadow-2xl shadow-black/50 relative max-sm:rounded-t-xl max-sm:border-b-0"
            >
              {/* Header */}
              <div className="flex items-start justify-between p-5 border-b border-amber-500/20 bg-amber-500/5">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-base uppercase tracking-wide text-amber-400 mb-1">
                      {step === 'preview' && 'Deactivate Branch?'}
                      {step === 'action' && 'Handle Dependents'}
                      {step === 'results' && 'Action Complete'}
                    </h3>
                    <p className="font-mono text-xs text-zinc-500">
                      {step === 'preview' && 'Review the impact before confirming'}
                      {step === 'action' && 'Choose how to handle existing employees and assets'}
                      {step === 'results' && 'Verify the branch is ready to deactivate'}
                    </p>
                  </div>
                </div>
                {!isBusy && (
                  <button
                    type="button"
                    onClick={handleClose}
                    className="p-1.5 text-zinc-500 hover:text-amber-400 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Branch identity */}
                <div className="bg-white/[0.03] border border-white/10 px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 bg-amber-400/10 border border-amber-400/20 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-sm text-white uppercase tracking-wide">
                      {branchName}
                    </p>
                    <p className="font-mono text-[11px] text-zinc-500">Branch Deactivation</p>
                  </div>
                </div>

                {/* Step 1: Preview */}
                {step === 'preview' && (
                  <>
                    {activeLoading && (
                      <div className="flex items-center justify-center py-8 gap-3">
                        <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                        <span className="font-mono text-xs text-zinc-500 uppercase tracking-widest">
                          Checking impact...
                        </span>
                      </div>
                    )}

                    {!activeLoading && activePreview && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                            Impact Summary
                          </span>
                          <div className="flex-1 h-px bg-white/5" />
                        </div>

                        <div className="space-y-2">
                          <PreviewItem
                            icon={<Users className="w-4 h-4" />}
                            label={
                              activePreview.employee_count > 0
                                ? `${activePreview.employee_count} employee${activePreview.employee_count !== 1 ? 's' : ''} assigned to this branch`
                                : 'No employees assigned to this branch'
                            }
                            severity={activePreview.employee_count > 0 ? 'warning' : 'safe'}
                          />
                          <PreviewItem
                            icon={<Package className="w-4 h-4" />}
                            label={
                              activePreview.asset_count > 0
                                ? `${activePreview.asset_count} asset${activePreview.asset_count !== 1 ? 's' : ''} associated with this branch`
                                : 'No assets associated with this branch'
                            }
                            severity={activePreview.asset_count > 0 ? 'warning' : 'safe'}
                          />
                          <PreviewItem
                            icon={<AlertTriangle className="w-4 h-4" />}
                            label={
                              activePreview.active_batch_count > 0
                                ? `${activePreview.active_batch_count} active batch${activePreview.active_batch_count !== 1 ? 'es' : ''} in progress — these must be resolved first`
                                : 'No active batches — safe to proceed'
                            }
                            severity={activePreview.active_batch_count > 0 ? 'danger' : 'safe'}
                          />
                        </div>

                        {/* Blocking reasons */}
                        {!activePreview.can_deactivate && activePreview.blocking_reasons.length > 0 && (
                          <div className="bg-red-500/10 border border-red-500/30 px-4 py-3 space-y-1">
                            <p className="font-mono font-bold text-[11px] text-red-400 uppercase tracking-wider mb-2">
                              Cannot Deactivate Yet
                            </p>
                            {activePreview.blocking_reasons.map((reason, idx) => (
                              <p key={idx} className="font-mono text-xs text-zinc-400 flex items-start gap-2">
                                <span className="text-red-400 mt-0.5">•</span>
                                {reason}
                              </p>
                            ))}
                          </div>
                        )}

                        {/* Safe to deactivate */}
                        {activePreview.can_deactivate && (
                          <div className="bg-emerald-500/5 border border-emerald-500/20 px-4 py-3">
                            <p className="font-mono text-xs text-emerald-400">
                              Safe to deactivate — no blocking conditions found.
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    {!activeLoading && !activePreview && (
                      <div className="bg-amber-500/5 border border-amber-500/20 p-4">
                        <p className="font-mono text-xs text-amber-400">
                          Could not load impact preview. Proceed with caution.
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Step 2: Action */}
                {step === 'action' && (
                  <>
                    {/* Tab selector */}
                    <div className="flex border border-white/10">
                      <button
                        type="button"
                        onClick={() => setActionTab('transfer')}
                        className={`flex-1 py-2.5 font-mono font-bold text-xs uppercase tracking-widest transition-colors ${
                          actionTab === 'transfer'
                            ? 'bg-lime-500/10 border-r border-lime-500/30 text-lime-400'
                            : 'text-zinc-500 hover:text-zinc-300 border-r border-white/10'
                        }`}
                      >
                        Transfer
                      </button>
                      <button
                        type="button"
                        onClick={() => setActionTab('remove')}
                        className={`flex-1 py-2.5 font-mono font-bold text-xs uppercase tracking-widest transition-colors ${
                          actionTab === 'remove'
                            ? 'bg-red-500/10 text-red-400'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        Remove
                      </button>
                    </div>

                    {/* Transfer tab */}
                    {actionTab === 'transfer' && (
                      <div className="space-y-4">
                        <p className="font-mono text-xs text-zinc-400">
                          Move employees and/or assets to another branch in this enterprise.
                        </p>

                        {/* Target branch dropdown */}
                        <div>
                          <label className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 block mb-1.5">
                            Target Branch *
                          </label>
                          {targetBranches.length === 0 ? (
                            <div className="px-3 py-2.5 border border-amber-500/20 bg-amber-500/5 font-mono text-xs text-amber-400">
                              No other active branches available for transfer.
                            </div>
                          ) : (
                            <select
                              value={targetBranchId}
                              onChange={(e) => setTargetBranchId(e.target.value)}
                              className="w-full px-3 py-2.5 border border-white/10 bg-white/[0.02] text-white text-sm focus:border-lime-500 focus:outline-none transition-colors font-mono"
                            >
                              <option value="">Select target branch...</option>
                              {targetBranches.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.branch_name} ({b.branch_code})
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        {/* Transfer options */}
                        <div className="space-y-2">
                          <label className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 block">
                            Transfer Options
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={transferEmployees}
                              onChange={(e) => setTransferEmployees(e.target.checked)}
                              className="w-4 h-4 border border-white/20 bg-white/5 accent-lime-500"
                            />
                            <div className="flex items-center gap-2">
                              <Users className="w-3.5 h-3.5 text-zinc-400" />
                              <span className="font-mono text-xs text-zinc-300">Transfer Employees</span>
                            </div>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={transferAssets}
                              onChange={(e) => setTransferAssets(e.target.checked)}
                              className="w-4 h-4 border border-white/20 bg-white/5 accent-lime-500"
                            />
                            <div className="flex items-center gap-2">
                              <Package className="w-3.5 h-3.5 text-zinc-400" />
                              <span className="font-mono text-xs text-zinc-300">Transfer Assets</span>
                            </div>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Remove tab */}
                    {actionTab === 'remove' && (
                      <div className="space-y-4">
                        <p className="font-mono text-xs text-zinc-400">
                          Deactivate employees and delete unassigned assets from this branch.
                        </p>

                        <div className="space-y-2">
                          <label className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 block">
                            Remove Options
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={deleteEmployees}
                              onChange={(e) => setDeleteEmployees(e.target.checked)}
                              className="w-4 h-4 border border-white/20 bg-white/5 accent-red-500"
                            />
                            <div className="flex items-center gap-2">
                              <Users className="w-3.5 h-3.5 text-red-400" />
                              <span className="font-mono text-xs text-zinc-300">Deactivate Employees</span>
                            </div>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={deleteAssets}
                              onChange={(e) => setDeleteAssets(e.target.checked)}
                              className="w-4 h-4 border border-white/20 bg-white/5 accent-red-500"
                            />
                            <div className="flex items-center gap-2">
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              <span className="font-mono text-xs text-zinc-300">Delete Unassigned Assets</span>
                            </div>
                          </label>
                        </div>

                        <div className="bg-amber-500/5 border border-amber-500/20 px-4 py-3">
                          <p className="font-mono text-xs text-amber-400">
                            Assets currently in-flight (submitted, in review, pickup pending, etc.) will be skipped and must be handled separately.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Action error */}
                    {actionError && (
                      <div className="bg-red-500/5 border border-red-500/20 px-4 py-3">
                        <p className="font-mono text-xs text-red-400">{actionError}</p>
                      </div>
                    )}
                  </>
                )}

                {/* Step 3: Results */}
                {step === 'results' && (
                  <>
                    {actionResults && (
                      <div className="bg-emerald-500/5 border border-emerald-500/20 px-4 py-3 space-y-1">
                        <p className="font-mono font-bold text-[11px] text-emerald-400 uppercase tracking-wider mb-2">
                          {actionResults.type === 'transfer' ? 'Transfer Complete' : 'Removal Complete'}
                        </p>
                        {actionResults.type === 'transfer' ? (
                          <>
                            <p className="font-mono text-xs text-zinc-400">
                              Employees transferred: <span className="text-white">{actionResults.employees ?? 0}</span>
                            </p>
                            <p className="font-mono text-xs text-zinc-400">
                              Assets transferred: <span className="text-white">{actionResults.assets ?? 0}</span>
                            </p>
                            {(actionResults.skipped ?? 0) > 0 && (
                              <p className="font-mono text-xs text-amber-400">
                                Assets skipped (in-flight): {actionResults.skipped}
                              </p>
                            )}
                          </>
                        ) : (
                          <>
                            <p className="font-mono text-xs text-zinc-400">
                              Employees deactivated: <span className="text-white">{actionResults.employees ?? 0}</span>
                            </p>
                            <p className="font-mono text-xs text-zinc-400">
                              Assets deleted: <span className="text-white">{actionResults.assets ?? 0}</span>
                            </p>
                            {(actionResults.skipped ?? 0) > 0 && (
                              <p className="font-mono text-xs text-amber-400">
                                Assets skipped (in-flight): {actionResults.skipped}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* Re-check preview */}
                    {activeLoading && (
                      <div className="flex items-center justify-center py-6 gap-3">
                        <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                        <span className="font-mono text-xs text-zinc-500 uppercase tracking-widest">
                          Re-checking branch status...
                        </span>
                      </div>
                    )}

                    {!activeLoading && activePreview && (
                      <>
                        {activePreview.can_deactivate ? (
                          <div className="bg-emerald-500/5 border border-emerald-500/20 px-4 py-3">
                            <p className="font-mono text-xs text-emerald-400">
                              Branch is now clear — ready to deactivate.
                            </p>
                          </div>
                        ) : (
                          <div className="bg-amber-500/5 border border-amber-500/20 px-4 py-3 space-y-1">
                            <p className="font-mono font-bold text-[11px] text-amber-400 uppercase tracking-wider mb-2">
                              Still Blocked
                            </p>
                            {activePreview.blocking_reasons.map((reason, idx) => (
                              <p key={idx} className="font-mono text-xs text-zinc-400 flex items-start gap-2">
                                <span className="text-amber-400 mt-0.5">•</span>
                                {reason}
                              </p>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    {actionError && (
                      <div className="bg-red-500/5 border border-red-500/20 px-4 py-3">
                        <p className="font-mono text-xs text-red-400">{actionError}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 p-5 border-t border-white/10 bg-white/[0.02]">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isBusy}
                  className="px-5 py-2.5 font-mono font-bold text-xs uppercase tracking-widest border border-zinc-700 text-zinc-400 hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  {/* Step 1 actions */}
                  {step === 'preview' && !activeLoading && activePreview && (
                    <>
                      {activePreview.can_deactivate ? (
                        <button
                          type="button"
                          onClick={handleDeactivate}
                          disabled={isBusy}
                          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-mono font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border border-amber-600"
                        >
                          {isDeactivating ? (
                            <>
                              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                              Deactivating...
                            </>
                          ) : (
                            'Deactivate Branch'
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setStep('action')}
                          disabled={isBusy}
                          className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-mono font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border border-zinc-700"
                        >
                          Handle Dependents
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}

                  {/* Step 2 action */}
                  {step === 'action' && (
                    <button
                      type="button"
                      onClick={handleExecuteAction}
                      disabled={isBusy || (actionTab === 'transfer' && targetBranches.length === 0)}
                      className={`px-5 py-2.5 font-mono font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border ${
                        actionTab === 'transfer'
                          ? 'bg-lime-500 hover:bg-lime-400 text-black border-lime-600'
                          : 'bg-red-500 hover:bg-red-600 text-white border-red-600'
                      }`}
                    >
                      {(transferMutation.isPending || removeMutation.isPending) ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (
                        actionTab === 'transfer' ? 'Execute Transfer' : 'Execute Removal'
                      )}
                    </button>
                  )}

                  {/* Step 3 action */}
                  {step === 'results' && !activeLoading && activePreview?.can_deactivate && (
                    <button
                      type="button"
                      onClick={handleDeactivate}
                      disabled={isBusy}
                      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-mono font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border border-amber-600"
                    >
                      {isDeactivating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                          Deactivating...
                        </>
                      ) : (
                        'Deactivate Branch'
                      )}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export default BranchDeactivationModal;
