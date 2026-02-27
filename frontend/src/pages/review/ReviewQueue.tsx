import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, Laptop, Clock, Search } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useInfiniteAssets, useDebounce } from '@/hooks';
import { InfiniteScrollTrigger, InfiniteScrollInfo } from '@/components/ui';

export function ReviewQueue() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'queue' | 'completed'>('queue');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 350);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  // Queue tab: submitted assets
  const queueParams = useMemo(() => {
    const params: Record<string, string | undefined> = { status: 'submitted' };
    if (debouncedSearch) params.search = debouncedSearch;
    if (sortBy) params.sort_by = sortBy;
    return params;
  }, [debouncedSearch, sortBy]);

  // Completed tab: conditionally_accepted + remote_rejected assets
  const completedParams = useMemo(() => {
    const params: Record<string, string | undefined> = {
      statuses: 'conditionally_accepted,remote_rejected',
    };
    if (debouncedSearch) params.search = debouncedSearch;
    if (sortBy) params.sort_by = sortBy;
    return params;
  }, [debouncedSearch, sortBy]);

  const {
    data: queueData,
    isLoading: isLoadingQueue,
    isFetching: isFetchingQueue,
    hasNextPage: hasNextQueue,
    isFetchingNextPage: isFetchingNextQueue,
    fetchNextPage: fetchNextQueue,
  } = useInfiniteAssets(queueParams);

  const {
    data: completedData,
    isLoading: isLoadingCompleted,
    isFetching: isFetchingCompleted,
    hasNextPage: hasNextCompleted,
    isFetchingNextPage: isFetchingNextCompleted,
    fetchNextPage: fetchNextCompleted,
  } = useInfiniteAssets(completedParams);

  const queueAssets = useMemo(() => queueData?.pages.flatMap(p => p.data || []) ?? [], [queueData]);
  const completedAssets = useMemo(() => completedData?.pages.flatMap(p => p.data || []) ?? [], [completedData]);

  const queueTotal = queueData?.pages[0]?.pagination?.total;
  const completedTotal = completedData?.pages[0]?.pagination?.total;

  const isLoading = activeTab === 'queue' ? isLoadingQueue : isLoadingCompleted;
  const allAssets = activeTab === 'queue' ? queueAssets : completedAssets;
  const totalCount = activeTab === 'queue' ? queueTotal : completedTotal;
  const hasNextPage = activeTab === 'queue' ? hasNextQueue : hasNextCompleted;
  const isFetchingNextPage = activeTab === 'queue' ? isFetchingNextQueue : isFetchingNextCompleted;
  const fetchNextPage = activeTab === 'queue' ? fetchNextQueue : fetchNextCompleted;
  const isFetching = activeTab === 'queue' ? isFetchingQueue : isFetchingCompleted;

  // Background refetch indicator
  const isRefetching = isFetching && !isLoading && !isFetchingNextPage;

  // Optimistic client-side sort for instant feedback while server re-fetches
  const filteredAssets = useMemo(() => {
    if (!isRefetching) return allAssets;
    return [...allAssets].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortBy === 'oldest' ? dateA - dateB : dateB - dateA;
    });
  }, [allAssets, sortBy, isRefetching]);

  const getDecisionBadge = (status: string) => {
    if (status === 'conditionally_accepted') {
      return (
        <span className="px-3 py-1.5 border border-emerald-400/30 bg-emerald-400/10 font-mono font-bold text-xs text-emerald-400 uppercase tracking-widest">
          Accepted
        </span>
      );
    }
    if (status === 'remote_rejected') {
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
            Remote Review
          </span>
          <h1 className="font-brand font-bold text-3xl text-slate-900 dark:text-white uppercase tracking-tight">
            Review Queue
          </h1>
          <p className="font-display text-zinc-500 text-sm mt-2 uppercase tracking-wide">
            {activeTab === 'queue'
              ? `${totalCount ?? filteredAssets.length} devices pending review`
              : `${totalCount ?? filteredAssets.length} completed reviews`}
          </p>
        </motion.div>
      </div>

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
                transition={{ delay: 0.03 * Math.min(idx, 10) }}
                onClick={activeTab === 'completed' ? () => navigate(`/review/queue/${asset.id}`) : undefined}
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
                        {new Date(asset.created_at).toLocaleDateString()}
                      </span>
                      {asset.enterprises?.name && (
                        <span className="font-mono text-xs text-zinc-600 truncate">
                          {asset.enterprises.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 self-end sm:self-auto">
                  {activeTab === 'queue' ? (
                    <>
                      <span className="px-3 py-1.5 border border-blue-400/30 bg-blue-400/10 font-mono font-bold text-xs text-blue-400 uppercase tracking-widest hidden sm:inline">
                        Pending
                      </span>
                      <button
                        onClick={() => navigate(`/review/queue/${asset.id}`)}
                        className="interactive px-5 py-3 sm:py-2.5 bg-blue-500 text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-blue-400 transition-all flex items-center gap-2"
                      >
                        Review
                        <Eye className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    getDecisionBadge(asset.status)
                  )}
                </div>
              </motion.div>
            ))}
          </div>
          <InfiniteScrollTrigger
            hasNextPage={!!hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
          />
          <InfiniteScrollInfo
            loadedCount={allAssets.length}
            totalCount={totalCount}
          />
        </motion.div>
      ) : !isLoading ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] py-20 text-center"
        >
          <div className="w-20 h-20 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-center mx-auto mb-6">
            <Eye className="w-10 h-10 text-zinc-600" />
          </div>
          <h3 className="font-brand font-bold text-xl text-zinc-500 uppercase tracking-tight mb-2">
            {searchQuery ? 'No Matches Found' : activeTab === 'queue' ? 'Queue Empty' : 'No Completed Reviews'}
          </h3>
          <p className="font-display text-zinc-600 max-w-md mx-auto">
            {searchQuery
              ? 'Try adjusting your search terms.'
              : activeTab === 'queue'
              ? 'There are no devices waiting for remote review.'
              : 'No reviews have been completed yet.'}
          </p>
        </motion.div>
      ) : null}
    </div>
  );
}

export default ReviewQueue;
