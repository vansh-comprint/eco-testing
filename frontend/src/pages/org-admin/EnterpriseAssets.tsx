/**
 * Enterprise-Wide Asset Overview
 * Org Admin view showing ALL assets across all branches
 * Read-only overview with branch filtering and drill-down to AssetDetail
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  Monitor,
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
import { useAuth, useInfiniteAssets, useBranches, useDashboardStats } from '@/hooks';
import { PageHeader, DashboardStatGrid, Badge, InfiniteScrollTrigger, InfiniteScrollInfo } from '@/components/ui';
import type { StatAccent } from '@/components/ui';
import { iconSize } from '@/lib/design-tokens';
import Papa from 'papaparse';

type SortOption = 'newest' | 'oldest' | 'serial' | 'brand';

export function EnterpriseAssets() {
  const navigate = useNavigate();
  const { enterprise } = useAuth();
  const enterpriseId = enterprise?.id || '';

  const { data: assetPages, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteAssets({ enterprise_id: enterpriseId });
  const assets = useMemo(() => assetPages?.pages.flatMap(p => p.data || []) ?? [], [assetPages]);
  const totalAssets = assetPages?.pages[0]?.pagination?.total;
  const { data: branches = [] } = useBranches(enterpriseId);
  const { stats: dashboardStats } = useDashboardStats();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Branch lookup
  const branchMap = useMemo(() => {
    const map = new Map<string, string>();
    branches.forEach(b => map.set(b.id, b.branch_name));
    return map;
  }, [branches]);

  // Stats from backend dashboard endpoint
  const stats = {
    total: dashboardStats.asset_total ?? 0,
    pending: dashboardStats.asset_pending ?? 0,
    inReview: dashboardStats.asset_in_review ?? 0,
    accepted: dashboardStats.asset_accepted ?? 0,
    completed: dashboardStats.asset_completed ?? 0,
    rejected: dashboardStats.asset_rejected ?? 0,
  };

  // Filtered & sorted assets
  const filteredAssets = useMemo(() => {
    let result = [...assets];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.serial_number?.toLowerCase().includes(q) ||
        a.brand?.toLowerCase().includes(q) ||
        a.model?.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      const statusGroups: Record<string, string[]> = {
        pending: ['pending_assignment', 'assigned', 'check_in_started'],
        in_review: ['submitted', 'remote_review', 'facility_review'],
        accepted: ['conditionally_accepted', 'final_accepted', 'ready_for_pickup'],
        completed: ['completed'],
        rejected: ['remote_rejected', 'final_rejected'],
      };
      const statuses = statusGroups[statusFilter] || [statusFilter];
      result = result.filter(a => statuses.includes(a.status));
    }

    // Branch filter
    if (branchFilter !== 'all') {
      result = result.filter(a => a.branch_id === branchFilter);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'serial': return (a.serial_number || '').localeCompare(b.serial_number || '');
        case 'brand': return (a.brand || '').localeCompare(b.brand || '');
        default: return 0;
      }
    });

    return result;
  }, [assets, searchQuery, statusFilter, branchFilter, sortBy]);

  // Export CSV
  const handleExport = () => {
    const csv = Papa.unparse(filteredAssets.map(a => ({
      serial_number: a.serial_number,
      brand: a.brand,
      model: a.model,
      status: a.status,
      branch: branchMap.get(a.branch_id || '') || '—',
      batch_id: a.batch_id || '—',
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

  const getStatusColor = (status: string) => {
    if (['pending_assignment', 'assigned', 'check_in_started'].includes(status)) return 'border-amber-400/30 bg-amber-400/10 text-amber-500';
    if (['submitted', 'remote_review', 'facility_review'].includes(status)) return 'border-blue-400/30 bg-blue-400/10 text-blue-500';
    if (['conditionally_accepted', 'final_accepted', 'ready_for_pickup'].includes(status)) return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-500';
    if (status === 'completed') return 'border-lime-400/30 bg-lime-400/10 text-lime-500';
    if (['remote_rejected', 'final_rejected'].includes(status)) return 'border-red-400/30 bg-red-400/10 text-red-500';
    return 'border-slate-300/30 bg-slate-300/10 text-slate-500';
  };

  const formatStatus = (status: string) => status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const statItems = [
    { label: 'Total Assets', value: stats.total, icon: <Monitor className={`${iconSize.lg} text-slate-500`} />, accent: 'neutral' as StatAccent },
    { label: 'Pending', value: stats.pending, icon: <Clock className={`${iconSize.lg} text-amber-500`} />, accent: (stats.pending > 0 ? 'warning' : 'neutral') as StatAccent, onClick: () => setStatusFilter('pending') },
    { label: 'In Review', value: stats.inReview, icon: <AlertTriangle className={`${iconSize.lg} text-blue-500`} />, accent: 'info' as StatAccent, onClick: () => setStatusFilter('in_review') },
    { label: 'Accepted', value: stats.accepted, icon: <CheckCircle className={`${iconSize.lg} text-emerald-500`} />, accent: 'success' as StatAccent, onClick: () => setStatusFilter('accepted') },
    { label: 'Completed', value: stats.completed, icon: <Package className={`${iconSize.lg} text-lime-500`} />, accent: 'brand' as StatAccent, onClick: () => setStatusFilter('completed') },
    { label: 'Rejected', value: stats.rejected, icon: <XCircle className={`${iconSize.lg} text-red-500`} />, accent: (stats.rejected > 0 ? 'danger' : 'neutral') as StatAccent, onClick: () => setStatusFilter('rejected') },
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

      {/* Asset Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="border border-slate-200 dark:border-white/10 bg-white/98 dark:bg-zinc-900/75 overflow-x-auto"
      >
        <div className="min-w-[700px]">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_120px_1fr_140px_100px_60px] gap-3 p-4 bg-slate-100 dark:bg-white/[0.04] border-b border-slate-200 dark:border-white/10">
          <p className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest">Device</p>
          <p className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest">Serial</p>
          <p className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest">Branch</p>
          <p className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest">Status</p>
          <p className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest text-right">Value</p>
          <p className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest text-center">View</p>
        </div>

        {/* Table Body */}
        <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-200/60 dark:divide-white/5">
          {filteredAssets.length > 0 ? (
            filteredAssets.map((asset, idx) => (
              <motion.div
                key={asset.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.01 * Math.min(idx, 10) }}
                onClick={() => navigate(`/org-admin/assets/${asset.id}`)}
                className="grid grid-cols-[1fr_120px_1fr_140px_100px_60px] gap-3 p-4 items-center hover:bg-lime-50/30 dark:hover:bg-lime-500/5 cursor-pointer transition-colors"
              >
                {/* Device */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] flex items-center justify-center flex-shrink-0">
                    <Monitor className="w-4 h-4 text-slate-400 dark:text-zinc-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-bold text-sm text-slate-900 dark:text-white truncate">{asset.brand} {asset.model}</p>
                  </div>
                </div>

                {/* Serial */}
                <p className="font-mono text-xs text-ecotribe-primary truncate">{asset.serial_number}</p>

                {/* Branch */}
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <p className="font-mono text-xs text-slate-600 dark:text-zinc-400 truncate">
                    {branchMap.get(asset.branch_id || '') || '—'}
                  </p>
                </div>

                {/* Status */}
                <span className={`inline-flex items-center px-2 py-1 border font-mono font-bold text-[10px] uppercase tracking-widest w-fit ${getStatusColor(asset.status)}`}>
                  {formatStatus(asset.status)}
                </span>

                {/* Value */}
                <p className="font-mono text-xs text-slate-600 dark:text-zinc-400 text-right">
                  {asset.final_price ? `₹${asset.final_price.toLocaleString('en-IN')}` : asset.base_price ? `₹${asset.base_price.toLocaleString('en-IN')}` : '—'}
                </p>

                {/* View */}
                <div className="flex justify-center">
                  <Eye className="w-4 h-4 text-slate-400 hover:text-ecotribe-primary transition-colors" />
                </div>
              </motion.div>
            ))
          ) : (
            <div className="py-16 text-center">
              <Monitor className="w-12 h-12 text-slate-300 dark:text-zinc-700 mx-auto mb-4" />
              <p className="font-display font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wide mb-1">No assets found</p>
              <p className="font-mono text-xs text-slate-400 dark:text-zinc-600">
                {searchQuery || statusFilter !== 'all' || branchFilter !== 'all' ? 'Try adjusting your filters.' : 'No assets have been added yet.'}
              </p>
            </div>
          )}
        </div>

        </div>{/* min-w-[700px] */}
      </motion.div>

      <InfiniteScrollTrigger hasNextPage={!!hasNextPage} isFetchingNextPage={isFetchingNextPage} fetchNextPage={fetchNextPage} />
      <InfiniteScrollInfo loadedCount={assets.length} totalCount={totalAssets} />
    </div>
  );
}

export default EnterpriseAssets;
