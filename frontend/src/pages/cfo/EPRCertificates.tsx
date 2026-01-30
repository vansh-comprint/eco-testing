import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Search,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  Building2,
  Calendar,
  ExternalLink,
  Plus,
  Eye
} from 'lucide-react';
import { useAuth, useAllAssets, useEnterprises, useBatches } from '@/hooks';

type EPRStatus = 'issued' | 'pending' | 'not_started';

interface EPRCertificate {
  id: string;
  batchId: string;
  enterpriseId: string;
  certificateNumber: string;
  status: EPRStatus;
  assetCount: number;
  totalWeight: number; // in kg
  issuedAt?: Date;
  expiresAt?: Date;
  documentUrl?: string;
}

// Mock EPR certificates
const mockCertificates: EPRCertificate[] = [
  {
    id: 'epr-001',
    batchId: 'bat-0001',
    enterpriseId: 'ent-0001',
    certificateNumber: 'EPR/2024/KA/001234',
    status: 'issued',
    assetCount: 25,
    totalWeight: 87.5,
    issuedAt: new Date('2024-10-15'),
    expiresAt: new Date('2025-10-15'),
    documentUrl: '/certificates/epr-001.pdf',
  },
  {
    id: 'epr-002',
    batchId: 'bat-0002',
    enterpriseId: 'ent-0001',
    certificateNumber: 'EPR/2024/KA/001567',
    status: 'pending',
    assetCount: 10,
    totalWeight: 35.0,
  },
  {
    id: 'epr-003',
    batchId: 'bat-0003',
    enterpriseId: 'ent-0001',
    certificateNumber: '',
    status: 'not_started',
    assetCount: 75,
    totalWeight: 262.5,
  },
];

export function EPRCertificates() {
  const { enterprise } = useAuth();
  const enterpriseId = enterprise?.id || '';
  const { data: assets = [] } = useAllAssets();
  const { data: enterprises = [] } = useEnterprises();
  const { data: batches = [] } = useBatches(enterpriseId);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<EPRStatus | 'all'>('all');
  const [selectedCertificate, setSelectedCertificate] = useState<string | null>(null);

  // Filter certificates
  const filteredCertificates = mockCertificates
    .filter(c => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (searchQuery) {
        const enterprise = enterprises.find(e => e.id === c.enterpriseId);
        const batch = batches.find(b => b.id === c.batchId);
        return (
          c.certificateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          enterprise?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          batch?.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      return true;
    });

  const getEnterpriseName = (enterpriseId: string) => {
    return enterprises.find(e => e.id === enterpriseId)?.name || 'Unknown';
  };

  const getBatchName = (batchId: string) => {
    return batches.find(b => b.id === batchId)?.name || 'Unknown Batch';
  };

  const selectedCert = selectedCertificate ? mockCertificates.find(c => c.id === selectedCertificate) : null;

  const stats = {
    issued: mockCertificates.filter(c => c.status === 'issued').length,
    pending: mockCertificates.filter(c => c.status === 'pending').length,
    notStarted: mockCertificates.filter(c => c.status === 'not_started').length,
    totalWeight: mockCertificates.reduce((sum, c) => sum + c.totalWeight, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-2">
            Compliance
          </span>
          <h1 className="font-brand font-bold text-3xl text-slate-900 dark:text-white uppercase tracking-tight">
            EPR Certificates
          </h1>
          <p className="font-display text-slate-500 dark:text-white/50 text-sm mt-2 uppercase tracking-wide">
            Extended Producer Responsibility documentation
          </p>
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
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Issued</span>
          </div>
          <p className="font-brand font-bold text-3xl text-emerald-400">{stats.issued}</p>
        </div>

        <div className="border border-amber-400/30 bg-amber-400/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Pending</span>
          </div>
          <p className="font-brand font-bold text-3xl text-amber-400">{stats.pending}</p>
        </div>

        <div className="border border-zinc-400/30 bg-zinc-400/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-slate-500 dark:text-white/50" />
            <span className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Not Started</span>
          </div>
          <p className="font-brand font-bold text-3xl text-slate-500 dark:text-white/50">{stats.notStarted}</p>
        </div>

        <div className="border border-ecotribe-primary/30 bg-ecotribe-primary/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-ecotribe-primary" />
            <span className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Total Weight</span>
          </div>
          <p className="font-brand font-bold text-3xl text-ecotribe-primary">
            {stats.totalWeight.toFixed(1)} <span className="text-lg">kg</span>
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
            placeholder="Search by certificate number or enterprise..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'issued', 'pending', 'not_started'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`interactive px-4 py-3 border font-mono font-bold text-xs uppercase tracking-widest transition-all ${
                statusFilter === filter
                  ? 'border-ecotribe-primary bg-ecotribe-primary/10 text-ecotribe-primary'
                  : 'border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-500 dark:text-white/50 hover:border-white/20'
              }`}
            >
              {filter === 'not_started' ? 'Not Started' : filter}
            </button>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Certificate List */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          {filteredCertificates.length > 0 ? (
            filteredCertificates.map((cert, idx) => {
              const isSelected = selectedCertificate === cert.id;

              return (
                <motion.div
                  key={cert.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setSelectedCertificate(cert.id)}
                  className={`border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-ecotribe-primary bg-ecotribe-primary/5'
                      : 'border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-white/20'
                  }`}
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 border flex items-center justify-center flex-shrink-0 ${
                        cert.status === 'issued'
                          ? 'border-emerald-400/30 bg-emerald-400/10'
                          : cert.status === 'pending'
                          ? 'border-amber-400/30 bg-amber-400/10'
                          : 'border-zinc-400/30 bg-zinc-400/10'
                      }`}>
                        <FileText className={`w-6 h-6 ${
                          cert.status === 'issued'
                            ? 'text-emerald-400'
                            : cert.status === 'pending'
                            ? 'text-amber-400'
                            : 'text-slate-500 dark:text-white/50'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-display font-bold text-slate-900 dark:text-white uppercase">
                              {getBatchName(cert.batchId)}
                            </p>
                            <p className="font-mono text-xs text-slate-500 dark:text-white/50 flex items-center gap-1 mt-1">
                              <Building2 className="w-3 h-3" />
                              {getEnterpriseName(cert.enterpriseId)}
                            </p>
                          </div>
                          <span className={`flex-shrink-0 px-2 py-1 border font-mono font-bold text-[10px] uppercase tracking-widest ${
                            cert.status === 'issued'
                              ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400'
                              : cert.status === 'pending'
                              ? 'border-amber-400/30 bg-amber-400/10 text-amber-400'
                              : 'border-zinc-400/30 bg-zinc-400/10 text-slate-500 dark:text-white/50'
                          }`}>
                            {cert.status.replace('_', ' ')}
                          </span>
                        </div>

                        {cert.certificateNumber && (
                          <p className="font-mono text-xs text-ecotribe-primary mt-2">
                            {cert.certificateNumber}
                          </p>
                        )}

                        <div className="flex items-center gap-4 mt-3 font-mono text-xs text-slate-500 dark:text-white/50">
                          <span>{cert.assetCount} assets</span>
                          <span>{cert.totalWeight} kg</span>
                          {cert.issuedAt && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(cert.issuedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] py-16 text-center">
              <div className="w-16 h-16 border border-slate-200 dark:border-white/10 bg-white/5 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-slate-500 dark:text-white/50" />
              </div>
              <h3 className="font-brand font-bold text-lg text-slate-500 dark:text-white/50 uppercase mb-2">
                No Certificates Found
              </h3>
              <p className="font-display text-sm text-slate-500 dark:text-white/50">
                {searchQuery ? 'Try adjusting your search.' : 'No EPR certificates to display.'}
              </p>
            </div>
          )}
        </motion.div>

        {/* Certificate Details */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:sticky lg:top-4 h-fit"
        >
          {selectedCert ? (
            <div className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
              <div className="p-5 border-b border-slate-200 dark:border-white/10">
                <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">
                  Certificate Details
                </h3>
              </div>

              <div className="p-5 space-y-6">
                {/* Status Badge */}
                <div className={`p-4 border ${
                  selectedCert.status === 'issued'
                    ? 'border-emerald-400/30 bg-emerald-400/10'
                    : selectedCert.status === 'pending'
                    ? 'border-amber-400/30 bg-amber-400/10'
                    : 'border-zinc-400/30 bg-zinc-400/10'
                }`}>
                  <div className="flex items-center gap-2">
                    {selectedCert.status === 'issued' ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : selectedCert.status === 'pending' ? (
                      <Clock className="w-5 h-5 text-amber-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-slate-500 dark:text-white/50" />
                    )}
                    <span className={`font-mono font-bold text-sm uppercase ${
                      selectedCert.status === 'issued'
                        ? 'text-emerald-400'
                        : selectedCert.status === 'pending'
                        ? 'text-amber-400'
                        : 'text-slate-500 dark:text-white/50'
                    }`}>
                      {selectedCert.status === 'issued' ? 'Certificate Issued' :
                       selectedCert.status === 'pending' ? 'Processing' : 'Not Started'}
                    </span>
                  </div>
                </div>

                {/* Certificate Info */}
                <div className="space-y-4">
                  {selectedCert.certificateNumber && (
                    <div>
                      <p className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase mb-1">Certificate Number</p>
                      <p className="font-mono font-bold text-lg text-ecotribe-primary">
                        {selectedCert.certificateNumber}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                      <p className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase mb-1">Assets</p>
                      <p className="font-brand font-bold text-xl text-slate-900 dark:text-white">{selectedCert.assetCount}</p>
                    </div>
                    <div className="p-4 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                      <p className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase mb-1">Total Weight</p>
                      <p className="font-brand font-bold text-xl text-slate-900 dark:text-white">{selectedCert.totalWeight} kg</p>
                    </div>
                  </div>

                  <div>
                    <p className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase mb-1">Enterprise</p>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-500 dark:text-white/50" />
                      <p className="font-display text-slate-900 dark:text-white">
                        {getEnterpriseName(selectedCert.enterpriseId)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase mb-1">Batch</p>
                    <p className="font-display text-slate-900 dark:text-white">{getBatchName(selectedCert.batchId)}</p>
                  </div>

                  {selectedCert.issuedAt && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase mb-1">Issued Date</p>
                        <p className="font-mono text-slate-900 dark:text-white">
                          {new Date(selectedCert.issuedAt).toLocaleDateString()}
                        </p>
                      </div>
                      {selectedCert.expiresAt && (
                        <div>
                          <p className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase mb-1">Expires</p>
                          <p className="font-mono text-slate-900 dark:text-white">
                            {new Date(selectedCert.expiresAt).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {selectedCert.status === 'issued' && (
                  <div className="space-y-3">
                    <button className="w-full interactive py-3 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2">
                      <Download className="w-4 h-4" />
                      Download Certificate
                    </button>
                    <button className="w-full interactive py-2.5 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-white/[0.05] transition-all flex items-center justify-center gap-2">
                      <ExternalLink className="w-4 h-4" />
                      View on CPCB Portal
                    </button>
                  </div>
                )}

                {selectedCert.status === 'pending' && (
                  <div className="p-4 border border-amber-400/30 bg-amber-400/10">
                    <p className="font-display text-sm text-amber-400">
                      Certificate is being processed. Expected within 5-7 business days.
                    </p>
                  </div>
                )}

                {selectedCert.status === 'not_started' && (
                  <button className="w-full interactive py-3 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" />
                    Initiate EPR Request
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] py-16 text-center">
              <Eye className="w-10 h-10 text-slate-500 dark:text-white/50 mx-auto mb-4" />
              <p className="font-display text-slate-500 dark:text-white/50">
                Select a certificate to view details
              </p>
            </div>
          )}
        </motion.div>
      </div>

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
