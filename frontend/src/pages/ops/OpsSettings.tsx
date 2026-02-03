/**
 * STATUS: COMPLETE
 * Consolidated: ops/OpsSettings.tsx (OPS Admin settings — profile, password change)
 * Verified: [ ] visual regression [ ] permissions
 */
import { motion } from 'framer-motion';
import { ProfileSettings, PasswordChange } from '@/components/settings';

export function OpsSettings() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-2">Operations</span>
          <h1 className="font-brand font-bold text-3xl md:text-4xl text-slate-900 dark:text-white uppercase tracking-tight">
            Settings
          </h1>
          <p className="font-display text-slate-600 dark:text-zinc-500 text-sm mt-2 uppercase tracking-wide">Manage your account preferences</p>
        </motion.div>
      </div>

      {/* Profile */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <ProfileSettings />
      </motion.div>

      {/* Security */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="bg-white/80 dark:bg-black/40 backdrop-blur-md border border-slate-200 dark:border-white/10 btn-chamfer">
          <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center gap-3">
            <h2 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">Security</h2>
          </div>
          <div className="p-5">
            <PasswordChange />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default OpsSettings;
