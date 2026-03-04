/**
 * EPR Certificates Page - Org Admin Portal
 * V3: View EPR certificates, stats, and compliance details
 */

import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  AlertCircle,
  Search,
  Filter,
  Download,
  Loader2,
  Scale,
  Recycle,
  Trash2,
  Calendar,
  ArrowRight,
  Printer,
  X,
  Eye,
} from 'lucide-react';
import { useAuth } from '@/hooks';
import {
  useEPRCertificates,
  useEPRWeightTotals,
  EPR_STATUS_LABELS,
  EPR_STATUS_COLORS,
} from '@/hooks/useEPRCertificates';
import { iconSize } from '@/lib/design-tokens';
import { format } from 'date-fns';
import Papa from 'papaparse';

type StatusFilter = 'all' | 'pending' | 'issued' | 'expired' | 'revoked';

export function EPRCertificates() {
  const { user } = useAuth();
  const enterpriseId = user?.enterpriseId || '';

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCertificateView, setShowCertificateView] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch data
  const { data: certificates = [], isLoading } = useEPRCertificates({
    status: statusFilter === 'all' ? undefined : statusFilter,
  });
  const { data: weightTotals } = useEPRWeightTotals(enterpriseId);

  // Filter by search
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

  // Compute stats from data
  const stats = useMemo(() => {
    const all = certificates;
    return {
      issued: all.filter((c) => c.status === 'issued').length,
      pending: all.filter((c) => c.status === 'pending').length,
      expired: all.filter((c) => c.status === 'expired').length,
      totalWeight: weightTotals?.total_weight ?? 0,
    };
  }, [certificates, weightTotals]);

  // Selected certificate for viewing
  const viewCertificate = useMemo(
    () => certificates.find((c) => c.id === showCertificateView),
    [certificates, showCertificateView]
  );

  // Print certificate — content is from our own React-rendered ref, not user input
  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    // Clone our rendered certificate into the print window
    const clone = printRef.current.cloneNode(true) as HTMLElement;
    const doc = printWindow.document;
    doc.title = `EPR Certificate - ${viewCertificate?.certificate_number ?? ''}`;
    const style = doc.createElement('style');
    style.textContent = [
      'body { font-family: Georgia, serif; padding: 40px; color: #1a1a1a; }',
      '.header { text-align: center; border-bottom: 3px double #1a1a1a; padding-bottom: 20px; margin-bottom: 30px; }',
      '.header h1 { font-size: 28px; margin: 0; letter-spacing: 2px; }',
      '.header h2 { font-size: 16px; color: #666; margin: 8px 0 0; font-weight: normal; }',
      '.detail-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee; }',
      '.weight-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; text-align: center; margin: 20px 0; }',
      '.weight-box { border: 1px solid #ddd; padding: 16px; }',
      '.footer { margin-top: 40px; text-align: center; font-size: 11px; color: #888; border-top: 1px solid #ddd; padding-top: 16px; }',
      '.stamp { display: inline-block; border: 2px solid #16a34a; color: #16a34a; padding: 8px 24px; font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 3px; transform: rotate(-5deg); margin-top: 20px; }',
      '@media print { body { padding: 20px; } }',
    ].join('\n');
    doc.head.appendChild(style);
    doc.body.appendChild(clone);
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
      'Issue Date': c.issue_date ? format(new Date(c.issue_date), 'dd MMM yyyy') : '',
      'Expiry Date': c.expiry_date ? format(new Date(c.expiry_date), 'dd MMM yyyy') : '',
      Notes: c.notes ?? '',
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
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
                Extended Producer Responsibility documentation
              </p>
            </div>
            <button
              onClick={exportCertificates}
              disabled={!filteredCertificates.length}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-white/10 text-sm font-mono uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className={iconSize.sm} />
              Export CSV
            </button>
          </div>
        </motion.div>
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="border border-emerald-400/30 bg-emerald-400/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-emerald-400" />
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
            <span className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Expired</span>
          </div>
          <p className="font-brand font-bold text-3xl text-slate-500 dark:text-white/50">
            {isLoading ? '-' : stats.expired}
          </p>
        </div>

        <div className="border border-ecotribe-primary/30 bg-ecotribe-primary/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Scale className="w-4 h-4 text-ecotribe-primary" />
            <span className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Total Weight</span>
          </div>
          <p className="font-brand font-bold text-3xl text-ecotribe-primary">
            {isLoading ? '-' : stats.totalWeight.toLocaleString()}{' '}
            <span className="text-lg">kg</span>
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
          transition={{ delay: 0.1 }}
          className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] py-16 text-center"
        >
          <div className="w-16 h-16 border border-slate-200 dark:border-white/10 bg-white/5 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-slate-500 dark:text-white/50" />
          </div>
          <h3 className="font-brand font-bold text-lg text-slate-500 dark:text-white/50 uppercase mb-2">
            No EPR Certificates {statusFilter !== 'all' ? `(${EPR_STATUS_LABELS[statusFilter]})` : 'Yet'}
          </h3>
          <p className="font-display text-sm text-slate-500 dark:text-white/50 max-w-md mx-auto">
            EPR certificates will appear here once your batches are processed and disposed through certified recycling partners.
          </p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          {filteredCertificates.map((cert, idx) => (
            <motion.div
              key={cert.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * idx }}
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
                    {cert.sent_to_enterprise_id && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded-sm bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400">
                        <ArrowRight className="w-2.5 h-2.5" />
                        Received
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
                      <span className="truncate max-w-[200px]">
                        Recycler: {cert.recycler_name}
                      </span>
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
                      {cert.expiry_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Expires: {format(new Date(cert.expiry_date), 'dd MMM yyyy')}
                        </span>
                      )}
                    </div>
                  )}

                  {cert.sent_at && (
                    <p className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-display">
                      Received: {format(new Date(cert.sent_at), 'dd MMM yyyy HH:mm')}
                    </p>
                  )}

                  {cert.notes && (
                    <p className="mt-2 text-xs text-slate-400 dark:text-white/30 font-display truncate">
                      {cert.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCertificateView(cert.id);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-white/10 text-xs font-mono uppercase tracking-wider hover:border-ecotribe-primary/50 hover:text-ecotribe-primary transition-colors"
                  >
                    <Eye className="w-3 h-3" />
                    View
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

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

      {/* Quick Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="border border-blue-400/30 bg-blue-400/5 p-5"
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 border border-blue-400/30 bg-blue-400/10 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="font-display font-bold text-slate-900 dark:text-white uppercase mb-1">
              About EPR Certificates
            </p>
            <p className="font-display text-sm text-slate-500 dark:text-white/50">
              Extended Producer Responsibility (EPR) certificates are issued by the Central Pollution Control Board (CPCB)
              for proper e-waste disposal. These certificates are mandatory for enterprises disposing electronic equipment
              and help meet environmental compliance requirements.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default EPRCertificates;
