import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { safeNumber } from '@/utils/formatters';
import {
  FileCheck,
  IndianRupee,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  BarChart3,
  UserPlus,
  Monitor,
  Building2,
  Users,
  Package,
  Truck,
  AlertTriangle,
  Settings,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth, useAssets, useBatches, useBranches, useDashboardStats } from '@/hooks';
import { dashboardStatsKeys } from '@/hooks/useDashboardStats';
import { itAdminKeys } from '@/hooks/useBranches';
import { PageHeader, DashboardStatGrid, Badge, SectionSkeleton } from '@/components/ui';
import type { StatAccent } from '@/components/ui';
import { glass, text, hover as hoverStyles, iconSize } from '@/lib/design-tokens';
import { AddITAdminModal } from '@/pages/org-admin';

export function OrgAdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAddITAdminModalOpen, setIsAddITAdminModalOpen] = useState(false);
  const { user, enterprise } = useAuth();
  const enterpriseId = enterprise?.id || '';

  const { data: assets = [], isLoading: assetsLoading } = useAssets(enterpriseId);
  const { data: batches = [], isLoading: batchesLoading } = useBatches(enterpriseId);
  const { data: branches = [], isLoading: branchesLoading } = useBranches(enterpriseId);
  const { stats } = useDashboardStats();

  // Batch lists for "Recent Decisions" section (needs full objects)
  const approvedBatches = batches.filter(b => ['approved', 'pickup_in_progress', 'completed'].includes(b.status));
  const rejectedBatches = batches.filter(b => b.status === 'rejected');

  // Branch performance (needs asset/batch objects for per-branch breakdown)
  const branchPerformance = useMemo(() => {
    return branches.map(branch => {
      const branchAssets = assets.filter(a => a.branch_id === branch.id);
      const branchBatches = batches.filter(b => b.branch_id === branch.id);
      const completed = branchAssets.filter(a => a.status === 'completed').length;
      const value = branchAssets.reduce((sum, a) => sum + safeNumber(a.final_price || a.base_price), 0);
      return {
        id: branch.id,
        name: branch.branch_name,
        code: branch.branch_code,
        assetCount: branchAssets.length,
        batchCount: branchBatches.length,
        completedCount: completed,
        completionRate: branchAssets.length > 0 ? Math.round((completed / branchAssets.length) * 100) : 0,
        value,
        hasAdmin: !!branch.it_admin_id,
      };
    }).sort((a, b) => b.assetCount - a.assetCount);
  }, [branches, assets, batches]);

  // Convenience aliases from stats
  const pendingApprovalVal = stats.pending_approval_value ?? 0;
  const branchesWithoutAdmin = stats.branch_without_admin ?? 0;
  const pendingApprovalCount = stats.batch_pending_approval ?? 0;

  // Top row: operational stats (from efficient backend COUNT queries)
  const operationalStats = [
    {
      label: 'Total Assets',
      value: stats.asset_total ?? 0,
      subLabel: `${stats.asset_completed ?? 0} completed`,
      icon: <Monitor className={`${iconSize.lg} text-slate-500`} />,
      accent: 'neutral' as StatAccent,
      onClick: () => navigate('/org-admin/enterprise-assets'),
    },
    {
      label: 'Pending Approvals',
      value: pendingApprovalCount,
      subLabel: pendingApprovalVal > 0 ? `₹${(pendingApprovalVal / 100000).toFixed(1)}L value` : 'None pending',
      icon: <Clock className={`${iconSize.lg} text-amber-500`} />,
      accent: (pendingApprovalCount > 0 ? 'warning' : 'neutral') as StatAccent,
      onClick: () => navigate('/org-admin/approvals'),
    },
    {
      label: 'Active Branches',
      value: stats.branch_active ?? 0,
      subLabel: branchesWithoutAdmin > 0 ? `${branchesWithoutAdmin} need admin` : 'All staffed',
      icon: <Building2 className={`${iconSize.lg} text-blue-500`} />,
      accent: (branchesWithoutAdmin > 0 ? 'warning' : 'success') as StatAccent,
      onClick: () => navigate('/org-admin/branches'),
    },
    {
      label: 'IT Admins',
      value: stats.it_admin_active ?? 0,
      subLabel: `${stats.it_admin_total ?? 0} total`,
      icon: <Users className={`${iconSize.lg} text-purple-500`} />,
      accent: 'neutral' as StatAccent,
      onClick: () => navigate('/org-admin/it-admins'),
    },
    {
      label: 'Total Disbursed',
      value: `₹${((stats.total_payout_value ?? 0) / 100000).toFixed(1)}L`,
      subLabel: 'Completed payouts',
      icon: <IndianRupee className={`${iconSize.lg} text-emerald-500`} />,
      accent: 'success' as StatAccent,
      onClick: () => navigate('/org-admin/reports'),
    },
    {
      label: 'Pending Payout',
      value: `₹${((stats.pending_payout_value ?? 0) / 100000).toFixed(1)}L`,
      subLabel: 'Ready to process',
      icon: <TrendingUp className={`${iconSize.lg} text-lime-500`} />,
      accent: 'brand' as StatAccent,
      onClick: () => navigate('/org-admin/wallet'),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        label="Organization Admin Portal"
        title={`Welcome, ${user?.name?.split(' ')[0]}`}
        subtitle={`${enterprise?.name || 'Enterprise'} — ${stats.branch_total ?? branches.length} branches, ${stats.asset_total ?? assets.length} assets`}
        actions={
          <button
            onClick={() => setIsAddITAdminModalOpen(true)}
            className="px-4 py-2.5 bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm border border-slate-200/80 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 font-mono font-bold text-xs uppercase tracking-widest hover:border-blue-500/40 dark:hover:border-blue-400/30 transition-all flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add IT Admin
          </button>
        }
      />

      {/* Urgent Alerts */}
      {(pendingApprovalCount > 0 || branchesWithoutAdmin > 0 || (stats.stalled_batches ?? 0) > 0) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          {pendingApprovalCount > 0 && (
            <div className="border border-amber-500/40 bg-amber-50/80 dark:bg-amber-500/10 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 border border-amber-500/50 bg-amber-100/80 dark:bg-amber-500/20 flex items-center justify-center animate-pulse flex-shrink-0">
                <AlertCircle className={`${iconSize.lg} text-amber-500`} />
              </div>
              <div className="flex-1">
                <p className={`font-display font-bold uppercase text-sm ${text.primary}`}>
                  {pendingApprovalCount} Batch{pendingApprovalCount > 1 ? 'es' : ''} Awaiting Approval
                </p>
                <p className="font-mono text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                  ₹{pendingApprovalVal.toLocaleString()} total value
                  {(stats.stalled_batches ?? 0) > 0 && ` — ${stats.stalled_batches} stalled (>7 days)`}
                </p>
              </div>
              <button
                onClick={() => navigate('/org-admin/approvals')}
                className="w-full sm:w-auto px-4 py-2 bg-amber-500 text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-amber-400 transition-all flex items-center justify-center gap-2"
              >
                Review <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {branchesWithoutAdmin > 0 && (
            <div className="border border-red-500/30 bg-red-50/60 dark:bg-red-500/5 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 border border-red-500/30 bg-red-100/80 dark:bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className={`${iconSize.lg} text-red-500`} />
              </div>
              <div className="flex-1">
                <p className={`font-display font-bold uppercase text-sm ${text.primary}`}>
                  {branchesWithoutAdmin} Branch{branchesWithoutAdmin > 1 ? 'es' : ''} Without IT Admin
                </p>
                <p className="font-mono text-xs text-red-600 dark:text-red-400 mt-0.5">
                  Assign IT Admins to enable operations
                </p>
              </div>
              <button
                onClick={() => navigate('/org-admin/branches')}
                className="w-full sm:w-auto px-4 py-2 border border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-mono font-bold text-xs uppercase tracking-widest hover:bg-red-100 dark:hover:bg-red-500/20 transition-all text-center"
              >
                Manage
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Stats Grid */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <DashboardStatGrid items={operationalStats} columns={3} />
      </motion.div>

      {/* Batch Pipeline */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className={glass.subtle}
      >
        <div className="p-5 border-b border-slate-200/80 dark:border-zinc-800 flex items-center justify-between">
          <h2 className={`font-display font-bold text-sm uppercase tracking-wide ${text.primary}`}>
            Batch Pipeline
          </h2>
          <button
            onClick={() => navigate('/org-admin/enterprise-batches')}
            className={`font-mono font-bold text-xs uppercase tracking-widest ${text.muted} hover:text-lime-600 dark:hover:text-lime-400 transition-colors flex items-center gap-1`}
          >
            View All <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: 'Draft', count: stats.batch_draft ?? 0, color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-white/5', status: 'draft' },
              { label: 'Pending', count: stats.batch_pending_approval ?? 0, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10', status: 'pending_approval' },
              { label: 'Approved', count: stats.batch_approved ?? 0, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', status: 'approved' },
              { label: 'Pickup', count: stats.batch_pickup_in_progress ?? 0, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', status: 'pickup' },
              { label: 'Completed', count: stats.batch_completed ?? 0, color: 'text-lime-500', bg: 'bg-lime-50 dark:bg-lime-500/10', status: 'completed' },
            ].map((stage, i) => (
              <div key={stage.label} className="relative">
                <div
                  onClick={() => navigate(`/org-admin/enterprise-batches?status=${stage.status}`)}
                  className={`p-4 ${stage.bg} border border-slate-200/60 dark:border-white/5 text-center cursor-pointer hover:border-ecotribe-primary/30 transition-colors`}
                >
                  <p className={`font-brand font-bold text-2xl ${stage.color}`}>{stage.count}</p>
                  <p className="font-mono text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-widest mt-1">{stage.label}</p>
                </div>
                {i < 4 && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10">
                    <ArrowRight className="w-3 h-3 text-slate-300 dark:text-zinc-700" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Branch Performance + Financial Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branch Performance */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={glass.subtle}
        >
          <div className="p-5 border-b border-slate-200/80 dark:border-zinc-800 flex items-center justify-between">
            <h2 className={`font-display font-bold text-sm uppercase tracking-wide ${text.primary}`}>
              Branch Performance
            </h2>
            <button
              onClick={() => navigate('/org-admin/branches')}
              className={`font-mono font-bold text-xs uppercase tracking-widest ${text.muted} hover:text-lime-600 dark:hover:text-lime-400 transition-colors flex items-center gap-1`}
            >
              Manage <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-slate-200/60 dark:divide-zinc-800/60">
            {(assetsLoading || batchesLoading || branchesLoading) ? (
              <div className="p-5">
                <SectionSkeleton rows={4} showHeader={false} />
              </div>
            ) : branchPerformance.length === 0 ? (
              <div className="p-8 text-center">
                <p className={`font-display ${text.muted}`}>No branches yet</p>
              </div>
            ) : (
              branchPerformance.slice(0, 5).map((branch) => (
                <div key={branch.id} className={`p-4 ${hoverStyles.row}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span className={`font-display font-bold text-sm uppercase ${text.primary}`}>{branch.name}</span>
                      {!branch.hasAdmin && (
                        <span className="px-1.5 py-0.5 bg-red-50 dark:bg-red-500/10 border border-red-500/20 font-mono text-[9px] text-red-500 uppercase">No Admin</span>
                      )}
                    </div>
                    <span className="font-mono text-xs text-ecotribe-primary font-bold">
                      {branch.completionRate}%
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`font-mono text-xs ${text.muted}`}>{branch.assetCount} assets</span>
                    <span className={`font-mono text-xs ${text.muted}`}>{branch.batchCount} batches</span>
                    {branch.value > 0 && (
                      <span className="font-mono text-xs text-emerald-500">₹{(branch.value / 1000).toFixed(0)}K</span>
                    )}
                  </div>
                  {/* Mini progress bar */}
                  <div className="mt-2 h-1.5 bg-slate-100 dark:bg-white/5 overflow-hidden">
                    <div
                      className="h-full bg-ecotribe-primary transition-all duration-500"
                      style={{ width: `${branch.completionRate}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Financial Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className={glass.subtle}
        >
          <div className="p-5 border-b border-slate-200/80 dark:border-zinc-800 flex items-center justify-between">
            <h2 className={`font-display font-bold text-sm uppercase tracking-wide ${text.primary}`}>
              Financial Summary
            </h2>
            <button
              onClick={() => navigate('/org-admin/reports')}
              className={`font-mono font-bold text-xs uppercase tracking-widest ${text.muted} hover:text-lime-600 dark:hover:text-lime-400 transition-colors`}
            >
              Full Report
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-slate-200/60 dark:border-zinc-800/60">
              <div className="flex items-center gap-3">
                <CheckCircle className={`${iconSize.lg} text-emerald-500`} />
                <span className={`font-display ${text.secondary}`}>Completed Payouts</span>
              </div>
              <span className="font-brand font-bold text-xl text-emerald-600 dark:text-emerald-400">
                ₹{((stats.total_payout_value ?? 0) / 100000).toFixed(2)}L
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-200/60 dark:border-zinc-800/60">
              <div className="flex items-center gap-3">
                <Clock className={`${iconSize.lg} text-amber-500`} />
                <span className={`font-display ${text.secondary}`}>Pending Payouts</span>
              </div>
              <span className="font-brand font-bold text-xl text-amber-600 dark:text-amber-400">
                ₹{((stats.pending_payout_value ?? 0) / 100000).toFixed(2)}L
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-200/60 dark:border-zinc-800/60">
              <div className="flex items-center gap-3">
                <FileCheck className={`${iconSize.lg} text-blue-500`} />
                <span className={`font-display ${text.secondary}`}>Awaiting Approval</span>
              </div>
              <span className="font-brand font-bold text-xl text-blue-600 dark:text-blue-400">
                ₹{(pendingApprovalVal / 100000).toFixed(2)}L
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <TrendingUp className={`${iconSize.lg} text-lime-500`} />
                <span className={`font-display ${text.secondary}`}>Total Pipeline</span>
              </div>
              <span className="font-brand font-bold text-xl text-lime-600 dark:text-lime-400">
                ₹{(((stats.total_payout_value ?? 0) + (stats.pending_payout_value ?? 0) + pendingApprovalVal) / 100000).toFixed(2)}L
              </span>
            </div>
          </div>

          {/* Activity Summary */}
          <div className="p-5 border-t border-slate-200/80 dark:border-zinc-800">
            <h3 className={`font-display font-bold text-xs uppercase tracking-wide ${text.muted} mb-3`}>Active Operations</h3>
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => navigate('/org-admin/enterprise-batches?status=pickup_in_progress')}
                className="p-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 flex items-center gap-3 cursor-pointer hover:border-blue-500/30 transition-colors"
              >
                <Truck className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="font-brand font-bold text-lg text-slate-900 dark:text-white">{stats.active_pickups ?? 0}</p>
                  <p className="font-mono text-[10px] text-slate-500 dark:text-zinc-500 uppercase">Active Pickups</p>
                </div>
              </div>
              <div
                onClick={() => navigate('/org-admin/disputes')}
                className="p-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 flex items-center gap-3 cursor-pointer hover:border-amber-500/30 transition-colors"
              >
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <div>
                  <p className="font-brand font-bold text-lg text-slate-900 dark:text-white">{stats.pending_disputes ?? 0}</p>
                  <p className="font-mono text-[10px] text-slate-500 dark:text-zinc-500 uppercase">Open Disputes</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Decisions + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Decisions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`lg:col-span-2 ${glass.subtle}`}
        >
          <div className="p-5 border-b border-slate-200/80 dark:border-zinc-800">
            <h2 className={`font-display font-bold text-sm uppercase tracking-wide ${text.primary}`}>
              Recent Decisions
            </h2>
          </div>
          <div className="divide-y divide-slate-200/60 dark:divide-zinc-800/60">
            {batchesLoading ? (
              <div className="p-5">
                <SectionSkeleton rows={3} showHeader={false} />
              </div>
            ) : ([...approvedBatches, ...rejectedBatches].length === 0) ? (
              <div className="p-8 text-center">
                <p className={`font-display ${text.muted}`}>No recent decisions</p>
              </div>
            ) : (
              [...approvedBatches, ...rejectedBatches]
                .sort((a, b) => new Date(b.approved_at || b.rejected_at || b.created_at).getTime() - new Date(a.approved_at || a.rejected_at || a.created_at).getTime())
                .slice(0, 5).map((batch) => (
                <div key={batch.id} className={`p-4 flex items-center gap-4 ${hoverStyles.row}`}>
                  <div className={`w-10 h-10 border flex items-center justify-center ${
                    batch.status === 'rejected'
                      ? 'border-red-500/30 bg-red-50/80 dark:bg-red-500/10'
                      : 'border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-500/10'
                  }`}>
                    {batch.status === 'rejected' ? (
                      <XCircle className={`${iconSize.lg} text-red-500`} />
                    ) : (
                      <CheckCircle className={`${iconSize.lg} text-emerald-500`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-display font-bold text-sm truncate ${text.primary}`}>{batch.name}</p>
                    <p className={`font-mono text-xs ${text.muted}`}>
                      {batch.asset_count || 0} assets • ₹{(batch.estimated_value || 0).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={batch.status === 'rejected' ? 'error' : 'success'} size="sm">
                    {batch.status === 'rejected' ? 'Rejected' : 'Approved'}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="space-y-3"
        >
          {[
            { label: 'Batch Approvals', desc: 'Review pending batches', icon: <FileCheck className="w-6 h-6 text-amber-500" />, path: '/org-admin/approvals', hoverColor: 'hover:border-amber-500/30' },
            { label: 'All Assets', desc: 'Enterprise-wide overview', icon: <Monitor className="w-6 h-6 text-blue-500" />, path: '/org-admin/enterprise-assets', hoverColor: 'hover:border-blue-500/30' },
            { label: 'All Batches', desc: 'Batch pipeline view', icon: <Package className="w-6 h-6 text-purple-500" />, path: '/org-admin/enterprise-batches', hoverColor: 'hover:border-purple-500/30' },
            { label: 'Financial Reports', desc: 'Analytics & exports', icon: <BarChart3 className="w-6 h-6 text-emerald-500" />, path: '/org-admin/reports', hoverColor: 'hover:border-emerald-500/30' },
            { label: 'EPR Certificates', desc: 'Compliance docs', icon: <FileText className="w-6 h-6 text-purple-500" />, path: '/org-admin/epr', hoverColor: 'hover:border-purple-500/30' },
            { label: 'Settings', desc: 'Enterprise preferences', icon: <Settings className="w-6 h-6 text-slate-500" />, path: '/org-admin/settings', hoverColor: 'hover:border-slate-400/30' },
          ].map((action) => (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className={`${glass.subtle} w-full p-4 text-left ${action.hoverColor} group transition-all flex items-center gap-4`}
            >
              {action.icon}
              <div>
                <h3 className={`font-display font-bold text-sm uppercase group-hover:text-ecotribe-primary transition-colors ${text.primary}`}>
                  {action.label}
                </h3>
                <p className={`font-mono text-[11px] ${text.muted}`}>{action.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 dark:text-zinc-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </motion.div>
      </div>

      {/* Add IT Admin Modal */}
      <AddITAdminModal
        isOpen={isAddITAdminModalOpen}
        onClose={() => setIsAddITAdminModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: itAdminKeys.all });
          queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.all });
          setIsAddITAdminModalOpen(false);
        }}
      />
    </div>
  );
}

export default OrgAdminDashboard;
