/**
 * Shared Pickup Queue Page
 * Used by both Super Admin and OPS Admin portals
 * OPS Admin: Respects enterprise filter from OpsEnterpriseContext
 * Super Admin: Shows all pickups platform-wide
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck,
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  MapPin,
  Package,
  User,
  Calendar,
  Building2,
  Send,
  Plus,
  X,
  RefreshCcw,
  ChevronDown,
  UserPlus
} from 'lucide-react';
import { useAuth, useAllPickupRequests, useLogisticsAdmins, useCreateLogisticsAdmin, useAssignToLogisticsAdmin, useAssignToLogisticsUser, useAvailableLogisticsUsers, useEnterprises, useDashboardStats } from '@/hooks';
import { useOptionalOpsEnterprise } from '@/contexts/OpsEnterpriseContext';
import { ConfirmationModal, useToast } from '@/components/ui';
import { useUserRole } from '@/stores/authStoreApi';

type QueueFilter = 'all' | 'pending' | 'assigned' | 'completed';

export function PickupQueue() {
  const { user } = useAuth();
  const userRole = useUserRole();
  const isSuperAdmin = userRole === 'super_admin';

  const { data: pickupRequests = [], isLoading } = useAllPickupRequests();
  const { data: logisticsAdmins = [], isLoading: isLoadingLogistics } = useLogisticsAdmins();
  const { data: enterprisesData = [] } = useEnterprises();
  const assignAdminMutation = useAssignToLogisticsAdmin();
  const assignUserMutation = useAssignToLogisticsUser();
  // Keep backward-compat alias used in confirmation modal
  const assignMutation = assignAdminMutation;
  const createAdminMutation = useCreateLogisticsAdmin();
  const { addToast } = useToast();

  // OPS Admin gets enterprise context from OpsLayout; Super Admin gets null
  const opsContext = useOptionalOpsEnterprise();
  const enterprises = opsContext?.enterprises ?? enterprisesData;
  const selectedEnterpriseId = opsContext?.selectedEnterpriseId ?? null;
  const isAllEnterprises = opsContext?.isAllEnterprises ?? true;
  const selectedEnterprise = opsContext?.selectedEnterprise ?? null;

  const { stats: dashStats } = useDashboardStats({
    enterpriseId: isAllEnterprises ? null : selectedEnterpriseId,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<QueueFilter>(isSuperAdmin ? 'all' : 'pending');
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [selectedLogisticsAdmin, setSelectedLogisticsAdmin] = useState<string>('');

  // Assignment modal state
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Logistics user selection (tier-2, optional)
  const [selectedLogisticsUser, setSelectedLogisticsUser] = useState('');
  const [logisticsUserSearch, setLogisticsUserSearch] = useState('');
  const [isLogisticsUserDropdownOpen, setIsLogisticsUserDropdownOpen] = useState(false);
  const logisticsUserDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch active users scoped to the selected logistics admin (parent_user_id filter)
  const { data: logisticsUsersForAdmin = [] } = useAvailableLogisticsUsers(selectedLogisticsAdmin);
  const activeLogisticsUsersForAdmin = logisticsUsersForAdmin;
  const filteredLogisticsUsers = logisticsUserSearch
    ? activeLogisticsUsersForAdmin.filter(u =>
        u.name?.toLowerCase().includes(logisticsUserSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(logisticsUserSearch.toLowerCase()) ||
        u.phone?.toLowerCase().includes(logisticsUserSearch.toLowerCase())
      )
    : activeLogisticsUsersForAdmin;
  const selectedLogisticsUserObj = activeLogisticsUsersForAdmin.find(u => u.id === selectedLogisticsUser) || null;

  // Close logistics user dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (logisticsUserDropdownRef.current && !logisticsUserDropdownRef.current.contains(e.target as Node)) {
        setIsLogisticsUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Add new logistics admin state
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminCompany, setNewAdminCompany] = useState('');
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showReassignMode, setShowReassignMode] = useState(false);

  // Get active logistics admins
  const activeLogisticsAdmins = logisticsAdmins.filter(a => a.status === 'active');

  // Filter pickup requests (OPS Admin respects global enterprise filter; Super Admin sees all)
  const filteredRequests = pickupRequests
    .filter(r => {
      // Apply enterprise filter (only for OPS Admin with specific enterprise selected)
      if (!isAllEnterprises && r.enterprise_id !== selectedEnterpriseId) return false;
      if (statusFilter === 'pending') return r.status === 'pending';
      if (statusFilter === 'assigned') return r.logistics_admin_id && r.status !== 'completed' && r.status !== 'cancelled' && r.status !== 'failed';
      if (statusFilter === 'completed') return r.status === 'completed' || r.status === 'failed';
      // 'all' shows everything except cancelled
      return r.status !== 'cancelled';
    })
    .filter(r => {
      const enterprise = enterprises.find(e => e.id === r.enterprise_id);
      const locationName = r.pickup_locations?.name || '';
      return (
        locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        enterprise?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    })
    .sort((a, b) => {
      // Unassigned (needs assignment) float to top
      const isTerminal = (s: string) => ['completed', 'failed', 'cancelled'].includes(s);
      const aNeedsAssign = !a.logistics_admin_id && !isTerminal(a.status) ? 0 : 1;
      const bNeedsAssign = !b.logistics_admin_id && !isTerminal(b.status) ? 0 : 1;
      if (aNeedsAssign !== bNeedsAssign) return aNeedsAssign - bNeedsAssign;
      // Within same group: sort by priority
      const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
      const aPriority = priorityOrder[a.priority] ?? 2;
      const bPriority = priorityOrder[b.priority] ?? 2;
      if (aPriority !== bPriority) return aPriority - bPriority;
      // Then by date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // Stats respect enterprise filter for OPS Admin — use backend stats where available
  const enterpriseFilteredRequests = pickupRequests.filter(r => isAllEnterprises || r.enterprise_id === selectedEnterpriseId);
  const pendingCount = dashStats.pickup_pending ?? enterpriseFilteredRequests.filter(r => r.status === 'pending').length;
  const assignedCount = dashStats.pickup_assigned ?? enterpriseFilteredRequests.filter(r => r.logistics_admin_id && r.status !== 'completed' && r.status !== 'cancelled' && r.status !== 'failed').length;
  const completedCount = dashStats.pickup_completed ?? enterpriseFilteredRequests.filter(r => r.status === 'completed' || r.status === 'failed').length;
  const totalActive = (dashStats.pickup_pending ?? 0) + (dashStats.pickup_assigned ?? 0) + (dashStats.pickup_in_progress ?? 0) || enterpriseFilteredRequests.filter(r => r.status !== 'completed' && r.status !== 'cancelled' && r.status !== 'failed').length;

  const getEnterpriseName = (enterpriseId: string) => {
    const enterprise = enterprises.find(e => e.id === enterpriseId);
    return enterprise?.name || 'Unknown Enterprise';
  };

  const getLogisticsAdminName = (adminId?: string) => {
    if (!adminId) return 'Unassigned';
    const admin = logisticsAdmins.find(a => a.id === adminId);
    return admin ? (admin.company_name ? `${admin.name} (${admin.company_name})` : admin.name) : 'Unknown';
  };

  const openAssignModal = (requestId: string) => {
    const request = pickupRequests.find(r => r.id === requestId);
    if (!request) return;
    setSelectedRequest(requestId);
    setSelectedLogisticsAdmin('');
    setSelectedLogisticsUser('');
    setLogisticsUserSearch('');
    setIsLogisticsUserDropdownOpen(false);
    setShowReassignMode(!!request.logistics_admin_id);
    setShowAddAdmin(false);
    setShowAssignModal(true);
  };

  const closeAssignModal = () => {
    setShowAssignModal(false);
    setSelectedRequest(null);
    setSelectedLogisticsAdmin('');
    setSelectedLogisticsUser('');
    setLogisticsUserSearch('');
    setIsLogisticsUserDropdownOpen(false);
    setShowReassignMode(false);
    setShowAddAdmin(false);
  };

  const handleAssign = async () => {
    if (!selectedRequest || !selectedLogisticsAdmin || !user) return;

    try {
      await assignAdminMutation.mutateAsync({
        requestId: selectedRequest,
        logisticsAdminId: selectedLogisticsAdmin,
      });

      // Optionally also assign to a specific logistics user
      if (selectedLogisticsUser) {
        await assignUserMutation.mutateAsync({
          requestId: selectedRequest,
          logisticsUserId: selectedLogisticsUser,
        });
      }

      closeAssignModal();
      setShowConfirmModal(false);
    } catch (error) {
      console.error('Assignment failed:', error);
      addToast({ type: 'error', title: 'Assignment Failed', message: error instanceof Error ? error.message : 'Failed to assign pickup', duration: 5000 });
    }
  };

  const handleCreateAdmin = async () => {
    if (!newAdminName || !newAdminEmail || !newAdminPassword) {
      addToast({ type: 'warning', title: 'Missing Fields', message: 'Name, email, and password are required', duration: 4000 });
      return;
    }
    if (newAdminPassword.length < 8) {
      addToast({ type: 'warning', title: 'Invalid Password', message: 'Password must be at least 8 characters', duration: 4000 });
      return;
    }

    setIsCreatingAdmin(true);
    try {
      const newAdmin = await createAdminMutation.mutateAsync({
        name: newAdminName,
        company_name: newAdminCompany,
        phone: newAdminPhone || '',
        email: newAdminEmail,
        password: newAdminPassword,
      });

      if (!newAdmin) throw new Error('Failed to create logistics admin');

      // Auto-select the newly created admin
      setSelectedLogisticsAdmin(newAdmin.id);

      // Reset form
      setShowAddAdmin(false);
      setNewAdminName('');
      setNewAdminCompany('');
      setNewAdminPhone('');
      setNewAdminEmail('');
      setNewAdminPassword('');
    } catch (error) {
      console.error('Error creating logistics admin:', error);
      addToast({ type: 'error', title: 'Creation Failed', message: error instanceof Error ? error.message : 'Failed to create logistics admin', duration: 5000 });
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const selectedRequestData = selectedRequest ? pickupRequests.find(r => r.id === selectedRequest) : null;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-red-400/30 bg-red-400/10 text-red-400';
      case 'high': return 'border-amber-400/30 bg-amber-400/10 text-amber-400';
      case 'normal': return 'border-blue-400/30 bg-blue-400/10 text-blue-400';
      case 'low': return 'border-slate-400/30 bg-slate-400/10 text-slate-400';
      default: return 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-white/50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'border-amber-400/30 bg-amber-400/10 text-amber-400';
      case 'assigned_to_logistics_admin': return 'border-blue-400/30 bg-blue-400/10 text-blue-400';
      case 'assigned_to_logistics_user': return 'border-blue-400/30 bg-blue-400/10 text-blue-400';
      case 'scheduled': return 'border-cyan-400/30 bg-cyan-400/10 text-cyan-400';
      case 'in_progress': return 'border-purple-400/30 bg-purple-400/10 text-purple-400';
      case 'completed': return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400';
      case 'failed': return 'border-orange-400/30 bg-orange-400/10 text-orange-400';
      default: return 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-white/50';
    }
  };

  // Subtitle adapts to enterprise filter
  const subtitle = isAllEnterprises
    ? (isSuperAdmin
      ? `${totalActive} active pickup requests across all enterprises`
      : 'Assign pickup requests to logistics partners')
    : `Pickups for ${selectedEnterprise?.name || 'selected enterprise'}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-2">
            {isSuperAdmin ? 'Super Admin' : 'Pickup Management'}
          </span>
          <h1 className="font-brand font-bold text-3xl text-slate-900 dark:text-white uppercase tracking-tight">
            {isSuperAdmin ? 'All Pickups' : 'Pickup Queue'}
          </h1>
          <p className="font-display text-slate-500 dark:text-white/50 text-sm mt-2 uppercase tracking-wide">
            {subtitle}
          </p>
        </motion.div>
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`grid grid-cols-2 ${isSuperAdmin ? 'sm:grid-cols-3 lg:grid-cols-5' : 'md:grid-cols-4'} border-l border-t border-slate-200 dark:border-white/10`}
      >
        {isSuperAdmin && (
          <div className="p-5 border-r border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-black/20">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-mono font-bold text-xs uppercase tracking-widest text-slate-600 dark:text-white/60">Active</h4>
              <Truck className="w-4 h-4 text-slate-500 dark:text-white/60" />
            </div>
            <div className="font-brand font-bold text-3xl text-slate-900 dark:text-white">{totalActive}</div>
          </div>
        )}
        <div className="p-5 border-r border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-black/20">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-mono font-bold text-xs uppercase tracking-widest text-slate-600 dark:text-white/60">Pending</h4>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="font-brand font-bold text-3xl text-amber-400">{pendingCount}</div>
        </div>
        <div className="p-5 border-r border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-black/20">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-mono font-bold text-xs uppercase tracking-widest text-slate-600 dark:text-white/60">Assigned</h4>
            <Truck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="font-brand font-bold text-3xl text-blue-400">{assignedCount}</div>
        </div>
        <div className="p-5 border-r border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-black/20">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-mono font-bold text-xs uppercase tracking-widest text-slate-600 dark:text-white/60">Completed</h4>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-brand font-bold text-3xl text-emerald-400">{completedCount}</div>
        </div>
        <div className="p-5 border-r border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-black/20">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-mono font-bold text-xs uppercase tracking-widest text-slate-600 dark:text-white/60">Partners</h4>
            <User className="w-4 h-4 text-slate-500 dark:text-white/60" />
          </div>
          <div className="font-brand font-bold text-3xl text-slate-500 dark:text-white/60">{activeLogisticsAdmins.length}</div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex flex-col md:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-white/50" />
          <input
            type="text"
            placeholder="Search by location, enterprise, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {([
            { key: 'all', label: 'All' },
            { key: 'pending', label: 'Pending' },
            { key: 'assigned', label: 'Assigned' },
            { key: 'completed', label: 'Completed' }
          ] as const).map((filter) => (
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

      {/* Pickup Requests List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]"
      >
        {filteredRequests.length > 0 ? (
          <div className="divide-y divide-slate-200 dark:divide-white/5">
            {filteredRequests.map((request, idx) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 * Math.min(idx, 10) }}
                className="p-5 hover:bg-white/60 dark:hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 border flex items-center justify-center flex-shrink-0 ${
                    request.status === 'pending'
                      ? 'border-amber-400/30 bg-amber-400/10'
                      : 'border-blue-400/30 bg-blue-400/10'
                  }`}>
                    <Truck className={`w-6 h-6 ${
                      request.status === 'pending'
                        ? 'text-amber-400'
                        : 'text-blue-400'
                    }`} />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase">
                      {request.pickup_locations?.name || 'Unknown Location'}
                    </p>
                    <p className="font-mono text-xs text-slate-500 dark:text-white/50 mt-0.5">
                      {getEnterpriseName(request.enterprise_id)}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-xs font-mono text-slate-500 dark:text-white/50">
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {request.asset_ids?.length || 0} assets
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(request.preferred_date || request.created_at).toLocaleDateString()}
                      </span>
                      {request.logistics_admin_id && (
                        <span className="flex items-center gap-1 text-blue-400">
                          <User className="w-3 h-3" />
                          {getLogisticsAdminName(request.logistics_admin_id)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Badges + Action — all in one row */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-2 py-0.5 border font-mono font-bold text-[10px] uppercase tracking-widest ${getStatusColor(request.status)}`}>
                      {request.status.replaceAll('_', ' ')}
                    </span>
                    <span className={`px-2 py-0.5 border font-mono font-bold text-[10px] uppercase tracking-widest ${getPriorityColor(request.priority)}`}>
                      {request.priority}
                    </span>
                    {(() => {
                      const isTerminal = ['completed', 'failed', 'cancelled'].includes(request.status);
                      return request.logistics_admin_id ? (
                        <button
                          type="button"
                          onClick={() => !isTerminal && openAssignModal(request.id)}
                          disabled={isTerminal}
                          className={`px-4 py-2 border font-mono text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 ml-2 transition-colors ${
                            isTerminal
                              ? 'border-slate-200 dark:border-white/10 text-slate-300 dark:text-white/20 cursor-not-allowed'
                              : 'interactive border-amber-400/50 text-amber-400 hover:bg-amber-400/10'
                          }`}
                        >
                          <RefreshCcw className="w-3.5 h-3.5" />
                          Reassign
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => !isTerminal && openAssignModal(request.id)}
                          disabled={isTerminal}
                          className={`px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 ml-2 transition-all ${
                            isTerminal
                              ? 'bg-slate-100 dark:bg-white/5 text-slate-300 dark:text-white/20 cursor-not-allowed'
                              : 'interactive bg-ecotribe-primary text-black hover:bg-white'
                          }`}
                        >
                          <Send className="w-3.5 h-3.5" />
                          Assign
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <Truck className="w-12 h-12 text-slate-500 dark:text-white/50 mx-auto mb-4" />
            <p className="font-display font-bold text-slate-500 dark:text-white/50 uppercase tracking-wide mb-1">
              No Pickup Requests
            </p>
            <p className="font-mono text-xs text-slate-500 dark:text-white/50">
              {searchQuery ? 'Try adjusting your search.' : 'No pending pickup requests at this time.'}
            </p>
          </div>
        )}
      </motion.div>

      {/* Assignment Modal */}
      <AnimatePresence>
        {showAssignModal && selectedRequestData && (
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
                    {showReassignMode ? (
                      <RefreshCcw className="w-5 h-5 text-ecotribe-primary" />
                    ) : (
                      <Send className="w-5 h-5 text-ecotribe-primary" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide">
                      {showReassignMode ? 'Reassign Pickup' : 'Assign to Partner'}
                    </h3>
                    <p className="font-mono text-xs text-slate-500 dark:text-white/50 mt-1">
                      {selectedRequestData.pickup_locations?.name || 'Pickup'} · {selectedRequestData.asset_ids?.length || 0} assets
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeAssignModal}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500 dark:text-white/50" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Pickup Details */}
                <div className="flex items-center gap-4 p-4 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                  <div className="w-14 h-14 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-center">
                    <MapPin className="w-7 h-7 text-slate-500 dark:text-white/50" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-slate-900 dark:text-white uppercase">
                      {selectedRequestData.pickup_locations?.name}
                    </p>
                    <p className="font-mono text-xs text-slate-500 dark:text-white/50">
                      {selectedRequestData.pickup_locations?.address}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-slate-500 dark:text-white/50" />
                    <span className="font-display text-slate-900 dark:text-white">
                      {getEnterpriseName(selectedRequestData.enterprise_id)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Package className="w-4 h-4 text-slate-500 dark:text-white/50" />
                    <span className="font-display text-slate-900 dark:text-white">
                      {selectedRequestData.asset_ids?.length || 0} assets
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-slate-500 dark:text-white/50" />
                    <span className="font-display text-slate-900 dark:text-white">
                      {new Date(selectedRequestData.preferred_date || selectedRequestData.created_at).toLocaleDateString()} ({selectedRequestData.preferred_time_slot})
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 border font-mono font-bold text-[10px] uppercase ${getPriorityColor(selectedRequestData.priority)}`}>
                      {selectedRequestData.priority}
                    </span>
                    <span className={`px-2 py-0.5 border font-mono font-bold text-[10px] uppercase ${getStatusColor(selectedRequestData.status)}`}>
                      {selectedRequestData.status.replaceAll('_', ' ')}
                    </span>
                  </div>
                </div>

                {selectedRequestData.special_instructions && (
                  <div>
                    <p className="font-mono font-bold text-xs uppercase tracking-widest mb-2 text-slate-500 dark:text-white/50">
                      Special Instructions
                    </p>
                    <div className="p-4 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                      <p className="font-display text-slate-900 dark:text-white">{selectedRequestData.special_instructions}</p>
                    </div>
                  </div>
                )}

                {/* Current Assignment Info (reassign mode) */}
                {showReassignMode && selectedRequestData.logistics_admin_id && (
                  <div className="p-4 border border-amber-400/30 bg-amber-400/10">
                    <div className="flex items-center gap-2 mb-1">
                      <RefreshCcw className="w-4 h-4 text-amber-400" />
                      <span className="font-mono font-bold text-xs text-amber-400 uppercase">
                        Currently Assigned
                      </span>
                    </div>
                    <p className="font-display text-slate-700 dark:text-zinc-300">
                      {getLogisticsAdminName(selectedRequestData.logistics_admin_id)}
                    </p>
                  </div>
                )}

                {/* Partner Selection */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-mono font-bold text-xs uppercase tracking-widest text-slate-500 dark:text-white/50">
                      {showReassignMode ? 'Select New Partner' : 'Assign to Logistics Partner'}
                    </p>
                    {!showAddAdmin && (
                      <button
                        type="button"
                        onClick={() => setShowAddAdmin(true)}
                        className="interactive flex items-center gap-1 px-2 py-1 border border-ecotribe-primary/50 text-ecotribe-primary font-mono text-xs uppercase hover:bg-ecotribe-primary/10 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Add New
                      </button>
                    )}
                  </div>

                  {showAddAdmin ? (
                    /* Add New Logistics Admin Form */
                    <div className="p-4 border border-ecotribe-primary/30 bg-ecotribe-primary/5 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="font-mono font-bold text-xs text-ecotribe-primary uppercase">
                          Add Logistics Partner
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowAddAdmin(false)}
                          className="text-slate-400 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder="Contact Name *"
                            value={newAdminName}
                            onChange={(e) => setNewAdminName(e.target.value)}
                            onInput={(e: React.FormEvent<HTMLInputElement>) => {
                              e.currentTarget.value = e.currentTarget.value.replace(/[^a-zA-Z\s'.\-]/g, '');
                            }}
                            className="px-3 py-2 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display text-sm placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Company Name (Optional)"
                            value={newAdminCompany}
                            onChange={(e) => setNewAdminCompany(e.target.value)}
                            onInput={(e: React.FormEvent<HTMLInputElement>) => {
                              e.currentTarget.value = e.currentTarget.value.replace(/[^a-zA-Z0-9\s&.\-]/g, '');
                            }}
                            className="px-3 py-2 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display text-sm placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="email"
                            placeholder="Email *"
                            value={newAdminEmail}
                            onChange={(e) => setNewAdminEmail(e.target.value)}
                            className="px-3 py-2 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display text-sm placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none"
                          />
                          <input
                            type="password"
                            placeholder="Password * (min 8 chars)"
                            value={newAdminPassword}
                            onChange={(e) => setNewAdminPassword(e.target.value)}
                            className="px-3 py-2 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display text-sm placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none"
                          />
                        </div>
                        <input
                          type="tel"
                          placeholder="9876543210"
                          inputMode="numeric"
                          value={newAdminPhone}
                          onChange={(e) => setNewAdminPhone(e.target.value)}
                          maxLength={10}
                          onInput={(e: React.FormEvent<HTMLInputElement>) => {
                            e.currentTarget.value = e.currentTarget.value.replace(/\D/g, '').slice(0, 10);
                          }}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display text-sm placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleCreateAdmin}
                        disabled={!newAdminName || !newAdminEmail || !newAdminPassword || newAdminPassword.length < 8 || isCreatingAdmin}
                        className={`w-full py-2 font-mono font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                          newAdminName && newAdminCompany && newAdminEmail && newAdminPassword && newAdminPassword.length >= 8
                            ? 'bg-ecotribe-primary text-white hover:bg-ecotribe-primary/80'
                            : 'bg-slate-100 dark:bg-white/10 text-slate-400 dark:text-white/50 cursor-not-allowed'
                        }`}
                      >
                        {isCreatingAdmin ? (
                          <Clock className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            Create Partner
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    /* Logistics Admin Dropdown */
                    <div className="space-y-3">
                      {(() => {
                        const availableAdmins = showReassignMode
                          ? activeLogisticsAdmins.filter(admin => admin.id !== selectedRequestData.logistics_admin_id)
                          : activeLogisticsAdmins;

                        return availableAdmins.length > 0 ? (
                          <>
                            <select
                              value={selectedLogisticsAdmin}
                              onChange={(e) => { setSelectedLogisticsAdmin(e.target.value); setSelectedLogisticsUser(''); setLogisticsUserSearch(''); setIsLogisticsUserDropdownOpen(false); }}
                              className="w-full px-4 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display text-sm focus:border-ecotribe-primary focus:outline-none transition-colors appearance-none cursor-pointer"
                              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                            >
                              <option value="">Select a logistics partner...</option>
                              {availableAdmins.map((admin) => (
                                <option key={admin.id} value={admin.id}>
                                  {admin.name}{admin.company_name ? ` — ${admin.company_name}` : ''}{admin.phone ? ` (${admin.phone})` : ''}
                                </option>
                              ))}
                            </select>
                            {/* Show selected partner details */}
                            {selectedLogisticsAdmin && (() => {
                              const selected = availableAdmins.find(a => a.id === selectedLogisticsAdmin);
                              if (!selected) return null;
                              return (
                                <div className="flex items-center gap-3 p-3 border border-ecotribe-primary/30 bg-ecotribe-primary/5">
                                  <div className="w-10 h-10 border border-ecotribe-primary/30 bg-ecotribe-primary/10 flex items-center justify-center flex-shrink-0">
                                    <User className="w-5 h-5 text-ecotribe-primary" />
                                  </div>
                                  <div>
                                    <p className="font-display font-bold text-ecotribe-primary uppercase text-sm">{selected.name}</p>
                                    <p className="font-mono text-xs text-slate-500 dark:text-white/50">
                                      {[selected.company_name, selected.phone, selected.email].filter(Boolean).join(' · ')}
                                    </p>
                                  </div>
                                </div>
                              );
                            })()}
                          </>
                        ) : (
                          <div className="p-4 border border-amber-400/30 bg-amber-400/10 text-center">
                            <AlertCircle className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                            <p className="font-mono text-xs text-amber-400 mb-2">
                              {showReassignMode ? 'No other partners available' : 'No logistics partners added yet'}
                            </p>
                            <button
                              type="button"
                              onClick={() => setShowAddAdmin(true)}
                              className="interactive inline-flex items-center gap-1 px-3 py-2 bg-amber-400/20 border border-amber-400/50 text-amber-400 font-mono text-xs uppercase hover:bg-amber-400/30 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              Add Partner
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Logistics User Dropdown — tier-2 optional assignment */}
                {!showAddAdmin && selectedLogisticsAdmin && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-mono font-bold text-xs uppercase tracking-widest text-slate-500 dark:text-white/50">
                        Assign Field User <span className="font-normal lowercase">(optional)</span>
                      </p>
                    </div>

                    <div ref={logisticsUserDropdownRef} className="relative">
                      {/* Trigger */}
                      <button
                        type="button"
                        onClick={() => setIsLogisticsUserDropdownOpen(!isLogisticsUserDropdownOpen)}
                        className="w-full px-4 py-3 flex items-center justify-between border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-ecotribe-primary/50 transition-colors"
                      >
                        {selectedLogisticsUserObj ? (
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-display font-bold text-sm text-slate-900 dark:text-white truncate">{selectedLogisticsUserObj.name}</span>
                            <span className="font-mono text-xs text-slate-500 dark:text-white/50 truncate">{selectedLogisticsUserObj.phone || selectedLogisticsUserObj.email}</span>
                          </div>
                        ) : (
                          <span className="font-mono text-sm text-slate-400 dark:text-white/30">
                            {activeLogisticsUsersForAdmin.length === 0 ? 'No field users in this partner' : 'Select field user (optional)...'}
                          </span>
                        )}
                        <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${isLogisticsUserDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {selectedLogisticsUser && (
                        <button
                          type="button"
                          onClick={() => { setSelectedLogisticsUser(''); setLogisticsUserSearch(''); }}
                          className="absolute right-10 top-3 p-1 text-slate-400 hover:text-slate-600 dark:text-white/30 dark:hover:text-white/60"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Dropdown panel - uses normal flow (not absolute) so modal can scroll */}
                      <AnimatePresence>
                        {isLogisticsUserDropdownOpen && activeLogisticsUsersForAdmin.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.15 }}
                            className="border border-t-0 border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-xl overflow-hidden"
                          >
                            {/* Search */}
                            <div className="p-2 border-b border-slate-200 dark:border-white/10">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-white/50" />
                                <input
                                  type="text"
                                  value={logisticsUserSearch}
                                  onChange={(e) => setLogisticsUserSearch(e.target.value)}
                                  placeholder="Search by name, email, or phone..."
                                  autoFocus
                                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 placeholder:text-slate-400 dark:placeholder:text-white/30"
                                />
                              </div>
                            </div>

                            {/* User list */}
                            <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-white/[0.04]">
                              {filteredLogisticsUsers.map(u => (
                                <button
                                  key={u.id}
                                  type="button"
                                  onClick={() => { setSelectedLogisticsUser(u.id); setIsLogisticsUserDropdownOpen(false); setLogisticsUserSearch(''); }}
                                  className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                                    selectedLogisticsUser === u.id
                                      ? 'bg-ecotribe-primary/10 border-l-2 border-ecotribe-primary'
                                      : 'hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                                  }`}
                                >
                                  <UserPlus className={`w-4 h-4 flex-shrink-0 ${selectedLogisticsUser === u.id ? 'text-ecotribe-primary' : 'text-slate-400 dark:text-white/30'}`} />
                                  <div className="flex-1 min-w-0">
                                    <p className={`font-display font-bold text-sm truncate ${selectedLogisticsUser === u.id ? 'text-ecotribe-primary' : 'text-slate-900 dark:text-white'}`}>
                                      {u.name || 'Unknown'}
                                    </p>
                                    <p className="font-mono text-xs text-slate-500 dark:text-white/50 truncate">{u.phone || u.email}</p>
                                  </div>
                                  {selectedLogisticsUser === u.id && <CheckCircle className="w-4 h-4 text-ecotribe-primary flex-shrink-0" />}
                                </button>
                              ))}
                              {filteredLogisticsUsers.length === 0 && (
                                <div className="p-4 text-center">
                                  <p className="font-mono text-sm text-slate-500 dark:text-white/50">
                                    No users found matching "{logisticsUserSearch}"
                                  </p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {selectedLogisticsUserObj && (
                      <div className="flex items-center gap-3 p-3 mt-2 border border-ecotribe-primary/30 bg-ecotribe-primary/5">
                        <div className="w-8 h-8 border border-ecotribe-primary/30 bg-ecotribe-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-ecotribe-primary" />
                        </div>
                        <div>
                          <p className="font-display font-bold text-ecotribe-primary uppercase text-sm">{selectedLogisticsUserObj.name}</p>
                          <p className="font-mono text-xs text-slate-500 dark:text-white/50">{selectedLogisticsUserObj.phone || selectedLogisticsUserObj.email}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              {!showAddAdmin && (
                <div className="p-6 border-t border-slate-200 dark:border-white/10 flex gap-3 justify-end">
                  <button
                    onClick={closeAssignModal}
                    className="px-5 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(true)}
                    disabled={!selectedLogisticsAdmin || assignMutation.isPending}
                    className={`px-5 py-2.5 font-mono font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${
                      selectedLogisticsAdmin
                        ? showReassignMode
                          ? 'bg-amber-500 text-white hover:bg-amber-400'
                          : 'bg-ecotribe-primary text-black hover:bg-white'
                        : 'bg-slate-100 dark:bg-white/10 text-slate-400 dark:text-white/50 cursor-not-allowed'
                    }`}
                  >
                    {assignMutation.isPending ? (
                      <Clock className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        {showReassignMode ? <RefreshCcw className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                        {showReassignMode ? 'Reassign Partner' : 'Assign Partner'}
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleAssign}
        isLoading={assignMutation.isPending}
        variant="warning"
        title={showReassignMode ? "Reassign Pickup to New Partner?" : "Assign Pickup to Partner?"}
        description={showReassignMode
          ? `This pickup will be reassigned from ${getLogisticsAdminName(selectedRequestData?.logistics_admin_id)} to ${getLogisticsAdminName(selectedLogisticsAdmin)}. The new partner will be notified.`
          : `This pickup will be assigned to ${getLogisticsAdminName(selectedLogisticsAdmin)}. They will be notified and expected to schedule within 24 hours.`
        }
        confirmText={showReassignMode ? "Reassign Partner" : "Assign Partner"}
        details={
          selectedRequestData && (
            <div className="text-left space-y-1">
              <p className="font-mono text-xs text-slate-500 dark:text-white/50">
                <span className="text-slate-400 dark:text-white/40">Location:</span> {selectedRequestData.pickup_locations?.name}
              </p>
              <p className="font-mono text-xs text-slate-500 dark:text-white/50">
                <span className="text-slate-400 dark:text-white/40">Assets:</span> {selectedRequestData.asset_ids?.length || 0}
              </p>
              <p className="font-mono text-xs text-slate-500 dark:text-white/50">
                <span className="text-slate-400 dark:text-white/40">Enterprise:</span> {getEnterpriseName(selectedRequestData.enterprise_id)}
              </p>
              {showReassignMode && (
                <p className="font-mono text-xs text-amber-400 mt-2">
                  <span className="text-amber-400/70">Previous:</span> {getLogisticsAdminName(selectedRequestData.logistics_admin_id)}
                </p>
              )}
            </div>
          )
        }
      />
    </div>
  );
}
