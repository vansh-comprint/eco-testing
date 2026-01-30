import { motion } from 'framer-motion';
import {
  Clock,
  CheckCircle,
  XCircle,
  Package,
  TrendingUp,
  IndianRupee,
  FileText,
  ArrowRight
} from 'lucide-react';
import { Badge } from '@/components/ui';
import { useAuth, useBatches } from '@/hooks';
import { formatDistanceToNow, format } from 'date-fns';

export function CFODashboard() {
  const { user, enterprise } = useAuth();
  const enterpriseId = enterprise?.id || '';
  const { data: batches = [] } = useBatches(enterpriseId);

  // V3: Use snake_case field names from database
  const pendingApproval = batches.filter(b => b.status === 'pending_approval');
  const approvedBatches = batches.filter(b => b.approval_status === 'approved');
  const rejectedBatches = batches.filter(b => b.approval_status === 'rejected');

  const totalPendingValue = pendingApproval.reduce((sum, b) => sum + (b.estimated_value || 0), 0);
  const totalApprovedValue = approvedBatches.reduce((sum, b) => sum + (b.estimated_value || 0), 0);

  const recentDecisions = [
    { batch: 'Q4 2024 Refresh', value: 425000, decision: 'approved', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
    { batch: 'IT Department Refresh', value: 280000, decision: 'approved', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
    { batch: 'Marketing Laptops', value: 150000, decision: 'rejected', date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-black/5 dark:border-white/10 pb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-2">Financial</span>
          <h1 className="font-brand font-bold text-3xl md:text-4xl text-black dark:text-white uppercase tracking-tight">
            Welcome, {user?.name?.split(' ')[0]}
          </h1>
          <p className="font-display text-black/60 dark:text-zinc-500 text-sm mt-2 uppercase tracking-wide">Approval Dashboard</p>
        </motion.div>
      </div>

      {/* Stats Grid - Protocol Style */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-l border-t border-black/5 dark:border-slate-200 dark:border-white/10"
      >
        <StatBox
          label="Pending Approval"
          value={pendingApproval.length}
          sub={pendingApproval.length > 0 ? 'Requires attention' : 'All clear'}
          icon={<Clock className="w-5 h-5" />}
          highlight={pendingApproval.length > 0}
        />
        <StatBox
          label="Pending Value"
          value={`₹${(totalPendingValue / 100000).toFixed(1)}L`}
          sub="Awaiting decision"
          icon={<IndianRupee className="w-5 h-5" />}
          isText
        />
        <StatBox
          label="Approved"
          value={approvedBatches.length}
          sub="This month"
          icon={<CheckCircle className="w-5 h-5" />}
          trend="+15%"
        />
        <StatBox
          label="Approved Value"
          value={`₹${(totalApprovedValue / 100000).toFixed(1)}L`}
          sub="Total processed"
          icon={<TrendingUp className="w-5 h-5" />}
          isText
        />
      </motion.div>

      {/* Pending Approvals & Recent Decisions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approvals */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="border border-black/5 dark:border-white/10 bg-white/60 dark:bg-white/[0.02]"
        >
          <div className="p-6 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-amber-400" />
              <h2 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide">Pending Approvals</h2>
            </div>
            {pendingApproval.length > 0 && (
              <span className="font-mono font-bold text-xs text-amber-400 bg-amber-400/10 px-3 py-1 tracking-widest">
                {pendingApproval.length} PENDING
              </span>
            )}
          </div>
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {pendingApproval.length > 0 ? (
              pendingApproval.map((batch, index) => (
                <motion.div
                  key={batch.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="interactive flex items-center justify-between p-4 hover:bg-slate-100 dark:hover:bg-white/[0.05] dark:bg-white/[0.02] cursor-pointer transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-sm text-slate-900 dark:text-white group-hover:text-ecotribe-primary transition-colors uppercase">
                      {batch.name}
                    </p>
                    <p className="font-mono text-xs text-slate-500 dark:text-zinc-600">
                      {batch.asset_count || 0} assets • Created {format(new Date(batch.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-brand font-bold text-lg text-ecotribe-primary">
                        ₹{((batch.estimated_value || 0) / 1000).toFixed(0)}K
                      </p>
                      <p className="font-mono text-[10px] text-slate-500 dark:text-zinc-600 uppercase tracking-widest">Est. Value</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 dark:text-zinc-600 group-hover:text-ecotribe-primary transition-colors" />
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="py-12 text-center">
                <CheckCircle className="w-10 h-10 mx-auto mb-3 text-emerald-400/50" />
                <p className="font-display font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wide">All caught up</p>
                <p className="font-mono text-xs text-slate-500 dark:text-zinc-600 mt-1">No pending approvals</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent Decisions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="border border-black/5 dark:border-white/10 bg-white/60 dark:bg-white/[0.02]"
        >
          <div className="p-6 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-slate-500 dark:text-zinc-500" />
              <h2 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide">Recent Decisions</h2>
            </div>
            <button className="interactive font-mono font-bold text-xs text-slate-500 dark:text-zinc-500 hover:text-ecotribe-primary uppercase tracking-widest transition-colors">
              View all
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {recentDecisions.map((decision, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className="flex items-center gap-4 p-4 hover:bg-slate-100 dark:hover:bg-white/[0.05] dark:bg-white/[0.02] transition-colors"
              >
                <div className={`w-10 h-10 border border-black/5 dark:border-white/10 flex items-center justify-center ${
                  decision.decision === 'approved' ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {decision.decision === 'approved' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-sm text-slate-900 dark:text-white">{decision.batch}</p>
                  <p className="font-mono text-xs text-slate-500 dark:text-zinc-600">
                    ₹{(decision.value / 1000).toFixed(0)}K • {formatDistanceToNow(decision.date, { addSuffix: true })}
                  </p>
                </div>
                <Badge
                  variant={decision.decision === 'approved' ? 'success' : 'error'}
                  size="sm"
                >
                  {decision.decision === 'approved' ? 'Approved' : 'Rejected'}
                </Badge>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Approval Thresholds Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="border border-white/10 bg-slate-50 dark:bg-white/[0.02] p-6"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-amber-400"></div>
            <span className="font-display font-bold text-sm text-slate-600 dark:text-zinc-400 uppercase tracking-wide">Batches require CFO approval when:</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono font-bold text-xs text-slate-900 dark:text-white px-3 py-1.5 border border-black/5 dark:border-white/10 bg-slate-100/50 dark:bg-white/5 uppercase tracking-widest">
              50+ assets
            </span>
            <span className="font-mono text-xs text-slate-500 dark:text-zinc-600">OR</span>
            <span className="font-mono font-bold text-xs text-slate-900 dark:text-white px-3 py-1.5 border border-black/5 dark:border-white/10 bg-slate-100/50 dark:bg-white/5 uppercase tracking-widest">
              ₹5,00,000+ value
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Stat Box Component - Protocol Style
function StatBox({
  label,
  value,
  sub,
  icon,
  trend,
  highlight,
  isText
}: {
  label: string;
  value: number | string;
  sub: string;
  icon: React.ReactNode;
  trend?: string;
  highlight?: boolean;
  isText?: boolean;
}) {
  return (
    <div className={`p-8 border-r border-b border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/30 backdrop-blur-sm hover:bg-slate-100/50 dark:hover:bg-white/[0.05] dark:bg-white/[0.02] transition-colors group ${highlight ? 'bg-amber-500/10 dark:bg-amber-500/5' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-mono font-bold text-xs text-slate-600 dark:text-zinc-500 uppercase tracking-widest group-hover:text-ecotribe-primary transition-colors">{label}</h4>
        <span className={`${highlight ? 'text-amber-400' : 'text-slate-500 dark:text-zinc-600'} group-hover:text-ecotribe-primary transition-colors`}>{icon}</span>
      </div>
      <div className={`font-brand font-bold ${isText ? 'text-3xl' : 'text-4xl md:text-5xl'} text-slate-900 dark:text-white mb-2`}>{value}</div>
      <div className="flex items-center justify-between">
        <p className={`font-display font-medium text-sm tracking-wide ${highlight ? 'text-amber-400' : 'text-slate-600 dark:text-zinc-600'}`}>{sub}</p>
        {trend && (
          <span className="font-mono font-bold text-xs text-emerald-400">{trend}</span>
        )}
      </div>
    </div>
  );
}
