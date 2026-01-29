import { motion } from 'framer-motion';
import { Laptop, Eye, Building2, CheckCircle, Package, AlertTriangle, TrendingUp, ArrowRight } from 'lucide-react';
import { Badge, Progress } from '@/components/ui';
import { useAllAssets, useEnterprises, useAllPickups } from '@/hooks';

export function MainAdminDashboard() {
  const { data: assets = [] } = useAllAssets();
  const { data: enterprises = [] } = useEnterprises();
  const { data: pickups = [] } = useAllPickups();

  // Calculate all stats from real data
  const totalAssets = assets.length;
  const pendingAssignment = assets.filter(a => a.status === 'pending_assignment').length;
  const pendingSubmission = assets.filter(a => a.status === 'assigned' || a.status === 'check_in_started').length;
  const pendingReview = assets.filter(a => a.status === 'submitted' || a.status === 'remote_review').length;
  const inTransit = assets.filter(a => a.status === 'in_transit' || a.status === 'picked_up').length;
  const inFacility = assets.filter(a => a.status === 'facility_qc').length;
  const completed = assets.filter(a => a.status === 'completed').length;
  const payoutPending = assets.filter(a => a.status === 'payout_pending' || a.status === 'final_accepted').length;

  const pipelineStages = [
    { stage: 'Pending Assignment', count: pendingAssignment, color: 'bg-zinc-500' },
    { stage: 'Pending Submission', count: pendingSubmission, color: 'bg-amber-500' },
    { stage: 'Remote Review', count: pendingReview, color: 'bg-blue-500' },
    { stage: 'In Transit', count: inTransit, color: 'bg-purple-500' },
    { stage: 'Facility QC', count: inFacility, color: 'bg-orange-500' },
    { stage: 'Payout Pending', count: payoutPending, color: 'bg-cyan-500' },
    { stage: 'Completed', count: completed, color: 'bg-ecotribe-primary' },
  ];

  // Generate real-time alerts from data
  const pendingPickups = pickups.filter(p => p.status === 'pending_assignment').length;
  const scheduledPickups = pickups.filter(p => p.status === 'scheduled').length;

  const alerts = [
    ...(pendingPickups > 0 ? [{ type: 'warning', message: `${pendingPickups} pickup${pendingPickups > 1 ? 's' : ''} pending assignment`, time: 'Now' }] : []),
    ...(payoutPending > 0 ? [{ type: 'info', message: `${payoutPending} asset${payoutPending > 1 ? 's' : ''} ready for payout`, time: 'Now' }] : []),
    ...(inFacility > 0 ? [{ type: 'info', message: `${inFacility} asset${inFacility > 1 ? 's' : ''} in facility QC`, time: 'Now' }] : []),
    ...(scheduledPickups > 0 ? [{ type: 'success', message: `${scheduledPickups} pickup${scheduledPickups > 1 ? 's' : ''} scheduled`, time: 'Now' }] : []),
  ].slice(0, 4);

  // Calculate enterprise stats from real data
  const enterpriseStats = enterprises.slice(0, 4).map(ent => {
    const entAssets = assets.filter(a => a.enterprise_id === ent.id);
    const entCompleted = entAssets.filter(a => a.status === 'completed').length;
    const totalPayout = entAssets
      .filter(a => a.status === 'completed')
      .reduce((sum, a) => sum + (a.final_price || 0), 0);

    return {
      name: ent.name,
      industry: 'Enterprise',
      assets: entAssets.length,
      completed: entCompleted,
      revenue: `₹${(totalPayout / 100000).toFixed(1)}L`,
      status: ent.status || 'active',
    };
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-black/10 dark:border-white/10 pb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-2">Operations</span>
          <h1 className="font-brand font-bold text-3xl md:text-4xl text-black dark:text-white uppercase tracking-tight">
            Platform Dashboard
          </h1>
          <p className="font-display text-black/60 dark:text-white/50 text-sm mt-2 uppercase tracking-wide">Manage and monitor all operations</p>
        </motion.div>
      </div>

      {/* Stats Grid - Protocol Style */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 border-l border-t border-black/10 dark:border-slate-200 dark:border-white/10"
      >
        <StatBox label="Total Assets" value={totalAssets} icon={<Laptop className="w-5 h-5" />} />
        <StatBox label="Pending Review" value={pendingReview} icon={<Eye className="w-5 h-5" />} highlight={pendingReview > 5} />
        <StatBox label="In Facility" value={inFacility} icon={<Package className="w-5 h-5" />} />
        <StatBox label="Completed" value={completed} icon={<CheckCircle className="w-5 h-5" />} />
        <StatBox label="Enterprises" value={enterprises.length} icon={<Building2 className="w-5 h-5" />} />
      </motion.div>

      {/* Pipeline & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Overview */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-white/40 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-slate-200 dark:border-white/10"
        >
          <div className="p-6 border-b border-black/10 dark:border-slate-200 dark:border-white/10">
            <h2 className="font-brand font-bold text-lg text-black dark:text-white uppercase tracking-wide">Asset Pipeline</h2>
          </div>
          <div className="p-6 space-y-5">
            {pipelineStages.map((item) => (
              <div key={item.stage}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display font-bold text-sm text-slate-500 dark:text-white/50 uppercase tracking-wide">{item.stage}</span>
                  <span className="font-brand font-bold text-lg text-white">{item.count}</span>
                </div>
                <div className="h-2 bg-white/5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.count / Math.max(totalAssets, 1)) * 100}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`h-full ${item.color}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]"
        >
          <div className="p-6 border-b border-slate-200 dark:border-white/10">
            <h2 className="font-brand font-bold text-lg text-white uppercase tracking-wide">Recent Alerts</h2>
          </div>
          <div className="p-4 space-y-3">
            {alerts.length > 0 ? alerts.map((alert, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className="flex items-start gap-3 p-3 border border-white/5 bg-slate-50 dark:bg-white/[0.02]"
              >
                <div className={`w-2 h-2 mt-1.5 ${
                  alert.type === 'error' ? 'bg-red-500' :
                  alert.type === 'warning' ? 'bg-amber-500' :
                  alert.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'
                }`} />
                <div className="flex-1">
                  <p className="font-display text-sm text-zinc-300">{alert.message}</p>
                  <p className="font-mono text-[10px] text-slate-500 dark:text-white/50 mt-1 uppercase tracking-widest">{alert.time}</p>
                </div>
              </motion.div>
            )) : (
              <div className="py-4 text-center">
                <p className="font-display text-sm text-slate-500 dark:text-white/50">No pending alerts</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Top Enterprises */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]"
      >
        <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <h2 className="font-brand font-bold text-lg text-white uppercase tracking-wide">Top Enterprises</h2>
          <Badge variant="info" size="sm">This Month</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10">
                <th className="text-left py-4 px-6 font-mono font-bold text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest">Enterprise</th>
                <th className="text-left py-4 px-6 font-mono font-bold text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest">Industry</th>
                <th className="text-left py-4 px-6 font-mono font-bold text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest">Assets</th>
                <th className="text-left py-4 px-6 font-mono font-bold text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest">Progress</th>
                <th className="text-left py-4 px-6 font-mono font-bold text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest">Revenue</th>
                <th className="text-left py-4 px-6 font-mono font-bold text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {enterpriseStats.length > 0 ? enterpriseStats.map((ent, index) => (
                <motion.tr
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 * index }}
                  className="hover:bg-slate-50 dark:hover:bg-white/[0.05]"
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 border border-ecotribe-primary/30 bg-ecotribe-primary/10 flex items-center justify-center font-brand font-bold text-ecotribe-primary">
                        {ent.name.charAt(0)}
                      </div>
                      <span className="font-display font-bold text-sm text-white uppercase">{ent.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 font-mono text-xs text-slate-500 dark:text-white/50">{ent.industry}</td>
                  <td className="py-4 px-6 font-brand font-bold text-white">{ent.assets}</td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-slate-500 dark:text-white/50">{ent.completed}</span>
                      <div className="w-16 h-1.5 bg-white/10">
                        <div
                          className="h-full bg-ecotribe-primary"
                          style={{ width: `${ent.assets > 0 ? (ent.completed / ent.assets) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 font-brand font-bold text-ecotribe-primary">{ent.revenue}</td>
                  <td className="py-4 px-6">
                    <Badge variant={ent.status === 'active' ? 'success' : 'warning'} size="sm">
                      {ent.status}
                    </Badge>
                  </td>
                </motion.tr>
              )) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center">
                    <p className="font-display text-slate-500 dark:text-white/50">No enterprises registered yet</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

function StatBox({
  label,
  value,
  icon,
  trend,
  highlight
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`p-6 border-r border-b border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/[0.05] dark:bg-white/[0.02] transition-colors group ${highlight ? 'bg-amber-500/5' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-mono font-bold text-xs text-black/50 dark:text-white/50 uppercase tracking-widest group-hover:text-ecotribe-primary transition-colors">{label}</h4>
        <span className={`${highlight ? 'text-amber-400' : 'text-black/60 dark:text-white/50'} group-hover:text-ecotribe-primary transition-colors`}>{icon}</span>
      </div>
      <div className="font-brand font-bold text-3xl text-black dark:text-white mb-1">{value}</div>
      {trend && (
        <span className="font-mono font-bold text-xs text-emerald-400">{trend}</span>
      )}
    </div>
  );
}
