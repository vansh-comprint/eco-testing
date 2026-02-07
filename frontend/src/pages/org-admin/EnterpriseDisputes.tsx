/**
 * Enterprise Disputes Overview
 * Org Admin view showing ALL disputes across enterprise with branch attribution
 * Read-only overview with status filtering
 */
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  AlertTriangle,
  Loader2,
  Building2,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Download,
  Filter,
  Scale,
  Monitor,
} from 'lucide-react';
import { useAuth, useDisputesByEnterprise, useAssets, useBranches } from '@/hooks';
import { PageHeader, DashboardStatGrid } from '@/components/ui';
import type { StatAccent } from '@/components/ui';
import { iconSize } from '@/lib/design-tokens';
import Papa from 'papaparse';

type StatusFilter = 'all' | 'pending' | 'upheld' | 'overturned' | 'partial';

export function EnterpriseDisputes() {
  const navigate = useNavigate();
  const { enterprise } = useAuth();
  const enterpriseId = enterprise?.id || '';

  const { data: disputes = [], isLoading } = useDisputesByEnterprise(enterpriseId);
  const { data: assets = [] } = useAssets(enterpriseId);
  const { data: branches = [] } = useBranches(enterpriseId);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [branchFilter, setBranchFilter] = useState('all');

  const branchMap = useMemo(() => {
    const map = new Map<string, string>();
    branches.forEach(b => map.set(b.id, b.name || ''));
    return map;
  }, [branches]);

  // Asset lookup for enrichment
  const assetMap = useMemo(() => {
    const map = new Map<string, any>();
    assets.forEach(a => map.set(a.id, a));
    return map;
  }, [assets]);

  // Stats
  const stats = useMemo(() => {
    const total = disputes.length;
    const pending = disputes.filter(d => d.status === 'pending').length;
    const upheld = disputes.filter(d => d.status === 'upheld').length;
    const overturned = disputes.filter(d => d.status === 'overturned').length;
    const partial = disputes.filter(d => d.status === 'partial').length;
    return { total, pending, upheld, overturned, partial };
  }, [disputes]);

  // Filtered disputes
  const filteredDisputes = useMemo(() => {
    let result = [...disputes];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d => {
        const asset = assetMap.get(d.asset_id);
        return (
          d.reason?.toLowerCase().includes(q) ||
          d.type?.toLowerCase().includes(q) ||
          asset?.serial_number?.toLowerCase().includes(q) ||
          asset?.brand?.toLowerCase().includes(q) ||
          asset?.model?.toLowerCase().includes(q)
        );
      });
    }

    if (statusFilter !== 'all') {
      result = result.filter(d => d.status === statusFilter);
    }

    if (branchFilter !== 'all') {
      result = result.filter(d => {
        const asset = assetMap.get(d.asset_id);
        return asset?.branch_id === branchFilter;
      });
    }

    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return result;
  }, [disputes, searchQuery, statusFilter, branchFilter, assetMap]);

  const handleExport = () => {
    const csv = Papa.unparse(filteredDisputes.map(d => {
      const asset = assetMap.get(d.asset_id);
      return {
        type: d.type,
        status: d.status,
        reason: d.reason || '',
        asset_serial: asset?.serial_number || '—',
        asset_brand: asset?.brand || '—',
        asset_model: asset?.model || '—',
        branch: branchMap.get(asset?.branch_id || '') || '—',
        created_at: new Date(d.created_at).toLocaleDateString(),
      };
    }));
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `enterprise-disputes-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusInfo = (status: string) => {
    const map: Record<string, { color: string; label: string; icon: React.ReactElement }> = {
      pending: { color: 'border-amber-400/30 bg-amber-400/10 text-amber-500', label: 'Pending', icon: <Clock className="w-3 h-3" /> },
      upheld: { color: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-500', label: 'Upheld', icon: <CheckCircle className="w-3 h-3" /> },
      overturned: { color: 'border-blue-400/30 bg-blue-400/10 text-blue-500', label: 'Overturned', icon: <Scale className="w-3 h-3" /> },
      partial: { color: 'border-purple-400/30 bg-purple-400/10 text-purple-500', label: 'Partial', icon: <AlertTriangle className="w-3 h-3" /> },
    };
    return map[status] || { color: 'border-slate-400/30 bg-slate-400/10 text-slate-500', label: status, icon: <Clock className="w-3 h-3" /> };
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      condition_dispute: 'Condition',
      grading_dispute: 'Grading',
      pricing_dispute: 'Pricing',
      missing_item: 'Missing Item',
      damage_dispute: 'Damage',
    };
    return labels[type] || type;
  };

  const statItems = [
    { label: 'Total Disputes', value: stats.total, icon: <AlertTriangle className={`${iconSize.lg} text-slate-500`} />, accent: 'neutral' as StatAccent },
    { label: 'Pending', value: stats.pending, icon: <Clock className={`${iconSize.lg} text-amber-500`} />, accent: (stats.pending > 0 ? 'warning' : 'neutral') as StatAccent, onClick: () => setStatusFilter('pending') },
    { label: 'Upheld', value: stats.upheld, icon: <CheckCircle className={`${iconSize.lg} text-emerald-500`} />, accent: 'success' as StatAccent, onClick: () => setStatusFilter('upheld') },
    { label: 'Overturned', value: stats.overturned, icon: <Scale className={`${iconSize.lg} text-blue-500`} />, accent: 'info' as StatAccent, onClick: () => setStatusFilter('overturned') },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-ecotribe-primary animate-spin mx-auto mb-4" />
          <p className="font-mono text-xs text-slate-500 dark:text-zinc-500 uppercase tracking-widest">Loading enterprise disputes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        label="Enterprise Overview"
        title="All Disputes"
        subtitle={`${disputes.length} disputes across enterprise`}
        actions={
          <button
            onClick={handleExport}
            className="px-4 py-2.5 bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm border border-slate-200/80 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 font-mono font-bold text-xs uppercase tracking-widest hover:border-blue-500/40 transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        }
      />

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <DashboardStatGrid items={statItems} columns={4} />
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex flex-col md:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-white/30" />
          <input
            type="text"
            placeholder="Search by serial, brand, model, or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none transition-colors"
          />
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="pl-9 pr-8 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-mono text-xs uppercase tracking-widest focus:border-ecotribe-primary focus:outline-none appearance-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="upheld">Upheld</option>
              <option value="overturned">Overturned</option>
              <option value="partial">Partial</option>
            </select>
          </div>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="pl-9 pr-8 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-mono text-xs uppercase tracking-widest focus:border-ecotribe-primary focus:outline-none appearance-none cursor-pointer"
            >
              <option value="all">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Dispute List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        {filteredDisputes.length > 0 ? (
          filteredDisputes.map((dispute, idx) => {
            const asset = assetMap.get(dispute.asset_id);
            const statusInfo = getStatusInfo(dispute.status);

            return (
              <motion.div
                key={dispute.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => navigate(`/org-admin/disputes/${dispute.id}`)}
                className="border border-slate-200 dark:border-white/10 bg-white/98 dark:bg-zinc-900/75 hover:border-lime-500/25 dark:hover:border-lime-400/20 hover:shadow-md hover:shadow-lime-500/5 hover:-translate-y-0.5 cursor-pointer transition-all duration-200"
              >
                <div className="p-5 flex items-start gap-4">
                  <div className={`w-12 h-12 border flex items-center justify-center flex-shrink-0 ${
                    dispute.status === 'pending' ? 'border-amber-400/30 bg-amber-400/10' :
                    dispute.status === 'upheld' ? 'border-emerald-400/30 bg-emerald-400/10' :
                    'border-blue-400/30 bg-blue-400/10'
                  }`}>
                    <AlertTriangle className={`w-6 h-6 ${
                      dispute.status === 'pending' ? 'text-amber-500' :
                      dispute.status === 'upheld' ? 'text-emerald-500' :
                      'text-blue-500'
                    }`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/5 font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-400 uppercase tracking-widest">
                            {getTypeLabel(dispute.type)}
                          </span>
                          {asset && (
                            <span className="font-display font-bold text-sm text-slate-900 dark:text-white">
                              {asset.brand} {asset.model}
                            </span>
                          )}
                        </div>
                        {asset && (
                          <p className="font-mono text-xs text-ecotribe-primary mt-0.5">{asset.serial_number}</p>
                        )}
                      </div>
                      <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 border font-mono font-bold text-[10px] uppercase tracking-widest ${statusInfo.color}`}>
                        {statusInfo.icon}
                        {statusInfo.label}
                      </span>
                    </div>

                    {dispute.reason && (
                      <p className="font-display text-sm text-slate-600 dark:text-zinc-400 mt-2 line-clamp-2">
                        {dispute.reason}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-slate-200/60 dark:border-white/5">
                      {asset?.branch_id && (
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono text-xs text-slate-500 dark:text-zinc-500">
                            {branchMap.get(asset.branch_id) || '—'}
                          </span>
                        </span>
                      )}
                      <span className="font-mono text-xs text-slate-400 dark:text-zinc-600">
                        Filed {new Date(dispute.created_at).toLocaleDateString()}
                      </span>
                      {dispute.raised_by && (
                        <span className="font-mono text-xs text-slate-500 dark:text-zinc-500">
                          Dispute #{dispute.id.slice(0, 8)}
                        </span>
                      )}
                    </div>
                  </div>

                  <Eye className="w-5 h-5 text-slate-300 dark:text-zinc-600 flex-shrink-0 mt-1" />
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="border border-slate-200 dark:border-white/10 bg-white/98 dark:bg-zinc-900/75 py-16 text-center">
            <AlertTriangle className="w-12 h-12 text-slate-300 dark:text-zinc-700 mx-auto mb-4" />
            <p className="font-display font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wide mb-1">No disputes found</p>
            <p className="font-mono text-xs text-slate-400 dark:text-zinc-600">
              {searchQuery || statusFilter !== 'all' || branchFilter !== 'all' ? 'Try adjusting your filters.' : 'No disputes have been filed.'}
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default EnterpriseDisputes;
