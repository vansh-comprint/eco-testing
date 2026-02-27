import { useState, useMemo, useContext } from 'react';
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
  Loader2,
  Info
} from 'lucide-react';
import { Badge, Dropdown, useToast, InfiniteScrollTrigger, InfiniteScrollInfo } from '@/components/ui';
import { useAuth, useInfiniteAssets, useBatches, useBatchesByITAdmin, useSubUsers, useAssignAssetToSubUser, useUpdateAsset, useDeleteAsset, useBranches, useBranchesByITAdmin, useCreateBatch, useDashboardStats, useDebounce } from '@/hooks';
import { formatDistanceToNow } from 'date-fns';
import type { AssetStatus } from '@/types';
import { ASSET_STATUS_FILTER_OPTIONS, ASSET_STATUS_GROUPS, getAssetStatusDisplay } from '@/lib/status-display';
import { ITAdminBranchContext } from '@/contexts/ITAdminBranchContext';
import { useOrgBranchSafe } from '@/contexts/OrgBranchContext';

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

  const itBranchCtx = useContext(ITAdminBranchContext);
  const orgBranchCtx = useOrgBranchSafe();
  const activeBranchFilter = itBranchCtx?.selectedBranchId || orgBranchCtx?.selectedBranchId || null;
  const isOrgAllBranches = isOrgAdmin && (orgBranchCtx?.isAllBranches ?? true);

  const { data: orgBatches = [], isLoading: orgBatchesLoading } = useBatches(isOrgAdmin ? enterpriseId : '');
  const { data: itBatches = [], isLoading: itBatchesLoading } = useBatchesByITAdmin(isOrgAdmin ? '' : userId);
  const { data: subUsers = [] } = useSubUsers(enterpriseId); // Sub-users remain enterprise-wide
  const { data: orgBranches = [] } = useBranches(isOrgAdmin ? enterpriseId : '');
  const { data: itBranches = [] } = useBranchesByITAdmin(isOrgAdmin ? '' : userId);

  const batches = isOrgAdmin ? orgBatches : itBatches;
  const batchesLoading = isOrgAdmin ? orgBatchesLoading : itBatchesLoading;
  const branches = isOrgAdmin ? orgBranches : itBranches;
  // Mutations
  const assignAssetMutation = useAssignAssetToSubUser();
  const updateAssetMutation = useUpdateAsset();
  const deleteAssetMutation = useDeleteAsset();
  const createBatchMutation = useCreateBatch();

  const { stats: dashboardStats } = useDashboardStats();

  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const debouncedSearch = useDebounce(searchQuery, 350);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [batchFilter, setBatchFilter] = useState(searchParams.get('batch') || '');
  const [branchFilter, setBranchFilter] = useState(searchParams.get('branch') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');

  // Selection state for bulk actions
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [selectedSubUserId, setSelectedSubUserId] = useState('');
  const [assignMode, setAssignMode] = useState<'self' | 'select'>('self'); // V3.2: Self-assign or sub-user
  const [isAssigning, setIsAssigning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Bulk "Add to Batch" modal state
  const [showBulkBatchModal, setShowBulkBatchModal] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [isAddingToBatch, setIsAddingToBatch] = useState(false);
  const [batchMode, setBatchMode] = useState<'existing' | 'new'>('existing');
  const [newBatchName, setNewBatchName] = useState('');

  // V4: Infinite scroll for assets — server-side pagination + filtering + sorting
  const infiniteApiParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (isOrgAdmin && enterpriseId) params.enterprise_id = enterpriseId;
    // IT admins: backend auto-scopes, no explicit enterprise_id needed
    if (activeBranchFilter) params.branch_id = activeBranchFilter;
    if (debouncedSearch) params.search = debouncedSearch;
    // Status filter — single status or group
    if (statusFilter) {
      const statusGroup = STATUS_GROUPS[statusFilter];
      if (statusGroup) {
        params.statuses = statusGroup.join(',');
      } else {
        params.status = statusFilter;
      }
    }
    if (batchFilter) params.batch_id = batchFilter;
    if (branchFilter) params.branch_id = branchFilter;
    if (sortBy) params.sort_by = sortBy;
    return params;
  }, [isOrgAdmin, enterpriseId, activeBranchFilter, debouncedSearch, statusFilter, batchFilter, branchFilter, sortBy]);

  const {
    data: infiniteData,
    isLoading: assetsLoading,
    isFetching,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteAssets(infiniteApiParams);

  // Flatten infinite pages into a single array
  const assets = useMemo(() => infiniteData?.pages.flatMap(p => p.data || []) ?? [], [infiniteData]);
  const totalAssetCount = infiniteData?.pages[0]?.pagination?.total ?? 0;

  const isLoading = assetsLoading || batchesLoading;

  // Background refetch indicator (true when sort/filter changes trigger a server re-fetch)
  const isRefetching = isFetching && !isLoading && !isFetchingNextPage;

  // V3: Data is already filtered by enterpriseId from the hooks
  const enterpriseSubUsers = subUsers;
  const enterpriseBatches = batches;

  // Assets are already branch-filtered via server-side API params
  const enterpriseAssets = assets;

  const batchOptions = [
    { label: 'All Batches', value: '' },
    ...enterpriseBatches.map(b => ({ label: b.name, value: b.id })),
  ];

  const branchOptions = [
    { label: 'All Branches', value: '' },
    ...branches.map((b: { id: string; branch_name: string }) => ({ label: b.branch_name, value: b.id })),
  ];

  // Optimistic client-side sort for instant feedback while server re-fetches
  const filteredAssets = useMemo(() => {
    if (!isRefetching) return enterpriseAssets;
    return [...enterpriseAssets].sort((a, b) => {
      if (sortBy === 'serial') return (a.serial_number || '').localeCompare(b.serial_number || '');
      if (sortBy === 'brand') return (a.brand || '').localeCompare(b.brand || '');
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortBy === 'oldest' ? dateA - dateB : dateB - dateA;
    });
  }, [enterpriseAssets, sortBy, isRefetching]);

  const stats = {
    total: dashboardStats.asset_total ?? totalAssetCount,
    pending: dashboardStats.asset_pending_assignment ?? 0,
    readyForPickup: dashboardStats.asset_accepted ?? 0,
    inProgress: dashboardStats.asset_in_review ?? 0,
    completed: dashboardStats.asset_completed ?? 0,
    rejected: dashboardStats.asset_rejected ?? 0,
  };

  // Get only pending assets that can be assigned
  const assignableAssets = filteredAssets.filter(a => a.status === 'pending_assignment');
  const selectedAssignable = Array.from(selectedAssets).filter(id =>
    assignableAssets.some(a => a.id === id)
  );

  // Combined selectable assets (for bulk selection)
  const selectableAssets = filteredAssets.filter(a =>
    a.status === 'pending_assignment' || a.status === 'ready_for_pickup' || a.status === 'conditionally_accepted' ||
    a.status === 'assigned' || a.status === 'check_in_started' || a.status === 'submitted' || a.status === 'remote_review'
  );

  // Assets eligible for batch assignment / reassignment
  const BATCH_ELIGIBLE_STATUSES = ['pending_assignment', 'assigned', 'check_in_started', 'submitted', 'remote_review'];
  const batchableAssets = filteredAssets.filter(a =>
    BATCH_ELIGIBLE_STATUSES.includes(a.status)
  );
  const selectedBatchable = Array.from(selectedAssets).filter(id =>
    batchableAssets.some(a => a.id === id)
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
        // Self-assign: Use the assign endpoint which handles status transition
        for (const assetId of selectedAssignable) {
          await assignAssetMutation.mutateAsync({ assetId, subUserId: userId });
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

  // Bulk add to batch handler
  const handleBulkAddToBatch = async () => {
    if (selectedBatchable.length === 0) return;

    setIsAddingToBatch(true);
    try {
      let targetBatchId = selectedBatchId;

      // If creating a new batch, do that first
      if (batchMode === 'new') {
        if (!newBatchName.trim()) return;
        // Determine branch_id from selected assets (use first asset's branch)
        const firstAsset = batchableAssets.find(a => selectedBatchable.includes(a.id));
        const newBatch = await createBatchMutation.mutateAsync({
          enterprise_id: enterpriseId,
          branch_id: firstAsset?.branch_id || undefined,
          name: newBatchName.trim(),
        });
        if (!newBatch?.id) throw new Error('Failed to create batch');
        targetBatchId = newBatch.id;
      }

      if (!targetBatchId) return;

      for (const assetId of selectedBatchable) {
        await updateAssetMutation.mutateAsync({ assetId, updates: { batch_id: targetBatchId } });
      }
      addToast({
        type: 'success',
        title: 'Assets Added to Batch',
        message: `Successfully added ${selectedBatchable.length} asset(s) to batch.`,
      });
      setShowBulkBatchModal(false);
      setSelectedBatchId('');
      setNewBatchName('');
      setBatchMode('existing');
      setSelectedAssets(new Set());
    } catch (error) {
      console.error('Failed to add assets to batch:', error);
      addToast({
        type: 'error',
        title: 'Add to Batch Failed',
        message: 'Could not add assets to batch. Please try again.',
      });
    } finally {
      setIsAddingToBatch(false);
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
          className="flex gap-3 items-center"
        >
          {isOrgAllBranches ? (
            <div className="flex items-center gap-2 px-4 py-2 border border-blue-400/20 bg-blue-400/5 text-blue-400 font-mono text-xs">
              <Info className="w-4 h-4 flex-shrink-0" />
              Select a specific branch to add assets
            </div>
          ) : (
            <>
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
            </>
          )}
        </motion.div>
      </div>

      {/* Stats Row - Protocol Style */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border-l border-t border-slate-200 dark:border-white/10 bg-white/80 dark:bg-black/20 shadow-sm"
      >
        <StatBox label="Total" value={stats.total} icon={<Laptop className="w-4 h-4" />} onClick={() => handleStatClick('')} active={statusFilter === ''} />
        <StatBox label="Unassigned" value={stats.pending} icon={<Clock className="w-4 h-4" />} highlight={stats.pending > 0} onClick={() => handleStatClick('pending_assignment')} active={statusFilter === 'pending_assignment'} />
        <StatBox label="Accepted" value={stats.readyForPickup} icon={<Truck className="w-4 h-4" />} highlight={stats.readyForPickup > 0} onClick={() => handleStatClick('accepted')} active={statusFilter === 'accepted'} />
        <StatBox label="Processing" value={stats.inProgress} icon={<TrendingUp className="w-4 h-4" />} onClick={() => handleStatClick('processing')} active={statusFilter === 'processing'} />
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

          <div className="flex flex-wrap gap-3">
            <div className="w-full sm:w-auto sm:min-w-[140px]">
              <Dropdown
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="Status"
              />
            </div>
            <div className="w-[calc(50%-6px)] sm:w-auto sm:min-w-[140px]">
              <Dropdown
                options={batchOptions}
                value={batchFilter}
                onChange={setBatchFilter}
                placeholder="Batch"
              />
            </div>
            <div className="w-[calc(50%-6px)] sm:w-auto sm:min-w-[140px]">
              <Dropdown
                options={branchOptions}
                value={branchFilter}
                onChange={setBranchFilter}
                placeholder="Branch"
              />
            </div>
            <div className="w-full sm:w-auto sm:min-w-[130px]">
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
            className="fixed top-20 lg:top-[5.5rem] left-1/2 -translate-x-1/2 z-[60] bg-white/95 dark:bg-black/95 backdrop-blur-xl border border-ecotribe-primary/30 shadow-2xl shadow-black/10 dark:shadow-black/30 px-5 py-3.5 w-auto max-w-[calc(100vw-2rem)]"
          >
            {/* Close — top-right corner outside content flow */}
            <button
              onClick={clearSelection}
              className="absolute -top-2.5 -right-2.5 interactive w-6 h-6 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-600 rounded-full flex items-center justify-center shadow-md hover:bg-red-50 dark:hover:bg-red-900/30 hover:border-red-300 dark:hover:border-red-500/50 transition-all group"
            >
              <X className="w-3 h-3 text-slate-500 dark:text-zinc-400 group-hover:text-red-500" />
            </button>
            {/* Content — single row */}
            <div className="flex flex-row items-center gap-3">
              {/* Selection count */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-7 h-7 bg-ecotribe-primary/20 border border-ecotribe-primary/30 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-ecotribe-primary" />
                </div>
                <span className="font-mono font-bold text-xs text-black dark:text-white whitespace-nowrap">
                  {selectedAssets.size} selected
                </span>
              </div>
              <div className="h-5 w-px bg-black/10 dark:bg-white/10 flex-shrink-0" />
              {/* Action buttons — single row */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {selectedAssignable.length > 0 && (
                  <button
                    onClick={() => setShowBulkAssignModal(true)}
                    className="interactive px-3 py-1.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white dark:hover:bg-white transition-all flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Assign ({selectedAssignable.length})
                  </button>
                )}
                {selectedBatchable.length > 0 && (
                  <button
                    onClick={() => setShowBulkBatchModal(true)}
                    className="interactive px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono font-bold text-xs uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Package className="w-3.5 h-3.5" />
                    Add to Batch ({selectedBatchable.length})
                  </button>
                )}
                <button
                  onClick={() => setShowBulkDeleteModal(true)}
                  className="interactive px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 font-mono font-bold text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Asset List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: isRefetching ? 0.6 : 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="relative bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 shadow-sm shadow-slate-900/[0.03] dark:shadow-none"
      >
        {isRefetching && (
          <div className="absolute top-3 right-3 z-10">
            <div className="w-4 h-4 border-2 border-ecotribe-primary/30 border-t-ecotribe-primary rounded-full animate-spin" />
          </div>
        )}
        {filteredAssets.length > 0 ? (
          <>
          {/* Mobile Card Layout */}
          <div className="md:hidden divide-y divide-slate-200 dark:divide-white/5">
            {filteredAssets.map((asset, index) => {
              const statusConfig = getStatusConfig(asset.status as any);
              const batch = batches.find(b => b.id === asset.batch_id);
              const isSelectable = asset.status === 'pending_assignment' || asset.status === 'ready_for_pickup' || asset.status === 'conditionally_accepted' || asset.status === 'assigned' || asset.status === 'check_in_started' || asset.status === 'submitted' || asset.status === 'remote_review';
              const isSelected = selectedAssets.has(asset.id);

              return (
                <div
                  key={asset.id}
                  onClick={() => navigate(`${basePath}/assets/${asset.id}`)}
                  className={`p-4 cursor-pointer active:bg-slate-50 dark:active:bg-white/[0.03] transition-colors ${isSelected ? 'bg-ecotribe-primary/5' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {isSelectable && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleAssetSelection(asset.id); }}
                        className={`mt-1 w-5 h-5 border flex items-center justify-center transition-all flex-shrink-0 ${
                          isSelected
                            ? 'bg-ecotribe-primary border-ecotribe-primary'
                            : 'border-slate-300 dark:border-white/20'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-black" />}
                      </button>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase truncate">
                          {asset.brand} {asset.model}
                        </p>
                        <Badge variant={statusConfig.variant} size="sm">
                          {statusConfig.label}
                        </Badge>
                      </div>
                      <p className="font-mono text-xs text-slate-500 dark:text-zinc-400 mb-2">{asset.serial_number}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-zinc-500">
                        {batch && <span className="truncate">{batch.name}</span>}
                        <span>
                          {asset.created_at
                            ? formatDistanceToNow(new Date(asset.created_at), { addSuffix: true })
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden md:block overflow-x-auto">
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
                  const statusConfig = getStatusConfig(asset.status as any);
                  const batch = batches.find(b => b.id === asset.batch_id);
                  const isSelectable = asset.status === 'pending_assignment' || asset.status === 'ready_for_pickup' || asset.status === 'conditionally_accepted' || asset.status === 'assigned' || asset.status === 'check_in_started' || asset.status === 'submitted' || asset.status === 'remote_review';
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
          </>
        ) : (
          <div className="py-20 text-center">
            <Laptop className="w-12 h-12 text-slate-400 dark:text-zinc-700 mx-auto mb-4" />
            <p className="font-display font-bold text-slate-600 dark:text-zinc-500 uppercase tracking-wide mb-2">No assets found</p>
            <p className="font-mono text-xs text-slate-500 dark:text-zinc-600 mb-6">
              {searchQuery || statusFilter || batchFilter || branchFilter
                ? 'Try adjusting your filters'
                : 'Add your first asset to get started'}
            </p>
            {!searchQuery && !statusFilter && !batchFilter && !branchFilter && (
              isOrgAllBranches ? (
                <div className="flex items-center gap-2 justify-center px-4 py-2 border border-blue-400/20 bg-blue-400/5 text-blue-400 font-mono text-xs">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  Select a specific branch to add assets
                </div>
              ) : (
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
              )
            )}
          </div>
        )}
      </motion.div>

      {/* Infinite Scroll Controls */}
      <InfiniteScrollInfo loadedCount={assets.length} totalCount={totalAssetCount} />
      <InfiniteScrollTrigger
        hasNextPage={!!hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />

      {/* Bulk Assign Modal */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white/95 dark:bg-black/95 backdrop-blur-xl border border-slate-200 dark:border-white/20"
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
                  Employee
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

              {/* Employee Selection Mode */}
              {assignMode === 'select' && (
                <div>
                  <label className="font-mono font-bold text-[10px] text-slate-600 dark:text-white/60 uppercase tracking-widest mb-2 block">
                    Assign to Employee
                  </label>
                  {enterpriseSubUsers.length > 0 ? (
                    <select
                      value={selectedSubUserId}
                      onChange={(e) => setSelectedSubUserId(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 appearance-none select-themed cursor-pointer"
                    >
                      <option value="" className="bg-white dark:bg-[#0a0a0a]">Select an employee...</option>
                      {enterpriseSubUsers.map(subUser => (
                        <option key={subUser.id} value={subUser.id} className="bg-white dark:bg-[#0a0a0a]">
                          {subUser.name || subUser.email} {subUser.department ? `(${subUser.department})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-center py-4">
                      <p className="font-display text-slate-600 dark:text-zinc-500 text-sm mb-3">No employees found</p>
                      <button
                        onClick={() => {
                          setShowBulkAssignModal(false);
                          navigate(`${basePath}/employees/invite`);
                        }}
                        className="text-xs text-ecotribe-primary hover:underline font-mono uppercase tracking-widest"
                      >
                        Invite Employees
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
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white/95 dark:bg-black/95 backdrop-blur-xl border border-slate-200 dark:border-white/20"
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

      {/* Bulk Add to Batch Modal */}
      {showBulkBatchModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white/95 dark:bg-black/95 backdrop-blur-xl border border-slate-200 dark:border-white/20"
          >
            <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide">
                    Add to Batch
                  </h3>
                  <p className="font-mono text-xs text-slate-500 dark:text-zinc-500">Assign assets to a draft batch</p>
                </div>
              </div>
              <button
                onClick={() => { setShowBulkBatchModal(false); setSelectedBatchId(''); setNewBatchName(''); setBatchMode('existing'); }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500 dark:text-zinc-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Selected Assets Count */}
              <div className="p-4 border border-blue-500/20 bg-blue-500/5">
                <p className="font-mono text-xs text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-1">Assets to Add</p>
                <p className="font-brand font-bold text-xl text-blue-400">
                  {selectedBatchable.length} asset{selectedBatchable.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Batch Mode Toggle */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setBatchMode('existing'); setNewBatchName(''); }}
                  className={`flex-1 px-3 py-2 font-mono font-bold text-xs uppercase tracking-widest border transition-all ${
                    batchMode === 'existing'
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                      : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-500 hover:border-blue-500/20'
                  }`}
                >
                  Existing Batch
                </button>
                <button
                  type="button"
                  onClick={() => { setBatchMode('new'); setSelectedBatchId(''); }}
                  className={`flex-1 px-3 py-2 font-mono font-bold text-xs uppercase tracking-widest border transition-all flex items-center justify-center gap-1.5 ${
                    batchMode === 'new'
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                      : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-500 hover:border-blue-500/20'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Batch
                </button>
              </div>

              {/* Batch Selection / Creation */}
              <div>
                {batchMode === 'existing' ? (
                  <>
                    <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-zinc-600 uppercase tracking-widest mb-2 block">
                      Select Batch *
                    </label>
                    {(() => {
                      const selectedAssetObjects = selectedBatchable
                        .map(id => batchableAssets.find(a => a.id === id))
                        .filter(Boolean);
                      const selectedBranchIds = new Set(
                        selectedAssetObjects.map(a => a?.branch_id).filter(Boolean)
                      );
                      // Exclude batches the selected assets are already in
                      const currentBatchIds = new Set(
                        selectedAssetObjects.map(a => a?.batch_id).filter(Boolean)
                      );
                      const eligibleBatches = batches.filter(b =>
                        b.status === 'draft' &&
                        !currentBatchIds.has(b.id) &&
                        (selectedBranchIds.size === 0 || selectedBranchIds.has(b.branch_id))
                      );

                      return eligibleBatches.length > 0 ? (
                        <select
                          value={selectedBatchId}
                          onChange={(e) => setSelectedBatchId(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-blue-500/50 appearance-none select-themed cursor-pointer"
                        >
                          <option value="" className="bg-white dark:bg-[#0a0a0a]">Select a batch...</option>
                          {eligibleBatches.map(batch => (
                            <option key={batch.id} value={batch.id} className="bg-white dark:bg-[#0a0a0a]">
                              {batch.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-center py-4 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                          <Package className="w-8 h-8 text-slate-500 dark:text-zinc-600 mx-auto mb-2" />
                          <p className="font-display text-slate-600 dark:text-zinc-500 text-sm mb-1">No draft batches available</p>
                          <p className="font-mono text-xs text-slate-500 dark:text-zinc-600">
                            Switch to "New Batch" to create one
                          </p>
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <>
                    <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-zinc-600 uppercase tracking-widest mb-2 block">
                      Batch Name *
                    </label>
                    <input
                      type="text"
                      value={newBatchName}
                      onChange={(e) => setNewBatchName(e.target.value)}
                      placeholder="e.g. January Batch - Branch A"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-blue-500/50"
                    />
                    <p className="mt-1.5 font-mono text-[10px] text-slate-400 dark:text-zinc-600">
                      A new draft batch will be created and the selected assets will be added to it.
                    </p>
                  </>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-white/10 flex gap-3 justify-end">
              <button
                onClick={() => { setShowBulkBatchModal(false); setSelectedBatchId(''); setNewBatchName(''); setBatchMode('existing'); }}
                className="px-5 py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAddToBatch}
                disabled={(batchMode === 'existing' ? !selectedBatchId : !newBatchName.trim()) || isAddingToBatch}
                className="px-5 py-2.5 bg-blue-500 text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isAddingToBatch ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Package className="w-4 h-4" />
                    Add {selectedBatchable.length} Asset{selectedBatchable.length !== 1 ? 's' : ''}
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
