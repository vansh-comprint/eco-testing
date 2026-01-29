import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Laptop,
  ArrowRight,
  FileText,
  MessageCircle,
  CheckCircle,
  Clock,
  Package,
  ChevronRight,
  AlertCircle,
  Truck,
  ClipboardCheck,
  RefreshCw,
} from 'lucide-react';
import { useAuth, useAllAssets } from '@/hooks';
import { assetStatusLabels } from '@/types/asset';
import type { AssetStatus } from '@/types/asset';
import { glass, text, iconSize } from '@/lib/design-tokens';
import { contentVariants, createSectionTransition } from '@/lib/animations';

export function SubUserDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: assets = [] } = useAllAssets();

  // Get assets assigned to this sub-user
  const myAssets = assets.filter(a => a.assigned_sub_user_id === user?.id);
  const pendingAssets = myAssets.filter(a => a.status === 'assigned' || a.status === 'check_in_started');
  const submittedAssets = myAssets.filter(a => !['pending_assignment', 'assigned', 'check_in_started'].includes(a.status));

  const getStatusConfig = (status: AssetStatus) => {
    const configs: Record<string, { step: number; bg: string; border: string; text: string; icon: any; message: string }> = {
      // Step 1: Submitted
      'submitted': { step: 1, bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-500/30 dark:border-blue-400/20', text: 'text-blue-700 dark:text-blue-400', icon: Clock, message: 'Submitted - awaiting review' },
      // Step 2: Review
      'remote_review': { step: 2, bg: 'bg-purple-50 dark:bg-purple-500/10', border: 'border-purple-500/30 dark:border-purple-400/20', text: 'text-purple-700 dark:text-purple-400', icon: ClipboardCheck, message: 'Remote review in progress' },
      'conditionally_accepted': { step: 2, bg: 'bg-lime-50 dark:bg-lime-500/10', border: 'border-lime-500/30 dark:border-lime-400/20', text: 'text-lime-700 dark:text-lime-400', icon: CheckCircle, message: 'Review approved - awaiting pickup' },
      'remote_rejected': { step: 2, bg: 'bg-red-50 dark:bg-red-500/10', border: 'border-red-500/30 dark:border-red-400/20', text: 'text-red-700 dark:text-red-400', icon: AlertCircle, message: 'Remote review unsuccessful' },
      // Step 3: Pickup & Transit
      'pickup_requested': { step: 3, bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-500/30 dark:border-amber-400/20', text: 'text-amber-700 dark:text-amber-400', icon: Clock, message: 'Pickup requested - scheduling in progress' },
      'pickup_scheduled': { step: 3, bg: 'bg-purple-50 dark:bg-purple-500/10', border: 'border-purple-500/30 dark:border-purple-400/20', text: 'text-purple-700 dark:text-purple-400', icon: Truck, message: 'Pickup scheduled - prepare your device' },
      'picked_up': { step: 3, bg: 'bg-lime-50 dark:bg-lime-500/10', border: 'border-lime-500/30 dark:border-lime-400/20', text: 'text-lime-700 dark:text-lime-400', icon: Truck, message: 'Device picked up' },
      'in_transit': { step: 3, bg: 'bg-purple-50 dark:bg-purple-500/10', border: 'border-purple-500/30 dark:border-purple-400/20', text: 'text-purple-700 dark:text-purple-400', icon: Truck, message: 'In transit to facility' },
      'facility_qc': { step: 3, bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-500/30 dark:border-blue-400/20', text: 'text-blue-700 dark:text-blue-400', icon: RefreshCw, message: 'Quality check in progress' },
      // Step 4: Done
      'final_accepted': { step: 4, bg: 'bg-lime-50 dark:bg-lime-500/10', border: 'border-lime-500/30 dark:border-lime-400/20', text: 'text-lime-700 dark:text-lime-400', icon: CheckCircle, message: 'Approved!' },
      'final_rejected': { step: 4, bg: 'bg-red-50 dark:bg-red-500/10', border: 'border-red-500/30 dark:border-red-400/20', text: 'text-red-700 dark:text-red-400', icon: AlertCircle, message: 'Failed QC' },
      'payout_pending': { step: 4, bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-500/30 dark:border-amber-400/20', text: 'text-amber-700 dark:text-amber-400', icon: Clock, message: 'Payout processing' },
      'completed': { step: 4, bg: 'bg-lime-50 dark:bg-lime-500/10', border: 'border-lime-500/30 dark:border-lime-400/20', text: 'text-lime-700 dark:text-lime-400', icon: CheckCircle, message: 'Complete!' },
    };
    return configs[status] || { step: 0, bg: 'bg-slate-50 dark:bg-zinc-800/50', border: 'border-slate-200 dark:border-zinc-700', text: 'text-slate-600 dark:text-zinc-400', icon: Clock, message: 'Processing' };
  };

  const steps = [
    { label: 'Submitted', id: 1 },
    { label: 'Review', id: 2 },
    { label: 'Pickup', id: 3 },
    { label: 'Done', id: 4 },
  ];

  return (
    <div className="space-y-6 -m-4 md:m-0">
      {/* Header */}
      <div className="px-4 pt-6 pb-6 md:px-0 md:pt-0 border-b border-slate-200/80 dark:border-zinc-800">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="font-mono font-bold text-xs text-lime-600 dark:text-lime-400 tracking-[0.3em] uppercase block mb-2">
            Device Check-in
          </span>
          <h1 className={`font-brand font-bold text-2xl md:text-3xl uppercase tracking-tight ${text.primary}`}>
            Hi, {user?.name?.split(' ')[0]}!
          </h1>
          <p className={`font-display text-sm mt-1 uppercase tracking-wide ${text.muted}`}>
            Submit your device for trade-in
          </p>
        </motion.div>

        {/* Quick Stats with left-border accent */}
        {myAssets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex gap-3 mt-6"
          >
            {pendingAssets.length > 0 && (
              <div className="flex-1 bg-amber-50 dark:bg-amber-500/10 border border-amber-500/30 dark:border-amber-400/20 border-l-4 border-l-amber-500 p-4 shadow-sm shadow-amber-500/5">
                <p className="font-brand font-bold text-2xl text-amber-600 dark:text-amber-400">{pendingAssets.length}</p>
                <p className="font-mono text-xs text-amber-700 dark:text-amber-300/80 uppercase tracking-wider">Pending</p>
              </div>
            )}
            {submittedAssets.length > 0 && (
              <div className="flex-1 bg-blue-50 dark:bg-blue-500/10 border border-blue-500/30 dark:border-blue-400/20 border-l-4 border-l-blue-500 p-4 shadow-sm shadow-blue-500/5">
                <p className="font-brand font-bold text-2xl text-blue-600 dark:text-blue-400">{submittedAssets.length}</p>
                <p className="font-mono text-xs text-blue-700 dark:text-blue-300/80 uppercase tracking-wider">In Progress</p>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Pending Devices - Action Required */}
      {pendingAssets.length > 0 && (
        <motion.div
          variants={contentVariants}
          initial="initial"
          animate="animate"
          transition={createSectionTransition(0.15)}
          className="px-4 md:px-0"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 bg-amber-400 animate-pulse" />
            <h2 className={`font-brand font-bold text-sm uppercase tracking-wide ${text.primary}`}>
              Action Required
            </h2>
          </div>
          <div className="space-y-3">
            {pendingAssets.map((asset) => (
              <motion.div
                key={asset.id}
                onClick={() => navigate(`/check-in/submit/${asset.id}`)}
                className="bg-lime-50 dark:bg-lime-500/[0.08] border border-lime-500/30 dark:border-lime-400/20 border-l-4 border-l-lime-500 p-4 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-all hover:border-lime-500/40 dark:hover:border-lime-400/30 shadow-sm shadow-lime-500/5"
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-14 h-14 bg-lime-100 dark:bg-lime-500/20 flex items-center justify-center flex-shrink-0 border border-lime-500/25">
                  <Laptop className="w-7 h-7 text-lime-600 dark:text-lime-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-bold truncate ${text.primary}`}>
                    {asset.brand} {asset.model}
                  </h3>
                  <p className={`text-xs font-mono truncate ${text.muted}`}>S/N: {asset.serial_number}</p>
                  <span className="inline-flex items-center gap-1 text-xs text-lime-600 dark:text-lime-400 font-bold uppercase tracking-wider mt-1">
                    {asset.status === 'check_in_started' ? 'Continue Check-in' : 'Start Check-in'}
                    <ArrowRight className={iconSize.xs} />
                  </span>
                </div>
                <ChevronRight className={`${iconSize.lg} text-lime-500 flex-shrink-0`} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Submitted Devices - Progress */}
      {submittedAssets.length > 0 && (
        <motion.div
          variants={contentVariants}
          initial="initial"
          animate="animate"
          transition={createSectionTransition(0.2)}
          className="px-4 md:px-0"
        >
          <h2 className={`font-brand font-bold text-sm uppercase tracking-wide mb-4 ${text.primary}`}>
            Your Submissions
          </h2>
          <div className="space-y-3">
            {submittedAssets.map((asset) => {
              const config = getStatusConfig(asset.status);
              const StatusIcon = config.icon;

              return (
                <div
                  key={asset.id}
                  className="bg-white dark:bg-zinc-900/85 backdrop-blur-md border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-sm shadow-slate-900/[0.03]"
                >
                  {/* Device Info */}
                  <div className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 flex items-center justify-center flex-shrink-0">
                      <Laptop className={`${iconSize.xl} ${text.muted}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-bold truncate text-sm ${text.primary}`}>
                        {asset.brand} {asset.model}
                      </h3>
                      <p className={`text-xs font-mono truncate ${text.muted}`}>S/N: {asset.serial_number}</p>
                    </div>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 ${config.bg} border ${config.border}`}>
                      <StatusIcon className={`${iconSize.sm} ${config.text}`} />
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${config.text}`}>
                        {assetStatusLabels[asset.status]}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="px-4 pb-4">
                    <div className="flex items-center gap-1 mb-2">
                      {steps.map((step) => {
                        const isCompleted = step.id < config.step;
                        const isCurrent = step.id === config.step;
                        return (
                          <div key={step.id} className="flex-1 flex items-center gap-1">
                            <div
                              className={`h-1.5 flex-1 transition-all ${
                                isCompleted ? 'bg-lime-500' :
                                isCurrent ? 'bg-lime-500/50' :
                                'bg-slate-200 dark:bg-zinc-700'
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between">
                      {steps.map((step) => (
                        <span
                          key={step.id}
                          className={`text-[9px] uppercase font-bold tracking-wider ${
                            step.id <= config.step ? 'text-lime-600 dark:text-lime-400' : text.muted
                          }`}
                        >
                          {step.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Status Message */}
                  <div className={`px-4 py-3 ${config.bg} border-t ${config.border} flex items-center gap-2`}>
                    <StatusIcon className={`${iconSize.md} ${config.text}`} />
                    <span className={`text-xs font-medium ${config.text}`}>{config.message}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* No Assets */}
      {myAssets.length === 0 && (
        <motion.div
          variants={contentVariants}
          initial="initial"
          animate="animate"
          transition={createSectionTransition(0.2)}
          className="px-4 md:px-0"
        >
          <div className="bg-white dark:bg-zinc-900/85 backdrop-blur-md border border-slate-200 dark:border-zinc-800 py-16 px-6 text-center shadow-sm shadow-slate-900/[0.03]">
            <div className="w-20 h-20 bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 flex items-center justify-center mx-auto mb-6">
              <Package className={`${iconSize['2xl']} ${text.muted}`} />
            </div>
            <h3 className={`font-brand font-bold text-lg uppercase tracking-wide mb-2 ${text.secondary}`}>
              No Devices Assigned
            </h3>
            <p className={`text-sm max-w-xs mx-auto ${text.muted}`}>
              You don't have any devices assigned for submission. Contact your IT administrator if you need to submit a laptop.
            </p>
          </div>
        </motion.div>
      )}

      {/* Help Section */}
      <motion.div
        variants={contentVariants}
        initial="initial"
        animate="animate"
        transition={createSectionTransition(0.3)}
        className="px-4 md:px-0 pb-6"
      >
        <h2 className={`font-brand font-bold text-sm uppercase tracking-wide mb-4 ${text.primary}`}>
          Need Help?
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div
            onClick={() => navigate('/check-in/help')}
            className="bg-white dark:bg-zinc-900/85 backdrop-blur-md border border-slate-200 dark:border-zinc-800 p-4 cursor-pointer active:scale-[0.98] transition-all hover:border-lime-500/30 dark:hover:border-lime-400/20 shadow-sm shadow-slate-900/[0.02]"
          >
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 border border-blue-500/25 flex items-center justify-center mb-3">
              <FileText className={`${iconSize.lg} text-blue-500 dark:text-blue-400`} />
            </div>
            <h3 className={`font-bold text-sm mb-1 ${text.primary}`}>Guide</h3>
            <p className={`text-[11px] ${text.muted}`}>How to prepare your device</p>
          </div>

          <div className="bg-white dark:bg-zinc-900/85 backdrop-blur-md border border-slate-200 dark:border-zinc-800 p-4 cursor-pointer active:scale-[0.98] transition-all hover:border-lime-500/30 dark:hover:border-lime-400/20 shadow-sm shadow-slate-900/[0.02]">
            <div className="w-10 h-10 bg-purple-50 dark:bg-purple-500/10 border border-purple-500/25 flex items-center justify-center mb-3">
              <MessageCircle className={`${iconSize.lg} text-purple-500 dark:text-purple-400`} />
            </div>
            <h3 className={`font-bold text-sm mb-1 ${text.primary}`}>Support</h3>
            <p className={`text-[11px] ${text.muted}`}>Chat with our team</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default SubUserDashboard;
