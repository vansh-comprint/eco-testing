import { motion } from 'framer-motion';
import { Laptop, Eye, Clipboard, CheckCircle, Clock, Search } from 'lucide-react';
import { Badge, PageHeader, DashboardStatGrid } from '@/components/ui';
import type { StatAccent } from '@/components/ui';
import { useAuth, useAllAssets } from '@/hooks';
import { glass, text, hover as hoverStyles, iconSize } from '@/lib/design-tokens';

export function TechnicianDashboard() {
  const { user } = useAuth();
  const { data: assets = [] } = useAllAssets();

  const reviewQueue = assets.filter(a => a.status === 'submitted' || a.status === 'remote_review');
  const qcQueue = assets.filter(a => a.status === 'facility_qc');

  const recentCompletions = [
    { device: 'Dell Latitude 5520', serial: 'DL5520-001', type: 'Remote Review', result: 'Accepted', time: '10m ago' },
    { device: 'HP EliteBook 840', serial: 'HP840-002', type: 'Facility QC', result: 'Grade A', time: '25m ago' },
    { device: 'Lenovo T14', serial: 'LT14-003', type: 'Remote Review', result: 'Rejected', time: '45m ago' },
  ];

  // Prepare stat items for the grid
  const statItems = [
    {
      label: 'Review Queue',
      value: reviewQueue.length,
      subLabel: 'Pending review',
      icon: <Eye className={`${iconSize.lg} ${reviewQueue.length > 0 ? 'text-blue-500' : 'text-slate-600 dark:text-zinc-400'}`} />,
      accent: (reviewQueue.length > 0 ? 'info' : 'neutral') as StatAccent,
    },
    {
      label: 'QC Queue',
      value: qcQueue.length,
      subLabel: 'At facility',
      icon: <Clipboard className={`${iconSize.lg} ${qcQueue.length > 0 ? 'text-amber-500' : 'text-slate-600 dark:text-zinc-400'}`} />,
      accent: (qcQueue.length > 0 ? 'warning' : 'neutral') as StatAccent,
    },
    {
      label: 'Completed Today',
      value: 12,
      icon: <CheckCircle className={`${iconSize.lg} text-emerald-500`} />,
      trend: { value: 15, direction: 'up' as const },
      accent: 'success' as StatAccent,
    },
    {
      label: 'Avg Review Time',
      value: '4m 32s',
      subLabel: 'This week',
      icon: <Clock className={`${iconSize.lg} text-slate-600 dark:text-zinc-400`} />,
      accent: 'neutral' as StatAccent,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        label="Technician"
        title="Review Dashboard"
        subtitle={`Welcome back, ${user?.name}`}
        actions={
          <div className="flex gap-3">
            <button className="px-5 py-2.5 bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm border border-slate-200/80 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 font-mono font-bold text-xs uppercase tracking-widest hover:border-lime-500/40 dark:hover:border-lime-400/30 transition-all flex items-center gap-2 btn-chamfer">
              <Clock className={iconSize.md} />
              View History
            </button>
            <button className="px-5 py-2.5 bg-lime-500 text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-lime-400 hover:shadow-[0_0_20px_rgba(132,204,22,0.3)] transition-all flex items-center gap-2 btn-chamfer">
              <Eye className={iconSize.md} />
              Start Review
            </button>
          </div>
        }
      />

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <DashboardStatGrid items={statItems} columns={4} />
      </motion.div>

      {/* Work Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Remote Review Queue */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={glass.subtle}
        >
          <div className="p-6 border-b border-slate-200/80 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className={`${iconSize.lg} text-blue-500`} />
              <h2 className={`font-brand font-bold text-lg uppercase tracking-wide ${text.primary}`}>Remote Review</h2>
            </div>
            <Badge variant="info" size="sm">{reviewQueue.length} pending</Badge>
          </div>
          <div className="divide-y divide-slate-200/60 dark:divide-zinc-800/60">
            {reviewQueue.length > 0 ? (
              reviewQueue.slice(0, 4).map((asset, index) => (
                <motion.div
                  key={asset.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className={`flex items-center justify-between p-4 ${hoverStyles.row} cursor-pointer group`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 border border-blue-500/30 bg-blue-50/80 dark:bg-blue-500/10 flex items-center justify-center">
                      <Laptop className={`${iconSize.xl} text-blue-500`} />
                    </div>
                    <div>
                      <p className={`font-display font-bold text-sm uppercase group-hover:text-lime-600 dark:group-hover:text-lime-400 transition-colors ${text.primary}`}>
                        {asset.brand} {asset.model}
                      </p>
                      <p className={`font-mono text-xs ${text.muted}`}>S/N: {asset.serial_number}</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 font-mono font-bold text-xs text-lime-700 dark:text-lime-400 border border-lime-500/30 dark:border-lime-400/20 hover:bg-lime-500 hover:text-black uppercase tracking-widest transition-all btn-chamfer">
                    Review
                  </button>
                </motion.div>
              ))
            ) : (
              <div className="py-12 text-center">
                <CheckCircle className={`${iconSize['2xl']} mx-auto mb-3 text-emerald-500/50`} />
                <p className={`font-display font-bold uppercase tracking-wide ${text.muted}`}>Queue Clear</p>
                <p className={`font-mono text-xs mt-1 ${text.muted}`}>No assets pending review</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Facility QC Queue */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={glass.subtle}
        >
          <div className="p-6 border-b border-slate-200/80 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Search className={`${iconSize.lg} text-amber-500`} />
              <h2 className={`font-brand font-bold text-lg uppercase tracking-wide ${text.primary}`}>Facility QC</h2>
            </div>
            <Badge variant="warning" size="sm">{qcQueue.length} pending</Badge>
          </div>
          <div className="divide-y divide-slate-200/60 dark:divide-zinc-800/60">
            {qcQueue.length > 0 ? (
              qcQueue.slice(0, 4).map((asset, index) => (
                <motion.div
                  key={asset.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className={`flex items-center justify-between p-4 ${hoverStyles.row} cursor-pointer group`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 border border-amber-500/30 bg-amber-50/80 dark:bg-amber-500/10 flex items-center justify-center">
                      <Search className={`${iconSize.xl} text-amber-500`} />
                    </div>
                    <div>
                      <p className={`font-display font-bold text-sm uppercase group-hover:text-lime-600 dark:group-hover:text-lime-400 transition-colors ${text.primary}`}>
                        {asset.brand} {asset.model}
                      </p>
                      <p className={`font-mono text-xs ${text.muted}`}>Arrived: 2 hours ago</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 font-mono font-bold text-xs text-slate-700 dark:text-zinc-300 border border-slate-300 dark:border-zinc-600 hover:border-lime-500 hover:text-lime-600 dark:hover:text-lime-400 uppercase tracking-widest transition-all">
                    Start QC
                  </button>
                </motion.div>
              ))
            ) : (
              <div className="py-12 text-center">
                <CheckCircle className={`${iconSize['2xl']} mx-auto mb-3 text-emerald-500/50`} />
                <p className={`font-display font-bold uppercase tracking-wide ${text.muted}`}>Queue Clear</p>
                <p className={`font-mono text-xs mt-1 ${text.muted}`}>No devices pending QC</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Recent Completions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className={glass.subtle}
      >
        <div className="p-6 border-b border-slate-200/80 dark:border-zinc-800">
          <h2 className={`font-brand font-bold text-lg uppercase tracking-wide ${text.primary}`}>Recently Completed</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-zinc-800">
                <th className={`text-left py-4 px-6 font-mono font-bold text-xs uppercase tracking-widest ${text.muted}`}>Device</th>
                <th className={`text-left py-4 px-6 font-mono font-bold text-xs uppercase tracking-widest ${text.muted}`}>Serial</th>
                <th className={`text-left py-4 px-6 font-mono font-bold text-xs uppercase tracking-widest ${text.muted}`}>Type</th>
                <th className={`text-left py-4 px-6 font-mono font-bold text-xs uppercase tracking-widest ${text.muted}`}>Result</th>
                <th className={`text-left py-4 px-6 font-mono font-bold text-xs uppercase tracking-widest ${text.muted}`}>Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-zinc-800/60">
              {recentCompletions.map((item, index) => (
                <tr key={index} className={hoverStyles.row}>
                  <td className={`py-4 px-6 font-display font-bold text-sm uppercase ${text.primary}`}>{item.device}</td>
                  <td className={`py-4 px-6 font-mono text-xs ${text.muted}`}>{item.serial}</td>
                  <td className="py-4 px-6">
                    <Badge variant={item.type === 'Remote Review' ? 'info' : 'warning'} size="sm">
                      {item.type}
                    </Badge>
                  </td>
                  <td className="py-4 px-6">
                    <Badge variant={item.result === 'Rejected' ? 'error' : 'success'} size="sm">
                      {item.result}
                    </Badge>
                  </td>
                  <td className={`py-4 px-6 font-mono text-xs ${text.muted}`}>{item.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
