import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Truck, Search, Calendar, MapPin, CheckCircle, Clock, X, User, Plus, AlertCircle, AlertTriangle, Package } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth, useLogisticsAdminPickups, useLogisticsUsers, useEnterprises, useAssignToLogisticsUser, useCreateLogisticsUser } from '@/hooks';
import { useToast } from '@/components/ui';
import type { PickupResponse } from '@/lib/api/pickups';

type StatusFilter = 'active' | 'all';

export function LogisticsAssignmentQueue() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const currentLogisticsAdminId = user?.id || '';
  const { data: pickupRequests = [], isLoading } = useLogisticsAdminPickups(currentLogisticsAdminId);
  const { data: logisticsUsers = [] } = useLogisticsUsers(currentLogisticsAdminId);
  const { data: enterprises = [] } = useEnterprises();
  const assignMutation = useAssignToLogisticsUser();
  const createUserMutation = useCreateLogisticsUser();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPickup, setSelectedPickup] = useState<PickupResponse | null>(null);
  const [selectedUser, setSelectedUser] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Add new user state
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const isCreatingUser = createUserMutation.isPending;

  // Get users that belong to this logistics admin
  const myLogisticsUsers = useMemo(() => {
    return logisticsUsers.filter(u => u.parent_user_id === currentLogisticsAdminId && u.status === 'active');
  }, [logisticsUsers, currentLogisticsAdminId]);

  // Stats (computed from all pickups, not filtered)
  const stats = useMemo(() => {
    const needsAssignment = pickupRequests.filter(r =>
      !r.logistics_user_id &&
      ['pending', 'assigned_to_logistics_admin', 'assigned_to_logistics_user'].includes(r.status)
    ).length;
    const scheduled = pickupRequests.filter(r => r.status === 'scheduled').length;
    const inProgress = pickupRequests.filter(r => r.status === 'in_progress').length;
    const completed = pickupRequests.filter(r => r.status === 'completed').length;
    return { needsAssignment, scheduled, inProgress, completed };
  }, [pickupRequests]);

  const queue = useMemo(() => {
    return pickupRequests
      .filter(r => {
        // Filter by status
        if (statusFilter === 'active') {
          return ['pending', 'assigned_to_logistics_admin', 'assigned_to_logistics_user', 'scheduled', 'in_progress'].includes(r.status);
        }
        return true; // Show all statuses
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

  const openAssignModal = (pickup: PickupResponse) => {
    setSelectedPickup(pickup);
    // Pre-populate with existing assignment if reassigning
    setSelectedUser(pickup.logistics_user_id || '');
    setScheduledDate(pickup.scheduled_date ? new Date(pickup.scheduled_date).toISOString().slice(0, 16) : '');
    setUserSearch('');
    setShowAddUser(false);
    setShowAssignModal(true);
  };

  const handleAssign = async () => {
    if (!selectedUser || !selectedPickup) return;
    try {
      await assignMutation.mutateAsync({
        requestId: selectedPickup.id,
        logisticsUserId: selectedUser,
        scheduledDate: scheduledDate ? new Date(scheduledDate).toISOString() : undefined,
      });
      // Status is automatically set to 'scheduled' by the mutation
      setShowAssignModal(false);
      setSelectedPickup(null);
      setSelectedUser('');
      setScheduledDate('');
    } catch (error) {
      console.error('Assignment failed:', error);
      addToast({ type: 'error', title: 'Assignment Failed', message: error instanceof Error ? error.message : 'Failed to assign pickup' });
    }
  };

  const handleCreateUser = async () => {
    if (!newUserName || !newUserEmail || !newUserPassword) {
      addToast({ type: 'warning', title: 'Missing Fields', message: 'Name, email, and password are required' });
      return;
    }
    if (newUserPassword.length < 8) {
      addToast({ type: 'warning', title: 'Invalid Password', message: 'Password must be at least 8 characters' });
      return;
    }

    try {
      const newUser = await createUserMutation.mutateAsync({
        name: newUserName,
        phone: newUserPhone || '',
        email: newUserEmail,
        password: newUserPassword,
        logistics_admin_id: currentLogisticsAdminId,
      });

      // Auto-select the newly created user
      setSelectedUser(newUser?.id || '');

      // Reset form
      setShowAddUser(false);
      setNewUserName('');
      setNewUserPhone('');
      setNewUserEmail('');
      setNewUserPassword('');
    } catch (error) {
      console.error('Error creating user:', error);
      addToast({ type: 'error', title: 'Creation Failed', message: error instanceof Error ? error.message : 'Failed to create user' });
    }
  };

  const filteredUsers = useMemo(() => {
    const users = myLogisticsUsers;
    if (!userSearch) return users;
    const query = userSearch.toLowerCase();
    return users.filter(u =>
      u.name?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.phone?.toLowerCase().includes(query)
    );
  }, [myLogisticsUsers, userSearch]);

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      pending: 'border-amber-400/30 bg-amber-400/10 text-amber-400',
      assigned_to_logistics_admin: 'border-amber-400/30 bg-amber-400/10 text-amber-400',
      assigned_to_logistics_user: 'border-blue-400/30 bg-blue-400/10 text-blue-400',
      scheduled: 'border-purple-400/30 bg-purple-400/10 text-purple-400',
      in_progress: 'border-amber-400/30 bg-amber-400/10 text-amber-400',
      completed: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400',
      failed: 'border-orange-400/30 bg-orange-400/10 text-orange-400',
      cancelled: 'border-red-400/30 bg-red-400/10 text-red-400',
    };
    return map[status] || 'border-slate-400/30 bg-slate-400/10 text-slate-400';
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: 'Pending',
      assigned_to_logistics_admin: 'Awaiting Driver',
      assigned_to_logistics_user: 'Assigned to Driver',
      scheduled: 'Scheduled',
      in_progress: 'In Progress',
      completed: 'Completed',
      failed: 'Failed',
      cancelled: 'Cancelled',
    };
    return map[status] || status;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-2">
            Assignment Queue
          </span>
          <h1 className="font-brand font-bold text-3xl text-slate-900 dark:text-white uppercase tracking-tight">
            My Pickups
          </h1>
          <p className="font-display text-slate-500 dark:text-white/50 text-sm mt-2 uppercase tracking-wide">
            {pickupRequests.length} total pickups assigned to you
          </p>
        </motion.div>
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 border-l border-t border-slate-200 dark:border-white/10"
      >
        {[
          { label: 'Needs Assignment', value: stats.needsAssignment, icon: <AlertTriangle className="w-4 h-4" />, highlight: stats.needsAssignment > 0 },
          { label: 'Scheduled', value: stats.scheduled, icon: <Calendar className="w-4 h-4" /> },
          { label: 'In Progress', value: stats.inProgress, icon: <Truck className="w-4 h-4" /> },
          { label: 'Completed', value: stats.completed, icon: <CheckCircle className="w-4 h-4" /> },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-5 border-r border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-black/20"
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-mono font-bold text-xs uppercase tracking-widest text-slate-600 dark:text-white/60">{stat.label}</h4>
              <span className={stat.highlight ? 'text-amber-500' : 'text-slate-500 dark:text-white/60'}>{stat.icon}</span>
            </div>
            <div className={`font-brand font-bold text-3xl ${stat.highlight ? 'text-amber-500' : 'text-slate-900 dark:text-white'}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-white/50" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search location or enterprise..."
            className="w-full pl-11 pr-4 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-sm text-slate-900 dark:text-white font-mono placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {([
            { key: 'active' as const, label: 'Active' },
            { key: 'all' as const, label: 'All' },
          ]).map((filter) => (
            <button
              key={filter.key}
              onClick={() => setStatusFilter(filter.key)}
              className={`interactive px-4 py-3 border font-mono font-bold text-xs uppercase tracking-widest transition-all ${
                statusFilter === filter.key
                  ? 'border-ecotribe-primary bg-ecotribe-primary/10 text-ecotribe-primary'
                  : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-500 dark:text-white/50 hover:border-slate-300 dark:hover:border-white/20'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Pickup List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]"
      >
        {queue.length === 0 ? (
          <div className="py-16 text-center">
            <Truck className="w-12 h-12 text-slate-500 dark:text-white/50 mx-auto mb-4" />
            <p className="font-display font-bold text-slate-500 dark:text-white/50 uppercase tracking-wide mb-1">
              No pickups assigned to you yet
            </p>
            <p className="font-mono text-xs text-slate-400 dark:text-white/30">
              Pickups will appear here once the operations team assigns them to you.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-white/5">
            {queue.map((r, idx) => {
              const ent = enterprises.find(e => e.id === r.enterprise_id);
              const location = r.pickup_locations;
              const needsUserAssignment = !r.logistics_user_id;
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 * Math.min(idx, 10) }}
                  className={`p-5 transition-colors ${
                    needsUserAssignment
                      ? 'bg-amber-400/[0.03]'
                      : 'hover:bg-white/60 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`w-12 h-12 border flex items-center justify-center flex-shrink-0 ${
                        needsUserAssignment
                          ? 'border-amber-400/30 bg-amber-400/10'
                          : 'border-slate-200 dark:border-white/10 bg-ecotribe-primary/10'
                      }`}>
                        <Truck className={`w-6 h-6 ${needsUserAssignment ? 'text-amber-400' : 'text-ecotribe-primary'}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase">
                            {location?.name || 'Pickup'}
                          </p>
                          <span className="font-mono text-xs text-slate-500 dark:text-white/50">
                            {r.asset_ids?.length || 0} assets
                          </span>
                        </div>
                        <p className="font-mono text-xs text-slate-500 dark:text-white/50 mt-0.5">
                          {ent?.name || 'Enterprise'} · {r.preferred_time_slot} · {r.preferred_date ? new Date(r.preferred_date).toDateString() : 'TBD'}
                        </p>
                        {needsUserAssignment && (
                          <p className="font-mono text-xs text-amber-400 mt-1">
                            Needs field user assignment
                          </p>
                        )}
                        {r.status === 'in_progress' && (
                          <p className={`font-mono text-xs mt-1 flex items-center gap-1 ${
                            r.started_at && (Date.now() - new Date(r.started_at).getTime()) > 4 * 60 * 60 * 1000
                              ? 'text-amber-500'
                              : 'text-lime-500'
                          }`}>
                            {r.started_at && (Date.now() - new Date(r.started_at).getTime()) > 4 * 60 * 60 * 1000 && (
                              <AlertTriangle className="w-3 h-3" />
                            )}
                            {r.started_at
                              ? `Started ${formatDistanceToNow(new Date(r.started_at), { addSuffix: true })}`
                              : 'In progress — start time unknown'
                            }
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-white/50 font-mono flex-shrink-0">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {r.scheduled_date ? new Date(r.scheduled_date).toDateString() : 'Not scheduled'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {location?.city || 'City'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-widest border ${getStatusColor(r.status)}`}>
                        {getStatusLabel(r.status)}
                      </span>
                      {needsUserAssignment ? (
                        <button
                          disabled={isLoading}
                          onClick={() => openAssignModal(r)}
                          className="px-4 py-2 bg-amber-400 text-black font-mono text-xs font-bold uppercase tracking-widest border border-amber-400/40 hover:bg-amber-300 transition-colors"
                        >
                          Assign User
                        </button>
                      ) : (
                        <button
                          disabled={isLoading}
                          onClick={() => openAssignModal(r)}
                          className="px-4 py-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono text-xs font-bold uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-colors"
                        >
                          Reassign
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Assignment Modal */}
      <AnimatePresence>
        {showAssignModal && selectedPickup && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-white/95 dark:bg-black/95 backdrop-blur-xl border border-slate-200 dark:border-white/20 max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-ecotribe-primary/10 border border-ecotribe-primary/20 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-ecotribe-primary" />
                  </div>
                  <div>
                    <h3 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide">
                      {selectedPickup.logistics_user_id ? 'Reassign Pickup' : 'Assign Field User'}
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
                {/* User Search & Add New */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest">
                      Search Field User
                    </label>
                    {!showAddUser && (
                      <button
                        type="button"
                        onClick={() => setShowAddUser(true)}
                        className="interactive flex items-center gap-1 px-2 py-1 border border-ecotribe-primary/50 text-ecotribe-primary font-mono text-xs uppercase hover:bg-ecotribe-primary/10 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Add New
                      </button>
                    )}
                  </div>

                  {showAddUser ? (
                    /* Add New User Form */
                    <div className="p-4 border border-ecotribe-primary/30 bg-ecotribe-primary/5 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="font-mono font-bold text-xs text-ecotribe-primary uppercase">
                          Add Field User
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowAddUser(false)}
                          className="text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <input
                          type="text"
                          placeholder="Name *"
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display text-sm placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none"
                        />
                        <input
                          type="email"
                          placeholder="Email *"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display text-sm placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none"
                        />
                        <input
                          type="password"
                          placeholder="Password * (min 8 chars)"
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display text-sm placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none"
                        />
                        <input
                          type="tel"
                          placeholder="Phone"
                          value={newUserPhone}
                          onChange={(e) => setNewUserPhone(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display text-sm placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleCreateUser}
                        disabled={!newUserName || !newUserEmail || !newUserPassword || newUserPassword.length < 8 || isCreatingUser}
                        className={`w-full py-2 font-mono font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                          newUserName && newUserEmail && newUserPassword && newUserPassword.length >= 8
                            ? 'bg-ecotribe-primary text-white hover:bg-ecotribe-primary/80'
                            : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-white/50 cursor-not-allowed'
                        }`}
                      >
                        {isCreatingUser ? (
                          <Clock className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            Create User
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-white/50" />
                      <input
                        type="text"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Search by name, email, or phone..."
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 placeholder:text-slate-400 dark:placeholder:text-white/30"
                      />
                    </div>
                  )}
                </div>

                {/* User List */}
                {!showAddUser && (
                  <div>
                    <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-3 block">
                      Select User <span className="text-red-400">*</span>
                    </label>
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
                    {filteredUsers.length === 0 && (
                      <div className="p-6 border border-amber-400/30 bg-amber-400/10 text-center">
                        <AlertCircle className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                        <p className="font-mono text-sm text-amber-400 mb-2">
                          {userSearch ? `No users found matching "${userSearch}"` : 'No field users added yet'}
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowAddUser(true)}
                          className="interactive inline-flex items-center gap-1 px-3 py-2 bg-amber-400/20 border border-amber-400/50 text-amber-400 font-mono text-xs uppercase hover:bg-amber-400/30 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          Add First User
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Scheduled Date */}
                {!showAddUser && (
                  <div>
                    <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2 block">
                      Scheduled Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50"
                    />
                    <p className="font-mono text-xs text-slate-500 dark:text-white/50 mt-2">
                      Leave empty to use preferred date: {selectedPickup.preferred_date ? new Date(selectedPickup.preferred_date).toLocaleString() : 'Not set'}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              {!showAddUser && (
                <div className="p-6 border-t border-slate-200 dark:border-white/10 flex gap-3 justify-end">
                  <button
                    onClick={() => setShowAssignModal(false)}
                    className="px-5 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
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
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
