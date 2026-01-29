import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, IndianRupee, Shield, Plus, FileText, Settings, BarChart3, UserPlus, Truck, Laptop } from 'lucide-react';
import { Badge, PageHeader, DashboardStatGrid } from '@/components/ui';
import type { StatAccent } from '@/components/ui';
import { glass, text, hover as hoverStyles, iconSize } from '@/lib/design-tokens';
import { CreateMainAdminModal, CreateLogisticsAdminModal } from '@/pages/super';
import { usersApi } from '@/lib/api/users';
import { enterprisesApi } from '@/lib/api/enterprises';
import type { UserResponse } from '@/lib/api/auth';

export function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [isMainAdminModalOpen, setIsMainAdminModalOpen] = useState(false);
  const [isLogisticsAdminModalOpen, setIsLogisticsAdminModalOpen] = useState(false);

  // Real-time data from REST API
  const [enterpriseCount, setEnterpriseCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [admins, setAdmins] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch enterprises
      const enterprisesResult = await enterprisesApi.list({ limit: 1000 });
      if (enterprisesResult.success && enterprisesResult.data) {
        setEnterpriseCount(enterprisesResult.data.length);
      }

      // Fetch all users count
      const usersResult = await usersApi.list({ limit: 1000 });
      if (usersResult.success && usersResult.data) {
        setUserCount(usersResult.data.length);

        // Filter admin users from the result
        const adminRoles = ['super_admin', 'ops_admin', 'logistics_admin'];
        const adminUsers = usersResult.data.filter(u => adminRoles.includes(u.role));
        setAdmins(adminUsers);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const systemServices = [
    { service: 'Database', status: 'operational', uptime: '100%' },
    { service: 'Auth Service', status: 'operational', uptime: '100%' },
    { service: 'Storage', status: 'operational', uptime: '100%' },
  ];

  const quickActions = [
    { icon: <Laptop className={iconSize.xl} />, title: 'All Assets', description: 'View all assets across all enterprises', path: '/super/assets' },
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
      value: enterpriseCount,
      icon: <Building2 className={`${iconSize.lg} text-blue-500`} />,
      accent: 'info' as StatAccent,
      onClick: () => navigate('/super/enterprises'),
    },
    {
      label: 'Total Users',
      value: userCount,
      icon: <Users className={`${iconSize.lg} text-emerald-500`} />,
      accent: 'success' as StatAccent,
      onClick: () => navigate('/super/users'),
    },
    {
      label: 'Active Admins',
      value: admins.length,
      icon: <Shield className={`${iconSize.lg} text-lime-500`} />,
      accent: 'brand' as StatAccent,
      onClick: () => navigate('/super/admins'),
    },
    {
      label: 'System Health',
      value: '100%',
      subLabel: 'All systems',
      icon: <Shield className={`${iconSize.lg} text-slate-600 dark:text-zinc-400`} />,
      accent: 'neutral' as StatAccent,
      onClick: () => navigate('/super/analytics'),
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
            <button
              onClick={() => setIsMainAdminModalOpen(true)}
              className="w-11 h-11 bg-lime-500 hover:bg-lime-400 hover:shadow-[0_0_20px_rgba(132,204,22,0.3)] transition-all flex items-center justify-center group"
              title="Add Main Admin"
            >
              <UserPlus className={`${iconSize.md} text-black group-hover:scale-110 transition-transform`} />
            </button>
            <button
              onClick={() => setIsLogisticsAdminModalOpen(true)}
              className="w-11 h-11 bg-lime-500 hover:bg-lime-400 hover:shadow-[0_0_20px_rgba(132,204,22,0.3)] transition-all flex items-center justify-center group"
              title="Add Logistics Admin"
            >
              <Truck className={`${iconSize.md} text-black group-hover:scale-110 transition-transform`} />
            </button>
            <button
              onClick={() => navigate('/super/enterprises/create')}
              className="w-11 h-11 bg-lime-500 hover:bg-lime-400 hover:shadow-[0_0_20px_rgba(132,204,22,0.3)] transition-all flex items-center justify-center group"
              title="Add Enterprise"
            >
              <Building2 className={`${iconSize.md} text-black group-hover:scale-110 transition-transform`} />
            </button>
          </div>
        }
      />

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <DashboardStatGrid items={statItems} columns={4} />
      </motion.div>

      {/* Admins & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Admin Users */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`lg:col-span-2 ${glass.subtle}`}
        >
          <div className="p-6 border-b border-slate-200/80 dark:border-zinc-800">
            <h2 className={`font-brand font-bold text-lg uppercase tracking-wide ${text.primary}`}>Admin Users</h2>
          </div>
          <div className="divide-y divide-slate-200/60 dark:divide-zinc-800/60">
            {admins.length === 0 ? (
              <div className="p-8 text-center">
                <p className={`font-mono text-sm ${text.muted}`}>No admin users yet</p>
              </div>
            ) : (
              admins.map((admin, index) => (
                <motion.div
                  key={admin.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className={`flex items-center justify-between p-4 ${hoverStyles.row}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 border border-lime-500/30 dark:border-lime-400/20 bg-lime-50/80 dark:bg-lime-500/10 flex items-center justify-center font-brand font-bold text-lime-700 dark:text-lime-400">
                        {admin.name?.split(' ').map((n: string) => n[0]).join('') || admin.email[0].toUpperCase()}
                      </div>
                      <span className="absolute bottom-0 right-0 w-3 h-3 border-2 border-white dark:border-zinc-900 bg-emerald-500" />
                    </div>
                    <div>
                      <p className={`font-display font-bold text-sm uppercase ${text.primary}`}>{admin.name || 'Admin User'}</p>
                      <p className={`font-mono text-xs ${text.muted}`}>{admin.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={admin.role === 'super_admin' ? 'info' : 'default'} size="sm">
                      {admin.role.replace('_', ' ')}
                    </Badge>
                    <span className={`font-mono text-xs ${text.muted}`}>Active</span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* System Status */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={glass.subtle}
        >
          <div className="p-6 border-b border-slate-200/80 dark:border-zinc-800">
            <h2 className={`font-brand font-bold text-lg uppercase tracking-wide ${text.primary}`}>System Status</h2>
          </div>
          <div className="p-4 space-y-1">
            {systemServices.map((service, index) => (
              <div key={index} className={`flex items-center justify-between py-3 px-2 ${hoverStyles.row}`}>
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 ${
                    service.status === 'operational' ? 'bg-emerald-500' :
                    service.status === 'degraded' ? 'bg-amber-500' : 'bg-red-500'
                  }`} />
                  <span className={`font-display font-bold text-sm uppercase ${text.primary}`}>{service.service}</span>
                </div>
                <span className={`font-mono text-xs ${text.muted}`}>{service.uptime}</span>
              </div>
            ))}
          </div>
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
      <CreateMainAdminModal
        isOpen={isMainAdminModalOpen}
        onClose={() => setIsMainAdminModalOpen(false)}
        onSuccess={() => {
          fetchDashboardData();
          console.log('Main Admin created successfully');
        }}
      />
      <CreateLogisticsAdminModal
        isOpen={isLogisticsAdminModalOpen}
        onClose={() => setIsLogisticsAdminModalOpen(false)}
        onSuccess={() => {
          fetchDashboardData();
          console.log('Logistics Admin created successfully');
        }}
      />
    </div>
  );
}
