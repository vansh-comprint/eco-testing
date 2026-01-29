import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2,
  Laptop,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  FileText,
  X
} from 'lucide-react';
import { useAuth, useAllAssets, useEnterprises, useAllBatches } from '@/hooks';
import { useOpsEnterprise } from '@/contexts/OpsEnterpriseContext';
import { PageHeader, DashboardStatGrid, Badge } from '@/components/ui';
import type { StatAccent } from '@/components/ui';
import { glass, text, hover as hoverStyles, iconSize } from '@/lib/design-tokens';

export function MainAdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: assets = [] } = useAllAssets();
  const { data: enterprises = [] } = useEnterprises();
  const { data: batches = [] } = useAllBatches();
  const { selectedEnterprise, selectedEnterpriseId, setSelectedEnterpriseId, isAllEnterprises } = useOpsEnterprise();

  // Filter data based on selected enterprise
  const filteredAssets = isAllEnterprises
    ? assets
    : assets.filter(a => a.enterprise_id === selectedEnterpriseId);

  const filteredBatches = isAllEnterprises
    ? batches
    : batches.filter(b => b.enterprise_id === selectedEnterpriseId);

  const filteredEnterprises = isAllEnterprises
    ? enterprises
    : enterprises.filter(e => e.id === selectedEnterpriseId);

  // Calculate stats based on filtered data
  const totalEnterprises = filteredEnterprises.length;
  const activeEnterprises = filteredEnterprises.filter(e => e.status === 'active').length;
  const totalAssets = filteredAssets.length;
  const pendingReview = filteredAssets.filter(a => a.status === 'submitted' || a.status === 'remote_review').length;
  const pendingQC = filteredAssets.filter(a => a.status === 'in_transit' || a.status === 'facility_qc').length;
  const pendingPayout = filteredAssets.filter(a => a.status === 'payout_pending').length;
  // TODO: Add disputes hook when available
  const pendingDisputes = 0;

  // Calculate total payout value
  const totalPayoutValue = filteredAssets
    .filter(a => a.status === 'completed')
    .reduce((sum, a) => sum + (a.final_price || 0), 0);

  // Handle clicking on enterprise row
  const handleEnterpriseClick = (enterpriseId: string) => {
    setSelectedEnterpriseId(enterpriseId);
  };

  // Handle clearing filter
  const handleClearFilter = () => {
    setSelectedEnterpriseId(null);
  };

  // Prepare stat items for the grid
  const statItems = isAllEnterprises
    ? [
        {
          label: 'Active Enterprises',
          value: activeEnterprises,
          subLabel: `${totalEnterprises} total`,
          icon: <Building2 className={`${iconSize.lg} text-blue-500`} />,
          accent: 'info' as StatAccent,
          onClick: () => navigate('/ops/enterprises'),
        },
        {
          label: 'Total Assets',
          value: totalAssets,
          subLabel: 'Across all enterprises',
          icon: <Laptop className={`${iconSize.lg} text-emerald-500`} />,
          accent: 'success' as StatAccent,
        },
        {
          label: 'Pending Review',
          value: pendingReview,
          subLabel: 'Awaiting action',
          icon: <Clock className={`${iconSize.lg} text-amber-500`} />,
          accent: 'warning' as StatAccent,
          onClick: () => navigate('/ops/reviews'),
        },
        {
          label: 'Total Payouts',
          value: `₹${(totalPayoutValue / 1000).toFixed(0)}K`,
          subLabel: 'Completed',
          icon: <DollarSign className={`${iconSize.lg} text-lime-500`} />,
          accent: 'brand' as StatAccent,
          onClick: () => navigate('/ops/payouts'),
        },
      ]
    : [
        {
          label: 'Total Assets',
          value: totalAssets,
          subLabel: 'For this enterprise',
          icon: <Laptop className={`${iconSize.lg} text-emerald-500`} />,
          accent: 'success' as StatAccent,
          onClick: () => navigate('/ops/assets'),
        },
        {
          label: 'Pending Evaluation',
          value: pendingReview,
          subLabel: 'Awaiting review',
          icon: <Clock className={`${iconSize.lg} text-amber-500`} />,
          accent: 'warning' as StatAccent,
          onClick: () => navigate('/ops/reviews'),
        },
        {
          label: 'Ready for Pickup',
          value: filteredAssets.filter(a => a.status === 'conditionally_accepted' || a.status === 'ready_for_pickup').length,
          subLabel: 'Scheduled',
          icon: <Package className={`${iconSize.lg} text-blue-500`} />,
          accent: 'info' as StatAccent,
          onClick: () => navigate('/ops/pickups'),
        },
        {
          label: 'Credits Earned',
          value: `₹${(totalPayoutValue / 1000).toFixed(0)}K`,
          subLabel: 'Total value',
          icon: <DollarSign className={`${iconSize.lg} text-lime-500`} />,
          accent: 'brand' as StatAccent,
          onClick: () => navigate('/ops/payouts'),
        },
      ];

  // Get recent assets for activity feed (only for specific enterprise view)
  const recentAssets = [...filteredAssets]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <PageHeader
          label={isAllEnterprises ? 'Operations Portal' : 'Enterprise View'}
          title={isAllEnterprises ? `Welcome, ${user?.name?.split(' ')[0]}` : selectedEnterprise?.name || 'Enterprise'}
          subtitle={isAllEnterprises ? 'Platform-wide overview' : `Viewing ${selectedEnterprise?.name}`}
        />
        {!isAllEnterprises && (
          <button
            onClick={handleClearFilter}
            className="flex items-center gap-2 px-4 py-2 border border-red-500/30 bg-red-500/10 text-red-400 font-mono font-bold text-xs uppercase tracking-widest hover:bg-red-500/20 transition-all"
          >
            <X className="w-4 h-4" />
            Clear Filter
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <DashboardStatGrid items={statItems} columns={4} />
      </motion.div>

      {/* Different content based on view mode */}
      {isAllEnterprises ? (
        <>
          {/* ALL ENTERPRISES VIEW */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Platform Pending Items */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={glass.subtle}
            >
              <div className="p-5 border-b border-slate-200/80 dark:border-zinc-800">
                <h2 className={`font-display font-bold text-sm uppercase tracking-wide ${text.primary}`}>
                  Platform Pending Actions
                </h2>
              </div>
              <div className="divide-y divide-slate-200/60 dark:divide-zinc-800/60">
                <button
                  onClick={() => navigate('/ops/applications')}
                  className={`w-full p-4 flex items-center gap-4 ${hoverStyles.row} group`}
                >
                  <div className="w-12 h-12 border border-purple-500/30 bg-purple-50/80 dark:bg-purple-500/10 flex items-center justify-center">
                    <FileText className={`${iconSize.xl} text-purple-500`} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-display font-bold group-hover:text-purple-500 transition-colors ${text.primary}`}>
                      Enterprise Applications
                    </p>
                    <p className={`font-mono text-xs ${text.muted}`}>Pending review</p>
                  </div>
                  <ArrowRight className={`${iconSize.lg} ${text.muted} group-hover:text-purple-500 transition-colors`} />
                </button>

                <button
                  onClick={() => navigate('/ops/reviews')}
                  className={`w-full p-4 flex items-center gap-4 ${hoverStyles.row} group`}
                >
                  <div className="w-12 h-12 border border-amber-500/30 bg-amber-50/80 dark:bg-amber-500/10 flex items-center justify-center">
                    <Clock className={`${iconSize.xl} text-amber-500`} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-display font-bold group-hover:text-amber-500 transition-colors ${text.primary}`}>
                      {pendingReview} Assets Pending Review
                    </p>
                    <p className={`font-mono text-xs ${text.muted}`}>Across all enterprises</p>
                  </div>
                  <ArrowRight className={`${iconSize.lg} ${text.muted} group-hover:text-amber-500 transition-colors`} />
                </button>

                <button
                  onClick={() => navigate('/ops/pickups')}
                  className={`w-full p-4 flex items-center gap-4 ${hoverStyles.row} group`}
                >
                  <div className="w-12 h-12 border border-blue-500/30 bg-blue-50/80 dark:bg-blue-500/10 flex items-center justify-center">
                    <Package className={`${iconSize.xl} text-blue-500`} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-display font-bold group-hover:text-blue-500 transition-colors ${text.primary}`}>
                      Pickups to Schedule
                    </p>
                    <p className={`font-mono text-xs ${text.muted}`}>Pending coordination</p>
                  </div>
                  <ArrowRight className={`${iconSize.lg} ${text.muted} group-hover:text-blue-500 transition-colors`} />
                </button>

                <button
                  onClick={() => navigate('/ops/payouts')}
                  className={`w-full p-4 flex items-center gap-4 ${hoverStyles.row} group`}
                >
                  <div className="w-12 h-12 border border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-500/10 flex items-center justify-center">
                    <DollarSign className={`${iconSize.xl} text-emerald-500`} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-display font-bold group-hover:text-emerald-500 transition-colors ${text.primary}`}>
                      {pendingPayout} Payouts Pending
                    </p>
                    <p className={`font-mono text-xs ${text.muted}`}>Ready for processing</p>
                  </div>
                  <ArrowRight className={`${iconSize.lg} ${text.muted} group-hover:text-emerald-500 transition-colors`} />
                </button>
              </div>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-white/75 dark:bg-zinc-900/85 backdrop-blur-md border border-emerald-500/20 dark:border-emerald-400/15 border-l-4 border-l-emerald-500">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className={`${iconSize.md} text-emerald-500`} />
                    <span className={`font-mono text-xs uppercase ${text.muted}`}>Accepted</span>
                  </div>
                  <p className="font-brand font-bold text-2xl text-emerald-600 dark:text-emerald-400">
                    {filteredAssets.filter(a => a.status === 'final_accepted' || a.status === 'completed').length}
                  </p>
                </div>

                <div className="p-5 bg-white/75 dark:bg-zinc-900/85 backdrop-blur-md border border-red-500/20 dark:border-red-400/15 border-l-4 border-l-red-500">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className={`${iconSize.md} text-red-500`} />
                    <span className={`font-mono text-xs uppercase ${text.muted}`}>Rejected</span>
                  </div>
                  <p className="font-brand font-bold text-2xl text-red-600 dark:text-red-400">
                    {filteredAssets.filter(a => a.status === 'remote_rejected' || a.status === 'final_rejected').length}
                  </p>
                </div>

                <div className="p-5 bg-white/75 dark:bg-zinc-900/85 backdrop-blur-md border border-amber-500/20 dark:border-amber-400/15 border-l-4 border-l-amber-500">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className={`${iconSize.md} text-amber-500`} />
                    <span className={`font-mono text-xs uppercase ${text.muted}`}>In Progress</span>
                  </div>
                  <p className="font-brand font-bold text-2xl text-amber-600 dark:text-amber-400">
                    {filteredAssets.filter(a => !['completed', 'final_accepted', 'final_rejected', 'remote_rejected'].includes(a.status)).length}
                  </p>
                </div>

                <div className="p-5 bg-lime-50/80 dark:bg-lime-500/[0.08] backdrop-blur-md border border-lime-500/25 dark:border-lime-400/20 border-l-4 border-l-lime-500">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className={`${iconSize.md} text-lime-500`} />
                    <span className="font-mono text-xs uppercase text-lime-600 dark:text-lime-400">This Month</span>
                  </div>
                  <p className="font-brand font-bold text-2xl text-lime-700 dark:text-lime-400">
                    ₹{(totalPayoutValue / 1000).toFixed(0)}K
                  </p>
                </div>
              </div>

              {pendingDisputes > 0 && (
                <button
                  onClick={() => navigate('/ops/disputes')}
                  className={`w-full p-4 flex items-center gap-4 bg-red-50/80 dark:bg-red-500/10 border border-red-500/30 ${hoverStyles.row} group`}
                >
                  <div className="w-12 h-12 border border-red-500/30 bg-red-100/80 dark:bg-red-500/20 flex items-center justify-center animate-pulse">
                    <AlertTriangle className={`${iconSize.xl} text-red-500`} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-display font-bold group-hover:text-red-500 transition-colors ${text.primary}`}>
                      {pendingDisputes} Disputes Pending
                    </p>
                    <p className={`font-mono text-xs ${text.muted}`}>Requires resolution</p>
                  </div>
                  <ArrowRight className={`${iconSize.lg} ${text.muted} group-hover:text-red-500 transition-colors`} />
                </button>
              )}
            </motion.div>
          </div>

          {/* Enterprise Overview Table */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={glass.subtle}
          >
            <div className="p-5 border-b border-slate-200/80 dark:border-zinc-800 flex items-center justify-between">
              <h2 className={`font-display font-bold text-sm uppercase tracking-wide ${text.primary}`}>
                Enterprise Overview
              </h2>
              <p className={`font-mono text-xs ${text.muted}`}>Click to filter by enterprise</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-zinc-800">
                    <th className={`p-4 text-left font-mono font-bold text-xs uppercase tracking-widest ${text.muted}`}>
                      Enterprise
                    </th>
                    <th className={`p-4 text-left font-mono font-bold text-xs uppercase tracking-widest ${text.muted}`}>
                      Status
                    </th>
                    <th className={`p-4 text-left font-mono font-bold text-xs uppercase tracking-widest ${text.muted}`}>
                      Assets
                    </th>
                    <th className={`p-4 text-left font-mono font-bold text-xs uppercase tracking-widest ${text.muted}`}>
                      Pending
                    </th>
                    <th className={`p-4 text-left font-mono font-bold text-xs uppercase tracking-widest ${text.muted}`}>
                      Total Value
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-zinc-800/60">
                  {enterprises.map((enterprise) => {
                    const enterpriseAssets = assets.filter(a => a.enterprise_id === enterprise.id);
                    const enterprisePending = enterpriseAssets.filter(a =>
                      ['submitted', 'remote_review', 'in_transit', 'facility_qc'].includes(a.status)
                    ).length;
                    const enterpriseValue = enterpriseAssets.reduce((sum, a) => sum + (a.final_price || a.base_price || 0), 0);

                    return (
                      <tr
                        key={enterprise.id}
                        onClick={() => handleEnterpriseClick(enterprise.id)}
                        className={`${hoverStyles.row} cursor-pointer`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 border border-slate-200/80 dark:border-zinc-700 bg-slate-50/80 dark:bg-zinc-800/50 flex items-center justify-center">
                              <Building2 className={`${iconSize.lg} ${text.muted}`} />
                            </div>
                            <div>
                              <p className={`font-display font-bold ${text.primary}`}>{enterprise.name}</p>
                              <p className={`font-mono text-xs ${text.muted}`}>{enterprise.contact_email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant={enterprise.status === 'active' ? 'success' : 'warning'} size="sm">
                            {enterprise.status}
                          </Badge>
                        </td>
                        <td className={`p-4 font-mono font-bold ${text.primary}`}>{enterpriseAssets.length}</td>
                        <td className="p-4">
                          {enterprisePending > 0 ? (
                            <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 font-mono font-bold text-xs">
                              {enterprisePending}
                            </span>
                          ) : (
                            <span className={`font-mono text-xs ${text.muted}`}>-</span>
                          )}
                        </td>
                        <td className="p-4 font-mono font-bold text-lime-600 dark:text-lime-400">
                          ₹{enterpriseValue.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      ) : (
        <>
          {/* SPECIFIC ENTERPRISE VIEW */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Enterprise Pending Items */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={glass.subtle}
            >
              <div className="p-5 border-b border-slate-200/80 dark:border-zinc-800">
                <h2 className={`font-display font-bold text-sm uppercase tracking-wide ${text.primary}`}>
                  Pending Actions
                </h2>
              </div>
              <div className="divide-y divide-slate-200/60 dark:divide-zinc-800/60">
                <button
                  onClick={() => navigate('/ops/reviews')}
                  className={`w-full p-4 flex items-center gap-4 ${hoverStyles.row} group`}
                >
                  <div className="w-12 h-12 border border-amber-500/30 bg-amber-50/80 dark:bg-amber-500/10 flex items-center justify-center">
                    <Clock className={`${iconSize.xl} text-amber-500`} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-display font-bold group-hover:text-amber-500 transition-colors ${text.primary}`}>
                      {pendingReview} Evaluations Pending
                    </p>
                    <p className={`font-mono text-xs ${text.muted}`}>Awaiting remote review</p>
                  </div>
                  <ArrowRight className={`${iconSize.lg} ${text.muted} group-hover:text-amber-500 transition-colors`} />
                </button>

                <button
                  onClick={() => navigate('/ops/pickups')}
                  className={`w-full p-4 flex items-center gap-4 ${hoverStyles.row} group`}
                >
                  <div className="w-12 h-12 border border-blue-500/30 bg-blue-50/80 dark:bg-blue-500/10 flex items-center justify-center">
                    <Package className={`${iconSize.xl} text-blue-500`} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-display font-bold group-hover:text-blue-500 transition-colors ${text.primary}`}>
                      {filteredAssets.filter(a => a.status === 'conditionally_accepted').length} Ready for Pickup
                    </p>
                    <p className={`font-mono text-xs ${text.muted}`}>Schedule coordination</p>
                  </div>
                  <ArrowRight className={`${iconSize.lg} ${text.muted} group-hover:text-blue-500 transition-colors`} />
                </button>

                <button
                  onClick={() => navigate('/ops/payouts')}
                  className={`w-full p-4 flex items-center gap-4 ${hoverStyles.row} group`}
                >
                  <div className="w-12 h-12 border border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-500/10 flex items-center justify-center">
                    <DollarSign className={`${iconSize.xl} text-emerald-500`} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-display font-bold group-hover:text-emerald-500 transition-colors ${text.primary}`}>
                      {pendingPayout} Payouts Pending
                    </p>
                    <p className={`font-mono text-xs ${text.muted}`}>Ready for processing</p>
                  </div>
                  <ArrowRight className={`${iconSize.lg} ${text.muted} group-hover:text-emerald-500 transition-colors`} />
                </button>

                {pendingDisputes > 0 && (
                  <button
                    onClick={() => navigate('/ops/disputes')}
                    className={`w-full p-4 flex items-center gap-4 ${hoverStyles.row} group`}
                  >
                    <div className="w-12 h-12 border border-red-500/30 bg-red-50/80 dark:bg-red-500/10 flex items-center justify-center animate-pulse">
                      <AlertTriangle className={`${iconSize.xl} text-red-500`} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`font-display font-bold group-hover:text-red-500 transition-colors ${text.primary}`}>
                        {pendingDisputes} Disputes Pending
                      </p>
                      <p className={`font-mono text-xs ${text.muted}`}>Requires resolution</p>
                    </div>
                    <ArrowRight className={`${iconSize.lg} ${text.muted} group-hover:text-red-500 transition-colors`} />
                  </button>
                )}
              </div>
            </motion.div>

            {/* Recent Activity for this Enterprise */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className={glass.subtle}
            >
              <div className="p-5 border-b border-slate-200/80 dark:border-zinc-800 flex items-center justify-between">
                <h2 className={`font-display font-bold text-sm uppercase tracking-wide ${text.primary}`}>
                  Recent Activity
                </h2>
                <button
                  onClick={() => navigate('/ops/assets')}
                  className={`font-mono font-bold text-xs uppercase tracking-widest ${text.muted} hover:text-lime-600 dark:hover:text-lime-400 transition-colors`}
                >
                  View All
                </button>
              </div>
              <div className="divide-y divide-slate-200/60 dark:divide-zinc-800/60">
                {recentAssets.length > 0 ? (
                  recentAssets.map((asset) => (
                    <div key={asset.id} className={`p-4 flex items-center gap-4 ${hoverStyles.row}`}>
                      <div className="w-10 h-10 border border-slate-200/80 dark:border-zinc-700 bg-slate-50/80 dark:bg-zinc-800/50 flex items-center justify-center">
                        <Laptop className={`${iconSize.lg} ${text.muted}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-display font-bold text-sm truncate ${text.primary}`}>
                          {asset.brand} {asset.model}
                        </p>
                        <p className={`font-mono text-xs ${text.muted}`}>
                          {new Date(asset.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge
                        variant={
                          asset.status === 'completed' || asset.status === 'final_accepted' ? 'success' :
                          asset.status === 'remote_rejected' || asset.status === 'final_rejected' ? 'error' : 'warning'
                        }
                        size="xs"
                      >
                        {asset.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <Laptop className={`w-12 h-12 mx-auto mb-3 ${text.muted}`} />
                    <p className={`font-display ${text.muted}`}>No assets yet</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Quick Stats Row for Enterprise View */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="p-5 bg-white/75 dark:bg-zinc-900/85 backdrop-blur-md border border-emerald-500/20 dark:border-emerald-400/15 border-l-4 border-l-emerald-500"
            >
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className={`${iconSize.md} text-emerald-500`} />
                <span className={`font-mono text-xs uppercase ${text.muted}`}>Accepted</span>
              </div>
              <p className="font-brand font-bold text-2xl text-emerald-600 dark:text-emerald-400">
                {filteredAssets.filter(a => a.status === 'final_accepted' || a.status === 'completed').length}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="p-5 bg-white/75 dark:bg-zinc-900/85 backdrop-blur-md border border-red-500/20 dark:border-red-400/15 border-l-4 border-l-red-500"
            >
              <div className="flex items-center gap-2 mb-2">
                <XCircle className={`${iconSize.md} text-red-500`} />
                <span className={`font-mono text-xs uppercase ${text.muted}`}>Rejected</span>
              </div>
              <p className="font-brand font-bold text-2xl text-red-600 dark:text-red-400">
                {filteredAssets.filter(a => a.status === 'remote_rejected' || a.status === 'final_rejected').length}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="p-5 bg-white/75 dark:bg-zinc-900/85 backdrop-blur-md border border-amber-500/20 dark:border-amber-400/15 border-l-4 border-l-amber-500"
            >
              <div className="flex items-center gap-2 mb-2">
                <Clock className={`${iconSize.md} text-amber-500`} />
                <span className={`font-mono text-xs uppercase ${text.muted}`}>In Progress</span>
              </div>
              <p className="font-brand font-bold text-2xl text-amber-600 dark:text-amber-400">
                {filteredAssets.filter(a => !['completed', 'final_accepted', 'final_rejected', 'remote_rejected'].includes(a.status)).length}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="p-5 bg-lime-50/80 dark:bg-lime-500/[0.08] backdrop-blur-md border border-lime-500/25 dark:border-lime-400/20 border-l-4 border-l-lime-500"
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className={`${iconSize.md} text-lime-500`} />
                <span className="font-mono text-xs uppercase text-lime-600 dark:text-lime-400">Total Value</span>
              </div>
              <p className="font-brand font-bold text-2xl text-lime-700 dark:text-lime-400">
                ₹{(totalPayoutValue / 1000).toFixed(0)}K
              </p>
            </motion.div>
          </div>

          {/* Batches for Enterprise View */}
          {filteredBatches.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className={glass.subtle}
            >
              <div className="p-5 border-b border-slate-200/80 dark:border-zinc-800 flex items-center justify-between">
                <h2 className={`font-display font-bold text-sm uppercase tracking-wide ${text.primary}`}>
                  Batches
                </h2>
                <span className={`font-mono text-xs ${text.muted}`}>{filteredBatches.length} total</span>
              </div>
              <div className="divide-y divide-slate-200/60 dark:divide-zinc-800/60">
                {filteredBatches.slice(0, 5).map((batch) => (
                  <div key={batch.id} className={`p-4 flex items-center gap-4 ${hoverStyles.row}`}>
                    <div className="w-10 h-10 border border-slate-200/80 dark:border-zinc-700 bg-slate-50/80 dark:bg-zinc-800/50 flex items-center justify-center">
                      <Package className={`${iconSize.lg} ${text.muted}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-display font-bold text-sm truncate ${text.primary}`}>
                        {batch.name}
                      </p>
                      <p className={`font-mono text-xs ${text.muted}`}>
                        {new Date(batch.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      variant={
                        batch.status === 'completed' ? 'success' :
                        batch.status === 'cancelled' ? 'error' : 'warning'
                      }
                      size="xs"
                    >
                      {batch.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}

export default MainAdminDashboard;
