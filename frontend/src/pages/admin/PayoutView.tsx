import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  IndianRupee,
  Clock,
  CheckCircle,
  Download,
  TrendingUp,
  Building,
  CreditCard,
  Info,
  Loader2
} from 'lucide-react';
import { useAuth, usePayouts } from '@/hooks';
import { format } from 'date-fns';

type PayoutStatus = 'pending' | 'processing' | 'processed' | 'completed' | 'failed';

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Processing', value: 'processing' },
  { label: 'Completed', value: 'completed' },
];

interface Payout {
  id: string;
  enterprise_id: string;
  batch_id?: string;
  asset_ids: string[];
  amount: number;
  status: PayoutStatus;
  transaction_id?: string;
  processed_by?: string;
  processed_at?: string;
  created_at: string;
  reference_id?: string;
  items?: Array<{ asset_id: string; amount: number; description?: string }>;
  batches?: { id: string; name: string } | null;
  processed_by_user?: { id: string; name: string; email: string } | null;
}

export function PayoutView() {
  // V3: Use React Query hook for auth
  const { enterprise } = useAuth();
  const [statusFilter, setStatusFilter] = useState('');

  // V3.2: Fetch real payout data from database
  const enterpriseId = enterprise?.id || '';
  const { data: payouts = [], isLoading } = usePayouts(enterpriseId);

  const filteredPayouts = statusFilter
    ? payouts.filter((p: Payout) => p.status === statusFilter)
    : payouts;

  // Stats
  const stats = {
    totalEarned: payouts.filter((p: Payout) => p.status === 'completed').reduce((sum: number, p: Payout) => sum + Number(p.amount), 0),
    pending: payouts.filter((p: Payout) => p.status === 'pending').reduce((sum: number, p: Payout) => sum + Number(p.amount), 0),
    processing: payouts.filter((p: Payout) => p.status === 'processing').reduce((sum: number, p: Payout) => sum + Number(p.amount), 0),
    completedCount: payouts.filter((p: Payout) => p.status === 'completed').length,
  };

  const getStatusConfig = (status: PayoutStatus) => {
    const configs: Record<PayoutStatus, { label: string; color: string; icon: React.ReactNode }> = {
      pending: { label: 'Pending', color: 'text-amber-400', icon: <Clock className="w-5 h-5" /> },
      processing: { label: 'Processing', color: 'text-blue-400', icon: <CreditCard className="w-5 h-5" /> },
      processed: { label: 'Processed', color: 'text-blue-400', icon: <CreditCard className="w-5 h-5" /> },
      completed: { label: 'Completed', color: 'text-emerald-400', icon: <CheckCircle className="w-5 h-5" /> },
      failed: { label: 'Failed', color: 'text-red-400', icon: <Clock className="w-5 h-5" /> },
    };
    return configs[status] || configs.pending;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-white/10 pb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-2">Earnings</span>
          <h1 className="font-brand font-bold text-3xl md:text-4xl text-white uppercase tracking-tight">
            Payouts
          </h1>
          <p className="font-display text-zinc-500 text-sm mt-2 uppercase tracking-wide">Track your earnings and payment history</p>
        </motion.div>
      </div>

      {/* Stats Grid - Protocol Style */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 border-l border-t border-slate-200 dark:border-white/10"
      >
        <div className="p-8 border-r border-b border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors group bg-ecotribe-primary/5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-mono font-bold text-[10px] text-zinc-600 uppercase tracking-widest group-hover:text-ecotribe-primary transition-colors">Total Earned</h4>
            <TrendingUp className="w-4 h-4 text-ecotribe-primary" />
          </div>
          <div className="font-brand font-bold text-3xl md:text-4xl text-ecotribe-primary">
            ₹{(stats.totalEarned / 100000).toFixed(2)}L
          </div>
        </div>
        <div className="p-8 border-r border-b border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors group">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-mono font-bold text-[10px] text-zinc-600 uppercase tracking-widest group-hover:text-ecotribe-primary transition-colors">Pending</h4>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="font-brand font-bold text-3xl md:text-4xl text-amber-400">
            ₹{(stats.pending / 1000).toFixed(0)}K
          </div>
        </div>
        <div className="p-8 border-r border-b border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors group">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-mono font-bold text-[10px] text-zinc-600 uppercase tracking-widest group-hover:text-ecotribe-primary transition-colors">Processing</h4>
            <CreditCard className="w-4 h-4 text-blue-400" />
          </div>
          <div className="font-brand font-bold text-3xl md:text-4xl text-blue-400">
            ₹{(stats.processing / 1000).toFixed(0)}K
          </div>
        </div>
        <div className="p-8 border-r border-b border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors group">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-mono font-bold text-[10px] text-zinc-600 uppercase tracking-widest group-hover:text-ecotribe-primary transition-colors">Completed Payouts</h4>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-brand font-bold text-3xl md:text-4xl text-emerald-400">
            {stats.completedCount}
          </div>
        </div>
      </motion.div>

      {/* Bank Account Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="border border-white/10 bg-slate-50 dark:bg-white/[0.02] p-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 border border-white/10 flex items-center justify-center">
              <Building className="w-6 h-6 text-zinc-600" />
            </div>
            <div>
              <p className="font-display font-bold text-sm text-white uppercase tracking-wide">Payout Account</p>
              <p className="font-mono text-xs text-zinc-600">
                {enterprise?.name || 'TechCorp Pvt Ltd'} • HDFC Bank ****6789
              </p>
            </div>
          </div>
          <button className="interactive px-4 py-2 text-zinc-500 hover:text-ecotribe-primary font-mono font-bold text-xs uppercase tracking-widest transition-colors">
            Update
          </button>
        </div>
      </motion.div>

      {/* Filter */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex items-center justify-between"
      >
        <h2 className="font-display font-bold text-lg text-white uppercase tracking-wide">Payout History</h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-slate-50 dark:bg-white/[0.02] border border-white/10 text-white font-mono text-xs uppercase tracking-widest focus:outline-none focus:border-ecotribe-primary/50 transition-colors appearance-none cursor-pointer min-w-[150px]"
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value} className="bg-[#0a0a0a]">{opt.label}</option>
          ))}
        </select>
      </motion.div>

      {/* Payout List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-4"
      >
        {isLoading ? (
          <div className="border border-white/10 bg-slate-50 dark:bg-white/[0.02] py-16 text-center">
            <Loader2 className="w-8 h-8 text-ecotribe-primary animate-spin mx-auto mb-4" />
            <p className="font-mono text-xs text-zinc-600 uppercase tracking-wide">Loading payouts...</p>
          </div>
        ) : filteredPayouts.length > 0 ? (
          filteredPayouts.map((payout: Payout, index: number) => {
            const statusConfig = getStatusConfig(payout.status);
            const batchName = payout.batches?.name || payout.reference_id || `Payout #${payout.id.slice(0, 8)}`;
            const assetCount = payout.asset_ids?.length || 0;

            return (
              <motion.div
                key={payout.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 * Math.min(index, 10) }}
                className="border border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-white/20 transition-colors"
              >
                <div className="p-5">
                  <div className="flex items-center gap-5">
                    {/* Status Icon */}
                    <div className={`w-14 h-14 border flex items-center justify-center flex-shrink-0 ${
                      payout.status === 'completed' ? 'border-emerald-500/30 bg-emerald-500/10' :
                      payout.status === 'processing' || payout.status === 'processed' ? 'border-blue-500/30 bg-blue-500/10' :
                      payout.status === 'failed' ? 'border-red-500/30 bg-red-500/10' :
                      'border-amber-500/30 bg-amber-500/10'
                    }`}>
                      <span className={statusConfig.color}>{statusConfig.icon}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-display font-bold text-sm text-white uppercase tracking-wide">{batchName}</h3>
                        <span className={`flex items-center gap-1 font-mono font-bold text-[10px] uppercase tracking-widest ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 font-mono text-xs text-zinc-600">
                        <span>{assetCount} asset{assetCount !== 1 ? 's' : ''}</span>
                        <span>•</span>
                        {payout.status === 'completed' && payout.processed_at ? (
                          <span>Processed {format(new Date(payout.processed_at), 'MMM d, yyyy')}</span>
                        ) : (
                          <span>Created {format(new Date(payout.created_at), 'MMM d, yyyy')}</span>
                        )}
                        {payout.transaction_id && (
                          <>
                            <span>•</span>
                            <span>{payout.transaction_id}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right">
                      <p className={`font-brand font-bold text-2xl ${
                        payout.status === 'completed' ? 'text-emerald-400' : 'text-white'
                      }`}>
                        ₹{Number(payout.amount).toLocaleString()}
                      </p>
                      {payout.status === 'completed' && (
                        <button className="interactive mt-2 font-mono text-xs text-zinc-600 hover:text-ecotribe-primary uppercase tracking-widest flex items-center gap-1.5 ml-auto transition-colors">
                          <Download className="w-3 h-3" />
                          Receipt
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="border border-white/10 bg-slate-50 dark:bg-white/[0.02] py-16 text-center">
            <div className="w-16 h-16 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <IndianRupee className="w-8 h-8 text-zinc-600" />
            </div>
            <p className="font-display font-bold text-white uppercase tracking-wide mb-1">No payouts found</p>
            <p className="font-mono text-xs text-zinc-600">
              {statusFilter ? 'Try a different filter' : 'Your payouts will appear here when batches are processed'}
            </p>
          </div>
        )}
      </motion.div>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="border border-blue-400/20 bg-blue-400/5 p-5"
      >
        <div className="flex gap-4">
          <div className="w-10 h-10 border border-blue-400/30 flex items-center justify-center flex-shrink-0">
            <Info className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="font-display font-bold text-sm text-white uppercase tracking-wide mb-1">Payment Schedule</p>
            <p className="font-mono text-xs text-zinc-500">
              Payouts are processed every Friday for all completed batches.
              Bank transfers typically take 2-3 business days to reflect.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default PayoutView;
