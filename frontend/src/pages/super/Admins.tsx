import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Search, ArrowLeft, UserPlus, Mail, Phone, Edit2 } from 'lucide-react';
import { Input, Button, Card, Badge, PageHeader } from '@/components/ui';
import { CreateOpsAdminModal, EditUserModal } from '@/pages/super';
import { usersApi } from '@/lib/api/users';
import { useQuery } from '@tanstack/react-query';
import { useDashboardStats } from '@/hooks';
import { glass, text, iconSize, hover as hoverStyles } from '@/lib/design-tokens';

interface Admin {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
  status: string;
  created_at: string;
  last_login_at?: string;
}

export function Admins() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isOpsAdminModalOpen, setIsOpsAdminModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const { stats: dashboardStats } = useDashboardStats();

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ['users', 'admins'],
    queryFn: async () => {
      const result = await usersApi.list({ limit: 100 });
      if (result.success && result.data) {
        const adminRoles = ['super_admin', 'ops_admin'];
        return result.data
          .filter(u => adminRoles.includes(u.role))
          .map(u => ({
            id: u.id,
            email: u.email,
            name: u.name,
            phone: u.phone,
            role: u.role,
            status: u.status,
            created_at: u.created_at,
            last_login_at: u.last_login_at,
          }));
      }
      return [];
    },
    staleTime: 30000,
  });

  const getRoleBadgeVariant = (role: string) => {
    const variants: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'default'> = {
      super_admin: 'danger',
      ops_admin: 'warning',
    };
    return variants[role] || 'default';
  };

  const formatRole = (role: string) => {
    const roleLabels: Record<string, string> = {
      super_admin: 'Super Admin',
      ops_admin: 'OPS Admin',
    };
    return roleLabels[role] || role;
  };

  const filteredAdmins = admins.filter(admin => {
    const matchesSearch =
      admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || admin.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const stats = {
    total: admins.length,
    superAdmins: dashboardStats.user_super_admin ?? 0,
    opsAdmins: dashboardStats.user_ops_admin ?? 0,
    active: admins.filter(a => a.status === 'active').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        label="Super Admin"
        title="Admin Users"
        subtitle={`${filteredAdmins.length} admin users`}
        actions={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => navigate('/super')}
              leftIcon={<ArrowLeft className={iconSize.sm} />}
            >
              Back
            </Button>
            <Button
              variant="primary"
              onClick={() => setIsOpsAdminModalOpen(true)}
              leftIcon={<UserPlus className={iconSize.sm} />}
            >
              Add OPS Admin
            </Button>
          </div>
        }
      />

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <Card className="p-4">
          <p className={`font-mono text-xs uppercase tracking-widest ${text.muted}`}>Total Admins</p>
          <p className={`font-brand text-2xl font-bold ${text.primary} mt-1`}>{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className={`font-mono text-xs uppercase tracking-widest ${text.muted}`}>Super Admin</p>
          <p className={`font-brand text-2xl font-bold text-red-500 mt-1`}>{stats.superAdmins}</p>
        </Card>
        <Card className="p-4">
          <p className={`font-mono text-xs uppercase tracking-widest ${text.muted}`}>OPS Admin</p>
          <p className={`font-brand text-2xl font-bold text-amber-500 mt-1`}>{stats.opsAdmins}</p>
        </Card>
        <Card className="p-4">
          <p className={`font-mono text-xs uppercase tracking-widest ${text.muted}`}>Active</p>
          <p className={`font-brand text-2xl font-bold text-emerald-500 mt-1`}>{stats.active}</p>
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
                placeholder="Search by name or email..."
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
                <option value="all">All Admin Roles</option>
                <option value="super_admin">Super Admin</option>
                <option value="ops_admin">OPS Admin</option>
              </select>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Admins Table */}
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
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <p className={`font-mono text-sm ${text.muted}`}>Loading admins...</p>
                    </td>
                  </tr>
                ) : filteredAdmins.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <p className={`font-mono text-sm ${text.muted}`}>No admin users found</p>
                    </td>
                  </tr>
                ) : (
                  filteredAdmins.map((admin, index) => (
                    <motion.tr
                      key={admin.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.05 * index }}
                      className={hoverStyles.row}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 border border-lime-500/30 dark:border-lime-400/20 bg-lime-50/80 dark:bg-lime-500/10 flex items-center justify-center font-brand font-bold text-lime-700 dark:text-lime-400 text-sm">
                              {admin.name?.split(' ').map(n => n[0]).join('').toUpperCase() || admin.email[0].toUpperCase()}
                            </div>
                            <span className="absolute bottom-0 right-0 w-3 h-3 border-2 border-white dark:border-zinc-900 bg-emerald-500" />
                          </div>
                          <p className={`font-display text-sm font-bold uppercase ${text.primary}`}>
                            {admin.name || 'Admin User'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Mail className={`${iconSize.xs} ${text.muted}`} />
                          <p className={`font-mono text-xs ${text.muted}`}>
                            {admin.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={getRoleBadgeVariant(admin.role)} size="sm">
                          {formatRole(admin.role)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        {admin.phone ? (
                          <div className="flex items-center gap-2">
                            <Phone className={`${iconSize.xs} ${text.muted}`} />
                            <p className={`font-mono text-xs ${text.muted}`}>
                              {admin.phone}
                            </p>
                          </div>
                        ) : (
                          <p className={`font-mono text-xs ${text.muted}`}>-</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={admin.status === 'active' ? 'success' : 'default'}
                          size="sm"
                        >
                          {admin.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedAdmin(admin);
                              setIsEditUserModalOpen(true);
                            }}
                            className={`p-2 hover:bg-lime-500/10 transition-colors ${text.muted} hover:text-lime-500`}
                            title="Edit Admin"
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

      {/* Modals */}
      <CreateOpsAdminModal
        isOpen={isOpsAdminModalOpen}
        onClose={() => setIsOpsAdminModalOpen(false)}
        onSuccess={() => {
          setIsOpsAdminModalOpen(false);
        }}
      />
      {selectedAdmin && (
        <EditUserModal
          isOpen={isEditUserModalOpen}
          onClose={() => {
            setIsEditUserModalOpen(false);
            setSelectedAdmin(null);
          }}
          onSuccess={() => {}}
          user={selectedAdmin}
          allowedRoles={[
            { value: 'super_admin', label: 'Super Admin' },
            { value: 'ops_admin', label: 'OPS Admin' },
          ]}
        />
      )}
    </div>
  );
}
