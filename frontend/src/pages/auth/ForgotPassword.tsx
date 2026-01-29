import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

/**
 * Forgot Password Page
 *
 * Allows users to request a password reset link via email.
 * Currently shows a success message for UX - actual email sending
 * would be implemented via backend API.
 */
export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    // TODO: Implement actual password reset API call
    // For now, simulate a successful request
    await new Promise(resolve => setTimeout(resolve, 1000));

    setIsLoading(false);
    setIsSubmitted(true);
  };

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
          {isSubmitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="font-brand font-bold text-xl text-black dark:text-white mb-2">
                Check Your Email
              </h2>
              <p className="text-black/60 dark:text-zinc-400 font-mono text-sm mb-6">
                If an account exists for <span className="text-ecotribe-primary">{email}</span>,
                you will receive a password reset link shortly.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-ecotribe-primary hover:text-black dark:hover:text-white transition-colors font-mono text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>
            </motion.div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h2 className="font-brand font-bold text-2xl text-black dark:text-white uppercase">
                  Reset Password
                </h2>
                <p className="text-black/60 dark:text-zinc-400 mt-2 font-mono text-xs uppercase tracking-wider">
                  Enter your email to receive a reset link
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 text-sm font-mono"
                  >
                    {error}
                  </motion.div>
                )}

                <div className="space-y-2">
                  <label className="font-mono text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 dark:text-zinc-500" />
                    <input
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      autoFocus
                      className="w-full bg-white/40 dark:bg-black/40 border border-black/10 dark:border-white/10 font-mono text-xs focus:outline-none focus:border-ecotribe-primary pl-12 pr-4 py-3 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-zinc-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-6 py-3 bg-ecotribe-primary text-black font-brand font-bold uppercase text-xs tracking-wider btn-chamfer hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>

                <div className="text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-black/60 dark:text-white/60 hover:text-ecotribe-primary transition-colors font-mono text-sm"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Login
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
