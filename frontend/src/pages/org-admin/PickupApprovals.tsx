/**
 * Org Admin Pickup Approvals Page
 * V3: IT Admin submits batches for pickup → Org Admin approves → Auto pickup initiated
 * Migrated from legacy BatchApprovals to React Query
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileCheck,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Send,
  Truck,
  MapPin,
  Calendar,
  Loader2,
  Package,
  AlertTriangle
} from 'lucide-react';
import { useAuth, useBatches, useAssets, useApproveBatchWithPrices, useRejectBatch, useApiError } from '@/hooks';
import { ConfirmationModal } from '@/components/ui';
import { BatchProgressBar } from '@/components/admin/BatchProgressBar';
import { safeNumber } from '@/utils/formatters';

type ApprovalFilter = 'pending' | 'approved' | 'rejected' | 'all';

export function PickupApprovals() {
  // V3: Use React Query hook for auth
  const { user, enterprise } = useAuth();
  const enterpriseId = enterprise?.id || '';
  const { handleError, showSuccess } = useApiError();

  // V3: React Query for data fetching
  const { data: batches = [], isLoading: batchesLoading } = useBatches(enterpriseId);
  const { data: assets = [] } = useAssets(enterpriseId);

  // V3: Use proper React Query hooks for approval/rejection
  const rejectBatchMutation = useRejectBatch();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApprovalFilter>('pending');
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [assetPrices, setAssetPrices] = useState<Map<string, number>>(new Map());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // V3.2: Use new pricing mutation
  const approveBatchWithPricesMutation = useApproveBatchWithPrices();

  // Helper: Format asset specs for display
  function formatSpecs(specs?: { processor?: string; ram?: string; storage?: string }): string {
    if (!specs) return '—';
    const parts = [
      specs.processor?.replace('Intel Core ', '').replace('AMD Ryzen ', ''),
      specs.ram,
      specs.storage
    ].filter(Boolean);
    return parts.join(' / ') || '—';
  }

  // Helper: Handle price change for an asset
  function handlePriceChange(assetId: string, value: string) {
    const newPrices = new Map(assetPrices);
    if (value === '' || value === null) {
      newPrices.delete(assetId);
    } else {
      const price = parseFloat(value);
      if (!isNaN(price) && price >= 0) {
        newPrices.set(assetId, price);
      }
    }
    setAssetPrices(newPrices);
  }

  // Helper: Calculate total of entered prices
  function calculateTotal(): number {
    let total = 0;
    assetPrices.forEach((price) => {
      total += price;
    });
    return total;
  }

  // V3: Filter batches that require approval (pending_approval status)
  const pendingBatches = batches.filter(b => b.requires_approval);

  const filteredBatches = pendingBatches
    .filter(b => {
      if (statusFilter === 'pending') return b.status === 'pending_approval';
      if (statusFilter === 'approved') return b.status === 'approved' || b.status === 'pickup_in_progress' || b.status === 'completed';
      if (statusFilter === 'rejected') return b.status === 'rejected';
      return true;
    })
    .filter(b =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

  function getBatchAssets(batchId: string) {
    return assets.filter(a => a.batch_id === batchId);
  }

  function getVerifiedAssets(batchId: string) {
    return assets.filter(a =>
      a.batch_id === batchId &&
      (a.status === 'conditionally_accepted' || a.status === 'ready_for_pickup')
    );
  }

  const selectedBatchData = selectedBatch ? batches.find(b => b.id === selectedBatch) : null;
  const batchAssets = selectedBatchData ? getBatchAssets(selectedBatchData.id) : [];
  const verifiedAssets = selectedBatchData ? getVerifiedAssets(selectedBatchData.id) : [];
  const nonVerifiedCount = batchAssets.length - verifiedAssets.length;

  const handleSubmitDecision = async () => {
    if (!selectedBatch || !decision || !user) return;

    setIsSubmitting(true);
    setSuccessMessage(null);
    try {
      if (decision === 'approve') {
        // V3.2: Use new pricing mutation for approvals
        const prices = Array.from(assetPrices.entries()).map(([assetId, price]) => ({
          assetId,
          price,
        }));
        const result = await approveBatchWithPricesMutation.mutateAsync({
          batchId: selectedBatch,
          orgAdminId: user.id,
          prices,
          notes: notes || undefined,
        });

        // Show success message based on whether pickup was auto-created
        if (result.pickupRequest) {
          setSuccessMessage('Batch approved and pickup request auto-created! OPS Admin can now assign logistics.');
          showSuccess('Batch Approved', 'Pickup request has been auto-created.');
        } else {
          setSuccessMessage('Batch approved successfully.');
          showSuccess('Batch Approved', 'The batch has been approved successfully.');
        }
      } else {
        // Use proper React Query hook for rejection
        await rejectBatchMutation.mutateAsync({
          batchId: selectedBatch,
          rejectedBy: user.id,
          reason: rejectionReason || 'Rejected',
        });
        setSuccessMessage('Batch rejected. IT Admin will be notified.');
        showSuccess('Batch Rejected', 'IT Admin has been notified of the rejection.');
      }

      setSelectedBatch(null);
      setDecision(null);
      setRejectionReason('');
      setNotes('');
      setAssetPrices(new Map());
      setShowConfirmModal(false);

      // Auto-hide success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      handleError(error, decision === 'approve' ? 'Approving batch' : 'Rejecting batch');
    } finally {
      setIsSubmitting(false);
    }
  };

  // V3: Loading state
  if (batchesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-ecotribe-primary animate-spin mx-auto mb-4" />
          <p className="font-mono text-xs text-slate-500 dark:text-zinc-500 uppercase tracking-widest">
            Loading approvals...
          </p>
        </div>
      </div>
    );
  }

  // Stats
  const stats = {
    pending: pendingBatches.filter(b => b.status === 'pending_approval').length,
    approved: pendingBatches.filter(b => b.status === 'approved' || b.status === 'pickup_in_progress' || b.status === 'completed').length,
    rejected: pendingBatches.filter(b => b.status === 'rejected').length,
    totalValue: pendingBatches
      .filter(b => b.status === 'pending_approval')
      .reduce((sum, b) => sum + safeNumber(b.estimated_value), 0),
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
            Pickup Approvals
          </h1>
          <p className="font-display text-slate-500 dark:text-white/50 text-sm mt-2 uppercase tracking-wide">
            Review IT Admin pickup requests before processing
          </p>
        </motion.div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="p-4 border border-emerald-400/30 bg-emerald-400/10 flex items-center gap-3"
        >
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <p className="font-display text-sm text-emerald-400 flex-1">{successMessage}</p>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-400/70 hover:text-emerald-400 transition-colors"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <div
          className={`border p-5 cursor-pointer transition-all ${
            statusFilter === 'pending'
              ? 'border-amber-400 bg-amber-400/10'
              : 'border-amber-400/30 bg-amber-400/5 hover:border-amber-400/50'
          }`}
          onClick={() => setStatusFilter('pending')}
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Pending</span>
          </div>
          <p className="font-brand font-bold text-3xl text-amber-400">
            {stats.pending}
          </p>
          <p className="font-mono text-xs text-slate-500 dark:text-white/50 mt-1">
            {stats.totalValue > 0 ? `₹${(stats.totalValue / 100000).toFixed(1)}L` : 'No value'}
          </p>
        </div>

        <div
          className={`border p-5 cursor-pointer transition-all ${
            statusFilter === 'approved'
              ? 'border-emerald-400 bg-emerald-400/10'
              : 'border-emerald-400/30 bg-emerald-400/5 hover:border-emerald-400/50'
          }`}
          onClick={() => setStatusFilter('approved')}
        >
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Approved</span>
          </div>
          <p className="font-brand font-bold text-3xl text-emerald-400">
            {stats.approved}
          </p>
        </div>

        <div
          className={`border p-5 cursor-pointer transition-all ${
            statusFilter === 'rejected'
              ? 'border-red-400 bg-red-400/10'
              : 'border-red-400/30 bg-red-400/5 hover:border-red-400/50'
          }`}
          onClick={() => setStatusFilter('rejected')}
        >
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-red-400" />
            <span className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Rejected</span>
          </div>
          <p className="font-brand font-bold text-3xl text-red-400">
            {stats.rejected}
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
        <button
          onClick={() => setStatusFilter('all')}
          className={`interactive px-4 py-3 border font-mono font-bold text-xs uppercase tracking-widest transition-all ${
            statusFilter === 'all'
              ? 'border-ecotribe-primary bg-ecotribe-primary/10 text-ecotribe-primary'
              : 'border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-500 dark:text-white/50 hover:border-white/20'
          }`}
        >
          Show All
        </button>
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
              const batchAssetsCount = getBatchAssets(batch.id).length;

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
                        batch.status === 'approved' || batch.status === 'pickup_in_progress' || batch.status === 'completed'
                          ? 'border-emerald-400/30 bg-emerald-400/10'
                          : batch.status === 'rejected'
                          ? 'border-red-400/30 bg-red-400/10'
                          : 'border-amber-400/30 bg-amber-400/10'
                      }`}>
                        <Truck className={`w-7 h-7 ${
                          batch.status === 'approved' || batch.status === 'pickup_in_progress' || batch.status === 'completed'
                            ? 'text-emerald-400'
                            : batch.status === 'rejected'
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
                            {batch.it_admin_notes && (
                              <p className="font-mono text-xs text-slate-500 dark:text-white/50 mt-1 line-clamp-1">
                                "{batch.it_admin_notes}"
                              </p>
                            )}
                          </div>
                          <span className={`flex-shrink-0 px-2 py-1 border font-mono font-bold text-[10px] uppercase tracking-widest ${
                            batch.status === 'approved' || batch.status === 'pickup_in_progress' || batch.status === 'completed'
                              ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400'
                              : batch.status === 'rejected'
                              ? 'border-red-400/30 bg-red-400/10 text-red-400'
                              : 'border-amber-400/30 bg-amber-400/10 text-amber-400'
                          }`}>
                            {batch.status === 'pending_approval' ? 'Pending'
                              : batch.status === 'approved' ? 'Approved'
                              : batch.status === 'pickup_in_progress' ? 'Pickup In Progress'
                              : batch.status === 'completed' ? 'Completed'
                              : batch.status === 'rejected' ? 'Rejected'
                              : batch.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                          <div>
                            <p className="font-brand font-bold text-xl text-slate-900 dark:text-white">
                              {batchAssetsCount}
                            </p>
                            <p className="font-mono text-[10px] text-slate-500 dark:text-white/50 uppercase">Assets</p>
                          </div>
                          <div>
                            <p className="font-brand font-bold text-xl text-ecotribe-primary">
                              {batch.estimated_value
                                ? `₹${(batch.estimated_value / 1000).toFixed(0)}K`
                                : '—'
                              }
                            </p>
                            <p className="font-mono text-[10px] text-slate-500 dark:text-white/50 uppercase">Value</p>
                          </div>
                          <div>
                            <p className="font-mono text-xs text-slate-500 dark:text-white/50">
                              {batch.submitted_for_approval_at
                                ? new Date(batch.submitted_for_approval_at).toLocaleDateString()
                                : new Date(batch.created_at).toLocaleDateString()
                              }
                            </p>
                            <p className="font-mono text-[10px] text-slate-500 dark:text-white/50 uppercase">Submitted</p>
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
                {/* Batch Info */}
                <div className="p-4 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 border border-slate-200 dark:border-white/10 bg-white/5 flex items-center justify-center">
                      <Package className="w-6 h-6 text-slate-500 dark:text-white/50" />
                    </div>
                    <div>
                      <p className="font-display font-bold text-slate-900 dark:text-white">{selectedBatchData.name}</p>
                      {selectedBatchData.description && (
                        <p className="font-mono text-xs text-slate-500 dark:text-white/50">{selectedBatchData.description}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pickup Details */}
                {(selectedBatchData.preferred_pickup_date || selectedBatchData.pickup_location_override) && (
                  <div className="p-4 border border-blue-400/20 bg-blue-400/5">
                    <p className="font-mono font-bold text-xs text-blue-400 uppercase tracking-widest mb-3">
                      Pickup Request Details
                    </p>
                    <div className="space-y-2">
                      {selectedBatchData.preferred_pickup_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-400" />
                          <span className="font-mono text-xs text-slate-500 dark:text-white/50">
                            {new Date(selectedBatchData.preferred_pickup_date).toLocaleDateString()}
                          </span>
                          {selectedBatchData.preferred_pickup_slot && (
                            <span className="font-mono text-xs text-blue-400 uppercase">
                              ({selectedBatchData.preferred_pickup_slot})
                            </span>
                          )}
                        </div>
                      )}
                      {selectedBatchData.pickup_location_override && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-blue-400" />
                          <span className="font-mono text-xs text-slate-500 dark:text-white/50">
                            {selectedBatchData.pickup_location_override}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* IT Admin Notes */}
                {selectedBatchData.it_admin_notes && (
                  <div className="p-4 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                    <p className="font-mono font-bold text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2">
                      IT Admin Notes
                    </p>
                    <p className="font-display text-sm text-slate-900 dark:text-white">
                      "{selectedBatchData.it_admin_notes}"
                    </p>
                  </div>
                )}

                {/* Batch Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                    <p className="font-mono text-[10px] text-slate-500 dark:text-white/50 uppercase mb-1">Total Assets</p>
                    <p className="font-brand font-bold text-xl text-slate-900 dark:text-white">{batchAssets.length}</p>
                  </div>
                  <div className="p-3 border border-emerald-400/30 bg-emerald-400/5">
                    <p className="font-mono text-[10px] text-emerald-500 dark:text-emerald-400 uppercase mb-1">Verified</p>
                    <p className="font-brand font-bold text-xl text-emerald-500 dark:text-emerald-400">{verifiedAssets.length}</p>
                  </div>
                  <div className="p-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                    <p className="font-mono text-[10px] text-slate-500 dark:text-white/50 uppercase mb-1">Est. Value</p>
                    <p className="font-brand font-bold text-xl text-ecotribe-primary">
                      {selectedBatchData.estimated_value
                        ? `₹${(selectedBatchData.estimated_value / 1000).toFixed(0)}K`
                        : '—'
                      }
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                {selectedBatchData.progress && (
                  <BatchProgressBar progress={selectedBatchData.progress} compact />
                )}

                {/* V3.2: Asset Pricing Table — Verified Assets Only */}
                <div>
                  <p className="font-mono font-bold text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest mb-3">
                    Verified Assets for Pickup ({verifiedAssets.length})
                  </p>
                  <div className="border border-slate-200 dark:border-white/10 overflow-x-auto">
                    <div className="min-w-[400px]">
                    {/* Table Header */}
                    <div className="grid grid-cols-[1fr_1fr_120px] gap-2 p-3 bg-slate-100 dark:bg-white/[0.04] border-b border-slate-200 dark:border-white/10">
                      <p className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest">Asset</p>
                      <p className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest">Specs</p>
                      <p className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest text-right">Price (₹)</p>
                    </div>
                    {/* Table Body */}
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-200 dark:divide-white/5">
                      {verifiedAssets.map((asset) => (
                        <div key={asset.id} className="grid grid-cols-[1fr_1fr_120px] gap-2 p-3 items-center hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                          <div>
                            <p className="font-display text-sm text-slate-900 dark:text-white">{asset.brand} {asset.model}</p>
                            <p className="font-mono text-[10px] text-slate-400 dark:text-white/40">{asset.serial_number}</p>
                          </div>
                          <div>
                            <p className="font-mono text-xs text-slate-600 dark:text-white/70">{formatSpecs(asset.specs)}</p>
                          </div>
                          <div>
                            {selectedBatchData?.status === 'pending_approval' ? (
                              <input
                                type="number"
                                min="0"
                                step="100"
                                value={assetPrices.get(asset.id) ?? ''}
                                onChange={(e) => handlePriceChange(asset.id, e.target.value)}
                                placeholder="—"
                                className="w-full px-2 py-1.5 text-right font-mono text-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-white/20 focus:border-ecotribe-primary focus:outline-none transition-colors"
                              />
                            ) : (
                              <p className="font-mono text-sm text-ecotribe-primary text-right">
                                {asset.base_price ? `₹${asset.base_price.toLocaleString('en-IN')}` : '—'}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      {verifiedAssets.length === 0 && (
                        <div className="p-6 text-center space-y-2">
                          <AlertTriangle className="w-8 h-8 mx-auto text-amber-400" />
                          <p className="font-mono text-xs font-bold text-slate-700 dark:text-white/70">No verified assets in this batch</p>
                          <p className="font-mono text-[10px] text-slate-500 dark:text-white/40 max-w-xs mx-auto">
                            Assets must be reviewed and accepted (conditionally accepted or ready for pickup) before this batch can be approved. Reject or return to IT Admin.
                          </p>
                        </div>
                      )}
                    </div>
                    {/* Note about non-verified assets */}
                    {nonVerifiedCount > 0 && (
                      <div className="px-3 py-2 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-200 dark:border-white/10">
                        <p className="font-mono text-[10px] text-slate-400 dark:text-white/30">
                          {nonVerifiedCount} other asset{nonVerifiedCount !== 1 ? 's' : ''} still in progress (not shown)
                        </p>
                      </div>
                    )}
                    {/* Table Footer - Total */}
                    {verifiedAssets.length > 0 && selectedBatchData?.status === 'pending_approval' && (
                      <div className="grid grid-cols-[1fr_1fr_120px] gap-2 p-3 bg-slate-100 dark:bg-white/[0.04] border-t border-slate-200 dark:border-white/10">
                        <p className="font-mono font-bold text-xs text-slate-700 dark:text-white/70 uppercase col-span-2">Total</p>
                        <p className="font-mono font-bold text-sm text-ecotribe-primary text-right">
                          ₹{calculateTotal().toLocaleString('en-IN')}
                        </p>
                      </div>
                    )}
                  </div>
                  </div>{/* min-w-[400px] */}
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
                          onClick={() => verifiedAssets.length > 0 && setDecision('approve')}
                          disabled={verifiedAssets.length === 0}
                          title={verifiedAssets.length === 0 ? 'Cannot approve — no verified assets in this batch' : 'Approve this batch for pickup'}
                          className={`interactive p-4 border transition-all ${
                            verifiedAssets.length === 0
                              ? 'border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-white/[0.01] opacity-50 cursor-not-allowed'
                              : decision === 'approve'
                                ? 'border-emerald-400 bg-emerald-400/10'
                                : 'border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-emerald-400/50'
                          }`}
                        >
                          <CheckCircle className={`w-8 h-8 mx-auto mb-2 ${
                            verifiedAssets.length === 0 ? 'text-slate-300 dark:text-white/20' : decision === 'approve' ? 'text-emerald-400' : 'text-slate-500 dark:text-white/50'
                          }`} />
                          <p className={`font-mono font-bold text-xs uppercase tracking-widest ${
                            verifiedAssets.length === 0 ? 'text-slate-300 dark:text-white/20' : decision === 'approve' ? 'text-emerald-400' : 'text-slate-500 dark:text-white/50'
                          }`}>
                            {verifiedAssets.length === 0 ? 'Cannot Approve' : 'Approve'}
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
                      type="button"
                      onClick={() => setShowConfirmModal(true)}
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
                        <Loader2 className="w-4 h-4 animate-spin" />
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
                    selectedBatchData.status === 'approved'
                      ? 'border-emerald-400/30 bg-emerald-400/10'
                      : 'border-red-400/30 bg-red-400/10'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {selectedBatchData.status === 'approved' ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                      <span className={`font-mono font-bold text-sm uppercase ${
                        selectedBatchData.status === 'approved' ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {selectedBatchData.status === 'approved' ? 'Approved' : 'Rejected'}
                      </span>
                    </div>
                    {selectedBatchData.rejection_reason && (
                      <p className="font-display text-sm text-slate-600 dark:text-zinc-300 mt-2">
                        {selectedBatchData.rejection_reason}
                      </p>
                    )}
                    {selectedBatchData.approved_at && (
                      <p className="font-mono text-xs text-slate-500 dark:text-white/50 mt-2">
                        Approved on {new Date(selectedBatchData.approved_at).toLocaleString()}
                      </p>
                    )}
                    {selectedBatchData.rejected_at && (
                      <p className="font-mono text-xs text-slate-500 dark:text-white/50 mt-2">
                        Rejected on {new Date(selectedBatchData.rejected_at).toLocaleString()}
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

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleSubmitDecision}
        isLoading={isSubmitting}
        variant={decision === 'approve' ? 'warning' : 'danger'}
        title={decision === 'approve' ? 'Approve Batch for Pickup?' : 'Reject Batch?'}
        description={
          decision === 'approve'
            ? `Approving this batch will initiate a pickup request for ${verifiedAssets.length} verified asset${verifiedAssets.length !== 1 ? 's' : ''}${calculateTotal() > 0 ? ` worth ₹${calculateTotal().toLocaleString('en-IN')}` : ''}.${nonVerifiedCount > 0 ? ` ${nonVerifiedCount} other asset${nonVerifiedCount !== 1 ? 's' : ''} still in progress will not be included.` : ''}`
            : 'This batch will be returned to the IT Admin with your feedback. They can modify and resubmit.'
        }
        confirmText={decision === 'approve' ? 'Approve & Initiate Pickup' : 'Reject Batch'}
        details={
          selectedBatchData && (
            <div className="text-left space-y-1">
              <p className="font-mono text-xs text-slate-500 dark:text-white/60">
                <span className="text-slate-400 dark:text-white/40">Batch:</span> {selectedBatchData.name}
              </p>
              <p className="font-mono text-xs text-slate-500 dark:text-white/60">
                <span className="text-slate-400 dark:text-white/40">Verified Assets:</span> {verifiedAssets.length} of {batchAssets.length}
              </p>
              {calculateTotal() > 0 && (
                <p className="font-mono text-xs text-slate-500 dark:text-white/60">
                  <span className="text-slate-400 dark:text-white/40">Value:</span> ₹{calculateTotal().toLocaleString('en-IN')}
                </p>
              )}
            </div>
          )
        }
      />
    </div>
  );
}

export default PickupApprovals;
