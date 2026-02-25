/**
 * Credits Wallet Page - Org Admin Portal
 * V3: View wallet balance, transactions, and request redemptions
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Wallet,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Calendar,
  Loader2,
  Info,
  CreditCard,
  Banknote,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '@/hooks';
import { walletApi } from '@/lib/api/payouts';
import { PageHeader, Badge } from '@/components/ui';
import { text, iconSize, hover as hoverStyles } from '@/lib/design-tokens';
import { format } from 'date-fns';
import Papa from 'papaparse';

// Query key factories
const walletKeys = {
  all: ['wallet'] as const,
  detail: (enterpriseId: string) => [...walletKeys.all, enterpriseId] as const,
};

const transactionKeys = {
  all: ['transactions'] as const,
  list: (enterpriseId: string) => [...transactionKeys.all, enterpriseId] as const,
};

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

  // State
  const [filterType, setFilterType] = useState<string>('all');

  // React Query hooks - using REST API
  const { data: rawWallet, isLoading: walletLoading } = useQuery({
    queryKey: walletKeys.detail(enterpriseId),
    queryFn: async () => {
      const response = await walletApi.get(enterpriseId);
      if (!response.success) {
        // 404 means wallet doesn't exist yet — return null (not an error)
        if (response.error?.code === '404') return null;
        throw new Error(response.error?.message || 'Failed to fetch wallet');
      }
      return response.data ?? null;
    },
    enabled: !!enterpriseId,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: transactionKeys.list(enterpriseId),
    queryFn: async () => {
      const response = await walletApi.getTransactions(enterpriseId, { limit: 100 });
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch transactions');
      }
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
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
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
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 font-semibold text-sm uppercase tracking-wider cursor-default select-none">
            <Banknote className={iconSize.md} />
            Request Redemption
            <span className="ml-1 px-2 py-0.5 text-xs font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Coming Soon
            </span>
          </div>
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
              className={`p-2 ${(hoverStyles as any).subtle || hoverStyles.row} transition-colors`}
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

export default CreditsWallet;
