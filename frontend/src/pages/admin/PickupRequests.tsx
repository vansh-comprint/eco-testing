import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Truck,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  Package,
  AlertTriangle,
  Filter,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Badge } from '@/components/ui';
import { useAuth, usePickupRequests, usePickupsByITAdmin, useAssets, useAssetsByITAdmin } from '@/hooks';
// PickupRequestStatus type not used — statuses are raw strings from backend
import { pickupTimeSlotLabels } from '@/types/pickup';

// Backend PickupStatus values: pending, assigned_to_logistics_admin,
// assigned_to_logistics_user, scheduled, in_progress, completed, failed, cancelled
const STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Assigned to Admin', value: 'assigned_to_logistics_admin' },
  { label: 'Assigned to Driver', value: 'assigned_to_logistics_user' },
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Failed', value: 'failed' },
  { label: 'Cancelled', value: 'cancelled' },
];

const getStatusConfig = (status: string) => {
  const configs: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info'; icon: React.ReactNode }> = {
    pending: { label: 'Pending', variant: 'warning', icon: <Clock className="w-3 h-3" /> },
    assigned_to_logistics_admin: { label: 'Assigned to Admin', variant: 'info', icon: <User className="w-3 h-3" /> },
    assigned_to_logistics_user: { label: 'Assigned to Driver', variant: 'info', icon: <User className="w-3 h-3" /> },
    scheduled: { label: 'Scheduled', variant: 'info', icon: <Calendar className="w-3 h-3" /> },
    in_progress: { label: 'In Progress', variant: 'warning', icon: <Truck className="w-3 h-3" /> },
    completed: { label: 'Completed', variant: 'success', icon: <CheckCircle className="w-3 h-3" /> },
    failed: { label: 'Failed', variant: 'error', icon: <XCircle className="w-3 h-3" /> },
    cancelled: { label: 'Cancelled', variant: 'error', icon: <XCircle className="w-3 h-3" /> },
  };
  return configs[status] || { label: status?.replace(/_/g, ' ') || 'Unknown', variant: 'default' as const, icon: <Clock className="w-3 h-3" /> };
};

export function PickupRequests() {
  const navigate = useNavigate();
  const location = useLocation();
  // V3: Use React Query hook for auth
  const { enterprise, user } = useAuth();
  const enterpriseId = enterprise?.id || '';
  const userId = user?.id || '';

  // Determine if org admin context
  const isOrgAdmin = user?.role === 'org_admin' || location.pathname.startsWith('/org-admin');
  const basePath = isOrgAdmin ? '/org-admin' : '/admin';

  // V3.2: React Query hooks - use different hooks based on role
  const { data: orgPickups = [], isLoading: orgPickupsLoading } = usePickupRequests(isOrgAdmin ? enterpriseId : '');
  const { data: itPickups = [], isLoading: itPickupsLoading } = usePickupsByITAdmin(isOrgAdmin ? '' : userId);
  const { data: orgAssets = [], isLoading: orgAssetsLoading } = useAssets(isOrgAdmin ? enterpriseId : '');
  const { data: itAssets = [], isLoading: itAssetsLoading } = useAssetsByITAdmin(isOrgAdmin ? '' : userId);

  const pickupRequests = isOrgAdmin ? orgPickups : itPickups;
  const requestsLoading = isOrgAdmin ? orgPickupsLoading : itPickupsLoading;
  const assets = isOrgAdmin ? orgAssets : itAssets;
  const assetsLoading = isOrgAdmin ? orgAssetsLoading : itAssetsLoading;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Calculate stats from data
  const stats = useMemo(() => {
    const readyForPickup = assets.filter(a => a.status === 'ready_for_pickup' || a.status === 'conditionally_accepted').length;
    const requested = pickupRequests.filter(r => r.status === 'pending' || r.status === 'assigned_to_logistics_admin').length;
    const scheduled = pickupRequests.filter(r => r.status === 'scheduled' || r.status === 'assigned_to_logistics_user').length;
    const inProgress = pickupRequests.filter(r => r.status === 'in_progress').length;
    const completed = pickupRequests.filter(r => r.status === 'completed').length;
    const exceptions = pickupRequests.filter(r => r.status === 'failed' || r.status === 'cancelled').length;

    return { readyForPickup, requested, scheduled, inProgress, completed, exceptions };
  }, [pickupRequests, assets]);

  // Filter requests
  const filteredRequests = useMemo(() => {
    let result = [...pickupRequests];

    if (statusFilter) {
      result = result.filter(r => r.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(r => {
        // V3.2: Search by branch info (joined from query)
        const branch = r.branches;
        return (
          r.id.toLowerCase().includes(query) ||
          branch?.branch_name?.toLowerCase().includes(query) ||
          branch?.branch_code?.toLowerCase().includes(query) ||
          branch?.city?.toLowerCase().includes(query)
        );
      });
    }

    // Sort by date descending (use snake_case from database)
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return result;
  }, [pickupRequests, statusFilter, searchQuery]);

  // V3.2: Get branch name from joined data
  const getBranchName = (request: typeof pickupRequests[0]) => {
    return request.branches?.branch_name || 'Unknown Branch';
  };

  const getBranchCity = (request: typeof pickupRequests[0]) => {
    return request.branches?.city || '';
  };

  // Loading state
  if (requestsLoading || assetsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-ecotribe-primary mx-auto mb-4" />
          <p className="font-display font-bold uppercase tracking-wide text-slate-500 dark:text-white/50">Loading pickup requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-2">Logistics</span>
          <h1 className="font-brand font-bold text-3xl md:text-4xl text-slate-900 dark:text-white uppercase tracking-tight">
            Pickup Requests
          </h1>
          <p className="font-display text-slate-500 dark:text-white/50 text-sm mt-2 uppercase tracking-wide">Track and monitor device pickup requests</p>
        </motion.div>
      </div>

      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border-l border-t border-slate-200 dark:border-white/10 bg-white/80 dark:bg-black/20 shadow-sm"
      >
        <StatBox
          label="Ready"
          value={stats.readyForPickup}
          icon={<Package className="w-4 h-4" />}
          highlight={stats.readyForPickup > 0}
        />
        <StatBox
          label="Requested"
          value={stats.requested}
          icon={<Clock className="w-4 h-4" />}
          highlight={stats.requested > 0}
        />
        <StatBox
          label="Scheduled"
          value={stats.scheduled}
          icon={<Calendar className="w-4 h-4" />}
        />
        <StatBox
          label="In Progress"
          value={stats.inProgress}
          icon={<Truck className="w-4 h-4" />}
        />
        <StatBox
          label="Completed"
          value={stats.completed}
          icon={<CheckCircle className="w-4 h-4" />}
        />
        <StatBox
          label="Exceptions"
          value={stats.exceptions}
          icon={<AlertTriangle className="w-4 h-4" />}
          error={stats.exceptions > 0}
        />
      </motion.div>

      {/* Search & Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-white/50" />
          <input
            type="text"
            placeholder="Search by location or request ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-500 dark:text-white/50 flex-shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 appearance-none select-themed cursor-pointer w-full sm:w-auto sm:min-w-[160px]"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-white dark:bg-[#0a0a0a]">
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Requests List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white/80 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10 btn-chamfer"
      >
        {filteredRequests.length > 0 ? (
          <div className="divide-y divide-slate-200 dark:divide-white/5">
            {filteredRequests.map((request, index) => {
              const statusConfig = getStatusConfig(request.status);
              // V3: Use snake_case from database
              const assetCount = request.asset_ids?.length || 0;
              const completedCount = (request.picked_asset_ids || []).length;

              return (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 * Math.min(index, 10) }}
                  onClick={() => navigate(`${basePath}/pickups/${request.id}`)}
                  className="p-5 hover:bg-slate-50 dark:hover:bg-white/[0.05] cursor-pointer transition-colors group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-ecotribe-primary/10 border border-ecotribe-primary/20 flex items-center justify-center flex-shrink-0">
                          <Truck className="w-5 h-5 text-ecotribe-primary" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">
                              {getBranchName(request)}
                            </h3>
                            {request.branches?.branch_code && (
                              <span className="font-mono text-xs text-ecotribe-primary bg-ecotribe-primary/10 px-2 py-0.5">
                                {request.branches.branch_code}
                              </span>
                            )}
                            <Badge variant={statusConfig.variant} size="sm">
                              <span className="flex items-center gap-1">
                                {statusConfig.icon}
                                {statusConfig.label}
                              </span>
                            </Badge>
                            {request.priority === 'urgent' && (
                              <Badge variant="error" size="sm">Urgent</Badge>
                            )}
                          </div>
                          <p className="font-mono text-xs text-slate-500 dark:text-white/50">
                            {getBranchCity(request)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 mt-3 text-slate-500 dark:text-white/50">
                        <span className="flex items-center gap-1.5 font-mono text-xs">
                          <Package className="w-3 h-3" />
                          {completedCount}/{assetCount} devices
                        </span>
                        <span className="flex items-center gap-1.5 font-mono text-xs">
                          <Calendar className="w-3 h-3" />
                          {request.scheduled_date
                            ? format(new Date(request.scheduled_date), 'dd MMM yyyy')
                            : request.preferred_date
                              ? format(new Date(request.preferred_date), 'dd MMM yyyy')
                              : 'Not scheduled'}
                          {request.scheduled_date ? ' (Confirmed)' : ' (Preferred)'}
                        </span>
                        <span className="flex items-center gap-1.5 font-mono text-xs">
                          <Clock className="w-3 h-3" />
                          {pickupTimeSlotLabels[request.preferred_time_slot] || request.preferred_time_slot}
                        </span>
                        {request.logistics_user_id && (
                          <span className="flex items-center gap-1.5 font-mono text-xs text-ecotribe-primary">
                            <User className="w-3 h-3" />
                            Agent Assigned
                          </span>
                        )}
                      </div>

                      <p className="font-mono text-[10px] text-slate-500 dark:text-white/50 mt-2">
                        Created {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                      </p>
                    </div>

                    <ChevronRight className="w-5 h-5 text-slate-500 dark:text-white/50 group-hover:text-ecotribe-primary transition-colors flex-shrink-0" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center">
            <Truck className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="font-display font-bold text-slate-500 dark:text-white/50 uppercase tracking-wide mb-2">No pickup requests</p>
            <p className="font-mono text-xs text-slate-500 dark:text-white/50 mb-6">
              {statusFilter ? 'No requests match your filter' : 'Start by initiating a pickup from your asset list'}
            </p>
            <button
              onClick={() => navigate(`${basePath}/assets?status=ready_for_pickup`)}
              className="interactive px-5 py-2.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all inline-flex items-center gap-2"
            >
              <Package className="w-4 h-4" />
              View Ready Assets
            </button>
          </div>
        )}
      </motion.div>

      {/* Info Banner */}
      <div className="p-4 border border-blue-400/20 bg-blue-400/5">
        <p className="font-mono text-xs text-blue-400">
          <strong>Pickup Flow:</strong> Requested &rarr; Assigned (Logistics Admin assigns agent) &rarr; Scheduled (Date confirmed) &rarr; In Progress (Agent at location) &rarr; Completed
        </p>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  icon,
  highlight,
  error,
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
  highlight?: boolean;
  error?: boolean;
}) {
  return (
    <div className="p-5 border-r border-b border-slate-200 dark:border-white/10 bg-white/85 dark:bg-black/30 shadow-[0_1px_0_rgba(15,23,42,0.04)] hover:border-ecotribe-primary/30 hover:shadow-[0_6px_16px_rgba(15,23,42,0.08)] transition-colors">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-mono font-bold text-xs uppercase tracking-widest text-slate-600 dark:text-white/60">{label}</h4>
        {icon && <span className={`${highlight ? 'text-amber-500' : error ? 'text-red-400' : 'text-slate-500 dark:text-white/60'}`}>{icon}</span>}
      </div>
      <div className={`font-brand font-bold text-3xl ${highlight ? 'text-amber-500' : ''} ${error ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>{value}</div>
    </div>
  );
}

export default PickupRequests;
