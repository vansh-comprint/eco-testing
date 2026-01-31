import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { safeNumber } from '@/utils/formatters';
import {
  Laptop,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Upload,
  Plus,
  Package,
  Users,
  ArrowRight,
  TrendingUp,
  UserPlus,
  Loader2
} from 'lucide-react';
import { useAuth, useAssets, useAssetsByITAdmin, useBatches, useBatchesByITAdmin, useSubUsers, useBranches, useBranchesByITAdmin } from '@/hooks';
import { formatDistanceToNow } from 'date-fns';
import { Badge, PageHeader, ConnectedSection } from '@/components/ui';
import type { StatAccent, StatBoxItem } from '@/components/ui';
import { useMemo, useContext } from 'react';
import { ITAdminBranchContext } from '@/contexts/ITAdminBranchContext';
import { useOrgBranchSafe } from '@/contexts/OrgBranchContext';
import { iconSize, text, hover as hoverStyles } from '@/lib/design-tokens';

export function ITAdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  // V3: Use React Query hook for auth
  const { user, enterprise } = useAuth();
  const enterpriseId = enterprise?.id || '';
  const userId = user?.id || '';

  // V3.2: Detect if we're in Org Admin context (safety check)
  const isOrgAdmin = user?.role === 'org_admin' || location.pathname.startsWith('/org-admin');
  const basePath = isOrgAdmin ? '/org-admin' : '/admin';

  // V3.2: Fetch assets/batches - Only enable the appropriate query based on role
  const { data: orgAssets = [], isLoading: orgAssetsLoading } = useAssets(isOrgAdmin ? enterpriseId : '');
  const { data: itAssets = [], isLoading: itAssetsLoading } = useAssetsByITAdmin(isOrgAdmin ? '' : userId);
  const { data: orgBatches = [], isLoading: orgBatchesLoading } = useBatches(isOrgAdmin ? enterpriseId : '');
  const { data: itBatches = [], isLoading: itBatchesLoading } = useBatchesByITAdmin(isOrgAdmin ? '' : userId);
  const { data: subUsers = [], isLoading: subUsersLoading } = useSubUsers(enterpriseId);
  const { data: orgBranches = [] } = useBranches(isOrgAdmin ? enterpriseId : '');
  const { data: itBranches = [] } = useBranchesByITAdmin(isOrgAdmin ? '' : userId);

  const itBranchCtx = useContext(ITAdminBranchContext);
  const orgBranchCtx = useOrgBranchSafe();
  const activeBranchFilter = itBranchCtx?.selectedBranchId || orgBranchCtx?.selectedBranchId || null;

  const allAssets = isOrgAdmin ? orgAssets : itAssets;
  const assetsLoading = isOrgAdmin ? orgAssetsLoading : itAssetsLoading;
  const allBatches = isOrgAdmin ? orgBatches : itBatches;
  const batchesLoading = isOrgAdmin ? orgBatchesLoading : itBatchesLoading;
  const myBranches = isOrgAdmin ? orgBranches : itBranches;

  // Apply branch filter from ITAdminBranchContext
  const assets = useMemo(() => {
    if (activeBranchFilter) return allAssets.filter((a: { branch_id?: string }) => a.branch_id === activeBranchFilter);
    return allAssets;
  }, [allAssets, activeBranchFilter]);

  const batches = useMemo(() => {
    if (activeBranchFilter) return allBatches.filter((b: { branch_id?: string }) => b.branch_id === activeBranchFilter);
    return allBatches;
  }, [allBatches, activeBranchFilter]);

  // V3.2: Scope sub-users to IT Admin's branches
  const myBranchIds = useMemo(() => new Set(myBranches.map((b: { id: string }) => b.id)), [myBranches]);
  const scopedSubUsers = useMemo(() => {
    if (activeBranchFilter) return subUsers.filter((su: { branch_id?: string }) => su.branch_id === activeBranchFilter);
    if (isOrgAdmin) return subUsers;
    return subUsers.filter((su: { branch_id?: string }) => su.branch_id && myBranchIds.has(su.branch_id));
  }, [isOrgAdmin, subUsers, myBranchIds, activeBranchFilter]);

  const isLoading = assetsLoading || batchesLoading || subUsersLoading;

  // Calculate asset stats from data
  const assetStats = useMemo(() => {
    const total = assets.length;
    const pending = assets.filter(a => a.status === 'pending_assignment').length;
    const inReview = assets.filter(a => ['assigned', 'check_in_started', 'submitted', 'remote_review'].includes(a.status)).length;
    const accepted = assets.filter(a => ['conditionally_accepted', 'final_accepted', 'payout_pending', 'completed'].includes(a.status)).length;
    return { total, pending, inReview, accepted };
  }, [assets]);

  // Calculate batch stats from data
  const batchStats = useMemo(() => {
    const total = batches.length;
    const completed = batches.filter(b => b.status === 'completed').length;
    const active = batches.filter(b => !['completed', 'cancelled'].includes(b.status)).length;
    const totalValue = batches.reduce((sum, b) => sum + safeNumber(b.estimated_value), 0);
    return { total, completed, active, totalValue };
  }, [batches]);
  // Assets and batches are already filtered by enterpriseId from the hooks
  const enterpriseAssets = assets;
  const enterpriseBatches = batches;

  // Calculate dynamic percentages
  const acceptanceRate = assetStats.total > 0
    ? Math.round((assetStats.accepted / assetStats.total) * 100)
    : 0;
  const pendingRate = assetStats.total > 0
    ? Math.round((assetStats.pending / assetStats.total) * 100)
    : 0;
  const reviewRate = assetStats.total > 0
    ? Math.round((assetStats.inReview / assetStats.total) * 100)
    : 0;
  const completionRate = batchStats.total > 0
    ? Math.round((batchStats.completed / batchStats.total) * 100)
    : 0;

  // Calculate action items
  const stalledAssets = enterpriseAssets.filter(a => {
    if (!['pending_assignment', 'assigned'].includes(a.status)) return false;
    const daysSinceCreated = a.created_at ?
      (Date.now() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24) : 0;
    return daysSinceCreated > 7;
  });

  const rejectedAssets = enterpriseAssets.filter(a =>
    ['remote_rejected', 'final_rejected'].includes(a.status)
  );

  // V3: Batches awaiting Org Admin approval
  const pendingApprovalBatches = enterpriseBatches.filter(b => b.status === 'pending_approval');

  // Helper to find sub-user by ID
  const getSubUserById = (id: string) => scopedSubUsers.find(su => su.id === id);

  // Generate recent activity from asset and batch data
  const recentActivity = useMemo(() => {
    const activities: {
      type: 'submission' | 'accepted' | 'rejected' | 'batch' | 'assigned' | 'created';
      asset: string;
      serial: string | null;
      by: string;
      time: Date;
      id?: string;
    }[] = [];

    enterpriseAssets.forEach(asset => {
      const assetName = `${asset.brand} ${asset.model}`;
      const time = asset.updated_at || asset.created_at;

      if (['submitted', 'remote_review'].includes(asset.status)) {
        const subUser = asset.assigned_to_user_id ? getSubUserById(asset.assigned_to_user_id) : null;
        activities.push({
          type: 'submission',
          asset: assetName,
          serial: asset.serial_number,
          by: subUser?.name || subUser?.email || 'Sub-user',
          time: new Date(time),
          id: asset.id
        });
      } else if (['conditionally_accepted', 'final_accepted', 'payout_pending', 'completed'].includes(asset.status)) {
        activities.push({
          type: 'accepted',
          asset: assetName,
          serial: asset.serial_number,
          by: 'System',
          time: new Date(time),
          id: asset.id
        });
      } else if (['remote_rejected', 'final_rejected'].includes(asset.status)) {
        activities.push({
          type: 'rejected',
          asset: assetName,
          serial: asset.serial_number,
          by: 'System',
          time: new Date(time),
          id: asset.id
        });
      } else if (asset.status === 'assigned' && asset.assigned_at) {
        const subUser = asset.assigned_to_user_id ? getSubUserById(asset.assigned_to_user_id) : null;
        activities.push({
          type: 'assigned',
          asset: assetName,
          serial: asset.serial_number,
          by: subUser?.name || subUser?.email || 'Sub-user',
          time: new Date(asset.assigned_at),
          id: asset.id
        });
      } else if (asset.status === 'pending_assignment') {
        activities.push({
          type: 'created',
          asset: assetName,
          serial: asset.serial_number,
          by: 'IT Admin',
          time: new Date(asset.created_at),
          id: asset.id
        });
      }
    });

    enterpriseBatches.forEach(batch => {
      activities.push({
        type: 'batch',
        asset: batch.name,
        serial: null,
        by: 'You',
        time: new Date(batch.created_at),
        id: batch.id
      });
    });

    return activities
      .sort((a, b) => b.time.getTime() - a.time.getTime())
      .slice(0, 6);
  }, [enterpriseAssets, enterpriseBatches, scopedSubUsers]);

  const activityIcons: Record<string, React.ReactNode> = {
    submission: <Upload className={`${iconSize.md} text-blue-500`} />,
    accepted: <CheckCircle className={`${iconSize.md} text-emerald-500`} />,
    rejected: <XCircle className={`${iconSize.md} text-red-500`} />,
    batch: <Package className={`${iconSize.md} text-lime-500`} />,
    assigned: <UserPlus className={`${iconSize.md} text-purple-500`} />,
    created: <Plus className={`${iconSize.md} text-slate-500 dark:text-zinc-400`} />,
  };

  // Prepare stat items for the grid
  const statItems: StatBoxItem[] = [
    {
      label: 'Total Assets',
      value: assetStats.total,
      subLabel: 'In System',
      icon: <Laptop className={`${iconSize.lg} text-slate-600 dark:text-zinc-400`} />,
      accent: 'brand' as StatAccent,
      onClick: () => navigate(`${basePath}/assets`),
    },
    {
      label: 'Pending',
      value: assetStats.pending,
      subLabel: stalledAssets.length > 0 ? `${stalledAssets.length} stalled` : 'Assignment',
      icon: <Clock className={`${iconSize.lg} ${stalledAssets.length > 0 ? 'text-amber-500' : 'text-slate-600 dark:text-zinc-400'}`} />,
      accent: (stalledAssets.length > 0 ? 'warning' : 'neutral') as StatAccent,
      onClick: () => navigate(`${basePath}/assets?status=pending_assignment`),
    },
    {
      label: 'In Progress',
      value: assetStats.inReview,
      subLabel: 'Processing',
      icon: <TrendingUp className={`${iconSize.lg} text-blue-500`} />,
      accent: 'info' as StatAccent,
      onClick: () => navigate(`${basePath}/assets?status=in_progress`),
    },
    {
      label: 'Accepted',
      value: assetStats.accepted,
      subLabel: 'Completed',
      icon: <CheckCircle className={`${iconSize.lg} text-emerald-500`} />,
      accent: 'success' as StatAccent,
      onClick: () => navigate(`${basePath}/assets?status=accepted`),
    },
  ];

  // Show loading state while data is being fetched
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-lime-500 mx-auto mb-4" />
          <p className={`font-display font-bold uppercase tracking-wide ${text.muted}`}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        label="Dashboard"
        title={`Welcome back, ${user?.name?.split(' ')[0]}`}
        subtitle={enterprise?.name}
      />

      {/* Asset Overview - Connected Stats with Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <ConnectedSection
          title="Asset Overview"
          stats={statItems}
          statColumns={4}
          action={
            <button
              onClick={() => navigate(`${basePath}/assets`)}
              className={`font-mono font-bold text-xs uppercase tracking-widest ${text.muted} hover:text-lime-600 dark:hover:text-lime-400 transition-colors`}
            >
              View All Assets
            </button>
          }
        >
          {/* Recent Activity - Inside the connected section */}
          <div className="divide-y divide-slate-200 dark:divide-zinc-800">
            {recentActivity.length === 0 ? (
              <div className="py-12 text-center">
                <Clock className={`${iconSize['2xl']} mx-auto mb-3 ${text.muted}`} />
                <p className={`font-display font-bold uppercase tracking-wide ${text.muted}`}>No recent activity</p>
                <p className={`text-xs mt-1 ${text.muted}`}>Upload assets to get started</p>
              </div>
            ) : (
              recentActivity.slice(0, 4).map((item, index) => (
                <motion.div
                  key={item.id || index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * index }}
                  onClick={() => {
                    if (item.type === 'batch') {
                      navigate(`${basePath}/batches/${item.id}`);
                    } else if (item.type === 'submission') {
                      navigate(`${basePath}/submissions/${item.id}`);
                    } else if (item.id) {
                      navigate(`${basePath}/assets/${item.id}`);
                    }
                  }}
                  className={`flex items-center gap-4 px-6 py-4 ${hoverStyles.row} cursor-pointer group`}
                >
                  <div className="w-10 h-10 bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/50 flex items-center justify-center rounded-lg">
                    {activityIcons[item.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-display font-bold text-sm truncate group-hover:text-lime-600 dark:group-hover:text-lime-400 transition-colors ${text.primary}`}>
                      {item.asset}
                    </p>
                    <p className={`text-xs ${text.muted}`}>
                      {item.serial && <span>{item.serial} • </span>}
                      by {item.by}
                    </p>
                  </div>
                  <span className={`text-xs whitespace-nowrap ${text.muted}`}>
                    {formatDistanceToNow(item.time, { addSuffix: true })}
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </ConnectedSection>
      </motion.div>

      {/* Action Items & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Action Items */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 shadow-sm shadow-slate-900/[0.04] dark:shadow-none"
        >
          <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <AlertTriangle className={`${iconSize.lg} text-amber-500`} />
              <h2 className={`font-brand font-bold text-base uppercase tracking-wide ${text.primary}`}>
                Action Required
              </h2>
            </div>
            <span className="font-mono font-bold text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-3 py-1 tracking-widest border border-amber-500/25">
              {stalledAssets.length + rejectedAssets.length + pendingApprovalBatches.length} ITEMS
            </span>
          </div>
          <div className="p-5 space-y-3">
            {stalledAssets.length > 0 && (
              <ActionItem
                icon={<Clock className={iconSize.md} />}
                iconColor="text-amber-500"
                title={`${stalledAssets.length} assets pending assignment for 7+ days`}
                description="Assign employees to begin the check-in process"
                action="Assign Now"
                onClick={() => navigate(`${basePath}/assets?status=pending_assignment`)}
              />
            )}
            {rejectedAssets.length > 0 && (
              <ActionItem
                icon={<XCircle className={iconSize.md} />}
                iconColor="text-red-500"
                title={`${rejectedAssets.length} assets rejected`}
                description="Review rejections and submit disputes if needed"
                action="Review"
                onClick={() => navigate(`${basePath}/assets?status=rejected`)}
              />
            )}
            {pendingApprovalBatches.length > 0 && (
              <ActionItem
                icon={<Package className={iconSize.md} />}
                iconColor="text-purple-500"
                title={`${pendingApprovalBatches.length} batch awaiting Org Admin approval`}
                description="Batch requires Org Admin sign-off before pickup scheduling"
                action="View Status"
                onClick={() => navigate(`${basePath}/batches`)}
              />
            )}
            {stalledAssets.length === 0 && rejectedAssets.length === 0 && pendingApprovalBatches.length === 0 && (
              <div className="py-8 text-center">
                <CheckCircle className={`${iconSize['2xl']} mx-auto mb-3 text-emerald-500/50`} />
                <p className={`font-display font-bold uppercase tracking-wide ${text.muted}`}>All caught up</p>
                <p className={`text-xs mt-1 ${text.muted}`}>No pending actions</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 shadow-sm shadow-slate-900/[0.04] dark:shadow-none"
        >
          <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
            <h2 className={`font-brand font-bold text-base uppercase tracking-wide ${text.primary}`}>
              Quick Actions
            </h2>
          </div>
          <div className="p-3 space-y-1">
            <QuickAction
              icon={<Plus className={iconSize.md} />}
              label="Add Single Asset"
              onClick={() => navigate(`${isOrgAdmin ? '/org-admin' : '/admin'}/assets/new`)}
            />
            <QuickAction
              icon={<Upload className={iconSize.md} />}
              label="Bulk Upload CSV"
              onClick={() => navigate(`${isOrgAdmin ? '/org-admin' : '/admin'}/assets/upload`)}
            />
            <QuickAction
              icon={<Users className={iconSize.md} />}
              label="Invite Employees"
              onClick={() => navigate(`${isOrgAdmin ? '/org-admin' : '/admin'}/employees/invite`)}
            />
            <QuickAction
              icon={<Package className={iconSize.md} />}
              label="View Batches"
              onClick={() => navigate(`${isOrgAdmin ? '/org-admin' : '/admin'}/batches`)}
            />
          </div>
        </motion.div>
      </div>

      {/* Batch Overview - Connected Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <ConnectedSection
          title="Batch Overview"
          stats={[
            {
              label: 'Total Batches',
              value: batchStats.total,
              accent: 'neutral' as StatAccent,
            },
            {
              label: 'Expected Value',
              value: `₹${(batchStats.totalValue / 100000).toFixed(1)}L`,
              accent: 'brand' as StatAccent,
            },
            {
              label: 'Completed',
              value: batchStats.completed,
              accent: 'success' as StatAccent,
            },
            {
              label: 'In Progress',
              value: batchStats.active,
              accent: 'info' as StatAccent,
            },
          ]}
          statColumns={4}
          action={
            <button
              onClick={() => navigate(`${basePath}/batches`)}
              className={`font-mono font-bold text-xs uppercase tracking-widest ${text.muted} hover:text-lime-600 dark:hover:text-lime-400 transition-colors`}
            >
              View All Batches
            </button>
          }
        >
          <div className="divide-y divide-slate-200 dark:divide-zinc-800">
            {enterpriseBatches.slice(0, 3).map((batch, index) => {
              const actualAssetCount = enterpriseAssets.filter(a => a.batch_id === batch.id).length;

              return (
                <motion.div
                  key={batch.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.05 * index }}
                  onClick={() => navigate(`${basePath}/batches/${batch.id}`)}
                  className={`flex items-center justify-between px-6 py-4 ${hoverStyles.row} cursor-pointer group`}
                >
                  <div>
                    <p className={`font-display font-bold text-sm uppercase group-hover:text-lime-600 dark:group-hover:text-lime-400 transition-colors ${text.primary}`}>
                      {batch.name}
                    </p>
                    <p className={`text-xs ${text.muted}`}>{actualAssetCount} assets</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <BatchStatusBadge status={batch.status} />
                    <ArrowRight className={`${iconSize.md} ${text.muted} group-hover:text-lime-600 dark:group-hover:text-lime-400 transition-colors`} />
                  </div>
                </motion.div>
              );
            })}
            {enterpriseBatches.length === 0 && (
              <div className="py-8 text-center">
                <Package className={`${iconSize['2xl']} mx-auto mb-3 ${text.muted}`} />
                <p className={`font-display font-bold uppercase tracking-wide ${text.muted}`}>No batches yet</p>
                <p className={`text-xs mt-1 ${text.muted}`}>Create a batch to organize assets</p>
              </div>
            )}
          </div>
        </ConnectedSection>
      </motion.div>
    </div>
  );
}

// Action Item Component
function ActionItem({
  icon,
  iconColor,
  title,
  description,
  action,
  onClick,
}: {
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  description: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className={`flex items-center gap-4 p-4 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/50 ${hoverStyles.row} group`}>
      <div className={`w-10 h-10 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/50 flex items-center justify-center rounded-lg ${iconColor}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-display font-bold text-sm ${text.primary}`}>{title}</p>
        <p className={`text-xs truncate ${text.muted}`}>{description}</p>
      </div>
      <button
        onClick={onClick}
        className="px-4 py-2 font-semibold text-xs text-lime-700 dark:text-lime-400 bg-lime-50 dark:bg-lime-500/10 border border-lime-500/30 dark:border-lime-400/20 hover:bg-lime-500 hover:text-black dark:hover:text-black uppercase tracking-wider transition-all whitespace-nowrap"
      >
        {action}
      </button>
    </div>
  );
}

// Quick Action Component
function QuickAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 bg-slate-50/50 dark:bg-zinc-800/30 border border-slate-100 dark:border-zinc-800/50 hover:bg-slate-100 dark:hover:bg-zinc-800/50 hover:border-slate-200 dark:hover:border-zinc-700/50 text-left group transition-all duration-150`}
    >
      <div className={`w-9 h-9 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/50 group-hover:border-lime-500/30 flex items-center justify-center rounded-lg ${text.muted} group-hover:text-lime-600 dark:group-hover:text-lime-400 transition-all`}>
        {icon}
      </div>
      <span className={`font-display font-bold text-sm uppercase tracking-wide ${text.muted} group-hover:text-slate-900 dark:group-hover:text-zinc-50 transition-colors`}>
        {label}
      </span>
      <ArrowRight className={`${iconSize.md} ${text.muted} group-hover:text-lime-600 dark:group-hover:text-lime-400 ml-auto transition-colors`} />
    </button>
  );
}

// Batch Status Badge Component (V3 updated)
function BatchStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }> = {
    draft: { label: 'Draft', variant: 'default' },
    pending_approval: { label: 'Pending Approval', variant: 'warning' },
    approved: { label: 'Approved', variant: 'success' },
    rejected: { label: 'Rejected', variant: 'error' },
    pickup_scheduled: { label: 'Pickup Scheduled', variant: 'info' },
    picked_up: { label: 'Picked Up', variant: 'info' },
    in_progress: { label: 'In Progress', variant: 'info' },
    completed: { label: 'Completed', variant: 'success' },
    cancelled: { label: 'Cancelled', variant: 'default' },
  };

  const { label, variant } = config[status] || { label: status, variant: 'default' };

  return <Badge variant={variant} size="sm">{label}</Badge>;
}
