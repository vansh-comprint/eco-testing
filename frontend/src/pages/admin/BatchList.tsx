import { useState, useMemo, useContext } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Package,
  Plus,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  IndianRupee,
  Laptop,
  Send,
  Bell,
  Loader2,
  X
} from 'lucide-react';
import { Badge, Dropdown, useToast, InfiniteScrollTrigger, InfiniteScrollInfo } from '@/components/ui';
import { useAuth, useInfiniteBatches, useAssets, useAssetsByITAdmin, useUpdateBatch, useDashboardStats, useDebounce, useSubmitBatchForApproval } from '@/hooks';
import { safeNumber } from '@/utils/formatters';
import { ITAdminBranchContext } from '@/contexts/ITAdminBranchContext';
import { useOrgBranchSafe } from '@/contexts/OrgBranchContext';
import { format, formatDistanceToNow } from 'date-fns';
import type { BatchStatus } from '@/types';
import { getBatchStatusDisplay } from '@/lib/status-display';
import { BatchProgressBar } from '@/components/admin/BatchProgressBar';

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'Pending Approval', value: 'pending_approval' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Pickup In Progress', value: 'pickup_in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

const SORT_OPTIONS = [
  { label: 'Newest First', value: 'newest' },
  { label: 'Oldest First', value: 'oldest' },
  { label: 'Highest Value', value: 'value_desc' },
  { label: 'Most Assets', value: 'assets_desc' },
];

export function BatchList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // V3: Use React Query hook for auth
  const { enterprise, user } = useAuth();
  const { addToast } = useToast();

  const userId = user?.id || '';
  const enterpriseId = enterprise?.id || '';

  // Determine base path for navigation
  const isOrgAdmin = user?.role === 'org_admin' || location.pathname.startsWith('/org-admin');
  const isOpsAdmin = user?.role === 'ops_admin' || location.pathname.startsWith('/ops');
  const isSuperAdmin = user?.role === 'super_admin' || location.pathname.startsWith('/super');
  const canSeeFinancials = isOrgAdmin || isOpsAdmin || isSuperAdmin;

  // Debug logging
  console.log('📋 BatchList - user:', user?.name, 'userId:', userId, 'role:', user?.role, 'isOrgAdmin:', isOrgAdmin);

  // V3.2: Assets still fetched via regular query (needed for batch asset counts in cards)
  const { data: orgAssets = [] } = useAssets(isOrgAdmin ? enterpriseId : '');
  const { data: itAssets = [] } = useAssetsByITAdmin(isOrgAdmin ? '' : userId);
  const assets = isOrgAdmin ? orgAssets : itAssets;

  const updateBatchMutation = useUpdateBatch();
  const submitForApprovalMutation = useSubmitBatchForApproval();
  const { stats: dashboardStats } = useDashboardStats();
  const basePath = isOrgAdmin ? '/org-admin' : '/admin';

  // Submit for approval modal state
  const [submitModalBatch, setSubmitModalBatch] = useState<{ id: string; name: string } | null>(null);
  const [submitForm, setSubmitForm] = useState({ preferredDate: '', preferredTimeSlot: 'morning', notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Branch filtering: URL query param (from "View Batches" button) or IT Admin branch selector
  const urlBranchId = new URLSearchParams(location.search).get('branch');
  const itBranchCtx = useContext(ITAdminBranchContext);
  const orgBranchCtx = useOrgBranchSafe();
  const activeBranchFilter = urlBranchId || itBranchCtx?.selectedBranchId || orgBranchCtx?.selectedBranchId || null;

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 350);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [sortBy, setSortBy] = useState('newest');

  // Build server-side params for infinite query (including sort)
  const infiniteParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (isOrgAdmin && enterpriseId) params.enterprise_id = enterpriseId;
    if (activeBranchFilter) params.branch_id = activeBranchFilter;
    if (debouncedSearch) params.search = debouncedSearch;
    // Status filter — single status or comma-separated group
    if (statusFilter) {
      if (statusFilter.includes(',')) {
        params.statuses = statusFilter;
      } else {
        params.status = statusFilter;
      }
    }
    if (sortBy) params.sort_by = sortBy;
    return params;
  }, [isOrgAdmin, enterpriseId, activeBranchFilter, debouncedSearch, statusFilter, sortBy]);

  const {
    data,
    isLoading: batchesLoading,
    isFetching,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteBatches(infiniteParams);

  // Flatten pages into a single array
  const allBatches = useMemo(() => data?.pages.flatMap(p => p.data || []) ?? [], [data]);
  const totalCount = data?.pages[0]?.pagination?.total ?? 0;

  // Background refetch indicator
  const isRefetching = isFetching && !batchesLoading && !isFetchingNextPage;

  // Optimistic client-side sort for instant feedback while server re-fetches
  const filteredBatches = useMemo(() => {
    if (!isRefetching) return allBatches;
    return [...allBatches].sort((a, b) => {
      if (sortBy === 'value_desc') return (Number(b.estimated_value) || 0) - (Number(a.estimated_value) || 0);
      if (sortBy === 'assets_desc') return (Number(b.asset_count) || 0) - (Number(a.asset_count) || 0);
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortBy === 'oldest' ? dateA - dateB : dateB - dateA;
    });
  }, [allBatches, sortBy, isRefetching]);

  // Stats from backend dashboard endpoint
  const stats = {
    total: dashboardStats.batch_total ?? totalCount,
    draft: dashboardStats.batch_draft ?? 0,
    pendingApproval: dashboardStats.batch_pending_approval ?? 0,
    active: dashboardStats.batch_active ?? 0,
    totalValue: dashboardStats.batch_total_value ?? 0,
  };

  // V3: Use centralized status display helper
  const getStatusConfig = (status: BatchStatus) => getBatchStatusDisplay(status);

  // Open submit modal directly (no navigation to detail page)
  const handleSubmitForApproval = (batchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const batch = allBatches.find(b => b.id === batchId);
    if (batch) {
      setSubmitModalBatch({ id: batch.id, name: batch.name });
      setSubmitForm({ preferredDate: '', preferredTimeSlot: 'morning', notes: '' });
    }
  };

  const handleConfirmSubmit = async () => {
    if (!submitModalBatch || !submitForm.preferredDate) return;
    setIsSubmitting(true);
    try {
      await submitForApprovalMutation.mutateAsync({
        batchId: submitModalBatch.id,
        pickupDetails: {
          preferred_pickup_date: submitForm.preferredDate,
          preferred_pickup_slot: submitForm.preferredTimeSlot,
          it_admin_notes: submitForm.notes || undefined,
        },
      });
      addToast({ type: 'success', title: 'Batch Submitted', message: 'Batch has been submitted for Org Admin approval.' });
      setSubmitModalBatch(null);
    } catch (error: any) {
      addToast({ type: 'error', title: 'Submission Failed', message: error?.message || 'Failed to submit batch for approval.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Send reminder notification (placeholder - would create notification in production)
  const handleNudgeOrgAdmin = async (batchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    addToast({
      type: 'info',
      title: 'Reminder Sent',
      message: 'A reminder has been sent to the Org Admin for approval.',
    });
  };

  const handleStatClick = (filterValue: string) => {
    setStatusFilter(filterValue);
  };

  // Loading state (only initial load — subsequent pages show inline spinner)
  if (batchesLoading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-ecotribe-primary mx-auto mb-4" />
          <p className="font-display font-bold uppercase tracking-wide text-slate-500 dark:text-white/50">Loading batches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 border-b border-black/10 dark:border-white/10 pb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-2">Processing</span>
          <h1 className="font-brand font-bold text-3xl md:text-4xl text-black dark:text-white uppercase tracking-tight">
            Batches
          </h1>
          <p className="font-display text-black/60 dark:text-zinc-500 text-sm mt-2 uppercase tracking-wide">Organize assets for processing</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <button
            onClick={() => navigate(`${basePath}/batches/new`)}
            className="interactive px-5 py-2.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white dark:hover:bg-white transition-all flex items-center gap-2 btn-chamfer"
          >
            <Plus className="w-4 h-4" />
            Create Batch
          </button>
        </motion.div>
      </div>

      {/* Stats Grid - Protocol Style */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`grid grid-cols-2 sm:grid-cols-3 ${canSeeFinancials ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} border-l border-t border-slate-200 dark:border-white/10 bg-white/80 dark:bg-black/20 shadow-sm`}
      >
        <StatBox label="Total" value={stats.total} icon={<Package className="w-4 h-4" />} onClick={() => handleStatClick('')} active={statusFilter === ''} />
        <StatBox label="Draft" value={stats.draft} icon={<Clock className="w-4 h-4" />} onClick={() => handleStatClick('draft')} active={statusFilter === 'draft'} />
        <StatBox label="Pending" value={stats.pendingApproval} icon={<AlertTriangle className="w-4 h-4" />} highlight={stats.pendingApproval > 0} onClick={() => handleStatClick('pending_approval')} active={statusFilter === 'pending_approval'} />
        <StatBox label="Active" value={stats.active} icon={<CheckCircle className="w-4 h-4" />} onClick={() => handleStatClick('approved,pickup_in_progress')} active={statusFilter === 'approved,pickup_in_progress'} />
        {canSeeFinancials && <StatBox label="Total Value" value={`₹${(stats.totalValue / 100000).toFixed(1)}L`} icon={<IndianRupee className="w-4 h-4" />} isText />}
      </motion.div>

      {/* Search & Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white/85 dark:bg-black/30 border border-slate-200 dark:border-white/10 p-4 shadow-sm"
      >
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-white/50" />
              <input
                type="text"
                placeholder="Search batches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 font-mono focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="w-full sm:w-40">
              <Dropdown
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="Status"
              />
            </div>
            <div className="w-full sm:w-36">
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

      {/* Batch List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: isRefetching ? 0.6 : 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="relative space-y-3"
      >
        {isRefetching && (
          <div className="absolute top-3 right-3 z-10">
            <div className="w-4 h-4 border-2 border-ecotribe-primary/30 border-t-ecotribe-primary rounded-full animate-spin" />
          </div>
        )}
        {filteredBatches.length > 0 ? (
          filteredBatches.map((batch, index) => {
            const statusConfig = getStatusConfig(batch.status as BatchStatus);
            // V3: Use snake_case from database
            const batchAssets = assets.filter(a => a.batch_id === batch.id);
            const verifiedAssets = batchAssets.filter(a => a.status === 'conditionally_accepted' || a.status === 'ready_for_pickup');
            return (
              <motion.div
                key={batch.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 * Math.min(index, 10) }}
                onClick={() => navigate(`${basePath}/batches/${batch.id}`)}
                className="interactive bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 hover:border-lime-500/30 cursor-pointer transition-all group shadow-sm shadow-slate-900/[0.02] dark:shadow-none"
              >
                <div className="p-4 sm:p-6">
                  <div className="flex items-start sm:items-center gap-4 sm:gap-6">
                    {/* Icon */}
                    <div className="w-12 h-12 sm:w-14 sm:h-14 border border-ecotribe-primary/30 bg-ecotribe-primary/10 flex items-center justify-center flex-shrink-0">
                      <Package className="w-6 h-6 sm:w-7 sm:h-7 text-ecotribe-primary" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                        <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white group-hover:text-ecotribe-primary transition-colors uppercase">
                          {batch.name}
                        </h3>
                        <Badge variant={statusConfig.variant} size="sm">
                          {statusConfig.label}
                        </Badge>
                        {batch.requires_approval && batch.status === 'draft' && (
                          <span className="font-mono font-bold text-[10px] text-amber-400 px-2 py-0.5 bg-amber-500/10 uppercase tracking-widest">
                            Requires Approval
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 sm:gap-4 font-mono text-xs text-slate-500 dark:text-white/50">
                        <span className="flex items-center gap-1.5">
                          <Laptop className="w-3.5 h-3.5" />
                          {batchAssets.length} assets
                        </span>
                        <span>
                          Created {format(new Date(batch.created_at), 'MMM d, yyyy')}
                        </span>
                        {/* Value inline on mobile — financial roles only */}
                        {canSeeFinancials && (
                          <span className="sm:hidden font-brand font-bold text-ecotribe-primary">
                            ₹{(safeNumber(batch.estimated_value) / 1000).toFixed(0)}K
                          </span>
                        )}
                      </div>
                      {batch.progress && batch.progress.total > 0 && (
                        <div className="mt-2">
                          <BatchProgressBar progress={batch.progress} compact />
                        </div>
                      )}
                    </div>

                    {/* Value - desktop only, financial roles only */}
                    {canSeeFinancials && (
                      <div className="hidden sm:block text-right flex-shrink-0">
                        <p className="font-brand font-bold text-2xl text-ecotribe-primary">
                          ₹{(safeNumber(batch.estimated_value) / 1000).toFixed(0)}K
                        </p>
                        <p className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest">Expected Value</p>
                      </div>
                    )}

                    {/* Arrow - desktop */}
                    <ArrowRight className="hidden sm:block w-5 h-5 text-zinc-600 group-hover:text-ecotribe-primary transition-colors flex-shrink-0" />
                  </div>

                  {/* Actions - full width row on mobile */}
                  {(batch.status === 'draft' || batch.status === 'pending_approval') && (
                    <div className="flex items-center gap-3 mt-3 sm:mt-0 sm:pl-[4.5rem]">
                      {batch.status === 'draft' && (
                        <button
                          onClick={(e) => handleSubmitForApproval(batch.id, e)}
                          disabled={verifiedAssets.length === 0}
                          title={verifiedAssets.length === 0 ? (batchAssets.length === 0 ? 'Add assets to this batch before submitting' : 'No verified assets yet — assets must be reviewed and accepted first') : `Submit ${verifiedAssets.length} verified asset(s) for approval`}
                          className={`interactive px-3 sm:px-4 py-2 font-mono font-bold text-xs border uppercase tracking-widest transition-all flex items-center gap-2 ${verifiedAssets.length === 0 ? 'text-zinc-400 border-zinc-300 dark:text-zinc-600 dark:border-zinc-700 cursor-not-allowed opacity-50' : 'text-ecotribe-primary border-ecotribe-primary/30 hover:bg-ecotribe-primary hover:text-black'}`}
                        >
                          <Send className="w-3 h-3" />
                          <span className="hidden sm:inline">Submit for Approval</span>
                          <span className="sm:hidden">Submit</span>
                        </button>
                      )}
                      {batch.status === 'pending_approval' && (
                        <button
                          onClick={(e) => handleNudgeOrgAdmin(batch.id, e)}
                          className="interactive px-3 sm:px-4 py-2 font-mono font-bold text-xs text-amber-400 border border-amber-400/30 hover:bg-amber-400 hover:text-black uppercase tracking-widest transition-all flex items-center gap-2"
                        >
                          <Bell className="w-3 h-3" />
                          <span className="hidden sm:inline">Send Reminder</span>
                          <span className="sm:hidden">Remind</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Approval Info - V3: Use snake_case from database */}
                {(batch.status === 'approved' || batch.status === 'rejected' || batch.status === 'pending_approval') && (
                  <div className="px-6 py-3 border-t border-white/5">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      {batch.status === 'approved' ? (
                        <>
                          <CheckCircle className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Approved</span>
                          {batch.approved_at && (
                            <span className="text-zinc-600">
                              {formatDistanceToNow(new Date(batch.approved_at), { addSuffix: true })}
                            </span>
                          )}
                        </>
                      ) : batch.status === 'rejected' ? (
                        <>
                          <XCircle className="w-3 h-3 text-red-400" />
                          <span className="text-red-400">Rejected</span>
                          {batch.rejection_reason && (
                            <span className="text-zinc-600">— {batch.rejection_reason}</span>
                          )}
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span className="text-amber-400">Awaiting Approval</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })
        ) : (
          <div className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 py-20 text-center shadow-sm shadow-slate-900/[0.02] dark:shadow-none">
            <Package className="w-12 h-12 text-slate-500 dark:text-white/50 mx-auto mb-4" />
            <p className="font-display font-bold text-slate-500 dark:text-white/50 uppercase tracking-wide mb-2">No batches found</p>
            <p className="font-mono text-xs text-slate-500 dark:text-white/50 mb-6">
              {searchQuery || statusFilter
                ? 'Try adjusting your filters'
                : 'Create your first batch to organize assets'}
            </p>
            {!searchQuery && !statusFilter && (
              <button
                onClick={() => navigate(`${basePath}/batches/new`)}
                className="interactive px-5 py-2.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Batch
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* Infinite scroll */}
      <InfiniteScrollInfo loadedCount={allBatches.length} totalCount={totalCount} />
      <InfiniteScrollTrigger
        hasNextPage={!!hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />

      {/* Submit for Approval Modal */}
      {submitModalBatch && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-none sm:max-w-lg max-h-[90dvh] overflow-y-auto bg-white/95 dark:bg-black/95 backdrop-blur-xl border border-slate-200 dark:border-white/20"
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
                    {submitModalBatch.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSubmitModalBatch(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500 dark:text-white/50" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 border border-amber-500/20 bg-amber-500/5">
                <p className="font-mono text-xs text-amber-400">
                  Only verified assets in this batch will be sent for Org Admin approval.
                </p>
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
                onClick={() => setSubmitModalBatch(null)}
                className="px-5 py-2.5 bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={!submitForm.preferredDate || isSubmitting}
                className="px-5 py-2.5 bg-amber-500 text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
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
  isText,
  onClick,
  active
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  highlight?: boolean;
  isText?: boolean;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <div
      className={`p-5 border-r border-b border-slate-200 dark:border-white/10 bg-white/85 dark:bg-black/30 shadow-[0_1px_0_rgba(15,23,42,0.04)] dark:shadow-none hover:bg-slate-50 dark:hover:bg-white/[0.05] hover:border-ecotribe-primary/30 hover:shadow-[0_6px_16px_rgba(15,23,42,0.08)] transition-colors group ${highlight ? 'bg-amber-500/5 dark:bg-amber-500/10' : ''} ${onClick ? 'cursor-pointer' : ''} ${active ? 'bg-ecotribe-primary/5 dark:bg-ecotribe-primary/10 border-ecotribe-primary/40' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className={`font-mono font-bold text-xs uppercase tracking-widest group-hover:text-ecotribe-primary transition-colors ${active ? 'text-ecotribe-primary' : 'text-slate-600 dark:text-white/60'}`}>{label}</h4>
        <span className={`${highlight ? 'text-amber-500' : active ? 'text-ecotribe-primary' : 'text-slate-500 dark:text-white/60'} group-hover:text-ecotribe-primary transition-colors`}>{icon}</span>
      </div>
      <div className={`font-brand font-bold ${isText ? 'text-2xl' : 'text-3xl'} ${highlight ? 'text-amber-500' : active ? 'text-ecotribe-primary' : 'text-slate-900 dark:text-white'}`}>{value}</div>
    </div>
  );
}

export default BatchList;
