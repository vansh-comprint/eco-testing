import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  Mail,
  Laptop,
  ClipboardCheck,
  Home,
} from 'lucide-react';
import { text, iconSize } from '@/lib/design-tokens';

export function SubmissionSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-redirect to dashboard after 8 seconds
    const timer = setTimeout(() => {
      navigate('/check-in');
    }, 8000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 -m-4 md:-m-6 lg:-m-8 bg-lime-50/30 dark:bg-lime-500/[0.02]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg w-full"
      >
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="w-20 h-20 bg-lime-500 border-4 border-lime-500/30 mx-auto mb-6 flex items-center justify-center"
        >
          <CheckCircle className="w-12 h-12 text-black" />
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center mb-8"
        >
          <h1 className={`text-2xl md:text-3xl font-bold mb-2 ${text.primary}`}>
            Submission Successful!
          </h1>
          <p className={`text-sm ${text.muted}`}>
            Your device has been submitted for review
          </p>
        </motion.div>

        {/* Next Steps */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/75 dark:bg-zinc-900/85 backdrop-blur-md border border-slate-200/80 dark:border-zinc-800 p-6 mb-6"
        >
          <h2 className={`text-xs font-bold uppercase tracking-wider mb-4 ${text.muted}`}>
            What Happens Next?
          </h2>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-lime-50/80 dark:bg-lime-500/10 border border-lime-500/25 dark:border-lime-400/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-lime-600 dark:text-lime-400">1</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Mail className={`${iconSize.md} text-blue-500 dark:text-blue-400`} />
                  <h3 className={`text-sm font-bold ${text.primary}`}>Email Confirmation</h3>
                </div>
                <p className={`text-xs ${text.muted}`}>
                  You'll receive an email with confirmation details and a link to our internal review agent software.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-lime-50/80 dark:bg-lime-500/10 border border-lime-500/25 dark:border-lime-400/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-lime-600 dark:text-lime-400">2</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Laptop className={`${iconSize.md} text-purple-500 dark:text-purple-400`} />
                  <h3 className={`text-sm font-bold ${text.primary}`}>Internal Review Agent</h3>
                </div>
                <p className={`text-xs ${text.muted}`}>
                  Run the automated software agent on your device for comprehensive internal diagnostics before pickup.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-lime-50/80 dark:bg-lime-500/10 border border-lime-500/25 dark:border-lime-400/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-lime-600 dark:text-lime-400">3</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardCheck className={`${iconSize.md} text-emerald-500 dark:text-emerald-400`} />
                  <h3 className={`text-sm font-bold ${text.primary}`}>Remote Review</h3>
                </div>
                <p className={`text-xs ${text.muted}`}>
                  Our team will review your submission and agent diagnostics within 24-48 hours. You'll be notified of the outcome.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Important Note */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-blue-50/80 dark:bg-blue-500/10 border border-blue-500/25 dark:border-blue-400/20 p-4 mb-6 flex gap-3"
        >
          <Mail className={`${iconSize.lg} text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5`} />
          <div>
            <p className="text-sm text-blue-700 dark:text-blue-400 font-medium mb-1">Check Your Email</p>
            <p className="text-xs text-blue-600 dark:text-blue-300/80">
              We've sent detailed instructions to your registered email address. Please check your inbox (and spam folder) for the review agent download link.
            </p>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex gap-3"
        >
          <button
            onClick={() => navigate('/check-in')}
            className="flex-1 py-3.5 bg-lime-500 text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-lime-400 hover:shadow-[0_0_20px_rgba(132,204,22,0.3)] transition-all flex items-center justify-center gap-2"
          >
            <Home className={iconSize.md} />
            Back to Dashboard
          </button>
        </motion.div>

        {/* Auto-redirect notice */}
        <p className={`text-center text-xs mt-4 ${text.muted}`}>
          Redirecting to dashboard in 8 seconds...
        </p>
      </motion.div>
    </div>
  );
}

export default SubmissionSuccess;
