import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Laptop,
  Search,
  Eye,
  Building2,
} from 'lucide-react';
import { useInfiniteAssets, useDebounce } from '@/hooks';
import { InfiniteScrollTrigger, InfiniteScrollInfo } from '@/components/ui';
import { useOpsEnterprise } from '@/contexts/OpsEnterpriseContext';
import { assetStatusLabels, type AssetStatus } from '@/types/asset';

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Pending Review' },
  { value: 'qc', label: 'Pending QC' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'payout', label: 'Pending Payout' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
];

export function OpsAssets() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { selectedEnterpriseId, isAllEnterprises, enterprises, selectedEnterprise } = useOpsEnterprise();
  const basePath = location.pathname.startsWith('/super') ? '/super' : '/ops';

  const initialStatus = searchParams.get('status') || 'all';
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 350);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'value'>('newest');

  // Map status filter groups to actual status values for server-side filtering
  const STATUS_GROUP_MAP: Record<string, string> = {
    in_progress: 'assigned,check_in_started,submitted,remote_review',
    review: 'submitted,remote_review',
    qc: 'in_transit,facility_qc,conditionally_accepted',
    accepted: 'conditionally_accepted,final_accepted',
    payout: 'payout_pending',
    completed: 'final_accepted,completed',
    rejected: 'remote_rejected,final_rejected',
  };

  // Build API params for server-side filtering + sorting
  const apiParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (debouncedSearch) params.search = debouncedSearch;
    if (!isAllEnterprises && selectedEnterpriseId) params.enterprise_id = selectedEnterpriseId;
    if (statusFilter !== 'all' && STATUS_GROUP_MAP[statusFilter]) {
      params.statuses = STATUS_GROUP_MAP[statusFilter];
    }
    if (sortBy) params.sort_by = sortBy;
    return params;
  }, [debouncedSearch, isAllEnterprises, selectedEnterpriseId, statusFilter, sortBy]);

  // Stable params for unfiltered total count (not affected by search)
  const statsParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (!isAllEnterprises && selectedEnterpriseId) params.enterprise_id = selectedEnterpriseId;
    return params;
  }, [isAllEnterprises, selectedEnterpriseId]);

  // Separate query for stable stats (unaffected by search/filters)
  const { data: statsData } = useInfiniteAssets(statsParams, 1);
  const stableTotalCount = statsData?.pages[0]?.pagination?.total ?? 0;
  const stableTotalValue = statsData?.pages[0]?.aggregates?.total_value ?? 0;

  // V4: Infinite scroll hook — loads assets via REST API with server-side sort
  const {
    data,
    isLoading,
    isFetching,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteAssets(apiParams);

  // Flatten all loaded pages into a single array
  const allAssets = useMemo(() => data?.pages.flatMap(p => p.data || []) ?? [], [data]);
  const totalCount = data?.pages[0]?.pagination?.total ?? 0;

  // Background refetch indicator (true when sort/filter changes trigger a server re-fetch)
  const isRefetching = isFetching && !isLoading && !isFetchingNextPage;

  // Optimistic client-side sort for instant feedback while server re-fetches
  const filteredAssets = useMemo(() => {
    if (!isRefetching) return allAssets;
    return [...allAssets].sort((a, b) => {
      if (sortBy === 'value') {
        return (Number(b.final_price) || Number(b.base_price) || 0) - (Number(a.final_price) || Number(a.base_price) || 0);
      }
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortBy === 'oldest' ? dateA - dateB : dateB - dateA;
    });
  }, [allAssets, sortBy, isRefetching]);

  const getStatusColor = (status: AssetStatus) => {
    const colorMap: Record<string, string> = {
      // Early / pre-submission — neutral gray
      pending_assignment: 'border-zinc-400/30 bg-zinc-400/10 text-zinc-400',
      assigned:           'border-zinc-400/30 bg-zinc-400/10 text-zinc-400',
      check_in_started:   'border-zinc-400/30 bg-zinc-400/10 text-zinc-400',
      // Awaiting review — amber
      submitted:          'border-amber-400/30 bg-amber-400/10 text-amber-400',
      remote_review:      'border-amber-400/30 bg-amber-400/10 text-amber-400',
      // Verified / accepted — emerald
      conditionally_accepted: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400',
      final_accepted:     'border-emerald-400/30 bg-emerald-400/10 text-emerald-400',
      completed:          'border-emerald-400/30 bg-emerald-400/10 text-emerald-400',
      // Rejected — red
      remote_rejected:    'border-red-400/30 bg-red-400/10 text-red-400',
      final_rejected:     'border-red-400/30 bg-red-400/10 text-red-400',
      // Disputed — orange
      disputed:           'border-orange-400/30 bg-orange-400/10 text-orange-400',
      // Pickup flow — violet
      ready_for_pickup:   'border-violet-400/30 bg-violet-400/10 text-violet-400',
      pickup_requested:   'border-violet-400/30 bg-violet-400/10 text-violet-400',
      pickup_scheduled:   'border-violet-400/30 bg-violet-400/10 text-violet-400',
      picked_up:          'border-violet-400/30 bg-violet-400/10 text-violet-400',
      pickup_failed_qc:   'border-rose-400/30 bg-rose-400/10 text-rose-400',
      // Logistics / warehouse — blue
      in_transit:         'border-blue-400/30 bg-blue-400/10 text-blue-400',
      facility_qc:        'border-blue-400/30 bg-blue-400/10 text-blue-400',
      // Payout — cyan
      payout_pending:     'border-cyan-400/30 bg-cyan-400/10 text-cyan-400',
    };
    return colorMap[status] || 'border-zinc-400/30 bg-zinc-400/10 text-zinc-400';
  };

  const getEnterpriseName = (enterpriseId?: string) => {
    if (!enterpriseId) return 'Unknown';
    const enterprise = enterprises.find(e => e.id === enterpriseId);
    return enterprise?.name || 'Unknown';
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
            Asset Management
          </span>
          <h1 className="font-brand font-bold text-3xl text-slate-900 dark:text-white uppercase tracking-tight">
            All Assets
          </h1>
          <p className="font-display text-slate-500 dark:text-white/50 text-sm mt-2 uppercase tracking-wide">
            {stableTotalCount} assets {isAllEnterprises ? 'across all enterprises' : `for ${selectedEnterprise?.name || 'selected enterprise'}`}
          </p>
        </motion.div>
      </div>

      {/* Summary Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 gap-4"
      >
        <div className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Laptop className="w-4 h-4 text-ecotribe-primary" />
            <span className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Total Assets</span>
          </div>
          <p className="font-brand font-bold text-2xl text-ecotribe-primary">
            {stableTotalCount}
          </p>
        </div>
        <div className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Laptop className="w-4 h-4 text-ecotribe-primary" />
            <span className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Total Value</span>
          </div>
          <p className="font-brand font-bold text-2xl text-ecotribe-primary">
            ₹{(stableTotalValue / 1000).toFixed(0)}K
          </p>
        </div>
      </motion.div>

      {/* Filters Row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        {/* Search and Enterprise Filter */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-white/50" />
            <input
              type="text"
              placeholder="Search by brand, model, or serial..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none transition-colors"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-4 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display focus:border-ecotribe-primary focus:outline-none transition-colors"
          >
            <option value="newest" className="bg-zinc-900">Newest First</option>
            <option value="oldest" className="bg-zinc-900">Oldest First</option>
            <option value="value" className="bg-zinc-900">Highest Value</option>
          </select>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`interactive px-4 py-2 border font-mono font-bold text-xs uppercase tracking-widest transition-all ${
                statusFilter === filter.value
                  ? 'border-ecotribe-primary bg-ecotribe-primary/10 text-ecotribe-primary'
                  : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-500 dark:text-white/50 hover:border-slate-300 dark:hover:border-white/20'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Assets Table (desktop) / Cards (mobile) */}
      {isLoading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] py-20 text-center"
        >
          <div className="w-8 h-8 border-2 border-ecotribe-primary/30 border-t-ecotribe-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest">
            Loading assets...
          </p>
        </motion.div>
      ) : filteredAssets.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: isRefetching ? 0.6 : 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="relative"
        >
          {isRefetching && (
            <div className="absolute top-3 right-3 z-10">
              <div className="w-4 h-4 border-2 border-ecotribe-primary/30 border-t-ecotribe-primary rounded-full animate-spin" />
            </div>
          )}
          {/* Mobile Card Layout */}
          <div className="md:hidden space-y-3">
            {filteredAssets.map((asset, idx) => (
              <motion.div
                key={asset.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.02 * Math.min(idx, 10) }}
                onClick={() => navigate(`${basePath}/assets/${asset.id}`)}
                className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-4 cursor-pointer active:scale-[0.98] transition-all"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-center flex-shrink-0">
                    <Laptop className="w-5 h-5 text-slate-500 dark:text-white/50" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-slate-900 dark:text-white truncate">{asset.brand} {asset.model}</p>
                    <p className="font-mono text-xs text-slate-500 dark:text-white/50">{asset.serial_number}</p>
                  </div>
                  {asset.grade && (
                    <span className={`font-brand font-bold text-lg flex-shrink-0 ${
                      asset.grade === 'A' ? 'text-emerald-400' :
                      asset.grade === 'B' ? 'text-blue-400' :
                      asset.grade === 'C' ? 'text-amber-400' :
                      'text-red-400'
                    }`}>
                      {asset.grade}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className={`px-2 py-1 border font-mono font-bold text-[10px] uppercase tracking-widest ${getStatusColor(asset.status as any)}`}>
                    {(assetStatusLabels as Record<string, string>)[asset.status]}
                  </span>
                  <span className="font-mono text-sm font-bold text-ecotribe-primary">
                    ₹{(Number(asset.final_price) || Number(asset.base_price) || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs">
                  <span className="font-mono text-slate-500 dark:text-white/50 flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {getEnterpriseName(asset.enterprise_id)}
                  </span>
                  <span className="font-mono text-slate-500 dark:text-white/50">
                    {new Date(asset.created_at).toLocaleDateString()}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden md:block border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10">
                    <th className="p-4 text-left font-mono font-bold text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest">
                      Device
                    </th>
                    <th className="p-4 text-left font-mono font-bold text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest">
                      Enterprise
                    </th>
                    <th className="p-4 text-left font-mono font-bold text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest">
                      Status
                    </th>
                    <th className="p-4 text-left font-mono font-bold text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest">
                      Grade
                    </th>
                    <th className="p-4 text-left font-mono font-bold text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest">
                      Value
                    </th>
                    <th className="p-4 text-left font-mono font-bold text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest">
                      Date
                    </th>
                    <th className="p-4 text-right font-mono font-bold text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {filteredAssets.map((asset, idx) => (
                    <motion.tr
                      key={asset.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.02 * Math.min(idx, 10) }}
                      className="hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-center">
                            <Laptop className="w-5 h-5 text-slate-500 dark:text-white/50" />
                          </div>
                          <div>
                            <p className="font-display font-bold text-slate-900 dark:text-white">{asset.brand} {asset.model}</p>
                            <p className="font-mono text-xs text-slate-500 dark:text-white/50">{asset.serial_number}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-500 dark:text-white/50" />
                          <span className="font-display text-sm text-slate-500 dark:text-white/50">
                            {getEnterpriseName(asset.enterprise_id)}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 border font-mono font-bold text-[10px] uppercase tracking-widest ${getStatusColor(asset.status as any)}`}>
                          {(assetStatusLabels as Record<string, string>)[asset.status]}
                        </span>
                      </td>
                      <td className="p-4">
                        {asset.grade ? (
                          <span className={`font-brand font-bold text-lg ${
                            asset.grade === 'A' ? 'text-emerald-400' :
                            asset.grade === 'B' ? 'text-blue-400' :
                            asset.grade === 'C' ? 'text-amber-400' :
                            'text-red-400'
                          }`}>
                            {asset.grade}
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-slate-500 dark:text-white/50">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <p className="font-mono text-ecotribe-primary">
                          ₹{(Number(asset.final_price) || Number(asset.base_price) || 0).toLocaleString()}
                        </p>
                      </td>
                      <td className="p-4">
                        <p className="font-mono text-xs text-slate-500 dark:text-white/50">
                          {new Date(asset.created_at).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => navigate(`${basePath}/assets/${asset.id}`)}
                          className="interactive px-3 py-1.5 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-500 dark:text-white/50 font-mono font-bold text-xs uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white transition-all inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] py-20 text-center"
        >
          <div className="w-20 h-20 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-center mx-auto mb-6">
            <Laptop className="w-10 h-10 text-slate-500 dark:text-white/50" />
          </div>
          <h3 className="font-brand font-bold text-xl text-slate-500 dark:text-white/50 uppercase tracking-tight mb-2">
            No Assets Found
          </h3>
          <p className="font-display text-slate-500 dark:text-white/50 max-w-md mx-auto">
            {!isAllEnterprises && selectedEnterprise
              ? `No assets found for ${selectedEnterprise.name}. Try selecting "All Enterprises" or a different enterprise.`
              : 'Try adjusting your filters or search terms.'}
          </p>
        </motion.div>
      )}

      {/* Infinite Scroll Controls */}
      <InfiniteScrollInfo loadedCount={allAssets.length} totalCount={totalCount} />
      {debouncedSearch && totalCount !== stableTotalCount && (
        <p className="text-center font-mono text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest">
          Showing {totalCount} result{totalCount !== 1 ? 's' : ''} for &quot;{debouncedSearch}&quot;
        </p>
      )}
      <InfiniteScrollTrigger
        hasNextPage={!!hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />

    </div>
  );
}

export default OpsAssets;
