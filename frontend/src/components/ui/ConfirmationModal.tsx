import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  details?: React.ReactNode;
}

const variantConfig = {
  danger: {
    Icon: AlertTriangle,
    iconBg: 'bg-red-500/10 border-red-500/30',
    iconColor: 'text-red-500',
    titleColor: 'text-red-500',
    headerBg: 'bg-red-500/5',
    headerBorder: 'border-red-500/20',
    modalBorder: 'border-red-500/30',
    confirmBg: 'bg-red-500 hover:bg-red-600 border-red-600',
    confirmText: 'text-white',
  },
  warning: {
    Icon: AlertCircle,
    iconBg: 'bg-amber-500/10 border-amber-500/30',
    iconColor: 'text-amber-500',
    titleColor: 'text-amber-500',
    headerBg: 'bg-amber-500/5',
    headerBorder: 'border-amber-500/20',
    modalBorder: 'border-amber-500/30',
    confirmBg: 'bg-amber-500 hover:bg-amber-600 border-amber-600',
    confirmText: 'text-black',
  },
  info: {
    Icon: Info,
    iconBg: 'bg-blue-500/10 border-blue-500/30',
    iconColor: 'text-blue-500',
    titleColor: 'text-blue-500',
    headerBg: 'bg-blue-500/5',
    headerBorder: 'border-blue-500/20',
    modalBorder: 'border-blue-500/30',
    confirmBg: 'bg-ecotribe-primary hover:bg-white border-ecotribe-primary',
    confirmText: 'text-black',
  },
};

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  isLoading = false,
  details,
}: ConfirmationModalProps) {
  const config = variantConfig[variant];
  const { Icon } = config;

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`w-full max-w-md bg-white/95 dark:bg-black/95 backdrop-blur-xl border ${config.modalBorder} shadow-2xl relative max-sm:rounded-t-xl max-sm:border-b-0`}
            >
              {/* Header */}
              <div className={`flex items-start justify-between p-5 border-b ${config.headerBorder} ${config.headerBg}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 ${config.iconBg} border flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${config.iconColor}`} />
                  </div>
                  <div>
                    <h3 className={`font-display font-bold text-base uppercase tracking-wide ${config.titleColor} mb-1`}>
                      {title}
                    </h3>
                    <p className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                      Please confirm this action
                    </p>
                  </div>
                </div>
                {!isLoading && (
                  <button
                    onClick={handleClose}
                    className={`p-1.5 text-zinc-500 hover:${config.iconColor} transition-colors`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="p-5 space-y-4">
                {/* Description */}
                <div className={`${config.headerBg} border ${config.headerBorder} p-4`}>
                  <p className="font-mono text-sm text-zinc-700 dark:text-zinc-300">
                    {description}
                  </p>
                </div>

                {/* Additional Details */}
                {details && (
                  <div className="space-y-2">
                    {details}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-5 border-t border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02]">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="px-5 py-2.5 font-mono font-bold text-xs uppercase tracking-widest border border-zinc-300 dark:border-white/10 text-zinc-700 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelText}
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className={`px-5 py-2.5 ${config.confirmBg} ${config.confirmText} font-mono font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    confirmText
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export default ConfirmationModal;
