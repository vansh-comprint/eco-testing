import { useState, useMemo, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  UserPlus,
  Upload,
  Search,
  Mail,
  Phone,
  CheckCircle,
  Clock,
  XCircle,
  Laptop,
  Send,
  Loader2,
  UserX,
  UserCheck,
  Building2,
  ChevronRight,
} from 'lucide-react';
import { useAuth, useInfiniteSubUsers, useAssets, useAssetsByITAdmin, useSendSubUserInvitation, useApiError, useDebounce, useBranchesByITAdmin, useEmployeeBasePath } from '@/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { subUsersApi } from '@/lib/api/sub-users';
import { subUserKeys } from '@/hooks/useEmployees';
import { InfiniteScrollTrigger, InfiniteScrollInfo, ConfirmationModal, DeactivationPreviewModal } from '@/components/ui';
import { ITAdminBranchContext } from '@/contexts/ITAdminBranchContext';
import { useOrgBranchSafe } from '@/contexts/OrgBranchContext';

type SubUserStatus = 'active' | 'pending_invite' | 'inactive';

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

const DEPARTMENT_OPTIONS = [
  { label: 'All Departments', value: '' },
  { label: 'Engineering', value: 'Engineering' },
  { label: 'Marketing', value: 'Marketing' },
  { label: 'HR', value: 'HR' },
  { label: 'Finance', value: 'Finance' },
  { label: 'Operations', value: 'Operations' },
];

export function EmployeeList() {
  const navigate = useNavigate();
  const location = useLocation();
  // V3: Use React Query hook for auth
  const { user } = useAuth();
  const { enterpriseId, basePath, isEnterpriseNested } = useEmployeeBasePath();
  const userId = user?.id || '';

  const itBranchCtx = useContext(ITAdminBranchContext);
  const orgBranchCtx = useOrgBranchSafe();
  const activeBranchFilter = itBranchCtx?.selectedBranchId || orgBranchCtx?.selectedBranchId || null;

  // Determine if org admin context (true for org_admin role, org-admin portal, or enterprise-nested super/ops routes)
  const isOrgAdmin = user?.role === 'org_admin' || location.pathname.startsWith('/org-admin') || isEnterpriseNested;

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 350);
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  // V3.2: React Query hooks - server-side search/filter
  const apiParams = useMemo(() => {
    const params: Record<string, string | undefined> = { enterprise_id: enterpriseId };
    if (activeBranchFilter) params.branch_id = activeBranchFilter;
    if (debouncedSearch) params.search = debouncedSearch;
    if (statusFilter) params.status = statusFilter;
    return params;
  }, [enterpriseId, activeBranchFilter, debouncedSearch, statusFilter]);

  const { data: subUserPages, isLoading: subUsersLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteSubUsers(apiParams);
  const subUsers = useMemo(() => subUserPages?.pages.flatMap(p => p.data || []) ?? [], [subUserPages]);
  const totalSubUsers = subUserPages?.pages[0]?.pagination?.total;

  const { data: orgAssets = [], isLoading: orgAssetsLoading } = useAssets(isOrgAdmin ? enterpriseId : '');
  const { data: itAssets = [], isLoading: itAssetsLoading } = useAssetsByITAdmin(isOrgAdmin ? '' : userId);

  const assets = isOrgAdmin ? orgAssets : itAssets;
  const assetsLoading = isOrgAdmin ? orgAssetsLoading : itAssetsLoading;

  // Branch data for IT Admin — show branch badge when managing multiple branches
  const { data: itAdminBranches = [] } = useBranchesByITAdmin(!isOrgAdmin ? userId : '');
  const showBranchBadge = !isOrgAdmin && itAdminBranches.length > 1;
  const branchMap = useMemo(() => {
    const map = new Map<string, string>();
    itAdminBranches.forEach((b: any) => map.set(b.id, b.branch_name || b.name || ''));
    return map;
  }, [itAdminBranches]);
  const [resendingIds, setResendingIds] = useState<Set<string>>(new Set());
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  // Deactivation: use preview modal (active → inactive)
  const [pendingDeactivate, setPendingDeactivate] = useState<{ userId: string; userName: string } | null>(null);
  // Activation: use simple confirmation modal (inactive → active)
  const [pendingActivate, setPendingActivate] = useState<{ userId: string; userName: string } | null>(null);

  const queryClient = useQueryClient();
  const sendInvitationMutation = useSendSubUserInvitation();
  const { showSuccess, handleError } = useApiError();

  const requestToggleStatus = (userId: string, currentStatus: SubUserStatus, userName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentStatus === 'active') {
      setPendingDeactivate({ userId, userName });
    } else {
      setPendingActivate({ userId, userName });
    }
  };

  const executeStatusChange = async (userId: string, newStatus: 'active' | 'inactive') => {
    setTogglingIds(prev => new Set(prev).add(userId));
    try {
      await subUsersApi.update(userId, { status: newStatus });
      queryClient.invalidateQueries({ queryKey: subUserKeys.all });
      showSuccess(
        newStatus === 'active' ? 'Employee Activated' : 'Employee Deactivated',
        newStatus === 'active' ? 'Employee is now active.' : 'Employee has been deactivated.'
      );
    } catch (error) {
      handleError(error, 'Updating employee status');
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const confirmDeactivate = async () => {
    if (!pendingDeactivate) return;
    const { userId } = pendingDeactivate;
    setPendingDeactivate(null);
    await executeStatusChange(userId, 'inactive');
  };

  const confirmActivate = async () => {
    if (!pendingActivate) return;
    const { userId } = pendingActivate;
    setPendingActivate(null);
    await executeStatusChange(userId, 'active');
  };

  const handleResendInvite = async (userId: string, email: string) => {
    setResendingIds(prev => new Set(prev).add(userId));
    try {
      await sendInvitationMutation.mutateAsync(userId);
      showSuccess('Invitation Sent', `Invitation resent to ${email}`);
    } catch (error) {
      handleError(error, 'Resending invitation');
    } finally {
      setResendingIds(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  // Get sub-users with computed stats (data already filtered by enterprise from React Query)
  const enterpriseSubUsers = useMemo(() => {
    return subUsers.map(s => {
      // V3: Use snake_case from database
      const assignedAssets = assets.filter(a => a.assigned_to_user_id === s.id).length;
      const submittedAssets = assets.filter(
        a => a.assigned_to_user_id === s.id && ['submitted', 'remote_review', 'conditionally_accepted', 'final_accepted', 'completed'].includes(a.status)
      ).length;

      // Use database status directly
      const status = s.status as SubUserStatus;

      return {
        id: s.id,
        name: s.name || s.email.split('@')[0],
        email: s.email,
        phone: s.phone || '',
        department: s.department || 'Unassigned',
        branch_id: s.branch_id || null,
        status,
        assignedAssets,
        submittedAssets,
        invitedAt: s.created_at,
        lastActive: null as Date | null, // TODO: track last active
      };
    });
  }, [subUsers, assets]);

  // Filter sub-users (search/status/branch are now server-side, only department remains client-side)
  const filteredUsers = useMemo(() => {
    let result = [...enterpriseSubUsers];

    if (departmentFilter) {
      result = result.filter(u => u.department === departmentFilter);
    }

    return result;
  }, [enterpriseSubUsers, departmentFilter]);

  // Stats - use branch-scoped data
  const scopedUsers = useMemo(() => {
    if (activeBranchFilter) return enterpriseSubUsers.filter(u => u.branch_id === activeBranchFilter);
    return enterpriseSubUsers;
  }, [enterpriseSubUsers, activeBranchFilter]);

  const stats = {
    total: scopedUsers.length,
    active: scopedUsers.filter(u => u.status === 'active').length,
    pending: scopedUsers.filter(u => u.status === 'pending_invite').length,
    totalAssigned: scopedUsers.reduce((sum, u) => sum + u.assignedAssets, 0),
  };

  const getStatusConfig = (status: SubUserStatus) => {
    const configs: Record<SubUserStatus, { label: string; color: string; icon: React.ReactNode }> = {
      active: { label: 'Active', color: 'text-emerald-400', icon: <CheckCircle className="w-3 h-3" /> },
      pending_invite: { label: 'Pending', color: 'text-amber-400', icon: <Clock className="w-3 h-3" /> },
      inactive: { label: 'Inactive', color: 'text-slate-500 dark:text-white/50', icon: <XCircle className="w-3 h-3" /> },
    };
    return configs[status] || configs.inactive;
  };

  // Loading state
  if (subUsersLoading || assetsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-ecotribe-primary mx-auto mb-4" />
          <p className="font-display font-bold uppercase tracking-wide text-slate-500 dark:text-white/50">Loading employees...</p>
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
            Employees
          </h1>
          <p className="font-display text-slate-500 dark:text-white/50 text-sm mt-2 uppercase tracking-wide">Manage employees who check-in devices</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-3"
        >
          <button
            onClick={() => navigate(`${basePath}/employees/upload`)}
            className="interactive px-5 py-2.5 bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Bulk Upload
          </button>
          <button
            onClick={() => navigate(`${basePath}/employees/invite`)}
            className="interactive px-5 py-2.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Invite User
          </button>
        </motion.div>
      </div>

      {/* Stats Grid - Protocol Style */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-4 border-l border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 shadow-sm shadow-slate-900/[0.03] dark:shadow-none"
      >
        <StatBox label="Total Users" value={stats.total} icon={<Users className="w-4 h-4" />} />
        <StatBox label="Active" value={stats.active} icon={<CheckCircle className="w-4 h-4" />} />
        <StatBox label="Pending Invite" value={stats.pending} icon={<Clock className="w-4 h-4" />} highlight={stats.pending > 0} />
        <StatBox label="Assets Assigned" value={stats.totalAssigned} icon={<Laptop className="w-4 h-4" />} />
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
                placeholder="Search by name, email, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs uppercase tracking-widest focus:outline-none focus:border-ecotribe-primary/50 transition-colors appearance-none select-themed cursor-pointer w-full sm:w-auto sm:min-w-[140px]"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-white dark:bg-[#0a0a0a]">{opt.label}</option>
              ))}
            </select>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs uppercase tracking-widest focus:outline-none focus:border-ecotribe-primary/50 transition-colors appearance-none select-themed cursor-pointer w-full sm:w-auto sm:min-w-[160px]"
            >
              {DEPARTMENT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-white dark:bg-[#0a0a0a]">{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {/* User List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 shadow-sm shadow-slate-900/[0.03] dark:shadow-none"
      >
        {filteredUsers.length > 0 ? (
          <div className="divide-y divide-slate-200 dark:divide-white/5">
            {filteredUsers.map((user, index) => {
              const statusConfig = getStatusConfig(user.status);

              return (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 * Math.min(index, 10) }}
                  onClick={() => navigate(`${basePath}/employees/${user.id}`)}
                  className="p-4 grid grid-cols-[auto_1fr_70px_70px_120px_auto_20px] items-center gap-4 hover:bg-white/70 dark:hover:bg-white/[0.06] transition-colors cursor-pointer group"
                >
                  {/* Avatar */}
                  <div className="w-11 h-11 border border-ecotribe-primary/30 bg-ecotribe-primary/10 flex items-center justify-center">
                    <span className="font-brand font-bold text-sm text-ecotribe-primary">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide truncate">{user.name}</p>
                      <span className={`flex items-center gap-1 font-mono font-bold text-[10px] uppercase tracking-widest flex-shrink-0 ${statusConfig.color}`}>
                        {statusConfig.icon}
                        {statusConfig.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 font-mono text-xs text-slate-500 dark:text-white/50">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </span>
                      {user.phone && (
                        <span className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                          <Phone className="w-3 h-3" />
                          {user.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Assigned */}
                  <div className="text-center">
                    <p className="font-brand font-bold text-lg text-slate-900 dark:text-white">{user.assignedAssets}</p>
                    <p className="font-mono font-bold text-[9px] text-slate-500 dark:text-white/50 uppercase tracking-widest">Assigned</p>
                  </div>

                  {/* Submitted */}
                  <div className="text-center">
                    <p className="font-brand font-bold text-lg text-ecotribe-primary">{user.submittedAssets}</p>
                    <p className="font-mono font-bold text-[9px] text-slate-500 dark:text-white/50 uppercase tracking-widest">Submitted</p>
                  </div>

                  {/* Department */}
                  <div className="text-center">
                    <span className="inline-block px-3 py-1.5 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] font-mono text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-wide truncate max-w-full">
                      {user.department}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end">
                    {user.status === 'pending_invite' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResendInvite(user.id, user.email);
                        }}
                        disabled={resendingIds.has(user.id)}
                        className="interactive p-2.5 border border-amber-400/30 bg-amber-400/5 hover:bg-amber-400/10 transition-all disabled:opacity-50"
                        title="Resend Invite"
                      >
                        {resendingIds.has(user.id) ? (
                          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                        ) : (
                          <Send className="w-4 h-4 text-amber-400" />
                        )}
                      </button>
                    )}
                    {user.status !== 'pending_invite' && (
                      <button
                        type="button"
                        onClick={(e) => requestToggleStatus(user.id, user.status, user.name, e)}
                        disabled={togglingIds.has(user.id)}
                        className={`interactive p-2.5 border transition-all disabled:opacity-50 ${
                          user.status === 'active'
                            ? 'border-red-400/30 bg-red-400/5 hover:bg-red-400/15'
                            : 'border-emerald-400/30 bg-emerald-400/5 hover:bg-emerald-400/15'
                        }`}
                        title={user.status === 'active' ? 'Deactivate Employee' : 'Activate Employee'}
                      >
                        {togglingIds.has(user.id) ? (
                          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                        ) : user.status === 'active' ? (
                          <UserX className="w-4 h-4 text-red-400" />
                        ) : (
                          <UserCheck className="w-4 h-4 text-emerald-400" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Nav */}
                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-zinc-600 group-hover:text-ecotribe-primary transition-colors" />
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center">
            <div className="w-16 h-16 border border-slate-200 dark:border-white/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-slate-500 dark:text-white/50" />
            </div>
            <p className="font-display font-bold text-slate-900 dark:text-white uppercase tracking-wide mb-1">No employees found</p>
            <p className="font-mono text-xs text-slate-500 dark:text-white/50 mb-6">
              {searchQuery || statusFilter || departmentFilter
                ? 'Try adjusting your filters'
                : 'Invite employees to start checking in devices'}
            </p>
            {!searchQuery && !statusFilter && !departmentFilter && (
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => navigate(`${basePath}/employees/upload`)}
                  className="interactive px-5 py-2.5 bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Bulk Upload
                </button>
                <button
                  onClick={() => navigate(`${basePath}/employees/invite`)}
                  className="interactive px-5 py-2.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Invite User
                </button>
              </div>
            )}
          </div>
        )}
      </motion.div>

      <InfiniteScrollTrigger hasNextPage={!!hasNextPage} isFetchingNextPage={isFetchingNextPage} fetchNextPage={fetchNextPage} />
      <InfiniteScrollInfo loadedCount={subUsers.length} totalCount={totalSubUsers} />

      {/* Deactivation: live preview modal */}
      <DeactivationPreviewModal
        isOpen={!!pendingDeactivate}
        onClose={() => setPendingDeactivate(null)}
        onConfirm={confirmDeactivate}
        userId={pendingDeactivate?.userId ?? ''}
        userName={pendingDeactivate?.userName ?? ''}
      />

      {/* Activation: simple confirmation */}
      <ConfirmationModal
        isOpen={!!pendingActivate}
        onClose={() => setPendingActivate(null)}
        onConfirm={confirmActivate}
        title="Activate Employee?"
        description={`Are you sure you want to activate ${pendingActivate?.userName}? They will regain access to the check-in portal.`}
        confirmText="Activate"
        variant="info"
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

export default EmployeeList;
