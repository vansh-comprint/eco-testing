import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, IndianRupee, Shield, Plus, FileText, Settings, BarChart3, UserPlus, Truck, Laptop, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge, PageHeader, DashboardStatGrid, SkeletonTable } from '@/components/ui';
import type { StatAccent } from '@/components/ui';
import { glass, text, hover as hoverStyles, iconSize } from '@/lib/design-tokens';
import { CreateOpsAdminModal, CreateLogisticsAdminModal } from '@/pages/super';
import { useDashboardStats, usePlatformAdmins } from '@/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { dashboardStatsKeys } from '@/hooks/useDashboardStats';
import type { UserResponse } from '@/lib/api/auth';

export function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [isOpsAdminModalOpen, setIsOpsAdminModalOpen] = useState(false);
  const [isLogisticsAdminModalOpen, setIsLogisticsAdminModalOpen] = useState(false);
  const [adminPage, setAdminPage] = useState(1);
  const ADMIN_PAGE_SIZE = 5;

  // Dashboard stats from efficient backend COUNT queries
  const { stats } = useDashboardStats();
  const queryClient = useQueryClient();

  // Admin users list for the table via React Query
  const { data: admins = [], isLoading: loading } = usePlatformAdmins();

  const quickActions = [
    { icon: <Laptop className={iconSize.xl} />, title: 'All Assets', description: 'View all assets across all enterprises', path: '/super/enterprise-assets' },
    { icon: <Users className={iconSize.xl} />, title: 'All Users', description: 'View all users across all roles', path: '/super/users' },
    { icon: <Building2 className={iconSize.xl} />, title: 'Enterprises', description: 'View and manage all registered enterprises', path: '/super/enterprises' },
    { icon: <Truck className={iconSize.xl} />, title: 'Logistics', description: 'View logistics admins and field users', path: '/super/logistics' },
    { icon: <IndianRupee className={iconSize.xl} />, title: 'Pricing', description: 'Configure device pricing and grading', path: '/super/pricing' },
    { icon: <BarChart3 className={iconSize.xl} />, title: 'Analytics', description: 'View platform-wide analytics and reports', path: '/super/analytics' },
  ];

  // Prepare stat items for the grid (using real data)
  const statItems = [
    {
      label: 'Total Enterprises',
      value: stats.enterprise_count ?? 0,
      icon: <Building2 className={`${iconSize.lg} text-blue-500`} />,
      accent: 'info' as StatAccent,
      onClick: () => navigate('/super/enterprises'),
    },
    {
      label: 'Total Users',
      value: stats.user_count ?? 0,
      icon: <Users className={`${iconSize.lg} text-emerald-500`} />,
      accent: 'success' as StatAccent,
      onClick: () => navigate('/super/users'),
    },
    {
      label: 'Active Admins',
      value: stats.admin_count ?? 0,
      icon: <Shield className={`${iconSize.lg} text-lime-500`} />,
      accent: 'brand' as StatAccent,
      onClick: () => navigate('/super/admins'),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        label="Super Admin"
        title="Platform Control"
        subtitle="Platform-wide management"
        actions={
          <div className="flex gap-2">
            <div className="relative group">
              <button
                onClick={() => setIsOpsAdminModalOpen(true)}
                className="w-11 h-11 bg-lime-500 hover:bg-lime-400 hover:shadow-[0_0_20px_rgba(132,204,22,0.3)] transition-all flex items-center justify-center"
                title="Add OPS Admin"
              >
                <UserPlus className={`${iconSize.md} text-black group-hover:scale-110 transition-transform`} />
              </button>
              <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-mono text-[10px] uppercase tracking-wider whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Add OPS Admin
              </span>
            </div>
            <div className="relative group">
              <button
                onClick={() => setIsLogisticsAdminModalOpen(true)}
                className="w-11 h-11 bg-lime-500 hover:bg-lime-400 hover:shadow-[0_0_20px_rgba(132,204,22,0.3)] transition-all flex items-center justify-center"
                title="Add Logistics Admin"
              >
                <Truck className={`${iconSize.md} text-black group-hover:scale-110 transition-transform`} />
              </button>
              <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-mono text-[10px] uppercase tracking-wider whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Add Logistics
              </span>
            </div>
            <div className="relative group">
              <button
                onClick={() => navigate('/super/enterprises/create')}
                className="w-11 h-11 bg-lime-500 hover:bg-lime-400 hover:shadow-[0_0_20px_rgba(132,204,22,0.3)] transition-all flex items-center justify-center"
                title="Add Enterprise"
              >
                <Building2 className={`${iconSize.md} text-black group-hover:scale-110 transition-transform`} />
              </button>
              <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-mono text-[10px] uppercase tracking-wider whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Add Enterprise
              </span>
            </div>
          </div>
        }
      />

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <DashboardStatGrid items={statItems} columns={3} />
      </motion.div>

      {/* Admin Users */}
      <div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={glass.subtle}
        >
          <div className="p-6 border-b border-slate-200/80 dark:border-zinc-800 flex items-center justify-between">
            <h2 className={`font-brand font-bold text-lg uppercase tracking-wide ${text.primary}`}>
              Admin Users {admins.length > 0 && <span className={`font-mono text-sm ${text.muted} ml-2`}>({admins.length})</span>}
            </h2>
          </div>
          {/* Column Headers */}
          <div className="overflow-x-auto">
            <div className="min-w-[500px]">
              <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-4 py-3 border-b border-slate-200/60 dark:border-zinc-800/60">
                <span className={`font-mono text-[10px] uppercase tracking-widest ${text.muted}`}>Name</span>
                <span className={`font-mono text-[10px] uppercase tracking-widest ${text.muted}`}>Email</span>
                <span className={`font-mono text-[10px] uppercase tracking-widest ${text.muted} text-right`}>Role</span>
                <span className={`font-mono text-[10px] uppercase tracking-widest ${text.muted} text-right w-16`}>Status</span>
              </div>
              <div className="divide-y divide-slate-200/60 dark:divide-zinc-800/60">
                {loading ? (
                  <div className="p-4">
                    <SkeletonTable rows={3} columns={4} />
                  </div>
                ) : admins.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className={`font-mono text-sm ${text.muted}`}>No admin users yet</p>
                  </div>
                ) : (
                  admins.slice((adminPage - 1) * ADMIN_PAGE_SIZE, adminPage * ADMIN_PAGE_SIZE).map((admin, index) => (
                    <div
                      key={admin.id}
                      className={`grid grid-cols-[1fr_1fr_auto_auto] gap-4 items-center px-4 py-3 ${hoverStyles.row}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 flex-shrink-0 border border-lime-500/30 dark:border-lime-400/20 bg-lime-50/80 dark:bg-lime-500/10 flex items-center justify-center font-brand font-bold text-xs text-lime-700 dark:text-lime-400">
                          {admin.name?.split(' ').map((n: string) => n[0]).join('') || admin.email[0].toUpperCase()}
                        </div>
                        <p className={`font-display font-bold text-sm uppercase truncate ${text.primary}`}>{admin.name || 'Admin User'}</p>
                      </div>
                      <p className={`font-mono text-xs truncate ${text.muted}`}>{admin.email}</p>
                      <Badge variant={admin.role === 'super_admin' ? 'info' : 'default'} size="sm">
                        {admin.role.replace('_', ' ')}
                      </Badge>
                      <span className={`font-mono text-xs ${text.muted} text-right w-16`}>
                        {admin.status === 'active' ? (
                          <span className="text-emerald-600 dark:text-emerald-400">Active</span>
                        ) : (
                          <span className="text-slate-400 dark:text-zinc-500">{admin.status || 'Active'}</span>
                        )}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>{/* min-w */}
          </div>{/* overflow-x-auto */}
          {/* Pagination */}
          {admins.length > ADMIN_PAGE_SIZE && (
            <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-slate-200/60 dark:border-zinc-800/60">
              <span className={`font-mono text-xs ${text.muted} mr-auto`}>
                Page {adminPage} of {Math.ceil(admins.length / ADMIN_PAGE_SIZE)}
              </span>
              <button
                onClick={() => setAdminPage(p => Math.max(1, p - 1))}
                disabled={adminPage === 1}
                className={`p-1.5 border border-slate-200 dark:border-zinc-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${text.muted} hover:text-lime-600 dark:hover:text-lime-400 hover:border-lime-500/30`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setAdminPage(p => Math.min(Math.ceil(admins.length / ADMIN_PAGE_SIZE), p + 1))}
                disabled={adminPage >= Math.ceil(admins.length / ADMIN_PAGE_SIZE)}
                className={`p-1.5 border border-slate-200 dark:border-zinc-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${text.muted} hover:text-lime-600 dark:hover:text-lime-400 hover:border-lime-500/30`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>

      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {quickActions.map((action, index) => (
          <motion.button
            key={index}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => action.path && navigate(action.path)}
            className={`${glass.subtle} p-6 text-left hover:border-lime-500/25 dark:hover:border-lime-400/20 group transition-all`}
          >
            <div className="w-12 h-12 border border-slate-200/80 dark:border-zinc-700 group-hover:border-lime-500/30 flex items-center justify-center text-slate-500 dark:text-zinc-400 group-hover:text-lime-600 dark:group-hover:text-lime-400 transition-all mb-4">
              {action.icon}
            </div>
            <h3 className={`font-display font-bold uppercase tracking-wide mb-1 group-hover:text-lime-600 dark:group-hover:text-lime-400 transition-colors ${text.primary}`}>
              {action.title}
            </h3>
            <p className={`font-mono text-xs ${text.muted}`}>{action.description}</p>
          </motion.button>
        ))}
      </motion.div>

      {/* Activity Log - Coming Soon */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className={glass.subtle}
      >
        <div className="p-6 border-b border-slate-200/80 dark:border-zinc-800">
          <h2 className={`font-brand font-bold text-lg uppercase tracking-wide ${text.primary}`}>System Activity Log</h2>
        </div>
        <div className="p-8 text-center">
          <p className={`font-mono text-sm ${text.muted}`}>Activity logging coming soon...</p>
        </div>
      </motion.div>

      {/* Modals */}
      <CreateOpsAdminModal
        isOpen={isOpsAdminModalOpen}
        onClose={() => setIsOpsAdminModalOpen(false)}
        onSuccess={() => { }}
      />
      <CreateLogisticsAdminModal
        isOpen={isLogisticsAdminModalOpen}
        onClose={() => setIsLogisticsAdminModalOpen(false)}
        onSuccess={() => { }}
      />
    </div>
  );
}
