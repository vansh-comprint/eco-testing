import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Download,
  Building2,
  Laptop,
  ArrowUpRight,
  ArrowDownRight,
  Loader2
} from 'lucide-react';
import { useAuth, useAllAssets, useEnterprises } from '@/hooks';
import Papa from 'papaparse';

type TimeRange = 'week' | 'month' | 'quarter' | 'year';

export function FinancialReports() {
  const { enterprise } = useAuth();
  const { data: assets = [] } = useAllAssets();
  const { data: enterprises = [] } = useEnterprises();
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [isExporting, setIsExporting] = useState<string | null>(null);

  // Export helper function
  const downloadCSV = (data: object[], filename: string) => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Export functions
  const exportMainReport = () => {
    setIsExporting('main');
    try {
      const data = assets.map(a => ({
        serial_number: a.serial_number,
        brand: a.brand,
        model: a.model,
        status: a.status,
        grade: a.grade || '-',
        base_price: a.base_price || 0,
        final_price: a.final_price || 0,
        enterprise_id: a.enterprise_id,
        created_at: a.created_at,
        updated_at: a.updated_at,
      }));
      downloadCSV(data, `financial_report_${timeRange}`);
    } finally {
      setIsExporting(null);
    }
  };

  const exportMonthlyStatement = () => {
    setIsExporting('monthly');
    try {
      const data = monthlyData.map(m => ({
        month: m.month,
        total_disbursed: m.disbursed,
        assets_processed: m.assets,
        avg_per_asset: m.assets > 0 ? Math.round(m.disbursed / m.assets) : 0,
      }));
      downloadCSV(data, 'monthly_statement');
    } finally {
      setIsExporting(null);
    }
  };

  const exportPayoutSummary = () => {
    setIsExporting('payout');
    try {
      const data = completedAssets.map(a => ({
        serial_number: a.serial_number,
        brand: a.brand,
        model: a.model,
        grade: a.grade || '-',
        final_price: a.final_price || 0,
        enterprise_id: a.enterprise_id,
        completed_at: a.updated_at,
      }));
      downloadCSV(data, 'payout_summary');
    } finally {
      setIsExporting(null);
    }
  };

  const exportEnterpriseReport = () => {
    setIsExporting('enterprise');
    try {
      const data = enterpriseStats.map(e => ({
        enterprise_name: e.name,
        completed_assets: e.completedAssets,
        total_disbursed: e.totalValue,
        pending_assets: e.pendingAssets,
        pending_value: e.pendingValue,
        avg_asset_value: e.completedAssets > 0 ? Math.round(e.totalValue / e.completedAssets) : 0,
      }));
      downloadCSV(data, 'enterprise_breakdown');
    } finally {
      setIsExporting(null);
    }
  };

  // Calculate metrics - V3: Use snake_case field names from database
  const completedAssets = assets.filter(a => a.status === 'completed');
  const totalDisbursed = completedAssets.reduce((sum, a) => sum + (a.final_price || 0), 0);
  const pendingAssets = assets.filter(a => a.status === 'final_accepted' || a.status === 'payout_pending');
  const pendingPayout = pendingAssets.reduce((sum, a) => sum + (a.final_price || a.base_price || 0), 0);
  const avgAssetValue = completedAssets.length > 0 ? totalDisbursed / completedAssets.length : 0;

  // Mock monthly data for chart
  const monthlyData = [
    { month: 'Jul', disbursed: 245000, assets: 12 },
    { month: 'Aug', disbursed: 312000, assets: 18 },
    { month: 'Sep', disbursed: 289000, assets: 15 },
    { month: 'Oct', disbursed: 425000, assets: 23 },
    { month: 'Nov', disbursed: 378000, assets: 20 },
    { month: 'Dec', disbursed: totalDisbursed || 156000, assets: completedAssets.length || 8 },
  ];

  const maxDisbursed = Math.max(...monthlyData.map(d => d.disbursed));

  // Enterprise breakdown - V3: Use snake_case field names
  const enterpriseStats = enterprises.map(ent => {
    const enterpriseAssets = assets.filter(a => a.enterprise_id === ent.id);
    const completed = enterpriseAssets.filter(a => a.status === 'completed');
    const totalValue = completed.reduce((sum, a) => sum + (a.final_price || 0), 0);
    const pending = enterpriseAssets.filter(a => a.status === 'final_accepted' || a.status === 'payout_pending');
    const pendingValue = pending.reduce((sum, a) => sum + (a.final_price || a.base_price || 0), 0);

    return {
      ...ent,
      completedAssets: completed.length,
      totalValue,
      pendingAssets: pending.length,
      pendingValue,
    };
  }).sort((a, b) => b.totalValue - a.totalValue);

  // Grade distribution
  const gradeDistribution = {
    A: completedAssets.filter(a => a.grade === 'A').length,
    B: completedAssets.filter(a => a.grade === 'B').length,
    C: completedAssets.filter(a => a.grade === 'C').length,
    D: completedAssets.filter(a => a.grade === 'D').length,
  };

  const totalGraded = Object.values(gradeDistribution).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-2">
            Financial Analytics
          </span>
          <h1 className="font-brand font-bold text-3xl text-slate-900 dark:text-white uppercase tracking-tight">
            Reports
          </h1>
          <p className="font-display text-slate-500 dark:text-white/50 text-sm mt-2 uppercase tracking-wide">
            Financial performance and analytics
          </p>
        </motion.div>

        <div className="flex gap-3">
          <div className="flex border border-slate-200 dark:border-white/10">
            {(['week', 'month', 'quarter', 'year'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 font-mono font-bold text-xs uppercase tracking-widest transition-all ${
                  timeRange === range
                    ? 'bg-ecotribe-primary text-black'
                    : 'bg-slate-50 dark:bg-white/[0.02] text-slate-500 dark:text-white/50 hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <button 
            onClick={exportMainReport}
            disabled={isExporting === 'main'}
            className="interactive px-4 py-2 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-white/[0.05] transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isExporting === 'main' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="border border-emerald-400/30 bg-emerald-400/5 p-5">
          <div className="flex items-center justify-between mb-3">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <span className="flex items-center gap-1 font-mono text-xs text-emerald-400">
              <ArrowUpRight className="w-3 h-3" />
              +12.5%
            </span>
          </div>
          <p className="font-brand font-bold text-3xl text-emerald-400">
            ₹{(totalDisbursed / 100000).toFixed(2)}L
          </p>
          <p className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase mt-1">Total Disbursed</p>
        </div>

        <div className="border border-amber-400/30 bg-amber-400/5 p-5">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            <span className="flex items-center gap-1 font-mono text-xs text-amber-400">
              {pendingAssets.length} assets
            </span>
          </div>
          <p className="font-brand font-bold text-3xl text-amber-400">
            ₹{(pendingPayout / 100000).toFixed(2)}L
          </p>
          <p className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase mt-1">Pending Payout</p>
        </div>

        <div className="border border-blue-400/30 bg-blue-400/5 p-5">
          <div className="flex items-center justify-between mb-3">
            <Laptop className="w-5 h-5 text-blue-400" />
            <span className="flex items-center gap-1 font-mono text-xs text-blue-400">
              <ArrowUpRight className="w-3 h-3" />
              +8.3%
            </span>
          </div>
          <p className="font-brand font-bold text-3xl text-blue-400">
            {completedAssets.length}
          </p>
          <p className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase mt-1">Assets Processed</p>
        </div>

        <div className="border border-purple-400/30 bg-purple-400/5 p-5">
          <div className="flex items-center justify-between mb-3">
            <BarChart3 className="w-5 h-5 text-purple-400" />
          </div>
          <p className="font-brand font-bold text-3xl text-purple-400">
            ₹{Math.round(avgAssetValue).toLocaleString()}
          </p>
          <p className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase mt-1">Avg Asset Value</p>
        </div>
      </motion.div>

      {/* Monthly Trend Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]"
      >
        <div className="p-5 border-b border-slate-200 dark:border-white/10">
          <h2 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">
            Monthly Disbursement Trend
          </h2>
        </div>
        <div className="p-5">
          <div className="flex items-end gap-4 h-48">
            {monthlyData.map((data, idx) => (
              <div key={data.month} className="flex-1 flex flex-col items-center gap-2">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(data.disbursed / maxDisbursed) * 100}%` }}
                  transition={{ delay: idx * 0.1, duration: 0.5 }}
                  className="w-full bg-ecotribe-primary/80 hover:bg-ecotribe-primary transition-colors relative group"
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block">
                    <div className="px-2 py-1 bg-white text-black font-mono text-xs whitespace-nowrap">
                      ₹{(data.disbursed / 1000).toFixed(0)}K
                    </div>
                  </div>
                </motion.div>
                <span className="font-mono text-xs text-slate-500 dark:text-white/50">{data.month}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enterprise Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]"
        >
          <div className="p-5 border-b border-slate-200 dark:border-white/10">
            <h2 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">
              Enterprise Breakdown
            </h2>
          </div>
          <div className="divide-y divide-white/5">
            {enterpriseStats.map((enterprise, idx) => (
              <div key={enterprise.id} className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 border border-slate-200 dark:border-white/10 bg-white/5 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-slate-500 dark:text-white/50" />
                  </div>
                  <div className="flex-1">
                    <p className="font-display font-bold text-white">{enterprise.name}</p>
                    <p className="font-mono text-xs text-slate-500 dark:text-white/50">
                      {enterprise.completedAssets} completed • {enterprise.pendingAssets} pending
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 border border-emerald-400/20 bg-emerald-400/5">
                    <p className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Disbursed</p>
                    <p className="font-brand font-bold text-lg text-emerald-400">
                      ₹{(enterprise.totalValue / 1000).toFixed(0)}K
                    </p>
                  </div>
                  <div className="p-3 border border-amber-400/20 bg-amber-400/5">
                    <p className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Pending</p>
                    <p className="font-brand font-bold text-lg text-amber-400">
                      ₹{(enterprise.pendingValue / 1000).toFixed(0)}K
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Grade Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]"
        >
          <div className="p-5 border-b border-slate-200 dark:border-white/10">
            <h2 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">
              Grade Distribution
            </h2>
          </div>
          <div className="p-5 space-y-4">
            {Object.entries(gradeDistribution).map(([grade, count]) => {
              const percentage = totalGraded > 0 ? (count / totalGraded) * 100 : 0;
              const colors: Record<string, string> = {
                A: 'bg-emerald-400',
                B: 'bg-blue-400',
                C: 'bg-amber-400',
                D: 'bg-red-400',
              };

              return (
                <div key={grade}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-8 h-8 flex items-center justify-center font-brand font-bold text-lg ${
                        grade === 'A' ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' :
                        grade === 'B' ? 'text-blue-400 border-blue-400/30 bg-blue-400/10' :
                        grade === 'C' ? 'text-amber-400 border-amber-400/30 bg-amber-400/10' :
                        'text-red-400 border-red-400/30 bg-red-400/10'
                      } border`}>
                        {grade}
                      </span>
                      <span className="font-display text-white">Grade {grade}</span>
                    </div>
                    <span className="font-mono text-sm text-slate-500 dark:text-white/50">
                      {count} assets ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-3 bg-white/10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                      className={`h-full ${colors[grade]}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="p-5 border-t border-slate-200 dark:border-white/10">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Total Graded</p>
                <p className="font-brand font-bold text-xl text-slate-900 dark:text-white">{totalGraded}</p>
              </div>
              <div>
                <p className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Avg Grade</p>
                <p className="font-brand font-bold text-xl text-ecotribe-primary">
                  {totalGraded > 0 ? (
                    gradeDistribution.A > gradeDistribution.B ? 'A' :
                    gradeDistribution.B > gradeDistribution.C ? 'B' :
                    gradeDistribution.C > gradeDistribution.D ? 'C' : 'D'
                  ) : '-'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick Reports */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <button 
          onClick={exportMonthlyStatement}
          disabled={isExporting === 'monthly'}
          className="interactive border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-5 text-left hover:border-white/20 transition-all group disabled:opacity-50"
        >
          {isExporting === 'monthly' ? (
            <Loader2 className="w-6 h-6 text-ecotribe-primary mb-3 animate-spin" />
          ) : (
            <Download className="w-6 h-6 text-ecotribe-primary mb-3" />
          )}
          <h3 className="font-display font-bold text-slate-900 dark:text-white uppercase group-hover:text-ecotribe-primary transition-colors">
            Monthly Statement
          </h3>
          <p className="font-mono text-xs text-slate-500 dark:text-white/50 mt-1">
            Download detailed monthly report
          </p>
        </button>

        <button 
          onClick={exportPayoutSummary}
          disabled={isExporting === 'payout'}
          className="interactive border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-5 text-left hover:border-white/20 transition-all group disabled:opacity-50"
        >
          {isExporting === 'payout' ? (
            <Loader2 className="w-6 h-6 text-ecotribe-primary mb-3 animate-spin" />
          ) : (
            <Download className="w-6 h-6 text-ecotribe-primary mb-3" />
          )}
          <h3 className="font-display font-bold text-slate-900 dark:text-white uppercase group-hover:text-ecotribe-primary transition-colors">
            Payout Summary
          </h3>
          <p className="font-mono text-xs text-slate-500 dark:text-white/50 mt-1">
            Export all payout transactions
          </p>
        </button>

        <button 
          onClick={exportEnterpriseReport}
          disabled={isExporting === 'enterprise'}
          className="interactive border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-5 text-left hover:border-white/20 transition-all group disabled:opacity-50"
        >
          {isExporting === 'enterprise' ? (
            <Loader2 className="w-6 h-6 text-ecotribe-primary mb-3 animate-spin" />
          ) : (
            <Download className="w-6 h-6 text-ecotribe-primary mb-3" />
          )}
          <h3 className="font-display font-bold text-slate-900 dark:text-white uppercase group-hover:text-ecotribe-primary transition-colors">
            Enterprise Report
          </h3>
          <p className="font-mono text-xs text-slate-500 dark:text-white/50 mt-1">
            Per-enterprise financial breakdown
          </p>
        </button>
      </motion.div>
    </div>
  );
}

export default FinancialReports;
