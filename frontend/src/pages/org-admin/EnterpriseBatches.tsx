/**
 * Enterprise-Wide Batch Pipeline
 * Org Admin view showing ALL batches across enterprise with IT Admin attribution
 * Pipeline overview with status-based filtering and drill-down
 */
import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  Package,
  Filter,
  Download,
  Eye,
  Loader2,
  Building2,
  CheckCircle,
  Clock,
  XCircle,
  FileCheck,
  Truck,
  ArrowRight,
  User,
} from 'lucide-react';
import { useAuth, useAssets, useInfiniteBatches, useBranches, useITAdmins, useDashboardStats, useDebounce } from '@/hooks';
import { PageHeader, DashboardStatGrid, Badge, InfiniteScrollTrigger, InfiniteScrollInfo } from '@/components/ui';
import type { StatAccent } from '@/components/ui';
import { iconSize } from '@/lib/design-tokens';
import { safeNumber } from '@/utils/formatters';
import Papa from 'papaparse';

type StatusGroup = 'all' | 'draft' | 'pending_approval' | 'approved' | 'pickup' | 'completed' | 'rejected';

export function EnterpriseBatches() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { enterprise } = useAuth();
  const enterpriseId = enterprise?.id || '';

  // Normalize URL status param — 'pickup_in_progress' maps to 'pickup' StatusGroup
  const urlStatus = searchParams.get('status');
  const normalizedStatus = urlStatus === 'pickup_in_progress' ? 'pickup' : urlStatus;

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 350);
  const [statusFilter, setStatusFilter] = useState<StatusGroup>((normalizedStatus as StatusGroup) || 'all');
  const [branchFilter, setBranchFilter] = useState(searchParams.get('branch') || 'all');

  // Map status filter groups to actual status values for server-side filtering
  const STATUS_GROUP_MAP: Record<string, string> = {
    draft: 'draft',
    pending_approval: 'pending_approval',
    approved: 'approved',
    pickup: 'pickup_in_progress',
    completed: 'completed',
    rejected: 'rejected',
  };

  // Build API params for server-side filtering
  const apiParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (enterpriseId) params.enterprise_id = enterpriseId;
    if (debouncedSearch) params.search = debouncedSearch;
    if (statusFilter !== 'all' && STATUS_GROUP_MAP[statusFilter]) {
      params.statuses = STATUS_GROUP_MAP[statusFilter];
    }
    if (branchFilter !== 'all') params.branch_id = branchFilter;
    return params;
  }, [enterpriseId, debouncedSearch, statusFilter, branchFilter]);

  const { data: batchPages, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteBatches(apiParams);
  const batches = useMemo(() => batchPages?.pages.flatMap(p => p.data || []) ?? [], [batchPages]);
  const totalBatches = batchPages?.pages[0]?.pagination?.total;
  const { data: assets = [] } = useAssets(enterpriseId);
  const { data: branches = [] } = useBranches(enterpriseId);
  const { data: itAdmins = [] } = useITAdmins(enterpriseId);
  const { stats: dashboardStats } = useDashboardStats();

  // Lookups
  const branchMap = useMemo(() => {
    const map = new Map<string, string>();
    branches.forEach(b => map.set(b.id, b.branch_name || ''));
    return map;
  }, [branches]);

  const adminMap = useMemo(() => {
    const map = new Map<string, string>();
    itAdmins.forEach(a => map.set(a.id, a.name || a.email));
    return map;
  }, [itAdmins]);

  // Count assets per batch
  const batchAssetCounts = useMemo(() => {
    const counts = new Map<string, number>();
    assets.forEach(a => {
      if (a.batch_id) counts.set(a.batch_id, (counts.get(a.batch_id) || 0) + 1);
    });
    return counts;
  }, [assets]);

  // Filtered-aware stats: use batch list data when filters are active
  const stats = useMemo(() => {
    const isFiltered = branchFilter !== 'all' || !!debouncedSearch;

    if (!isFiltered) {
      // No filters — use dashboard stats (global, accurate)
      return {
        draft: dashboardStats.batch_draft ?? 0,
        pendingApproval: dashboardStats.batch_pending_approval ?? 0,
        approved: dashboardStats.batch_approved ?? 0,
        pickup: dashboardStats.batch_pickup_in_progress ?? 0,
        completed: dashboardStats.batch_completed ?? 0,
        rejected: dashboardStats.batch_rejected ?? 0,
        totalValue: dashboardStats.batch_total_value ?? 0,
      };
    }

    // Filters active — compute from loaded batch data
    // Note: this only counts loaded pages, not total server count
    // But it's more accurate than showing unfiltered global stats
    const countByStatus = (status: string) => batches.filter(b => b.status === status).length;
    return {
      draft: countByStatus('draft'),
      pendingApproval: countByStatus('pending_approval'),
      approved: countByStatus('approved'),
      pickup: countByStatus('pickup_in_progress'),
      completed: countByStatus('completed'),
      rejected: countByStatus('rejected'),
      totalValue: batches.reduce((sum, b) => sum + (Number(b.estimated_value) || 0), 0),
    };
  }, [branchFilter, debouncedSearch, batches, dashboardStats]);

  // All filtering and sorting is server-side (server returns created_at DESC by default)
  const filteredBatches = batches;

  const handleExport = () => {
    const csv = Papa.unparse(filteredBatches.map(b => ({
      name: b.name,
      status: b.status,
      branch: branchMap.get(b.branch_id || '') || '—',
      it_admin: adminMap.get(b.it_admin_id || '') || '—',
      asset_count: batchAssetCounts.get(b.id) || 0,
      estimated_value: b.estimated_value || '',
      created_at: new Date(b.created_at).toLocaleDateString(),
    })));
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `enterprise-batches-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { color: string; label: string }> = {
      draft: { color: 'border-slate-400/30 bg-slate-400/10 text-slate-500', label: 'Draft' },
      pending_approval: { color: 'border-amber-400/30 bg-amber-400/10 text-amber-500', label: 'Pending Approval' },
      approved: { color: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-500', label: 'Approved' },
      pickup_in_progress: { color: 'border-blue-400/30 bg-blue-400/10 text-blue-500', label: 'Pickup In Progress' },
      completed: { color: 'border-lime-400/30 bg-lime-400/10 text-lime-500', label: 'Completed' },
      rejected: { color: 'border-red-400/30 bg-red-400/10 text-red-500', label: 'Rejected' },
      cancelled: { color: 'border-slate-400/30 bg-slate-400/10 text-slate-400', label: 'Cancelled' },
    };
    return map[status] || { color: 'border-slate-400/30 bg-slate-400/10 text-slate-500', label: status };
  };

  // Pipeline stat items
  const pipelineItems = [
    { label: 'Draft', value: stats.draft, icon: <Package className={`${iconSize.lg} text-slate-400`} />, accent: 'neutral' as StatAccent, onClick: () => setStatusFilter(prev => prev === 'draft' ? 'all' : 'draft') },
    { label: 'Pending Approval', value: stats.pendingApproval, icon: <Clock className={`${iconSize.lg} text-amber-500`} />, accent: (stats.pendingApproval > 0 ? 'warning' : 'neutral') as StatAccent, onClick: () => setStatusFilter(prev => prev === 'pending_approval' ? 'all' : 'pending_approval') },
    { label: 'Approved', value: stats.approved, icon: <CheckCircle className={`${iconSize.lg} text-emerald-500`} />, accent: 'success' as StatAccent, onClick: () => setStatusFilter(prev => prev === 'approved' ? 'all' : 'approved') },
    { label: 'Pickup', value: stats.pickup, icon: <Truck className={`${iconSize.lg} text-blue-500`} />, accent: 'info' as StatAccent, onClick: () => setStatusFilter(prev => prev === 'pickup' ? 'all' : 'pickup') },
    { label: 'Completed', value: stats.completed, icon: <FileCheck className={`${iconSize.lg} text-lime-500`} />, accent: 'brand' as StatAccent, onClick: () => setStatusFilter(prev => prev === 'completed' ? 'all' : 'completed') },
    { label: 'Rejected', value: stats.rejected, icon: <XCircle className={`${iconSize.lg} text-red-500`} />, accent: (stats.rejected > 0 ? 'danger' : 'neutral') as StatAccent, onClick: () => setStatusFilter(prev => prev === 'rejected' ? 'all' : 'rejected') },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-ecotribe-primary animate-spin mx-auto mb-4" />
          <p className="font-mono text-xs text-slate-500 dark:text-zinc-500 uppercase tracking-widest">Loading enterprise batches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        label="Enterprise Overview"
        title="All Batches"
        subtitle={`${batches.length} batches — ₹${(stats.totalValue / 100000).toFixed(1)}L total pipeline`}
        actions={
          <div className="flex gap-3">
            {stats.pendingApproval > 0 && (
              <button
                onClick={() => navigate('/org-admin/approvals')}
                className="px-4 py-2.5 bg-amber-500 text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-amber-400 transition-all flex items-center gap-2"
              >
                Review {stats.pendingApproval} Pending
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleExport}
              className="px-4 py-2.5 bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm border border-slate-200/80 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 font-mono font-bold text-xs uppercase tracking-widest hover:border-blue-500/40 transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        }
      />

      {/* Pipeline Stats */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <DashboardStatGrid items={pipelineItems} columns={6} />
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex flex-col md:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-white/30" />
          <input
            type="text"
            placeholder="Search by batch name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none transition-colors"
          />
        </div>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="pl-9 pr-8 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-mono text-xs uppercase tracking-widest focus:border-ecotribe-primary focus:outline-none appearance-none cursor-pointer"
          >
            <option value="all">All Branches</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.branch_name}</option>
            ))}
          </select>
        </div>
        {statusFilter !== 'all' && (
          <button
            onClick={() => setStatusFilter('all')}
            className="px-4 py-3 border border-ecotribe-primary/30 bg-ecotribe-primary/10 text-ecotribe-primary font-mono font-bold text-xs uppercase tracking-widest hover:bg-ecotribe-primary/20 transition-colors flex items-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            Clear: {statusFilter.replace(/_/g, ' ')}
          </button>
        )}
      </motion.div>

      {/* Batch List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        {filteredBatches.length > 0 ? (
          filteredBatches.map((batch, idx) => {
            const statusInfo = getStatusBadge(batch.status);
            const assetCount = batchAssetCounts.get(batch.id) || batch.asset_count || 0;

            return (
              <motion.div
                key={batch.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.03 * Math.min(idx, 10) }}
                onClick={() => navigate(`/org-admin/batches/${batch.id}`)}
                className="border border-slate-200 dark:border-white/10 bg-white/98 dark:bg-zinc-900/75 hover:border-lime-500/25 dark:hover:border-lime-400/20 hover:shadow-md hover:shadow-lime-500/5 hover:-translate-y-0.5 cursor-pointer transition-all duration-200"
              >
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 border flex items-center justify-center flex-shrink-0 ${
                      batch.status === 'pending_approval' ? 'border-amber-400/30 bg-amber-400/10' :
                      batch.status === 'approved' || batch.status === 'pickup_in_progress' ? 'border-emerald-400/30 bg-emerald-400/10' :
                      batch.status === 'completed' ? 'border-lime-400/30 bg-lime-400/10' :
                      batch.status === 'rejected' ? 'border-red-400/30 bg-red-400/10' :
                      'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]'
                    }`}>
                      <Package className={`w-6 h-6 ${
                        batch.status === 'pending_approval' ? 'text-amber-500' :
                        batch.status === 'approved' || batch.status === 'pickup_in_progress' ? 'text-emerald-500' :
                        batch.status === 'completed' ? 'text-lime-500' :
                        batch.status === 'rejected' ? 'text-red-500' :
                        'text-slate-400'
                      }`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white uppercase">{batch.name}</h3>
                          {batch.description && (
                            <p className="font-mono text-xs text-slate-500 dark:text-white/50 mt-0.5 line-clamp-1">{batch.description}</p>
                          )}
                        </div>
                        <span className={`flex-shrink-0 px-2 py-1 border font-mono font-bold text-[10px] uppercase tracking-widest ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-slate-200/60 dark:border-white/5">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono text-xs text-slate-500 dark:text-zinc-500">
                            {branchMap.get(batch.branch_id || '') || '—'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono text-xs text-slate-500 dark:text-zinc-500">
                            {adminMap.get(batch.it_admin_id || '') || '—'}
                          </span>
                        </div>
                        <span className="font-mono text-xs text-slate-500 dark:text-zinc-500">
                          {assetCount} asset{assetCount !== 1 ? 's' : ''}
                        </span>
                        {batch.estimated_value ? (
                          <span className="font-mono text-xs text-ecotribe-primary font-bold">
                            ₹{(batch.estimated_value / 1000).toFixed(0)}K
                          </span>
                        ) : null}
                        <span className="font-mono text-xs text-slate-400 dark:text-zinc-600">
                          {new Date(batch.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <Eye className="w-5 h-5 text-slate-300 dark:text-zinc-600 flex-shrink-0 mt-1" />
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="border border-slate-200 dark:border-white/10 bg-white/98 dark:bg-zinc-900/75 py-16 text-center">
            <Package className="w-12 h-12 text-slate-300 dark:text-zinc-700 mx-auto mb-4" />
            <p className="font-display font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wide mb-1">No batches found</p>
            <p className="font-mono text-xs text-slate-400 dark:text-zinc-600">
              {searchQuery || statusFilter !== 'all' || branchFilter !== 'all' ? 'Try adjusting your filters.' : 'No batches have been created yet.'}
            </p>
          </div>
        )}
      </motion.div>

      <InfiniteScrollTrigger hasNextPage={!!hasNextPage} isFetchingNextPage={isFetchingNextPage} fetchNextPage={fetchNextPage} />
      <InfiniteScrollInfo loadedCount={batches.length} totalCount={totalBatches} />
    </div>
  );
}

export default EnterpriseBatches;
