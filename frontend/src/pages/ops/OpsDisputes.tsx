import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Search,
  MessageSquare,
  CheckCircle,
  XCircle,
  X,
  Clock,
  Laptop,
  ArrowRight,
  Eye,
  Send,
  Loader2
} from 'lucide-react';
import { useAuth, useAllAssets, useInfiniteDisputes, useResolveDispute, useApiError } from '@/hooks';
import { InfiniteScrollTrigger, InfiniteScrollInfo } from '@/components/ui';
import { useOpsEnterprise } from '@/contexts/OpsEnterpriseContext';

type DisputeFilter = 'all' | 'pending' | 'resolved';

export function OpsDisputes() {
  const { user } = useAuth();
  const { data: assets = [] } = useAllAssets();
  const resolveDisputeMutation = useResolveDispute();
  const { handleError, showSuccess } = useApiError();
  const { selectedEnterpriseId, isAllEnterprises, enterprises, selectedEnterprise } = useOpsEnterprise();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DisputeFilter>('pending');
  const [selectedDispute, setSelectedDispute] = useState<string | null>(null);
  const [resolution, setResolution] = useState<'overturned' | 'upheld' | null>(null);
  const [resolverNotes, setResolverNotes] = useState('');

  // Infinite scroll disputes — pass status filter to server when applicable
  const apiParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (statusFilter === 'pending') params.status = 'pending';
    // 'resolved' and 'all' are handled client-side since there's no single "resolved" status value
    return params;
  }, [statusFilter]);

  const {
    data: disputeData,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteDisputes(apiParams);

  const rawDisputes = useMemo(
    () => disputeData?.pages.flatMap(p => p.data || []) ?? [],
    [disputeData]
  );

  // Map API disputes to the format used in this page
  const disputes = rawDisputes.map(d => ({
    id: d.id,
    assetId: d.asset_id,
    type: d.reason || 'unknown',
    itAdminNotes: d.description || d.reason || '',
    resolution: d.resolution,
    resolverNotes: d.resolver_notes,
    resolvedAt: d.resolved_at,
    createdAt: d.created_at,
  }));

  // Filter disputes (respects global enterprise filter)
  const filteredDisputes = disputes
    .filter(d => {
      // Apply global enterprise filter via associated asset
      const asset = assets.find(a => a.id === d.assetId);
      if (!isAllEnterprises && asset?.enterprise_id !== selectedEnterpriseId) return false;
      // Client-side status filter for 'resolved' (server handles 'pending')
      if (statusFilter === 'resolved') return !!d.resolution;
      if (statusFilter === 'all') return true;
      // 'pending' is handled server-side, but double-check client-side
      if (statusFilter === 'pending') return !d.resolution;
      return true;
    })
    .filter(d => {
      if (!searchQuery) return true;
      const asset = assets.find(a => a.id === d.assetId);
      if (!asset) return d.itAdminNotes.toLowerCase().includes(searchQuery.toLowerCase());
      return (
        (asset.brand || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (asset.model || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (asset.serial_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.itAdminNotes.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });

  const getAsset = (assetId: string) => assets.find(a => a.id === assetId);

  const getEnterpriseName = (enterpriseId?: string) => {
    if (!enterpriseId) return 'Unknown';
    const enterprise = enterprises.find(e => e.id === enterpriseId);
    return enterprise?.name || 'Unknown';
  };

  const handleResolve = async () => {
    if (!selectedDispute || !resolution || !user) return;

    try {
      await resolveDisputeMutation.mutateAsync({
        disputeId: selectedDispute,
        resolution,
        resolved_by: user.id,
        resolver_notes: resolverNotes || undefined,
      });
      showSuccess('Dispute Resolved', `Dispute has been ${resolution} successfully`);
      setSelectedDispute(null);
      setResolution(null);
      setResolverNotes('');
    } catch (error) {
      handleError(error, 'Resolving dispute');
    }
  };

  const selectedDisputeData = selectedDispute ? disputes.find(d => d.id === selectedDispute) : null;
  const selectedAsset = selectedDisputeData ? getAsset(selectedDisputeData.assetId) : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-ecotribe-primary animate-spin mx-auto mb-4" />
          <p className="font-mono text-xs text-zinc-500 uppercase tracking-widest">
            Loading disputes...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-2">
            Dispute Management
          </span>
          <h1 className="font-brand font-bold text-3xl text-slate-900 dark:text-white uppercase tracking-tight">
            Disputes
          </h1>
          <p className="font-display text-slate-500 dark:text-white/50 text-sm mt-2 uppercase tracking-wide">
            {isAllEnterprises ? 'Review and resolve asset disputes' : `Disputes for ${selectedEnterprise?.name || 'selected enterprise'}`}
          </p>
        </motion.div>
      </div>

      {/* Stats - respects enterprise filter */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4"
      >
        {(() => {
          // Get enterprise-filtered disputes for stats
          const enterpriseFilteredDisputes = disputes.filter(d => {
            const asset = assets.find(a => a.id === d.assetId);
            return isAllEnterprises || asset?.enterprise_id === selectedEnterpriseId;
          });
          return (
            <>
              <div className="border border-amber-400/30 bg-amber-400/5 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Pending</span>
                </div>
                <p className="font-brand font-bold text-3xl text-amber-400">
                  {enterpriseFilteredDisputes.filter(d => !d.resolution).length}
                </p>
              </div>

              <div className="border border-emerald-400/30 bg-emerald-400/5 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Overturned</span>
                </div>
                <p className="font-brand font-bold text-3xl text-emerald-400">
                  {enterpriseFilteredDisputes.filter(d => d.resolution === 'overturned').length}
                </p>
              </div>

              <div className="border border-red-400/30 bg-red-400/5 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Upheld</span>
                </div>
                <p className="font-brand font-bold text-3xl text-red-400">
                  {enterpriseFilteredDisputes.filter(d => d.resolution === 'upheld').length}
                </p>
              </div>
            </>
          );
        })()}
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-white/50" />
          <input
            type="text"
            placeholder="Search disputes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'pending', 'resolved'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`interactive px-4 py-3 border font-mono font-bold text-xs uppercase tracking-widest transition-all ${
                statusFilter === filter
                  ? 'border-ecotribe-primary bg-ecotribe-primary/10 text-ecotribe-primary'
                  : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-500 dark:text-white/50 hover:border-slate-300 dark:hover:border-white/20'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Disputes List */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          {filteredDisputes.length > 0 ? (
            <>
              {filteredDisputes.map((dispute, idx) => {
                const asset = getAsset(dispute.assetId);
                const isSelected = selectedDispute === dispute.id;

                return (
                  <motion.div
                    key={dispute.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * Math.min(idx, 10) }}
                    onClick={() => setSelectedDispute(prev => prev === dispute.id ? null : dispute.id)}
                    className={`border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-ecotribe-primary bg-ecotribe-primary/5'
                        : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 border flex items-center justify-center flex-shrink-0 ${
                          dispute.resolution
                            ? dispute.resolution === 'overturned'
                              ? 'border-emerald-400/30 bg-emerald-400/10'
                              : 'border-red-400/30 bg-red-400/10'
                            : 'border-amber-400/30 bg-amber-400/10'
                        }`}>
                          <AlertTriangle className={`w-6 h-6 ${
                            dispute.resolution
                              ? dispute.resolution === 'overturned'
                                ? 'text-emerald-400'
                                : 'text-red-400'
                              : 'text-amber-400'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-display font-bold text-slate-900 dark:text-white uppercase">
                                {asset ? `${asset.brand} ${asset.model}` : 'Unknown Asset'}
                              </p>
                              <p className="font-mono text-xs text-slate-500 dark:text-white/50">
                                {asset?.serial_number || dispute.assetId}
                              </p>
                            </div>
                            <span className={`flex-shrink-0 px-2 py-1 border font-mono font-bold text-[10px] uppercase tracking-widest ${
                              dispute.resolution
                                ? dispute.resolution === 'overturned'
                                  ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400'
                                  : 'border-red-400/30 bg-red-400/10 text-red-400'
                                : 'border-amber-400/30 bg-amber-400/10 text-amber-400'
                            }`}>
                              {dispute.resolution || 'Pending'}
                            </span>
                          </div>
                          <p className="font-display text-sm text-slate-500 dark:text-white/50 mt-2 line-clamp-2">
                            {dispute.itAdminNotes}
                          </p>
                          <div className="flex items-center gap-4 mt-3 text-xs font-mono text-slate-500 dark:text-white/50">
                            <span>Type: {dispute.type}</span>
                            <span>{new Date(dispute.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              <InfiniteScrollTrigger hasNextPage={!!hasNextPage} isFetchingNextPage={isFetchingNextPage} fetchNextPage={fetchNextPage} />
              <InfiniteScrollInfo loadedCount={filteredDisputes.length} totalCount={disputeData?.pages[0]?.pagination?.total} />
            </>
          ) : (
            <div className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] py-16 text-center">
              <div className="w-16 h-16 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-slate-500 dark:text-white/50" />
              </div>
              <h3 className="font-brand font-bold text-lg text-slate-500 dark:text-white/50 uppercase mb-2">
                No Disputes Found
              </h3>
              <p className="font-display text-sm text-slate-500 dark:text-white/50">
                {searchQuery ? 'Try adjusting your search.' : 'All disputes have been resolved.'}
              </p>
            </div>
          )}
        </motion.div>

        {/* Resolution Panel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:sticky lg:top-4 h-fit"
        >
          {selectedDisputeData ? (
            <div className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
              <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">
                  Dispute Details
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDispute(null);
                    setResolution(null);
                    setResolverNotes('');
                  }}
                  className="p-1.5 border border-slate-200 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/30 text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-colors"
                  title="Close details"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-6">
                {/* Asset Info */}
                {selectedAsset && (
                  <div className="flex items-center gap-4 p-4 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                    <div className="w-14 h-14 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-center">
                      <Laptop className="w-7 h-7 text-slate-500 dark:text-white/50" />
                    </div>
                    <div>
                      <p className="font-display font-bold text-slate-900 dark:text-white uppercase">
                        {selectedAsset.brand} {selectedAsset.model}
                      </p>
                      <p className="font-mono text-xs text-slate-500 dark:text-white/50">S/N: {selectedAsset.serial_number}</p>
                      <p className="font-mono text-xs text-slate-500 dark:text-white/50 mt-1">
                        {getEnterpriseName(selectedAsset.enterprise_id)}
                      </p>
                    </div>
                  </div>
                )}

                {/* IT Admin Notes */}
                <div>
                  <p className="font-mono font-bold text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2">
                    IT Admin's Notes
                  </p>
                  <div className="p-4 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                    <p className="font-display text-slate-900 dark:text-white">{selectedDisputeData.itAdminNotes}</p>
                  </div>
                </div>

                {/* Dispute Type */}
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Type:</span>
                  <span className="px-2 py-1 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 font-mono font-bold text-xs text-slate-900 dark:text-white uppercase">
                    {selectedDisputeData.type} Review
                  </span>
                </div>

                {selectedDisputeData.resolution ? (
                  /* Already Resolved */
                  <div className={`p-4 border ${
                    selectedDisputeData.resolution === 'overturned'
                      ? 'border-emerald-400/30 bg-emerald-400/10'
                      : 'border-red-400/30 bg-red-400/10'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {selectedDisputeData.resolution === 'overturned' ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                      <span className={`font-mono font-bold text-sm uppercase ${
                        selectedDisputeData.resolution === 'overturned' ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {selectedDisputeData.resolution}
                      </span>
                    </div>
                    {selectedDisputeData.resolverNotes && (
                      <p className="font-display text-sm text-slate-600 dark:text-zinc-300 mt-2">
                        {selectedDisputeData.resolverNotes}
                      </p>
                    )}
                    <p className="font-mono text-xs text-slate-500 dark:text-white/50 mt-2">
                      Resolved on {new Date(selectedDisputeData.resolvedAt!).toLocaleString()}
                    </p>
                  </div>
                ) : (
                  /* Resolution Form */
                  <>
                    <div>
                      <p className="font-mono font-bold text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest mb-3">
                        Your Decision
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          onClick={() => setResolution('overturned')}
                          className={`interactive p-4 border transition-all ${
                            resolution === 'overturned'
                              ? 'border-emerald-400 bg-emerald-400/10'
                              : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-emerald-400/50'
                          }`}
                        >
                          <CheckCircle className={`w-8 h-8 mx-auto mb-2 ${
                            resolution === 'overturned' ? 'text-emerald-400' : 'text-slate-500 dark:text-white/50'
                          }`} />
                          <p className={`font-mono font-bold text-xs uppercase tracking-widest ${
                            resolution === 'overturned' ? 'text-emerald-400' : 'text-slate-500 dark:text-white/50'
                          }`}>
                            Overturn
                          </p>
                          <p className="font-mono text-[10px] text-slate-500 dark:text-white/50 mt-1">
                            Accept IT Admin's dispute
                          </p>
                        </button>
                        <button
                          onClick={() => setResolution('upheld')}
                          className={`interactive p-4 border transition-all ${
                            resolution === 'upheld'
                              ? 'border-red-400 bg-red-400/10'
                              : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-red-400/50'
                          }`}
                        >
                          <XCircle className={`w-8 h-8 mx-auto mb-2 ${
                            resolution === 'upheld' ? 'text-red-400' : 'text-slate-500 dark:text-white/50'
                          }`} />
                          <p className={`font-mono font-bold text-xs uppercase tracking-widest ${
                            resolution === 'upheld' ? 'text-red-400' : 'text-slate-500 dark:text-white/50'
                          }`}>
                            Uphold
                          </p>
                          <p className="font-mono text-[10px] text-slate-500 dark:text-white/50 mt-1">
                            Keep original decision
                          </p>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block">
                        <span className="font-mono font-bold text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest">
                          Resolution Notes
                        </span>
                        <textarea
                          value={resolverNotes}
                          onChange={(e) => setResolverNotes(e.target.value)}
                          placeholder="Add notes about your decision..."
                          rows={3}
                          className="mt-2 w-full px-4 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none transition-colors resize-none"
                        />
                      </label>
                    </div>

                    <button
                      onClick={handleResolve}
                      disabled={!resolution || resolveDisputeMutation.isPending}
                      className={`w-full interactive py-3 font-mono font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                        resolution
                          ? resolution === 'overturned'
                            ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                            : 'bg-red-500 text-white hover:bg-red-400'
                          : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/50 cursor-not-allowed'
                      }`}
                    >
                      {resolveDisputeMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Submit Resolution
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] py-16 text-center">
              <MessageSquare className="w-10 h-10 text-slate-500 dark:text-white/50 mx-auto mb-4" />
              <p className="font-display text-slate-500 dark:text-white/50">
                Select a dispute to view details and resolve
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default OpsDisputes;
