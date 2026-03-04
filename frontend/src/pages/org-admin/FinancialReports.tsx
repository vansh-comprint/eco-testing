import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Calendar,
  Download,
  Building2,
  Laptop,
  ArrowUpRight,
  ArrowDownRight,
  Loader2
} from 'lucide-react';
import { useAuth, useBranches } from '@/hooks';
import { useInfiniteAssets } from '@/hooks/useAssets';
import Papa from 'papaparse';

type TimeRange = 'week' | 'month' | 'quarter' | 'year';

const TIME_RANGE_DAYS: Record<TimeRange, number> = {
  week: 7,
  month: 30,
  quarter: 90,
  year: 365,
};

function getMonthLabel(date: Date): string {
  return date.toLocaleString('en-US', { month: 'short' });
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

function toISOString(date: Date): string {
  return date.toISOString();
}

export function FinancialReports() {
  const { enterprise } = useAuth();
  const enterpriseId = enterprise?.id || '';
  const { data: branches = [] } = useBranches(enterpriseId);
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [isExporting, setIsExporting] = useState<string | null>(null);

  // Compute date bounds for the current period (server-side filtering)
  const { dateFrom, dateTo, prevDateFrom, prevDateTo } = useMemo(() => {
    const now = new Date();
    const days = TIME_RANGE_DAYS[timeRange];
    const currentCutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const previousCutoff = new Date(now.getTime() - days * 2 * 24 * 60 * 60 * 1000);
    return {
      dateFrom: toISOString(currentCutoff),
      dateTo: toISOString(now),
      prevDateFrom: toISOString(previousCutoff),
      prevDateTo: toISOString(currentCutoff),
    };
  }, [timeRange]);

  // Fetch current period assets with server-side date filtering (limit 500 per page)
  const { data: currentPagesData } = useInfiniteAssets(
    { enterprise_id: enterpriseId, date_from: dateFrom, date_to: dateTo },
    500
  );
  const filteredAssets = useMemo(
    () => currentPagesData?.pages.flatMap(p => p.data ?? []) ?? [],
    [currentPagesData]
  );

  // Fetch previous period assets for growth comparison
  const { data: prevPagesData } = useInfiniteAssets(
    { enterprise_id: enterpriseId, date_from: prevDateFrom, date_to: prevDateTo },
    500
  );
  const previousPeriodAssets = useMemo(
    () => prevPagesData?.pages.flatMap(p => p.data ?? []) ?? [],
    [prevPagesData]
  );

  // Fetch ALL assets (no date filter) for the 6-month trend chart
  const { data: allPagesData } = useInfiniteAssets(
    { enterprise_id: enterpriseId },
    500
  );
  const assets = useMemo(
    () => allPagesData?.pages.flatMap(p => p.data ?? []) ?? [],
    [allPagesData]
  );

  // Export helper function
  const downloadCSV = (data: object[], filename: string) => {
    const csv = Papa.unparse(data);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Calculate metrics from filtered assets
  const completedAssets = useMemo(() => filteredAssets.filter(a => a.status === 'completed'), [filteredAssets]);
  const totalDisbursed = useMemo(() => completedAssets.reduce((sum, a) => sum + (Number(a.final_price) || 0), 0), [completedAssets]);
  const pendingAssets = useMemo(() => filteredAssets.filter(a => a.status === 'final_accepted' || a.status === 'payout_pending'), [filteredAssets]);
  const pendingPayout = useMemo(() => pendingAssets.reduce((sum, a) => sum + (Number(a.final_price) || Number(a.base_price) || 0), 0), [pendingAssets]);
  const avgAssetValue = completedAssets.length > 0 ? totalDisbursed / completedAssets.length : 0;

  // Compute growth percentages by comparing to previous period
  const prevCompleted = useMemo(() => previousPeriodAssets.filter(a => a.status === 'completed'), [previousPeriodAssets]);
  const prevDisbursed = prevCompleted.reduce((sum, a) => sum + (Number(a.final_price) || 0), 0);

  const disbursedGrowth = prevDisbursed > 0
    ? ((totalDisbursed - prevDisbursed) / prevDisbursed) * 100
    : null;
  const assetsGrowth = prevCompleted.length > 0
    ? ((completedAssets.length - prevCompleted.length) / prevCompleted.length) * 100
    : null;

  // Compute real monthly data from all assets (last 6 months)
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: { month: string; key: string; disbursed: number; assets: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = getMonthKey(date);
      months.push({ month: getMonthLabel(date), key, disbursed: 0, assets: 0 });
    }

    // Use all assets (not filtered) for the 6-month trend
    for (const asset of assets) {
      if (asset.status !== 'completed') continue;
      const date = new Date(asset.updated_at || asset.created_at);
      const key = getMonthKey(date);
      const entry = months.find(m => m.key === key);
      if (entry) {
        entry.disbursed += Number(asset.final_price) || 0;
        entry.assets += 1;
      }
    }

    return months;
  }, [assets]);

  const maxDisbursed = Math.max(...monthlyData.map(d => d.disbursed), 1);

  // Branch breakdown - uses filtered assets grouped by branch
  const branchStats = useMemo(() => {
    return branches.map(branch => {
      const branchAssets = filteredAssets.filter(a => a.branch_id === branch.id);
      const completed = branchAssets.filter(a => a.status === 'completed');
      const totalValue = completed.reduce((sum, a) => sum + (Number(a.final_price) || 0), 0);
      const pending = branchAssets.filter(a => a.status === 'final_accepted' || a.status === 'payout_pending');
      const pendingValue = pending.reduce((sum, a) => sum + (Number(a.final_price) || Number(a.base_price) || 0), 0);

      return {
        id: branch.id,
        name: branch.branch_name,
        branchCode: (branch as any).branch_code || '',
        totalAssets: branchAssets.length,
        completedAssets: completed.length,
        totalValue,
        pendingAssets: pending.length,
        pendingValue,
      };
    }).sort((a, b) => b.totalValue - a.totalValue);
  }, [branches, filteredAssets]);

  // Grade distribution from filtered completed assets
  const gradeDistribution = useMemo(() => ({
    A: completedAssets.filter(a => a.grade === 'A').length,
    B: completedAssets.filter(a => a.grade === 'B').length,
    C: completedAssets.filter(a => a.grade === 'C').length,
    D: completedAssets.filter(a => a.grade === 'D').length,
  }), [completedAssets]);

  const totalGraded = Object.values(gradeDistribution).reduce((sum, count) => sum + count, 0);

  // Export functions
  const exportMainReport = () => {
    setIsExporting('main');
    try {
      const data = filteredAssets.map(a => ({
        serial_number: a.serial_number,
        brand: a.brand,
        model: a.model,
        status: a.status,
        grade: a.grade || '-',
        base_price: Number(a.base_price) || 0,
        final_price: Number(a.final_price) || 0,
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
        final_price: Number(a.final_price) || 0,
        completed_at: a.updated_at,
      }));
      downloadCSV(data, 'payout_summary');
    } finally {
      setIsExporting(null);
    }
  };

  const exportBranchReport = () => {
    setIsExporting('enterprise');
    try {
      const data = branchStats.map(b => ({
        branch_name: b.name,
        branch_code: b.branchCode,
        total_assets: b.totalAssets,
        completed_assets: b.completedAssets,
        total_disbursed: b.totalValue,
        pending_assets: b.pendingAssets,
        pending_value: b.pendingValue,
        avg_asset_value: b.completedAssets > 0 ? Math.round(b.totalValue / b.completedAssets) : 0,
      }));
      downloadCSV(data, 'branch_breakdown');
    } finally {
      setIsExporting(null);
    }
  };

  // Helper to render growth badge
  function GrowthBadge({ value, color }: { value: number | null; color: string }) {
    if (value === null) return null;
    const isPositive = value >= 0;
    return (
      <span className={`flex items-center gap-1 font-mono text-xs ${color}`}>
        {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {isPositive ? '+' : ''}{value.toFixed(1)}%
      </span>
    );
  }

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
                    : 'bg-slate-50 dark:bg-white/[0.02] text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white'
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
            <IndianRupee className="w-5 h-5 text-emerald-400" />
            <GrowthBadge value={disbursedGrowth} color="text-emerald-400" />
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
            <GrowthBadge value={assetsGrowth} color="text-blue-400" />
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
        <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <h2 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">
            Monthly Disbursement Trend
          </h2>
          <span className="font-mono text-xs text-slate-500 dark:text-white/50">Last 6 months</span>
        </div>
        <div className="p-5">
          <div className="flex items-end gap-3 sm:gap-6" style={{ height: '220px' }}>
            {monthlyData.map((data, idx) => {
              const barPercent = maxDisbursed > 0 ? (data.disbursed / maxDisbursed) * 100 : 0;
              return (
                <div key={data.key} className="flex-1 flex flex-col items-center h-full">
                  {/* Value label */}
                  <div className="mb-2 text-center">
                    <p className="font-brand font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                      {data.disbursed >= 100000 ? `₹${(data.disbursed / 100000).toFixed(1)}L` : `₹${(data.disbursed / 1000).toFixed(0)}K`}
                    </p>
                    <p className="font-mono text-[10px] text-slate-400 dark:text-white/30">
                      {data.assets} {data.assets === 1 ? 'asset' : 'assets'}
                    </p>
                  </div>
                  {/* Bar area */}
                  <div className="flex-1 w-full flex items-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${barPercent}%` }}
                      transition={{ delay: idx * 0.1, duration: 0.5, ease: 'easeOut' }}
                      className={`w-full transition-colors ${
                        data.disbursed > 0 ? 'bg-ecotribe-primary/80 hover:bg-ecotribe-primary' : 'bg-slate-200/50 dark:bg-white/5'
                      }`}
                      style={{ minHeight: '4px', borderRadius: '2px 2px 0 0' }}
                    />
                  </div>
                  {/* Month label */}
                  <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-white/5 w-full text-center">
                    <span className="font-mono font-bold text-xs text-slate-600 dark:text-white/60 uppercase">{data.month}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branch Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] flex flex-col"
        >
          <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
            <h2 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">
              Branch Breakdown
            </h2>
            {branchStats.length > 0 && (
              <span className="font-mono text-xs text-slate-500 dark:text-white/50">
                {branchStats.length} branches
              </span>
            )}
          </div>
          {/* Summary totals */}
          {branchStats.length > 0 && (
            <div className="p-4 border-b border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/[0.01]">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="font-brand font-bold text-lg text-slate-900 dark:text-white">{branchStats.reduce((s, b) => s + b.totalAssets, 0)}</p>
                  <p className="font-mono text-[10px] text-slate-500 dark:text-white/50 uppercase">Total Assets</p>
                </div>
                <div className="text-center">
                  <p className="font-brand font-bold text-lg text-emerald-400">₹{(branchStats.reduce((s, b) => s + b.totalValue, 0) / 100000).toFixed(1)}L</p>
                  <p className="font-mono text-[10px] text-slate-500 dark:text-white/50 uppercase">Disbursed</p>
                </div>
                <div className="text-center">
                  <p className="font-brand font-bold text-lg text-amber-400">₹{(branchStats.reduce((s, b) => s + b.pendingValue, 0) / 100000).toFixed(1)}L</p>
                  <p className="font-mono text-[10px] text-slate-500 dark:text-white/50 uppercase">Pending</p>
                </div>
              </div>
            </div>
          )}
          <div className="divide-y divide-slate-200/60 dark:divide-white/5 overflow-y-auto max-h-[480px]">
            {branchStats.length > 0 ? branchStats.map((branch, idx) => (
              <div key={branch.id} className="p-4 hover:bg-white/60 dark:hover:bg-white/[0.03] transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 border border-slate-200 dark:border-white/10 bg-white/5 flex items-center justify-center flex-shrink-0">
                    <span className="font-mono font-bold text-xs text-slate-500 dark:text-white/50">{idx + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-sm text-slate-900 dark:text-white truncate">
                      {branch.name}
                      {branch.branchCode && (
                        <span className="font-mono text-xs text-slate-400 dark:text-white/30 ml-2">({branch.branchCode})</span>
                      )}
                    </p>
                    <p className="font-mono text-xs text-slate-500 dark:text-white/50">
                      {branch.totalAssets} total • {branch.completedAssets} completed • {branch.pendingAssets} pending
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2.5 border border-emerald-400/20 bg-emerald-400/5">
                    <p className="font-mono text-[10px] text-slate-500 dark:text-white/50 uppercase">Disbursed</p>
                    <p className="font-brand font-bold text-base text-emerald-400">
                      ₹{branch.totalValue >= 100000 ? `${(branch.totalValue / 100000).toFixed(1)}L` : `${(branch.totalValue / 1000).toFixed(0)}K`}
                    </p>
                  </div>
                  <div className="p-2.5 border border-amber-400/20 bg-amber-400/5">
                    <p className="font-mono text-[10px] text-slate-500 dark:text-white/50 uppercase">Pending</p>
                    <p className="font-brand font-bold text-base text-amber-400">
                      ₹{branch.pendingValue >= 100000 ? `${(branch.pendingValue / 100000).toFixed(1)}L` : `${(branch.pendingValue / 1000).toFixed(0)}K`}
                    </p>
                  </div>
                </div>
              </div>
            )) : (
              <div className="p-8 text-center">
                <p className="font-mono text-xs text-slate-500 dark:text-white/50">No branch data for this period</p>
              </div>
            )}
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
                      <span className="font-display text-slate-900 dark:text-white">Grade {grade}</span>
                    </div>
                    <span className="font-mono text-sm text-slate-500 dark:text-white/50">
                      {count} assets ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-3 bg-slate-200 dark:bg-white/10">
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
          onClick={exportBranchReport}
          disabled={isExporting === 'enterprise'}
          className="interactive border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-5 text-left hover:border-white/20 transition-all group disabled:opacity-50"
        >
          {isExporting === 'enterprise' ? (
            <Loader2 className="w-6 h-6 text-ecotribe-primary mb-3 animate-spin" />
          ) : (
            <Download className="w-6 h-6 text-ecotribe-primary mb-3" />
          )}
          <h3 className="font-display font-bold text-slate-900 dark:text-white uppercase group-hover:text-ecotribe-primary transition-colors">
            Branch Report
          </h3>
          <p className="font-mono text-xs text-slate-500 dark:text-white/50 mt-1">
            Per-branch financial breakdown
          </p>
        </button>
      </motion.div>
    </div>
  );
}

export default FinancialReports;
