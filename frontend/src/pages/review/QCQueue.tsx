import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ClipboardCheck, Laptop, Clock, Search, Package, CheckCircle } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useInfiniteAssets, useUpdateAsset, useDebounce, useEnterprises } from '@/hooks';
import { useOptionalOpsEnterprise } from '@/contexts/OpsEnterpriseContext';
import { useToast } from '@/components/ui';
import { useUserRole } from '@/stores/authStoreApi';

export function QCQueue() {
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = useUserRole();
  const isSuperAdmin = userRole === 'super_admin';
  const updateAssetMutation = useUpdateAsset();
  const [activeTab, setActiveTab] = useState<'queue' | 'completed'>('queue');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 350);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [localEnterpriseId, setLocalEnterpriseId] = useState<string>('');
  const { addToast } = useToast();

  // Enterprise list for Super Admin local filter
  const { data: enterprisesData = [] } = useEnterprises();

  // Enterprise filter: Super Admin uses local dropdown, OPS Admin uses sidebar context
  const opsContext = useOptionalOpsEnterprise();
  const enterpriseFilter = useMemo(() => {
    // Super Admin: always use the local dropdown (OpsEnterpriseProvider wraps
    // super admin layout too, but the local dropdown is the intended control)
    if (isSuperAdmin) {
      return localEnterpriseId || undefined;
    }
    // OPS Admin: prefer sidebar enterprise selector, fall back to local
    const selectedEnterpriseId = opsContext?.selectedEnterpriseId ?? null;
    const isAllEnterprises = opsContext?.isAllEnterprises ?? true;
    if (!isAllEnterprises && selectedEnterpriseId) {
      return selectedEnterpriseId;
    }
    return localEnterpriseId || undefined;
  }, [isSuperAdmin, localEnterpriseId, opsContext?.selectedEnterpriseId, opsContext?.isAllEnterprises]);

  // Queue tab: two parallel streams (in_transit + facility_qc)
  const inTransitParams = useMemo(() => {
    const params: Record<string, string | undefined> = { status: 'in_transit', enterprise_id: enterpriseFilter };
    if (debouncedSearch) params.search = debouncedSearch;
    if (sortBy) params.sort_by = sortBy;
    return params;
  }, [enterpriseFilter, debouncedSearch, sortBy]);

  const facilityQCParams = useMemo(() => {
    const params: Record<string, string | undefined> = { status: 'facility_qc', enterprise_id: enterpriseFilter };
    if (debouncedSearch) params.search = debouncedSearch;
    if (sortBy) params.sort_by = sortBy;
    return params;
  }, [enterpriseFilter, debouncedSearch, sortBy]);

  // Completed tab: final_accepted + final_rejected
  const completedParams = useMemo(() => {
    const params: Record<string, string | undefined> = {
      statuses: 'final_accepted,final_rejected',
      enterprise_id: enterpriseFilter,
    };
    if (debouncedSearch) params.search = debouncedSearch;
    // Completed tab: sort by when QC was done (updated_at), not when asset was created
    params.sort_by = sortBy === 'newest' ? 'recently_updated' : 'oldest';
    return params;
  }, [enterpriseFilter, debouncedSearch, sortBy]);

  const {
    data: inTransitData,
    isFetching: isFetchingInTransit,
    isLoading: isLoadingInTransit,
    hasNextPage: hasMoreInTransit,
    fetchNextPage: fetchMoreInTransit,
    isFetchingNextPage: fetchingMoreInTransit,
  } = useInfiniteAssets(inTransitParams);

  const {
    data: facilityQCData,
    isFetching: isFetchingFacilityQC,
    isLoading: isLoadingFacilityQC,
    hasNextPage: hasMoreFacilityQC,
    fetchNextPage: fetchMoreFacilityQC,
    isFetchingNextPage: fetchingMoreFacilityQC,
  } = useInfiniteAssets(facilityQCParams);

  const {
    data: completedData,
    isFetching: isFetchingCompleted,
    isLoading: isLoadingCompleted,
    hasNextPage: hasMoreCompleted,
    fetchNextPage: fetchMoreCompleted,
    isFetchingNextPage: fetchingMoreCompleted,
  } = useInfiniteAssets(completedParams);

  // Flatten paginated results
  const inTransitAssets = useMemo(
    () => inTransitData?.pages.flatMap(p => p.data || []) ?? [],
    [inTransitData]
  );
  const facilityQCAssets = useMemo(
    () => facilityQCData?.pages.flatMap(p => p.data || []) ?? [],
    [facilityQCData]
  );
  const completedAssets = useMemo(
    () => completedData?.pages.flatMap(p => p.data || []) ?? [],
    [completedData]
  );
  const pendingAssets = useMemo(
    () => [...inTransitAssets, ...facilityQCAssets],
    [inTransitAssets, facilityQCAssets]
  );

  // Total counts from server pagination (accurate even if not all pages loaded)
  const inTransitTotal = inTransitData?.pages[0]?.pagination?.total ?? inTransitAssets.length;
  const facilityQCTotal = facilityQCData?.pages[0]?.pagination?.total ?? facilityQCAssets.length;

  // Background refetch indicator
  const isRefetchingQueue = (
    (isFetchingInTransit && !isLoadingInTransit && !fetchingMoreInTransit) ||
    (isFetchingFacilityQC && !isLoadingFacilityQC && !fetchingMoreFacilityQC)
  );
  const isRefetchingCompleted = isFetchingCompleted && !isLoadingCompleted && !fetchingMoreCompleted;
  const isRefetching = activeTab === 'queue' ? isRefetchingQueue : isRefetchingCompleted;

  // Mark asset as arrived at facility (in_transit → facility_qc)
  const markAsArrived = async (assetId: string) => {
    try {
      await updateAssetMutation.mutateAsync({
        assetId,
        updates: { status: 'facility_qc' },
      });
      addToast({ type: 'success', title: 'Asset Arrived', message: 'Asset marked as arrived at facility' });
    } catch (error) {
      console.error('Failed to mark asset as arrived:', error);
      addToast({ type: 'error', title: 'Update Failed', message: 'Failed to update asset status. Please try again.' });
    }
  };

  // Active asset list — sorting is handled server-side via sort_by param
  const filteredAssets = useMemo(() => {
    return activeTab === 'queue' ? pendingAssets : completedAssets;
  }, [pendingAssets, completedAssets, activeTab]);

  const allAssets = activeTab === 'queue' ? pendingAssets : completedAssets;
  const isLoading = activeTab === 'queue' ? (isLoadingInTransit || isLoadingFacilityQC) : isLoadingCompleted;

  // Load more for queue (two streams) or completed (one stream)
  const hasMore = activeTab === 'queue' ? (hasMoreInTransit || hasMoreFacilityQC) : hasMoreCompleted;
  const isFetchingMore = activeTab === 'queue' ? (fetchingMoreInTransit || fetchingMoreFacilityQC) : fetchingMoreCompleted;
  const loadMore = () => {
    if (activeTab === 'queue') {
      if (hasMoreInTransit) fetchMoreInTransit();
      if (hasMoreFacilityQC) fetchMoreFacilityQC();
    } else {
      if (hasMoreCompleted) fetchMoreCompleted();
    }
  };

  const getDecisionBadge = (status: string) => {
    if (status === 'final_accepted') {
      return (
        <span className="px-3 py-1.5 border border-emerald-400/30 bg-emerald-400/10 font-mono font-bold text-xs text-emerald-400 uppercase tracking-widest">
          Accepted
        </span>
      );
    }
    if (status === 'final_rejected') {
      return (
        <span className="px-3 py-1.5 border border-red-400/30 bg-red-400/10 font-mono font-bold text-xs text-red-400 uppercase tracking-widest">
          Rejected
        </span>
      );
    }
    return null;
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
            Facility QC
          </span>
          <h1 className="font-brand font-bold text-3xl text-slate-900 dark:text-white uppercase tracking-tight">
            QC Queue
          </h1>
          <p className="font-display text-zinc-500 text-sm mt-2 uppercase tracking-wide">
            {activeTab === 'queue'
              ? `${filteredAssets.length} devices awaiting inspection`
              : `${filteredAssets.length} completed inspections`}
          </p>
        </motion.div>
      </div>

      {/* Quick Stats — display only, no click-to-filter */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 gap-4"
      >
        <div className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-5">
          <p className="font-mono text-xs text-zinc-500 uppercase mb-2">In Transit</p>
          <p className="font-brand font-bold text-3xl text-amber-400">
            {inTransitTotal}
          </p>
        </div>
        <div className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-5">
          <p className="font-mono text-xs text-zinc-500 uppercase mb-2">Ready for QC</p>
          <p className="font-brand font-bold text-3xl text-emerald-400">
            {facilityQCTotal}
          </p>
        </div>
      </motion.div>

      {/* Tab Toggle + Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        {/* Tab toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-5 py-2.5 font-mono font-bold text-xs uppercase tracking-widest transition-all border ${
              activeTab === 'queue'
                ? 'border-ecotribe-primary bg-ecotribe-primary/10 text-ecotribe-primary'
                : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-zinc-400 hover:border-slate-300 dark:hover:border-white/20'
            }`}
          >
            Queue
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-5 py-2.5 font-mono font-bold text-xs uppercase tracking-widest transition-all border ${
              activeTab === 'completed'
                ? 'border-ecotribe-primary bg-ecotribe-primary/10 text-ecotribe-primary'
                : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-zinc-400 hover:border-slate-300 dark:hover:border-white/20'
            }`}
          >
            Completed
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by brand, model, or serial..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:border-ecotribe-primary focus:outline-none transition-colors"
          />
        </div>

        {isSuperAdmin && (
          <select
            value={localEnterpriseId}
            onChange={(e) => setLocalEnterpriseId(e.target.value)}
            className="px-4 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest focus:border-ecotribe-primary focus:outline-none transition-colors"
          >
            <option value="">All Enterprises</option>
            {enterprisesData.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        )}

        {/* Sort buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('newest')}
            className={`interactive px-4 py-3 border font-mono font-bold text-xs uppercase tracking-widest transition-all ${
              sortBy === 'newest'
                ? 'border-ecotribe-primary bg-ecotribe-primary/10 text-ecotribe-primary'
                : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-zinc-400 hover:border-slate-300 dark:hover:border-white/20'
            }`}
          >
            Newest
          </button>
          <button
            onClick={() => setSortBy('oldest')}
            className={`interactive px-4 py-3 border font-mono font-bold text-xs uppercase tracking-widest transition-all ${
              sortBy === 'oldest'
                ? 'border-ecotribe-primary bg-ecotribe-primary/10 text-ecotribe-primary'
                : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-zinc-400 hover:border-slate-300 dark:hover:border-white/20'
            }`}
          >
            Oldest
          </button>
        </div>
      </motion.div>

      {/* Asset List */}
      {filteredAssets.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: isRefetching ? 0.6 : 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="relative border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]"
        >
          {isRefetching && (
            <div className="absolute top-3 right-3 z-10">
              <div className="w-4 h-4 border-2 border-ecotribe-primary/30 border-t-ecotribe-primary rounded-full animate-spin" />
            </div>
          )}
          <div className="divide-y divide-slate-200 dark:divide-white/5">
            {filteredAssets.map((asset, idx) => (
              <motion.div
                key={asset.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                onClick={activeTab === 'completed' ? () => navigate(`${location.pathname}/${asset.id}`) : undefined}
                className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors ${activeTab === 'completed' ? 'cursor-pointer' : ''}`}
              >
                <div className="flex items-center gap-3 sm:gap-5 flex-1 min-w-0">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-center flex-shrink-0">
                    <Laptop className="w-6 h-6 sm:w-8 sm:h-8 text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white uppercase truncate">
                      {asset.brand} {asset.model}
                    </h3>
                    <p className="font-mono text-xs text-zinc-500">S/N: {asset.serial_number}</p>
                    <div className="flex items-center gap-4 mt-1 sm:mt-2">
                      <span className="font-mono text-xs text-zinc-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {activeTab === 'completed' && asset.updated_at
                          ? new Date(asset.updated_at).toLocaleDateString()
                          : new Date(asset.created_at).toLocaleDateString()}
                      </span>
                      {asset.enterprise_name && (
                        <span className="font-mono text-xs text-zinc-600 truncate">
                          {asset.enterprise_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 self-end sm:self-auto">
                  {activeTab === 'queue' ? (
                    <>
                      <span className={`px-3 py-1.5 border font-mono font-bold text-xs uppercase tracking-widest ${
                        asset.status === 'in_transit'
                          ? 'border-amber-400/30 bg-amber-400/10 text-amber-400'
                          : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400'
                      }`}>
                        {asset.status === 'in_transit' ? (
                          <span className="flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            In Transit
                          </span>
                        ) : (
                          'At Facility'
                        )}
                      </span>
                      {asset.status === 'in_transit' ? (
                        <button
                          onClick={() => markAsArrived(asset.id)}
                          disabled={updateAssetMutation.isPending}
                          className="interactive px-4 sm:px-5 py-3 sm:py-2.5 font-mono font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 bg-amber-500 text-white hover:bg-amber-400 disabled:opacity-50"
                        >
                          {updateAssetMutation.isPending ? 'Updating...' : 'Mark Arrived'}
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate(`${location.pathname}/${asset.id}`)}
                          className="interactive px-4 sm:px-5 py-3 sm:py-2.5 font-mono font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 bg-emerald-500 text-white hover:bg-emerald-400"
                        >
                          Inspect
                          <ClipboardCheck className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  ) : (
                    getDecisionBadge(asset.status)
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Load more button */}
          {hasMore && (
            <div className="p-4 border-t border-slate-200 dark:border-white/10 text-center">
              <button
                onClick={loadMore}
                disabled={isFetchingMore}
                className="interactive px-6 py-2.5 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-all disabled:opacity-50"
              >
                {isFetchingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </motion.div>
      ) : !isLoading ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] py-20 text-center"
        >
          <div className="w-20 h-20 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-center mx-auto mb-6">
            <ClipboardCheck className="w-10 h-10 text-zinc-600" />
          </div>
          <h3 className="font-brand font-bold text-xl text-zinc-500 uppercase tracking-tight mb-2">
            {searchQuery ? 'No Matches Found' : activeTab === 'queue' ? 'Queue Empty' : 'No Completed Inspections'}
          </h3>
          <p className="font-display text-zinc-600 max-w-md mx-auto">
            {searchQuery
              ? 'Try adjusting your search terms.'
              : activeTab === 'queue'
              ? 'There are no devices awaiting facility QC.'
              : 'No facility inspections have been completed yet.'}
          </p>
        </motion.div>
      ) : null}
    </div>
  );
}

export default QCQueue;
