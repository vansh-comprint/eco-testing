import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IndianRupee,
  Search,
  Building2,
  CheckCircle,
  Clock,
  Laptop,
  Download,
  Send,
  FileText,
  X,
  Printer,
  Wallet,
  Landmark,
  Smartphone,
  Lock
} from 'lucide-react';
import { useInfiniteAssets, useAllBatches, useCreatePayout } from '@/hooks';
import { assetKeys } from '@/hooks/useAssets';
import { payoutKeys } from '@/hooks/usePayouts';
import { useOpsEnterprise } from '@/contexts/OpsEnterpriseContext';
import { assetsApi } from '@/lib/api/assets';
import { useQueryClient } from '@tanstack/react-query';
import { LOGISTICS_CHARGE } from '@/types/payout';
import { ConfirmationModal, useToast } from '@/components/ui';

type PayoutFilter = 'all' | 'pending' | 'processing' | 'completed';

export function PayoutProcessing() {
  const queryClient = useQueryClient();
  const { data: batches = [] } = useAllBatches();
  const { selectedEnterpriseId, isAllEnterprises, enterprises, selectedEnterprise } = useOpsEnterprise();
  const createPayoutMutation = useCreatePayout();
  const { addToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PayoutFilter>('pending');
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  // Server-side filtered queries — no more 100-asset limit
  const enterpriseFilter = (!isAllEnterprises && selectedEnterpriseId) ? selectedEnterpriseId : undefined;
  const { data: finalAcceptedData } = useInfiniteAssets({ status: 'final_accepted', enterprise_id: enterpriseFilter }, 100);
  const { data: payoutPendingData } = useInfiniteAssets({ status: 'payout_pending', enterprise_id: enterpriseFilter }, 100);
  const { data: completedData } = useInfiniteAssets({ status: 'completed', enterprise_id: enterpriseFilter }, 100);

  // Combine all payout-relevant assets
  const assets = useMemo(() => {
    const finalAccepted = finalAcceptedData?.pages.flatMap(p => p.data || []) ?? [];
    const payoutPending = payoutPendingData?.pages.flatMap(p => p.data || []) ?? [];
    const completed = completedData?.pages.flatMap(p => p.data || []) ?? [];
    return [...finalAccepted, ...payoutPending, ...completed];
  }, [finalAcceptedData, payoutPendingData, completedData]);

  const payoutAssets = assets;

  const [certificateEnterprise, setCertificateEnterprise] = useState<{ id: string; name: string; assets: typeof assets } | null>(null);

  // Apply filters
  const filteredAssets = payoutAssets
    .filter(a => {
      if (statusFilter === 'pending') return a.status === 'final_accepted' || a.status === 'payout_pending';
      if (statusFilter === 'completed') return a.status === 'completed';
      return true;
    })
    .filter(a =>
      (a.brand || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.model || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.serial_number || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

  const getEnterpriseName = (enterpriseId?: string) => {
    if (!enterpriseId) return 'Unknown';
    const enterprise = enterprises.find(e => e.id === enterpriseId);
    return enterprise?.name || 'Unknown';
  };

  const getBatchInfo = (batchId?: string) => {
    if (!batchId) return null;
    return batches.find(b => b.id === batchId);
  };

  const openCertificateModal = (enterpriseId: string, enterpriseAssets: typeof assets) => {
    const completedAssets = enterpriseAssets.filter(a => a.status === 'completed');
    if (completedAssets.length === 0) return;
    setCertificateEnterprise({
      id: enterpriseId,
      name: getEnterpriseName(enterpriseId),
      assets: completedAssets,
    });
    setShowCertificateModal(true);
  };

  const printCertificate = () => {
    window.print();
  };

  const calculatePayout = (asset: typeof assets[0]) => {
    const basePrice = asset.base_price || 0;
    const gradeModifier = asset.grade
      ? { A: 0, B: -500, C: -1500, D: -3000, F: -5000 }[asset.grade] || 0
      : 0;
    const finalAmount = Math.max(0, basePrice + gradeModifier - LOGISTICS_CHARGE);
    return { basePrice, gradeModifier, logistics: LOGISTICS_CHARGE, finalAmount };
  };

  // Helper to safely get payout value, ensuring non-negative
  const getPayoutValue = (asset: typeof assets[0]) => {
    const storedPrice = asset.final_price;
    if (storedPrice != null && storedPrice > 0) return storedPrice;
    return calculatePayout(asset).finalAmount;
  };

  const toggleAssetSelection = (assetId: string) => {
    setSelectedAssets(prev =>
      prev.includes(assetId)
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const selectAllPending = () => {
    const pendingIds = filteredAssets
      .filter(a => a.status !== 'completed')
      .map(a => a.id);
    setSelectedAssets(pendingIds);
  };

  const processSelectedPayouts = async () => {
    setIsProcessing(true);
    try {
      // Group selected assets by enterprise for batch payout creation
      const selectedByEnterprise = selectedAssets.reduce((acc, assetId) => {
        const asset = assets.find(a => a.id === assetId);
        if (!asset) return acc;
        const key = asset.enterprise_id || 'unknown';
        if (!acc[key]) acc[key] = [];
        acc[key].push(asset);
        return acc;
      }, {} as Record<string, typeof assets>);

      // Process per enterprise: transition assets FIRST, then create payout (credits wallet)
      for (const [enterpriseId, enterpriseAssets] of Object.entries(selectedByEnterprise)) {
        const totalAmount = enterpriseAssets.reduce(
          (sum, a) => sum + calculatePayout(a).finalAmount, 0
        );

        // Step 1: Transition all assets to payout_pending (safe — no money moves yet)
        for (const asset of enterpriseAssets) {
          if (asset.status === 'final_accepted') {
            const res = await assetsApi.update(asset.id, { status: 'payout_pending' });
            if (!res.success) {
              console.error(`Failed to move asset ${asset.id} to payout_pending:`, res.error);
            }
          }
        }

        // Step 2: Create payout record (this credits the enterprise wallet instantly)
        await createPayoutMutation.mutateAsync({
          enterprise_id: enterpriseId,
          amount: totalAmount,
        });

        // Step 3: Transition all assets to completed with final price
        for (const asset of enterpriseAssets) {
          const payoutInfo = calculatePayout(asset);
          const res = await assetsApi.update(asset.id, {
            status: 'completed',
            final_price: payoutInfo.finalAmount,
          });
          if (!res.success) {
            console.error(`Failed to complete asset ${asset.id}:`, res.error);
          }
        }
      }

      // Refetch assets and payouts to update the UI
      await queryClient.refetchQueries({ queryKey: assetKeys.all });
      await queryClient.refetchQueries({ queryKey: payoutKeys.all });

      addToast({
        type: 'success',
        title: 'Payouts Processed',
        message: `₹${totalSelectedValue.toLocaleString()} credited to enterprise wallet(s) successfully.`,
        duration: 5000,
      });
      setSelectedAssets([]);
      setShowConfirmModal(false);
    } catch (error) {
      console.error('Failed to process payouts:', error);
      addToast({
        type: 'error',
        title: 'Payout Processing Failed',
        message: error instanceof Error ? error.message : 'Failed to process payouts. Please try again.',
        duration: 6000,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const totalSelectedValue = selectedAssets.reduce((sum, id) => {
    const asset = assets.find(a => a.id === id);
    if (!asset) return sum;
    return sum + calculatePayout(asset).finalAmount;
  }, 0);

  const exportPayoutReport = () => {
    const rows = payoutAssets.map(asset => {
      const payout = calculatePayout(asset);
      return {
        enterprise: getEnterpriseName(asset.enterprise_id),
        serial_number: asset.serial_number || 'N/A',
        brand: asset.brand,
        model: asset.model,
        type: asset.type || '',
        grade: asset.grade || '',
        base_price: payout.basePrice,
        grade_modifier: payout.gradeModifier,
        logistics_charge: payout.logistics,
        payout_amount: payout.finalAmount,
        status: asset.status === 'completed' ? 'Paid' : 'Pending',
        date: new Date().toLocaleDateString('en-IN'),
      };
    });

    if (rows.length === 0) return;

    const headers = [
      'Enterprise', 'Serial Number', 'Brand', 'Model', 'Type', 'Grade',
      'Base Price (₹)', 'Grade Modifier (₹)', 'Logistics (₹)', 'Payout Amount (₹)',
      'Status', 'Date',
    ];
    const csvContent = [
      headers.join(','),
      ...rows.map(r => [
        `"${r.enterprise}"`, `"${r.serial_number}"`, `"${r.brand}"`, `"${r.model}"`,
        `"${r.type}"`, r.grade, r.base_price, r.grade_modifier, r.logistics_charge,
        r.payout_amount, r.status, r.date,
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payout-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Group by enterprise
  const assetsByEnterprise = filteredAssets.reduce((acc, asset) => {
    const key = asset.enterprise_id || 'unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(asset);
    return acc;
  }, {} as Record<string, typeof assets>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-2">
            Finance
          </span>
          <h1 className="font-brand font-bold text-3xl text-slate-900 dark:text-white uppercase tracking-tight">
            Payout Processing
          </h1>
          <p className="font-display text-slate-500 dark:text-white/50 text-sm mt-2 uppercase tracking-wide">
            {isAllEnterprises ? 'Process payments for accepted assets' : `Payouts for ${selectedEnterprise?.name || 'selected enterprise'}`}
          </p>
        </motion.div>
      </div>

      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <div className="border border-amber-400/30 bg-amber-400/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Pending</span>
          </div>
          <p className="font-brand font-bold text-2xl text-amber-400">
            {payoutAssets.filter(a => a.status === 'final_accepted' || a.status === 'payout_pending').length}
          </p>
          <p className="font-mono text-xs text-slate-500 dark:text-white/50 mt-1">
            ₹{(payoutAssets
              .filter(a => a.status === 'final_accepted' || a.status === 'payout_pending')
              .reduce((sum, a) => sum + calculatePayout(a).finalAmount, 0) / 1000).toFixed(0)}K
          </p>
        </div>

        <div className="border border-emerald-400/30 bg-emerald-400/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Completed</span>
          </div>
          <p className="font-brand font-bold text-2xl text-emerald-400">
            {payoutAssets.filter(a => a.status === 'completed').length}
          </p>
          <p className="font-mono text-xs text-slate-500 dark:text-white/50 mt-1">
            ₹{(payoutAssets
              .filter(a => a.status === 'completed')
              .reduce((sum, a) => sum + getPayoutValue(a), 0) / 1000).toFixed(0)}K
          </p>
        </div>

        <div className="border border-blue-400/30 bg-blue-400/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-blue-400" />
            <span className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Enterprises</span>
          </div>
          <p className="font-brand font-bold text-2xl text-blue-400">
            {Object.keys(assetsByEnterprise).length}
          </p>
        </div>

        <div className="border border-ecotribe-primary/30 bg-ecotribe-primary/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <IndianRupee className="w-4 h-4 text-ecotribe-primary" />
            <span className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Total Value</span>
          </div>
          <p className="font-brand font-bold text-2xl text-ecotribe-primary">
            ₹{(payoutAssets.reduce((sum, a) => sum + getPayoutValue(a), 0) / 1000).toFixed(0)}K
          </p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-white/50" />
          <input
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'pending', 'completed'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`interactive px-4 py-3 border font-mono font-bold text-xs uppercase tracking-widest transition-all ${
                statusFilter === filter
                  ? 'border-ecotribe-primary bg-ecotribe-primary/10 text-ecotribe-primary'
                  : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-500 dark:text-white/50 hover:border-slate-300 dark:hover:border-white/20'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Payment Method Selection */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-5"
      >
        <h3 className="font-mono font-bold text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest mb-4">Payment Method</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Wallet - Active */}
          <div className="border-2 border-ecotribe-primary bg-ecotribe-primary/10 p-4 relative">
            <div className="absolute top-2 right-2">
              <span className="px-2 py-0.5 bg-ecotribe-primary text-black font-mono font-bold text-[10px] uppercase tracking-widest">Default</span>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 border border-ecotribe-primary/30 bg-ecotribe-primary/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-ecotribe-primary" />
              </div>
              <div>
                <p className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase">Wallet Credit</p>
                <p className="font-mono text-xs text-slate-500 dark:text-white/50">Instant credit to enterprise wallet</p>
              </div>
            </div>
            <p className="font-mono text-xs text-ecotribe-primary mt-2">Credits appear instantly in enterprise wallet</p>
          </div>

          {/* Bank Transfer - Coming Soon */}
          <div className="border border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-white/[0.01] p-4 opacity-60 relative cursor-not-allowed">
            <div className="absolute top-2 right-2">
              <span className="px-2 py-0.5 border border-slate-300 dark:border-white/20 text-slate-400 dark:text-white/40 font-mono font-bold text-[10px] uppercase tracking-widest flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Coming Soon
              </span>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                <Landmark className="w-5 h-5 text-slate-400 dark:text-white/30" />
              </div>
              <div>
                <p className="font-display font-bold text-sm text-slate-400 dark:text-white/30 uppercase">Bank Transfer</p>
                <p className="font-mono text-xs text-slate-400 dark:text-white/20">Direct bank transfer (NEFT/RTGS)</p>
              </div>
            </div>
            <p className="font-mono text-xs text-slate-400 dark:text-white/20 mt-2">Requires bank account & IFSC code</p>
          </div>

          {/* UPI - Coming Soon */}
          <div className="border border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-white/[0.01] p-4 opacity-60 relative cursor-not-allowed">
            <div className="absolute top-2 right-2">
              <span className="px-2 py-0.5 border border-slate-300 dark:border-white/20 text-slate-400 dark:text-white/40 font-mono font-bold text-[10px] uppercase tracking-widest flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Coming Soon
              </span>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-slate-400 dark:text-white/30" />
              </div>
              <div>
                <p className="font-display font-bold text-sm text-slate-400 dark:text-white/30 uppercase">UPI</p>
                <p className="font-mono text-xs text-slate-400 dark:text-white/20">Instant UPI payment</p>
              </div>
            </div>
            <p className="font-mono text-xs text-slate-400 dark:text-white/20 mt-2">Requires UPI ID (e.g. name@upi)</p>
          </div>
        </div>
      </motion.div>

      {/* Selected Actions Bar */}
      {selectedAssets.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-ecotribe-primary bg-ecotribe-primary/10 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <span className="font-mono font-bold text-sm text-ecotribe-primary">
              {selectedAssets.length} asset{selectedAssets.length > 1 ? 's' : ''} selected
            </span>
            <span className="font-brand font-bold text-xl text-slate-900 dark:text-white">
              ₹{totalSelectedValue.toLocaleString()}
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setSelectedAssets([])}
              className="interactive px-4 py-2 border border-slate-300 dark:border-white/20 text-slate-500 dark:text-white/50 font-mono font-bold text-xs uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-all"
            >
              Clear Selection
            </button>
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              disabled={isProcessing}
              className="interactive px-5 py-2 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Process Payouts
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* Assets by Enterprise */}
      {Object.keys(assetsByEnterprise).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(assetsByEnterprise).map(([enterpriseId, enterpriseAssets], groupIdx) => {
            const enterpriseName = getEnterpriseName(enterpriseId);
            const pendingCount = enterpriseAssets.filter(a => a.status !== 'completed').length;
            const totalValue = enterpriseAssets.reduce((sum, a) => sum + calculatePayout(a).finalAmount, 0);

            return (
              <motion.div
                key={enterpriseId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: groupIdx * 0.1 }}
                className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]"
              >
                <div className="p-5 border-b border-slate-200 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-slate-500 dark:text-white/50" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white uppercase">{enterpriseName}</h3>
                      <p className="font-mono text-xs text-slate-500 dark:text-white/50">
                        {enterpriseAssets.length} assets • {pendingCount} pending
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Total Payout</p>
                      <p className="font-brand font-bold text-xl text-ecotribe-primary">
                        ₹{totalValue.toLocaleString()}
                      </p>
                    </div>
                    {enterpriseAssets.some(a => a.status === 'completed') && (
                      <button
                        type="button"
                        onClick={() => openCertificateModal(enterpriseId, enterpriseAssets)}
                        className="interactive px-4 py-2 border border-emerald-400 text-emerald-400 font-mono font-bold text-xs uppercase tracking-widest hover:bg-emerald-400/10 transition-all flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Certificate
                      </button>
                    )}
                    {pendingCount > 0 && (
                      <button
                        onClick={() => {
                          const ids = enterpriseAssets.filter(a => a.status !== 'completed').map(a => a.id);
                          setSelectedAssets(prev => [...new Set([...prev, ...ids])]);
                        }}
                        className="interactive px-4 py-2 border border-ecotribe-primary text-ecotribe-primary font-mono font-bold text-xs uppercase tracking-widest hover:bg-ecotribe-primary/10 transition-all"
                      >
                        Select All
                      </button>
                    )}
                  </div>
                </div>

                <div className="divide-y divide-slate-200 dark:divide-white/5">
                  {enterpriseAssets.map((asset) => {
                    const payout = calculatePayout(asset);
                    const isSelected = selectedAssets.includes(asset.id);
                    const isPending = asset.status !== 'completed';

                    return (
                      <div
                        key={asset.id}
                        className={`p-4 transition-colors ${
                          isSelected ? 'bg-ecotribe-primary/10' : 'hover:bg-slate-50 dark:hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className="flex items-center gap-3 sm:gap-4">
                          {isPending && (
                            <button
                              onClick={() => toggleAssetSelection(asset.id)}
                              className={`w-7 h-7 sm:w-6 sm:h-6 border flex items-center justify-center transition-all flex-shrink-0 ${
                                isSelected
                                  ? 'border-ecotribe-primary bg-ecotribe-primary text-black'
                                  : 'border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-white/5'
                              }`}
                            >
                              {isSelected && <CheckCircle className="w-4 h-4" />}
                            </button>
                          )}

                          <div className="w-10 h-10 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-center flex-shrink-0 hidden sm:flex">
                            <Laptop className="w-5 h-5 text-slate-500 dark:text-white/50" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-display font-bold text-slate-900 dark:text-white truncate">{asset.brand} {asset.model}</p>
                            <p className="font-mono text-xs text-slate-500 dark:text-white/50">{asset.serial_number}</p>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <p className="font-brand font-bold text-base sm:text-lg text-ecotribe-primary">
                              ₹{payout.finalAmount.toLocaleString()}
                            </p>
                            <span className={`inline-block mt-1 px-2 py-0.5 border font-mono font-bold text-[10px] uppercase tracking-widest ${
                              asset.status === 'completed'
                                ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400'
                                : 'border-amber-400/30 bg-amber-400/10 text-amber-400'
                            }`}>
                              {asset.status === 'completed' ? 'Paid' : 'Pending'}
                            </span>
                          </div>
                        </div>
                        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-white/50 mt-1 ml-[calc(1.75rem+0.75rem+2.5rem+1rem)]">
                          <span>Base: ₹{payout.basePrice.toLocaleString()}</span>
                          {payout.gradeModifier !== 0 && (
                            <span className="text-amber-400">{payout.gradeModifier > 0 ? '+' : ''}{payout.gradeModifier}</span>
                          )}
                          <span className="text-red-400">-{payout.logistics}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] py-20 text-center"
        >
          <div className="w-20 h-20 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-center mx-auto mb-6">
            <IndianRupee className="w-10 h-10 text-slate-500 dark:text-white/50" />
          </div>
          <h3 className="font-brand font-bold text-xl text-slate-500 dark:text-white/50 uppercase tracking-tight mb-2">
            No Payouts Found
          </h3>
          <p className="font-display text-slate-500 dark:text-white/50 max-w-md mx-auto">
            Assets will appear here once they've been accepted through QC.
          </p>
        </motion.div>
      )}

      {/* Export Button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex justify-end"
      >
        <button
          onClick={exportPayoutReport}
          className="interactive px-5 py-2.5 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-all flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </motion.div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={processSelectedPayouts}
        isLoading={isProcessing}
        variant="danger"
        title="Process Payouts?"
        description={`You are about to process payouts for ${selectedAssets.length} asset${selectedAssets.length !== 1 ? 's' : ''} totaling ₹${totalSelectedValue.toLocaleString()}. Credits will be added instantly to the enterprise wallet.`}
        confirmText="Process Payouts"
        details={
          <div className="text-left space-y-1">
            <p className="font-mono text-xs text-slate-500 dark:text-white/60">
              <span className="text-slate-400 dark:text-white/40">Assets:</span> {selectedAssets.length}
            </p>
            <p className="font-mono text-xs text-slate-500 dark:text-white/60">
              <span className="text-slate-400 dark:text-white/40">Total Value:</span> ₹{totalSelectedValue.toLocaleString()}
            </p>
            <p className="font-mono text-xs text-slate-500 dark:text-white/60">
              <span className="text-slate-400 dark:text-white/40">Method:</span> Wallet Credit (Instant)
            </p>
          </div>
        }
      />

      {/* Certificate Modal */}
      <AnimatePresence>
        {showCertificateModal && certificateEnterprise && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:bg-white print:p-0"
            onClick={() => setShowCertificateModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-3xl max-h-[90vh] overflow-auto print:max-w-none print:max-h-none print:overflow-visible"
            >
              {/* Certificate Header - Hide close button when printing */}
              <div className="p-6 border-b border-slate-200 flex items-center justify-between print:border-b-2 print:border-black">
                <div>
                  <h2 className="font-brand font-bold text-2xl text-slate-900 uppercase tracking-tight">
                    Asset Disposal Certificate
                  </h2>
                  <p className="font-mono text-xs text-slate-500 mt-1">
                    Certificate ID: CERT-{certificateEnterprise.id.slice(0, 8).toUpperCase()}-{Date.now().toString(36).toUpperCase()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCertificateModal(false)}
                  className="p-2 hover:bg-slate-100 transition-colors print:hidden"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              {/* Certificate Content */}
              <div className="p-6 space-y-6">
                {/* Enterprise Info */}
                <div className="border border-slate-200 p-4">
                  <p className="font-mono text-xs text-slate-500 uppercase tracking-wider mb-1">Enterprise</p>
                  <p className="font-display font-bold text-xl text-slate-900">{certificateEnterprise.name}</p>
                  <p className="font-mono text-xs text-slate-500 mt-2">
                    Date Generated: {new Date().toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>

                {/* Assets Table */}
                <div className="overflow-x-auto">
                  <p className="font-mono text-xs text-slate-500 uppercase tracking-wider mb-3">Assets Processed</p>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-900">
                        <th className="text-left py-2 font-mono text-xs text-slate-500 uppercase">S.No</th>
                        <th className="text-left py-2 font-mono text-xs text-slate-500 uppercase">Serial Number</th>
                        <th className="text-left py-2 font-mono text-xs text-slate-500 uppercase">Device</th>
                        <th className="text-left py-2 font-mono text-xs text-slate-500 uppercase">Type</th>
                        <th className="text-center py-2 font-mono text-xs text-slate-500 uppercase">Grade</th>
                        <th className="text-right py-2 font-mono text-xs text-slate-500 uppercase">Payout (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {certificateEnterprise.assets.map((asset, idx) => {
                        const payout = calculatePayout(asset);
                        return (
                          <tr key={asset.id} className="border-b border-slate-200">
                            <td className="py-2 font-mono text-sm text-slate-700">{idx + 1}</td>
                            <td className="py-2 font-mono text-sm text-slate-700">{asset.serial_number || 'N/A'}</td>
                            <td className="py-2 font-display text-sm text-slate-900">{asset.brand} {asset.model}</td>
                            <td className="py-2 font-mono text-xs text-slate-500 uppercase">{asset.type}</td>
                            <td className="py-2 text-center">
                              <span className={`inline-block px-2 py-0.5 font-mono font-bold text-xs ${
                                asset.grade === 'A' ? 'bg-emerald-100 text-emerald-700' :
                                asset.grade === 'B' ? 'bg-blue-100 text-blue-700' :
                                asset.grade === 'C' ? 'bg-amber-100 text-amber-700' :
                                asset.grade === 'D' ? 'bg-orange-100 text-orange-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {asset.grade || '-'}
                              </span>
                            </td>
                            <td className="py-2 text-right font-mono text-sm text-slate-900">
                              {getPayoutValue(asset).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-900">
                        <td colSpan={5} className="py-3 text-right font-display font-bold text-slate-900 uppercase">
                          Total Payout
                        </td>
                        <td className="py-3 text-right font-brand font-bold text-xl text-slate-900">
                          ₹{certificateEnterprise.assets.reduce((sum, a) =>
                            sum + getPayoutValue(a), 0
                          ).toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border border-slate-200 p-4">
                  <div>
                    <p className="font-mono text-xs text-slate-500 uppercase">Total Assets</p>
                    <p className="font-brand font-bold text-2xl text-slate-900">{certificateEnterprise.assets.length}</p>
                  </div>
                  <div>
                    <p className="font-mono text-xs text-slate-500 uppercase">Processing Date</p>
                    <p className="font-display font-bold text-lg text-slate-900">
                      {new Date().toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-xs text-slate-500 uppercase">Status</p>
                    <p className="font-mono font-bold text-lg text-emerald-600 uppercase">Completed</p>
                  </div>
                </div>

                {/* Footer Note */}
                <div className="text-center border-t border-slate-200 pt-4">
                  <p className="font-mono text-xs text-slate-400">
                    This certificate confirms the secure disposal and payout processing of the listed IT assets.
                  </p>
                  <p className="font-mono text-xs text-slate-400 mt-1">
                    Generated by EcoTribe IT Asset Management Platform
                  </p>
                </div>
              </div>

              {/* Actions - Hidden when printing */}
              <div className="p-6 border-t border-slate-200 flex justify-end gap-3 print:hidden">
                <button
                  type="button"
                  onClick={() => setShowCertificateModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 font-mono font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={printCertificate}
                  className="px-5 py-2 bg-slate-900 text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-colors flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print / Save PDF
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PayoutProcessing;
