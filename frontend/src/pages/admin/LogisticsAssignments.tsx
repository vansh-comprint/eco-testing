import { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Truck, Search, Calendar, MapPin, CheckCircle, X, User, Filter } from 'lucide-react';
import { useAuth, usePickupRequests, useEnterprises, useLogisticsUsers, useAssignToLogisticsUser, useUpdatePickupStatus } from '@/hooks';
import { PageHeader } from '@/components/ui';

type StatusFilter = 'active' | 'all';

export function ITAdminLogisticsAssignments() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, enterprise } = useAuth();
  const enterpriseId = enterprise?.id || '';

  // V3.2: Detect if we're in Org Admin context
  const isOrgAdmin = user?.role === 'org_admin' || location.pathname.startsWith('/org-admin');
  const basePath = isOrgAdmin ? '/org-admin' : '/admin';
  const { data: pickupRequests = [] } = usePickupRequests(enterpriseId);
  const { data: logisticsUsers = [] } = useLogisticsUsers();
  const { data: enterprises = [] } = useEnterprises();
  const assignMutation = useAssignToLogisticsUser();
  const updateStatusMutation = useUpdatePickupStatus();
  const isLoading = assignMutation.isPending || updateStatusMutation.isPending;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPickup, setSelectedPickup] = useState<typeof pickupRequests[0] | null>(null);
  const [selectedUser, setSelectedUser] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Filter to only show pickups for the IT Admin's enterprise
  const queue = useMemo(() => {
    return pickupRequests
      .filter(r => {
        // Filter by status
        if (statusFilter === 'active') {
          return ['pending', 'assigned_to_logistics_admin', 'assigned_to_logistics_user', 'scheduled', 'in_progress'].includes(r.status);
        }
        return true;
      })
      .filter(r => {
        if (!search) return true;
        const query = search.toLowerCase();
        const ent = enterprises.find(e => e.id === r.enterprise_id);
        const location = r.pickup_locations;
        return (
          location?.name?.toLowerCase().includes(query) ||
          location?.city?.toLowerCase().includes(query) ||
          ent?.name?.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [pickupRequests, search, statusFilter, enterprises]);

  const openAssignModal = (pickup: typeof pickupRequests[0]) => {
    setSelectedPickup(pickup);
    setSelectedUser(pickup.logistics_user_id || '');
    setScheduledDate(pickup.scheduled_date ? new Date(pickup.scheduled_date).toISOString().slice(0, 16) : '');
    setUserSearch('');
    setShowAssignModal(true);
  };

  const handleAssign = async () => {
    if (!selectedUser || !selectedPickup) return;
    await assignMutation.mutateAsync({
      requestId: selectedPickup.id,
      logisticsUserId: selectedUser,
      scheduledDate: scheduledDate ? new Date(scheduledDate).toISOString() : undefined,
    });
    await updateStatusMutation.mutateAsync({
      requestId: selectedPickup.id,
      status: 'scheduled',
    });
    setShowAssignModal(false);
    setSelectedPickup(null);
  };

  const filteredUsers = useMemo(() => {
    const activeUsers = logisticsUsers.filter(u => u.status === 'active');
    if (!userSearch) return activeUsers;
    const query = userSearch.toLowerCase();
    return activeUsers.filter(u =>
      u.name?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.phone?.toLowerCase().includes(query)
    );
  }, [logisticsUsers, userSearch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        label="Logistics Management"
        title="Assignment Queue"
        subtitle="Assign pickups to logistics users"
        backLink
      />

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row gap-3 items-start md:items-center"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500 dark:text-white/50" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-4 py-2 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-sm text-slate-900 dark:text-white font-mono focus:outline-none focus:border-ecotribe-primary/50"
          >
            <option value="active">Active Only</option>
            <option value="all">All (with History)</option>
          </select>
        </div>
        <div className="flex items-center gap-2 flex-1">
          <Search className="w-4 h-4 text-slate-500 dark:text-white/50" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search location or enterprise..."
            className="flex-1 px-4 py-2 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-sm text-slate-900 dark:text-white font-mono focus:outline-none focus:border-ecotribe-primary/50"
          />
        </div>
      </motion.div>

      {/* Queue List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        {queue.length === 0 && (
          <div className="p-12 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-center">
            <Truck className="w-12 h-12 mx-auto mb-3 text-slate-400 dark:text-white/30" />
            <p className="font-display font-bold text-sm text-slate-500 dark:text-white/50 uppercase">No pickups in queue</p>
            <p className="font-mono text-xs text-slate-400 dark:text-white/30 mt-1">
              {statusFilter === 'active' ? 'All pickups are completed or no pickups exist' : 'No pickups found'}
            </p>
          </div>
        )}

        {queue.map((r, idx) => {
          const ent = enterprises.find(e => e.id === r.enterprise_id);
          const location = r.pickup_locations;
          const assignedUser = logisticsUsers.find(u => u.id === r.logistics_user_id);

          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * idx }}
              className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-5"
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 border border-slate-200 dark:border-white/10 bg-ecotribe-primary/10 flex items-center justify-center">
                    <Truck className="w-6 h-6 text-ecotribe-primary" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-sm text-slate-900 dark:text-white">
                      {location?.name || 'Pickup'} · {r.asset_ids?.length || 0} assets
                    </p>
                    <p className="font-mono text-xs text-slate-500 dark:text-white/50">
                      {ent?.name || 'Enterprise'} · {r.preferred_time_slot} · {r.preferred_date ? new Date(r.preferred_date).toDateString() : 'TBD'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-white/50 font-mono">
                    <Calendar className="w-4 h-4" />
                    {r.scheduled_date ? new Date(r.scheduled_date).toDateString() : 'Not scheduled'}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-white/50 font-mono">
                    <MapPin className="w-4 h-4" />
                    {location?.city || 'City'}
                  </div>
                  {assignedUser && (
                    <div className="flex items-center gap-2 text-xs text-blue-400 font-mono">
                      <User className="w-4 h-4" />
                      {assignedUser.name}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <StatusPill status={r.status} />
                  {(r.status === 'pending' || r.status === 'assigned_to_logistics_admin') && (
                    <button
                      disabled={isLoading}
                      onClick={() => openAssignModal(r)}
                      className="px-4 py-2 bg-ecotribe-primary text-black font-mono text-xs uppercase tracking-widest border border-ecotribe-primary/40 hover:bg-white transition-colors"
                    >
                      Assign
                    </button>
                  )}
                  {['assigned_to_logistics_user', 'scheduled'].includes(r.status) && (
                    <button
                      disabled={isLoading}
                      onClick={() => openAssignModal(r)}
                      className="px-4 py-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono text-xs uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-colors"
                    >
                      Reassign
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`${basePath}/pickups/${r.id}`)}
                    className="px-4 py-2 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/50 font-mono text-xs uppercase tracking-widest hover:border-ecotribe-primary/50 hover:text-ecotribe-primary transition-colors"
                  >
                    View
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Assignment Modal */}
      <AnimatePresence>
        {showAssignModal && selectedPickup && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-none sm:max-w-2xl max-h-[90dvh] overflow-y-auto bg-white/95 dark:bg-black/95 backdrop-blur-xl border border-slate-200 dark:border-white/20 max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-ecotribe-primary/10 border border-ecotribe-primary/20 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-ecotribe-primary" />
                  </div>
                  <div>
                    <h3 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide">
                      {selectedPickup.logistics_user_id ? 'Reassign Pickup' : 'Assign Pickup'}
                    </h3>
                    <p className="font-mono text-xs text-slate-500 dark:text-white/50 mt-1">
                      {selectedPickup.pickup_locations?.name || 'Pickup'} · {selectedPickup.asset_ids?.length || 0} assets
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500 dark:text-white/50" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* User Search */}
                <div>
                  <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2 block">
                    Search Logistics User
                  </label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-white/50" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search by name, email, or phone..."
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
                    />
                  </div>
                </div>

                {/* User List */}
                <div>
                  <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-3 block">
                    Select User <span className="text-red-400">*</span>
                  </label>
                  {filteredUsers.length === 0 ? (
                    <div className="p-6 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-center">
                      <p className="font-mono text-sm text-slate-500 dark:text-white/50">
                        {userSearch ? `No users found matching "${userSearch}"` : 'No active logistics users'}
                      </p>
                      <button
                        onClick={() => {
                          setShowAssignModal(false);
                          navigate(`${basePath}/logistics/users`);
                        }}
                        className="mt-3 px-4 py-2 bg-ecotribe-primary text-black font-mono text-xs uppercase tracking-widest"
                      >
                        Add User
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                      {filteredUsers.map(user => (
                        <motion.div
                          key={user.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedUser(user.id)}
                          className={`p-4 border-2 cursor-pointer transition-all ${
                            selectedUser === user.id
                              ? 'border-ecotribe-primary bg-ecotribe-primary/10'
                              : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-ecotribe-primary/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 border flex items-center justify-center ${
                              selectedUser === user.id
                                ? 'border-ecotribe-primary bg-ecotribe-primary/20'
                                : 'border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5'
                            }`}>
                              <User className={`w-5 h-5 ${
                                selectedUser === user.id ? 'text-ecotribe-primary' : 'text-slate-500 dark:text-white/50'
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-display font-bold text-sm uppercase truncate ${
                                selectedUser === user.id ? 'text-ecotribe-primary' : 'text-slate-900 dark:text-white'
                              }`}>
                                {user.name || 'Unknown'}
                              </p>
                              <p className="font-mono text-xs text-slate-500 dark:text-white/50 truncate">
                                {user.phone || user.email}
                              </p>
                            </div>
                            {selectedUser === user.id && (
                              <CheckCircle className="w-5 h-5 text-ecotribe-primary flex-shrink-0" />
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Scheduled Date */}
                <div>
                  <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2 block">
                    Scheduled Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
                  />
                  <p className="font-mono text-xs text-slate-500 dark:text-white/50 mt-2">
                    Preferred: {selectedPickup.preferred_date ? new Date(selectedPickup.preferred_date).toLocaleString() : 'Not set'}
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-200 dark:border-white/10 flex gap-3 justify-end">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-5 py-2.5 bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={!selectedUser || isLoading}
                  className="px-5 py-2.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  {isLoading
                    ? (selectedPickup?.logistics_user_id ? 'Reassigning...' : 'Assigning...')
                    : (selectedPickup?.logistics_user_id ? 'Reassign Pickup' : 'Assign Pickup')
                  }
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: 'Pending', cls: 'border-amber-400/40 bg-amber-400/10 text-amber-400' },
    assigned_to_logistics_admin: { label: 'Assigned to Admin', cls: 'border-blue-400/40 bg-blue-400/10 text-blue-400' },
    assigned_to_logistics_user: { label: 'Assigned to Driver', cls: 'border-blue-400/40 bg-blue-400/10 text-blue-400' },
    scheduled: { label: 'Scheduled', cls: 'border-purple-400/40 bg-purple-400/10 text-purple-400' },
    in_progress: { label: 'In Progress', cls: 'border-amber-400/40 bg-amber-400/10 text-amber-400' },
    completed: { label: 'Completed', cls: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-400' },
    failed: { label: 'Failed', cls: 'border-orange-400/40 bg-orange-400/10 text-orange-400' },
    cancelled: { label: 'Cancelled', cls: 'border-red-400/40 bg-red-400/10 text-red-400' },
  };
  const cfg = map[status] || { label: status, cls: 'border-slate-400/40 bg-slate-400/10 text-slate-400' };
  return (
    <span className={`px-3 py-1 text-xs font-mono font-bold uppercase tracking-widest border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
