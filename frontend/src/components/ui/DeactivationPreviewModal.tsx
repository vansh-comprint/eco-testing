/**
 * DeactivationPreviewModal
 * Shows a live preview of what will happen when a user is deactivated.
 * Fetches data from GET /users/{user_id}/deactivation-preview before rendering.
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  AlertTriangle,
  Loader2,
  Laptop,
  FileX,
  Building2,
  Package,
  Users,
  MessageSquare,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import { usersApi } from '@/lib/api/users';
import type { DeactivationPreview } from '@/lib/api/users';

interface DeactivationPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  userId: string;
  userName: string;
}

interface PreviewLineItem {
  icon: React.ReactNode;
  label: string;
  count?: number;
  severity: 'danger' | 'warning' | 'safe';
}

function buildPreviewItems(preview: DeactivationPreview): PreviewLineItem[] {
  const items: PreviewLineItem[] = [];

  if (preview.assets_to_unassign > 0) {
    items.push({
      icon: <Laptop className="w-4 h-4" />,
      label: `${preview.assets_to_unassign} asset${preview.assets_to_unassign !== 1 ? 's' : ''} in "assigned" status will be unassigned and returned to the asset pool`,
      count: preview.assets_to_unassign,
      severity: 'danger',
    });
  } else {
    items.push({
      icon: <Laptop className="w-4 h-4" />,
      label: 'No assets currently assigned — no asset changes',
      severity: 'safe',
    });
  }

  if (preview.submissions_to_delete > 0) {
    items.push({
      icon: <FileX className="w-4 h-4" />,
      label: `${preview.submissions_to_delete} incomplete check-in submission${preview.submissions_to_delete !== 1 ? 's' : ''} will be permanently deleted`,
      count: preview.submissions_to_delete,
      severity: 'danger',
    });
  } else {
    items.push({
      icon: <FileX className="w-4 h-4" />,
      label: 'No in-progress submissions — no submission data will be lost',
      severity: 'safe',
    });
  }

  if (preview.pickups_to_unassign > 0) {
    items.push({
      icon: <Package className="w-4 h-4" />,
      label: `${preview.pickups_to_unassign} active pickup${preview.pickups_to_unassign !== 1 ? 's' : ''} will be unassigned and require reassignment`,
      count: preview.pickups_to_unassign,
      severity: 'warning',
    });
  }

  if (preview.open_disputes_to_unassign > 0) {
    items.push({
      icon: <MessageSquare className="w-4 h-4" />,
      label: `${preview.open_disputes_to_unassign} open dispute${preview.open_disputes_to_unassign !== 1 ? 's' : ''} will be unassigned and require reassignment`,
      count: preview.open_disputes_to_unassign,
      severity: 'warning',
    });
  }

  if (preview.branches_affected > 0) {
    items.push({
      icon: <Building2 className="w-4 h-4" />,
      label: `${preview.branches_affected} branch${preview.branches_affected !== 1 ? 'es' : ''} will need a new IT Admin assigned`,
      count: preview.branches_affected,
      severity: 'warning',
    });
  }

  if (preview.child_users_to_deactivate > 0) {
    items.push({
      icon: <Users className="w-4 h-4" />,
      label: `${preview.child_users_to_deactivate} managed user${preview.child_users_to_deactivate !== 1 ? 's' : ''} will also be deactivated`,
      count: preview.child_users_to_deactivate,
      severity: 'danger',
    });
  }

  if (preview.is_sole_org_admin) {
    items.push({
      icon: <ShieldAlert className="w-4 h-4" />,
      label: 'This user is the sole Org Admin — the enterprise will have no admin until a new one is assigned',
      severity: 'danger',
    });
  }

  return items;
}

const severityStyles = {
  danger: {
    row: 'border-red-500/20 bg-red-500/5',
    icon: 'text-red-400',
    text: 'text-red-300',
  },
  warning: {
    row: 'border-amber-500/20 bg-amber-500/5',
    icon: 'text-amber-400',
    text: 'text-amber-300',
  },
  safe: {
    row: 'border-emerald-500/20 bg-emerald-500/5',
    icon: 'text-emerald-400',
    text: 'text-zinc-400',
  },
};

export function DeactivationPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  userId,
  userName,
}: DeactivationPreviewModalProps) {
  const [preview, setPreview] = useState<DeactivationPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Fetch preview whenever modal opens with a valid userId
  useEffect(() => {
    if (!isOpen || !userId) return;

    let cancelled = false;
    setPreview(null);
    setFetchFailed(false);
    setLoading(true);

    usersApi.previewDeactivation(userId)
      .then(res => {
        if (!cancelled) {
          if (res && typeof res === 'object' && 'data' in res && res.data) {
            setPreview(res.data as DeactivationPreview);
          } else {
            setFetchFailed(true);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setFetchFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [isOpen, userId]);

  const handleClose = () => {
    if (confirming) return;
    onClose();
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await onConfirm();
    } finally {
      setConfirming(false);
    }
  };

  const previewItems = preview ? buildPreviewItems(preview) : [];
  const hasDangerItems = previewItems.some(i => i.severity === 'danger');
  const isHighRisk = preview?.is_sole_org_admin || (preview?.assets_to_unassign ?? 0) >= 5 || (preview?.child_users_to_deactivate ?? 0) > 0;

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
            className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-zinc-950 border border-red-500/30 shadow-2xl shadow-black/50 relative max-sm:rounded-t-xl max-sm:border-b-0"
            >
              {/* Header */}
              <div className="flex items-start justify-between p-5 border-b border-red-500/20 bg-red-500/5">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 bg-red-500/10 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-base uppercase tracking-wide text-red-400 mb-1">
                      Deactivate Employee?
                    </h3>
                    <p className="font-mono text-xs text-zinc-500">
                      Review the impact before confirming
                    </p>
                  </div>
                </div>
                {!confirming && (
                  <button
                    type="button"
                    onClick={handleClose}
                    className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {/* User identity */}
                <div className="bg-white/[0.03] border border-white/10 px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 bg-ecotribe-primary/10 border border-ecotribe-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="font-mono font-bold text-xs text-ecotribe-primary uppercase">
                      {userName.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-display font-bold text-sm text-white uppercase tracking-wide">{userName}</p>
                    {preview && (
                      <p className="font-mono text-[11px] text-zinc-500 capitalize">
                        {preview.user_role.replace(/_/g, ' ')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Preview content */}
                {loading && (
                  <div className="flex items-center justify-center py-8 gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-ecotribe-primary" />
                    <span className="font-mono text-xs text-zinc-500 uppercase tracking-widest">
                      Checking impact...
                    </span>
                  </div>
                )}

                {!loading && fetchFailed && (
                  <div className="bg-amber-500/5 border border-amber-500/20 p-4">
                    <p className="font-mono text-xs text-amber-400">
                      Could not load impact preview. Proceed with caution — deactivating this employee may affect assigned assets and submissions.
                    </p>
                  </div>
                )}

                {!loading && preview && (
                  <>
                    {/* Impact label */}
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                        What will happen
                      </span>
                      <div className="flex-1 h-px bg-white/5" />
                    </div>

                    {/* Impact items */}
                    <div className="space-y-2">
                      {previewItems.map((item, idx) => {
                        const styles = severityStyles[item.severity];
                        return (
                          <div
                            key={idx}
                            className={`flex items-start gap-3 px-3 py-2.5 border ${styles.row}`}
                          >
                            <span className={`mt-0.5 flex-shrink-0 ${styles.icon}`}>
                              {item.severity === 'safe'
                                ? <CheckCircle2 className="w-4 h-4" />
                                : item.icon}
                            </span>
                            <p className={`font-mono text-xs leading-relaxed ${item.severity === 'safe' ? styles.text : 'text-white/80'}`}>
                              {item.label}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* High-risk extra warning */}
                    {isHighRisk && (
                      <div className="bg-red-500/10 border border-red-500/30 px-4 py-3">
                        <p className="font-mono font-bold text-[11px] text-red-400 uppercase tracking-wider mb-1">
                          High-Impact Deactivation
                        </p>
                        <p className="font-mono text-xs text-zinc-400">
                          This action has significant downstream effects and cannot be undone automatically. Reassignment will be required.
                        </p>
                      </div>
                    )}

                    {/* No-impact message */}
                    {!hasDangerItems && !isHighRisk && previewItems.every(i => i.severity === 'safe') && (
                      <div className="bg-emerald-500/5 border border-emerald-500/20 px-4 py-3">
                        <p className="font-mono text-xs text-emerald-400">
                          Low impact — this employee has no active assets, submissions, or managed users.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-5 border-t border-white/10 bg-white/[0.02]">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={confirming}
                  className="px-5 py-2.5 font-mono font-bold text-xs uppercase tracking-widest border border-zinc-700 text-zinc-400 hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={confirming || loading}
                  className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-mono font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border border-red-600"
                >
                  {confirming ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deactivating...
                    </>
                  ) : (
                    'Deactivate Employee'
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

export default DeactivationPreviewModal;
