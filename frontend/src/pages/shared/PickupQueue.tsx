/**
 * Shared Pickup Queue Page
 * Used by both Super Admin and OPS Admin portals
 * OPS Admin: Respects enterprise filter from OpsEnterpriseContext
 * Super Admin: Shows all pickups platform-wide
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
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
  RefreshCcw
} from 'lucide-react';
import { useAuth, useAllPickupRequests, useLogisticsAdmins, useCreateLogisticsAdmin, useAssignToLogisticsAdmin, useEnterprises } from '@/hooks';
import { useOptionalOpsEnterprise } from '@/contexts/OpsEnterpriseContext';
import { ConfirmationModal, Card, PageHeader, useToast } from '@/components/ui';
import { text, iconSize } from '@/lib/design-tokens';
import { useUserRole } from '@/stores/authStoreApi';

type QueueFilter = 'all' | 'pending' | 'assigned' | 'completed';

export function PickupQueue() {
  const { user } = useAuth();
  const userRole = useUserRole();
  const isSuperAdmin = userRole === 'super_admin';
  const headerLabel = isSuperAdmin ? 'Super Admin' : 'Pickup Management';

  const { data: pickupRequests = [], isLoading } = useAllPickupRequests();
  const { data: logisticsAdmins = [], isLoading: isLoadingLogistics } = useLogisticsAdmins();
  const { data: enterprisesData = [] } = useEnterprises();
  const assignMutation = useAssignToLogisticsAdmin();
  const createAdminMutation = useCreateLogisticsAdmin();
  const { addToast } = useToast();

  // OPS Admin gets enterprise context from OpsLayout; Super Admin gets null
  const opsContext = useOptionalOpsEnterprise();
  const enterprises = opsContext?.enterprises ?? enterprisesData;
  const selectedEnterpriseId = opsContext?.selectedEnterpriseId ?? null;
  const isAllEnterprises = opsContext?.isAllEnterprises ?? true;
  const selectedEnterprise = opsContext?.selectedEnterprise ?? null;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<QueueFilter>(isSuperAdmin ? 'all' : 'pending');
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [selectedLogisticsAdmin, setSelectedLogisticsAdmin] = useState<string>('');

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
      const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // Stats respect enterprise filter for OPS Admin
  const enterpriseFilteredRequests = pickupRequests.filter(r => isAllEnterprises || r.enterprise_id === selectedEnterpriseId);
  const pendingCount = enterpriseFilteredRequests.filter(r => r.status === 'pending').length;
  const assignedCount = enterpriseFilteredRequests.filter(r => r.logistics_admin_id && r.status !== 'completed' && r.status !== 'cancelled' && r.status !== 'failed').length;
  const completedCount = enterpriseFilteredRequests.filter(r => r.status === 'completed' || r.status === 'failed').length;
  const totalActive = enterpriseFilteredRequests.filter(r => r.status !== 'completed' && r.status !== 'cancelled' && r.status !== 'failed').length;

  const getEnterpriseName = (enterpriseId: string) => {
    const enterprise = enterprises.find(e => e.id === enterpriseId);
    return enterprise?.name || 'Unknown Enterprise';
  };

  const getLogisticsAdminName = (adminId?: string) => {
    if (!adminId) return 'Unassigned';
    const admin = logisticsAdmins.find(a => a.id === adminId);
    return admin ? `${admin.name} (${admin.company_name})` : 'Unknown';
  };

  const handleAssign = async () => {
    if (!selectedRequest || !selectedLogisticsAdmin || !user) return;

    await assignMutation.mutateAsync({
      requestId: selectedRequest,
      logisticsAdminId: selectedLogisticsAdmin,
    });

    setSelectedRequest(null);
    setSelectedLogisticsAdmin('');
    setShowConfirmModal(false);
    setShowReassignMode(false);
  };

  const handleCreateAdmin = async () => {
    if (!newAdminName || !newAdminCompany || !newAdminEmail || !newAdminPassword) {
      addToast({ type: 'warning', title: 'Missing Fields', message: 'Name, company, email, and password are required', duration: 4000 });
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

      // Auto-select the newly created admin
      setSelectedLogisticsAdmin(newAdmin!.id);

      // Reset form
      setShowAddAdmin(false);
      setNewAdminName('');
      setNewAdminCompany('');
      setNewAdminPhone('');
      setNewAdminEmail('');
      setNewAdminPassword('');
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
      <PageHeader
        label={headerLabel}
        title={isSuperAdmin ? 'All Pickups' : 'Pickup Queue'}
        subtitle={subtitle}
      />

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`grid grid-cols-2 ${isSuperAdmin ? 'sm:grid-cols-3 lg:grid-cols-5' : 'md:grid-cols-4'} gap-3 md:gap-4`}
      >
        {/* Active stat - Super Admin only */}
        {isSuperAdmin && (
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Truck className={`w-4 h-4 ${text.muted}`} />
              <span className={`font-mono text-xs uppercase ${text.muted}`}>Active</span>
            </div>
            <p className={`font-brand font-bold text-3xl ${text.primary}`}>
              {totalActive}
            </p>
          </Card>
        )}

        <Card className={`p-5 ${isSuperAdmin ? 'border-amber-400/20' : ''}`}>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className={`font-mono text-xs uppercase ${text.muted}`}>Pending</span>
          </div>
          <p className="font-brand font-bold text-3xl text-amber-400">
            {pendingCount}
          </p>
        </Card>

        <Card className={`p-5 ${isSuperAdmin ? 'border-blue-400/20' : ''}`}>
          <div className="flex items-center gap-2 mb-2">
            <Truck className="w-4 h-4 text-blue-400" />
            <span className={`font-mono text-xs uppercase ${text.muted}`}>Assigned</span>
          </div>
          <p className="font-brand font-bold text-3xl text-blue-400">
            {assignedCount}
          </p>
        </Card>

        <Card className={`p-5 ${isSuperAdmin ? 'border-emerald-400/20' : ''}`}>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className={`font-mono text-xs uppercase ${text.muted}`}>Completed</span>
          </div>
          <p className="font-brand font-bold text-3xl text-emerald-400">
            {completedCount}
          </p>
        </Card>

        <Card className={`p-5 ${isSuperAdmin ? 'border-slate-400/20' : ''}`}>
          <div className="flex items-center gap-2 mb-2">
            <User className={`w-4 h-4 ${text.muted}`} />
            <span className={`font-mono text-xs uppercase ${text.muted}`}>Partners</span>
          </div>
          <p className={`font-brand font-bold text-3xl ${text.muted}`}>
            {activeLogisticsAdmins.length}
          </p>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
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
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pickup Requests List */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          {filteredRequests.length > 0 ? (
            filteredRequests.map((request, idx) => {
              const isSelected = selectedRequest === request.id;

              return (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card
                    onClick={() => {
                      setSelectedRequest(request.id);
                      setShowReassignMode(false);
                      setSelectedLogisticsAdmin('');
                    }}
                    className={`cursor-pointer transition-all ${
                      isSelected
                        ? 'border-ecotribe-primary bg-ecotribe-primary/5'
                        : 'hover:border-slate-200 dark:hover:border-white/20'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-4">
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
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className={`font-display font-bold uppercase ${text.primary}`}>
                                {request.pickup_locations?.name || 'Unknown Location'}
                              </p>
                              <p className={`font-mono text-xs ${text.muted}`}>
                                {getEnterpriseName(request.enterprise_id)}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className={`flex-shrink-0 px-2 py-1 border font-mono font-bold text-[10px] uppercase tracking-widest ${getStatusColor(request.status)}`}>
                                {request.status.replace('_', ' ')}
                              </span>
                              <span className={`flex-shrink-0 px-2 py-1 border font-mono font-bold text-[10px] uppercase tracking-widest ${getPriorityColor(request.priority)}`}>
                                {request.priority}
                              </span>
                            </div>
                          </div>
                          <div className={`flex items-center gap-4 mt-3 text-xs font-mono ${text.muted}`}>
                            <span className="flex items-center gap-1">
                              <Package className="w-3 h-3" />
                              {request.asset_ids?.length || 0} assets
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(request.preferred_date || request.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {request.logistics_admin_id && (
                            <div className="mt-2 flex items-center gap-1 text-xs font-mono text-blue-400">
                              <User className="w-3 h-3" />
                              {getLogisticsAdminName(request.logistics_admin_id)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })
          ) : (
            <Card className="py-16 text-center">
              <div className="w-16 h-16 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Truck className={`w-8 h-8 ${text.muted}`} />
              </div>
              <h3 className={`font-brand font-bold text-lg uppercase mb-2 ${text.muted}`}>
                No Pickup Requests
              </h3>
              <p className={`font-display text-sm ${text.muted}`}>
                {searchQuery ? 'Try adjusting your search.' : 'No pending pickup requests at this time.'}
              </p>
            </Card>
          )}
        </motion.div>

        {/* Assignment Panel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:sticky lg:top-4 h-fit"
        >
          {selectedRequestData ? (
            <Card>
              <div className="p-5 border-b border-slate-200 dark:border-white/10">
                <h3 className={`font-display font-bold text-sm uppercase tracking-wide ${text.primary}`}>
                  Pickup Details
                </h3>
              </div>

              <div className="p-5 space-y-6">
                {/* Location Info */}
                <div className="flex items-center gap-4 p-4 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                  <div className="w-14 h-14 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-center">
                    <MapPin className={`w-7 h-7 ${text.muted}`} />
                  </div>
                  <div>
                    <p className={`font-display font-bold uppercase ${text.primary}`}>
                      {selectedRequestData.pickup_locations?.name}
                    </p>
                    <p className={`font-mono text-xs ${text.muted}`}>
                      {selectedRequestData.pickup_locations?.address}
                    </p>
                  </div>
                </div>

                {/* Enterprise */}
                <div className="flex items-center gap-4">
                  <Building2 className={`w-4 h-4 ${text.muted}`} />
                  <span className={`font-display ${text.primary}`}>
                    {getEnterpriseName(selectedRequestData.enterprise_id)}
                  </span>
                </div>

                {/* Asset Count */}
                <div className="flex items-center gap-4">
                  <Package className={`w-4 h-4 ${text.muted}`} />
                  <span className={`font-display ${text.primary}`}>
                    {selectedRequestData.asset_ids?.length || 0} assets to pickup
                  </span>
                </div>

                {/* Preferred Date */}
                <div className="flex items-center gap-4">
                  <Calendar className={`w-4 h-4 ${text.muted}`} />
                  <span className={`font-display ${text.primary}`}>
                    Preferred: {new Date(selectedRequestData.preferred_date || selectedRequestData.created_at).toLocaleDateString()} ({selectedRequestData.preferred_time_slot})
                  </span>
                </div>

                {/* Priority & Status */}
                <div className="flex items-center gap-4">
                  <span className={`px-2 py-1 border font-mono font-bold text-xs uppercase ${getPriorityColor(selectedRequestData.priority)}`}>
                    {selectedRequestData.priority} priority
                  </span>
                  <span className={`px-2 py-1 border font-mono font-bold text-xs uppercase ${getStatusColor(selectedRequestData.status)}`}>
                    {selectedRequestData.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Special Instructions */}
                {selectedRequestData.special_instructions && (
                  <div>
                    <p className={`font-mono font-bold text-xs uppercase tracking-widest mb-2 ${text.muted}`}>
                      Special Instructions
                    </p>
                    <div className="p-4 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                      <p className={`font-display ${text.primary}`}>{selectedRequestData.special_instructions}</p>
                    </div>
                  </div>
                )}

                {selectedRequestData.logistics_admin_id && !showReassignMode ? (
                  /* Already Assigned - with Reassign Option */
                  <div className="p-4 border border-blue-400/30 bg-blue-400/10">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-blue-400" />
                        <span className="font-mono font-bold text-sm text-blue-400 uppercase">
                          Assigned
                        </span>
                      </div>
                      <button
                        onClick={() => setShowReassignMode(true)}
                        className="interactive flex items-center gap-1.5 px-3 py-1.5 border border-amber-400/50 text-amber-400 font-mono text-xs uppercase hover:bg-amber-400/10 transition-colors"
                      >
                        <RefreshCcw className="w-3 h-3" />
                        Reassign
                      </button>
                    </div>
                    <p className="font-display text-slate-700 dark:text-zinc-300">
                      {getLogisticsAdminName(selectedRequestData.logistics_admin_id)}
                    </p>
                    <p className={`font-mono text-xs mt-2 ${text.muted}`}>
                      Waiting for logistics admin to assign field user
                    </p>
                  </div>
                ) : (selectedRequestData.logistics_admin_id && showReassignMode) ? (
                  /* Reassign Mode - Show Partner Selection */
                  <div className="space-y-4">
                    <div className="p-4 border border-amber-400/30 bg-amber-400/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <RefreshCcw className="w-5 h-5 text-amber-400" />
                          <span className="font-mono font-bold text-sm text-amber-400 uppercase">
                            Reassign Partner
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setShowReassignMode(false);
                            setSelectedLogisticsAdmin('');
                          }}
                          className="text-slate-400 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="font-mono text-xs text-amber-400/70 mt-2">
                        Current: {getLogisticsAdminName(selectedRequestData.logistics_admin_id)}
                      </p>
                    </div>

                    <div>
                      <p className={`font-mono font-bold text-xs uppercase tracking-widest mb-3 ${text.muted}`}>
                        Select New Partner
                      </p>
                      <div className="space-y-2">
                        {activeLogisticsAdmins
                          .filter(admin => admin.id !== selectedRequestData.logistics_admin_id)
                          .map((admin) => (
                            <button
                              key={admin.id}
                              onClick={() => setSelectedLogisticsAdmin(admin.id)}
                              className={`w-full interactive p-4 border text-left transition-all ${
                                selectedLogisticsAdmin === admin.id
                                  ? 'border-ecotribe-primary bg-ecotribe-primary/10'
                                  : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/20'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 border flex items-center justify-center ${
                                  selectedLogisticsAdmin === admin.id
                                    ? 'border-ecotribe-primary bg-ecotribe-primary/10'
                                    : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5'
                                }`}>
                                  <User className={`w-5 h-5 ${
                                    selectedLogisticsAdmin === admin.id
                                      ? 'text-ecotribe-primary'
                                      : text.muted
                                  }`} />
                                </div>
                                <div>
                                  <p className={`font-display font-bold uppercase ${
                                    selectedLogisticsAdmin === admin.id
                                      ? 'text-ecotribe-primary'
                                      : text.primary
                                  }`}>
                                    {admin.name}
                                  </p>
                                  <p className={`font-mono text-xs ${text.muted}`}>
                                    {admin.company_name}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                        {activeLogisticsAdmins.filter(admin => admin.id !== selectedRequestData.logistics_admin_id).length === 0 && (
                          <div className="p-4 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-center">
                            <p className={`font-mono text-xs ${text.muted}`}>
                              No other partners available
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowConfirmModal(true)}
                      disabled={!selectedLogisticsAdmin || assignMutation.isPending}
                      className={`w-full interactive py-3 font-mono font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                        selectedLogisticsAdmin
                          ? 'bg-amber-500 text-white hover:bg-amber-400'
                          : 'bg-slate-100 dark:bg-white/10 text-slate-400 dark:text-white/50 cursor-not-allowed'
                      }`}
                    >
                      {assignMutation.isPending ? (
                        <Clock className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <RefreshCcw className="w-4 h-4" />
                          Reassign to Partner
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  /* Assignment Form */
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className={`font-mono font-bold text-xs uppercase tracking-widest ${text.muted}`}>
                          Assign to Logistics Partner
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
                                className="px-3 py-2 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display text-sm placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none"
                              />
                              <input
                                type="text"
                                placeholder="Company Name *"
                                value={newAdminCompany}
                                onChange={(e) => setNewAdminCompany(e.target.value)}
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
                              placeholder="Phone"
                              value={newAdminPhone}
                              onChange={(e) => setNewAdminPhone(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display text-sm placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={handleCreateAdmin}
                            disabled={!newAdminName || !newAdminCompany || !newAdminEmail || !newAdminPassword || newAdminPassword.length < 8 || isCreatingAdmin}
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
                        /* Existing Logistics Admins List */
                        <div className="space-y-2">
                          {activeLogisticsAdmins.length > 0 ? (
                            activeLogisticsAdmins.map((admin) => (
                              <button
                                key={admin.id}
                                onClick={() => setSelectedLogisticsAdmin(admin.id)}
                                className={`w-full interactive p-4 border text-left transition-all ${
                                  selectedLogisticsAdmin === admin.id
                                    ? 'border-ecotribe-primary bg-ecotribe-primary/10'
                                    : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/20'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 border flex items-center justify-center ${
                                    selectedLogisticsAdmin === admin.id
                                      ? 'border-ecotribe-primary bg-ecotribe-primary/10'
                                      : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5'
                                  }`}>
                                    <User className={`w-5 h-5 ${
                                      selectedLogisticsAdmin === admin.id
                                        ? 'text-ecotribe-primary'
                                        : text.muted
                                    }`} />
                                  </div>
                                  <div>
                                    <p className={`font-display font-bold uppercase ${
                                      selectedLogisticsAdmin === admin.id
                                        ? 'text-ecotribe-primary'
                                        : text.primary
                                    }`}>
                                      {admin.name}
                                    </p>
                                    <p className={`font-mono text-xs ${text.muted}`}>
                                      {admin.company_name}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="p-4 border border-amber-400/30 bg-amber-400/10 text-center">
                              <AlertCircle className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                              <p className="font-mono text-xs text-amber-400 mb-2">
                                No logistics partners added yet
                              </p>
                              <button
                                type="button"
                                onClick={() => setShowAddAdmin(true)}
                                className="interactive inline-flex items-center gap-1 px-3 py-2 bg-amber-400/20 border border-amber-400/50 text-amber-400 font-mono text-xs uppercase hover:bg-amber-400/30 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                                Add First Partner
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {!showAddAdmin && (
                      <button
                        type="button"
                        onClick={() => setShowConfirmModal(true)}
                        disabled={!selectedLogisticsAdmin || isLoading}
                        className={`w-full interactive py-3 font-mono font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                          selectedLogisticsAdmin
                            ? 'bg-ecotribe-primary text-white hover:bg-ecotribe-primary/80'
                            : 'bg-slate-100 dark:bg-white/10 text-slate-400 dark:text-white/50 cursor-not-allowed'
                        }`}
                      >
                        {isLoading ? (
                          <Clock className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Assign to Partner
                          </>
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>
            </Card>
          ) : (
            <Card className="py-16 text-center">
              <Truck className={`w-10 h-10 mx-auto mb-4 ${text.muted}`} />
              <p className={`font-display ${text.muted}`}>
                Select a pickup request to view details and assign
              </p>
            </Card>
          )}
        </motion.div>
      </div>

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
              <p className={`font-mono text-xs ${text.muted}`}>
                <span className="text-slate-400 dark:text-white/40">Location:</span> {selectedRequestData.pickup_locations?.name}
              </p>
              <p className={`font-mono text-xs ${text.muted}`}>
                <span className="text-slate-400 dark:text-white/40">Assets:</span> {selectedRequestData.asset_ids?.length || 0}
              </p>
              <p className={`font-mono text-xs ${text.muted}`}>
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
