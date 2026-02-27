/**
 * EPR Certificates Page - Org Admin Portal
 * V3: View EPR certificates, stats, and compliance details
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  AlertCircle,
  Search,
  Filter,
  Download,
  ExternalLink,
  Loader2,
  Scale,
  Recycle,
  Trash2,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/hooks';
import {
  useEPRCertificates,
  useEPRWeightTotals,
  EPR_STATUS_LABELS,
  EPR_STATUS_COLORS,
} from '@/hooks/useEPRCertificates';
import { text, iconSize } from '@/lib/design-tokens';
import { format } from 'date-fns';
import Papa from 'papaparse';

type StatusFilter = 'all' | 'pending' | 'issued' | 'expired' | 'revoked';

export function EPRCertificates() {
  const { user } = useAuth();
  const enterpriseId = user?.enterpriseId || '';

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

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
              className="border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-5 hover:border-ecotribe-primary/30 transition-colors"
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

                {cert.certificate_url && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a
                      href={cert.certificate_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-white/10 text-xs font-mono uppercase tracking-wider hover:border-ecotribe-primary/50 hover:text-ecotribe-primary transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View
                    </a>
                    <a
                      href={cert.certificate_url}
                      download={`EPR-${cert.certificate_number}.pdf`}
                      className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-white/10 text-xs font-mono uppercase tracking-wider hover:border-ecotribe-primary/50 hover:text-ecotribe-primary transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

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
