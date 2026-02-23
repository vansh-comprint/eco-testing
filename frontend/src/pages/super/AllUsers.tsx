import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Search, Download, Edit2, ArrowLeft, Mail, Phone, UserPlus } from 'lucide-react';
import { Input, Button, Card, Badge, PageHeader, InfiniteScrollTrigger, InfiniteScrollInfo } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { EditUserModal, AddUserModal } from '@/pages/super';
import { useInfiniteUsers, useDebounce, useDashboardStats } from '@/hooks';
import { usersApi } from '@/lib/api/users';
import { glass, text, iconSize, hover as hoverStyles } from '@/lib/design-tokens';

interface User {
  id: string;
  enterprise_id?: string;
  enterprise_name?: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
  status: string;
  created_at: string;
  last_login_at?: string;
}

export function AllUsers() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { stats: dashStats } = useDashboardStats();
  const debouncedSearch = useDebounce(searchTerm, 350);

  // Build server-side params (role + search)
  const apiParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (roleFilter !== 'all') params.role = roleFilter;
    if (debouncedSearch) params.search = debouncedSearch;
    return params;
  }, [roleFilter, debouncedSearch]);

  // Infinite scroll query for users — search + role are server-side
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteUsers(apiParams);

  const total = data?.pages[0]?.pagination?.total ?? 0;

  // Flatten pages into users list
  const users: User[] = useMemo(() => data?.pages.flatMap(p =>
    (p.data || []).map(u => ({
      id: u.id,
      enterprise_id: u.enterprise_id,
      enterprise_name: u.enterprise_name,
      email: u.email,
      name: u.name,
      phone: u.phone,
      role: u.role,
      status: u.status,
      created_at: u.created_at,
      last_login_at: u.last_login_at,
    }))
  ) ?? [], [data]);

  const getRoleBadgeVariant = (role: string) => {
    const variants: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'default'> = {
      super_admin: 'danger',
      ops_admin: 'warning',
      it_admin: 'info',
      org_admin: 'success',
      logistics_admin: 'warning',
      logistics_user: 'default',
    };
    return variants[role] || 'default';
  };

  const formatRole = (role: string) => {
    const roleLabels: Record<string, string> = {
      super_admin: 'Super Admin',
      ops_admin: 'OPS Admin',
      it_admin: 'IT Admin',
      org_admin: 'Org Admin',
      employee: 'Employee',
      logistics_admin: 'Logistics Admin',
      logistics_user: 'Logistics User',
    };
    return roleLabels[role] || role;
  };

  // Search + role are now server-side. Only exclude employees client-side.
  const filteredUsers = users.filter(user => user.role !== 'employee');

  // Use server-side stats for accurate counts (not affected by infinite scroll subset)
  const stats = {
    total: (dashStats.user_super_admin ?? 0) + (dashStats.user_ops_admin ?? 0) + (dashStats.user_it_admin ?? 0) + (dashStats.user_org_admin ?? 0) + (dashStats.user_logistics ?? 0),
    superAdmins: dashStats.user_super_admin ?? 0,
    opsAdmins: dashStats.user_ops_admin ?? 0,
    itAdmins: dashStats.user_it_admin ?? 0,
    orgAdmins: dashStats.user_org_admin ?? 0,
    logistics: dashStats.user_logistics ?? 0,
  };

  const handleModalSuccess = () => {
    // No need to manually invalidate - mutation hooks handle this
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Fetch ALL users by paginating in batches of 100 (backend max limit)
      const PAGE_SIZE = 100;
      const allUsers: User[] = [];
      let skip = 0;
      let hasMore = true;

      while (hasMore) {
        const params: Record<string, string | number> = { limit: PAGE_SIZE, skip };
        if (roleFilter !== 'all') params.role = roleFilter;
        if (debouncedSearch) params.search = debouncedSearch;
        const result = await usersApi.list(params as any);

        if (!result.success || !result.data) {
          addToast({ type: 'error', title: 'Export Failed', message: result.error?.message || 'Could not fetch users' });
          return;
        }

        const pageUsers = result.data.map((u: any) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          phone: u.phone,
          role: u.role,
          status: u.status,
          enterprise_name: u.enterprise_name,
          created_at: u.created_at,
        }));

        allUsers.push(...pageUsers);
        skip += PAGE_SIZE;
        hasMore = pageUsers.length === PAGE_SIZE;
      }

      if (allUsers.length === 0) {
        addToast({ type: 'warning', title: 'No Data', message: 'No users found to export' });
        return;
      }

      const headers = ['Name', 'Email', 'Role', 'Enterprise', 'Phone', 'Status', 'Created At'];
      const rows = allUsers.map(u => [
        u.name,
        u.email,
        formatRole(u.role),
        u.enterprise_name || '',
        u.phone || '',
        u.status,
        u.created_at ? new Date(u.created_at).toLocaleDateString() : '',
      ]);
      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ecotribe-users-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      addToast({ type: 'success', title: 'Export Complete', message: `Exported ${allUsers.length} users` });
    } catch (error) {
      console.error('Export failed:', error);
      addToast({ type: 'error', title: 'Export Failed', message: 'An unexpected error occurred' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        label="Super Admin"
        title="All Users"
        subtitle={`${stats.total} users across all roles`}
        backLink
        actions={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={handleExport}
              disabled={filteredUsers.length === 0 || isExporting}
              leftIcon={<Download className={iconSize.sm} />}
            >
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
            <Button
              variant="primary"
              onClick={() => setIsAddUserModalOpen(true)}
              leftIcon={<UserPlus className={iconSize.sm} />}
            >
              Add User
            </Button>
          </div>
        }
      />

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4"
      >
        <Card className="p-4 cursor-pointer hover:ring-1 hover:ring-slate-300 dark:hover:ring-zinc-600 transition-all" onClick={() => setRoleFilter('all')}>
          <p className={`font-mono text-xs uppercase tracking-widest ${text.muted}`}>Total</p>
          <p className={`font-brand text-2xl font-bold ${text.primary} mt-1`}>{stats.total}</p>
        </Card>
        <Card className="p-4 cursor-pointer hover:ring-1 hover:ring-red-400 transition-all" onClick={() => setRoleFilter('super_admin')}>
          <p className={`font-mono text-xs uppercase tracking-widest ${text.muted}`}>Super</p>
          <p className={`font-brand text-2xl font-bold text-red-500 mt-1`}>{stats.superAdmins}</p>
        </Card>
        <Card className="p-4 cursor-pointer hover:ring-1 hover:ring-amber-400 transition-all" onClick={() => setRoleFilter('ops_admin')}>
          <p className={`font-mono text-xs uppercase tracking-widest ${text.muted}`}>OPS Admin</p>
          <p className={`font-brand text-2xl font-bold text-amber-500 mt-1`}>{stats.opsAdmins}</p>
        </Card>
        <Card className="p-4 cursor-pointer hover:ring-1 hover:ring-blue-400 transition-all" onClick={() => setRoleFilter('it_admin')}>
          <p className={`font-mono text-xs uppercase tracking-widest ${text.muted}`}>IT Admin</p>
          <p className={`font-brand text-2xl font-bold text-blue-500 mt-1`}>{stats.itAdmins}</p>
        </Card>
        <Card className="p-4 cursor-pointer hover:ring-1 hover:ring-emerald-400 transition-all" onClick={() => setRoleFilter('org_admin')}>
          <p className={`font-mono text-xs uppercase tracking-widest ${text.muted}`}>Org Admin</p>
          <p className={`font-brand text-2xl font-bold text-emerald-500 mt-1`}>{stats.orgAdmins}</p>
        </Card>
        <Card className="p-4 cursor-pointer hover:ring-1 hover:ring-purple-400 transition-all" onClick={() => setRoleFilter('logistics_admin')}>
          <p className={`font-mono text-xs uppercase tracking-widest ${text.muted}`}>Logistics</p>
          <p className={`font-brand text-2xl font-bold text-purple-500 mt-1`}>{stats.logistics}</p>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name, email, or enterprise..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search className={iconSize.sm} />}
              />
            </div>
            <div className="w-full md:w-64">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 font-mono text-xs uppercase tracking-widest focus:outline-none focus:border-lime-500 dark:focus:border-lime-400"
              >
                <option value="all">All Roles</option>
                <option value="super_admin">Super Admin</option>
                <option value="ops_admin">OPS Admin</option>
                <option value="org_admin">Org Admin</option>
                <option value="it_admin">IT Admin</option>
                <option value="logistics_admin">Logistics Admin</option>
                <option value="logistics_user">Logistics User</option>
              </select>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Users Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-zinc-800">
                  <th className={`px-6 py-4 text-left font-mono text-xs uppercase tracking-widest ${text.muted}`}>
                    Name
                  </th>
                  <th className={`px-6 py-4 text-left font-mono text-xs uppercase tracking-widest ${text.muted}`}>
                    Email
                  </th>
                  <th className={`px-6 py-4 text-left font-mono text-xs uppercase tracking-widest ${text.muted}`}>
                    Role
                  </th>
                  <th className={`px-6 py-4 text-left font-mono text-xs uppercase tracking-widest ${text.muted}`}>
                    Enterprise
                  </th>
                  <th className={`px-6 py-4 text-left font-mono text-xs uppercase tracking-widest ${text.muted}`}>
                    Phone
                  </th>
                  <th className={`px-6 py-4 text-left font-mono text-xs uppercase tracking-widest ${text.muted}`}>
                    Status
                  </th>
                  <th className={`px-6 py-4 text-center font-mono text-xs uppercase tracking-widest ${text.muted}`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-zinc-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <p className={`font-mono text-sm ${text.muted}`}>Loading users...</p>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <p className={`font-mono text-sm ${text.muted}`}>No users found</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, index) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.05 * Math.min(index, 10) }}
                      className={hoverStyles.row}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 border border-lime-500/30 dark:border-lime-400/20 bg-lime-50/80 dark:bg-lime-500/10 flex items-center justify-center font-brand font-bold text-lime-700 dark:text-lime-400 text-sm">
                            {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </div>
                          <p className={`font-display text-sm font-bold uppercase ${text.primary}`}>
                            {user.name}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Mail className={`${iconSize.xs} ${text.muted}`} />
                          <p className={`font-mono text-xs ${text.muted}`}>
                            {user.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={getRoleBadgeVariant(user.role)} size="sm">
                          {formatRole(user.role)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <p className={`font-mono text-xs ${text.muted}`}>
                          {user.enterprise_name || '-'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        {user.phone ? (
                          <div className="flex items-center gap-2">
                            <Phone className={`${iconSize.xs} ${text.muted}`} />
                            <p className={`font-mono text-xs ${text.muted}`}>
                              {user.phone}
                            </p>
                          </div>
                        ) : (
                          <p className={`font-mono text-xs ${text.muted}`}>-</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={user.status === 'active' ? 'success' : 'default'}
                          size="sm"
                        >
                          {user.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setIsEditUserModalOpen(true);
                            }}
                            className={`p-2 hover:bg-lime-500/10 transition-colors ${text.muted} hover:text-lime-500`}
                            title="Edit User"
                          >
                            <Edit2 className={iconSize.sm} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      {/* Infinite Scroll Trigger + Info */}
      <InfiniteScrollTrigger
        hasNextPage={hasNextPage ?? false}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />
      <InfiniteScrollInfo
        loadedCount={users.length}
        totalCount={total}
      />

      {/* Edit User Modal */}
      {selectedUser && (
        <EditUserModal
          isOpen={isEditUserModalOpen}
          onClose={() => {
            setIsEditUserModalOpen(false);
            setSelectedUser(null);
          }}
          onSuccess={handleModalSuccess}
          user={selectedUser}
        />
      )}

      {/* Add User Modal */}
      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}
