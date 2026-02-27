import { useState, useMemo, useContext } from 'react';
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
  ChevronRight,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { InfiniteScrollTrigger, InfiniteScrollInfo } from '@/components/ui';
import { useAuth, useInfinitePickups, useDebounce, useDashboardStats } from '@/hooks';
// PickupRequestStatus type not used — statuses are raw strings from backend
import { pickupTimeSlotLabels } from '@/types/pickup';
import { ITAdminBranchContext } from '@/contexts/ITAdminBranchContext';
import { useOrgBranchSafe } from '@/contexts/OrgBranchContext';

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
  const configs: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending: { label: 'Pending', color: 'border-amber-400/30 bg-amber-400/10 text-amber-500', icon: <Clock className="w-3 h-3" /> },
    assigned_to_logistics_admin: { label: 'Assigned to Admin', color: 'border-blue-400/30 bg-blue-400/10 text-blue-500', icon: <User className="w-3 h-3" /> },
    assigned_to_logistics_user: { label: 'Assigned to Driver', color: 'border-indigo-400/30 bg-indigo-400/10 text-indigo-500', icon: <User className="w-3 h-3" /> },
    scheduled: { label: 'Scheduled', color: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-500', icon: <Calendar className="w-3 h-3" /> },
    in_progress: { label: 'In Progress', color: 'border-purple-400/30 bg-purple-400/10 text-purple-500', icon: <Truck className="w-3 h-3" /> },
    completed: { label: 'Completed', color: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-500', icon: <CheckCircle className="w-3 h-3" /> },
    failed: { label: 'Failed', color: 'border-red-400/30 bg-red-400/10 text-red-500', icon: <XCircle className="w-3 h-3" /> },
    cancelled: { label: 'Cancelled', color: 'border-slate-400/30 bg-slate-400/10 text-slate-500', icon: <XCircle className="w-3 h-3" /> },
  };
  return configs[status] || { label: status?.replace(/_/g, ' ') || 'Unknown', color: 'border-slate-400/30 bg-slate-400/10 text-slate-500', icon: <Clock className="w-3 h-3" /> };
};

export function PickupRequests() {
  const navigate = useNavigate();
  const location = useLocation();
  // V3: Use React Query hook for auth
  const { enterprise, user } = useAuth();
  const enterpriseId = enterprise?.id || '';

  // Determine if org admin context
  const isOrgAdmin = user?.role === 'org_admin' || location.pathname.startsWith('/org-admin');
  const basePath = isOrgAdmin ? '/org-admin' : '/admin';

  const itBranchCtx = useContext(ITAdminBranchContext);
  const orgBranchCtx = useOrgBranchSafe();
  const activeBranchFilter = itBranchCtx?.selectedBranchId || orgBranchCtx?.selectedBranchId || null;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 350);

  // Build server-side params (search + status + enterprise + branch)
  const apiParams = useMemo(() => {
    const params: Record<string, string | undefined> = {};
    if (statusFilter) params.status = statusFilter;
    if (enterpriseId) params.enterprise_id = enterpriseId;
    if (debouncedSearch) params.search = debouncedSearch;
    if (activeBranchFilter) params.branch_id = activeBranchFilter;
    return params;
  }, [statusFilter, enterpriseId, debouncedSearch, activeBranchFilter]);

  const { stats: dashStats } = useDashboardStats();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfinitePickups(apiParams);

  // Flatten pages into a single pickup list
  const allPickups = useMemo(
    () => data?.pages.flatMap(p => p.data ?? []) ?? [],
    [data]
  );

  const totalCount = data?.pages[0]?.pagination?.total ?? 0;

  // All filtering and sorting is server-side (server returns created_at DESC by default)
  const filteredRequests = allPickups;

  // Calculate stats — all from backend dashboard endpoint (filter-independent)
  const stats = useMemo(() => ({
    requested: dashStats.pickup_pending ?? 0,
    scheduled: dashStats.pickup_scheduled ?? 0,
    inProgress: dashStats.pickup_in_progress ?? 0,
    completed: dashStats.pickup_completed ?? 0,
    exceptions: dashStats.pickup_failed ?? 0,
    total: dashStats.pickup_total ?? 0,
  }), [dashStats]);

  // Get location name from REST API response (pickup_locations join)
  const getLocationName = (request: typeof allPickups[0]) => {
    return request.pickup_locations?.name || request.branches?.branch_name || 'Unknown Location';
  };

  const getLocationCity = (request: typeof allPickups[0]) => {
    return request.pickup_locations?.city || request.branches?.city || '';
  };

  // Loading state
  if (isLoading) {
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
          <p className="font-display text-slate-500 dark:text-white/50 text-sm mt-2 uppercase tracking-wide">
            {stats.total || totalCount} total pickup requests
          </p>
        </motion.div>
      </div>

      {/* Stats Row — clickable to filter */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 border-l border-t border-slate-200 dark:border-white/10"
      >
        {[
          { label: 'Requested', value: stats.requested, icon: <Clock className="w-4 h-4" />, highlight: stats.requested > 0, filterValue: 'pending' },
          { label: 'Scheduled', value: stats.scheduled, icon: <Calendar className="w-4 h-4" />, filterValue: 'scheduled' },
          { label: 'In Progress', value: stats.inProgress, icon: <Truck className="w-4 h-4" />, filterValue: 'in_progress' },
          { label: 'Completed', value: stats.completed, icon: <CheckCircle className="w-4 h-4" />, filterValue: 'completed' },
          { label: 'Exceptions', value: stats.exceptions, icon: <AlertTriangle className="w-4 h-4" />, error: stats.exceptions > 0, filterValue: 'failed' },
        ].map((stat) => {
          const isActive = statusFilter === stat.filterValue;
          return (
            <button
              key={stat.label}
              type="button"
              onClick={() => setStatusFilter(prev => prev === stat.filterValue ? '' : stat.filterValue)}
              className={`p-5 border-r border-b text-left transition-colors cursor-pointer ${
                isActive
                  ? 'border-ecotribe-primary/40 bg-ecotribe-primary/10 dark:bg-ecotribe-primary/10'
                  : 'border-slate-200 dark:border-white/10 bg-white/80 dark:bg-black/20 hover:bg-slate-50 dark:hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className={`font-mono font-bold text-xs uppercase tracking-widest ${isActive ? 'text-ecotribe-primary' : 'text-slate-600 dark:text-white/60'}`}>{stat.label}</h4>
                <span className={isActive ? 'text-ecotribe-primary' : stat.highlight ? 'text-amber-500' : stat.error ? 'text-red-400' : 'text-slate-500 dark:text-white/60'}>{stat.icon}</span>
              </div>
              <div className={`font-brand font-bold text-3xl ${isActive ? 'text-ecotribe-primary' : stat.highlight ? 'text-amber-500' : stat.error ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                {stat.value}
              </div>
            </button>
          );
        })}
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
      </motion.div>

      {/* Requests List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]"
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
                              {getLocationName(request)}
                            </h3>
                            {(request.pickup_locations?.state || request.branches?.branch_code) && (
                              <span className="font-mono text-xs text-ecotribe-primary bg-ecotribe-primary/10 px-2 py-0.5">
                                {request.pickup_locations?.state || request.branches?.branch_code}
                              </span>
                            )}
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 border font-mono font-bold text-[10px] uppercase tracking-widest ${statusConfig.color}`}>
                              {statusConfig.icon}
                              {statusConfig.label}
                            </span>
                            {request.priority === 'urgent' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-red-400/30 bg-red-400/10 text-red-500 font-mono font-bold text-[10px] uppercase tracking-widest">
                                Urgent
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-xs text-slate-500 dark:text-white/50">
                            {getLocationCity(request)}
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
                          {(pickupTimeSlotLabels as Record<string, string>)[request.preferred_time_slot || ''] || request.preferred_time_slot}
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

      <InfiniteScrollTrigger
        hasNextPage={!!hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />
      <InfiniteScrollInfo
        loadedCount={allPickups.length}
        totalCount={totalCount}
      />

      {/* Info Banner */}
      <div className="p-4 border border-blue-400/20 bg-blue-400/5">
        <p className="font-mono text-xs text-blue-400">
          <strong>Pickup Flow:</strong> Requested &rarr; Assigned (Logistics Admin assigns agent) &rarr; Scheduled (Date confirmed) &rarr; In Progress (Agent at location) &rarr; Completed
        </p>
      </div>
    </div>
  );
}

export default PickupRequests;
