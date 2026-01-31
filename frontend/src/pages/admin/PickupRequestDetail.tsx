import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  MapPin,
  Calendar,
  User,
  Package,
  AlertTriangle,
  Phone,
  Building,
  Laptop,
  Camera,
  FileText,
  ChevronRight,
  UserPlus,
  Search,
  X,
  Plus
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Badge } from '@/components/ui';
import { useAuth, usePickupRequest, useAssets, useLogisticsUsers, useCancelPickup, useAssignToLogisticsUser, useUpdatePickupStatus, useCreateLogisticsUser } from '@/hooks';
import type { PickupRequestStatus, AssetPickupStatus } from '@/types';
import { pickupTimeSlotLabels } from '@/types/pickup';

const getStatusConfig = (status: string) => {
  const configs: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info'; icon: React.ReactNode }> = {
    pending: { label: 'Pending', variant: 'warning', icon: <Clock className="w-4 h-4" /> },
    assigned_to_logistics_admin: { label: 'Assigned to Admin', variant: 'info', icon: <User className="w-4 h-4" /> },
    assigned_to_logistics_user: { label: 'Assigned to Driver', variant: 'info', icon: <User className="w-4 h-4" /> },
    scheduled: { label: 'Scheduled', variant: 'info', icon: <Calendar className="w-4 h-4" /> },
    in_progress: { label: 'In Progress', variant: 'warning', icon: <Truck className="w-4 h-4" /> },
    completed: { label: 'Completed', variant: 'success', icon: <CheckCircle className="w-4 h-4" /> },
    failed: { label: 'Failed', variant: 'error', icon: <XCircle className="w-4 h-4" /> },
    cancelled: { label: 'Cancelled', variant: 'error', icon: <XCircle className="w-4 h-4" /> },
  };
  return configs[status] || { label: status?.replace(/_/g, ' ') || 'Unknown', variant: 'default' as const, icon: <Clock className="w-4 h-4" /> };
};

const getAssetStatusConfig = (status: AssetPickupStatus) => {
  const configs: Record<AssetPickupStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }> = {
    pending: { label: 'Pending', variant: 'warning' },
    picked_up: { label: 'Picked Up', variant: 'success' },
    no_show: { label: 'No Show', variant: 'error' },
    qc_failed: { label: 'QC Failed', variant: 'error' },
    removed: { label: 'Removed', variant: 'default' },
  };
  return configs[status];
};

// Timeline step component
function TimelineStep({
  title,
  description,
  timestamp,
  isCompleted,
  isCurrent,
  isLast,
}: {
  title: string;
  description?: string;
  timestamp?: Date;
  isCompleted: boolean;
  isCurrent: boolean;
  isLast: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
            isCompleted
              ? 'bg-ecotribe-primary border-ecotribe-primary'
              : isCurrent
              ? 'bg-transparent border-ecotribe-primary'
              : 'bg-transparent border-slate-300 dark:border-white/20'
          }`}
        >
          {isCompleted && <CheckCircle className="w-4 h-4 text-black" />}
        </div>
        {!isLast && (
          <div className={`w-0.5 flex-1 min-h-[40px] ${isCompleted ? 'bg-ecotribe-primary' : 'bg-slate-200 dark:bg-white/10'}`} />
        )}
      </div>
      <div className="pb-6">
        <h4 className={`font-display font-bold text-sm uppercase tracking-wide ${isCompleted || isCurrent ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-white/50'}`}>
          {title}
        </h4>
        {description && (
          <p className="font-mono text-xs text-slate-500 dark:text-white/50 mt-1">{description}</p>
        )}
        {timestamp && (
          <p className="font-mono text-[10px] text-slate-500 dark:text-white/50 mt-1">
            {format(new Date(timestamp), 'dd MMM yyyy, h:mm a')}
          </p>
        )}
      </div>
    </div>
  );
}

export function PickupRequestDetail() {
  const navigate = useNavigate();
  const { requestId } = useParams<{ requestId: string }>();
  const { enterprise, user } = useAuth();
  const enterpriseId = enterprise?.id || '';
  const { data: request } = usePickupRequest(requestId || '');
  const { data: assets = [] } = useAssets(enterpriseId);
  // For logistics admin, only show their own users; for others, show all
  const isLogisticsAdminRole = user?.role === 'logistics_admin';
  const { data: logisticsUsers = [] } = useLogisticsUsers(isLogisticsAdminRole ? user?.id : undefined);
  const cancelMutation = useCancelPickup();
  const assignMutation = useAssignToLogisticsUser();
  const updateStatusMutation = useUpdatePickupStatus();
  const createUserMutation = useCreateLogisticsUser();
  const isLoading = assignMutation.isPending || updateStatusMutation.isPending;
  const isCreatingUser = createUserMutation.isPending;

  const [isCancelling, setIsCancelling] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Add new user state
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');

  // Determine base path based on user role
  const basePath = isLogisticsAdminRole ? '/logistics-admin' : '/admin';

  // IMPORTANT: All hooks must be called before any early returns
  // Move useMemo BEFORE the conditional return to follow React's rules of hooks
  const filteredUsers = useMemo(() => {
    if (!userSearch) return logisticsUsers;
    const query = userSearch.toLowerCase();
    return logisticsUsers.filter(u =>
      u.name?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.phone?.toLowerCase().includes(query)
    );
  }, [logisticsUsers, userSearch]);

  if (!request) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8">
          <AlertTriangle className="w-16 h-16 text-slate-500 dark:text-white/50 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Request Not Found</h2>
          <p className="text-slate-500 dark:text-white/50 mb-6">This pickup request may have been deleted.</p>
          <button
            onClick={() => navigate(isLogisticsAdminRole ? '/logistics-admin' : `${basePath}/pickups`)}
            className="px-6 py-3 bg-ecotribe-primary text-black font-bold text-sm"
          >
            Back to {isLogisticsAdminRole ? 'Dashboard' : 'Pickup Requests'}
          </button>
        </div>
      </div>
    );
  }

  // V3.2: Use branches instead of pickup_locations
  const branch = request.branches;
  const statusConfig = getStatusConfig(request.status);
  const requestAssets = (request.asset_ids || []).map(id => assets.find(a => a.id === id)).filter(Boolean);

  // Calculate progress
  const pickedUpCount = (request.assets || []).filter(a => a.status === 'picked_up').length;
  const exceptionsCount = (request.assets || []).filter(a => ['no_show', 'qc_failed'].includes(a.status)).length;

  // Determine timeline status
  const statusOrder: string[] = ['pending', 'assigned_to_logistics_admin', 'assigned_to_logistics_user', 'scheduled', 'in_progress', 'completed'];
  const currentIndex = statusOrder.indexOf(request.status);

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this pickup request?')) return;
    setIsCancelling(true);
    try {
      await cancelMutation.mutateAsync(request.id);
      navigate(isLogisticsAdminRole ? '/logistics-admin' : `${basePath}/pickups`);
    } finally {
      setIsCancelling(false);
    }
  };

  const openAssignModal = () => {
    // Pre-populate with existing assignment if reassigning
    setSelectedUser(request.logistics_user_id || '');
    setScheduledDate(request.scheduled_date ? new Date(request.scheduled_date).toISOString().slice(0, 16) : '');
    setUserSearch('');
    setShowAssignModal(true);
  };

  const handleAssign = async () => {
    if (!selectedUser || !request) return;
    await assignMutation.mutateAsync({
      requestId: request.id,
      logisticsUserId: selectedUser,
      scheduledDate: scheduledDate ? new Date(scheduledDate).toISOString() : undefined,
    });
    await updateStatusMutation.mutateAsync({
      requestId: request.id,
      status: 'scheduled',
    });
    setShowAssignModal(false);
  };

  const handleCreateUser = async () => {
    if (!newUserName || !newUserEmail || !newUserPassword) {
      alert('Name, email, and password are required');
      return;
    }
    if (newUserPassword.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }

    try {
      const newUser = await createUserMutation.mutateAsync({
        name: newUserName,
        phone: newUserPhone || '',
        email: newUserEmail,
        password: newUserPassword,
        logistics_admin_id: user?.id || '',
      });

      // Auto-select the newly created user
      setSelectedUser(newUser.id);

      // Reset form
      setShowAddUser(false);
      setNewUserName('');
      setNewUserPhone('');
      setNewUserEmail('');
      setNewUserPassword('');
    } catch (error) {
      console.error('Error creating user:', error);
      alert(error instanceof Error ? error.message : 'Failed to create user');
    }
  };

  const assignedUser = request.logistics_user_id ? logisticsUsers.find(u => u.id === request.logistics_user_id) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-6">
        <button
          onClick={() => navigate(isLogisticsAdminRole ? '/logistics-admin' : `${basePath}/pickups`)}
          className="flex items-center gap-2 text-slate-500 dark:text-white/50 hover:text-ecotribe-primary transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-mono text-xs uppercase tracking-widest">Back to {isLogisticsAdminRole ? 'Dashboard' : 'Pickup Requests'}</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-ecotribe-primary/10 border border-ecotribe-primary/20 flex items-center justify-center flex-shrink-0">
              <Truck className="w-7 h-7 text-ecotribe-primary" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="font-brand font-bold text-2xl md:text-3xl text-slate-900 dark:text-white uppercase tracking-tight">
                  {branch?.branch_name || 'Unknown Branch'}
                </h1>
                {branch?.branch_code && (
                  <span className="font-mono text-sm text-ecotribe-primary bg-ecotribe-primary/10 px-3 py-1">
                    {branch.branch_code}
                  </span>
                )}
                <Badge variant={statusConfig.variant} size="lg">
                  <span className="flex items-center gap-1.5">
                    {statusConfig.icon}
                    {statusConfig.label}
                  </span>
                </Badge>
                {request.priority === 'urgent' && (
                  <Badge variant="error" size="lg">Urgent</Badge>
                )}
              </div>
              <p className="font-mono text-xs text-slate-500 dark:text-white/50">
                Request ID: {request.id} &bull; Created {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {/* Assignment Info */}
            {isLogisticsAdminRole && (
              <div className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-4 min-w-[280px]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-1">Assigned To</p>
                    {assignedUser ? (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-ecotribe-primary" />
                        <div>
                          <p className="font-display font-bold text-sm text-slate-900 dark:text-white">{assignedUser.name}</p>
                          <p className="font-mono text-xs text-slate-500 dark:text-white/50">{assignedUser.phone || assignedUser.email}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="font-mono text-sm text-slate-500 dark:text-white/50">Not assigned</p>
                    )}
                  </div>
                  {['pending', 'assigned_to_logistics_admin', 'assigned_to_logistics_user', 'scheduled'].includes(request.status) && (
                    <button
                      onClick={openAssignModal}
                      disabled={isLoading}
                      className="px-3 py-2 bg-ecotribe-primary text-black font-mono text-xs uppercase tracking-widest border border-ecotribe-primary/40 hover:bg-white transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {assignedUser ? 'Reassign' : 'Assign'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Cancel Button */}
            {request.status === 'pending' && !isLogisticsAdminRole && (
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 font-mono font-bold text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Request'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress Stats */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]"
          >
            <div className="p-5 border-r border-slate-200 dark:border-white/10">
              <p className="font-mono text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-1">Total Devices</p>
              <p className="font-brand font-bold text-3xl text-slate-900 dark:text-white">{request.asset_ids?.length || 0}</p>
            </div>
            <div className="p-5 border-r border-slate-200 dark:border-white/10">
              <p className="font-mono text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-1">Picked Up</p>
              <p className="font-brand font-bold text-3xl text-ecotribe-primary">{pickedUpCount}</p>
            </div>
            <div className="p-5">
              <p className="font-mono text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-1">Exceptions</p>
              <p className={`font-brand font-bold text-3xl ${exceptionsCount > 0 ? 'text-red-400' : 'text-slate-900 dark:text-white'}`}>{exceptionsCount}</p>
            </div>
          </motion.div>

          {/* Device List */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]"
          >
            <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-slate-500 dark:text-white/50" />
                <h2 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">Devices in Pickup</h2>
              </div>
              <span className="font-mono text-xs text-slate-500 dark:text-white/50">{request.asset_ids?.length || 0} devices</span>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-white/5">
              {(request.assets || []).map((assetRecord) => {
                const asset = assets.find(a => a.id === assetRecord.asset_id);
                const assetStatusConfig = getAssetStatusConfig(assetRecord.status);

                return (
                  <div
                    key={assetRecord.asset_id}
                    onClick={() => navigate(`${basePath}/assets/${assetRecord.asset_id}`)}
                    className="p-4 hover:bg-slate-50 dark:hover:bg-white/[0.05] cursor-pointer transition-colors group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center">
                        <Laptop className="w-5 h-5 text-slate-500 dark:text-white/50" />
                      </div>
                      <div>
                        <p className="font-display font-bold text-sm text-slate-900 dark:text-white">
                          {asset?.brand} {asset?.model}
                        </p>
                        <p className="font-mono text-[10px] text-slate-500 dark:text-white/50">
                          S/N: {asset?.serial_number}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={assetStatusConfig.variant} size="sm">
                        {assetStatusConfig.label}
                      </Badge>
                      {assetRecord.qcResult && (
                        <span className="font-mono text-[10px] text-slate-500 dark:text-white/50">
                          QC: {assetRecord.qcResult.serialMatch && assetRecord.qcResult.powersOn ? 'Pass' : 'Issues'}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-500 dark:text-white/50 group-hover:text-ecotribe-primary transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Notes */}
          {(request.it_admin_notes || request.logistics_notes) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]"
            >
              <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center gap-3">
                <FileText className="w-5 h-5 text-slate-500 dark:text-white/50" />
                <h2 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">Notes</h2>
              </div>
              <div className="p-5 space-y-4">
                {request.it_admin_notes && (
                  <div>
                    <p className="font-mono text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-1">IT Admin Notes</p>
                    <p className="font-mono text-sm text-slate-500 dark:text-white/50">{request.it_admin_notes}</p>
                  </div>
                )}
                {request.logistics_notes && (
                  <div>
                    <p className="font-mono text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-1">Logistics Notes</p>
                    <p className="font-mono text-sm text-slate-500 dark:text-white/50">{request.logistics_notes}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-5"
          >
            <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide mb-5">Status Timeline</h3>
            <div>
              <TimelineStep
                title="Request Created"
                description="Pickup request submitted"
                timestamp={request.created_at}
                isCompleted={currentIndex >= 0}
                isCurrent={currentIndex === 0}
                isLast={false}
              />
              <TimelineStep
                title="Assigned"
                description="Logistics agent assigned"
                timestamp={request.assigned_at}
                isCompleted={currentIndex >= 1}
                isCurrent={currentIndex === 1}
                isLast={false}
              />
              <TimelineStep
                title="Scheduled"
                description="Pickup date confirmed"
                timestamp={request.scheduled_at}
                isCompleted={currentIndex >= 2}
                isCurrent={currentIndex === 2}
                isLast={false}
              />
              <TimelineStep
                title="In Progress"
                description="Agent at location"
                timestamp={request.started_at}
                isCompleted={currentIndex >= 3}
                isCurrent={currentIndex === 3}
                isLast={false}
              />
              <TimelineStep
                title="Completed"
                description="All devices collected"
                timestamp={request.completed_at}
                isCompleted={currentIndex >= 4}
                isCurrent={currentIndex === 4}
                isLast={true}
              />
            </div>
          </motion.div>

          {/* Branch Details - V3.2: Replaced Location with Branch */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-5"
          >
            <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide mb-4">Branch Details</h3>
            {branch ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Building className="w-4 h-4 text-slate-500 dark:text-white/50 mt-0.5" />
                  <div>
                    <p className="font-mono text-sm text-slate-900 dark:text-white">{branch.branch_name}</p>
                    <p className="font-mono text-xs text-ecotribe-primary">{branch.branch_code}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-slate-500 dark:text-white/50 mt-0.5" />
                  <div>
                    <p className="font-mono text-xs text-slate-500 dark:text-white/50">{branch.address_line1}</p>
                    {branch.address_line2 && (
                      <p className="font-mono text-xs text-slate-500 dark:text-white/50">{branch.address_line2}</p>
                    )}
                    <p className="font-mono text-xs text-slate-500 dark:text-white/50">{branch.city}, {branch.state} {branch.pin_code}</p>
                  </div>
                </div>
                {branch.site_contact_person && (
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-slate-500 dark:text-white/50" />
                    <p className="font-mono text-sm text-slate-500 dark:text-white/50">{branch.site_contact_person}</p>
                  </div>
                )}
                {branch.site_contact_phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-slate-500 dark:text-white/50" />
                    <p className="font-mono text-sm text-slate-500 dark:text-white/50">{branch.site_contact_phone}</p>
                  </div>
                )}
                {branch.operating_hours && (
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-slate-500 dark:text-white/50" />
                    <p className="font-mono text-sm text-slate-500 dark:text-white/50">{branch.operating_hours}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="font-mono text-sm text-slate-500 dark:text-white/50">Branch details not available</p>
            )}
          </motion.div>

          {/* Schedule */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-5"
          >
            <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide mb-4">Schedule</h3>
            <div className="space-y-3">
              <div>
                <p className="font-mono text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-1">
                  {request.confirmed_date ? 'Confirmed Date' : 'Preferred Date'}
                </p>
                <p className="font-mono text-sm text-slate-900 dark:text-white">
                  {format(new Date(request.confirmed_date || request.preferred_date), 'EEEE, dd MMMM yyyy')}
                </p>
              </div>
              <div>
                <p className="font-mono text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-1">Time Slot</p>
                <p className="font-mono text-sm text-slate-900 dark:text-white">
                  {pickupTimeSlotLabels[request.confirmed_time_slot || request.preferred_time_slot]}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Assignment Modal */}
      <AnimatePresence>
        {showAssignModal && isLogisticsAdminRole && (
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
                      {request.logistics_user_id ? 'Reassign Pickup' : 'Assign Pickup'}
                    </h3>
                    <p className="font-mono text-xs text-slate-500 dark:text-white/50 mt-1">
                      {branch?.branch_name || 'Pickup'} {branch?.branch_code ? `(${branch.branch_code})` : ''} · {request.asset_ids?.length || 0} assets
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
                        className="flex items-center gap-1 px-2 py-1 border border-ecotribe-primary/50 text-ecotribe-primary font-mono text-xs uppercase hover:bg-ecotribe-primary/10 transition-colors"
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
                          className="w-full px-3 py-2 border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] text-slate-900 dark:text-white font-display text-sm placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none"
                        />
                        <input
                          type="email"
                          placeholder="Email *"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] text-slate-900 dark:text-white font-display text-sm placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none"
                        />
                        <input
                          type="password"
                          placeholder="Password * (min 8 chars)"
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] text-slate-900 dark:text-white font-display text-sm placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none"
                        />
                        <input
                          type="tel"
                          placeholder="Phone"
                          value={newUserPhone}
                          onChange={(e) => setNewUserPhone(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] text-slate-900 dark:text-white font-display text-sm placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleCreateUser}
                        disabled={!newUserName || !newUserEmail || !newUserPassword || newUserPassword.length < 8 || isCreatingUser}
                        className={`w-full py-2 font-mono font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                          newUserName && newUserEmail && newUserPassword && newUserPassword.length >= 8
                            ? 'bg-ecotribe-primary text-black hover:bg-ecotribe-primary/80'
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
                      {filteredUsers.map(fieldUser => (
                        <motion.div
                          key={fieldUser.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedUser(fieldUser.id)}
                          className={`p-4 border-2 cursor-pointer transition-all ${
                            selectedUser === fieldUser.id
                              ? 'border-ecotribe-primary bg-ecotribe-primary/10'
                              : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-ecotribe-primary/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 border flex items-center justify-center ${
                              selectedUser === fieldUser.id
                                ? 'border-ecotribe-primary bg-ecotribe-primary/20'
                                : 'border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5'
                            }`}>
                              <User className={`w-5 h-5 ${
                                selectedUser === fieldUser.id ? 'text-ecotribe-primary' : 'text-slate-500 dark:text-white/50'
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-display font-bold text-sm uppercase truncate ${
                                selectedUser === fieldUser.id ? 'text-ecotribe-primary' : 'text-slate-900 dark:text-white'
                              }`}>
                                {fieldUser.name || 'Unknown'}
                              </p>
                              <p className="font-mono text-xs text-slate-500 dark:text-white/50 truncate">
                                {fieldUser.phone || fieldUser.email}
                              </p>
                            </div>
                            {selectedUser === fieldUser.id && (
                              <CheckCircle className="w-5 h-5 text-ecotribe-primary flex-shrink-0" />
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    {filteredUsers.length === 0 && (
                      <div className="p-6 border border-amber-400/30 bg-amber-400/10 text-center">
                        <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                        <p className="font-mono text-sm text-amber-400 mb-2">
                          {userSearch ? `No users found matching "${userSearch}"` : 'No field users added yet'}
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowAddUser(true)}
                          className="inline-flex items-center gap-1 px-3 py-2 bg-amber-400/20 border border-amber-400/50 text-amber-400 font-mono text-xs uppercase hover:bg-amber-400/30 transition-colors"
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
                      Leave empty to use preferred date: {request.preferred_date ? new Date(request.preferred_date).toLocaleString() : 'Not set'}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              {!showAddUser && (
                <div className="p-6 border-t border-slate-200 dark:border-white/10 flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className="px-5 py-2.5 bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAssign}
                    disabled={!selectedUser || isLoading}
                    className="px-5 py-2.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    {isLoading
                      ? (request.logistics_user_id ? 'Reassigning...' : 'Assigning...')
                      : (request.logistics_user_id ? 'Reassign Pickup' : 'Assign Pickup')
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

export default PickupRequestDetail;
