import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Package,
  Plus,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  IndianRupee,
  Laptop,
  Send,
  Bell,
  Loader2
} from 'lucide-react';
import { Badge, Dropdown, useToast } from '@/components/ui';
import { useAuth, useBatches, useBatchesByITAdmin, useAssets, useAssetsByITAdmin, useUpdateBatch } from '@/hooks';
import { format, formatDistanceToNow } from 'date-fns';
import type { BatchStatus } from '@/types';
import { getBatchStatusDisplay } from '@/lib/status-display';

// V3: Updated status options - CFO → Org Admin terminology
const STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'Pending Approval', value: 'pending_approval' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Active', value: 'active' },
  { label: 'Processing', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
];

const SORT_OPTIONS = [
  { label: 'Newest First', value: 'newest' },
  { label: 'Oldest First', value: 'oldest' },
  { label: 'Highest Value', value: 'value_desc' },
  { label: 'Most Assets', value: 'assets_desc' },
];

export function BatchList() {
  const navigate = useNavigate();
  const location = useLocation();
  // V3: Use React Query hook for auth
  const { enterprise, user } = useAuth();
  const { addToast } = useToast();

  const userId = user?.id || '';
  const enterpriseId = enterprise?.id || '';

  // Determine base path for navigation
  const isOrgAdmin = user?.role === 'org_admin' || location.pathname.startsWith('/org-admin');

  // Debug logging
  console.log('📋 BatchList - user:', user?.name, 'userId:', userId, 'role:', user?.role, 'isOrgAdmin:', isOrgAdmin);

  // V3.2: React Query hooks - use different hooks based on role
  // Only enable the appropriate queries to avoid unnecessary/problematic requests
  // Org Admin: sees all batches/assets in enterprise
  // IT Admin: sees only their assigned branches
  const { data: orgBatches = [], isLoading: orgBatchesLoading } = useBatches(isOrgAdmin ? enterpriseId : '');
  const { data: itBatches = [], isLoading: itBatchesLoading } = useBatchesByITAdmin(isOrgAdmin ? '' : userId);
  const { data: orgAssets = [], isLoading: orgAssetsLoading } = useAssets(isOrgAdmin ? enterpriseId : '');
  const { data: itAssets = [], isLoading: itAssetsLoading } = useAssetsByITAdmin(isOrgAdmin ? '' : userId);

  const batches = isOrgAdmin ? orgBatches : itBatches;
  const assets = isOrgAdmin ? orgAssets : itAssets;
  const batchesLoading = isOrgAdmin ? orgBatchesLoading : itBatchesLoading;
  const assetsLoading = isOrgAdmin ? orgAssetsLoading : itAssetsLoading;

  // Debug: log batches received
  console.log('📋 BatchList - batches received:', batches.length);
  const updateBatchMutation = useUpdateBatch();
  const basePath = isOrgAdmin ? '/org-admin' : '/admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Filter and sort batches (data already filtered by enterprise from React Query)
  const filteredBatches = useMemo(() => {
    let result = [...batches];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(b => b.name.toLowerCase().includes(query));
    }

    if (statusFilter) {
      result = result.filter(b => b.status === statusFilter);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'value_desc':
          return (b.estimated_value || 0) - (a.estimated_value || 0);
        case 'assets_desc':
          return (b.asset_count || 0) - (a.asset_count || 0);
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [batches, searchQuery, statusFilter, sortBy]);

  const stats = {
    total: batches.length,
    draft: batches.filter(b => b.status === 'draft').length,
    pendingApproval: batches.filter(b => b.status === 'pending_approval' || b.status === 'pending_cfo_approval').length,
    active: batches.filter(b => ['active', 'in_progress', 'approved'].includes(b.status)).length,
    totalValue: batches.reduce((sum, b) => sum + (b.estimated_value || 0), 0),
  };

  // V3: Use centralized status display helper
  const getStatusConfig = (status: BatchStatus) => getBatchStatusDisplay(status);

  // Navigate to batch detail for submission (full form with pickup details)
  const handleSubmitForApproval = (batchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`${basePath}/batches/${batchId}?action=submit`);
  };

  // Send reminder notification (placeholder - would create notification in production)
  const handleNudgeCfo = async (batchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    addToast({
      type: 'info',
      title: 'Reminder Sent',
      message: 'A reminder has been sent to the Org Admin for approval.',
    });
  };

  const handleStatClick = (filterValue: string) => {
    setStatusFilter(filterValue);
  };

  // Loading state
  if (batchesLoading || assetsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-ecotribe-primary mx-auto mb-4" />
          <p className="font-display font-bold uppercase tracking-wide text-slate-500 dark:text-white/50">Loading batches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 border-b border-black/10 dark:border-white/10 pb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-2">Processing</span>
          <h1 className="font-brand font-bold text-3xl md:text-4xl text-black dark:text-white uppercase tracking-tight">
            Batches
          </h1>
          <p className="font-display text-black/60 dark:text-zinc-500 text-sm mt-2 uppercase tracking-wide">Organize assets for processing</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <button
            onClick={() => navigate(`${basePath}/batches/new`)}
            className="interactive px-5 py-2.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white dark:hover:bg-white transition-all flex items-center gap-2 btn-chamfer"
          >
            <Plus className="w-4 h-4" />
            Create Batch
          </button>
        </motion.div>
      </div>

      {/* Stats Grid - Protocol Style */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-5 border-l border-t border-slate-200 dark:border-white/10 bg-white/80 dark:bg-black/20 shadow-sm"
      >
        <StatBox label="Total" value={stats.total} icon={<Package className="w-4 h-4" />} onClick={() => handleStatClick('')} active={statusFilter === ''} />
        <StatBox label="Draft" value={stats.draft} icon={<Clock className="w-4 h-4" />} onClick={() => handleStatClick('draft')} active={statusFilter === 'draft'} />
        <StatBox label="Pending" value={stats.pendingApproval} icon={<AlertTriangle className="w-4 h-4" />} highlight={stats.pendingApproval > 0} onClick={() => handleStatClick('pending_approval')} active={statusFilter === 'pending_approval' || statusFilter === 'pending_cfo_approval'} />
        <StatBox label="Active" value={stats.active} icon={<CheckCircle className="w-4 h-4" />} onClick={() => handleStatClick('active')} active={statusFilter === 'active'} />
        <StatBox label="Total Value" value={`₹${(stats.totalValue / 100000).toFixed(1)}L`} icon={<IndianRupee className="w-4 h-4" />} isText />
      </motion.div>

      {/* Search & Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white/85 dark:bg-black/30 border border-slate-200 dark:border-white/10 p-4 shadow-sm"
      >
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-white/50" />
              <input
                type="text"
                placeholder="Search batches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 font-mono focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-40">
              <Dropdown
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="Status"
              />
            </div>
            <div className="w-36">
              <Dropdown
                options={SORT_OPTIONS}
                value={sortBy}
                onChange={setSortBy}
                placeholder="Sort"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Batch List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        {filteredBatches.length > 0 ? (
          filteredBatches.map((batch, index) => {
            const statusConfig = getStatusConfig(batch.status);
            // V3: Use snake_case from database
            const batchAssets = assets.filter(a => a.batch_id === batch.id);
            const pendingCount = batchAssets.filter(a => a.status === 'pending_assignment').length;

            return (
              <motion.div
                key={batch.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 * Math.min(index, 10) }}
                onClick={() => navigate(`${basePath}/batches/${batch.id}`)}
                className="interactive bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 hover:border-lime-500/30 cursor-pointer transition-all group shadow-sm shadow-slate-900/[0.02] dark:shadow-none"
              >
                <div className="p-6 flex items-center gap-6">
                  {/* Icon */}
                  <div className="w-14 h-14 border border-ecotribe-primary/30 bg-ecotribe-primary/10 flex items-center justify-center">
                    <Package className="w-7 h-7 text-ecotribe-primary" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white group-hover:text-ecotribe-primary transition-colors uppercase">
                        {batch.name}
                      </h3>
                      <Badge variant={statusConfig.variant} size="sm">
                        {statusConfig.label}
                      </Badge>
                      {batch.requires_cfo_approval && batch.status === 'draft' && (
                        <span className="font-mono font-bold text-[10px] text-amber-400 px-2 py-0.5 bg-amber-500/10 uppercase tracking-widest">
                          Requires Approval
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 font-mono text-xs text-slate-500 dark:text-white/50">
                      <span className="flex items-center gap-1.5">
                        <Laptop className="w-3.5 h-3.5" />
                        {batchAssets.length} assets
                      </span>
                      {pendingCount > 0 && (
                        <span className="text-amber-400">
                          {pendingCount} pending
                        </span>
                      )}
                      <span>
                        Created {format(new Date(batch.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>

                  {/* Value */}
                  <div className="hidden sm:block text-right">
                    <p className="font-brand font-bold text-2xl text-ecotribe-primary">
                      ₹{((batch.estimated_value || 0) / 1000).toFixed(0)}K
                    </p>
                    <p className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest">Expected Value</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    {batch.status === 'draft' && (
                      <button
                        onClick={(e) => handleSubmitForApproval(batch.id, e)}
                        className="interactive px-4 py-2 font-mono font-bold text-xs text-ecotribe-primary border border-ecotribe-primary/30 hover:bg-ecotribe-primary hover:text-black uppercase tracking-widest transition-all flex items-center gap-2"
                      >
                        <Send className="w-3 h-3" />
                        Submit for Approval
                      </button>
                    )}
                    {(batch.status === 'pending_cfo_approval' || batch.status === 'pending_approval') && (
                      <button
                        onClick={(e) => handleNudgeCfo(batch.id, e)}
                        className="interactive px-4 py-2 font-mono font-bold text-xs text-amber-400 border border-amber-400/30 hover:bg-amber-400 hover:text-black uppercase tracking-widest transition-all flex items-center gap-2"
                      >
                        <Bell className="w-3 h-3" />
                        Send Reminder
                      </button>
                    )}
                    <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-ecotribe-primary transition-colors" />
                  </div>
                </div>

                {/* Approval Info - V3: Use snake_case from database */}
                {(batch.status === 'approved' || batch.status === 'rejected' || batch.status === 'pending_approval') && (
                  <div className="px-6 py-3 border-t border-white/5">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      {batch.status === 'approved' ? (
                        <>
                          <CheckCircle className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Approved</span>
                          {batch.approved_at && (
                            <span className="text-zinc-600">
                              {formatDistanceToNow(new Date(batch.approved_at), { addSuffix: true })}
                            </span>
                          )}
                        </>
                      ) : batch.status === 'rejected' ? (
                        <>
                          <XCircle className="w-3 h-3 text-red-400" />
                          <span className="text-red-400">Rejected</span>
                          {batch.rejection_reason && (
                            <span className="text-zinc-600">— {batch.rejection_reason}</span>
                          )}
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span className="text-amber-400">Awaiting Approval</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })
        ) : (
          <div className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 py-20 text-center shadow-sm shadow-slate-900/[0.02] dark:shadow-none">
            <Package className="w-12 h-12 text-slate-500 dark:text-white/50 mx-auto mb-4" />
            <p className="font-display font-bold text-slate-500 dark:text-white/50 uppercase tracking-wide mb-2">No batches found</p>
            <p className="font-mono text-xs text-slate-500 dark:text-white/50 mb-6">
              {searchQuery || statusFilter
                ? 'Try adjusting your filters'
                : 'Create your first batch to organize assets'}
            </p>
            {!searchQuery && !statusFilter && (
              <button
                onClick={() => navigate(`${basePath}/batches/new`)}
                className="interactive px-5 py-2.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Batch
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* Results count */}
      {filteredBatches.length > 0 && (
        <p className="font-mono text-xs text-slate-500 dark:text-white/50 text-center uppercase tracking-widest">
          Showing {filteredBatches.length} of {batches.length} batches
        </p>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  icon,
  highlight,
  isText,
  onClick,
  active
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  highlight?: boolean;
  isText?: boolean;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <div
      className={`p-5 border-r border-b border-slate-200 dark:border-white/10 bg-white/85 dark:bg-black/30 shadow-[0_1px_0_rgba(15,23,42,0.04)] dark:shadow-none hover:bg-slate-50 dark:hover:bg-white/[0.05] hover:border-ecotribe-primary/30 hover:shadow-[0_6px_16px_rgba(15,23,42,0.08)] transition-colors group ${highlight ? 'bg-amber-500/5 dark:bg-amber-500/10' : ''} ${onClick ? 'cursor-pointer' : ''} ${active ? 'bg-ecotribe-primary/5 dark:bg-ecotribe-primary/10 border-ecotribe-primary/40' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className={`font-mono font-bold text-xs uppercase tracking-widest group-hover:text-ecotribe-primary transition-colors ${active ? 'text-ecotribe-primary' : 'text-slate-600 dark:text-white/60'}`}>{label}</h4>
        <span className={`${highlight ? 'text-amber-500' : active ? 'text-ecotribe-primary' : 'text-slate-500 dark:text-white/60'} group-hover:text-ecotribe-primary transition-colors`}>{icon}</span>
      </div>
      <div className={`font-brand font-bold ${isText ? 'text-2xl' : 'text-3xl'} ${highlight ? 'text-amber-500' : active ? 'text-ecotribe-primary' : 'text-slate-900 dark:text-white'}`}>{value}</div>
    </div>
  );
}

export default BatchList;
