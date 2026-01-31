import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { safeNumber } from '@/utils/formatters';
import {
  FileCheck,
  Search,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  Eye,
  Send,
  Laptop
} from 'lucide-react';
import { useAuth, useAssets, useBatches, useEnterprises, useApproveBatch, useRejectBatch } from '@/hooks';

type ApprovalFilter = 'pending' | 'approved' | 'rejected' | 'all';

export function BatchApprovals() {
  const navigate = useNavigate();
  const { user, enterprise } = useAuth();
  const enterpriseId = enterprise?.id || '';
  const { data: assets = [] } = useAssets(enterpriseId);
  const { data: batches = [] } = useBatches(enterpriseId);
  const { data: enterprises = [] } = useEnterprises();
  const approveMutation = useApproveBatch();
  const rejectMutation = useRejectBatch();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApprovalFilter>('pending');
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');
  const isSubmitting = approveMutation.isPending || rejectMutation.isPending;

  // Filter batches that require Org Admin approval
  const approvalBatches = batches.filter(b => b.requires_approval);

  const filteredBatches = approvalBatches
    .filter(b => {
      if (statusFilter === 'pending') return b.status === 'pending_approval';
      if (statusFilter === 'approved') return b.approval_status === 'approved';
      if (statusFilter === 'rejected') return b.approval_status === 'rejected';
      return true;
    })
    .filter(b =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getEnterpriseName(b.enterprise_id).toLowerCase().includes(searchQuery.toLowerCase())
    );

  function getEnterpriseName(entId: string) {
    return enterprises.find(e => e.id === entId)?.name || 'Unknown Enterprise';
  }

  function getEnterpriseDetails(entId: string) {
    return enterprises.find(e => e.id === entId);
  }

  function getBatchAssets(batchId: string) {
    return assets.filter(a => a.batch_id === batchId);
  }

  const selectedBatchData = selectedBatch ? batches.find(b => b.id === selectedBatch) : null;
  const selectedEnterprise = selectedBatchData ? getEnterpriseDetails(selectedBatchData.enterprise_id) : null;
  const batchAssets = selectedBatchData ? getBatchAssets(selectedBatchData.id) : [];

  const handleSubmitDecision = async () => {
    if (!selectedBatch || !decision || !user) return;

    try {
      if (decision === 'approve') {
        await approveMutation.mutateAsync({
          batchId: selectedBatch,
          approvedBy: user.id,
          notes: notes || undefined,
        });
      } else {
        await rejectMutation.mutateAsync({
          batchId: selectedBatch,
          rejectedBy: user.id,
          reason: rejectionReason,
        });
      }

      setSelectedBatch(null);
      setDecision(null);
      setRejectionReason('');
      setNotes('');
    } catch (error) {
      console.error('Failed to process approval decision:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-2">
            Org Admin Review
          </span>
          <h1 className="font-brand font-bold text-3xl text-slate-900 dark:text-white uppercase tracking-tight">
            Batch Approvals
          </h1>
          <p className="font-display text-slate-500 dark:text-white/50 text-sm mt-2 uppercase tracking-wide">
            Review and approve high-value batches
          </p>
        </motion.div>
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-3 gap-4"
      >
        <div className="border border-amber-400/30 bg-amber-400/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Pending</span>
          </div>
          <p className="font-brand font-bold text-3xl text-amber-400">
            {approvalBatches.filter(b => b.status === 'pending_approval').length}
          </p>
          <p className="font-mono text-xs text-slate-500 dark:text-white/50 mt-1">
            ₹{(approvalBatches.filter(b => b.status === 'pending_approval').reduce((sum, b) => sum + safeNumber(b.estimated_value), 0) / 100000).toFixed(1)}L
          </p>
        </div>

        <div className="border border-emerald-400/30 bg-emerald-400/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Approved</span>
          </div>
          <p className="font-brand font-bold text-3xl text-emerald-400">
            {approvalBatches.filter(b => b.approval_status === 'approved').length}
          </p>
        </div>

        <div className="border border-red-400/30 bg-red-400/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-red-400" />
            <span className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Rejected</span>
          </div>
          <p className="font-brand font-bold text-3xl text-red-400">
            {approvalBatches.filter(b => b.approval_status === 'rejected').length}
          </p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-white/50" />
          <input
            type="text"
            placeholder="Search batches..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`interactive px-4 py-3 border font-mono font-bold text-xs uppercase tracking-widest transition-all ${
                statusFilter === filter
                  ? 'border-ecotribe-primary bg-ecotribe-primary/10 text-ecotribe-primary'
                  : 'border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-500 dark:text-white/50 hover:border-white/20'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Batch List */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          {filteredBatches.length > 0 ? (
            filteredBatches.map((batch, idx) => {
              const isSelected = selectedBatch === batch.id;
              const isPending = batch.status === 'pending_approval';

              return (
                <motion.div
                  key={batch.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setSelectedBatch(batch.id)}
                  className={`border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-ecotribe-primary bg-ecotribe-primary/5'
                      : isPending
                      ? 'border-amber-400/30 bg-amber-400/5 hover:border-amber-400/50'
                      : 'border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-white/20'
                  }`}
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 border flex items-center justify-center flex-shrink-0 ${
                        batch.approval_status === 'approved'
                          ? 'border-emerald-400/30 bg-emerald-400/10'
                          : batch.approval_status === 'rejected'
                          ? 'border-red-400/30 bg-red-400/10'
                          : 'border-amber-400/30 bg-amber-400/10'
                      }`}>
                        <FileCheck className={`w-7 h-7 ${
                          batch.approval_status === 'approved'
                            ? 'text-emerald-400'
                            : batch.approval_status === 'rejected'
                            ? 'text-red-400'
                            : 'text-amber-400'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white uppercase">
                              {batch.name}
                            </h3>
                            <p className="font-mono text-xs text-slate-500 dark:text-white/50 flex items-center gap-1 mt-1">
                              <Building2 className="w-3 h-3" />
                              {getEnterpriseName(batch.enterprise_id)}
                            </p>
                          </div>
                          <span className={`flex-shrink-0 px-2 py-1 border font-mono font-bold text-[10px] uppercase tracking-widest ${
                            batch.approval_status === 'approved'
                              ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400'
                              : batch.approval_status === 'rejected'
                              ? 'border-red-400/30 bg-red-400/10 text-red-400'
                              : 'border-amber-400/30 bg-amber-400/10 text-amber-400'
                          }`}>
                            {batch.approval_status || 'Pending'}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                          <div>
                            <p className="font-brand font-bold text-xl text-slate-900 dark:text-white">{batch.asset_count || 0}</p>
                            <p className="font-mono text-[10px] text-slate-500 dark:text-white/50 uppercase">Assets</p>
                          </div>
                          <div>
                            <p className="font-brand font-bold text-xl text-ecotribe-primary">
                              ₹{((batch.estimated_value || 0) / 1000).toFixed(0)}K
                            </p>
                            <p className="font-mono text-[10px] text-slate-500 dark:text-white/50 uppercase">Value</p>
                          </div>
                          <div>
                            <p className="font-mono text-xs text-slate-500 dark:text-white/50">
                              {new Date(batch.created_at).toLocaleDateString()}
                            </p>
                            <p className="font-mono text-[10px] text-slate-500 dark:text-white/50 uppercase">Created</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] py-16 text-center">
              <div className="w-16 h-16 border border-slate-200 dark:border-white/10 bg-white/5 flex items-center justify-center mx-auto mb-4">
                <FileCheck className="w-8 h-8 text-slate-500 dark:text-white/50" />
              </div>
              <h3 className="font-brand font-bold text-lg text-slate-500 dark:text-white/50 uppercase mb-2">
                No Batches Found
              </h3>
              <p className="font-display text-sm text-slate-500 dark:text-white/50">
                {searchQuery ? 'Try adjusting your search.' : 'No batches require approval.'}
              </p>
            </div>
          )}
        </motion.div>

        {/* Review Panel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:sticky lg:top-4 h-fit"
        >
          {selectedBatchData ? (
            <div className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
              <div className="p-5 border-b border-slate-200 dark:border-white/10">
                <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">
                  Batch Details
                </h3>
              </div>

              <div className="p-5 space-y-6">
                {/* Enterprise Info */}
                {selectedEnterprise && (
                  <div className="p-4 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 border border-slate-200 dark:border-white/10 bg-white/5 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-slate-500 dark:text-white/50" />
                      </div>
                      <div>
                        <p className="font-display font-bold text-slate-900 dark:text-white">{selectedEnterprise.name}</p>
                        <p className="font-mono text-xs text-slate-500 dark:text-white/50">{selectedEnterprise.contact_email}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Batch Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                    <p className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase mb-1">Total Assets</p>
                    <p className="font-brand font-bold text-2xl text-slate-900 dark:text-white">{selectedBatchData.asset_count || 0}</p>
                  </div>
                  <div className="p-4 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                    <p className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase mb-1">Estimated Value</p>
                    <p className="font-brand font-bold text-2xl text-ecotribe-primary">
                      ₹{(selectedBatchData.estimated_value || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Asset Preview */}
                <div>
                  <p className="font-mono font-bold text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest mb-3">
                    Asset Preview
                  </p>
                  <div className="border border-slate-200 dark:border-white/10 divide-y divide-white/5 max-h-48 overflow-y-auto">
                    {batchAssets.slice(0, 5).map((asset) => (
                      <div key={asset.id} className="p-3 flex items-center gap-3">
                        <Laptop className="w-4 h-4 text-slate-500 dark:text-white/50" />
                        <div className="flex-1">
                          <p className="font-display text-sm text-slate-900 dark:text-white">{asset.brand} {asset.model}</p>
                          <p className="font-mono text-xs text-slate-500 dark:text-white/50">{asset.serial_number}</p>
                        </div>
                        <p className="font-mono text-xs text-ecotribe-primary">
                          ₹{(asset.base_price || 0).toLocaleString()}
                        </p>
                      </div>
                    ))}
                    {batchAssets.length > 5 && (
                      <div className="p-3 text-center">
                        <p className="font-mono text-xs text-slate-500 dark:text-white/50">
                          +{batchAssets.length - 5} more assets
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {selectedBatchData.status === 'pending_approval' ? (
                  /* Decision Form */
                  <>
                    <div>
                      <p className="font-mono font-bold text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest mb-3">
                        Your Decision
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setDecision('approve')}
                          className={`interactive p-4 border transition-all ${
                            decision === 'approve'
                              ? 'border-emerald-400 bg-emerald-400/10'
                              : 'border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-emerald-400/50'
                          }`}
                        >
                          <CheckCircle className={`w-8 h-8 mx-auto mb-2 ${
                            decision === 'approve' ? 'text-emerald-400' : 'text-slate-500 dark:text-white/50'
                          }`} />
                          <p className={`font-mono font-bold text-xs uppercase tracking-widest ${
                            decision === 'approve' ? 'text-emerald-400' : 'text-slate-500 dark:text-white/50'
                          }`}>
                            Approve
                          </p>
                        </button>
                        <button
                          onClick={() => setDecision('reject')}
                          className={`interactive p-4 border transition-all ${
                            decision === 'reject'
                              ? 'border-red-400 bg-red-400/10'
                              : 'border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-red-400/50'
                          }`}
                        >
                          <XCircle className={`w-8 h-8 mx-auto mb-2 ${
                            decision === 'reject' ? 'text-red-400' : 'text-slate-500 dark:text-white/50'
                          }`} />
                          <p className={`font-mono font-bold text-xs uppercase tracking-widest ${
                            decision === 'reject' ? 'text-red-400' : 'text-slate-500 dark:text-white/50'
                          }`}>
                            Reject
                          </p>
                        </button>
                      </div>
                    </div>

                    {decision === 'reject' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                      >
                        <label className="block">
                          <span className="font-mono font-bold text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest">
                            Rejection Reason *
                          </span>
                          <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Explain why this batch is being rejected..."
                            rows={3}
                            className="mt-2 w-full px-4 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none transition-colors resize-none"
                          />
                        </label>
                      </motion.div>
                    )}

                    <div>
                      <label className="block">
                        <span className="font-mono font-bold text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest">
                          Notes (Optional)
                        </span>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Add any additional notes..."
                          rows={2}
                          className="mt-2 w-full px-4 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none transition-colors resize-none"
                        />
                      </label>
                    </div>

                    <button
                      onClick={handleSubmitDecision}
                      disabled={!decision || (decision === 'reject' && !rejectionReason) || isSubmitting}
                      className={`w-full interactive py-3 font-mono font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                        decision
                          ? decision === 'approve'
                            ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                            : 'bg-red-500 text-white hover:bg-red-400'
                          : 'bg-white/10 text-slate-500 dark:text-white/50 cursor-not-allowed'
                      }`}
                    >
                      {isSubmitting ? (
                        <Clock className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Submit Decision
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  /* Already Decided */
                  <div className={`p-4 border ${
                    selectedBatchData.approval_status === 'approved'
                      ? 'border-emerald-400/30 bg-emerald-400/10'
                      : 'border-red-400/30 bg-red-400/10'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {selectedBatchData.approval_status === 'approved' ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                      <span className={`font-mono font-bold text-sm uppercase ${
                        selectedBatchData.approval_status === 'approved' ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {selectedBatchData.approval_status}
                      </span>
                    </div>
                    {selectedBatchData.rejection_reason && (
                      <p className="font-display text-sm text-slate-600 dark:text-zinc-300 mt-2">
                        {selectedBatchData.rejection_reason}
                      </p>
                    )}
                    {selectedBatchData.approved_at && (
                      <p className="font-mono text-xs text-slate-500 dark:text-white/50 mt-2">
                        Decided on {new Date(selectedBatchData.approved_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] py-16 text-center">
              <Eye className="w-10 h-10 text-slate-500 dark:text-white/50 mx-auto mb-4" />
              <p className="font-display text-slate-500 dark:text-white/50">
                Select a batch to review details
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default BatchApprovals;
