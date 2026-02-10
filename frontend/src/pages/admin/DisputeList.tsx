import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Search,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Laptop,
  ArrowRight
} from 'lucide-react';
import { useAuth, useAllAssets, useInfiniteDisputes } from '@/hooks';
import { InfiniteScrollTrigger, InfiniteScrollInfo } from '@/components/ui';
import { formatDistanceToNow } from 'date-fns';

type DisputeStatus = 'pending' | 'upheld' | 'overturned' | 'partial';

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Upheld', value: 'upheld' },
  { label: 'Overturned', value: 'overturned' },
  { label: 'Partial', value: 'partial' },
];

export function DisputeList() {
  const navigate = useNavigate();
  const location = useLocation();
  // V3: Use React Query hooks for database data
  const { enterprise, user } = useAuth();
  const { data: assets = [] } = useAllAssets();

  // Determine base path based on current location
  const isOrgAdmin = user?.role === 'org_admin' || location.pathname.startsWith('/org-admin');
  const basePath = isOrgAdmin ? '/org-admin' : '/admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Infinite scroll disputes
  const {
    data: disputeData,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteDisputes(statusFilter ? { status: statusFilter } : {});

  const disputes = useMemo(
    () => disputeData?.pages.flatMap(p => p.data || []) ?? [],
    [disputeData]
  );

  // Enrich disputes with asset data from the already-fetched assets list
  const enrichedDisputes = useMemo(() => {
    const assetMap = new Map(assets.map(a => [a.id, a]));
    return disputes.map(d => {
      const asset = assetMap.get(d.asset_id);
      return {
        ...d,
        assets: {
          id: asset?.id || d.asset_id,
          brand: asset?.brand || 'Unknown',
          model: asset?.model || 'Device',
          serial_number: asset?.serial_number || d.asset_id || '',
          status: asset?.status || '',
          enterprise_id: asset?.enterprise_id || '',
        },
      };
    });
  }, [disputes, assets]);

  // Get rejected assets that can be disputed
  // V3: Use snake_case field names from database
  const rejectedAssets = assets.filter(
    a => a.enterprise_id === enterprise?.id &&
    ['remote_rejected', 'final_rejected'].includes(a.status)
  );

  // Filter disputes (client-side search only — status is server-side via useInfiniteDisputes)
  const filteredDisputes = useMemo(() => {
    let result = [...enrichedDisputes];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        d =>
          d.assets?.serial_number?.toLowerCase().includes(query) ||
          d.assets?.brand?.toLowerCase().includes(query) ||
          d.assets?.model?.toLowerCase().includes(query) ||
          d.reason?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [enrichedDisputes, searchQuery]);

  // Stats
  const stats = {
    total: enrichedDisputes.length,
    pending: enrichedDisputes.filter(d => !d.resolved_at).length,
    upheld: enrichedDisputes.filter(d => d.resolution === 'upheld').length,
    overturned: enrichedDisputes.filter(d => d.resolution === 'overturned').length,
    canDispute: rejectedAssets.length,
  };

  const getStatusConfig = (dispute: typeof enrichedDisputes[0]) => {
    if (!dispute.resolved_at) {
      return { label: 'Pending', color: 'text-amber-400', icon: <Clock className="w-4 h-4" /> };
    }
    const configs: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      upheld: { label: 'Upheld', color: 'text-emerald-400', icon: <CheckCircle className="w-4 h-4" /> },
      overturned: { label: 'Overturned', color: 'text-red-400', icon: <XCircle className="w-4 h-4" /> },
      partial: { label: 'Partial', color: 'text-blue-400', icon: <AlertTriangle className="w-4 h-4" /> },
    };
    return configs[dispute.resolution || ''] || { label: 'Unknown', color: 'text-gray-400', icon: <Clock className="w-4 h-4" /> };
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 border-b border-slate-200 dark:border-white/10 pb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-2">Appeals</span>
          <h1 className="font-brand font-bold text-3xl md:text-4xl text-slate-900 dark:text-white uppercase tracking-tight">
            Disputes
          </h1>
          <p className="font-display text-zinc-500 text-sm mt-2 uppercase tracking-wide">Challenge rejection decisions on your assets</p>
        </motion.div>

        {stats.canDispute > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <button
              onClick={() => navigate(`${basePath}/assets`)}
              className="interactive px-5 py-2.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              View Rejected Assets
            </button>
          </motion.div>
        )}
      </div>

      {/* Stats Grid - Protocol Style */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 border-l border-t border-slate-200 dark:border-white/10"
      >
        <StatBox label="Total Disputes" value={stats.total} icon={<MessageSquare className="w-4 h-4" />} />
        <StatBox label="Pending" value={stats.pending} icon={<Clock className="w-4 h-4" />} highlight={stats.pending > 0} />
        <StatBox label="Upheld" value={stats.upheld} icon={<CheckCircle className="w-4 h-4" />} />
        <StatBox label="Overturned" value={stats.overturned} icon={<XCircle className="w-4 h-4" />} />
        <StatBox label="Can Dispute" value={stats.canDispute} icon={<AlertTriangle className="w-4 h-4" />} />
      </motion.div>

      {/* Search & Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-5"
      >
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input
                type="text"
                placeholder="Search by serial, brand, model, or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs uppercase tracking-widest focus:outline-none focus:border-ecotribe-primary/50 transition-colors appearance-none select-themed cursor-pointer min-w-[160px]"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-white dark:bg-[#0a0a0a]">{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Dispute List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        {isLoading ? (
          <div className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] py-16 text-center">
            <div className="w-12 h-12 border-2 border-ecotribe-primary/30 border-t-ecotribe-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="font-mono text-sm text-zinc-600">Loading disputes...</p>
          </div>
        ) : filteredDisputes.length > 0 ? (
          filteredDisputes.map((dispute, index) => {
            const statusConfig = getStatusConfig(dispute);
            const isPending = !dispute.resolved_at;

            return (
              <motion.div
                key={dispute.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 * Math.min(index, 10) }}
                className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-white/20 transition-colors"
              >
                <div className="p-5">
                  <div className="flex items-start gap-5">
                    {/* Icon */}
                    <div className={`w-12 h-12 border flex items-center justify-center flex-shrink-0 ${
                      isPending ? 'border-amber-500/30 bg-amber-500/10' :
                      dispute.resolution === 'upheld' ? 'border-emerald-500/30 bg-emerald-500/10' :
                      'border-red-500/30 bg-red-500/10'
                    }`}>
                      <AlertTriangle className={`w-6 h-6 ${statusConfig.color}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">
                          {dispute.assets?.brand} {dispute.assets?.model}
                        </h3>
                        <span className={`flex items-center gap-1 font-mono font-bold text-[10px] uppercase tracking-widest ${statusConfig.color}`}>
                          {statusConfig.icon}
                          {statusConfig.label}
                        </span>
                      </div>

                      <p className="font-mono text-xs text-zinc-600 mb-3">{dispute.assets?.serial_number}</p>

                      <div className="p-3 border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                        <p className="font-mono font-bold text-[9px] text-zinc-600 uppercase tracking-widest mb-1">Dispute Reason</p>
                        <p className="font-display text-sm text-zinc-400">{dispute.reason}</p>
                      </div>

                      {!isPending && dispute.resolver_notes && (
                        <div className="mt-3 p-3 border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                          <p className="font-mono font-bold text-[9px] text-zinc-600 uppercase tracking-widest mb-1">Resolution Notes</p>
                          <p className="font-display text-sm text-zinc-400">{dispute.resolver_notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Date & Actions */}
                    <div className="text-right flex-shrink-0">
                      <p className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest mb-3">
                        {formatDistanceToNow(new Date(dispute.created_at), { addSuffix: true })}
                      </p>
                      <button
                        onClick={() => navigate(`${basePath}/disputes/${dispute.id}`)}
                        className="interactive p-2.5 border border-slate-200 dark:border-white/10 hover:border-ecotribe-primary/30 hover:bg-ecotribe-primary/5 transition-all"
                        title="View dispute details"
                      >
                        <Eye className="w-4 h-4 text-zinc-600 hover:text-ecotribe-primary transition-colors" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] py-16 text-center">
            <div className="w-16 h-16 border border-slate-200 dark:border-white/10 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-zinc-600" />
            </div>
            <p className="font-display font-bold text-slate-900 dark:text-white uppercase tracking-wide mb-1">No disputes found</p>
            <p className="font-mono text-xs text-zinc-600 mb-6">
              {searchQuery || statusFilter
                ? 'Try adjusting your filters'
                : "You haven't submitted any disputes yet"}
            </p>
            {stats.canDispute > 0 && !searchQuery && !statusFilter && (
              <button
                onClick={() => navigate(`${basePath}/assets`)}
                className="interactive px-5 py-2.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center gap-2 mx-auto"
              >
                <AlertTriangle className="w-4 h-4" />
                View Rejected Assets
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* Infinite scroll controls */}
      <InfiniteScrollTrigger hasNextPage={!!hasNextPage} isFetchingNextPage={isFetchingNextPage} fetchNextPage={fetchNextPage} />
      <InfiniteScrollInfo loadedCount={filteredDisputes.length} totalCount={disputeData?.pages[0]?.pagination?.total} />

      {/* Rejected Assets Callout */}
      {stats.canDispute > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="border border-amber-500/20 bg-amber-500/5 p-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 border border-amber-500/30 flex items-center justify-center">
                <Laptop className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">
                  {stats.canDispute} rejected asset{stats.canDispute > 1 ? 's' : ''} can be disputed
                </p>
                <p className="font-mono text-xs text-zinc-500">
                  Go to asset details and click "Dispute" to submit
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate(`${basePath}/assets`)}
              className="interactive px-5 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
            >
              View Assets
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  icon,
  highlight = false,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={`p-6 border-r border-b border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors group ${highlight ? 'bg-amber-500/5' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-mono font-bold text-[10px] text-zinc-600 uppercase tracking-widest group-hover:text-ecotribe-primary transition-colors">{label}</h4>
        <span className={`${highlight ? 'text-amber-400' : 'text-zinc-600'} group-hover:text-ecotribe-primary transition-colors`}>{icon}</span>
      </div>
      <div className="font-brand font-bold text-3xl text-slate-900 dark:text-white">{value}</div>
    </div>
  );
}

export default DisputeList;
