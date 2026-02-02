import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  Package,
  Laptop,
  Plus,
  Upload,
  XCircle,
  Send,
  Eye,
  AlertTriangle,
  Truck,
  X,
  Trash2,
  Loader2,
  Search,
  FileSpreadsheet
} from 'lucide-react';
import { useAuth, useBatches, useBatchesByITAdmin, useAssets, useAssetsByITAdmin, useSubmitBatchForApproval, useDeleteBatch, useUpdateBatch, useBranches, useBranchesByITAdmin, useCreatePickupRequest, useCreateAsset, useApiError } from '@/hooks';
import { assetsApi } from '@/lib/api/assets';
import { AssetForm } from '@/components/assets';
import type { CreateAssetInput } from '@/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import type { BatchStatus, AssetStatus, PickupPriority, PickupTimeSlot } from '@/types';
import { DeleteBatchModal, ConfirmationModal } from '@/components/ui';
import { getBatchStatusDisplay, getAssetStatusDisplay } from '@/lib/status-display';
import { BatchProgressBar } from '@/components/admin/BatchProgressBar';

export function BatchDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { batchId } = useParams<{ batchId: string }>();

  // V3: Use React Query hook for auth
  const { user, enterprise } = useAuth();
  const enterpriseId = enterprise?.id || '';
  const userId = user?.id || '';

  // Determine base path for navigation
  const isOrgAdmin = user?.role === 'org_admin' || location.pathname.startsWith('/org-admin');
  const basePath = isOrgAdmin ? '/org-admin' : '/admin';

  // V3.2: React Query hooks - use different hooks based on role
  const { data: orgBatches = [], isLoading: orgBatchesLoading } = useBatches(isOrgAdmin ? enterpriseId : '');
  const { data: itBatches = [], isLoading: itBatchesLoading } = useBatchesByITAdmin(isOrgAdmin ? '' : userId);
  const { data: orgAssets = [], isLoading: orgAssetsLoading } = useAssets(isOrgAdmin ? enterpriseId : '');
  const { data: itAssets = [], isLoading: itAssetsLoading } = useAssetsByITAdmin(isOrgAdmin ? '' : userId);
  const { data: orgBranches = [] } = useBranches(isOrgAdmin ? enterpriseId : '');
  const { data: itBranches = [] } = useBranchesByITAdmin(isOrgAdmin ? '' : userId);

  const batches = isOrgAdmin ? orgBatches : itBatches;
  const batchesLoading = isOrgAdmin ? orgBatchesLoading : itBatchesLoading;
  const assets = isOrgAdmin ? orgAssets : itAssets;
  const assetsLoading = isOrgAdmin ? orgAssetsLoading : itAssetsLoading;
  const branches = isOrgAdmin ? orgBranches : itBranches;

  // V3: Mutations
  const submitForApprovalMutation = useSubmitBatchForApproval();
  const deleteBatchMutation = useDeleteBatch();
  const updateBatchMutation = useUpdateBatch();
  const createPickupMutation = useCreatePickupRequest();
  const createAssetMutation = useCreateAsset();
  const { handleError, showSuccess } = useApiError();

  // Handler to return rejected batch to draft status
  const handleReturnToDraft = async () => {
    if (!batchId) return;
    setIsReturningToDraft(true);
    try {
      await updateBatchMutation.mutateAsync({
        batchId,
        updates: {
          status: 'draft',
        },
      });
      showSuccess('Batch Updated', 'Batch has been returned to draft status. You can now make changes and resubmit.');
      setShowReturnToDraftModal(false);
    } catch (error) {
      handleError(error, 'Returning batch to draft');
    } finally {
      setIsReturningToDraft(false);
    }
  };

  const isLoading = batchesLoading || assetsLoading;

  const [showPickupModal, setShowPickupModal] = useState(false);
  const [isCreatingPickup, setIsCreatingPickup] = useState(false);
  const [selectedPickupAssetIds, setSelectedPickupAssetIds] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [addAssetTab, setAddAssetTab] = useState<'existing' | 'new' | 'csv'>('existing');
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [isAddingAssets, setIsAddingAssets] = useState(false);
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [isCreatingAsset, setIsCreatingAsset] = useState(false);
  const [showReturnToDraftModal, setShowReturnToDraftModal] = useState(false);
  const [isReturningToDraft, setIsReturningToDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitForm, setSubmitForm] = useState<{
    preferredDate: string;
    preferredTimeSlot: string;
    notes: string;
  }>({
    preferredDate: '',
    preferredTimeSlot: 'morning',
    notes: '',
  });
  const [pickupForm, setPickupForm] = useState<{
    branchId: string;
    preferredDate: string;
    preferredTimeSlot: PickupTimeSlot;
    priority: PickupPriority;
    notes: string;
  }>({
    branchId: '',
    preferredDate: '',
    preferredTimeSlot: 'morning',
    priority: 'normal',
    notes: ''
  });

  const batch = batches.find(b => b.id === batchId);

  // Auto-open submit modal when navigated with ?action=submit from batch list
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'submit' && batch?.status === 'draft') {
      setShowSubmitModal(true);
    }
  }, [location.search, batch?.status]);

  // V3: Use snake_case field names
  const batchAssets = assets.filter(a => a.batch_id === batchId);

  // Available assets: not already in THIS batch, in the same branch, and in an eligible status
  const availableAssets = useMemo(() => {
    return assets.filter(a =>
      a.batch_id !== batchId &&
      (!batch?.branch_id || a.branch_id === batch.branch_id) &&
      ['pending_assignment', 'assigned', 'check_in_started', 'submitted', 'remote_review'].includes(a.status)
    );
  }, [assets, batch?.branch_id, batchId]);

  const queryClient = useQueryClient();

  // Handler to add existing assets to batch
  const handleAddExistingAssets = async () => {
    if (selectedAssetIds.length === 0) return;
    setIsAddingAssets(true);
    try {
      // Update each selected asset's batch_id
      await Promise.all(
        selectedAssetIds.map(assetId =>
          assetsApi.update(assetId, { batch_id: batchId })
        )
      );
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      showSuccess('Assets Added', `${selectedAssetIds.length} asset(s) added to batch`);
      setShowAddAssetModal(false);
      setSelectedAssetIds([]);
      setAssetSearchQuery('');
    } catch (error) {
      handleError(error, 'Adding assets to batch');
    } finally {
      setIsAddingAssets(false);
    }
  };

  // Handler to create a new asset inline and add it to the batch
  const handleCreateAssetInline = async (data: CreateAssetInput) => {
    setIsCreatingAsset(true);
    try {
      // Ensure batch_id and branch_id are set even if AssetForm didn't include them
      const assetData: CreateAssetInput = {
        ...data,
        batch_id: data.batch_id || batchId,
        branch_id: data.branch_id || batch?.branch_id,
        enterprise_id: data.enterprise_id || enterpriseId,
      };
      await createAssetMutation.mutateAsync(assetData);
      showSuccess('Asset Created', `Serial number: ${data.serial_number}`);
      setShowAddAssetModal(false);
    } catch (error) {
      handleError(error, 'Creating asset');
    } finally {
      setIsCreatingAsset(false);
    }
  };

  // Open unified add asset modal
  const openAddAssetModal = (tab: 'existing' | 'new' | 'csv' = 'existing') => {
    setAddAssetTab(tab);
    setSelectedAssetIds([]);
    setAssetSearchQuery('');
    setShowAddAssetModal(true);
  };

  // Filtered available assets for search
  const filteredAvailableAssets = useMemo(() => {
    if (!assetSearchQuery.trim()) return availableAssets;
    const q = assetSearchQuery.toLowerCase();
    return availableAssets.filter(a =>
      a.brand?.toLowerCase().includes(q) ||
      a.model?.toLowerCase().includes(q) ||
      a.serial_number?.toLowerCase().includes(q)
    );
  }, [availableAssets, assetSearchQuery]);

  // V3: Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-ecotribe-primary animate-spin mx-auto mb-4" />
          <p className="font-mono text-xs text-slate-500 dark:text-zinc-500 uppercase tracking-widest">
            Loading batch details...
          </p>
        </div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
        <div className="w-16 h-16 border border-slate-200 dark:border-white/10 flex items-center justify-center mb-4">
          <Package className="w-8 h-8 text-zinc-600" />
        </div>
        <p className="font-display font-bold text-slate-900 dark:text-white uppercase tracking-wide mb-1">Batch not found</p>
        <p className="font-mono text-xs text-zinc-600 mb-6">The batch you're looking for doesn't exist</p>
        <button
          onClick={() => navigate(`${basePath}/batches`)}
          className="interactive px-5 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Batches
        </button>
      </div>
    );
  }

  // V3: Use centralized batch status display with local style mapping
  const getStatusConfig = (status: BatchStatus) => {
    const display = getBatchStatusDisplay(status);
    const variantStyles: Record<string, { color: string; bgColor: string }> = {
      default: { color: 'text-zinc-400', bgColor: 'bg-zinc-500/10 border-zinc-500/20' },
      success: { color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/20' },
      warning: { color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/20' },
      error: { color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/20' },
      info: { color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20' },
    };
    const style = variantStyles[display.variant] || variantStyles.default;
    return { label: display.label, description: display.description || '', ...style };
  };

  // V3: Use centralized asset status display with local style mapping
  const getAssetStatusConfig = (status: AssetStatus) => {
    const display = getAssetStatusDisplay(status);
    const variantColors: Record<string, string> = {
      default: 'text-zinc-400',
      success: 'text-emerald-400',
      warning: 'text-amber-400',
      error: 'text-red-400',
      info: 'text-blue-400',
    };
    return { label: display.label, color: variantColors[display.variant] || variantColors.default };
  };

  const statusConfig = getStatusConfig(batch.status);

  // Use API-provided progress stats, falling back to a basic count
  const progress = batch.progress || { total: batchAssets.length, pending_assignment: 0, assigned: 0, in_review: 0, verified: 0, in_pickup: 0, picked_up: 0, completed: 0, rejected: 0 };

  // V3: Submit for Org Admin approval
  const handleSubmitForApproval = async () => {
    if (!submitForm.preferredDate) return;
    setIsSubmitting(true);
    try {
      await submitForApprovalMutation.mutateAsync({
        batchId: batch.id,
        pickupDetails: {
          preferred_pickup_date: submitForm.preferredDate,
          preferred_pickup_slot: submitForm.preferredTimeSlot,
          it_admin_notes: submitForm.notes || undefined,
        },
      });
      showSuccess('Batch Submitted', 'Batch has been submitted for Org Admin approval.');
      setShowSubmitModal(false);
      setSubmitForm({ preferredDate: '', preferredTimeSlot: 'morning', notes: '' });
    } catch (error) {
      handleError(error, 'Submitting batch for approval');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canAddAssets = batch.status === 'draft';

  // Verified assets: eligible for approval submission
  const verifiedAssets = batchAssets.filter(a =>
    a.status === 'conditionally_accepted' || a.status === 'ready_for_pickup'
  );

  // Pickupable assets: only those explicitly approved/ready for pickup (not just verified)
  const pickupableAssets = batchAssets.filter(a =>
    a.status === 'ready_for_pickup'
  );

  // Open pickup modal: auto-select all pickupable assets
  const openPickupModal = () => {
    setSelectedPickupAssetIds(new Set(pickupableAssets.map(a => a.id)));
    setShowPickupModal(true);
  };

  // Toggle individual asset selection in pickup modal
  const togglePickupAsset = (assetId: string) => {
    setSelectedPickupAssetIds(prev => {
      const next = new Set(prev);
      if (next.has(assetId)) next.delete(assetId);
      else next.add(assetId);
      return next;
    });
  };

  // Use mutation for pickup creation — batch_id is now required
  const handleInitiatePickup = async () => {
    if (selectedPickupAssetIds.size === 0 || !pickupForm.branchId || !pickupForm.preferredDate || !batchId) return;
    setIsCreatingPickup(true);
    try {
      await createPickupMutation.mutateAsync({
        enterprise_id: enterpriseId,
        batch_id: batchId,
        branch_id: pickupForm.branchId,
        asset_ids: Array.from(selectedPickupAssetIds),
        preferred_date: pickupForm.preferredDate,
        preferred_time_slot: pickupForm.preferredTimeSlot,
        priority: pickupForm.priority,
        notes: pickupForm.notes,
        created_by: user?.id || ''
      });
      showSuccess('Pickup Requested', `Pickup request created for ${selectedPickupAssetIds.size} asset${selectedPickupAssetIds.size > 1 ? 's' : ''}`);
      setShowPickupModal(false);
      setSelectedPickupAssetIds(new Set());
      setPickupForm({
        branchId: '',
        preferredDate: '',
        preferredTimeSlot: 'morning',
        priority: 'normal',
        notes: ''
      });
    } catch (error) {
      handleError(error, 'Creating pickup request');
    } finally {
      setIsCreatingPickup(false);
    }
  };

  // V3: Use mutation for batch deletion
  const handleDeleteBatch = async (deleteAssets: boolean, deleteSubUsers: boolean) => {
    setIsDeleting(true);
    try {
      await deleteBatchMutation.mutateAsync({ batchId: batch.id, deleteAssets, deleteSubUsers });
      showSuccess('Batch Deleted', 'Batch has been successfully deleted');
      // Navigate back to batch list after successful deletion
      navigate(`${basePath}/batches`);
    } catch (error) {
      handleError(error, 'Deleting batch');
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={() => navigate(`${basePath}/batches`)}
            className="interactive flex items-center gap-2 text-zinc-500 hover:text-ecotribe-primary transition-colors font-mono text-xs uppercase tracking-widest mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Batches
          </button>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="w-14 h-14 border border-ecotribe-primary/30 bg-ecotribe-primary/10 flex items-center justify-center">
                <Package className="w-7 h-7 text-ecotribe-primary" />
              </div>
              <div>
                <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-1">Batch</span>
                <h1 className="font-brand font-bold text-2xl md:text-3xl text-slate-900 dark:text-white uppercase tracking-tight">
                  {batch.name}
                </h1>
                {batch.description && (
                  <p className="font-display text-zinc-500 text-sm mt-1 uppercase tracking-wide">
                    {batch.description}
                  </p>
                )}
                <p className="font-mono text-[10px] text-zinc-600 mt-2 uppercase tracking-widest">
                  Created {format(new Date(batch.created_at), 'MMMM d, yyyy')}
                </p>
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              {batch.status === 'draft' && (
                <button
                  onClick={() => openAddAssetModal('existing')}
                  className="interactive px-5 py-2.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Asset
                </button>
              )}
              {batch.status === 'draft' && batchAssets.length > 0 && (
                <button
                  onClick={() => verifiedAssets.length > 0 && setShowSubmitModal(true)}
                  disabled={verifiedAssets.length === 0}
                  title={verifiedAssets.length === 0 ? 'No verified assets yet. Assets must be reviewed and accepted before submitting.' : `Submit ${verifiedAssets.length} verified asset(s) for approval`}
                  className={`interactive px-5 py-2.5 font-mono font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${
                    verifiedAssets.length > 0
                      ? 'bg-amber-500 text-black hover:bg-amber-400'
                      : 'bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-white/30 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  {verifiedAssets.length > 0
                    ? `Submit for Approval (${verifiedAssets.length})`
                    : 'Submit for Approval (0 verified)'}
                </button>
              )}
              {batch.status === 'approved' && pickupableAssets.length > 0 && (
                <button
                  onClick={openPickupModal}
                  className="interactive px-5 py-2.5 bg-green-500 text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-green-400 transition-all flex items-center gap-2"
                >
                  <Truck className="w-4 h-4" />
                  Initiate Pickup ({pickupableAssets.length})
                </button>
              )}
              <button
                onClick={() => setShowDeleteModal(true)}
                className="interactive px-5 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 font-mono font-bold text-xs uppercase tracking-widest hover:bg-red-500/20 hover:border-red-500/50 transition-all flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="border border-white/10 bg-slate-50 dark:bg-white/[0.02] p-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1.5 border font-mono font-bold text-xs uppercase tracking-widest ${statusConfig.bgColor} ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
            <p className="font-display text-sm text-zinc-500 uppercase tracking-wide">{statusConfig.description}</p>
          </div>
          {batch.requires_approval && batch.status === 'pending_approval' && (
            <span className="px-3 py-1.5 border border-amber-500/20 bg-amber-500/10 font-mono text-xs text-amber-400 uppercase tracking-wide flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" />
              Awaiting Org Admin Approval
            </span>
          )}
        </div>

        {/* V3: Rejection Reason with Action Buttons */}
        {batch.status === 'rejected' && (
          <div className="mt-4 p-4 border border-red-500/20 bg-red-500/5">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-mono font-bold text-xs text-red-400 uppercase tracking-widest mb-1">Batch Rejected</p>
                {batch.rejection_reason && (
                  <p className="font-display text-sm text-zinc-400 mb-4">{batch.rejection_reason}</p>
                )}
                <p className="font-mono text-xs text-zinc-500 mb-4">
                  You can return this batch to draft status to make changes and resubmit, or delete it.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowReturnToDraftModal(true)}
                    className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-400 font-mono text-xs uppercase tracking-widest hover:bg-blue-500/30 transition-colors flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Return to Draft
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-400 font-mono text-xs uppercase tracking-widest hover:bg-red-500/30 transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Batch
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Batch Progress */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="border border-slate-200 dark:border-white/10 bg-white/85 dark:bg-white/[0.02] p-5 shadow-sm"
      >
        <div className="flex items-center gap-3 mb-3">
          <Laptop className="w-4 h-4 text-slate-500 dark:text-zinc-500" />
          <h3 className="font-mono font-bold text-xs text-slate-600 dark:text-white/60 uppercase tracking-widest">
            Asset Progress — {progress.total} total
          </h3>
        </div>
        <BatchProgressBar progress={progress} />
      </motion.div>

      {/* Assets List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="border border-slate-200 dark:border-white/10 bg-white/85 dark:bg-white/[0.02] shadow-sm"
      >
        <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-white/70 dark:bg-transparent">
          <div className="flex items-center gap-3">
            <Laptop className="w-5 h-5 text-slate-600 dark:text-zinc-500" />
            <h2 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">Assets in Batch</h2>
          </div>
          <div className="flex items-center gap-3">
            {batchAssets.length > 0 && (
              <span className="font-mono text-xs text-slate-600 dark:text-zinc-500">
                {batchAssets.length} asset{batchAssets.length !== 1 ? 's' : ''}
              </span>
            )}
            {canAddAssets && (
              <button
                onClick={() => openAddAssetModal('existing')}
                className="px-3 py-2 bg-ecotribe-primary text-black font-mono text-[11px] uppercase tracking-widest border border-ecotribe-primary/40 hover:bg-white transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Asset
              </button>
            )}
          </div>
        </div>

        {batchAssets.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
                <thead className="bg-white/80 dark:bg-transparent">
                  <tr className="border-b border-slate-200 dark:border-white/10">
                    <th className="text-left py-3 px-5 font-mono font-bold text-[10px] text-slate-700 dark:text-zinc-500 uppercase tracking-widest">Device</th>
                    <th className="text-left py-3 px-5 font-mono font-bold text-[10px] text-slate-700 dark:text-zinc-500 uppercase tracking-widest">Serial</th>
                    <th className="text-left py-3 px-5 font-mono font-bold text-[10px] text-slate-700 dark:text-zinc-500 uppercase tracking-widest">Status</th>
                    <th className="text-left py-3 px-5 font-mono font-bold text-[10px] text-slate-700 dark:text-zinc-500 uppercase tracking-widest">Quote</th>
                    <th className="text-right py-3 px-5 font-mono font-bold text-[10px] text-slate-700 dark:text-zinc-500 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
              <tbody>
                {batchAssets.map((asset, index) => {
                  const assetStatusConfig = getAssetStatusConfig(asset.status);

                  return (
                    <motion.tr
                      key={asset.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.03 * Math.min(index, 10) }}
                      onClick={() => navigate(`${basePath}/assets/${asset.id}`)}
                      className="border-b border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.05] cursor-pointer transition-colors"
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 border border-white/10 bg-slate-50 dark:bg-white/[0.02] flex items-center justify-center">
                            <Laptop className="w-5 h-5 text-zinc-600" />
                          </div>
                          <div>
                            <p className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase">{asset.brand}</p>
                            <p className="font-mono text-xs text-zinc-600">{asset.model}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <span className="font-mono text-xs text-zinc-400">{asset.serial_number}</span>
                      </td>
                      <td className="py-4 px-5">
                        <span className={`font-mono font-bold text-xs uppercase tracking-wide ${assetStatusConfig.color}`}>
                          {assetStatusConfig.label}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        {asset.final_quote?.amount ? (
                          <span className="font-mono font-bold text-sm text-ecotribe-primary">
                            ₹{asset.final_quote.amount.toLocaleString()}
                          </span>
                        ) : asset.remote_quote?.amount ? (
                          <span className="font-mono text-sm text-zinc-400">
                            ₹{asset.remote_quote.amount.toLocaleString()}
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-zinc-700">—</span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`${basePath}/assets/${asset.id}`);
                          }}
                          className="interactive p-2 hover:bg-white/5 transition-colors"
                        >
                          <Eye className="w-4 h-4 text-zinc-600 hover:text-ecotribe-primary transition-colors" />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center">
            <div className="w-16 h-16 border border-slate-200 dark:border-white/10 flex items-center justify-center mx-auto mb-4">
              <Laptop className="w-8 h-8 text-zinc-600" />
            </div>
            <p className="font-display font-bold text-slate-900 dark:text-white uppercase tracking-wide mb-1">No assets yet</p>
            <p className="font-mono text-xs text-zinc-600 mb-6">
              Add assets to this batch to get started
            </p>
            <button
              onClick={() => openAddAssetModal('existing')}
              className="interactive px-5 py-2.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Asset
            </button>
          </div>
        )}
      </motion.div>

      {/* Batch Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="border border-white/10 bg-slate-50 dark:bg-white/[0.02] p-5"
      >
        <div className="flex flex-wrap gap-8 font-mono text-xs">
          <div>
            <span className="text-zinc-600 uppercase tracking-widest">Batch ID</span>
            <span className="ml-3 text-zinc-400">{batch.id}</span>
          </div>
          <div>
            <span className="text-zinc-600 uppercase tracking-widest">Created</span>
            <span className="ml-3 text-zinc-400">
              {format(new Date(batch.created_at), 'MMM d, yyyy h:mm a')}
            </span>
          </div>
          {batch.updated_at && (
            <div>
              <span className="text-zinc-600 uppercase tracking-widest">Updated</span>
              <span className="ml-3 text-zinc-400">
                {formatDistanceToNow(new Date(batch.updated_at), { addSuffix: true })}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Pickup Modal with Asset Selection */}
      {showPickupModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white/95 dark:bg-black/95 backdrop-blur-xl border border-slate-200 dark:border-white/20 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide">
                    Initiate Batch Pickup
                  </h3>
                  <p className="font-mono text-xs text-slate-500 dark:text-white/50 mt-1">
                    {selectedPickupAssetIds.size} of {pickupableAssets.length} verified asset{pickupableAssets.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPickupModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500 dark:text-white/50" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Asset Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest">
                    Assets for Pickup
                  </label>
                  <button
                    onClick={() => {
                      if (selectedPickupAssetIds.size === pickupableAssets.length) {
                        setSelectedPickupAssetIds(new Set());
                      } else {
                        setSelectedPickupAssetIds(new Set(pickupableAssets.map(a => a.id)));
                      }
                    }}
                    className="font-mono text-[10px] text-ecotribe-primary uppercase tracking-widest hover:underline"
                  >
                    {selectedPickupAssetIds.size === pickupableAssets.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/5">
                  {pickupableAssets.map(asset => (
                    <label
                      key={asset.id}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                        selectedPickupAssetIds.has(asset.id)
                          ? 'bg-green-500/5'
                          : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPickupAssetIds.has(asset.id)}
                        onChange={() => togglePickupAsset(asset.id)}
                        className="w-4 h-4 text-green-500"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="font-display text-xs text-slate-900 dark:text-white uppercase">
                          {asset.brand} {asset.model}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500 dark:text-zinc-500 ml-2">
                          S/N: {asset.serial_number}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-emerald-400 uppercase">
                        {getAssetStatusConfig(asset.status).label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Branch Selection (pickup location auto-created from branch) */}
              <div>
                <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2 block">
                  Branch <span className="text-red-400">*</span>
                </label>
                {branches.length > 0 ? (
                  <select
                    value={pickupForm.branchId}
                    onChange={(e) => setPickupForm(prev => ({ ...prev, branchId: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 appearance-none select-themed cursor-pointer"
                  >
                    <option value="">Select branch...</option>
                    {branches.map((branch: { id: string; branch_name: string; branch_code: string; city: string }) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.branch_name} ({branch.branch_code}) — {branch.city}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-4 border border-amber-500/20 bg-amber-500/5">
                    <p className="font-mono text-xs text-amber-400">
                      No branches assigned. Contact your Org Admin.
                    </p>
                  </div>
                )}
              </div>

              {/* Preferred Date */}
              <div>
                <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2 block">
                  Preferred Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={pickupForm.preferredDate}
                  onChange={(e) => setPickupForm(prev => ({ ...prev, preferredDate: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50"
                />
              </div>

              {/* Time Slot */}
              <div>
                <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2 block">
                  Preferred Time Slot
                </label>
                <select
                  value={pickupForm.preferredTimeSlot}
                  onChange={(e) => setPickupForm(prev => ({ ...prev, preferredTimeSlot: e.target.value as PickupTimeSlot }))}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 appearance-none select-themed cursor-pointer"
                >
                  <option value="morning">Morning (9 AM - 12 PM)</option>
                  <option value="afternoon">Afternoon (12 PM - 3 PM)</option>
                  <option value="evening">Evening (3 PM - 6 PM)</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2 block">
                  Priority
                </label>
                <select
                  value={pickupForm.priority}
                  onChange={(e) => setPickupForm(prev => ({ ...prev, priority: e.target.value as PickupPriority }))}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 appearance-none select-themed cursor-pointer"
                >
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Special Instructions */}
              <div>
                <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2 block">
                  Special Instructions
                </label>
                <textarea
                  value={pickupForm.notes}
                  onChange={(e) => setPickupForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any special instructions for the pickup..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 placeholder:text-slate-400 dark:placeholder:text-white/30 resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-white/10 flex gap-3 justify-end">
              <button
                onClick={() => setShowPickupModal(false)}
                className="px-5 py-2.5 bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleInitiatePickup}
                disabled={selectedPickupAssetIds.size === 0 || !pickupForm.branchId || !pickupForm.preferredDate || isCreatingPickup}
                className="px-5 py-2.5 bg-green-500 text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-green-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCreatingPickup ? 'Creating...' : `Pickup ${selectedPickupAssetIds.size} Asset${selectedPickupAssetIds.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Batch Modal */}
      <DeleteBatchModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteBatch}
        batchName={batch.name}
        assetCount={batchAssets.length}
        isDeleting={isDeleting}
      />

      {/* Submit for Approval Modal with Pickup Details */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white/95 dark:bg-black/95 backdrop-blur-xl border border-slate-200 dark:border-white/20 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                  <Send className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide">
                    Submit for Approval
                  </h3>
                  <p className="font-mono text-xs text-slate-500 dark:text-white/50 mt-1">
                    {verifiedAssets.length} verified asset{verifiedAssets.length !== 1 ? 's' : ''} in {batch.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500 dark:text-white/50" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 border border-amber-500/20 bg-amber-500/5">
                <p className="font-mono text-xs text-amber-400">
                  Only the {verifiedAssets.length} verified asset{verifiedAssets.length !== 1 ? 's' : ''} will be sent for Org Admin approval.
                  {batchAssets.length - verifiedAssets.length > 0 && (
                    <> The remaining {batchAssets.length - verifiedAssets.length} asset{batchAssets.length - verifiedAssets.length !== 1 ? 's' : ''} are still in progress and will not be included.</>
                  )}
                </p>
              </div>

              {/* Verified Assets Preview */}
              <div>
                <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2 block">
                  Assets for Approval ({verifiedAssets.length})
                </label>
                <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/5">
                  {verifiedAssets.map(asset => (
                    <div key={asset.id} className="flex items-center gap-3 px-4 py-2.5">
                      <Laptop className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-display text-xs text-slate-900 dark:text-white uppercase">
                          {asset.brand} {asset.model}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500 dark:text-zinc-500 ml-2">
                          S/N: {asset.serial_number}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-emerald-400 uppercase">
                        {getAssetStatusConfig(asset.status).label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preferred Pickup Date */}
              <div>
                <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2 block">
                  Preferred Pickup Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={submitForm.preferredDate}
                  onChange={(e) => setSubmitForm(prev => ({ ...prev, preferredDate: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50"
                />
              </div>

              {/* Time Slot */}
              <div>
                <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2 block">
                  Preferred Time Slot
                </label>
                <select
                  value={submitForm.preferredTimeSlot}
                  onChange={(e) => setSubmitForm(prev => ({ ...prev, preferredTimeSlot: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 appearance-none select-themed cursor-pointer"
                >
                  <option value="morning">Morning (9 AM - 12 PM)</option>
                  <option value="afternoon">Afternoon (12 PM - 3 PM)</option>
                  <option value="evening">Evening (3 PM - 6 PM)</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2 block">
                  Notes for Org Admin
                </label>
                <textarea
                  value={submitForm.notes}
                  onChange={(e) => setSubmitForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any notes for the Org Admin..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 placeholder:text-slate-400 dark:placeholder:text-white/30 resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-white/10 flex gap-3 justify-end">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-5 py-2.5 bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitForApproval}
                disabled={!submitForm.preferredDate || isSubmitting}
                className="px-5 py-2.5 bg-amber-500 text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Return to Draft Confirmation Modal */}
      <ConfirmationModal
        isOpen={showReturnToDraftModal}
        onClose={() => setShowReturnToDraftModal(false)}
        onConfirm={handleReturnToDraft}
        title="Return Batch to Draft?"
        description="This will reset the batch status to draft, allowing you to make changes and resubmit for approval. The assets in this batch will remain associated with it."
        confirmText="Return to Draft"
        variant="info"
        isLoading={isReturningToDraft}
      />

      {/* Unified Add Asset Modal */}
      {showAddAssetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddAssetModal(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase tracking-tight">Add Assets to Batch</h2>
                <p className="font-mono text-xs text-slate-500 dark:text-zinc-500">{batch.name}</p>
              </div>
              <button
                onClick={() => setShowAddAssetModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500 dark:text-zinc-500" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-white/10 flex-shrink-0">
              <button
                onClick={() => setAddAssetTab('existing')}
                className={`flex items-center gap-2 px-5 py-3 font-mono text-xs uppercase tracking-widest transition-colors border-b-2 ${
                  addAssetTab === 'existing'
                    ? 'border-ecotribe-primary text-ecotribe-primary'
                    : 'border-transparent text-slate-500 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-white'
                }`}
              >
                <Laptop className="w-4 h-4" />
                Select Existing
                {availableAssets.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-slate-100 dark:bg-white/10 rounded-full">
                    {availableAssets.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setAddAssetTab('new')}
                className={`flex items-center gap-2 px-5 py-3 font-mono text-xs uppercase tracking-widest transition-colors border-b-2 ${
                  addAssetTab === 'new'
                    ? 'border-ecotribe-primary text-ecotribe-primary'
                    : 'border-transparent text-slate-500 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-white'
                }`}
              >
                <Plus className="w-4 h-4" />
                Add New
              </button>
              <button
                onClick={() => setAddAssetTab('csv')}
                className={`flex items-center gap-2 px-5 py-3 font-mono text-xs uppercase tracking-widest transition-colors border-b-2 ${
                  addAssetTab === 'csv'
                    ? 'border-ecotribe-primary text-ecotribe-primary'
                    : 'border-transparent text-slate-500 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                Upload CSV
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
              {/* === Select Existing Tab === */}
              {addAssetTab === 'existing' && (
                <div className="flex flex-col h-full">
                  {/* Search */}
                  <div className="p-4 border-b border-slate-200 dark:border-white/10 flex-shrink-0">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Search by serial number, brand, or model..."
                        value={assetSearchQuery}
                        onChange={(e) => setAssetSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                      />
                    </div>
                  </div>

                  {/* Asset List */}
                  <div className="flex-1 overflow-y-auto p-4">
                    {availableAssets.length === 0 ? (
                      <div className="text-center py-12">
                        <Laptop className="w-12 h-12 text-slate-300 dark:text-zinc-600 mx-auto mb-3" />
                        <p className="font-display font-bold text-sm text-slate-500 dark:text-zinc-500 uppercase tracking-wide mb-1">No unassigned assets</p>
                        <p className="font-mono text-xs text-slate-400 dark:text-zinc-600">
                          Create new assets or upload a CSV to get started
                        </p>
                        <button
                          onClick={() => setAddAssetTab('new')}
                          className="mt-4 px-4 py-2 bg-ecotribe-primary text-black font-mono text-xs uppercase tracking-widest hover:bg-white transition-colors flex items-center gap-2 mx-auto"
                        >
                          <Plus className="w-4 h-4" />
                          Create New Asset
                        </button>
                      </div>
                    ) : filteredAvailableAssets.length === 0 ? (
                      <div className="text-center py-12">
                        <Search className="w-10 h-10 text-slate-300 dark:text-zinc-600 mx-auto mb-3" />
                        <p className="font-display text-sm text-slate-500 dark:text-zinc-500">No assets match "{assetSearchQuery}"</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Select All */}
                        <label className="flex items-center gap-3 p-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedAssetIds.length === filteredAvailableAssets.length && filteredAvailableAssets.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAssetIds(filteredAvailableAssets.map(a => a.id));
                              } else {
                                setSelectedAssetIds([]);
                              }
                            }}
                            className="w-4 h-4 text-ecotribe-primary"
                          />
                          <span className="font-mono text-xs text-slate-600 dark:text-zinc-400 uppercase tracking-widest">
                            Select All ({filteredAvailableAssets.length})
                          </span>
                        </label>

                        {filteredAvailableAssets.map(asset => (
                          <label
                            key={asset.id}
                            className={`flex items-center gap-4 p-4 border cursor-pointer transition-colors ${
                              selectedAssetIds.includes(asset.id)
                                ? 'border-ecotribe-primary bg-ecotribe-primary/10'
                                : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedAssetIds.includes(asset.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAssetIds(prev => [...prev, asset.id]);
                                } else {
                                  setSelectedAssetIds(prev => prev.filter(id => id !== asset.id));
                                }
                              }}
                              className="w-5 h-5 text-ecotribe-primary"
                            />
                            <div className="w-10 h-10 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] flex items-center justify-center">
                              <Laptop className="w-5 h-5 text-slate-500 dark:text-zinc-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-display font-bold text-sm text-slate-900 dark:text-white">{asset.brand} {asset.model}</p>
                              <p className="font-mono text-xs text-slate-500 dark:text-zinc-500">S/N: {asset.serial_number}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  {availableAssets.length > 0 && (
                    <div className="p-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between flex-shrink-0 bg-slate-50 dark:bg-white/[0.02]">
                      <p className="font-mono text-xs text-slate-500 dark:text-zinc-500">
                        {selectedAssetIds.length} asset{selectedAssetIds.length !== 1 ? 's' : ''} selected
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowAddAssetModal(false)}
                          className="px-4 py-2 text-slate-500 dark:text-zinc-500 font-mono text-xs uppercase tracking-widest hover:text-slate-700 dark:hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAddExistingAssets}
                          disabled={selectedAssetIds.length === 0 || isAddingAssets}
                          className="px-4 py-2 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {isAddingAssets ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                          Add to Batch
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* === Add New Tab === */}
              {addAssetTab === 'new' && (
                <div className="p-5">
                  <AssetForm
                    enterpriseId={enterpriseId}
                    batchId={batchId}
                    branchId={batch.branch_id}
                    itAdminId={userId}
                    userId={userId}
                    onSubmit={handleCreateAssetInline}
                    onCancel={() => setShowAddAssetModal(false)}
                    isLoading={isCreatingAsset}
                    showSelfAssign={false}
                  />
                </div>
              )}

              {/* === Upload CSV Tab === */}
              {addAssetTab === 'csv' && (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-slate-400 dark:text-zinc-500" />
                  </div>
                  <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide mb-2">
                    Bulk Upload via CSV
                  </h3>
                  <p className="font-mono text-xs text-slate-500 dark:text-zinc-500 mb-6 max-w-sm mx-auto">
                    Upload a CSV file with multiple assets at once. Supports drag & drop, column mapping, and preview before import.
                  </p>
                  <button
                    onClick={() => {
                      setShowAddAssetModal(false);
                      navigate(`${basePath}/assets/upload?batchId=${batch.id}`);
                    }}
                    className="px-5 py-2.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center gap-2 mx-auto"
                  >
                    <Upload className="w-4 h-4" />
                    Go to CSV Upload
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default BatchDetail;
