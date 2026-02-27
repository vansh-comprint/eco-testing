/**
 * Enterprise Pickup Overview
 * Org Admin view showing ALL pickup requests across enterprise
 * Status tracking with branch filtering and logistics timeline
 */
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  Truck,
  Loader2,
  Building2,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  MapPin,
  Calendar,
  User,
  Download,
  AlertTriangle,
  Package,
} from 'lucide-react';
import { useAuth, useInfinitePickups, useBranches, useDashboardStats } from '@/hooks';
import { InfiniteScrollTrigger, InfiniteScrollInfo } from '@/components/ui';
import { useOrgBranchSafe } from '@/contexts/OrgBranchContext';
import Papa from 'papaparse';

type StatusFilter = 'all' | 'pending' | 'assigned' | 'scheduled' | 'in_progress' | 'completed' | 'failed';

export function EnterprisePickups() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { enterprise } = useAuth();
  const enterpriseId = enterprise?.id || '';

  const urlBranch = searchParams.get('branch');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [branchFilter, setBranchFilter] = useState(urlBranch || 'all');

  // Sync with sidebar branch selector (OrgBranchContext)
  // URL ?branch= param takes priority over context (same pattern as EnterpriseAssets/EnterpriseBatches)
  const orgBranchCtx = useOrgBranchSafe();
  useEffect(() => {
    if (!orgBranchCtx || urlBranch) return;
    setBranchFilter(orgBranchCtx.selectedBranchId || 'all');
  }, [orgBranchCtx?.selectedBranchId, urlBranch]);

  // Map UI status groups to actual backend status values for server-side filtering
  const backendStatusParam = useMemo(() => {
    const statusGroups: Record<string, string[]> = {
      pending: ['pending'],
      assigned: ['assigned_to_logistics_admin', 'assigned_to_logistics_user'],
      scheduled: ['scheduled'],
      in_progress: ['in_progress'],
      completed: ['completed'],
      failed: ['failed', 'cancelled'],
    };
    if (statusFilter === 'all') return undefined;
    // Backend supports single status param; for multi-value groups pass first value
    // Client-side filter still applied after for full accuracy
    return statusGroups[statusFilter]?.[0];
  }, [statusFilter]);

  const { data: pickupPages, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfinitePickups({
    enterprise_id: enterpriseId,
    ...(backendStatusParam ? { status: backendStatusParam } : {}),
  });
  const pickups = useMemo(() => pickupPages?.pages.flatMap(p => p.data || []) ?? [], [pickupPages]);
  const totalPickups = pickupPages?.pages[0]?.pagination?.total;
  const { data: branches = [] } = useBranches(enterpriseId);
  const { stats: dashStats } = useDashboardStats();

  const branchMap = useMemo(() => {
    const map = new Map<string, string>();
    branches.forEach(b => map.set(b.id, b.branch_name || b.name || ''));
    return map;
  }, [branches]);

  // Stats from backend dashboard endpoint (filter-independent)
  const stats = useMemo(() => ({
    pending: dashStats.pickup_pending ?? 0,
    assigned: dashStats.pickup_assigned ?? 0,
    scheduled: dashStats.pickup_scheduled ?? 0,
    inProgress: dashStats.pickup_in_progress ?? 0,
    completed: dashStats.pickup_completed ?? 0,
    failed: dashStats.pickup_failed ?? 0,
  }), [dashStats]);

  // Filtered pickups
  const filteredPickups = useMemo(() => {
    let result = [...pickups];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.id?.toLowerCase().includes(q) ||
        branchMap.get(p.branch_id || '')?.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      const statusGroups: Record<string, string[]> = {
        pending: ['pending'],
        assigned: ['assigned_to_logistics_admin', 'assigned_to_logistics_user'],
        scheduled: ['scheduled'],
        in_progress: ['in_progress'],
        completed: ['completed'],
        failed: ['failed', 'cancelled'],
      };
      result = result.filter(p => (statusGroups[statusFilter] || []).includes(p.status));
    }

    if (branchFilter !== 'all') {
      result = result.filter(p => p.branch_id === branchFilter);
    }

    return result;
  }, [pickups, searchQuery, statusFilter, branchFilter, branchMap]);

  const handleExport = () => {
    const csv = Papa.unparse(filteredPickups.map(p => ({
      request_id: p.id,
      branch: branchMap.get(p.branch_id || '') || '—',
      status: p.status,
      asset_count: p.asset_count || p.assets?.length || 0,
      preferred_date: p.preferred_date || '',
      created_at: new Date(p.created_at).toLocaleDateString(),
    })));
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `enterprise-pickups-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusInfo = (status: string) => {
    const map: Record<string, { color: string; label: string; icon: React.ReactElement }> = {
      pending: { color: 'border-amber-400/30 bg-amber-400/10 text-amber-500', label: 'Pending', icon: <Clock className="w-3 h-3" /> },
      assigned_to_logistics_admin: { color: 'border-blue-400/30 bg-blue-400/10 text-blue-500', label: 'Assigned to Partner', icon: <User className="w-3 h-3" /> },
      assigned_to_logistics_user: { color: 'border-indigo-400/30 bg-indigo-400/10 text-indigo-500', label: 'Assigned to Driver', icon: <User className="w-3 h-3" /> },
      scheduled: { color: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-500', label: 'Scheduled', icon: <Calendar className="w-3 h-3" /> },
      in_progress: { color: 'border-purple-400/30 bg-purple-400/10 text-purple-500', label: 'In Progress', icon: <Truck className="w-3 h-3" /> },
      completed: { color: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-500', label: 'Completed', icon: <CheckCircle className="w-3 h-3" /> },
      failed: { color: 'border-red-400/30 bg-red-400/10 text-red-500', label: 'Failed', icon: <XCircle className="w-3 h-3" /> },
      cancelled: { color: 'border-slate-400/30 bg-slate-400/10 text-slate-500', label: 'Cancelled', icon: <XCircle className="w-3 h-3" /> },
    };
    return map[status] || { color: 'border-slate-400/30 bg-slate-400/10 text-slate-500', label: status, icon: <Clock className="w-3 h-3" /> };
  };

  const statItems = [
    { label: 'Pending', value: stats.pending, icon: <Clock className="w-4 h-4 text-amber-500" />, highlight: stats.pending > 0, filterKey: 'pending' as StatusFilter },
    { label: 'Assigned', value: stats.assigned, icon: <User className="w-4 h-4 text-blue-500" />, filterKey: 'assigned' as StatusFilter },
    { label: 'Scheduled', value: stats.scheduled, icon: <Calendar className="w-4 h-4 text-cyan-500" />, filterKey: 'scheduled' as StatusFilter },
    { label: 'In Progress', value: stats.inProgress, icon: <Truck className="w-4 h-4 text-purple-500" />, filterKey: 'in_progress' as StatusFilter },
    { label: 'Completed', value: stats.completed, icon: <CheckCircle className="w-4 h-4 text-emerald-500" />, filterKey: 'completed' as StatusFilter },
    { label: 'Exceptions', value: stats.failed, icon: <AlertTriangle className="w-4 h-4 text-red-500" />, error: stats.failed > 0, filterKey: 'failed' as StatusFilter },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-ecotribe-primary animate-spin mx-auto mb-4" />
          <p className="font-mono text-xs text-slate-500 dark:text-zinc-500 uppercase tracking-widest">Loading enterprise pickups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-2">Enterprise Overview</span>
          <h1 className="font-brand font-bold text-3xl text-slate-900 dark:text-white uppercase tracking-tight">
            All Pickups
          </h1>
          <p className="font-display text-slate-500 dark:text-white/50 text-sm mt-2 uppercase tracking-wide">
            {pickups.length} pickup requests across {branches.length} branches
          </p>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleExport}
          className="px-4 py-2.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-zinc-100 font-mono font-bold text-xs uppercase tracking-widest hover:border-ecotribe-primary/40 transition-all flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export
        </motion.button>
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border-l border-t border-slate-200 dark:border-white/10"
      >
        {statItems.map((stat) => (
          <button
            key={stat.label}
            type="button"
            onClick={() => setStatusFilter(statusFilter === stat.filterKey ? 'all' : stat.filterKey)}
            className={`p-5 border-r border-b border-slate-200 dark:border-white/10 text-left transition-colors ${
              statusFilter === stat.filterKey
                ? 'bg-ecotribe-primary/5 border-b-ecotribe-primary/40'
                : 'bg-white/80 dark:bg-black/20 hover:bg-slate-50 dark:hover:bg-white/[0.03]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-mono font-bold text-xs uppercase tracking-widest text-slate-600 dark:text-white/60">{stat.label}</h4>
              {stat.icon}
            </div>
            <div className={`font-brand font-bold text-3xl ${
              stat.highlight ? 'text-amber-500' : stat.error ? 'text-red-500' : 'text-slate-900 dark:text-white'
            }`}>
              {stat.value}
            </div>
          </button>
        ))}
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
            placeholder="Search by request ID or branch..."
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
              <option key={b.id} value={b.id}>{b.branch_name || b.name || 'Unnamed Branch'}</option>
            ))}
          </select>
        </div>
        {statusFilter !== 'all' && (
          <button
            onClick={() => setStatusFilter('all')}
            className="px-4 py-3 border border-ecotribe-primary/30 bg-ecotribe-primary/10 text-ecotribe-primary font-mono font-bold text-xs uppercase tracking-widest hover:bg-ecotribe-primary/20 transition-colors flex items-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            Clear Filter
          </button>
        )}
      </motion.div>

      {/* Pickup List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]"
      >
        {filteredPickups.length > 0 ? (
          <div className="divide-y divide-slate-200 dark:divide-white/5">
            {filteredPickups.map((pickup, idx) => {
              const statusInfo = getStatusInfo(pickup.status);
              const assetCount = pickup.asset_count || pickup.assets?.length || 0;

              return (
                <motion.div
                  key={pickup.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 * Math.min(idx, 10) }}
                  onClick={() => navigate(`/org-admin/enterprise-pickups/${pickup.id}`)}
                  className="p-5 hover:bg-white/60 dark:hover:bg-white/[0.04] cursor-pointer transition-colors group"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 border flex items-center justify-center flex-shrink-0 ${
                      pickup.status === 'completed' ? 'border-emerald-400/30 bg-emerald-400/10' :
                      pickup.status === 'in_progress' ? 'border-purple-400/30 bg-purple-400/10' :
                      pickup.status === 'pending' ? 'border-amber-400/30 bg-amber-400/10' :
                      ['failed', 'cancelled'].includes(pickup.status) ? 'border-red-400/30 bg-red-400/10' :
                      'border-blue-400/30 bg-blue-400/10'
                    }`}>
                      <Truck className={`w-6 h-6 ${
                        pickup.status === 'completed' ? 'text-emerald-500' :
                        pickup.status === 'in_progress' ? 'text-purple-500' :
                        pickup.status === 'pending' ? 'text-amber-500' :
                        ['failed', 'cancelled'].includes(pickup.status) ? 'text-red-500' :
                        'text-blue-500'
                      }`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-mono text-xs text-ecotribe-primary font-bold">
                            {pickup.id?.slice(0, 8).toUpperCase()}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase">
                              {branchMap.get(pickup.branch_id || '') || '—'}
                            </span>
                          </div>
                        </div>
                        <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 border font-mono font-bold text-[10px] uppercase tracking-widest ${statusInfo.color}`}>
                          {statusInfo.icon}
                          {statusInfo.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-slate-200/60 dark:border-white/5">
                        <span className="flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono text-xs text-slate-500 dark:text-zinc-500">{assetCount} assets</span>
                        </span>
                        {pickup.preferred_date && (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-mono text-xs text-slate-500 dark:text-zinc-500">
                              {new Date(pickup.preferred_date).toLocaleDateString()}
                            </span>
                          </span>
                        )}
                        {pickup.pickup_location && (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-mono text-xs text-slate-500 dark:text-zinc-500 truncate max-w-[200px]">
                              {typeof pickup.pickup_location === 'string' ? pickup.pickup_location : pickup.pickup_location?.name || ''}
                            </span>
                          </span>
                        )}
                        <span className="font-mono text-xs text-slate-400 dark:text-zinc-600">
                          Created {new Date(pickup.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <Eye className="w-5 h-5 text-slate-300 dark:text-zinc-600 group-hover:text-ecotribe-primary transition-colors flex-shrink-0 mt-1" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center">
            <Truck className="w-12 h-12 text-slate-300 dark:text-zinc-700 mx-auto mb-4" />
            <p className="font-display font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wide mb-1">No pickups found</p>
            <p className="font-mono text-xs text-slate-400 dark:text-zinc-600">
              {searchQuery || statusFilter !== 'all' || branchFilter !== 'all' ? 'Try adjusting your filters.' : 'No pickup requests have been created yet.'}
            </p>
          </div>
        )}
      </motion.div>

      <InfiniteScrollTrigger hasNextPage={!!hasNextPage} isFetchingNextPage={isFetchingNextPage} fetchNextPage={fetchNextPage} />
      <InfiniteScrollInfo loadedCount={pickups.length} totalCount={totalPickups} />
    </div>
  );
}

export default EnterprisePickups;
