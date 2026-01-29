import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ClipboardCheck, Laptop, Clock, Search, Package, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { useAllAssets, useUpdateAsset } from '@/hooks';
import { useOpsEnterprise } from '@/contexts/OpsEnterpriseContext';

export function QCQueue() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: assets = [] } = useAllAssets();
  const updateAssetMutation = useUpdateAsset();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  // Try to get OpsEnterprise context (only available in OPS layout)
  let selectedEnterpriseId: string | null = null;
  let isAllEnterprises = true;
  try {
    const opsContext = useOpsEnterprise();
    selectedEnterpriseId = opsContext.selectedEnterpriseId;
    isAllEnterprises = opsContext.isAllEnterprises;
  } catch {
    // Not in OPS context (e.g., /tech route), show all assets
  }

  // Mark asset as arrived at facility (in_transit → facility_qc)
  const markAsArrived = async (assetId: string) => {
    try {
      await updateAssetMutation.mutateAsync({
        assetId,
        updates: { status: 'facility_qc' },
      });
    } catch (error) {
      console.error('Failed to mark asset as arrived:', error);
      alert('Failed to update asset status. Please try again.');
    }
  };

  // Get assets pending facility QC (in_transit or facility_qc status)
  // Filter by enterprise if one is selected in OPS context
  const pendingAssets = assets.filter(a => {
    const statusMatch = a.status === 'in_transit' || a.status === 'facility_qc';
    if (!statusMatch) return false;
    // If in OPS context with enterprise selected, filter by enterprise
    if (!isAllEnterprises && selectedEnterpriseId) {
      return a.enterprise_id === selectedEnterpriseId;
    }
    return true;
  });

  // Filter and sort
  const filteredAssets = pendingAssets
    .filter(a =>
      a.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.serial_number || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-white/10 pb-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-2">
            Facility QC
          </span>
          <h1 className="font-brand font-bold text-3xl text-white uppercase tracking-tight">
            QC Queue
          </h1>
          <p className="font-display text-zinc-500 text-sm mt-2 uppercase tracking-wide">
            {filteredAssets.length} devices awaiting inspection
          </p>
        </motion.div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by brand, model, or serial..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-white/10 bg-slate-50 dark:bg-white/[0.02] text-white font-display placeholder:text-zinc-600 focus:border-ecotribe-primary focus:outline-none transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('newest')}
            className={`interactive px-4 py-3 border font-mono font-bold text-xs uppercase tracking-widest transition-all ${
              sortBy === 'newest'
                ? 'border-ecotribe-primary bg-ecotribe-primary/10 text-ecotribe-primary'
                : 'border-white/10 bg-slate-50 dark:bg-white/[0.02] text-zinc-400 hover:border-white/20'
            }`}
          >
            Newest
          </button>
          <button
            onClick={() => setSortBy('oldest')}
            className={`interactive px-4 py-3 border font-mono font-bold text-xs uppercase tracking-widest transition-all ${
              sortBy === 'oldest'
                ? 'border-ecotribe-primary bg-ecotribe-primary/10 text-ecotribe-primary'
                : 'border-white/10 bg-slate-50 dark:bg-white/[0.02] text-zinc-400 hover:border-white/20'
            }`}
          >
            Oldest
          </button>
        </div>
      </motion.div>

      {/* Queue List */}
      {filteredAssets.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="border border-white/10 bg-slate-50 dark:bg-white/[0.02]"
        >
          <div className="divide-y divide-white/5">
            {filteredAssets.map((asset, idx) => (
              <motion.div
                key={asset.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="p-5 flex items-center gap-5 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors"
              >
                <div className="w-16 h-16 border border-white/10 bg-white/5 flex items-center justify-center">
                  <Laptop className="w-8 h-8 text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-lg text-white uppercase truncate">
                    {asset.brand} {asset.model}
                  </h3>
                  <p className="font-mono text-xs text-zinc-500">S/N: {asset.serial_number}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="font-mono text-xs text-zinc-600 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Received {new Date(asset.created_at).toLocaleDateString()}
                    </span>
                    {asset.enterprises?.name && (
                      <span className="font-mono text-xs text-zinc-600">
                        {asset.enterprises.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1.5 border font-mono font-bold text-xs uppercase tracking-widest ${
                    asset.status === 'in_transit'
                      ? 'border-amber-400/30 bg-amber-400/10 text-amber-400'
                      : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400'
                  }`}>
                    {asset.status === 'in_transit' ? (
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        In Transit
                      </span>
                    ) : (
                      'At Facility'
                    )}
                  </span>
                  {asset.status === 'in_transit' ? (
                    <button
                      onClick={() => markAsArrived(asset.id)}
                      disabled={updateAssetMutation.isPending}
                      className="interactive px-5 py-2.5 font-mono font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 bg-amber-500 text-white hover:bg-amber-400 disabled:opacity-50"
                    >
                      {updateAssetMutation.isPending ? 'Updating...' : 'Mark Arrived'}
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate(`${location.pathname}/${asset.id}`)}
                      className="interactive px-5 py-2.5 font-mono font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 bg-emerald-500 text-white hover:bg-emerald-400"
                    >
                      Inspect
                      <ClipboardCheck className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="border border-white/10 bg-slate-50 dark:bg-white/[0.02] py-20 text-center"
        >
          <div className="w-20 h-20 border border-white/10 bg-white/5 flex items-center justify-center mx-auto mb-6">
            <ClipboardCheck className="w-10 h-10 text-zinc-600" />
          </div>
          <h3 className="font-brand font-bold text-xl text-zinc-500 uppercase tracking-tight mb-2">
            {searchQuery ? 'No Matches Found' : 'Queue Empty'}
          </h3>
          <p className="font-display text-zinc-600 max-w-md mx-auto">
            {searchQuery
              ? 'Try adjusting your search terms.'
              : 'There are no devices awaiting facility QC.'}
          </p>
        </motion.div>
      )}

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 gap-4"
      >
        <div className="border border-white/10 bg-slate-50 dark:bg-white/[0.02] p-5">
          <p className="font-mono text-xs text-zinc-500 uppercase mb-2">In Transit</p>
          <p className="font-brand font-bold text-3xl text-amber-400">
            {pendingAssets.filter(a => a.status === 'in_transit').length}
          </p>
        </div>
        <div className="border border-white/10 bg-slate-50 dark:bg-white/[0.02] p-5">
          <p className="font-mono text-xs text-zinc-500 uppercase mb-2">Ready for QC</p>
          <p className="font-brand font-bold text-3xl text-emerald-400">
            {pendingAssets.filter(a => a.status === 'facility_qc').length}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default QCQueue;
