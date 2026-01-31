/**
 * Credits Wallet Page - Org Admin Portal
 * V3: View wallet balance, transactions, and request redemptions
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wallet,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Filter,
  Calendar,
  Building2,
  Loader2,
  Info,
  CreditCard,
  Banknote,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth, useApiError } from '@/hooks';
import { walletApi } from '@/lib/api/payouts';
import { PageHeader, Badge, Modal } from '@/components/ui';
import { text, iconSize, hover as hoverStyles } from '@/lib/design-tokens';
import { format } from 'date-fns';
import Papa from 'papaparse';

// Types
interface EnterpriseWallet {
  id: string;
  enterprise_id: string;
  available_balance: number;
  pending_balance: number;
  total_earned: number;
  total_redeemed: number;
  updated_at: string;
}

interface CreditTransaction {
  id: string;
  enterprise_id: string;
  type: 'credit' | 'debit' | 'pending' | 'release' | 'redemption';
  amount: number;
  description: string;
  reference_type?: string;
  reference_id?: string;
  status: 'completed' | 'pending' | 'cancelled';
  created_at: string;
}

export function CreditsWallet() {
  const { enterprise } = useAuth();
  const enterpriseId = enterprise?.id || '';
  const { handleError, showSuccess } = useApiError();

  // State
  const [isRedemptionModalOpen, setIsRedemptionModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');

  // React Query hooks - using REST API
  const { data: rawWallet, isLoading: walletLoading } = useQuery({
    queryKey: ['wallet', enterpriseId],
    queryFn: async () => {
      const response = await walletApi.get(enterpriseId);
      if (!response.success || !response.data) return null;
      return response.data;
    },
    enabled: !!enterpriseId,
  });

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions', enterpriseId],
    queryFn: async () => {
      const response = await walletApi.getTransactions(enterpriseId, { limit: 100 });
      if (!response.success) return [];
      const data = response.data;
      if (!Array.isArray(data)) return [];
      return data.map(t => ({
        id: t.id,
        enterprise_id: enterpriseId,
        type: t.transaction_type === 'credit' ? 'credit' : t.transaction_type === 'debit' ? 'debit' : (t.transaction_type as CreditTransaction['type']),
        amount: t.amount,
        description: t.description || t.transaction_type,
        reference_type: undefined,
        reference_id: t.reference_id,
        status: 'completed' as const,
        created_at: t.created_at,
      })) as CreditTransaction[];
    },
    enabled: !!enterpriseId,
  });

  // Compute wallet summary from transactions + raw wallet balance
  const wallet: EnterpriseWallet | null = useMemo(() => {
    if (!rawWallet) return null;

    // Compute values from transaction history
    const totalEarned = transactions
      .filter(t => t.type === 'credit' || t.type === 'release')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalRedeemed = transactions
      .filter(t => t.type === 'debit' || t.type === 'redemption')
      .reduce((sum, t) => sum + t.amount, 0);
    const pendingBalance = transactions
      .filter(t => t.type === 'pending' && t.status === 'pending')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      id: rawWallet.id,
      enterprise_id: rawWallet.enterprise_id,
      available_balance: rawWallet.balance ?? 0,
      pending_balance: pendingBalance,
      total_earned: totalEarned > 0 ? totalEarned : (rawWallet.balance ?? 0),
      total_redeemed: totalRedeemed,
      updated_at: rawWallet.updated_at || rawWallet.created_at,
    };
  }, [rawWallet, transactions]);

  const isLoading = walletLoading || transactionsLoading;

  // Filter transactions
  const filteredTransactions = filterType === 'all'
    ? transactions
    : transactions.filter((t: CreditTransaction) => t.type === filterType);

  // Format currency (assuming INR)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Export transactions as CSV
  const exportTransactions = () => {
    const data = filteredTransactions.map(t => ({
      date: format(new Date(t.created_at), 'yyyy-MM-dd HH:mm'),
      type: t.type,
      amount: t.amount,
      description: t.description,
      status: t.status,
      reference: t.reference_id || '-',
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `wallet_transactions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-lime-500 mx-auto mb-4" />
          <p className={`font-display font-bold uppercase tracking-wide ${text.muted}`}>Loading wallet...</p>
        </div>
      </div>
    );
  }

  // No wallet yet
  if (!wallet) {
    return (
      <div className="space-y-6">
        <PageHeader
          label="Finance"
          title="Credits Wallet"
          subtitle="View your credits and request redemptions"
        />
        <div className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 py-16 text-center">
          <Wallet className={`${iconSize['2xl']} mx-auto mb-4 ${text.muted}`} />
          <h3 className={`font-display font-bold text-lg mb-2 ${text.primary}`}>Wallet Not Set Up</h3>
          <p className={`text-sm ${text.muted}`}>Your enterprise wallet will be created when your first asset is processed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        label="Finance"
        title="Credits Wallet"
        subtitle={`Manage your credits and redemptions for ${enterprise?.name}`}
        action={
          <button
            onClick={() => setIsRedemptionModalOpen(true)}
            disabled={wallet.available_balance <= 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-lime-500 hover:bg-lime-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold text-sm uppercase tracking-wider transition-all"
          >
            <Banknote className={iconSize.md} />
            Request Redemption
          </button>
        }
      />

      {/* Wallet Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <WalletCard
          label="Available Balance"
          value={formatCurrency(wallet.available_balance)}
          icon={<Wallet className={iconSize.lg} />}
          accent="brand"
          description="Ready to redeem"
        />
        <WalletCard
          label="Pending Credits"
          value={formatCurrency(wallet.pending_balance)}
          icon={<Clock className={iconSize.lg} />}
          accent="warning"
          description="Processing (30 days)"
        />
        <WalletCard
          label="Total Earned"
          value={formatCurrency(wallet.total_earned)}
          icon={<TrendingUp className={iconSize.lg} />}
          accent="success"
          description="All time"
        />
        <WalletCard
          label="Total Redeemed"
          value={formatCurrency(wallet.total_redeemed)}
          icon={<CreditCard className={iconSize.lg} />}
          accent="info"
          description="Paid out"
        />
      </div>

      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20"
      >
        <Info className={`${iconSize.md} text-blue-600 dark:text-blue-400 mt-0.5`} />
        <div>
          <p className={`text-sm font-medium text-blue-900 dark:text-blue-100`}>How credits work</p>
          <p className={`text-sm text-blue-700 dark:text-blue-300 mt-1`}>
            Credits are added to your pending balance when assets are accepted. After a 30-day holding period,
            they move to your available balance and can be redeemed to your registered bank account.
          </p>
        </div>
      </motion.div>

      {/* Transactions Section */}
      <div className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 shadow-sm">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className={`font-brand font-bold text-base uppercase tracking-wide ${text.primary}`}>
              Transaction History
            </h2>
            <p className={`text-xs ${text.muted} mt-0.5`}>All credit and debit transactions</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Filter Dropdown */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm focus:outline-none focus:border-lime-500/50"
            >
              <option value="all">All Types</option>
              <option value="credit">Credits</option>
              <option value="debit">Debits</option>
              <option value="pending">Pending</option>
              <option value="release">Released</option>
              <option value="redemption">Redemptions</option>
            </select>
            <button
              onClick={exportTransactions}
              className={`p-2 ${hoverStyles.subtle} transition-colors`}
              title="Download transactions as CSV"
            >
              <Download className={iconSize.md} />
            </button>
          </div>
        </div>

        {/* Transaction List */}
        <div className="divide-y divide-slate-200 dark:divide-zinc-800">
          {filteredTransactions.length === 0 ? (
            <div className="py-12 text-center">
              <Calendar className={`${iconSize['2xl']} mx-auto mb-3 ${text.muted}`} />
              <p className={`font-display font-bold uppercase tracking-wide ${text.muted}`}>No transactions</p>
              <p className={`text-xs mt-1 ${text.muted}`}>
                {filterType === 'all' ? 'Transactions will appear here when assets are processed' : 'No transactions of this type'}
              </p>
            </div>
          ) : (
            filteredTransactions.map((transaction: CreditTransaction, index: number) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.02 }}
                className={`flex items-center justify-between px-6 py-4 ${hoverStyles.row}`}
              >
                <div className="flex items-center gap-4">
                  <TransactionIcon type={transaction.type} />
                  <div>
                    <p className={`font-display font-bold text-sm ${text.primary}`}>
                      {transaction.description}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs ${text.muted}`}>
                        {format(new Date(transaction.created_at), 'dd MMM yyyy, h:mm a')}
                      </span>
                      {transaction.reference_id && (
                        <span className={`text-xs font-mono ${text.muted}`}>
                          #{transaction.reference_id.slice(0, 8)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <TransactionStatusBadge status={transaction.status} />
                  <p className={`font-brand text-lg font-bold ${
                    transaction.type === 'debit' || transaction.type === 'redemption'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {transaction.type === 'debit' || transaction.type === 'redemption' ? '-' : '+'}
                    {formatCurrency(transaction.amount)}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Redemption Request Modal */}
      <RedemptionModal
        isOpen={isRedemptionModalOpen}
        onClose={() => setIsRedemptionModalOpen(false)}
        availableBalance={wallet.available_balance}
        enterpriseId={enterpriseId}
      />
    </div>
  );
}

// Wallet Card Component
function WalletCard({
  label,
  value,
  icon,
  accent,
  description
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: 'brand' | 'success' | 'warning' | 'info';
  description: string;
}) {
  const accentStyles = {
    brand: {
      border: 'border-l-lime-500',
      icon: 'text-lime-600 dark:text-lime-400',
      bg: 'bg-lime-500/10',
    },
    success: {
      border: 'border-l-emerald-500',
      icon: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    warning: {
      border: 'border-l-amber-500',
      icon: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10',
    },
    info: {
      border: 'border-l-blue-500',
      icon: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-500/10',
    },
  };

  const style = accentStyles[accent];

  return (
    <div className={`bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 border-l-4 ${style.border} p-5`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 ${style.bg} flex items-center justify-center`}>
          <span className={style.icon}>{icon}</span>
        </div>
      </div>
      <p className={`font-brand text-2xl font-bold ${text.primary}`}>{value}</p>
      <p className={`text-xs font-mono uppercase tracking-wider ${text.muted} mt-1`}>{label}</p>
      <p className={`text-xs ${text.muted} mt-2`}>{description}</p>
    </div>
  );
}

// Transaction Icon Component
function TransactionIcon({ type }: { type: string }) {
  const config: Record<string, { icon: React.ReactNode; bg: string }> = {
    credit: {
      icon: <ArrowDownRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      bg: 'bg-emerald-100 dark:bg-emerald-500/10',
    },
    debit: {
      icon: <ArrowUpRight className="w-4 h-4 text-red-600 dark:text-red-400" />,
      bg: 'bg-red-100 dark:bg-red-500/10',
    },
    pending: {
      icon: <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
      bg: 'bg-amber-100 dark:bg-amber-500/10',
    },
    release: {
      icon: <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
      bg: 'bg-blue-100 dark:bg-blue-500/10',
    },
    redemption: {
      icon: <Banknote className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
      bg: 'bg-purple-100 dark:bg-purple-500/10',
    },
  };

  const { icon, bg } = config[type] || config.credit;

  return (
    <div className={`w-10 h-10 ${bg} flex items-center justify-center`}>
      {icon}
    </div>
  );
}

// Transaction Status Badge
function TransactionStatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: 'default' | 'success' | 'warning' | 'error' }> = {
    completed: { variant: 'success' },
    pending: { variant: 'warning' },
    cancelled: { variant: 'error' },
  };

  const { variant } = config[status] || { variant: 'default' };

  return <Badge variant={variant} size="sm">{status}</Badge>;
}

// Redemption Modal Component
function RedemptionModal({
  isOpen,
  onClose,
  availableBalance,
  enterpriseId
}: {
  isOpen: boolean;
  onClose: () => void;
  availableBalance: number;
  enterpriseId: string;
}) {
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { handleError, showSuccess } = useApiError();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const requestAmount = parseInt(amount) || 0;
    if (requestAmount <= 0 || requestAmount > availableBalance) return;

    setIsSubmitting(true);
    try {
      const response = await walletApi.debit(enterpriseId, {
        amount: requestAmount,
        description: `Redemption request for ${formatCurrency(requestAmount)}`,
      });
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to process redemption');
      }
      showSuccess('Redemption Requested', `${formatCurrency(requestAmount)} will be transferred to your bank account within 3-5 business days.`);
      queryClient.invalidateQueries({ queryKey: ['wallet', enterpriseId] });
      queryClient.invalidateQueries({ queryKey: ['transactions', enterpriseId] });
      setAmount('');
      onClose();
    } catch (error) {
      handleError(error, 'Requesting redemption');
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestAmount = parseInt(amount) || 0;
  const isValidAmount = requestAmount > 0 && requestAmount <= availableBalance;

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request Redemption" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Available Balance Display */}
        <div className="p-4 bg-lime-50 dark:bg-lime-500/10 border border-lime-200 dark:border-lime-500/20">
          <div className="flex items-center justify-between">
            <span className={`text-sm ${text.secondary}`}>Available Balance</span>
            <span className="font-brand text-xl font-bold text-lime-700 dark:text-lime-400">
              {formatCurrency(availableBalance)}
            </span>
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <label className={`block text-sm font-medium mb-1.5 ${text.primary}`}>
            Redemption Amount *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-zinc-500">₹</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              min="1"
              max={availableBalance}
              className="w-full pl-8 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm focus:outline-none focus:border-lime-500/50"
            />
          </div>
          {requestAmount > availableBalance && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Amount exceeds available balance
            </p>
          )}
        </div>

        {/* Quick Amount Buttons */}
        <div className="flex items-center gap-2">
          {[25, 50, 75, 100].map(percent => {
            const quickAmount = Math.floor(availableBalance * percent / 100);
            return (
              <button
                key={percent}
                type="button"
                onClick={() => setAmount(quickAmount.toString())}
                className={`px-3 py-1.5 text-xs font-semibold border ${
                  parseInt(amount) === quickAmount
                    ? 'bg-lime-500 border-lime-500 text-black'
                    : 'border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:border-lime-500/50'
                } transition-colors`}
              >
                {percent}%
              </button>
            );
          })}
        </div>

        {/* Bank Account Info */}
        <div className="p-4 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700">
          <div className="flex items-start gap-3">
            <Building2 className={`${iconSize.md} ${text.muted} mt-0.5`} />
            <div>
              <p className={`text-sm font-medium ${text.primary}`}>Bank Account</p>
              <p className={`text-xs ${text.muted} mt-1`}>
                Funds will be transferred to your registered bank account within 3-5 business days.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isValidAmount || isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-lime-500 hover:bg-lime-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold text-sm uppercase tracking-wider transition-all"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Request {isValidAmount && formatCurrency(requestAmount)}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default CreditsWallet;
