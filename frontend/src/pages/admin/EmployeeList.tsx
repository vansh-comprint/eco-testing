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
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  Laptop,
  Send,
  Loader2
} from 'lucide-react';
import { useAuth, useSubUsers, useAssets, useAssetsByITAdmin, useSendSubUserInvitation, useApiError } from '@/hooks';
import { ITAdminBranchContext } from '@/contexts/ITAdminBranchContext';
import { useOrgBranchSafe } from '@/contexts/OrgBranchContext';
import { formatDistanceToNow } from 'date-fns';

type SubUserStatus = 'active' | 'pending_invite' | 'inactive';

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Pending Invite', value: 'pending_invite' },
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
  const { enterprise, user } = useAuth();
  const enterpriseId = enterprise?.id || '';
  const userId = user?.id || '';

  const itBranchCtx = useContext(ITAdminBranchContext);
  const orgBranchCtx = useOrgBranchSafe();
  const activeBranchFilter = itBranchCtx?.selectedBranchId || orgBranchCtx?.selectedBranchId || null;

  // Determine if org admin context
  const isOrgAdmin = user?.role === 'org_admin' || location.pathname.startsWith('/org-admin');
  const basePath = isOrgAdmin ? '/org-admin' : '/admin';

  // V3.2: React Query hooks - use different hooks based on role
  const { data: subUsers = [], isLoading: subUsersLoading } = useSubUsers(enterpriseId);
  const { data: orgAssets = [], isLoading: orgAssetsLoading } = useAssets(isOrgAdmin ? enterpriseId : '');
  const { data: itAssets = [], isLoading: itAssetsLoading } = useAssetsByITAdmin(isOrgAdmin ? '' : userId);

  const assets = isOrgAdmin ? orgAssets : itAssets;
  const assetsLoading = isOrgAdmin ? orgAssetsLoading : itAssetsLoading;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [resendingIds, setResendingIds] = useState<Set<string>>(new Set());
  
  const sendInvitationMutation = useSendSubUserInvitation();
  const { showSuccess, handleError } = useApiError();

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

  // Filter sub-users
  const filteredUsers = useMemo(() => {
    let result = [...enterpriseSubUsers];

    if (activeBranchFilter) {
      result = result.filter(e => e.branch_id === activeBranchFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        u =>
          u.name.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query) ||
          u.department.toLowerCase().includes(query)
      );
    }

    if (statusFilter) {
      result = result.filter(u => u.status === statusFilter);
    }

    if (departmentFilter) {
      result = result.filter(u => u.department === departmentFilter);
    }

    return result;
  }, [enterpriseSubUsers, activeBranchFilter, searchQuery, statusFilter, departmentFilter]);

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
                  className="p-5 hover:bg-white/70 dark:hover:bg-white/[0.06] transition-colors"
                >
                  <div className="flex items-center gap-5">
                    {/* Avatar */}
                    <div className="w-12 h-12 border border-ecotribe-primary/30 bg-ecotribe-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="font-brand font-bold text-sm text-ecotribe-primary">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">{user.name}</p>
                        <span className={`flex items-center gap-1 font-mono font-bold text-[10px] uppercase tracking-widest ${statusConfig.color}`}>
                          {statusConfig.icon}
                          {statusConfig.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 font-mono text-xs text-slate-500 dark:text-white/50">
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </span>
                        {user.phone && (
                          <span className="hidden sm:flex items-center gap-1.5">
                            <Phone className="w-3 h-3" />
                            {user.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="hidden md:flex items-center gap-8">
                      <div className="text-center">
                        <p className="font-brand font-bold text-xl text-slate-900 dark:text-white">{user.assignedAssets}</p>
                        <p className="font-mono font-bold text-[9px] text-slate-500 dark:text-white/50 uppercase tracking-widest">Assigned</p>
                      </div>
                      <div className="text-center">
                        <p className="font-brand font-bold text-xl text-ecotribe-primary">{user.submittedAssets}</p>
                        <p className="font-mono font-bold text-[9px] text-slate-500 dark:text-white/50 uppercase tracking-widest">Submitted</p>
                      </div>
                    </div>

                    {/* Department Badge */}
                    <div className="hidden sm:block">
                      <span className="px-3 py-1.5 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] font-mono text-xs text-slate-500 dark:text-white/50 uppercase tracking-wide">
                        {user.department}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {user.status === 'pending_invite' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResendInvite(user.id, user.email);
                          }}
                          disabled={resendingIds.has(user.id)}
                          className="interactive p-2.5 border border-slate-200 dark:border-white/10 hover:border-ecotribe-primary/30 hover:bg-ecotribe-primary/5 transition-all disabled:opacity-50"
                          title="Resend Invite"
                        >
                          {resendingIds.has(user.id) ? (
                            <Loader2 className="w-4 h-4 animate-spin text-ecotribe-primary" />
                          ) : (
                            <Send className="w-4 h-4 text-slate-500 dark:text-white/50 hover:text-ecotribe-primary transition-colors" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`${basePath}/employees/${user.id}`)}
                        className="interactive p-2.5 border border-slate-200 dark:border-white/10 hover:border-ecotribe-primary/30 hover:bg-ecotribe-primary/5 transition-all"
                      >
                        <Eye className="w-4 h-4 text-slate-500 dark:text-white/50 hover:text-ecotribe-primary transition-colors" />
                      </button>
                    </div>
                  </div>

                  {/* Last Active */}
                  {/* Mobile-only stats row */}
                  <div className="flex md:hidden items-center gap-4 mt-3 ml-[4.25rem] font-mono text-xs text-slate-500 dark:text-white/50">
                    <span>{user.assignedAssets} assigned</span>
                    <span className="text-ecotribe-primary">{user.submittedAssets} submitted</span>
                    {user.department !== 'Unassigned' && (
                      <span className="sm:hidden px-2 py-0.5 border border-slate-200 dark:border-white/10 text-[10px] uppercase">{user.department}</span>
                    )}
                  </div>
                  <div className="mt-2 sm:mt-3 ml-[4.25rem] font-mono text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest">
                    {user.lastActive
                      ? `Last active ${formatDistanceToNow(user.lastActive, { addSuffix: true })}`
                      : 'Never logged in'}
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

      {/* Results count */}
      {filteredUsers.length > 0 && (
        <p className="font-mono text-xs text-slate-500 dark:text-white/50 text-center uppercase tracking-widest">
          Showing {filteredUsers.length} of {enterpriseSubUsers.length} employees
        </p>
      )}
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
