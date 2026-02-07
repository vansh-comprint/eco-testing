import { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, ListChecks, Truck, Users, UserPlus, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth, usePickupRequests, usePickupLocations, useLogisticsUsers } from '@/hooks';
import { PageHeader, ConnectedSection, Badge } from '@/components/ui';
import type { StatAccent, StatBoxItem } from '@/components/ui';
import { text, hover as hoverStyles, iconSize } from '@/lib/design-tokens';

export function ITAdminLogistics() {
  const navigate = useNavigate();
  const location = useLocation();
  // V3: Use React Query hook for auth
  const { enterprise, user } = useAuth();
  const enterpriseId = enterprise?.id || '';

  // V3.2: Detect if we're in Org Admin context
  const isOrgAdmin = user?.role === 'org_admin' || location.pathname.startsWith('/org-admin');
  const basePath = isOrgAdmin ? '/org-admin' : '/admin';

  // V3: React Query hooks
  const { data: pickupRequests = [], isLoading: requestsLoading } = usePickupRequests(enterpriseId);
  const { data: pickupLocations = [] } = usePickupLocations(enterpriseId);
  const { data: logisticsUsers = [], isLoading: usersLoading } = useLogisticsUsers();

  // V3: Calculate summary from data
  const summary = useMemo(() => {
    const pendingAssignment = pickupRequests.filter(r => r.status === 'pending' || r.status === 'assigned_to_logistics_admin').length;
    const assigned = pickupRequests.filter(r => r.status === 'assigned_to_logistics_user').length;
    const scheduled = pickupRequests.filter(r => r.status === 'scheduled').length;
    const inProgress = pickupRequests.filter(r => r.status === 'in_progress').length;
    const completed = pickupRequests.filter(r => r.status === 'completed').length;
    return { pendingAssignment, assigned, scheduled, inProgress, completed };
  }, [pickupRequests]);

  // V3: Get upcoming pickups with snake_case
  const upcoming = useMemo(() => {
    return [...pickupRequests]
      .filter(r => ['pending', 'assigned_to_logistics_admin', 'assigned_to_logistics_user', 'scheduled', 'in_progress'].includes(r.status))
      .sort((a, b) => {
        const aDate = a.preferred_date ? new Date(a.preferred_date).getTime() : 0;
        const bDate = b.preferred_date ? new Date(b.preferred_date).getTime() : 0;
        return aDate - bDate;
      })
      .slice(0, 5);
  }, [pickupRequests]);

  const activeUsers = logisticsUsers.filter(u => u.status === 'active');

  // V3: Get location by ID
  const getLocationById = (locationId: string) => {
    return pickupLocations.find(l => l.id === locationId);
  };

  // Prepare stat items for the grid
  const statItems: StatBoxItem[] = [
    {
      label: 'Pending Assignment',
      value: summary.pendingAssignment,
      subLabel: 'Awaiting action',
      icon: <Clock className={`${iconSize.lg} ${summary.pendingAssignment > 0 ? 'text-amber-500' : 'text-slate-600 dark:text-zinc-400'}`} />,
      accent: (summary.pendingAssignment > 0 ? 'warning' : 'neutral') as StatAccent,
    },
    {
      label: 'In Progress',
      value: summary.assigned + summary.inProgress,
      subLabel: 'Active pickups',
      icon: <Truck className={`${iconSize.lg} text-blue-500`} />,
      accent: 'info' as StatAccent,
    },
    {
      label: 'Completed',
      value: summary.completed,
      subLabel: 'This month',
      icon: <ListChecks className={`${iconSize.lg} text-emerald-500`} />,
      accent: 'success' as StatAccent,
    },
    {
      label: 'Logistics Users',
      value: activeUsers.length,
      subLabel: `${logisticsUsers.length} total`,
      icon: <Users className={`${iconSize.lg} text-lime-500`} />,
      accent: 'brand' as StatAccent,
    },
  ];

  // Loading state
  if (requestsLoading || usersLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-ecotribe-primary mx-auto mb-4" />
          <p className="font-display font-bold uppercase tracking-wide text-slate-500 dark:text-white/50">Loading logistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        label="IT Admin"
        title="Logistics Management"
        subtitle="Manage logistics users, assignments, and track pickup status"
      />

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <button
          onClick={() => navigate(`${basePath}/logistics/users`)}
          className="p-6 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-ecotribe-primary/50 transition-all group text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 border border-slate-200 dark:border-white/10 bg-ecotribe-primary/10 flex items-center justify-center group-hover:bg-ecotribe-primary/20 transition-colors">
                <UserPlus className="w-6 h-6 text-ecotribe-primary" />
              </div>
              <div>
                <p className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase">Manage Users</p>
                <p className="font-mono text-xs text-slate-500 dark:text-white/50">Add, edit logistics users</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-ecotribe-primary transition-colors" />
          </div>
        </button>

        <button
          onClick={() => navigate(`${basePath}/logistics/assignments`)}
          className="p-6 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-ecotribe-primary/50 transition-all group text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 border border-slate-200 dark:border-white/10 bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                <Truck className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase">Assignment Queue</p>
                <p className="font-mono text-xs text-slate-500 dark:text-white/50">Assign pickups to users</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
          </div>
        </button>
      </motion.div>

      {/* Stats + Upcoming Pickups - Connected Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <ConnectedSection
          title="Pickup Overview"
          stats={statItems}
          statColumns={4}
          action={
            <button
              onClick={() => navigate(`${basePath}/pickups`)}
              className={`font-mono font-bold text-xs uppercase tracking-widest ${text.muted} hover:text-lime-600 dark:hover:text-lime-400 transition-colors`}
            >
              View All Pickups
            </button>
          }
        >
          <div className="divide-y divide-slate-200 dark:divide-zinc-800">
            {upcoming.length === 0 && (
              <div className="py-12 text-center">
                <Calendar className={`${iconSize['2xl']} mx-auto mb-3 ${text.muted}`} />
                <p className={`font-display font-bold uppercase tracking-wide ${text.muted}`}>No pending pickups</p>
                <p className={`text-xs mt-1 ${text.muted}`}>All pickups are completed or scheduled</p>
              </div>
            )}
            {upcoming.map((r) => {
              const location = getLocationById(r.location_id || '');
              const assignedUser = logisticsUsers.find(u => u.id === r.logistics_user_id);
              return (
                <div
                  key={r.id}
                  onClick={() => navigate(`${basePath}/pickups/${r.id}`)}
                  className={`px-6 py-4 flex items-center gap-4 ${hoverStyles.row} cursor-pointer group`}
                >
                  <div className="w-12 h-12 border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 flex items-center justify-center group-hover:border-lime-500/30 transition-colors">
                    <Calendar className={`${iconSize.lg} text-lime-600 dark:text-lime-400`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-display font-bold text-sm group-hover:text-lime-600 dark:group-hover:text-lime-400 transition-colors ${text.primary}`}>
                      {location?.name || 'Pickup'} — {r.asset_ids?.length || 0} assets
                    </p>
                    <p className={`font-mono text-xs ${text.muted}`}>
                      {r.preferred_time_slot} · {r.preferred_date ? new Date(r.preferred_date).toDateString() : 'TBD'}
                      {assignedUser && ` · Assigned to ${assignedUser.name}`}
                    </p>
                  </div>
                  <StatusChip status={r.status} />
                </div>
              );
            })}
          </div>
        </ConnectedSection>
      </motion.div>

      {/* Active Logistics Users */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
            <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase">Active Logistics Users</h3>
            <button
              onClick={() => navigate(`${basePath}/logistics/users`)}
              className="font-mono font-bold text-xs uppercase tracking-widest text-slate-500 dark:text-white/50 hover:text-lime-600 dark:hover:text-lime-400 transition-colors"
            >
              Manage All
            </button>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeUsers.length === 0 && (
              <div className="col-span-full py-8 text-center">
                <Users className="w-12 h-12 mx-auto mb-3 text-slate-400 dark:text-white/30" />
                <p className="font-display font-bold text-sm text-slate-500 dark:text-white/50 uppercase">No active users</p>
                <button
                  onClick={() => navigate(`${basePath}/logistics/users`)}
                  className="mt-3 px-4 py-2 bg-ecotribe-primary text-black font-mono text-xs uppercase tracking-widest"
                >
                  Add User
                </button>
              </div>
            )}
            {activeUsers.slice(0, 6).map((user) => (
              <div
                key={user.id}
                className="p-4 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                    <Users className="w-5 h-5 text-slate-500 dark:text-white/50" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase truncate">{user.name}</p>
                    <p className="font-mono text-xs text-slate-500 dark:text-white/50 truncate">{user.phone || user.email}</p>
                  </div>
                  <span className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-widest border border-emerald-400/40 bg-emerald-400/10 text-emerald-400">
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'info' | 'primary' }> = {
    pending: { label: 'Pending', variant: 'warning' },
    assigned_to_logistics_admin: { label: 'Assigned to Admin', variant: 'info' },
    assigned_to_logistics_user: { label: 'Assigned to Driver', variant: 'info' },
    scheduled: { label: 'Scheduled', variant: 'info' },
    in_progress: { label: 'In Progress', variant: 'primary' },
    completed: { label: 'Completed', variant: 'success' },
  };
  const config = map[status] || { label: status, variant: 'default' as const };

  return (
    <Badge variant={config.variant} size="sm">
      {config.label}
    </Badge>
  );
}
