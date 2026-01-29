import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    const duration = toast.duration || 4000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

const iconConfig: Record<ToastType, { icon: React.ReactNode; bg: string }> = {
  success: {
    icon: <CheckCircle className="w-4 h-4" />,
    bg: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
  error: {
    icon: <AlertCircle className="w-4 h-4" />,
    bg: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400',
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4" />,
    bg: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
  },
  info: {
    icon: <Info className="w-4 h-4" />,
    bg: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
  },
};

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-xs w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
            className={cn(
              'pointer-events-auto',
              'bg-white dark:bg-black/95 backdrop-blur-xl border border-slate-200 dark:border-white/10',
              'shadow-xl dark:shadow-none',
              'rounded-lg p-3 flex items-start gap-3'
            )}
          >
            <div className={cn(
              'flex-shrink-0 p-1.5 rounded-md',
              iconConfig[toast.type].bg
            )}>
              {iconConfig[toast.type].icon}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="font-brand font-bold text-sm text-black dark:text-white uppercase">{toast.title}</p>
              {toast.message && (
                <p className="mt-0.5 font-mono text-xs text-black/60 dark:text-white/50">{toast.message}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 p-1 -m-1 text-black/40 dark:text-white/30 hover:text-ecotribe-primary dark:hover:text-ecotribe-primary transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ToastProvider;
