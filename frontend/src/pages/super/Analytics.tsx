import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart3, ArrowLeft, Download, TrendingUp, TrendingDown, Building2, Users, Laptop, IndianRupee } from 'lucide-react';
import { Button, Card, Badge, PageHeader, DashboardStatGrid } from '@/components/ui';
import type { StatAccent } from '@/components/ui';
import { enterprisesApi } from '@/lib/api/enterprises';
import { usersApi } from '@/lib/api/users';
import { assetsApi } from '@/lib/api/assets';
import { glass, text, iconSize, hover as hoverStyles } from '@/lib/design-tokens';

interface AnalyticsData {
  totalEnterprises: number;
  totalUsers: number;
  totalAssets: number;
  totalRevenue: number;
  activeEnterprises: number;
  pendingApprovals: number;
  monthlyGrowth: {
    enterprises: number;
    users: number;
    revenue: number;
  };
}

export function Analytics() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalEnterprises: 0,
    totalUsers: 0,
    totalAssets: 0,
    totalRevenue: 0,
    activeEnterprises: 0,
    pendingApprovals: 0,
    monthlyGrowth: {
      enterprises: 0,
      users: 0,
      revenue: 0,
    },
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      // Fetch all data from REST APIs
      const [enterprisesResult, usersResult, assetsResult] = await Promise.all([
        enterprisesApi.list({ limit: 1000 }),
        usersApi.list({ limit: 1000 }),
        assetsApi.list({ limit: 1000 }),
      ]);

      const enterprises = enterprisesResult.success && enterprisesResult.data ? enterprisesResult.data : [];
      const users = usersResult.success && usersResult.data ? usersResult.data : [];
      const assets = assetsResult.success && assetsResult.data ? assetsResult.data : [];

      setAnalyticsData({
        totalEnterprises: enterprises.length,
        totalUsers: users.length,
        totalAssets: assets.length,
        totalRevenue: 0,
        activeEnterprises: enterprises.filter((e) => e.status === 'active').length,
        pendingApprovals: enterprises.filter((e) => e.status === 'pending_verification').length,
        monthlyGrowth: {
          enterprises: 0,
          users: 0,
          revenue: 0,
        },
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const statItems = [
    {
      label: 'Total Enterprises',
      value: analyticsData.totalEnterprises,
      icon: <Building2 className={`${iconSize.lg} text-blue-500`} />,
      accent: 'info' as StatAccent,
      subLabel: `${analyticsData.activeEnterprises} active`,
    },
    {
      label: 'Total Users',
      value: analyticsData.totalUsers,
      icon: <Users className={`${iconSize.lg} text-emerald-500`} />,
      accent: 'success' as StatAccent,
      subLabel: 'All roles',
    },
    {
      label: 'Total Assets',
      value: analyticsData.totalAssets,
      icon: <Laptop className={`${iconSize.lg} text-purple-500`} />,
      accent: 'brand' as StatAccent,
      subLabel: 'Platform wide',
    },
    {
      label: 'Total Revenue',
      value: formatCurrency(analyticsData.totalRevenue),
      icon: <IndianRupee className={`${iconSize.lg} text-amber-500`} />,
      accent: 'warning' as StatAccent,
      subLabel: 'All time',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        label="Super Admin"
        title="Platform Analytics"
        subtitle="Real-time insights and platform-wide metrics"
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
              variant="secondary"
              onClick={() => fetchAnalytics()}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </Button>
            <Button
              variant="primary"
              leftIcon={<Download className={iconSize.sm} />}
              onClick={() => {
                // Export analytics data as JSON
                const exportData = {
                  generated_at: new Date().toISOString(),
                  ...analyticsData,
                };
                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `ecotribe-analytics-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
            >
              Export Report
            </Button>
          </div>
        }
      />

      {/* Main Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <DashboardStatGrid items={statItems} columns={4} />
      </motion.div>

      {/* Growth Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className={`font-mono text-xs uppercase tracking-widest ${text.muted}`}>
              Enterprise Growth
            </p>
            <TrendingUp className={`${iconSize.sm} text-emerald-500`} />
          </div>
          <p className={`font-brand text-3xl font-bold ${text.primary}`}>
            +{analyticsData.monthlyGrowth.enterprises}%
          </p>
          <p className={`font-mono text-xs ${text.muted} mt-1`}>vs last month</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className={`font-mono text-xs uppercase tracking-widest ${text.muted}`}>
              User Growth
            </p>
            <TrendingUp className={`${iconSize.sm} text-blue-500`} />
          </div>
          <p className={`font-brand text-3xl font-bold ${text.primary}`}>
            +{analyticsData.monthlyGrowth.users}%
          </p>
          <p className={`font-mono text-xs ${text.muted} mt-1`}>vs last month</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className={`font-mono text-xs uppercase tracking-widest ${text.muted}`}>
              Revenue Growth
            </p>
            <TrendingUp className={`${iconSize.sm} text-amber-500`} />
          </div>
          <p className={`font-brand text-3xl font-bold ${text.primary}`}>
            +{analyticsData.monthlyGrowth.revenue}%
          </p>
          <p className={`font-mono text-xs ${text.muted} mt-1`}>vs last month</p>
        </Card>
      </motion.div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enterprise Status Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <div className="p-6 border-b border-slate-200/80 dark:border-zinc-800">
              <h3 className={`font-brand font-bold text-lg uppercase ${text.primary}`}>
                Enterprise Status
              </h3>
              <p className={`font-mono text-xs ${text.muted} mt-1`}>
                Distribution by status
              </p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-emerald-500"></div>
                    <p className={`font-display text-sm font-bold uppercase ${text.primary}`}>Active</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className={`font-brand text-xl font-bold ${text.primary}`}>
                      {analyticsData.activeEnterprises}
                    </p>
                    <p className={`font-mono text-xs ${text.muted}`}>
                      ({analyticsData.totalEnterprises > 0
                        ? Math.round((analyticsData.activeEnterprises / analyticsData.totalEnterprises) * 100)
                        : 0}%)
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-amber-500"></div>
                    <p className={`font-display text-sm font-bold uppercase ${text.primary}`}>Pending</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className={`font-brand text-xl font-bold ${text.primary}`}>
                      {analyticsData.pendingApprovals}
                    </p>
                    <p className={`font-mono text-xs ${text.muted}`}>
                      ({analyticsData.totalEnterprises > 0
                        ? Math.round((analyticsData.pendingApprovals / analyticsData.totalEnterprises) * 100)
                        : 0}%)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* User Role Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <div className="p-6 border-b border-slate-200/80 dark:border-zinc-800">
              <h3 className={`font-brand font-bold text-lg uppercase ${text.primary}`}>
                User Roles
              </h3>
              <p className={`font-mono text-xs ${text.muted} mt-1`}>
                Distribution by role
              </p>
            </div>
            <div className="p-6">
              <div className="text-center py-12">
                <BarChart3 className={`${iconSize.xl} mx-auto ${text.muted} mb-4`} />
                <p className={`font-mono text-sm ${text.muted}`}>
                  Chart visualization coming soon
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <div className="p-6 border-b border-slate-200/80 dark:border-zinc-800">
            <h3 className={`font-brand font-bold text-lg uppercase ${text.primary}`}>
              Platform Activity
            </h3>
            <p className={`font-mono text-xs ${text.muted} mt-1`}>
              Recent platform events and trends
            </p>
          </div>
          <div className="p-12 text-center">
            <p className={`font-mono text-sm ${text.muted}`}>
              Activity timeline coming soon...
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
