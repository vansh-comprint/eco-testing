import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Package, Clock, Mail } from 'lucide-react';
import { text, iconSize } from '@/lib/design-tokens';

export function SubmissionSuccess() {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="border border-slate-200/80 dark:border-zinc-800 bg-white/75 dark:bg-zinc-900/85 backdrop-blur-md"
      >
        <div className="py-16 px-8 text-center">
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1, bounce: 0.5 }}
            className="w-20 h-20 border border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-8"
          >
            <CheckCircle className={`${iconSize['2xl']} text-emerald-500`} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 tracking-[0.3em] uppercase block mb-3">
              Submission Complete
            </span>
            <h1 className={`font-brand font-bold text-3xl uppercase tracking-tight mb-4 ${text.primary}`}>
              Device Submitted Successfully
            </h1>
            <p className={`font-display max-w-md mx-auto mb-10 ${text.muted}`}>
              We emailed you the Ecotribe Agent link. Open it on this device to run diagnostics; remote review starts as soon as you do. We'll notify you when the assessment is done.
            </p>
          </motion.div>

          {/* Next Steps */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="border border-slate-200/80 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 mb-8"
          >
            <div className="p-5 border-b border-slate-200/80 dark:border-zinc-800">
              <h2 className={`font-display font-bold text-sm uppercase tracking-wide ${text.primary}`}>What's Next?</h2>
            </div>
            <div className="divide-y divide-slate-200/60 dark:divide-zinc-800/60">
              <div className="p-5 flex items-start gap-4">
                <div className="w-10 h-10 border border-blue-500/25 dark:border-blue-400/20 bg-blue-50/80 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Mail className={`${iconSize.lg} text-blue-500 dark:text-blue-400`} />
                </div>
                <div className="text-left">
                  <p className={`font-display font-bold text-sm uppercase ${text.primary}`}>Check Your Email</p>
                  <p className={`font-mono text-xs mt-1 ${text.muted}`}>
                    We've sent the Ecotribe Agent link. Run it now to kick off remote review.
                  </p>
                </div>
              </div>
              <div className="p-5 flex items-start gap-4">
                <div className="w-10 h-10 border border-purple-500/25 dark:border-purple-400/20 bg-purple-50/80 dark:bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <Clock className={`${iconSize.lg} text-purple-500 dark:text-purple-400`} />
                </div>
                <div className="text-left">
                  <p className={`font-display font-bold text-sm uppercase ${text.primary}`}>Remote Review (24-48 hrs)</p>
                  <p className={`font-mono text-xs mt-1 ${text.muted}`}>
                    Technicians review your answers and agent diagnostics. We'll update you on the result.
                  </p>
                </div>
              </div>
              <div className="p-5 flex items-start gap-4">
                <div className="w-10 h-10 border border-purple-500/25 dark:border-purple-400/20 bg-purple-50/80 dark:bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <Mail className={`${iconSize.lg} text-purple-500 dark:text-purple-400`} />
                </div>
                <div className="text-left">
                  <p className={`font-display font-bold text-sm uppercase ${text.primary}`}>Review Notification</p>
                  <p className={`font-mono text-xs mt-1 ${text.muted}`}>
                    You'll receive an email with the assessment results
                  </p>
                </div>
              </div>
              <div className="p-5 flex items-start gap-4">
                <div className="w-10 h-10 border border-lime-500/25 dark:border-lime-400/20 bg-lime-50/80 dark:bg-lime-500/10 flex items-center justify-center flex-shrink-0">
                  <Package className={`${iconSize.lg} text-lime-500`} />
                </div>
                <div className="text-left">
                  <p className={`font-display font-bold text-sm uppercase ${text.primary}`}>Device Pickup</p>
                  <p className={`font-mono text-xs mt-1 ${text.muted}`}>
                    Once approved, we'll pick up the device at your scheduled time
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <button
              onClick={() => navigate('/check-in')}
              className="px-8 py-3 bg-lime-500 text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-lime-400 hover:shadow-[0_0_20px_rgba(132,204,22,0.3)] transition-all inline-flex items-center gap-2"
            >
              Back to Dashboard
              <ArrowRight className={iconSize.md} />
            </button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

export default SubmissionSuccess;
