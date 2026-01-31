import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStoreApi } from '@/stores';
import { Mail, Lock, ArrowRight, Eye, EyeOff, Smartphone } from 'lucide-react';

type LoginMode = 'password' | 'otp';
type OtpStep = 'email' | 'verify';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, requestOTP, loginWithOTP, isLoading } = useAuthStoreApi();
  const [loginMode, setLoginMode] = useState<LoginMode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [otp, setOtp] = useState('');
  const [otpStep, setOtpStep] = useState<OtpStep>('email');
  const [otpSending, setOtpSending] = useState(false);

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

    const result = await login(email, password);
    if (result.success) {
      navigateByRole();
    } else {
      if (result.error?.toLowerCase().includes('otp')) {
        setError('Employees must use OTP login. Switch to the "Employee OTP" tab.');
      } else {
        setError(result.error || 'Invalid login credentials');
      }
    }
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
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

    setOtpSending(true);
    try {
      const result = await requestOTP(email);
      if (result.success) {
        setOtpStep('verify');
      } else {
        setError(result.error || 'Failed to send OTP. Please try again.');
      }
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!otp || otp.length < 4) {
      setError('Please enter the OTP sent to your email');
      return;
    }

    const result = await loginWithOTP(email, otp);
    if (result.success) {
      navigateByRole();
    } else {
      setError(result.error || 'Invalid OTP. Please try again.');
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

        <div className="p-8 bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-black/10 dark:border-white/5 shadow-2xl dark:shadow-none">
          <div className="text-center mb-6">
            <h2 className="font-brand font-bold text-2xl text-black dark:text-white uppercase">Welcome Back</h2>
            <p className="text-black/60 dark:text-zinc-400 mt-2 font-mono text-xs uppercase tracking-wider">
              Sign in to your account
            </p>
          </div>

          {/* Login Mode Tabs */}
          <div className="flex mb-6 border border-black/10 dark:border-white/10">
            <button
              type="button"
              onClick={() => { setLoginMode('password'); setError(''); setOtpStep('email'); setOtp(''); }}
              className={`flex-1 py-2.5 font-mono text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${
                loginMode === 'password'
                  ? 'bg-ecotribe-primary text-black font-bold'
                  : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              Password
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode('otp'); setError(''); setPassword(''); }}
              className={`flex-1 py-2.5 font-mono text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${
                loginMode === 'otp'
                  ? 'bg-ecotribe-primary text-black font-bold'
                  : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Employee OTP
            </button>
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

          {/* Password Login Form */}
          {loginMode === 'password' && (
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
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-black/30 dark:text-zinc-500 hover:text-black/60 dark:hover:text-zinc-300 transition-colors"
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
          )}

          {/* OTP Login Form */}
          {loginMode === 'otp' && (
            <>
              {otpStep === 'email' && (
                <form onSubmit={handleRequestOTP} className="space-y-6">
                  <div className="bg-ecotribe-primary/10 border border-ecotribe-primary/20 px-4 py-3 font-mono text-xs text-black/70 dark:text-white/70">
                    Enter your employee email to receive a one-time password.
                  </div>

                  <div className="space-y-2">
                    <label className="font-mono text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50">Employee Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 dark:text-zinc-500" />
                      <input
                        type="email"
                        placeholder="employee@company.com"
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
                    disabled={isLoading || otpSending}
                    className="w-full px-6 py-3 bg-ecotribe-primary text-black font-brand font-bold uppercase text-xs tracking-wider btn-chamfer hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {otpSending ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Sending OTP...
                      </span>
                    ) : (
                      <>
                        Send OTP
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {otpStep === 'verify' && (
                <form onSubmit={handleVerifyOTP} className="space-y-6">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 font-mono text-xs text-emerald-700 dark:text-emerald-300">
                    OTP sent to {email}. Check your email and enter the code below.
                  </div>

                  <div className="space-y-2">
                    <label className="font-mono text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50">One-Time Password</label>
                    <div className="relative">
                      <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 dark:text-zinc-500" />
                      <input
                        type="text"
                        placeholder="Enter OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        autoFocus
                        autoComplete="one-time-code"
                        inputMode="numeric"
                        className="w-full bg-white/40 dark:bg-black/40 border border-black/10 dark:border-white/10 font-mono text-lg tracking-[0.5em] text-center focus:outline-none focus:border-ecotribe-primary pl-12 pr-4 py-3 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-zinc-600 placeholder:tracking-normal placeholder:text-xs"
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
                        Verifying...
                      </span>
                    ) : (
                      <>
                        Verify & Sign In
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => { setOtpStep('email'); setOtp(''); setError(''); }}
                      className="text-black/60 dark:text-white/60 hover:text-ecotribe-primary text-xs font-mono transition-colors"
                    >
                      Use a different email
                    </button>
                    <span className="mx-2 text-black/20 dark:text-white/20">|</span>
                    <button
                      type="button"
                      onClick={async () => {
                        setError('');
                        setOtpSending(true);
                        try {
                          const result = await requestOTP(email);
                          if (!result.success) {
                            setError(result.error || 'Failed to resend OTP');
                          }
                        } finally {
                          setOtpSending(false);
                        }
                      }}
                      disabled={otpSending}
                      className="text-black/60 dark:text-white/60 hover:text-ecotribe-primary text-xs font-mono transition-colors disabled:opacity-50"
                    >
                      {otpSending ? 'Sending...' : 'Resend OTP'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

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
