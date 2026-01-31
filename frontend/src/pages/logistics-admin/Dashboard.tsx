import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, ListChecks, Truck, Users } from 'lucide-react';
import { useLogisticsAdminPickups, useEnterprises, useAuth } from '@/hooks';
import { PageHeader, ConnectedSection, Badge } from '@/components/ui';
import type { StatAccent, StatBoxItem } from '@/components/ui';
import { text, hover as hoverStyles, iconSize } from '@/lib/design-tokens';

export function LogisticsAdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: pickupRequests = [] } = useLogisticsAdminPickups(user?.id || '');
  const { data: enterprises = [] } = useEnterprises();

  // V3: Calculate summary from pickup requests - use snake_case field names
  const summary = {
    pendingAssignment: pickupRequests.filter(r => r.status === 'pending' || r.status === 'assigned_to_logistics_admin').length,
    assigned: pickupRequests.filter(r => r.status === 'assigned_to_logistics_user').length,
    inProgress: pickupRequests.filter(r => r.status === 'in_progress').length,
    completed: pickupRequests.filter(r => r.status === 'completed').length,
  };

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
      label: 'Scheduled',
      value: summary.assigned + summary.inProgress,
      subLabel: 'In progress',
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
      label: 'Enterprises',
      value: enterprises.length,
      subLabel: 'Active',
      icon: <Users className={`${iconSize.lg} text-lime-500`} />,
      accent: 'brand' as StatAccent,
    },
  ];

  return (
    <div className="space-y-6">
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
              onClick={() => navigate('/logistics-admin/pickups')}
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
