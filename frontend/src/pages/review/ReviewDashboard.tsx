import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, ClipboardCheck, AlertTriangle, IndianRupee, CheckCircle, ArrowRight, Laptop, TrendingUp } from 'lucide-react';
import { useAuth, useInfiniteAssets, useDashboardStats } from '@/hooks';

export function ReviewDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Server-side filtered queries for accurate counts
  const { data: remoteReviewData } = useInfiniteAssets({ status: 'submitted' });
  const { data: inTransitData } = useInfiniteAssets({ status: 'in_transit' });
  const { data: facilityQCData } = useInfiniteAssets({ status: 'facility_qc' });

  // Live stats from backend
  const { stats } = useDashboardStats();

  // Flatten for preview display (first page is enough for top 3)
  const pendingRemoteReview = useMemo(
    () => remoteReviewData?.pages.flatMap(p => p.data || []) ?? [],
    [remoteReviewData]
  );
  const pendingFacilityQC = useMemo(() => {
    const inTransit = inTransitData?.pages.flatMap(p => p.data || []) ?? [];
    const atFacility = facilityQCData?.pages.flatMap(p => p.data || []) ?? [];
    return [...inTransit, ...atFacility];
  }, [inTransitData, facilityQCData]);

  // Accurate counts from server pagination
  const remoteReviewCount = remoteReviewData?.pages[0]?.pagination?.total ?? pendingRemoteReview.length;
  const facilityQCCount =
    (inTransitData?.pages[0]?.pagination?.total ?? 0) +
    (facilityQCData?.pages[0]?.pagination?.total ?? 0);

  // Get pending disputes
  // TODO: Add disputes hook when available
  const pendingDisputes: Array<{ id: string; assetId: string; itAdminNotes: string; type?: string }> = [];

  const statCards = [
    {
      label: 'Pending Review',
      value: stats.pending_review ?? 0,
      icon: Eye,
      color: 'blue',
    },
    {
      label: 'Pending QC',
      value: stats.pending_qc ?? 0,
      icon: ClipboardCheck,
      color: 'emerald',
    },
    {
      label: 'Pending Payout',
      value: stats.pending_payout ?? 0,
      icon: IndianRupee,
      color: 'amber',
    },
    {
      label: 'Completed Assets',
      value: stats.asset_completed ?? 0,
      icon: TrendingUp,
      color: 'purple',
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { border: string; bg: string; text: string }> = {
      blue: { border: 'border-blue-400/30', bg: 'bg-blue-400/10', text: 'text-blue-400' },
      emerald: { border: 'border-emerald-400/30', bg: 'bg-emerald-400/10', text: 'text-emerald-400' },
      amber: { border: 'border-amber-400/30', bg: 'bg-amber-400/10', text: 'text-amber-400' },
      purple: { border: 'border-purple-400/30', bg: 'bg-purple-400/10', text: 'text-purple-400' },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-2">
            Review & QC Portal
          </span>
          <h1 className="font-brand font-bold text-3xl md:text-4xl text-slate-900 dark:text-white uppercase tracking-tight">
            Welcome, {user?.name?.split(' ')[0]}
          </h1>
          <p className="font-display text-zinc-500 text-sm mt-2 uppercase tracking-wide">
            Review devices and perform quality control
          </p>
        </motion.div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => {
          const colors = getColorClasses(stat.color);
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 ${colors.border} ${colors.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${colors.text}`} />
                </div>
              </div>
              <p className="font-brand font-bold text-2xl text-slate-900 dark:text-white">{stat.value}</p>
              <p className="font-mono text-xs text-zinc-500 uppercase tracking-wide mt-1">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Queue Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Remote Review Queue */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]"
        >
          <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border border-blue-400/30 bg-blue-400/10 flex items-center justify-center">
                <Eye className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">
                  Remote Review Queue
                </h2>
                <p className="font-mono text-xs text-zinc-500">Photo-based assessment</p>
              </div>
            </div>
            <span className="px-3 py-1.5 border border-blue-400/30 bg-blue-400/10 font-mono font-bold text-xs text-blue-400">
              {remoteReviewCount}
            </span>
          </div>

          {pendingRemoteReview.length > 0 ? (
            <div className="divide-y divide-slate-200 dark:divide-white/5">
              {pendingRemoteReview.slice(0, 3).map((asset) => (
                <div key={asset.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors">
                  <div className="w-12 h-12 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-center">
                    <Laptop className="w-6 h-6 text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase truncate">
                      {asset.brand} {asset.model}
                    </p>
                    <p className="font-mono text-xs text-zinc-500">S/N: {asset.serial_number}</p>
                  </div>
                  <button
                    onClick={() => navigate(`/review/queue/${asset.id}`)}
                    className="interactive px-4 py-2 border border-blue-400/30 bg-blue-400/10 text-blue-400 font-mono font-bold text-xs uppercase tracking-widest hover:bg-blue-400/20 transition-all"
                  >
                    Review
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center">
              <CheckCircle className="w-10 h-10 text-emerald-400/50 mx-auto mb-3" />
              <p className="font-display text-sm text-zinc-500">Queue empty</p>
            </div>
          )}

          {remoteReviewCount > 3 && (
            <div className="p-4 border-t border-slate-200 dark:border-white/10">
              <button
                onClick={() => navigate('/review/queue')}
                className="w-full interactive py-2.5 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-all flex items-center justify-center gap-2"
              >
                View All ({remoteReviewCount})
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>

        {/* Facility QC Queue */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]"
        >
          <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border border-emerald-400/30 bg-emerald-400/10 flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">
                  Facility QC Queue
                </h2>
                <p className="font-mono text-xs text-zinc-500">In-person inspection</p>
              </div>
            </div>
            <span className="px-3 py-1.5 border border-emerald-400/30 bg-emerald-400/10 font-mono font-bold text-xs text-emerald-400">
              {facilityQCCount}
            </span>
          </div>

          {pendingFacilityQC.length > 0 ? (
            <div className="divide-y divide-slate-200 dark:divide-white/5">
              {pendingFacilityQC.slice(0, 3).map((asset) => (
                <div key={asset.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors">
                  <div className="w-12 h-12 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-center">
                    <Laptop className="w-6 h-6 text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase truncate">
                      {asset.brand} {asset.model}
                    </p>
                    <p className="font-mono text-xs text-zinc-500">S/N: {asset.serial_number}</p>
                  </div>
                  <button
                    onClick={() => navigate(`/review/qc/${asset.id}`)}
                    className="interactive px-4 py-2 border border-emerald-400/30 bg-emerald-400/10 text-emerald-400 font-mono font-bold text-xs uppercase tracking-widest hover:bg-emerald-400/20 transition-all"
                  >
                    Inspect
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center">
              <CheckCircle className="w-10 h-10 text-emerald-400/50 mx-auto mb-3" />
              <p className="font-display text-sm text-zinc-500">Queue empty</p>
            </div>
          )}

          {facilityQCCount > 3 && (
            <div className="p-4 border-t border-slate-200 dark:border-white/10">
              <button
                onClick={() => navigate('/review/qc')}
                className="w-full interactive py-2.5 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-all flex items-center justify-center gap-2"
              >
                View All ({facilityQCCount})
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Pending Disputes */}
      {pendingDisputes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="border border-amber-400/30 bg-amber-400/5"
        >
          <div className="p-5 border-b border-amber-400/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border border-amber-400/30 bg-amber-400/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">
                  Pending Disputes
                </h2>
                <p className="font-mono text-xs text-zinc-500">Requires resolution</p>
              </div>
            </div>
            <span className="px-3 py-1.5 border border-amber-400/30 bg-amber-400/10 font-mono font-bold text-xs text-amber-400 animate-pulse">
              {pendingDisputes.length}
            </span>
          </div>

          <div className="divide-y divide-amber-400/10">
            {pendingDisputes.slice(0, 2).map((dispute) => (
              <div key={dispute.id} className="p-4 flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase">
                    Asset: {dispute.assetId}
                  </p>
                  <p className="font-mono text-xs text-zinc-500 mt-1 line-clamp-1">
                    {dispute.itAdminNotes}
                  </p>
                </div>
                <button
                  onClick={() => {
                    // TODO: Dispute resolution page coming soon
                    console.log('Dispute resolution:', dispute.id);
                  }}
                  className="interactive px-4 py-2 border border-amber-400/30 bg-amber-400/10 text-amber-400 font-mono font-bold text-xs uppercase tracking-widest hover:bg-amber-400/20 transition-all"
                  title="Resolve dispute (coming soon)"
                >
                  Resolve
                </button>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-amber-400/20">
            <button
              onClick={() => navigate('/review/disputes')}
              className="w-full interactive py-2.5 border border-amber-400/30 bg-amber-400/10 text-amber-400 font-mono font-bold text-xs uppercase tracking-widest hover:bg-amber-400/20 transition-all flex items-center justify-center gap-2"
            >
              View All Disputes
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <button
          onClick={() => navigate('/review/queue')}
          className="interactive border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-5 text-left hover:border-blue-400/30 hover:bg-blue-400/5 transition-all group"
        >
          <Eye className="w-8 h-8 text-blue-400 mb-3" />
          <h3 className="font-display font-bold text-slate-900 dark:text-white uppercase group-hover:text-blue-400 transition-colors">
            Start Reviewing
          </h3>
          <p className="font-mono text-xs text-zinc-500 mt-1">
            Review submitted devices remotely
          </p>
        </button>

        <button
          onClick={() => navigate('/review/qc')}
          className="interactive border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-5 text-left hover:border-emerald-400/30 hover:bg-emerald-400/5 transition-all group"
        >
          <ClipboardCheck className="w-8 h-8 text-emerald-400 mb-3" />
          <h3 className="font-display font-bold text-slate-900 dark:text-white uppercase group-hover:text-emerald-400 transition-colors">
            Start QC
          </h3>
          <p className="font-mono text-xs text-zinc-500 mt-1">
            Perform facility quality control
          </p>
        </button>

        <button
          onClick={() => navigate('/review/history')}
          className="interactive border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-5 text-left hover:border-purple-400/30 hover:bg-purple-400/5 transition-all group"
        >
          <TrendingUp className="w-8 h-8 text-purple-400 mb-3" />
          <h3 className="font-display font-bold text-slate-900 dark:text-white uppercase group-hover:text-purple-400 transition-colors">
            View History
          </h3>
          <p className="font-mono text-xs text-zinc-500 mt-1">
            Review your completed assessments
          </p>
        </button>
      </motion.div>
    </div>
  );
}

export default ReviewDashboard;
