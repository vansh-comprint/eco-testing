import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Laptop,
  Plus,
  Upload,
  Search,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  Package,
  UserPlus,
  User,
  X,
  Check,
  Trash2,
  TrendingUp,
  Truck,
  MapPin,
  Calendar,
  Loader2
} from 'lucide-react';
import { Badge, Dropdown, useToast } from '@/components/ui';
import { useAuth, useAssets, useAssetsByITAdmin, useBatches, useBatchesByITAdmin, useSubUsers, useAssignAssetToSubUser, useUpdateAsset, useDeleteAsset, useBranches, useBranchesByITAdmin, useCreatePickupRequest, usePickupRequests, usePickupsByITAdmin } from '@/hooks';
import type { PickupTimeSlot, PickupPriority } from '@/types';
import { pickupTimeSlotLabels } from '@/types/pickup';
import { formatDistanceToNow } from 'date-fns';
import type { AssetStatus } from '@/types';
import { ASSET_STATUS_FILTER_OPTIONS, ASSET_STATUS_GROUPS, getAssetStatusDisplay } from '@/lib/status-display';

// Use centralized status options
const STATUS_OPTIONS = ASSET_STATUS_FILTER_OPTIONS;

// Use centralized status groups
const STATUS_GROUPS = ASSET_STATUS_GROUPS;

const SORT_OPTIONS = [
  { label: 'Newest First', value: 'newest' },
  { label: 'Oldest First', value: 'oldest' },
  { label: 'Serial Number', value: 'serial' },
  { label: 'Brand', value: 'brand' },
];

export function AssetList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // V3: Use React Query hook for auth
  const { enterprise, user } = useAuth();
  const enterpriseId = enterprise?.id || '';
  const userId = user?.id || '';
  const { addToast } = useToast();

  // Determine base path for navigation
  const isOrgAdmin = user?.role === 'org_admin' || location.pathname.startsWith('/org-admin');
  const basePath = isOrgAdmin ? '/org-admin' : '/admin';

  // V3.2: React Query hooks - use different hooks based on role
  // Only enable the appropriate queries to avoid unnecessary requests
  const { data: orgAssets = [], isLoading: orgAssetsLoading } = useAssets(isOrgAdmin ? enterpriseId : '');
  const { data: itAssets = [], isLoading: itAssetsLoading } = useAssetsByITAdmin(isOrgAdmin ? '' : userId);
  const { data: orgBatches = [], isLoading: orgBatchesLoading } = useBatches(isOrgAdmin ? enterpriseId : '');
  const { data: itBatches = [], isLoading: itBatchesLoading } = useBatchesByITAdmin(isOrgAdmin ? '' : userId);
  const { data: subUsers = [] } = useSubUsers(enterpriseId); // Sub-users remain enterprise-wide
  const { data: orgBranches = [] } = useBranches(isOrgAdmin ? enterpriseId : '');
  const { data: itBranches = [] } = useBranchesByITAdmin(isOrgAdmin ? '' : userId);
  const { data: orgPickups = [] } = usePickupRequests(isOrgAdmin ? enterpriseId : '');
  const { data: itPickups = [] } = usePickupsByITAdmin(isOrgAdmin ? '' : userId);

  const assets = isOrgAdmin ? orgAssets : itAssets;
  const assetsLoading = isOrgAdmin ? orgAssetsLoading : itAssetsLoading;
  const batches = isOrgAdmin ? orgBatches : itBatches;
  const batchesLoading = isOrgAdmin ? orgBatchesLoading : itBatchesLoading;
  const branches = isOrgAdmin ? orgBranches : itBranches;
  const pickupRequests = isOrgAdmin ? orgPickups : itPickups;

  // V3.2: Get asset IDs that are already in active/pending pickup requests
  // This is a backup check in case asset status wasn't updated properly
  const assetsInActivePickups = useMemo(() => {
    const activeStatuses = ['pending_assignment', 'assigned', 'scheduled', 'in_progress'];
    const assetIds = new Set<string>();
    pickupRequests
      .filter(pr => activeStatuses.includes(pr.status))
      .forEach(pr => {
        (pr.asset_ids || []).forEach((id: string) => assetIds.add(id));
      });
    return assetIds;
  }, [pickupRequests]);

  // Mutations
  const assignAssetMutation = useAssignAssetToSubUser();
  const updateAssetMutation = useUpdateAsset();
  const deleteAssetMutation = useDeleteAsset();
  const createPickupMutation = useCreatePickupRequest();

  const isLoading = assetsLoading || batchesLoading;

  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [batchFilter, setBatchFilter] = useState(searchParams.get('batch') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');

  // Selection state for bulk actions
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [selectedSubUserId, setSelectedSubUserId] = useState('');
  const [assignMode, setAssignMode] = useState<'self' | 'select'>('self'); // V3.2: Self-assign or sub-user
  const [isAssigning, setIsAssigning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Pickup modal state
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [isCreatingPickup, setIsCreatingPickup] = useState(false);
  const [pickupForm, setPickupForm] = useState({
    branchId: '',  // V3.2: Use branch instead of location
    preferredDate: '',
    preferredTimeSlot: 'morning' as PickupTimeSlot,
    priority: 'normal' as PickupPriority,
    notes: ''
  });

  // V3: Data is already filtered by enterpriseId from the hooks
  const enterpriseSubUsers = subUsers;
  const enterpriseAssets = assets;
  const enterpriseBatches = batches;

  const batchOptions = [
    { label: 'All Batches', value: '' },
    ...enterpriseBatches.map(b => ({ label: b.name, value: b.id })),
  ];

  const filteredAssets = useMemo(() => {
    let result = [...enterpriseAssets];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        a =>
          a.serial_number?.toLowerCase().includes(query) ||
          a.brand?.toLowerCase().includes(query) ||
          a.model?.toLowerCase().includes(query)
      );
    }

    if (statusFilter) {
      // Check if it's a status group filter
      const statusGroup = STATUS_GROUPS[statusFilter];
      if (statusGroup) {
        result = result.filter(a => statusGroup.includes(a.status));
      } else {
        result = result.filter(a => a.status === statusFilter);
      }
    }

    if (batchFilter) {
      result = result.filter(a => a.batch_id === batchFilter);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        case 'serial':
          return (a.serial_number || '').localeCompare(b.serial_number || '');
        case 'brand':
          return (a.brand || '').localeCompare(b.brand || '');
        case 'newest':
        default:
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
    });

    return result;
  }, [enterpriseAssets, searchQuery, statusFilter, batchFilter, sortBy]);

  const stats = {
    total: enterpriseAssets.length,
    pending: enterpriseAssets.filter(a => a.status === 'pending_assignment').length,
    // V3.2: Ready for pickup includes both ready_for_pickup and conditionally_accepted
    readyForPickup: enterpriseAssets.filter(a =>
      a.status === 'ready_for_pickup' || a.status === 'conditionally_accepted'
    ).length,
    // V3.2: Processing excludes conditionally_accepted (those are ready for pickup)
    inProgress: enterpriseAssets.filter(a =>
      ['assigned', 'check_in_started', 'submitted', 'remote_review', 'pickup_requested', 'pickup_scheduled', 'picked_up', 'in_transit', 'facility_qc'].includes(a.status)
    ).length,
    completed: enterpriseAssets.filter(a => a.status === 'completed').length,
    rejected: enterpriseAssets.filter(a => ['remote_rejected', 'final_rejected'].includes(a.status)).length,
  };

  // Get only pending assets that can be assigned
  const assignableAssets = filteredAssets.filter(a => a.status === 'pending_assignment');
  const selectedAssignable = Array.from(selectedAssets).filter(id =>
    assignableAssets.some(a => a.id === id)
  );

  // V3.2: Statuses that indicate asset is already in pickup flow - should not be re-selected
  const PICKUP_FLOW_STATUSES = ['pickup_requested', 'pickup_scheduled', 'picked_up', 'in_transit'];

  // Get assets ready for pickup (conditionally_accepted can also be picked up)
  // V3.2: Explicitly exclude assets already in pickup flow AND check against pickup_requests table as backup
  const pickupableAssets = filteredAssets.filter(a =>
    (a.status === 'ready_for_pickup' || a.status === 'conditionally_accepted') &&
    !PICKUP_FLOW_STATUSES.includes(a.status) &&
    !assetsInActivePickups.has(a.id) // Backup check against pickup_requests table
  );
  const selectedPickupable = Array.from(selectedAssets).filter(id =>
    pickupableAssets.some(a => a.id === id)
  );

  // Combined selectable assets (for bulk selection)
  const selectableAssets = filteredAssets.filter(a =>
    a.status === 'pending_assignment' || a.status === 'ready_for_pickup' || a.status === 'conditionally_accepted'
  );

  // Selection handlers
  const toggleAssetSelection = (assetId: string) => {
    setSelectedAssets(prev => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedAssets.size === selectableAssets.length && selectableAssets.length > 0) {
      setSelectedAssets(new Set());
    } else {
      setSelectedAssets(new Set(selectableAssets.map(a => a.id)));
    }
  };

  const clearSelection = () => {
    setSelectedAssets(new Set());
  };

  // V3.2: Bulk assign handler using mutation - supports self-assign and sub-user assignment
  const handleBulkAssign = async () => {
    if (selectedAssignable.length === 0) return;

    // For sub-user mode, require a selected sub-user
    if (assignMode === 'select' && !selectedSubUserId) return;

    setIsAssigning(true);
    try {
      if (assignMode === 'self') {
        // Self-assign: Update each asset with assigned_user_id
        for (const assetId of selectedAssignable) {
          await updateAssetMutation.mutateAsync({
            assetId,
            updates: {
              assigned_user_id: userId,
              is_self_assigned: true,
              status: 'assigned',
              assigned_at: new Date().toISOString(),
            },
          });
        }
        addToast({
          type: 'success',
          title: 'Assets Self-Assigned',
          message: `Successfully assigned ${selectedAssignable.length} asset(s) to yourself.`,
        });
      } else {
        // Sub-user assignment
        for (const assetId of selectedAssignable) {
          await assignAssetMutation.mutateAsync({ assetId, subUserId: selectedSubUserId });
        }
        addToast({
          type: 'success',
          title: 'Assets Assigned',
          message: `Successfully assigned ${selectedAssignable.length} asset(s) to user.`,
        });
      }
      setShowBulkAssignModal(false);
      setSelectedSubUserId('');
      setAssignMode('self');
      setSelectedAssets(new Set());
    } catch (error) {
      console.error('Failed to bulk assign assets:', error);
      addToast({
        type: 'error',
        title: 'Assignment Failed',
        message: 'Could not assign assets. Please try again.',
      });
    } finally {
      setIsAssigning(false);
    }
  };

  // V3: Bulk delete handler using mutation
  const handleBulkDelete = async () => {
    if (selectedAssets.size === 0) return;
    setIsDeleting(true);
    try {
      for (const assetId of selectedAssets) {
        await deleteAssetMutation.mutateAsync(assetId);
      }
      addToast({
        type: 'success',
        title: 'Assets Deleted',
        message: `Successfully deleted ${selectedAssets.size} asset(s).`,
      });
      setShowBulkDeleteModal(false);
      setSelectedAssets(new Set());
    } catch (error) {
      console.error('Failed to delete assets:', error);
      addToast({
        type: 'error',
        title: 'Deletion Failed',
        message: 'Could not delete assets. Please try again.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // V3.2: Initiate pickup handler using mutation - uses branch instead of location
  const handleInitiatePickup = async () => {
    if (selectedPickupable.length === 0 || !pickupForm.branchId || !pickupForm.preferredDate) return;
    setIsCreatingPickup(true);
    try {
      await createPickupMutation.mutateAsync({
        enterprise_id: enterpriseId,
        branch_id: pickupForm.branchId,  // V3.2: Use branch_id instead of location_id
        asset_ids: selectedPickupable,
        preferred_date: pickupForm.preferredDate,
        preferred_time_slot: pickupForm.preferredTimeSlot,
        priority: pickupForm.priority,
        notes: pickupForm.notes,
        created_by: user?.id || ''
      });
      addToast({
        type: 'success',
        title: 'Pickup Request Created',
        message: `Pickup request created for ${selectedPickupable.length} asset(s).`,
      });
      setShowPickupModal(false);
      setPickupForm({
        branchId: '',
        preferredDate: '',
        preferredTimeSlot: 'morning',
        priority: 'normal',
        notes: ''
      });
      setSelectedAssets(new Set());
    } catch (error) {
      console.error('Failed to create pickup request:', error);
      addToast({
        type: 'error',
        title: 'Pickup Request Failed',
        message: 'Could not create pickup request. Please try again.',
      });
    } finally {
      setIsCreatingPickup(false);
    }
  };

  // Handle stat click to filter
  const handleStatClick = (filterValue: string) => {
    setStatusFilter(filterValue);
  };

  // V3: Use centralized status display helper
  const getStatusConfig = (status: AssetStatus) => getAssetStatusDisplay(status);

  // V3: Show loading state while data is being fetched
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-ecotribe-primary animate-spin mx-auto mb-4" />
          <p className="font-mono text-xs text-slate-500 dark:text-zinc-500 uppercase tracking-widest">
            Loading assets...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 border-b border-slate-200 dark:border-white/10 pb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-2">Inventory</span>
          <h1 className="font-brand font-bold text-3xl md:text-4xl text-slate-900 dark:text-white uppercase tracking-tight">
            Assets
          </h1>
          <p className="font-display text-slate-500 dark:text-white/50 text-sm mt-2 uppercase tracking-wide">Manage your device inventory</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-3"
        >
          <button
            onClick={() => navigate(`${basePath}/assets/upload`)}
            className="interactive px-5 py-2.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white/5 transition-all flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload CSV
          </button>
          <button
            onClick={() => navigate(`${basePath}/assets/new`)}
            className="interactive px-5 py-2.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Asset
          </button>
        </motion.div>
      </div>

      {/* Stats Row - Protocol Style */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-6 border-l border-t border-slate-200 dark:border-white/10 bg-white/80 dark:bg-black/20 shadow-sm"
      >
        <StatBox label="Total" value={stats.total} icon={<Laptop className="w-4 h-4" />} onClick={() => handleStatClick('')} active={statusFilter === ''} />
        <StatBox label="Unassigned" value={stats.pending} icon={<Clock className="w-4 h-4" />} highlight={stats.pending > 0} onClick={() => handleStatClick('pending_assignment')} active={statusFilter === 'pending_assignment'} />
        <StatBox label="Ready" value={stats.readyForPickup} icon={<Truck className="w-4 h-4" />} highlight={stats.readyForPickup > 0} onClick={() => handleStatClick('ready_for_pickup')} active={statusFilter === 'ready_for_pickup'} />
        <StatBox label="Processing" value={stats.inProgress} icon={<TrendingUp className="w-4 h-4" />} onClick={() => handleStatClick('in_progress')} active={statusFilter === 'in_progress'} />
        <StatBox label="Completed" value={stats.completed} icon={<CheckCircle className="w-4 h-4" />} onClick={() => handleStatClick('completed')} active={statusFilter === 'completed'} />
        <StatBox label="Rejected" value={stats.rejected} icon={<XCircle className="w-4 h-4" />} error={stats.rejected > 0} onClick={() => handleStatClick('rejected')} active={statusFilter === 'rejected'} />
      </motion.div>

      {/* Search & Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 p-4 shadow-sm shadow-slate-900/[0.03] dark:shadow-none"
      >
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-white/50" />
              <input
                type="text"
                placeholder="Search by serial, brand, or model..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 font-mono focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-40">
              <Dropdown
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="Status"
              />
            </div>
            <div className="w-40">
              <Dropdown
                options={batchOptions}
                value={batchFilter}
                onChange={setBatchFilter}
                placeholder="Batch"
              />
            </div>
            <div className="w-36">
              <Dropdown
                options={SORT_OPTIONS}
                value={sortBy}
                onChange={setSortBy}
                placeholder="Sort"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedAssets.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-40 bg-white/95 dark:bg-black/95 backdrop-blur-xl border border-ecotribe-primary/30 shadow-xl px-6 py-4 flex items-center gap-6"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-ecotribe-primary/20 border border-ecotribe-primary/30 flex items-center justify-center">
                <Check className="w-4 h-4 text-ecotribe-primary" />
              </div>
              <span className="font-mono font-bold text-sm text-black dark:text-white">
                {selectedAssets.size} asset{selectedAssets.size !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="h-6 w-px bg-black/10 dark:bg-white/10" />
            <div className="flex items-center gap-3">
              {selectedAssignable.length > 0 && (
                <button
                  onClick={() => setShowBulkAssignModal(true)}
                  className="interactive px-4 py-2 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white dark:hover:bg-white transition-all flex items-center gap-2 btn-chamfer"
                >
                  <UserPlus className="w-4 h-4" />
                  Assign ({selectedAssignable.length})
                </button>
              )}
              {selectedPickupable.length > 0 && (
                <button
                  onClick={() => setShowPickupModal(true)}
                  className="interactive px-4 py-2 bg-green-500 text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-green-400 transition-all flex items-center gap-2 btn-chamfer"
                >
                  <Truck className="w-4 h-4" />
                  Initiate Pickup ({selectedPickupable.length})
                </button>
              )}
              <button
                onClick={() => setShowBulkDeleteModal(true)}
                className="interactive px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 font-mono font-bold text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              <button
                onClick={clearSelection}
                className="interactive p-2 border border-slate-200 dark:border-white/10 hover:border-red-500/30 hover:bg-red-500/10 transition-all"
              >
                <X className="w-4 h-4 text-slate-500 dark:text-zinc-500 hover:text-red-400" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Asset List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 shadow-sm shadow-slate-900/[0.03] dark:shadow-none"
      >
        {filteredAssets.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50">
                  <th className="py-4 px-4 w-12">
                    {selectableAssets.length > 0 && (
                      <button
                        onClick={toggleSelectAll}
                        className={`w-5 h-5 border flex items-center justify-center transition-all ${
                          selectedAssets.size === selectableAssets.length && selectableAssets.length > 0
                            ? 'bg-ecotribe-primary border-ecotribe-primary'
                            : 'border-slate-300 dark:border-white/30 hover:border-ecotribe-primary/50 bg-white dark:bg-transparent'
                        }`}
                      >
                        {selectedAssets.size === selectableAssets.length && selectableAssets.length > 0 && (
                          <Check className="w-3 h-3 text-black" />
                        )}
                      </button>
                    )}
                  </th>
                  <th className="text-left py-4 px-6 font-mono font-bold text-xs text-slate-700 dark:text-white/60 uppercase tracking-widest">
                    Device
                  </th>
                  <th className="text-left py-4 px-6 font-mono font-bold text-xs text-slate-700 dark:text-white/60 uppercase tracking-widest">
                    Serial
                  </th>
                  <th className="text-left py-4 px-6 font-mono font-bold text-xs text-slate-700 dark:text-white/60 uppercase tracking-widest">
                    Batch
                  </th>
                  <th className="text-left py-4 px-6 font-mono font-bold text-xs text-slate-700 dark:text-white/60 uppercase tracking-widest">
                    Status
                  </th>
                  <th className="text-left py-4 px-6 font-mono font-bold text-xs text-slate-700 dark:text-white/60 uppercase tracking-widest">
                    Added
                  </th>
                  <th className="text-right py-4 px-6 font-mono font-bold text-xs text-slate-700 dark:text-white/60 uppercase tracking-widest">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {filteredAssets.map((asset, index) => {
                  const statusConfig = getStatusConfig(asset.status);
                  const batch = batches.find(b => b.id === asset.batch_id);
                  const isSelectable = asset.status === 'pending_assignment' || asset.status === 'ready_for_pickup' || asset.status === 'conditionally_accepted';
                  const isSelected = selectedAssets.has(asset.id);

                  return (
                    <motion.tr
                      key={asset.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.03 * Math.min(index, 10) }}
                      onClick={() => navigate(`${basePath}/assets/${asset.id}`)}
                      className={`hover:bg-white/70 dark:hover:bg-white/[0.06] cursor-pointer transition-colors group ${
                        isSelected ? 'bg-ecotribe-primary/5' : ''
                      }`}
                    >
                      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                        {isSelectable && (
                          <button
                            onClick={() => toggleAssetSelection(asset.id)}
                            className={`w-5 h-5 border flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-ecotribe-primary border-ecotribe-primary'
                                : 'border-slate-300 dark:border-white/20 hover:border-ecotribe-primary/50'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-black" />}
                          </button>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center">
                            <Laptop className="w-5 h-5 text-slate-500 dark:text-zinc-500" />
                          </div>
                          <div>
                            <p className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase">{asset.brand}</p>
                            <p className="font-mono text-xs text-slate-500 dark:text-zinc-600">{asset.model}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-mono text-xs text-slate-500 dark:text-zinc-400">{asset.serial_number}</span>
                      </td>
                      <td className="py-4 px-6">
                        {batch ? (
                          <span className="font-display text-xs text-slate-500 dark:text-zinc-500 uppercase">{batch.name}</span>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-zinc-700">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <Badge variant={statusConfig.variant} size="sm">
                          {statusConfig.label}
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-mono text-xs text-slate-500 dark:text-zinc-600">
                          {asset.created_at
                            ? formatDistanceToNow(new Date(asset.created_at), { addSuffix: true })
                            : '—'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`${basePath}/assets/${asset.id}`);
                          }}
                          className="interactive p-2 border border-slate-200 dark:border-white/10 hover:border-ecotribe-primary/30 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                        >
                          <Eye className="w-4 h-4 text-slate-500 dark:text-zinc-500 group-hover:text-ecotribe-primary" />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center">
            <Laptop className="w-12 h-12 text-slate-400 dark:text-zinc-700 mx-auto mb-4" />
            <p className="font-display font-bold text-slate-600 dark:text-zinc-500 uppercase tracking-wide mb-2">No assets found</p>
            <p className="font-mono text-xs text-slate-500 dark:text-zinc-600 mb-6">
              {searchQuery || statusFilter || batchFilter
                ? 'Try adjusting your filters'
                : 'Add your first asset to get started'}
            </p>
            {!searchQuery && !statusFilter && !batchFilter && (
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => navigate(`${basePath}/assets/upload`)}
                  className="interactive px-5 py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-all flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload CSV
                </button>
                <button
                  onClick={() => navigate(`${basePath}/assets/new`)}
                  className="interactive px-5 py-2.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white dark:hover:bg-white transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Asset
                </button>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Results count */}
      {filteredAssets.length > 0 && (
        <p className="font-mono text-xs text-slate-500 dark:text-zinc-600 text-center uppercase tracking-widest">
          Showing {filteredAssets.length} of {enterpriseAssets.length} assets
        </p>
      )}

      {/* Bulk Assign Modal */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white/95 dark:bg-black/95 backdrop-blur-xl border border-slate-200 dark:border-white/20"
          >
            <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <h3 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide">
                Bulk Assign Assets
              </h3>
              <button
                onClick={() => setShowBulkAssignModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500 dark:text-white/50" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Selected Assets Count */}
              <div className="p-4 border border-ecotribe-primary/20 bg-ecotribe-primary/5">
                <p className="font-mono text-xs text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-1">Selected Assets</p>
                <p className="font-brand font-bold text-xl text-ecotribe-primary">
                  {selectedAssignable.length} asset{selectedAssignable.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* V3.2: Assignment Mode Tabs */}
              <div className="flex border border-slate-200 dark:border-white/10">
                <button
                  onClick={() => setAssignMode('self')}
                  className={`flex-1 px-4 py-3 font-mono text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                    assignMode === 'self'
                      ? 'bg-ecotribe-primary text-black'
                      : 'bg-slate-50 dark:bg-white/[0.02] text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  <User className="w-4 h-4" />
                  Self
                </button>
                <button
                  onClick={() => setAssignMode('select')}
                  className={`flex-1 px-4 py-3 font-mono text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                    assignMode === 'select'
                      ? 'bg-ecotribe-primary text-black'
                      : 'bg-slate-50 dark:bg-white/[0.02] text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  Sub-User
                </button>
              </div>

              {/* Self-Assign Mode */}
              {assignMode === 'self' && (
                <div className="p-4 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                  <p className="font-mono text-xs text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-2">Assign To</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-ecotribe-primary/20 border border-ecotribe-primary/30 flex items-center justify-center">
                      <User className="w-5 h-5 text-ecotribe-primary" />
                    </div>
                    <div>
                      <p className="font-display font-bold text-sm text-slate-900 dark:text-white">
                        {user?.name || user?.email || 'Yourself'}
                      </p>
                      <p className="font-mono text-xs text-slate-500 dark:text-zinc-500">
                        Self-evaluation
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-User Selection Mode */}
              {assignMode === 'select' && (
                <div>
                  <label className="font-mono font-bold text-[10px] text-slate-600 dark:text-white/60 uppercase tracking-widest mb-2 block">
                    Assign to Sub-User
                  </label>
                  {enterpriseSubUsers.length > 0 ? (
                    <select
                      value={selectedSubUserId}
                      onChange={(e) => setSelectedSubUserId(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 appearance-none cursor-pointer"
                    >
                      <option value="" className="bg-white dark:bg-[#0a0a0a]">Select a sub-user...</option>
                      {enterpriseSubUsers.map(subUser => (
                        <option key={subUser.id} value={subUser.id} className="bg-white dark:bg-[#0a0a0a]">
                          {subUser.name || subUser.email} {subUser.department ? `(${subUser.department})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-center py-4">
                      <p className="font-display text-slate-600 dark:text-zinc-500 text-sm mb-3">No sub-users found</p>
                      <button
                        onClick={() => {
                          setShowBulkAssignModal(false);
                          navigate(`${basePath}/sub-users/invite`);
                        }}
                        className="text-xs text-ecotribe-primary hover:underline font-mono uppercase tracking-widest"
                      >
                        Invite Sub-Users
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Selected Sub-User Preview */}
              {assignMode === 'select' && selectedSubUserId && (
                <div className="p-4 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                  <p className="font-mono text-xs text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-2">Selected User</p>
                  <p className="font-display text-sm text-slate-900 dark:text-white">
                    {enterpriseSubUsers.find(u => u.id === selectedSubUserId)?.name ||
                     enterpriseSubUsers.find(u => u.id === selectedSubUserId)?.email}
                  </p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-white/10 flex gap-3 justify-end">
              <button
                onClick={() => setShowBulkAssignModal(false)}
                className="px-5 py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAssign}
                disabled={(assignMode === 'select' && !selectedSubUserId) || isAssigning}
                className="px-5 py-2.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isAssigning ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    {assignMode === 'self' ? <User className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    {assignMode === 'self' ? 'Self-Assign' : 'Assign'} {selectedAssignable.length} Asset{selectedAssignable.length !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white/95 dark:bg-black/95 backdrop-blur-xl border border-slate-200 dark:border-white/20"
          >
            <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <h3 className="font-brand font-bold text-lg text-red-400 uppercase tracking-wide">
                Delete Assets
              </h3>
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500 dark:text-white/50" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 border border-red-500/20 bg-red-500/5">
                <div className="flex items-center gap-3 mb-2">
                  <Trash2 className="w-5 h-5 text-red-400" />
                  <p className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase">
                    Warning: This action cannot be undone
                  </p>
                </div>
                <p className="font-mono text-xs text-slate-500 dark:text-zinc-500">
                  You are about to permanently delete {selectedAssets.size} asset{selectedAssets.size !== 1 ? 's' : ''}.
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-white/10 flex gap-3 justify-end">
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                className="px-5 py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 bg-red-500 text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete {selectedAssets.size} Asset{selectedAssets.size !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Initiate Pickup Modal */}
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
                    Initiate Pickup
                  </h3>
                  <p className="font-mono text-xs text-slate-500 dark:text-zinc-500">Request device pickup from location</p>
                </div>
              </div>
              <button
                onClick={() => setShowPickupModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500 dark:text-zinc-500" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {/* Selected Assets Summary */}
              <div className="p-4 border border-green-500/20 bg-green-500/5">
                <p className="font-mono text-xs text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-1">Assets for Pickup</p>
                <p className="font-brand font-bold text-xl text-green-400">
                  {selectedPickupable.length} device{selectedPickupable.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Branch Selection - V3.2: Replaced pickup locations with branches */}
              <div>
                <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-zinc-600 uppercase tracking-widest mb-2 block">
                  <MapPin className="w-3 h-3 inline mr-1" />
                  Branch *
                </label>
                {branches.length > 0 ? (
                  <select
                    value={pickupForm.branchId}
                    onChange={(e) => setPickupForm(prev => ({ ...prev, branchId: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-white dark:bg-[#0a0a0a]">Select a branch...</option>
                    {branches.filter(b => b.status === 'active').map(branch => (
                      <option key={branch.id} value={branch.id} className="bg-white dark:bg-[#0a0a0a]">
                        {branch.branch_name} ({branch.branch_code}) - {branch.city}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-center py-4 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                    <MapPin className="w-8 h-8 text-slate-500 dark:text-zinc-600 mx-auto mb-2" />
                    <p className="font-display text-slate-600 dark:text-zinc-500 text-sm mb-3">No branches assigned</p>
                    <p className="font-mono text-xs text-slate-500 dark:text-zinc-600">
                      Contact your Org Admin to be assigned to a branch
                    </p>
                  </div>
                )}
              </div>

              {/* Preferred Date */}
              <div>
                <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-zinc-600 uppercase tracking-widest mb-2 block">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  Preferred Date *
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
                <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-zinc-600 uppercase tracking-widest mb-2 block">
                  <Clock className="w-3 h-3 inline mr-1" />
                  Preferred Time Slot
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(pickupTimeSlotLabels) as PickupTimeSlot[]).map(slot => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setPickupForm(prev => ({ ...prev, preferredTimeSlot: slot }))}
                      className={`px-3 py-2 border font-mono text-xs uppercase tracking-widest transition-all ${
                        pickupForm.preferredTimeSlot === slot
                          ? 'bg-ecotribe-primary text-black border-ecotribe-primary'
                          : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-white/20'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
                <p className="font-mono text-[10px] text-slate-500 dark:text-zinc-600 mt-1">
                  {pickupTimeSlotLabels[pickupForm.preferredTimeSlot]}
                </p>
              </div>

              {/* Priority */}
              <div>
                <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-zinc-600 uppercase tracking-widest mb-2 block">
                  Priority
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setPickupForm(prev => ({ ...prev, priority: 'normal' }))}
                    className={`flex-1 px-4 py-2 border font-mono text-xs uppercase tracking-widest transition-all ${
                      pickupForm.priority === 'normal'
                        ? 'bg-ecotribe-primary text-black border-ecotribe-primary'
                        : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickupForm(prev => ({ ...prev, priority: 'urgent' }))}
                    className={`flex-1 px-4 py-2 border font-mono text-xs uppercase tracking-widest transition-all ${
                      pickupForm.priority === 'urgent'
                        ? 'bg-amber-500 text-black border-amber-500'
                        : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    Urgent
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-zinc-600 uppercase tracking-widest mb-2 block">
                  Notes (Optional)
                </label>
                <textarea
                  value={pickupForm.notes}
                  onChange={(e) => setPickupForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any special instructions for the pickup..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 resize-none placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-white/10 flex gap-3 justify-end">
              <button
                onClick={() => setShowPickupModal(false)}
                className="px-5 py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleInitiatePickup}
                disabled={!pickupForm.branchId || !pickupForm.preferredDate || isCreatingPickup}
                className="px-5 py-2.5 bg-green-500 text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-green-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCreatingPickup ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Truck className="w-4 h-4" />
                    Create Pickup Request
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  icon,
  highlight,
  error,
  onClick,
  active
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
  highlight?: boolean;
  error?: boolean;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <div
      className={`p-5 border-r border-b border-slate-200 dark:border-white/10 bg-white/85 dark:bg-black/30 shadow-[0_1px_0_rgba(15,23,42,0.04)] dark:shadow-none transition-colors group ${onClick ? 'cursor-pointer hover:border-ecotribe-primary/30 hover:shadow-[0_6px_16px_rgba(15,23,42,0.08)] dark:hover:bg-white/[0.05]' : ''} ${active ? 'border-ecotribe-primary/40 bg-ecotribe-primary/5 dark:bg-ecotribe-primary/10' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className={`font-mono font-bold text-xs uppercase tracking-widest transition-colors ${active ? 'text-ecotribe-primary' : 'text-slate-600 dark:text-white/60'} group-hover:text-ecotribe-primary`}>
          {label}
        </h4>
        {icon && (
          <span
            className={`${highlight ? 'text-amber-500' : error ? 'text-red-400' : active ? 'text-ecotribe-primary' : 'text-slate-500 dark:text-white/60'} group-hover:text-ecotribe-primary transition-colors`}
          >
            {icon}
          </span>
        )}
      </div>
      <div
        className={`font-brand font-bold text-3xl ${error ? 'text-red-500' : highlight ? 'text-amber-500' : active ? 'text-ecotribe-primary' : 'text-slate-900 dark:text-white'}`}
      >
        {value}
      </div>
    </div>
  );
}

export default AssetList;
