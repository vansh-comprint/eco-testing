import { motion } from 'framer-motion';
import {
  FileText,
  AlertCircle,
} from 'lucide-react';

export function EPRCertificates() {
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

      {/* Stats - All zeros for now */}
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
          <p className="font-brand font-bold text-3xl text-emerald-400">0</p>
        </div>

        <div className="border border-amber-400/30 bg-amber-400/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <span className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Pending</span>
          </div>
          <p className="font-brand font-bold text-3xl text-amber-400">0</p>
        </div>

        <div className="border border-zinc-400/30 bg-zinc-400/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-slate-500 dark:text-white/50" />
            <span className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Not Started</span>
          </div>
          <p className="font-brand font-bold text-3xl text-slate-500 dark:text-white/50">0</p>
        </div>

        <div className="border border-ecotribe-primary/30 bg-ecotribe-primary/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-ecotribe-primary" />
            <span className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Total Weight</span>
          </div>
          <p className="font-brand font-bold text-3xl text-ecotribe-primary">
            0 <span className="text-lg">kg</span>
          </p>
        </div>
      </motion.div>

      {/* Empty State */}
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
          No EPR Certificates Yet
        </h3>
        <p className="font-display text-sm text-slate-500 dark:text-white/50 max-w-md mx-auto">
          EPR certificates will appear here once your batches are processed and disposed through our certified recycling partners.
        </p>
      </motion.div>

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
