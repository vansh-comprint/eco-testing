import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, ListChecks, Truck, Users, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useLogisticsAdminPickups, useAuth, useDashboardStats } from '@/hooks';
import { PageHeader, ConnectedSection, Badge } from '@/components/ui';
import type { StatAccent, StatBoxItem } from '@/components/ui';
import { text, hover as hoverStyles, iconSize } from '@/lib/design-tokens';

export function LogisticsAdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: pickupRequests = [] } = useLogisticsAdminPickups(user?.id || '');
  const { stats } = useDashboardStats();

  const upcoming = useMemo(() => {
    return [...pickupRequests]
      .filter(r => ['pending', 'assigned_to_logistics_admin', 'assigned_to_logistics_user', 'scheduled'].includes(r.status))
      .sort((a, b) => {
        const aDate = a.preferred_date ? new Date(a.preferred_date).getTime() : 0;
        const bDate = b.preferred_date ? new Date(b.preferred_date).getTime() : 0;
        return aDate - bDate;
      })
      .slice(0, 4);
  }, [pickupRequests]);

  // In-progress pickups — the ones logistics users are currently working on
  const inProgress = useMemo(() => {
    return pickupRequests.filter(r => r.status === 'in_progress');
  }, [pickupRequests]);

  // Prepare stat items for the grid
  const statItems: StatBoxItem[] = [
    {
      label: 'Pending Assignment',
      value: stats.pickup_pending_assignment ?? 0,
      subLabel: 'Awaiting action',
      icon: <Clock className={`${iconSize.lg} ${(stats.pickup_pending_assignment ?? 0) > 0 ? 'text-amber-500' : 'text-slate-600 dark:text-zinc-400'}`} />,
      accent: ((stats.pickup_pending_assignment ?? 0) > 0 ? 'warning' : 'neutral') as StatAccent,
    },
    {
      label: 'Scheduled',
      value: (stats.pickup_assigned ?? 0) + (stats.pickup_in_progress ?? 0),
      subLabel: 'In progress',
      icon: <Truck className={`${iconSize.lg} text-blue-500`} />,
      accent: 'info' as StatAccent,
    },
    {
      label: 'Completed',
      value: stats.pickup_completed ?? 0,
      subLabel: 'This month',
      icon: <ListChecks className={`${iconSize.lg} text-emerald-500`} />,
      accent: 'success' as StatAccent,
    },
    {
      label: 'Field Users',
      value: stats.field_user_count ?? 0,
      subLabel: 'Your team',
      icon: <Users className={`${iconSize.lg} text-lime-500`} />,
      accent: 'brand' as StatAccent,
    },
  ];

  return (
    <div className="space-y-6 relative isolate">
      {/* Subtle background accent — absolute so it's scoped to this page only */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-lime-500/[0.04] dark:bg-lime-500/[0.06] blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-ecotribe-primary/[0.04] dark:bg-ecotribe-primary/[0.05] blur-3xl" />
      </div>

      {/* Header */}
      <PageHeader
        label="Logistics Admin"
        title="Logistics Dashboard"
        subtitle="Oversee pickup assignments and field progress"
      />

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
              onClick={() => navigate('/logistics-admin/assignments')}
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
                <p className={`font-display font-bold uppercase tracking-wide ${text.muted}`}>No upcoming pickups</p>
                <p className={`text-xs mt-1 ${text.muted}`}>All pickups are scheduled</p>
              </div>
            )}
            {upcoming.map((r) => {
              // V3: Use joined pickup_locations from database
              const location = r.pickup_locations;
              const assetCount = Array.isArray(r.asset_ids) ? r.asset_ids.length : 0;
              return (
                <div
                  key={r.id}
                  onClick={() => navigate(`/logistics-admin/pickups/${r.id}`)}
                  className={`px-6 py-4 flex items-center gap-4 ${hoverStyles.row} cursor-pointer group`}
                >
                  <div className="w-12 h-12 border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 flex items-center justify-center group-hover:border-lime-500/30 transition-colors">
                    <Calendar className={`${iconSize.lg} text-lime-600 dark:text-lime-400`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-display font-bold text-sm group-hover:text-lime-600 dark:group-hover:text-lime-400 transition-colors ${text.primary}`}>
                      {location?.name || 'Pickup'} — {assetCount} assets
                    </p>
                    <p className={`font-mono text-xs ${text.muted}`}>
                      Prefers {r.preferred_time_slot || 'Any'} · {r.preferred_date ? new Date(r.preferred_date).toDateString() : 'TBD'}
                    </p>
                  </div>
                  <StatusChip status={r.status} />
                </div>
              );
            })}
          </div>
        </ConnectedSection>
      </motion.div>

      {/* In-Progress Pickups — Active field activity */}
      {inProgress.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/85"
        >
          <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Truck className={`${iconSize.lg} text-amber-500`} />
              <h2 className={`font-display font-bold text-sm uppercase tracking-wide ${text.primary}`}>
                Active Pickups
              </h2>
              <Badge variant="warning" size="sm">{inProgress.length} in progress</Badge>
            </div>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-zinc-800">
            {inProgress.map((r) => {
              const location = r.pickup_locations;
              const assetCount = Array.isArray(r.asset_ids) ? r.asset_ids.length : 0;
              const startedAgo = r.started_at
                ? formatDistanceToNow(new Date(r.started_at), { addSuffix: true })
                : null;
              // Flag stale pickups (started over 4 hours ago)
              const isStale = r.started_at
                ? (Date.now() - new Date(r.started_at).getTime()) > 4 * 60 * 60 * 1000
                : false;
              return (
                <div
                  key={r.id}
                  onClick={() => navigate(`/logistics-admin/pickups/${r.id}`)}
                  className={`px-6 py-4 flex items-center gap-4 ${hoverStyles.row} cursor-pointer group`}
                >
                  <div className={`w-12 h-12 border flex items-center justify-center ${
                    isStale
                      ? 'border-amber-500/40 bg-amber-500/10'
                      : 'border-lime-500/30 bg-lime-500/10'
                  }`}>
                    {isStale
                      ? <AlertTriangle className={`${iconSize.lg} text-amber-500`} />
                      : <Truck className={`${iconSize.lg} text-lime-600 dark:text-lime-400`} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-display font-bold text-sm group-hover:text-lime-600 dark:group-hover:text-lime-400 transition-colors ${text.primary}`}>
                      {location?.name || 'Pickup'} — {assetCount} assets
                    </p>
                    <p className={`font-mono text-xs ${text.muted}`}>
                      {startedAgo ? `Started ${startedAgo}` : 'In progress'}
                    </p>
                  </div>
                  {isStale && (
                    <Badge variant="warning" size="sm">Stale</Badge>
                  )}
                  <StatusChip status={r.status} />
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
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
    failed: { label: 'Failed', variant: 'warning' },
    cancelled: { label: 'Cancelled', variant: 'default' },
  };
  const config = map[status] || { label: status, variant: 'default' as const };

  return (
    <Badge variant={config.variant} size="sm">
      {config.label}
    </Badge>
  );
}
