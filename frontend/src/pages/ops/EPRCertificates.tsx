/**
 * EPR Certificates Page - OPS Admin / Super Admin Portal
 * Generate, view, and manage EPR certificates for enterprises
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Search,
  Filter,
  Download,
  Loader2,
  Scale,
  Recycle,
  Trash2,
  Calendar,
  Plus,
  CheckCircle,
  X,
  Printer,
  Building2,
  Laptop,
  AlertCircle,
} from 'lucide-react';
import {
  useEPRCertificates,
  useEPRWeightTotals,
  useGenerateEPRCertificate,
  useIssueEPRCertificate,
  EPR_STATUS_LABELS,
  EPR_STATUS_COLORS,
} from '@/hooks/useEPRCertificates';
import { useInfiniteAssets } from '@/hooks';
import { useOptionalOpsEnterprise } from '@/contexts/OpsEnterpriseContext';
import { useToast } from '@/components/ui';
import { iconSize } from '@/lib/design-tokens';
import { format } from 'date-fns';
import Papa from 'papaparse';

type StatusFilter = 'all' | 'pending' | 'issued' | 'expired' | 'revoked';

export function OpsEPRCertificates() {
  const opsCtx = useOptionalOpsEnterprise();
  const selectedEnterpriseId = opsCtx?.selectedEnterpriseId ?? null;
  const isAllEnterprises = opsCtx?.isAllEnterprises ?? true;
  const selectedEnterprise = opsCtx?.selectedEnterprise ?? null;
  const { addToast } = useToast();
  const generateMutation = useGenerateEPRCertificate();
  const issueMutation = useIssueEPRCertificate();
  const printRef = useRef<HTMLDivElement>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showCertificateView, setShowCertificateView] = useState<string | null>(null);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [generateForm, setGenerateForm] = useState({
    recycler_name: '',
    recycler_license_number: '',
    notes: '',
  });

  // Fetch certificates (filtered by enterprise if selected)
  const { data: certificates = [], isLoading, refetch } = useEPRCertificates({
    status: statusFilter === 'all' ? undefined : statusFilter,
    enterprise_id: isAllEnterprises ? undefined : selectedEnterpriseId || undefined,
  });

  // Fetch weight totals for selected enterprise
  const { data: weightTotals } = useEPRWeightTotals(selectedEnterpriseId || '');

  // Fetch completed assets that don't have EPR certificates yet
  const {
    data: completedAssetsPages,
    hasNextPage: hasMoreAssets,
    fetchNextPage: fetchMoreAssets,
    isFetchingNextPage: isFetchingMoreAssets,
  } = useInfiniteAssets(
    {
      status: 'completed',
      enterprise_id: isAllEnterprises ? undefined : selectedEnterpriseId || undefined,
    },
    100
  );

  // Auto-fetch all pages of completed assets
  useEffect(() => {
    if (hasMoreAssets && !isFetchingMoreAssets) {
      fetchMoreAssets();
    }
  }, [hasMoreAssets, isFetchingMoreAssets, fetchMoreAssets]);

  const completedAssets = useMemo(
    () => completedAssetsPages?.pages?.flatMap((p) => p.data ?? []) ?? [],
    [completedAssetsPages]
  );

  // Filter assets without EPR certificate
  const eligibleAssets = useMemo(
    () => completedAssets.filter((a) => !a.epr_certificate_id),
    [completedAssets]
  );

  // Filter certificates by search
  const filteredCertificates = useMemo(() => {
    if (!searchQuery.trim()) return certificates;
    const q = searchQuery.toLowerCase();
    return certificates.filter(
      (c) =>
        c.certificate_number.toLowerCase().includes(q) ||
        c.recycler_name?.toLowerCase().includes(q) ||
        c.status.toLowerCase().includes(q)
    );
  }, [certificates, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    return {
      issued: certificates.filter((c) => c.status === 'issued').length,
      pending: certificates.filter((c) => c.status === 'pending').length,
      total: certificates.length,
      totalWeight: weightTotals?.total_weight ?? 0,
      eligibleAssets: eligibleAssets.length,
    };
  }, [certificates, weightTotals, eligibleAssets]);

  // Selected certificate for viewing
  const viewCertificate = useMemo(
    () => certificates.find((c) => c.id === showCertificateView),
    [certificates, showCertificateView]
  );

  // Toggle asset selection
  const toggleAsset = (assetId: string) => {
    setSelectedAssetIds((prev) =>
      prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId]
    );
  };

  const selectAllAssets = () => {
    if (selectedAssetIds.length === eligibleAssets.length) {
      setSelectedAssetIds([]);
    } else {
      setSelectedAssetIds(eligibleAssets.map((a) => a.id));
    }
  };

  // Generate certificate
  const handleGenerate = async () => {
    if (selectedAssetIds.length === 0) {
      addToast({ type: 'warning', title: 'No assets selected', message: 'Select at least one completed asset' });
      return;
    }

    const enterpriseId = isAllEnterprises
      ? eligibleAssets.find((a) => selectedAssetIds.includes(a.id))?.enterprise_id
      : selectedEnterpriseId;

    if (!enterpriseId) {
      addToast({ type: 'error', title: 'No enterprise', message: 'Select an enterprise first' });
      return;
    }

    // Validate all selected assets belong to same enterprise
    const selectedAssets = eligibleAssets.filter((a) => selectedAssetIds.includes(a.id));
    const uniqueEnterprises = new Set(selectedAssets.map((a) => a.enterprise_id));
    if (uniqueEnterprises.size > 1) {
      addToast({ type: 'error', title: 'Multiple enterprises', message: 'All selected assets must belong to the same enterprise' });
      return;
    }

    try {
      const cert = await generateMutation.mutateAsync({
        enterprise_id: enterpriseId,
        asset_ids: selectedAssetIds,
        recycler_name: generateForm.recycler_name || undefined,
        recycler_license_number: generateForm.recycler_license_number || undefined,
        notes: generateForm.notes || undefined,
      });

      addToast({ type: 'success', title: 'Certificate Generated', message: `Certificate ${cert?.certificate_number} created for ${selectedAssetIds.length} assets` });
      setShowGenerateModal(false);
      setSelectedAssetIds([]);
      setGenerateForm({ recycler_name: '', recycler_license_number: '', notes: '' });
      refetch();

      // Show the certificate
      if (cert?.id) {
        setShowCertificateView(cert.id);
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Generation Failed', message: err.message || 'Failed to generate certificate' });
    }
  };

  // Print certificate
  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>EPR Certificate - ${viewCertificate?.certificate_number}</title>
          <style>
            body { font-family: 'Georgia', serif; padding: 40px; color: #1a1a1a; }
            .header { text-align: center; border-bottom: 3px double #1a1a1a; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { font-size: 28px; margin: 0; letter-spacing: 2px; }
            .header h2 { font-size: 16px; color: #666; margin: 8px 0 0; font-weight: normal; }
            .cert-number { font-family: monospace; font-size: 14px; color: #666; margin-top: 8px; }
            .section { margin-bottom: 24px; }
            .section-title { font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #888; margin-bottom: 8px; }
            .detail-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee; }
            .detail-label { color: #666; }
            .detail-value { font-weight: bold; }
            .weight-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; text-align: center; margin: 20px 0; }
            .weight-box { border: 1px solid #ddd; padding: 16px; }
            .weight-box .value { font-size: 24px; font-weight: bold; }
            .weight-box .label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
            .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #888; border-top: 1px solid #ddd; padding-top: 16px; }
            .stamp { display: inline-block; border: 2px solid #16a34a; color: #16a34a; padding: 8px 24px; font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 3px; transform: rotate(-5deg); margin-top: 20px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // CSV export
  const exportCertificates = () => {
    if (!filteredCertificates.length) return;
    const rows = filteredCertificates.map((c) => ({
      'Certificate #': c.certificate_number,
      Status: EPR_STATUS_LABELS[c.status] || c.status,
      'Total Weight (kg)': c.total_weight_kg,
      'Recycled Weight (kg)': c.recycled_weight_kg ?? '',
      'Disposed Weight (kg)': c.disposed_weight_kg ?? '',
      Recycler: c.recycler_name ?? '',
      'Asset Count': c.asset_ids?.length ?? 0,
      'Issue Date': c.issue_date ? format(new Date(c.issue_date), 'dd MMM yyyy') : '',
      Notes: c.notes ?? '',
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `epr-certificates-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-2">
            Compliance
          </span>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-brand font-bold text-3xl text-slate-900 dark:text-white uppercase tracking-tight">
                EPR Certificates
              </h1>
              <p className="font-display text-slate-500 dark:text-white/50 text-sm mt-2 uppercase tracking-wide">
                Generate & manage e-waste compliance certificates
                {selectedEnterprise && ` — ${selectedEnterprise.name}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={exportCertificates}
                disabled={!filteredCertificates.length}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-white/10 text-sm font-mono uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className={iconSize.sm} />
                Export
              </button>
              <button
                onClick={() => setShowGenerateModal(true)}
                disabled={isAllEnterprises && eligibleAssets.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-ecotribe-primary text-white text-sm font-mono uppercase tracking-wider hover:bg-ecotribe-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Generate Certificate
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 lg:grid-cols-5 gap-4"
      >
        <div className="border border-emerald-400/30 bg-emerald-400/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Issued</span>
          </div>
          <p className="font-brand font-bold text-3xl text-emerald-400">
            {isLoading ? '-' : stats.issued}
          </p>
        </div>

        <div className="border border-amber-400/30 bg-amber-400/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <span className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Pending</span>
          </div>
          <p className="font-brand font-bold text-3xl text-amber-400">
            {isLoading ? '-' : stats.pending}
          </p>
        </div>

        <div className="border border-zinc-400/30 bg-zinc-400/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-slate-500 dark:text-white/50" />
            <span className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Total</span>
          </div>
          <p className="font-brand font-bold text-3xl text-slate-500 dark:text-white/50">
            {isLoading ? '-' : stats.total}
          </p>
        </div>

        <div className="border border-ecotribe-primary/30 bg-ecotribe-primary/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Scale className="w-4 h-4 text-ecotribe-primary" />
            <span className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Total Weight</span>
          </div>
          <p className="font-brand font-bold text-2xl text-ecotribe-primary">
            {isLoading ? '-' : stats.totalWeight.toLocaleString()} <span className="text-lg">kg</span>
          </p>
        </div>

        <div className="border border-blue-400/30 bg-blue-400/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Laptop className="w-4 h-4 text-blue-400" />
            <span className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Eligible Assets</span>
          </div>
          <p className="font-brand font-bold text-3xl text-blue-400">
            {eligibleAssets.length}
          </p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by certificate number or recycler..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-display placeholder:text-slate-400 focus:outline-none focus:border-ecotribe-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          {(['all', 'pending', 'issued', 'expired', 'revoked'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider border transition-colors ${
                statusFilter === s
                  ? 'border-ecotribe-primary bg-ecotribe-primary/10 text-ecotribe-primary'
                  : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/50 hover:border-ecotribe-primary/50'
              }`}
            >
              {s === 'all' ? 'All' : EPR_STATUS_LABELS[s] || s}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Certificate List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-ecotribe-primary" />
        </div>
      ) : filteredCertificates.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] py-16 text-center"
        >
          <div className="w-16 h-16 border border-slate-200 dark:border-white/10 bg-white/5 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-slate-500 dark:text-white/50" />
          </div>
          <h3 className="font-brand font-bold text-lg text-slate-500 dark:text-white/50 uppercase mb-2">
            No EPR Certificates {statusFilter !== 'all' ? `(${EPR_STATUS_LABELS[statusFilter]})` : 'Yet'}
          </h3>
          <p className="font-display text-sm text-slate-500 dark:text-white/50 max-w-md mx-auto mb-4">
            Generate your first EPR certificate from completed assets.
          </p>
          {eligibleAssets.length > 0 && (
            <button
              onClick={() => setShowGenerateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-ecotribe-primary text-white text-sm font-mono uppercase tracking-wider hover:bg-ecotribe-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Generate Certificate ({eligibleAssets.length} assets eligible)
            </button>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {filteredCertificates.map((cert, idx) => (
            <motion.div
              key={cert.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.03 * idx }}
              className="border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-5 hover:border-ecotribe-primary/30 transition-colors cursor-pointer"
              onClick={() => setShowCertificateView(cert.id)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {cert.certificate_number}
                    </span>
                    <span
                      className={`inline-flex px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded-sm ${
                        EPR_STATUS_COLORS[cert.status] || 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {EPR_STATUS_LABELS[cert.status] || cert.status}
                    </span>
                    {cert.asset_ids && (
                      <span className="text-xs text-slate-400 dark:text-white/30 font-mono">
                        {cert.asset_ids.length} asset{cert.asset_ids.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500 dark:text-white/40 font-display">
                    <span className="flex items-center gap-1">
                      <Scale className="w-3 h-3" />
                      {Number(cert.total_weight_kg).toLocaleString()} kg total
                    </span>
                    {cert.recycled_weight_kg != null && (
                      <span className="flex items-center gap-1">
                        <Recycle className="w-3 h-3" />
                        {Number(cert.recycled_weight_kg).toLocaleString()} kg recycled
                      </span>
                    )}
                    {cert.disposed_weight_kg != null && (
                      <span className="flex items-center gap-1">
                        <Trash2 className="w-3 h-3" />
                        {Number(cert.disposed_weight_kg).toLocaleString()} kg disposed
                      </span>
                    )}
                    {cert.recycler_name && (
                      <span className="truncate max-w-[200px]">Recycler: {cert.recycler_name}</span>
                    )}
                  </div>

                  {(cert.issue_date || cert.expiry_date) && (
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 dark:text-white/30 font-mono">
                      {cert.issue_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Issued: {format(new Date(cert.issue_date), 'dd MMM yyyy')}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {cert.status === 'pending' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        issueMutation.mutate(cert.id, {
                          onSuccess: () => {
                            addToast({ type: 'success', title: 'Certificate Issued' });
                            refetch();
                          },
                          onError: (err: any) => {
                            addToast({ type: 'error', title: 'Failed', message: err.message });
                          },
                        });
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white text-xs font-mono uppercase tracking-wider hover:bg-emerald-600 transition-colors"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Issue
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCertificateView(cert.id);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-white/10 text-xs font-mono uppercase tracking-wider hover:border-ecotribe-primary/50 hover:text-ecotribe-primary transition-colors"
                  >
                    <Printer className="w-3 h-3" />
                    View
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Generate Certificate Modal */}
      <AnimatePresence>
        {showGenerateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowGenerateModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 w-full max-w-2xl max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-slate-200 dark:border-white/10 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-brand font-bold text-xl text-slate-900 dark:text-white uppercase">
                      Generate EPR Certificate
                    </h2>
                    <p className="font-display text-sm text-slate-500 dark:text-white/50 mt-1">
                      Select completed assets to generate a compliance certificate
                    </p>
                  </div>
                  <button
                    onClick={() => setShowGenerateModal(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Asset Selection */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase tracking-wider">
                      Eligible Assets ({eligibleAssets.length})
                    </h3>
                    {eligibleAssets.length > 0 && (
                      <button
                        type="button"
                        onClick={selectAllAssets}
                        className="text-xs font-mono text-ecotribe-primary hover:underline uppercase"
                      >
                        {selectedAssetIds.length === eligibleAssets.length ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                  </div>

                  {eligibleAssets.length === 0 ? (
                    <div className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-8 text-center">
                      <Laptop className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="font-display text-sm text-slate-500 dark:text-white/50">
                        No completed assets available for certificate generation.
                      </p>
                    </div>
                  ) : (
                    <div className="border border-slate-200 dark:border-white/10 max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
                      {eligibleAssets.map((asset) => (
                        <label
                          key={asset.id}
                          className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-white/[0.02] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedAssetIds.includes(asset.id)}
                            onChange={() => toggleAsset(asset.id)}
                            className="w-4 h-4 text-ecotribe-primary rounded border-slate-300"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-mono text-xs text-slate-900 dark:text-white">
                              {asset.serial_number}
                            </span>
                            <span className="text-xs text-slate-400 dark:text-white/30 ml-2">
                              {asset.brand || 'Unknown'} {asset.model || ''}
                            </span>
                          </div>
                          {asset.enterprise_name && (
                            <span className="text-[10px] text-slate-400 dark:text-white/30 font-mono flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {asset.enterprise_name}
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  )}

                  {selectedAssetIds.length > 0 && (
                    <p className="text-xs text-ecotribe-primary font-mono mt-2">
                      {selectedAssetIds.length} asset{selectedAssetIds.length !== 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>

                {/* Recycler Info */}
                <div className="space-y-4">
                  <h3 className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase tracking-wider">
                    Recycler Information (Optional)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-display text-slate-500 dark:text-white/40 mb-1">
                        Recycler Name
                      </label>
                      <input
                        type="text"
                        value={generateForm.recycler_name}
                        onChange={(e) => setGenerateForm((f) => ({ ...f, recycler_name: e.target.value }))}
                        placeholder="e.g. GreenTech Recyclers"
                        className="w-full px-3 py-2 border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm focus:outline-none focus:border-ecotribe-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-display text-slate-500 dark:text-white/40 mb-1">
                        License Number
                      </label>
                      <input
                        type="text"
                        value={generateForm.recycler_license_number}
                        onChange={(e) => setGenerateForm((f) => ({ ...f, recycler_license_number: e.target.value }))}
                        placeholder="e.g. CPCB/EPR/2024/001"
                        className="w-full px-3 py-2 border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm focus:outline-none focus:border-ecotribe-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-display text-slate-500 dark:text-white/40 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={generateForm.notes}
                      onChange={(e) => setGenerateForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder="Additional notes for the certificate..."
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm focus:outline-none focus:border-ecotribe-primary resize-none"
                    />
                  </div>
                </div>

                {/* Info */}
                <div className="border border-blue-400/30 bg-blue-400/5 p-4 flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-500 dark:text-white/50 font-display">
                    Weights are auto-calculated based on device types (laptop ~2.5kg, desktop ~8kg, phone ~0.2kg, etc.)
                    with 85% recycled / 15% disposed ratio. The certificate will be issued immediately.
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-white/10 p-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-white/10 text-sm font-mono uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={selectedAssetIds.length === 0 || generateMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2.5 bg-ecotribe-primary text-white text-sm font-mono uppercase tracking-wider hover:bg-ecotribe-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  Generate Certificate
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Certificate View/Print Modal */}
      <AnimatePresence>
        {showCertificateView && viewCertificate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCertificateView(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="border-b border-slate-200 dark:border-white/10 p-4 flex items-center justify-between">
                <h2 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase">
                  Certificate Preview
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1 px-3 py-1.5 bg-ecotribe-primary text-white text-xs font-mono uppercase tracking-wider hover:bg-ecotribe-primary/90 transition-colors"
                  >
                    <Printer className="w-3 h-3" />
                    Print / Download
                  </button>
                  <button
                    onClick={() => setShowCertificateView(null)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Printable Certificate */}
              <div ref={printRef} className="p-8">
                <div className="header text-center border-b-2 border-double border-slate-900 dark:border-white pb-5 mb-6">
                  <h1 className="text-2xl font-bold tracking-widest text-slate-900 dark:text-white uppercase">
                    EPR Compliance Certificate
                  </h1>
                  <h2 className="text-sm text-slate-500 dark:text-white/50 mt-2 font-display">
                    Extended Producer Responsibility — E-Waste Management
                  </h2>
                  <p className="font-mono text-xs text-slate-400 dark:text-white/30 mt-2">
                    Certificate No: {viewCertificate.certificate_number}
                  </p>
                </div>

                {/* Certificate Body */}
                <div className="space-y-6">
                  {/* Status */}
                  <div className="text-center">
                    <span
                      className={`inline-flex px-4 py-1.5 text-sm font-mono uppercase tracking-wider rounded-sm ${
                        EPR_STATUS_COLORS[viewCertificate.status] || 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {EPR_STATUS_LABELS[viewCertificate.status] || viewCertificate.status}
                    </span>
                  </div>

                  {/* Details Grid */}
                  <div className="space-y-2">
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-white/5">
                      <span className="text-sm text-slate-500 dark:text-white/40 font-display">Enterprise ID</span>
                      <span className="text-sm font-mono text-slate-900 dark:text-white">{viewCertificate.enterprise_id}</span>
                    </div>
                    {viewCertificate.issue_date && (
                      <div className="flex justify-between py-2 border-b border-slate-100 dark:border-white/5">
                        <span className="text-sm text-slate-500 dark:text-white/40 font-display">Issue Date</span>
                        <span className="text-sm font-mono text-slate-900 dark:text-white">
                          {format(new Date(viewCertificate.issue_date), 'dd MMMM yyyy')}
                        </span>
                      </div>
                    )}
                    {viewCertificate.asset_ids && (
                      <div className="flex justify-between py-2 border-b border-slate-100 dark:border-white/5">
                        <span className="text-sm text-slate-500 dark:text-white/40 font-display">Assets Covered</span>
                        <span className="text-sm font-mono text-slate-900 dark:text-white">{viewCertificate.asset_ids.length} devices</span>
                      </div>
                    )}
                    {viewCertificate.recycler_name && (
                      <div className="flex justify-between py-2 border-b border-slate-100 dark:border-white/5">
                        <span className="text-sm text-slate-500 dark:text-white/40 font-display">Certified Recycler</span>
                        <span className="text-sm font-mono text-slate-900 dark:text-white">{viewCertificate.recycler_name}</span>
                      </div>
                    )}
                    {viewCertificate.recycler_license_number && (
                      <div className="flex justify-between py-2 border-b border-slate-100 dark:border-white/5">
                        <span className="text-sm text-slate-500 dark:text-white/40 font-display">Recycler License</span>
                        <span className="text-sm font-mono text-slate-900 dark:text-white">{viewCertificate.recycler_license_number}</span>
                      </div>
                    )}
                  </div>

                  {/* Weight Grid */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="border border-slate-200 dark:border-white/10 p-4">
                      <p className="font-brand font-bold text-2xl text-slate-900 dark:text-white">
                        {Number(viewCertificate.total_weight_kg).toLocaleString()}
                      </p>
                      <p className="font-mono text-[10px] text-slate-500 dark:text-white/40 uppercase tracking-wider mt-1">
                        Total Weight (kg)
                      </p>
                    </div>
                    <div className="border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5 p-4">
                      <p className="font-brand font-bold text-2xl text-emerald-600 dark:text-emerald-400">
                        {Number(viewCertificate.recycled_weight_kg ?? 0).toLocaleString()}
                      </p>
                      <p className="font-mono text-[10px] text-emerald-600/60 dark:text-emerald-400/60 uppercase tracking-wider mt-1">
                        Recycled (kg)
                      </p>
                    </div>
                    <div className="border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/5 p-4">
                      <p className="font-brand font-bold text-2xl text-amber-600 dark:text-amber-400">
                        {Number(viewCertificate.disposed_weight_kg ?? 0).toLocaleString()}
                      </p>
                      <p className="font-mono text-[10px] text-amber-600/60 dark:text-amber-400/60 uppercase tracking-wider mt-1">
                        Disposed (kg)
                      </p>
                    </div>
                  </div>

                  {/* Notes */}
                  {viewCertificate.notes && (
                    <div className="border border-slate-200 dark:border-white/10 p-4">
                      <p className="font-mono text-[10px] text-slate-500 dark:text-white/40 uppercase tracking-wider mb-1">Notes</p>
                      <p className="text-sm text-slate-700 dark:text-white/70 font-display">{viewCertificate.notes}</p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="text-center pt-4 border-t border-slate-200 dark:border-white/10">
                    <p className="text-xs text-slate-400 dark:text-white/30 font-display">
                      This certificate is issued by EcoTribe Platform in compliance with
                      E-Waste (Management) Rules, 2022 under the Central Pollution Control Board (CPCB) guidelines.
                    </p>
                    <p className="text-xs text-slate-400 dark:text-white/30 font-mono mt-2">
                      Generated: {viewCertificate.created_at ? format(new Date(viewCertificate.created_at), 'dd MMM yyyy HH:mm') : 'N/A'}
                    </p>
                    {viewCertificate.status === 'issued' && (
                      <div className="mt-4 inline-block border-2 border-emerald-500 text-emerald-500 px-6 py-2 font-bold text-lg uppercase tracking-widest font-mono"
                        style={{ transform: 'rotate(-3deg)' }}
                      >
                        ISSUED
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default OpsEPRCertificates;
