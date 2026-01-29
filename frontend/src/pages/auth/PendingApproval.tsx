import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Mail, CheckCircle2 } from 'lucide-react';

export function PendingApproval() {
  const location = useLocation();
  const { companyName, email } = location.state || { companyName: 'Your company', email: '' };

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <motion.h1
              className="font-brand font-black text-4xl tracking-tight text-black dark:text-white leading-none"
              whileHover={{ scale: 1.02 }}
            >
              ECO<span className="text-ecotribe-primary">/</span><span className="text-ecotribe-primary">TRIBE</span>
            </motion.h1>
          </Link>
        </div>

        <div className="p-8 bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-black/10 dark:border-white/5 shadow-2xl dark:shadow-none">
          {/* Success Icon */}
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="inline-flex items-center justify-center w-20 h-20 bg-ecotribe-primary/20 border-2 border-ecotribe-primary rounded-full mb-4"
            >
              <Clock className="w-10 h-10 text-ecotribe-primary" />
            </motion.div>
            <h2 className="font-brand font-bold text-2xl text-black dark:text-white uppercase mb-2">
              Registration Submitted
            </h2>
            <p className="text-black/60 dark:text-zinc-400 font-mono text-xs uppercase tracking-wider">
              Awaiting Admin Approval
            </p>
          </div>

          {/* Details */}
          <div className="space-y-4 mb-8">
            <div className="bg-white/40 dark:bg-black/40 border border-black/10 dark:border-white/10 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-ecotribe-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-mono text-xs uppercase tracking-widest text-black/50 dark:text-white/50 mb-1">
                    Enterprise Name
                  </p>
                  <p className="font-display font-bold text-sm text-black dark:text-white">
                    {companyName}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-ecotribe-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-mono text-xs uppercase tracking-widest text-black/50 dark:text-white/50 mb-1">
                    Contact Email
                  </p>
                  <p className="font-display text-sm text-black dark:text-white">
                    {email}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 p-4">
              <p className="text-yellow-600 dark:text-yellow-400 text-sm font-mono">
                <strong className="font-bold">What happens next?</strong>
                <br />
                Your registration has been sent to our admin team. You will receive an email notification once your enterprise is approved. This typically takes 1-2 business days.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Link
              to="/login"
              className="block w-full px-6 py-3 bg-ecotribe-primary text-black font-brand font-bold uppercase text-xs tracking-wider text-center btn-chamfer hover:bg-white transition-colors"
            >
              Back to Login
            </Link>
            <Link
              to="/"
              className="block w-full px-6 py-3 bg-white/40 dark:bg-black/40 border border-black/10 dark:border-white/10 text-black dark:text-white font-brand font-bold uppercase text-xs tracking-wider text-center hover:bg-white/60 dark:hover:bg-black/60 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>

        {/* Help Text */}
        <p className="text-center text-black/40 dark:text-white/40 text-xs mt-6 font-mono">
          Need help? Contact us at{' '}
          <a href="mailto:support@ecotribe.io" className="text-ecotribe-primary hover:text-black dark:hover:text-white transition-colors">
            support@ecotribe.io
          </a>
        </p>
      </motion.div>
    </div>
  );
}
