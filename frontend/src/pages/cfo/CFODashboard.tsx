import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileCheck,
  DollarSign,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  BarChart3,
  UserPlus
} from 'lucide-react';
import { useAuth, useAssets, useBatches, useEnterprises } from '@/hooks';
import { PageHeader, DashboardStatGrid, Badge } from '@/components/ui';
import type { StatAccent } from '@/components/ui';
import { glass, text, hover as hoverStyles, iconSize } from '@/lib/design-tokens';
import { AddITAdminModal } from '@/pages/cfo';

export function CFODashboard() {
  const navigate = useNavigate();
  const [isAddITAdminModalOpen, setIsAddITAdminModalOpen] = useState(false);
  const { user, enterprise } = useAuth();
  const enterpriseId = enterprise?.id || '';
  const { data: assets = [] } = useAssets(enterpriseId);
  const { data: batches = [] } = useBatches(enterpriseId);
  const { data: enterprises = [] } = useEnterprises();

  // Get batches requiring Org Admin approval (was CFO)
  const pendingApprovals = batches.filter(b => b.status === 'pending_approval');
  const approvedBatches = batches.filter(b => b.approval_status === 'approved');
  const rejectedBatches = batches.filter(b => b.approval_status === 'rejected');

  // Submission metrics
  const submittedAssets = assets.filter(a => ['submitted', 'remote_review', 'conditionally_accepted'].includes(a.status));
  const estimatedSubmissionValue = submittedAssets.reduce((sum, a) => sum + (a.base_price || 0), 0);

  // Financial metrics
  const totalPayoutValue = assets
    .filter(a => a.status === 'completed')
    .reduce((sum, a) => sum + (a.final_price || 0), 0);

  const pendingPayoutValue = assets
    .filter(a => a.status === 'final_accepted' || a.status === 'payout_pending')
    .reduce((sum, a) => sum + (a.final_price || a.base_price || 0), 0);

  const pendingApprovalValue = pendingApprovals.reduce((sum, b) => sum + (b.estimated_value || 0), 0);

  // Prepare stat items for the grid
  const statItems = [
    {
      label: 'Pending Approvals',
      value: pendingApprovals.length,
      subLabel: `₹${(pendingApprovalValue / 100000).toFixed(1)}L value`,
      icon: <Clock className={`${iconSize.lg} text-amber-500`} />,
      accent: (pendingApprovals.length > 0 ? 'warning' : 'neutral') as StatAccent,
      onClick: () => navigate('/org-admin/approvals'),
    },
    {
      label: 'Total Disbursed',
      value: `₹${(totalPayoutValue / 100000).toFixed(1)}L`,
      subLabel: 'Completed payouts',
      icon: <DollarSign className={`${iconSize.lg} text-emerald-500`} />,
      accent: 'success' as StatAccent,
      onClick: () => navigate('/org-admin/reports'),
    },
    {
      label: 'Pending Payout',
      value: `₹${(pendingPayoutValue / 100000).toFixed(1)}L`,
      subLabel: 'Ready to process',
      icon: <TrendingUp className={`${iconSize.lg} text-blue-500`} />,
      accent: 'info' as StatAccent,
      onClick: () => navigate('/org-admin/payouts'),
    },
    {
      label: 'EPR Pending',
      value: batches.filter(b => b.epr_status === 'pending' || !b.epr_certificate_id).length,
      subLabel: 'Certificates needed',
      icon: <FileText className={`${iconSize.lg} text-purple-500`} />,
      accent: 'neutral' as StatAccent,
      onClick: () => navigate('/org-admin/epr'),
    },
  ];

  const getEnterpriseName = (entId: string) => {
    return enterprises.find(e => e.id === entId)?.name || 'Unknown';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        label="CFO Portal"
        title={`Welcome, ${user?.name?.split(' ')[0]}`}
        subtitle="Financial oversight and batch approvals"
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

      {/* Urgent Alert */}
      {pendingApprovals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-amber-500/40 bg-amber-50/80 dark:bg-amber-500/10 p-5"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 border border-amber-500/50 bg-amber-100/80 dark:bg-amber-500/20 flex items-center justify-center animate-pulse">
              <AlertCircle className={`${iconSize.xl} text-amber-500`} />
            </div>
            <div className="flex-1">
              <p className={`font-display font-bold uppercase ${text.primary}`}>
                {pendingApprovals.length} Batch{pendingApprovals.length > 1 ? 'es' : ''} Awaiting Your Approval
              </p>
              <p className="font-mono text-xs text-amber-600 dark:text-amber-400 mt-1">
                Total value: ₹{pendingApprovalValue.toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => navigate('/org-admin/approvals')}
              className="px-5 py-2.5 bg-amber-500 text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-amber-400 transition-all flex items-center gap-2"
            >
              Review Now
              <ArrowRight className={iconSize.md} />
            </button>
          </div>
        </motion.div>
      )}

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <DashboardStatGrid items={statItems} columns={4} />
      </motion.div>

      {/* Pending Approvals List */}
      {pendingApprovals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={glass.subtle}
        >
          <div className="p-5 border-b border-slate-200/80 dark:border-zinc-800 flex items-center justify-between">
            <h2 className={`font-display font-bold text-sm uppercase tracking-wide ${text.primary}`}>
              Pending Approvals
            </h2>
            <button
              onClick={() => navigate('/org-admin/approvals')}
              className={`font-mono font-bold text-xs uppercase tracking-widest ${text.muted} hover:text-lime-600 dark:hover:text-lime-400 transition-colors flex items-center gap-1`}
            >
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-slate-200/60 dark:divide-zinc-800/60">
            {pendingApprovals.slice(0, 3).map((batch) => (
              <div key={batch.id} className={`p-5 flex items-center gap-5 ${hoverStyles.row}`}>
                <div className="w-14 h-14 border border-amber-500/30 bg-amber-50/80 dark:bg-amber-500/10 flex items-center justify-center">
                  <FileCheck className={`${iconSize.xl} text-amber-500`} />
                </div>
                <div className="flex-1">
                  <h3 className={`font-display font-bold uppercase ${text.primary}`}>{batch.name}</h3>
                  <p className={`font-mono text-xs ${text.muted}`}>{getEnterpriseName(batch.enterprise_id)}</p>
                  <div className={`flex items-center gap-4 mt-2 font-mono text-xs ${text.muted}`}>
                    <span>{batch.asset_count || 0} assets</span>
                    <span>₹{(batch.estimated_value || 0).toLocaleString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/org-admin/approvals/${batch.id}`)}
                  className="px-5 py-2.5 border border-amber-500/30 bg-amber-50/80 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-bold text-xs uppercase tracking-widest hover:bg-amber-100/80 dark:hover:bg-amber-500/20 transition-all"
                >
                  Review
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recent Activity & Financial Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                ₹{(totalPayoutValue / 100000).toFixed(2)}L
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-200/60 dark:border-zinc-800/60">
              <div className="flex items-center gap-3">
                <Clock className={`${iconSize.lg} text-amber-500`} />
                <span className={`font-display ${text.secondary}`}>Pending Payouts</span>
              </div>
              <span className="font-brand font-bold text-xl text-amber-600 dark:text-amber-400">
                ₹{(pendingPayoutValue / 100000).toFixed(2)}L
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-200/60 dark:border-zinc-800/60">
              <div className="flex items-center gap-3">
                <FileCheck className={`${iconSize.lg} text-blue-500`} />
                <span className={`font-display ${text.secondary}`}>Awaiting Approval</span>
              </div>
              <span className="font-brand font-bold text-xl text-blue-600 dark:text-blue-400">
                ₹{(pendingApprovalValue / 100000).toFixed(2)}L
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <TrendingUp className={`${iconSize.lg} text-lime-500`} />
                <span className={`font-display ${text.secondary}`}>Total Pipeline</span>
              </div>
              <span className="font-brand font-bold text-xl text-lime-600 dark:text-lime-400">
                ₹{((totalPayoutValue + pendingPayoutValue + pendingApprovalValue) / 100000).toFixed(2)}L
              </span>
            </div>
          </div>
        </motion.div>

        {/* Approval History */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={glass.subtle}
        >
          <div className="p-5 border-b border-slate-200/80 dark:border-zinc-800">
            <h2 className={`font-display font-bold text-sm uppercase tracking-wide ${text.primary}`}>
              Recent Decisions
            </h2>
          </div>
          <div className="divide-y divide-slate-200/60 dark:divide-zinc-800/60">
            {[...approvedBatches, ...rejectedBatches].slice(0, 4).map((batch) => (
              <div key={batch.id} className={`p-4 flex items-center gap-4 ${hoverStyles.row}`}>
                <div className={`w-10 h-10 border flex items-center justify-center ${
                  batch.approval_status === 'approved'
                    ? 'border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-500/10'
                    : 'border-red-500/30 bg-red-50/80 dark:bg-red-500/10'
                }`}>
                  {batch.approval_status === 'approved' ? (
                    <CheckCircle className={`${iconSize.lg} text-emerald-500`} />
                  ) : (
                    <XCircle className={`${iconSize.lg} text-red-500`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-display font-bold text-sm truncate ${text.primary}`}>{batch.name}</p>
                  <p className={`font-mono text-xs ${text.muted}`}>
                    {batch.asset_count || 0} assets • ₹{(batch.estimated_value || 0).toLocaleString()}
                  </p>
                </div>
                <Badge variant={batch.approval_status === 'approved' ? 'success' : 'error'} size="sm">
                  {batch.approval_status}
                </Badge>
              </div>
            ))}
            {approvedBatches.length === 0 && rejectedBatches.length === 0 && (
              <div className="p-8 text-center">
                <p className={`font-display ${text.muted}`}>No recent decisions</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <button
          onClick={() => navigate('/org-admin/approvals')}
          className={`${glass.subtle} p-5 text-left hover:border-amber-500/30 group transition-all`}
        >
          <FileCheck className={`${iconSize['2xl']} text-amber-500 mb-3`} />
          <h3 className={`font-display font-bold uppercase group-hover:text-amber-500 transition-colors ${text.primary}`}>
            Batch Approvals
          </h3>
          <p className={`font-mono text-xs mt-1 ${text.muted}`}>
            Review and approve high-value batches
          </p>
        </button>

        <button
          onClick={() => navigate('/org-admin/reports')}
          className={`${glass.subtle} p-5 text-left hover:border-blue-500/30 group transition-all`}
        >
          <BarChart3 className={`${iconSize['2xl']} text-blue-500 mb-3`} />
          <h3 className={`font-display font-bold uppercase group-hover:text-blue-500 transition-colors ${text.primary}`}>
            Financial Reports
          </h3>
          <p className={`font-mono text-xs mt-1 ${text.muted}`}>
            View detailed financial analytics
          </p>
        </button>

        <button
          onClick={() => navigate('/org-admin/epr')}
          className={`${glass.subtle} p-5 text-left hover:border-purple-500/30 group transition-all`}
        >
          <FileText className={`${iconSize['2xl']} text-purple-500 mb-3`} />
          <h3 className={`font-display font-bold uppercase group-hover:text-purple-500 transition-colors ${text.primary}`}>
            EPR Certificates
          </h3>
          <p className={`font-mono text-xs mt-1 ${text.muted}`}>
            Manage EPR compliance documents
          </p>
        </button>
      </motion.div>

      {/* Add IT Admin Modal */}
      <AddITAdminModal
        isOpen={isAddITAdminModalOpen}
        onClose={() => setIsAddITAdminModalOpen(false)}
        onSuccess={() => {
          console.log('IT Admin added successfully');
        }}
      />
    </div>
  );
}

export default CFODashboard;
