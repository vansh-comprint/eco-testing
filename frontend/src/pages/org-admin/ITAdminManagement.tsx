/**
 * IT Admin Management Page - Org Admin Portal
 * V3.2: IT Admins can manage multiple branches (1 IT Admin → Many Branches)
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  UserPlus,
  Upload,
  Search,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Building2,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  Pencil,
  Key,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';
import { useAuth, useITAdmins, useITAdminBranches, useBranches, useUpdateITAdmin, useResetITAdminPassword, useUpdateITAdminStatus, useDashboardStats } from '@/hooks';
import { formatDistanceToNow } from 'date-fns';
import { USER_STATUS_DISPLAY } from '@/lib/status-display';
import { ConfirmationModal } from '@/components/ui';
import { AddITAdminModal } from './AddITAdminModal';

type ITAdminStatus = 'active' | 'inactive';

interface ITAdmin {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: ITAdminStatus;
  created_at: string;
}

interface ITAdminBranchInfo {
  id: string;
  branch_count: number;
  branches?: Array<{
    id: string;
    branch_name: string;
    branch_code: string;
  }>;
}

export function ITAdminManagement() {
  const navigate = useNavigate();
  // V3.2: Use React Query hook for auth
  const { enterprise } = useAuth();
  const enterpriseId = enterprise?.id || '';

  const { data: itAdmins = [], isLoading } = useITAdmins(enterpriseId);
  const { data: itAdminBranches = [] } = useITAdminBranches(enterpriseId);
  const { stats: dashStats } = useDashboardStats();

  const updateITAdmin = useUpdateITAdmin();
  const resetPassword = useResetITAdminPassword();
  const updateStatus = useUpdateITAdminStatus();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | ITAdminStatus>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<ITAdmin | null>(null);
  const [expandedAdminId, setExpandedAdminId] = useState<string | null>(null);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [pendingAdmin, setPendingAdmin] = useState<ITAdmin | null>(null);

  // Create a map of IT admin branch info (keyed by admin id)
  const branchInfoMap = useMemo(() => {
    const map = new Map<string, ITAdminBranchInfo>();
    itAdminBranches.forEach((item: ITAdminBranchInfo) => {
      map.set(item.id, item);
    });
    return map;
  }, [itAdminBranches]);

  // Filter IT Admins
  const filteredAdmins = useMemo(() => {
    let result = [...itAdmins] as ITAdmin[];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        a =>
          a.name?.toLowerCase().includes(query) ||
          a.email?.toLowerCase().includes(query)
      );
    }

    if (statusFilter) {
      result = result.filter(a => a.status === statusFilter);
    }

    return result;
  }, [itAdmins, searchQuery, statusFilter]);

  // Stats - V3.2: Count IT admins without any assigned branches
  const adminsWithoutBranches = (itAdmins as any[]).filter((a: ITAdmin) => {
    const branchInfo = branchInfoMap.get(a.id);
    return !branchInfo || branchInfo.branch_count === 0;
  }).length;

  const stats = {
    total: dashStats.it_admin_total ?? itAdmins.length,
    active: dashStats.it_admin_active ?? (itAdmins as any[]).filter((a: ITAdmin) => a.status === 'active').length,
    inactive: (dashStats.it_admin_total ?? itAdmins.length) - (dashStats.it_admin_active ?? (itAdmins as any[]).filter((a: ITAdmin) => a.status === 'active').length),
    noBranches: adminsWithoutBranches,
  };

  // V3: Use centralized status display
  const getStatusConfig = (status: ITAdminStatus) => {
    const display = USER_STATUS_DISPLAY[status];
    const variantColors: Record<string, string> = {
      default: 'text-slate-500 dark:text-white/50',
      success: 'text-emerald-400',
      warning: 'text-amber-400',
      error: 'text-red-400',
      info: 'text-blue-400',
    };
    const icons: Record<ITAdminStatus, React.ReactNode> = {
      active: <CheckCircle className="w-3 h-3" />,
      inactive: <XCircle className="w-3 h-3" />,
    };
    return {
      label: display?.label || status,
      color: variantColors[display?.variant || 'default'],
      icon: icons[status],
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-lime-500 mx-auto mb-4" />
          <p className="font-display font-bold uppercase tracking-wide text-slate-500 dark:text-white/50">Loading IT Admins...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 border-b border-slate-200 dark:border-white/10 pb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-2">Team</span>
          <h1 className="font-brand font-bold text-3xl md:text-4xl text-slate-900 dark:text-white uppercase tracking-tight">
            IT Admins
          </h1>
          <p className="font-display text-slate-500 dark:text-white/50 text-sm mt-2 uppercase tracking-wide">Manage IT administrators across branches</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-3"
        >
          <button
            onClick={() => navigate('/org-admin/it-admins/upload')}
            className="interactive px-5 py-2.5 bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Bulk Upload
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="interactive px-5 py-2.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add IT Admin
          </button>
        </motion.div>
      </div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-4 border-l border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 shadow-sm shadow-slate-900/[0.03] dark:shadow-none"
      >
        <StatBox label="Total" value={stats.total} icon={<Users className="w-4 h-4" />} />
        <StatBox label="Active" value={stats.active} icon={<CheckCircle className="w-4 h-4" />} />
        <StatBox label="Inactive" value={stats.inactive} icon={<XCircle className="w-4 h-4" />} />
        <StatBox label="No Branches" value={stats.noBranches} icon={<Building2 className="w-4 h-4" />} highlight={stats.noBranches > 0} />
      </motion.div>

      {/* Search & Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-5 shadow-sm shadow-slate-900/[0.03] dark:shadow-none"
      >
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-white/50" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
              />
            </div>
          </div>

          {/* Filter - Status only (V3.2: Branch assignment is done via BranchManagement) */}
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as '' | ITAdminStatus)}
              className="px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs uppercase tracking-widest focus:outline-none focus:border-ecotribe-primary/50 transition-colors appearance-none select-themed cursor-pointer min-w-[140px]"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* IT Admin List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 shadow-sm shadow-slate-900/[0.03] dark:shadow-none"
      >
        {filteredAdmins.length > 0 ? (
          <div className="divide-y divide-slate-200 dark:divide-white/5">
            {filteredAdmins.map((admin, index) => {
              const statusConfig = getStatusConfig(admin.status);
              const branchInfo = branchInfoMap.get(admin.id);
              const branchCount = branchInfo?.branch_count || 0;
              const branchNames = branchInfo?.branches?.map(b => b.branch_name) || [];
              const isExpanded = expandedAdminId === admin.id;

              return (
                <motion.div
                  key={admin.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 * Math.min(index, 10) }}
                  className="p-5 hover:bg-white/70 dark:hover:bg-white/[0.06] transition-colors"
                >
                  <div className="flex items-center gap-5">
                    {/* Avatar */}
                    <div className="w-12 h-12 border border-ecotribe-primary/30 bg-ecotribe-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="font-brand font-bold text-sm text-ecotribe-primary">
                        {admin.name?.split(' ').map(n => n[0]).join('') || 'IT'}
                      </span>
                    </div>

                    {/* Admin Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">{admin.name}</p>
                        <span className={`flex items-center gap-1 font-mono font-bold text-[10px] uppercase tracking-widest ${statusConfig.color}`}>
                          {statusConfig.icon}
                          {statusConfig.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 font-mono text-xs text-slate-500 dark:text-white/50">
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3" />
                          {admin.email}
                        </span>
                        {admin.phone && (
                          <span className="hidden sm:flex items-center gap-1.5">
                            <Phone className="w-3 h-3" />
                            {admin.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Branch Count Badge - V3.2: Shows count instead of single branch */}
                    <div className="hidden sm:block">
                      {branchCount > 0 ? (
                        <button
                          type="button"
                          onClick={() => setExpandedAdminId(isExpanded ? null : admin.id)}
                          className="flex items-center gap-2 px-3 py-1.5 border border-blue-400/20 bg-blue-400/10 font-mono text-xs text-blue-400 uppercase tracking-wide hover:bg-blue-400/20 transition-colors"
                        >
                          <Building2 className="w-3 h-3" />
                          {branchCount} {branchCount === 1 ? 'Branch' : 'Branches'}
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      ) : (
                        <span className="px-3 py-1.5 border border-amber-400/20 bg-amber-400/10 font-mono text-xs text-amber-400 uppercase tracking-wide">
                          No Branches
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAdmin(admin);
                          setIsEditModalOpen(true);
                        }}
                        className="interactive p-2.5 border border-slate-200 dark:border-white/10 hover:border-blue-400/30 hover:bg-blue-400/5 transition-all"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4 text-slate-500 dark:text-white/50 hover:text-blue-400 transition-colors" />
                      </button>
                      {admin.status === 'active' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setPendingAdmin(admin);
                            setShowDeactivateModal(true);
                          }}
                          className="interactive p-2.5 border border-slate-200 dark:border-white/10 hover:border-red-400/30 hover:bg-red-400/5 transition-all"
                          title="Deactivate"
                        >
                          <XCircle className="w-4 h-4 text-slate-500 dark:text-white/50 hover:text-red-400 transition-colors" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => updateStatus.mutate({ userId: admin.id, status: 'active' })}
                          className="interactive p-2.5 border border-slate-200 dark:border-white/10 hover:border-emerald-400/30 hover:bg-emerald-400/5 transition-all"
                          title="Activate"
                        >
                          <CheckCircle className="w-4 h-4 text-slate-500 dark:text-white/50 hover:text-emerald-400 transition-colors" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Branch List - V3.2 */}
                  {isExpanded && branchNames.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 ml-17 pl-4 border-l-2 border-blue-400/30"
                    >
                      <p className="font-mono text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2">
                        Assigned Branches:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {branchNames.map((name, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 font-mono text-xs text-slate-600 dark:text-white/70"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Created At */}
                  <div className="mt-3 ml-17 font-mono text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest">
                    Added {formatDistanceToNow(new Date(admin.created_at), { addSuffix: true })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center">
            <div className="w-16 h-16 border border-slate-200 dark:border-white/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-slate-500 dark:text-white/50" />
            </div>
            <p className="font-display font-bold text-slate-900 dark:text-white uppercase tracking-wide mb-1">No IT Admins found</p>
            <p className="font-mono text-xs text-slate-500 dark:text-white/50 mb-6">
              {searchQuery || statusFilter
                ? 'Try adjusting your filters'
                : 'Add IT Admins to manage your branches'}
            </p>
            {!searchQuery && !statusFilter && (
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => navigate('/org-admin/it-admins/upload')}
                  className="interactive px-5 py-2.5 bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Bulk Upload
                </button>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="interactive px-5 py-2.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Add IT Admin
                </button>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Results count */}
      {filteredAdmins.length > 0 && (
        <p className="font-mono text-xs text-slate-500 dark:text-white/50 text-center uppercase tracking-widest">
          Showing {filteredAdmins.length} of {itAdmins.length} IT Admins
        </p>
      )}

      {/* Add IT Admin Modal — shared component with optional branch selector */}
      <AddITAdminModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => setIsAddModalOpen(false)}
      />

      {/* Edit IT Admin Modal */}
      {editingAdmin && (
        <EditITAdminModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingAdmin(null);
          }}
          admin={editingAdmin}
          enterpriseId={enterpriseId}
          currentBranchIds={branchInfoMap.get(editingAdmin.id)?.branches?.map(b => b.id) || []}
          onSubmit={async (data) => {
            const { newPassword, ...updateData } = data;
            try {
              // Update profile fields (name, email, phone, branch)
              await updateITAdmin.mutateAsync({ userId: editingAdmin.id, data: updateData });
              // Reset password if provided
              if (newPassword) {
                try {
                  await resetPassword.mutateAsync({ userId: editingAdmin.id, newPassword });
                } catch (pwErr: any) {
                  // Profile updated but password failed — tell the user
                  throw new Error(`Profile updated successfully, but password reset failed: ${pwErr?.message || 'Unknown error'}. Please try resetting the password again.`);
                }
              }
              setIsEditModalOpen(false);
              setEditingAdmin(null);
            } catch (err: any) {
              // Re-throw so EditITAdminModal can display the error
              throw err;
            }
          }}
          isLoading={updateITAdmin.isPending || resetPassword.isPending}
        />
      )}

      {/* Deactivate IT Admin Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeactivateModal}
        onClose={() => {
          setShowDeactivateModal(false);
          setPendingAdmin(null);
        }}
        onConfirm={async () => {
          if (pendingAdmin) {
            await updateStatus.mutateAsync({ userId: pendingAdmin.id, status: 'inactive' });
            setShowDeactivateModal(false);
            setPendingAdmin(null);
          }
        }}
        title="Deactivate IT Admin?"
        description={`Are you sure you want to deactivate ${pendingAdmin?.name || 'this IT Admin'}? They will no longer be able to access the portal or manage their assigned branches.`}
        confirmText="Deactivate"
        variant="warning"
        isLoading={updateStatus.isPending}
      />
    </div>
  );
}

function StatBox({
  label,
  value,
  icon,
  highlight = false
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="p-6 border-r border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 shadow-sm shadow-slate-900/[0.02] dark:shadow-none hover:border-lime-500/30 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors group">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-400 uppercase tracking-widest group-hover:text-lime-600 dark:group-hover:text-lime-400 transition-colors">{label}</h4>
        <span className={`${highlight ? 'text-amber-500' : 'text-slate-500 dark:text-zinc-500'} group-hover:text-lime-600 dark:group-hover:text-lime-400 transition-colors`}>{icon}</span>
      </div>
      <div className={`font-brand font-bold text-3xl ${highlight ? 'text-amber-500' : 'text-slate-900 dark:text-white'}`}>{value}</div>
    </div>
  );
}

// Edit IT Admin Modal
function EditITAdminModal({
  isOpen,
  onClose,
  admin,
  enterpriseId,
  currentBranchIds,
  onSubmit,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  admin: ITAdmin;
  enterpriseId: string;
  currentBranchIds: string[];
  onSubmit: (data: { name?: string; email?: string; phone?: string; branch_id?: string; newPassword?: string }) => Promise<void>;
  isLoading: boolean;
}) {
  const { data: branches = [] } = useBranches(enterpriseId);
  const [formData, setFormData] = useState({
    name: admin.name || '',
    email: admin.email || '',
    phone: admin.phone || '',
    branch_id: currentBranchIds[0] || '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Password reset state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Reset form when admin changes
  useState(() => {
    setFormData({
      name: admin.name || '',
      email: admin.email || '',
      phone: admin.phone || '',
      branch_id: currentBranchIds[0] || '',
    });
  });

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Enter a valid email address';
    }
    if (formData.phone) {
      const cleaned = formData.phone.replace(/\D/g, '');
      if (cleaned.length !== 10 || !/^[6-9]\d{9}$/.test(cleaned)) {
        errors.phone = 'Enter a valid 10-digit mobile number';
      }
    }
    // Password validation (only if user wants to change password)
    if (showPasswordSection && newPassword) {
      if (newPassword.length < 8) {
        errors.newPassword = 'Password must be at least 8 characters';
      } else if (!/[a-zA-Z]/.test(newPassword)) {
        errors.newPassword = 'Password must contain at least one letter';
      } else if (!/[0-9]/.test(newPassword)) {
        errors.newPassword = 'Password must contain at least one number';
      } else if (!/[^a-zA-Z0-9]/.test(newPassword)) {
        errors.newPassword = 'Password must contain at least one special character';
      }
      if (newPassword !== confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitError(null);

    const submitData: Record<string, any> = {
      name: formData.name,
      phone: formData.phone || undefined,
      branch_id: formData.branch_id || null,
    };

    // Only include email if it changed
    if (formData.email !== admin.email) {
      submitData.email = formData.email;
    }

    // Include password if set
    if (showPasswordSection && newPassword) {
      submitData.newPassword = newPassword;
    }

    try {
      await onSubmit(submitData);
      setFormErrors({});
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to update IT Admin. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-zinc-800">
          <h2 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide">Edit IT Admin</h2>
          <button type="button" onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
            <X className="w-5 h-5 text-slate-500 dark:text-white/50" />
          </button>
        </div>

        <form onSubmit={handleSubmit} onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
            e.preventDefault();
          }
        }} className="p-5 space-y-4">
          {submitError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm font-mono">
              {submitError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-slate-900 dark:text-white">Full Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => { setFormData(prev => ({ ...prev, name: e.target.value.replace(/[^a-zA-Z\s'.\-]/g, '') })); setFormErrors(prev => ({ ...prev, name: '' })); }}
              className={`w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-900 border text-slate-900 dark:text-white text-sm focus:outline-none focus:border-lime-500/50 ${formErrors.name ? 'border-red-500' : 'border-slate-200 dark:border-zinc-800'}`}
            />
            {formErrors.name && <p className="mt-1 text-xs text-red-500 font-mono">{formErrors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-slate-900 dark:text-white">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => { setFormData(prev => ({ ...prev, email: e.target.value })); setFormErrors(prev => ({ ...prev, email: '' })); }}
              className={`w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-900 border text-slate-900 dark:text-white text-sm focus:outline-none focus:border-lime-500/50 ${formErrors.email ? 'border-red-500' : 'border-slate-200 dark:border-zinc-800'}`}
            />
            {formErrors.email && <p className="mt-1 text-xs text-red-500 font-mono">{formErrors.email}</p>}
            {formData.email !== admin.email && (
              <p className="mt-1 text-xs text-amber-500 font-mono flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Email will be updated — the admin will need to use the new email to log in.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-slate-900 dark:text-white">Phone Number</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => { setFormData(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })); setFormErrors(prev => ({ ...prev, phone: '' })); }}
              inputMode="numeric"
              maxLength={10}
              placeholder="9876543210"
              className={`w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-900 border text-slate-900 dark:text-white text-sm focus:outline-none focus:border-lime-500/50 ${formErrors.phone ? 'border-red-500' : 'border-slate-200 dark:border-zinc-800'}`}
            />
            {formErrors.phone && <p className="mt-1 text-xs text-red-500 font-mono">{formErrors.phone}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-slate-900 dark:text-white">
              Primary Branch
            </label>
            <select
              value={formData.branch_id}
              onChange={(e) => setFormData(prev => ({ ...prev, branch_id: e.target.value }))}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-lime-500/50 appearance-none select-themed cursor-pointer"
            >
              <option value="">No branch assigned</option>
              {branches.map((branch: any) => (
                <option key={branch.id} value={branch.id}>
                  {branch.branch_name} {branch.branch_code ? `(${branch.branch_code})` : ''}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400 dark:text-white/30 font-mono">
              Additional branches can be managed via Branch Management.
            </p>
          </div>

          {/* Password Reset Section */}
          <div className="border-t border-slate-200 dark:border-zinc-800 pt-4">
            {!showPasswordSection ? (
              <button
                type="button"
                onClick={() => setShowPasswordSection(true)}
                className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                <Key className="w-4 h-4" />
                Reset Password
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-500" />
                    Reset Password
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordSection(false);
                      setNewPassword('');
                      setConfirmPassword('');
                      setFormErrors(prev => { const { newPassword: _, confirmPassword: __, ...rest } = prev; return rest; });
                    }}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-600 dark:text-zinc-400">New Password *</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setFormErrors(prev => ({ ...prev, newPassword: '' })); }}
                      placeholder="Min 8 chars, letter + number + special"
                      className={`w-full px-3 py-2 pr-10 bg-slate-50 dark:bg-zinc-900 border text-slate-900 dark:text-white text-sm focus:outline-none focus:border-lime-500/50 ${formErrors.newPassword ? 'border-red-500' : 'border-slate-200 dark:border-zinc-800'}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {formErrors.newPassword && <p className="mt-1 text-xs text-red-500 font-mono">{formErrors.newPassword}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-600 dark:text-zinc-400">Confirm Password *</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setFormErrors(prev => ({ ...prev, confirmPassword: '' })); }}
                      placeholder="Re-enter new password"
                      className={`w-full px-3 py-2 pr-10 bg-slate-50 dark:bg-zinc-900 border text-slate-900 dark:text-white text-sm focus:outline-none focus:border-lime-500/50 ${formErrors.confirmPassword ? 'border-red-500' : 'border-slate-200 dark:border-zinc-800'}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {formErrors.confirmPassword && <p className="mt-1 text-xs text-red-500 font-mono">{formErrors.confirmPassword}</p>}
                </div>

                <p className="text-xs text-amber-500 dark:text-amber-400 font-mono flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  This will immediately change the admin's password and invalidate their active sessions.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-lime-500 hover:bg-lime-400 disabled:opacity-50 text-black font-semibold text-sm uppercase tracking-wider transition-all"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default ITAdminManagement;
