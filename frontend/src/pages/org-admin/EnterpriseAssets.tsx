/**
 * Enterprise-Wide Asset Overview
 * Org Admin view showing ALL assets across all branches
 * Read-only overview with branch filtering and drill-down to AssetDetail
 */
import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  Monitor,
  Laptop,
  Filter,
  Download,
  Eye,
  Loader2,
  ArrowUpDown,
  Building2,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Package,
} from 'lucide-react';
import { useAuth, useInfiniteAssets, useBranches, useBatches, useDashboardStats, useDebounce } from '@/hooks';
import { PageHeader, DashboardStatGrid, Badge, InfiniteScrollTrigger, InfiniteScrollInfo } from '@/components/ui';
import type { StatAccent } from '@/components/ui';
import { iconSize } from '@/lib/design-tokens';
import { getAssetStatusDisplay } from '@/lib/status-display';
import type { AssetStatus } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import Papa from 'papaparse';

type SortOption = 'newest' | 'oldest' | 'serial' | 'brand';

export function EnterpriseAssets() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { enterprise } = useAuth();
  const enterpriseId = enterprise?.id || '';

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 350);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [branchFilter, setBranchFilter] = useState(searchParams.get('branch') || 'all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Map status filter groups to actual status values for server-side filtering
  const STATUS_GROUP_MAP: Record<string, string> = {
    pending: 'pending_assignment,assigned,check_in_started',
    in_review: 'submitted,remote_review,facility_qc',
    accepted: 'conditionally_accepted,final_accepted,ready_for_pickup',
    completed: 'completed',
    rejected: 'remote_rejected,final_rejected',
  };

  // Server-side search + enterprise + status + branch filter + sort
  const apiParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (enterpriseId) params.enterprise_id = enterpriseId;
    if (debouncedSearch) params.search = debouncedSearch;
    if (statusFilter !== 'all' && STATUS_GROUP_MAP[statusFilter]) {
      params.statuses = STATUS_GROUP_MAP[statusFilter];
    }
    if (branchFilter !== 'all') params.branch_id = branchFilter;
    if (sortBy) params.sort_by = sortBy;
    return params;
  }, [enterpriseId, debouncedSearch, statusFilter, branchFilter, sortBy]);

  const { data: assetPages, isLoading, isFetching, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteAssets(apiParams);
  const assets = useMemo(() => assetPages?.pages.flatMap(p => p.data || []) ?? [], [assetPages]);
  const totalAssets = assetPages?.pages[0]?.pagination?.total;
  const { data: branches = [] } = useBranches(enterpriseId);
  const { data: batches = [] } = useBatches(enterpriseId);
  const { stats: dashboardStats } = useDashboardStats();

  // Branch lookup
  const branchMap = useMemo(() => {
    const map = new Map<string, string>();
    branches.forEach(b => map.set(b.id, b.branch_name));
    return map;
  }, [branches]);

  const batchMap = useMemo(() => {
    const map = new Map<string, string>();
    batches.forEach(b => map.set(b.id, b.name));
    return map;
  }, [batches]);

  // Stats from backend dashboard endpoint
  const stats = {
    total: dashboardStats.asset_total ?? 0,
    pending: dashboardStats.asset_pending ?? 0,
    inReview: dashboardStats.asset_in_review ?? 0,
    accepted: dashboardStats.asset_accepted ?? 0,
    completed: dashboardStats.asset_completed ?? 0,
    rejected: dashboardStats.asset_rejected ?? 0,
  };

  // Background refetch indicator
  const isRefetching = isFetching && !isLoading && !isFetchingNextPage;

  // Optimistic client-side sort for instant feedback while server re-fetches
  const filteredAssets = useMemo(() => {
    if (!isRefetching) return assets;
    return [...assets].sort((a, b) => {
      if (sortBy === 'serial') return (a.serial_number || '').localeCompare(b.serial_number || '');
      if (sortBy === 'brand') return (a.brand || '').localeCompare(b.brand || '');
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortBy === 'oldest' ? dateA - dateB : dateB - dateA;
    });
  }, [assets, sortBy, isRefetching]);

  // Export CSV
  const handleExport = () => {
    const csv = Papa.unparse(filteredAssets.map(a => ({
      serial_number: a.serial_number,
      brand: a.brand,
      model: a.model,
      status: a.status,
      branch: branchMap.get(a.branch_id || '') || '-',
      batch: batchMap.get(a.batch_id || '') || '-',
      base_price: a.base_price || '',
      final_price: a.final_price || '',
      created_at: new Date(a.created_at).toLocaleDateString(),
    })));
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `enterprise-assets-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };


  const statItems = [
    { label: 'Total Assets', value: stats.total, icon: <Monitor className={`${iconSize.lg} text-slate-500`} />, accent: 'neutral' as StatAccent },
    { label: 'Pending', value: stats.pending, icon: <Clock className={`${iconSize.lg} text-amber-500`} />, accent: (stats.pending > 0 ? 'warning' : 'neutral') as StatAccent, onClick: () => setStatusFilter(prev => prev === 'pending' ? 'all' : 'pending') },
    { label: 'In Review', value: stats.inReview, icon: <AlertTriangle className={`${iconSize.lg} text-blue-500`} />, accent: 'info' as StatAccent, onClick: () => setStatusFilter(prev => prev === 'in_review' ? 'all' : 'in_review') },
    { label: 'Accepted', value: stats.accepted, icon: <CheckCircle className={`${iconSize.lg} text-emerald-500`} />, accent: 'success' as StatAccent, onClick: () => setStatusFilter(prev => prev === 'accepted' ? 'all' : 'accepted') },
    { label: 'Completed', value: stats.completed, icon: <Package className={`${iconSize.lg} text-lime-500`} />, accent: 'brand' as StatAccent, onClick: () => setStatusFilter(prev => prev === 'completed' ? 'all' : 'completed') },
    { label: 'Rejected', value: stats.rejected, icon: <XCircle className={`${iconSize.lg} text-red-500`} />, accent: (stats.rejected > 0 ? 'danger' : 'neutral') as StatAccent, onClick: () => setStatusFilter(prev => prev === 'rejected' ? 'all' : 'rejected') },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-ecotribe-primary animate-spin mx-auto mb-4" />
          <p className="font-mono text-xs text-slate-500 dark:text-zinc-500 uppercase tracking-widest">Loading enterprise assets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        label="Enterprise Overview"
        title="All Assets"
        subtitle={`${totalAssets ?? assets.length} assets across ${branches.length} branches`}
        actions={
          <button
            onClick={handleExport}
            className="px-4 py-2.5 bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm border border-slate-200/80 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 font-mono font-bold text-xs uppercase tracking-widest hover:border-blue-500/40 dark:hover:border-blue-400/30 transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        }
      />

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <DashboardStatGrid items={statItems} columns={6} />
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
            placeholder="Search by serial, brand, or model..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none transition-colors"
          />
        </div>

        <div className="flex gap-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-9 pr-8 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-mono text-xs uppercase tracking-widest focus:border-ecotribe-primary focus:outline-none appearance-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_review">In Review</option>
              <option value="accepted">Accepted</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
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

          <div className="relative">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="pl-9 pr-8 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-mono text-xs uppercase tracking-widest focus:border-ecotribe-primary focus:outline-none appearance-none cursor-pointer"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="serial">Serial</option>
              <option value="brand">Brand</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs text-slate-500 dark:text-zinc-500 uppercase tracking-widest">
          {filteredAssets.length} asset{filteredAssets.length !== 1 ? 's' : ''}
          {(statusFilter !== 'all' || branchFilter !== 'all' || searchQuery) && ' (filtered)'}
        </p>
        {(statusFilter !== 'all' || branchFilter !== 'all' || searchQuery) && (
          <button
            onClick={() => { setStatusFilter('all'); setBranchFilter('all'); setSearchQuery(''); }}
            className="font-mono text-xs text-ecotribe-primary hover:text-lime-400 uppercase tracking-widest transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

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
                const statusConfig = getAssetStatusDisplay(asset.status as AssetStatus);
                return (
                  <div
                    key={asset.id}
                    onClick={() => navigate(`/org-admin/assets/${asset.id}`)}
                    className="p-4 cursor-pointer active:bg-slate-50 dark:active:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex items-start gap-3">
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
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {branchMap.get(asset.branch_id || '') || '—'}
                          </span>
                          {batchMap.get(asset.batch_id || '') && (
                            <span className="truncate">{batchMap.get(asset.batch_id || '')}</span>
                          )}
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
              <table className="w-full table-fixed">
                <colgroup>
                  <col className="w-[20%]" />
                  <col className="w-[16%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                  <col className="w-[8%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50">
                    <th className="text-left py-4 px-6 font-mono font-bold text-xs text-slate-700 dark:text-white/60 uppercase tracking-widest">
                      Device
                    </th>
                    <th className="text-left py-4 px-6 font-mono font-bold text-xs text-slate-700 dark:text-white/60 uppercase tracking-widest">
                      Serial
                    </th>
                    <th className="text-left py-4 px-6 font-mono font-bold text-xs text-slate-700 dark:text-white/60 uppercase tracking-widest">
                      Branch
                    </th>
                    <th className="text-left py-4 px-6 font-mono font-bold text-xs text-slate-700 dark:text-white/60 uppercase tracking-widest">
                      Batch
                    </th>
                    <th className="text-left py-4 px-6 font-mono font-bold text-xs text-slate-700 dark:text-white/60 uppercase tracking-widest">
                      Status
                    </th>
                    <th className="text-left py-4 px-6 font-mono font-bold text-xs text-slate-700 dark:text-white/60 uppercase tracking-widest whitespace-nowrap">
                      Added
                    </th>
                    <th className="text-right py-4 px-4 font-mono font-bold text-xs text-slate-700 dark:text-white/60 uppercase tracking-widest">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {filteredAssets.map((asset, index) => {
                    const statusConfig = getAssetStatusDisplay(asset.status as AssetStatus);
                    return (
                      <motion.tr
                        key={asset.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.03 * Math.min(index, 10) }}
                        onClick={() => navigate(`/org-admin/assets/${asset.id}`)}
                        className="hover:bg-white/70 dark:hover:bg-white/[0.06] cursor-pointer transition-colors group"
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center flex-shrink-0">
                              <Laptop className="w-5 h-5 text-slate-500 dark:text-zinc-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase truncate">{asset.brand}</p>
                              <p className="font-mono text-xs text-slate-500 dark:text-zinc-600 truncate">{asset.model}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-mono text-xs text-slate-500 dark:text-zinc-400 truncate block">{asset.serial_number}</span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="font-mono text-xs text-slate-500 dark:text-zinc-400 truncate">
                              {branchMap.get(asset.branch_id || '') || '—'}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-mono text-xs text-slate-500 dark:text-zinc-400 truncate block">
                            {batchMap.get(asset.batch_id || '') || '—'}
                          </span>
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
                              navigate(`/org-admin/assets/${asset.id}`);
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
            <p className="font-mono text-xs text-slate-500 dark:text-zinc-600">
              {searchQuery || statusFilter !== 'all' || branchFilter !== 'all' ? 'Try adjusting your filters.' : 'No assets have been added yet.'}
            </p>
          </div>
        )}
      </motion.div>

      <InfiniteScrollTrigger hasNextPage={!!hasNextPage} isFetchingNextPage={isFetchingNextPage} fetchNextPage={fetchNextPage} />
      <InfiniteScrollInfo loadedCount={assets.length} totalCount={totalAssets} />
    </div>
  );
}

export default EnterpriseAssets;
