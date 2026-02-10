import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStoreApi } from '@/stores';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { login, isLoading } = useAuthStoreApi();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const navigateByRole = () => {
    const user = useAuthStoreApi.getState().user;
    switch (user?.role) {
      case 'super_admin':
        navigate('/super');
        break;
      case 'ops_admin':
        navigate('/ops');
        break;
      case 'it_admin':
        navigate('/admin');
        break;
      case 'org_admin':
        navigate('/org-admin');
        break;
      case 'logistics_admin':
        navigate('/logistics-admin');
        break;
      case 'logistics_user':
        navigate('/logistics');
        break;
      case 'employee':
        navigate('/check-in');
        break;
      default:
        navigate('/admin');
    }
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

    if (!password) {
      setError('Password is required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Clear stale React Query cache from any previous session
    queryClient.clear();
    const result = await login(email, password);
    if (result.success) {
      navigateByRole();
    } else {
      setError(result.error || 'Invalid login credentials');
    }
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
          <p className="text-black/60 dark:text-zinc-400 mt-2 font-mono text-xs uppercase tracking-wider">B2B Refurbished Laptop Trade-In</p>
        </div>

        <div className="p-5 sm:p-8 bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-black/10 dark:border-white/5 shadow-2xl dark:shadow-none">
          <div className="text-center mb-6">
            <h2 className="font-brand font-bold text-xl sm:text-2xl text-black dark:text-white uppercase">Welcome Back</h2>
            <p className="text-black/60 dark:text-zinc-400 mt-2 font-mono text-xs uppercase tracking-wider">
              Sign in to your account
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 text-sm font-mono mb-6"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="font-mono text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 dark:text-zinc-500" />
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                  data-testid="login-email"
                  className="w-full bg-white/40 dark:bg-black/40 border border-black/10 dark:border-white/10 font-mono text-xs focus:outline-none focus:border-ecotribe-primary pl-12 pr-4 py-3 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-zinc-600"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-mono text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 dark:text-zinc-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  data-testid="login-password"
                  className="w-full bg-white/40 dark:bg-black/40 border border-black/10 dark:border-white/10 font-mono text-xs focus:outline-none focus:border-ecotribe-primary pl-12 pr-12 py-3 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-zinc-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-black/30 dark:text-zinc-500 hover:text-black/60 dark:hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              data-testid="login-submit"
              className="w-full px-6 py-3 bg-ecotribe-primary text-black font-brand font-bold uppercase text-xs tracking-wider btn-chamfer hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center space-y-2">
              <Link
                to="/forgot-password"
                className="text-black/60 dark:text-white/60 hover:text-ecotribe-primary text-xs font-mono transition-colors block"
              >
                Forgot your password?
              </Link>
            </div>
          </form>

          {/* Common footer */}
          <div className="text-center mt-6">
            <p className="text-black/60 dark:text-white/60 text-sm font-mono">
              Don't have an account?{' '}
              <Link to="/signup" className="text-ecotribe-primary hover:text-black dark:hover:text-white transition-colors font-bold">
                Register your enterprise
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
