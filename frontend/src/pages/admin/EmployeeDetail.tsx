import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building2,
  Laptop,
  CheckCircle,
  Clock,
  XCircle,
  Edit,
  Save,
  X,
  Trash2,
  Send,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useAuth, useSubUsers, useUpdateSubUser, useDeleteSubUser, useAssets, useUnassignAsset, useSendSubUserInvitation, useApiError } from '@/hooks';
import { format, formatDistanceToNow } from 'date-fns';

const DEPARTMENT_OPTIONS = [
  'Engineering',
  'Marketing',
  'HR',
  'Finance',
  'Operations',
  'Sales',
  'IT',
  'Legal',
  'Other',
];

type SubUserStatus = 'active' | 'pending' | 'inactive';

export function EmployeeDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { subUserId } = useParams<{ subUserId: string }>();

  // V3: Use React Query hook for auth
  const { user, enterprise } = useAuth();

  // V3.2: Detect if we're in Org Admin context
  const isOrgAdmin = user?.role === 'org_admin' || location.pathname.startsWith('/org-admin');
  const basePath = isOrgAdmin ? '/org-admin' : '/admin';
  const enterpriseId = enterprise?.id || '';

  // V3: React Query hooks
  const { data: subUsers = [], isLoading: subUsersLoading } = useSubUsers(enterpriseId);
  const { data: assets = [], isLoading: assetsLoading } = useAssets(enterpriseId);
  const updateSubUserMutation = useUpdateSubUser();
  const deleteSubUserMutation = useDeleteSubUser();
  const unassignAssetMutation = useUnassignAsset();
  const sendInvitationMutation = useSendSubUserInvitation();
  const { showSuccess, handleError } = useApiError();

  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    customDepartment: '',
    status: 'active' as 'active' | 'pending_invite' | 'inactive',
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // V3: Find sub user from list
  const subUser = subUsers.find(s => s.id === subUserId);

  // Initialize edit form when entering edit mode
  useEffect(() => {
    if (subUser && isEditing) {
      const isCustomDept = subUser.department && !DEPARTMENT_OPTIONS.includes(subUser.department);
      setEditForm({
        name: subUser.name || '',
        email: subUser.email || '',
        phone: subUser.phone || '',
        department: isCustomDept ? 'Other' : (subUser.department || ''),
        customDepartment: isCustomDept ? subUser.department : '',
        status: (subUser.status as 'active' | 'pending_invite' | 'inactive') || 'active',
      });
      setEditErrors({});
    }
  }, [subUser, isEditing]);

  // V3: Calculate assigned assets for this sub-user (use snake_case)
  const userAssets = useMemo(() => {
    if (!subUser) return [];
    return assets.filter(a => a.assigned_to_user_id === subUser.id);
  }, [assets, subUser]);

  const assignedAssets = userAssets.length;
  const submittedAssets = userAssets.filter(
    a => ['submitted', 'remote_review', 'conditionally_accepted', 'final_accepted', 'completed'].includes(a.status)
  ).length;
  const pendingAssets = userAssets.filter(
    a => ['assigned', 'check_in_started'].includes(a.status)
  ).length;

  // Determine status (V3: use snake_case)
  const getStatus = (): SubUserStatus => {
    if (!subUser) return 'inactive';
    if (!subUser.token || (subUser.token_expires_at && new Date(subUser.token_expires_at) < new Date())) {
      return 'inactive';
    }
    if (assignedAssets === 0) {
      return 'pending';
    }
    return 'active';
  };

  const status = getStatus();

  const getStatusConfig = (s: SubUserStatus) => {
    const configs: Record<SubUserStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
      active: { label: 'Active', color: 'text-emerald-400', bgColor: 'bg-emerald-400/10 border-emerald-400/30', icon: <CheckCircle className="w-4 h-4" /> },
      pending: { label: 'Pending', color: 'text-amber-400', bgColor: 'bg-amber-400/10 border-amber-400/30', icon: <Clock className="w-4 h-4" /> },
      inactive: { label: 'Inactive', color: 'text-slate-500 dark:text-white/50', bgColor: 'bg-zinc-500/10 border-zinc-500/30', icon: <XCircle className="w-4 h-4" /> },
    };
    return configs[s];
  };

  const statusConfig = getStatusConfig(status);

  // Validate edit form
  const validateEditForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Name validation
    if (!editForm.name.trim()) {
      errors.name = 'Name is required';
    } else if (!/^[a-zA-Z\s]+$/.test(editForm.name.trim())) {
      errors.name = 'Name must contain only letters';
    }

    // Email validation
    if (!editForm.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) {
      errors.email = 'Invalid email format';
    }

    // Phone validation (required)
    if (!editForm.phone.trim()) {
      errors.phone = 'Phone is required';
    } else {
      const phoneDigits = editForm.phone.replace(/\D/g, '');
      if (phoneDigits.length !== 10) {
        errors.phone = 'Phone must be 10 digits';
      } else if (!/^[6-9]/.test(phoneDigits)) {
        errors.phone = 'Invalid Indian mobile number';
      }
    }

    // Custom department validation
    if (editForm.department === 'Other' && !editForm.customDepartment.trim()) {
      errors.customDepartment = 'Please specify the department';
    }

    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle save (V3: use mutation with snake_case)
  const handleSave = async () => {
    if (!subUser) return;
    if (!validateEditForm()) return;

    try {
      const finalDepartment = editForm.department === 'Other' 
        ? editForm.customDepartment.trim() 
        : editForm.department;

      await updateSubUserMutation.mutateAsync({
        subUserId: subUser.id,
        updates: {
          name: editForm.name.trim(),
          email: editForm.email.trim().toLowerCase(),
          phone: editForm.phone.replace(/\D/g, ''),
          department: finalDepartment || undefined,
          status: editForm.status,
        },
      });
      setIsEditing(false);
      setEditErrors({});
    } catch (error) {
      console.error('Failed to update sub-user:', error);
    }
  };

  // Handle resend invite
  const handleResendInvite = async () => {
    if (!subUser) return;
    setIsResending(true);
    try {
      await sendInvitationMutation.mutateAsync(subUser.id);
      showSuccess('Invitation Sent', `Invitation resent to ${subUser.email}`);
    } catch (error) {
      handleError(error, 'Resending invitation');
    } finally {
      setIsResending(false);
    }
  };

  // Handle delete with cascade unassign
  const handleDelete = async () => {
    if (!subUser) return;
    setIsDeleting(true);
    try {
      // First unassign all assets from this sub-user
      for (const asset of userAssets) {
        await unassignAssetMutation.mutateAsync(asset.id);
      }
      // Then delete the sub-user
      await deleteSubUserMutation.mutateAsync(subUser.id);
      navigate(`${basePath}/employees`);
    } catch (error) {
      console.error('Failed to delete sub-user:', error);
      setIsDeleting(false);
    }
  };

  // Loading state
  if (subUsersLoading || assetsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-ecotribe-primary mx-auto mb-4" />
          <p className="font-display font-bold uppercase tracking-wide text-slate-500 dark:text-white/50">Loading...</p>
        </div>
      </div>
    );
  }

  if (!subUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
        <User className="w-12 h-12 text-slate-500 dark:text-white/50 mb-4" />
        <p className="font-display font-bold text-slate-500 dark:text-white/50 uppercase tracking-wide mb-1">Employee not found</p>
        <p className="font-mono text-xs text-slate-500 dark:text-white/50 mb-6">The employee you're looking for doesn't exist</p>
        <button
          onClick={() => navigate(`${basePath}/employees`)}
          className="interactive px-5 py-2.5 bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Employees
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={() => navigate(`${basePath}/employees`)}
            className="interactive flex items-center gap-2 text-slate-500 dark:text-white/50 hover:text-ecotribe-primary transition-colors font-mono text-xs uppercase tracking-widest mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Employees
          </button>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 border border-ecotribe-primary/30 bg-ecotribe-primary/10 flex items-center justify-center">
                <span className="font-brand font-bold text-xl text-ecotribe-primary">
                  {(subUser.name || subUser.email).split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-1">Employee</span>
                <h1 className="font-brand font-bold text-2xl md:text-3xl text-slate-900 dark:text-white uppercase tracking-tight">
                  {subUser.name || subUser.email.split('@')[0]}
                </h1>
                <p className="font-mono text-sm text-slate-500 dark:text-white/50 mt-1">{subUser.email}</p>
              </div>
            </div>

            <div className="flex gap-3">
              {!isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="interactive px-5 py-2.5 bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="interactive px-5 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 font-mono font-bold text-xs uppercase tracking-widest hover:bg-red-500/20 transition-all flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="interactive px-5 py-2.5 bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="interactive px-5 py-2.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Status Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`border ${statusConfig.bgColor} p-6 flex items-center gap-4`}
      >
        <div className={statusConfig.color}>{statusConfig.icon}</div>
        <div>
          <p className={`font-display font-bold text-sm uppercase tracking-wide ${statusConfig.color}`}>
            {statusConfig.label}
          </p>
          <p className="font-mono text-xs text-slate-500 dark:text-white/50">
            {status === 'active' && 'User is active and has assigned assets'}
            {status === 'pending' && 'User invited but no assets assigned yet'}
            {status === 'inactive' && 'Invite token expired or not set'}
          </p>
        </div>
        {(status === 'inactive' || status === 'pending') && (
          <button 
            onClick={handleResendInvite}
            disabled={isResending}
            className="ml-auto interactive px-4 py-2 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isResending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {isResending ? 'Sending...' : 'Resend Invite'}
          </button>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - User Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]"
          >
            <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center gap-3">
              <User className="w-5 h-5 text-ecotribe-primary" />
              <h2 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide">Contact Information</h2>
            </div>
            <div className="p-6 space-y-6">
              {isEditing ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2 block">
                        Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-white/[0.02] border ${editErrors.name ? 'border-red-400' : 'border-slate-200 dark:border-white/10'} text-slate-900 dark:text-white font-display text-sm focus:outline-none focus:border-ecotribe-primary/50`}
                        placeholder="Full name"
                      />
                      {editErrors.name && <p className="mt-1 font-mono text-xs text-red-400">{editErrors.name}</p>}
                    </div>
                    <div>
                      <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2 block">
                        Email <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                        className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-white/[0.02] border ${editErrors.email ? 'border-red-400' : 'border-slate-200 dark:border-white/10'} text-slate-900 dark:text-white font-display text-sm focus:outline-none focus:border-ecotribe-primary/50`}
                        placeholder="email@example.com"
                      />
                      {editErrors.email && <p className="mt-1 font-mono text-xs text-red-400">{editErrors.email}</p>}
                    </div>
                    <div>
                      <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2 block">
                        Phone <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                        className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-white/[0.02] border ${editErrors.phone ? 'border-red-400' : 'border-slate-200 dark:border-white/10'} text-slate-900 dark:text-white font-display text-sm focus:outline-none focus:border-ecotribe-primary/50`}
                        placeholder="9876543210"
                        maxLength={10}
                      />
                      {editErrors.phone && <p className="mt-1 font-mono text-xs text-red-400">{editErrors.phone}</p>}
                    </div>
                    <div>
                      <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2 block">Department</label>
                      <select
                        value={editForm.department}
                        onChange={(e) => {
                          setEditForm(prev => ({ 
                            ...prev, 
                            department: e.target.value,
                            customDepartment: e.target.value !== 'Other' ? '' : prev.customDepartment
                          }));
                        }}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-display text-sm focus:outline-none focus:border-ecotribe-primary/50 appearance-none select-themed cursor-pointer"
                      >
                        <option value="" className="bg-white dark:bg-[#0a0a0a]">Select department...</option>
                        {DEPARTMENT_OPTIONS.map(dept => (
                          <option key={dept} value={dept} className="bg-white dark:bg-[#0a0a0a]">{dept}</option>
                        ))}
                      </select>
                    </div>
                    {editForm.department === 'Other' && (
                      <div>
                        <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2 block">
                          Specify Department <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={editForm.customDepartment}
                          onChange={(e) => setEditForm(prev => ({ ...prev, customDepartment: e.target.value }))}
                          className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-white/[0.02] border ${editErrors.customDepartment ? 'border-red-400' : 'border-slate-200 dark:border-white/10'} text-slate-900 dark:text-white font-display text-sm focus:outline-none focus:border-ecotribe-primary/50`}
                          placeholder="e.g., Research & Development"
                        />
                        {editErrors.customDepartment && <p className="mt-1 font-mono text-xs text-red-400">{editErrors.customDepartment}</p>}
                      </div>
                    )}
                    <div>
                      <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2 block">Status</label>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value as 'active' | 'pending_invite' | 'inactive' }))}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-display text-sm focus:outline-none focus:border-ecotribe-primary/50 appearance-none select-themed cursor-pointer"
                      >
                        <option value="active" className="bg-white dark:bg-[#0a0a0a]">Active</option>
                        <option value="pending_invite" className="bg-white dark:bg-[#0a0a0a]">Pending Invite</option>
                        <option value="inactive" className="bg-white dark:bg-[#0a0a0a]">Inactive</option>
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InfoRow icon={<User className="w-4 h-4" />} label="Name" value={subUser.name || '—'} />
                  <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={subUser.email} />
                  <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone" value={subUser.phone || '—'} />
                  <InfoRow icon={<Building2 className="w-4 h-4" />} label="Department" value={subUser.department || 'Unassigned'} />
                </div>
              )}
            </div>
          </motion.div>

          {/* Assigned Assets */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]"
          >
            <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Laptop className="w-5 h-5 text-slate-500 dark:text-white/50" />
                <h2 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide">Assigned Assets</h2>
              </div>
              <span className="font-mono font-bold text-sm text-slate-500 dark:text-white/50">{assignedAssets} total</span>
            </div>
            {userAssets.length > 0 ? (
              <div className="divide-y divide-slate-200 dark:divide-white/5">
                {userAssets.slice(0, 5).map((asset) => (
                  <div
                    key={asset.id}
                    onClick={() => navigate(`${basePath}/assets/${asset.id}`)}
                    className="p-5 hover:bg-slate-100 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase">{asset.brand} {asset.model}</p>
                        <p className="font-mono text-xs text-slate-500 dark:text-white/50">{asset.serial_number}</p>
                      </div>
                      <span className={`px-2 py-1 border text-[10px] font-mono uppercase tracking-widest ${
                        ['submitted', 'remote_review', 'conditionally_accepted', 'final_accepted', 'completed'].includes(asset.status)
                          ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400'
                          : 'border-amber-400/30 bg-amber-400/10 text-amber-400'
                      }`}>
                        {asset.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                ))}
                {userAssets.length > 5 && (
                  <div className="p-4 text-center">
                    <button
                      onClick={() => navigate(`${basePath}/assets?assignee=${subUser.id}`)}
                      className="font-mono text-xs text-ecotribe-primary hover:underline uppercase tracking-widest"
                    >
                      View all {userAssets.length} assets
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center">
                <Laptop className="w-8 h-8 text-slate-500 dark:text-white/50 mx-auto mb-3" />
                <p className="font-display text-slate-500 dark:text-white/50 text-sm mb-2">No assets assigned</p>
                <button
                  onClick={() => navigate(`${basePath}/assets`)}
                  className="font-mono text-xs text-ecotribe-primary hover:underline uppercase tracking-widest"
                >
                  Assign Assets
                </button>
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Column - Stats & Meta */}
        <div className="space-y-6">
          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]"
          >
            <div className="p-6 border-b border-slate-200 dark:border-white/10">
              <h2 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide">Statistics</h2>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-white/5">
              <StatRow label="Assigned Assets" value={assignedAssets} />
              <StatRow label="Submitted" value={submittedAssets} highlight />
              <StatRow label="Pending Check-in" value={pendingAssets} warning={pendingAssets > 0} />
            </div>
          </motion.div>

          {/* Quick Info (V3: use snake_case) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-6"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest">Invited</span>
                <span className="font-display text-sm text-slate-500 dark:text-white/50">
                  {subUser.created_at ? format(new Date(subUser.created_at), 'MMM d, yyyy') : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest">Token Expires</span>
                <span className="font-display text-sm text-slate-500 dark:text-white/50">
                  {subUser.token_expires_at ? formatDistanceToNow(new Date(subUser.token_expires_at), { addSuffix: true }) : '—'}
                </span>
              </div>
{/* User ID hidden for cleaner UX - available in database if needed */}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md border border-red-500/30 bg-white dark:bg-[#0a0a0a]"
          >
            <div className="p-6 border-b border-red-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 border border-red-500/30 bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide">Delete Employee</h3>
              </div>
            </div>
            <div className="p-6">
              <p className="font-display text-sm text-slate-500 dark:text-white/50 mb-4">
                Are you sure you want to delete <span className="text-slate-900 dark:text-white font-bold">{subUser.name || subUser.email}</span>?
              </p>
              <p className="font-mono text-xs text-slate-500 dark:text-white/50 mb-4">
                This will remove the user from your organization. Any assigned assets will become unassigned.
              </p>
              {assignedAssets > 0 && (
                <div className="p-3 border border-amber-500/20 bg-amber-500/5 mb-4">
                  <p className="font-mono text-xs text-amber-400">
                    Warning: This user has {assignedAssets} assigned asset{assignedAssets > 1 ? 's' : ''}.
                  </p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-white/10 flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-5 py-2.5 bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 bg-red-500 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-red-400 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] flex items-center justify-center text-slate-500 dark:text-white/50">
        {icon}
      </div>
      <div>
        <p className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest">{label}</p>
        <p className="font-display text-sm text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function StatRow({ label, value, highlight, warning }: { label: string; value: number; highlight?: boolean; warning?: boolean }) {
  return (
    <div className="p-5 flex items-center justify-between">
      <span className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest">{label}</span>
      <span className={`font-brand font-bold text-2xl ${
        highlight ? 'text-ecotribe-primary' : warning ? 'text-amber-400' : 'text-slate-900 dark:text-white'
      }`}>
        {value}
      </span>
    </div>
  );
}

export default EmployeeDetail;
