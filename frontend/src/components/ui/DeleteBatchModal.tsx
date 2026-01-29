import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Trash2, Package, Laptop, Users } from 'lucide-react';
import { Checkbox } from './Checkbox';

interface DeleteBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deleteAssets: boolean, deleteSubUsers: boolean) => void;
  batchName: string;
  assetCount: number;
  isDeleting?: boolean;
}

export function DeleteBatchModal({
  isOpen,
  onClose,
  onConfirm,
  batchName,
  assetCount,
  isDeleting = false
}: DeleteBatchModalProps) {
  const [deleteAssets, setDeleteAssets] = useState(false);
  const [deleteSubUsers, setDeleteSubUsers] = useState(false);

  const handleConfirm = () => {
    onConfirm(deleteAssets, deleteSubUsers);
  };

  const handleClose = () => {
    if (!isDeleting) {
      setDeleteAssets(false);
      setDeleteSubUsers(false);
      onClose();
    }
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-white/95 dark:bg-black/95 backdrop-blur-xl border border-red-500/30 shadow-2xl relative"
            >
              {/* Header */}
              <div className="flex items-start justify-between p-6 border-b border-red-500/20 bg-red-500/5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg uppercase tracking-wide text-red-500 mb-1">
                      Delete Batch
                    </h3>
                    <p className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                      This action cannot be undone
                    </p>
                  </div>
                </div>
                {!isDeleting && (
                  <button
                    onClick={handleClose}
                    className="p-1.5 text-zinc-500 hover:text-red-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Warning Message */}
                <div className="bg-red-500/5 border border-red-500/20 p-4">
                  <p className="font-mono text-sm text-zinc-700 dark:text-zinc-300">
                    You are about to delete the batch:{' '}
                    <span className="font-bold text-black dark:text-white">{batchName}</span>
                  </p>
                </div>

                {/* Delete Options */}
                <div className="space-y-4">
                  <p className="font-display font-bold text-sm uppercase tracking-wide text-black dark:text-white">
                    What would you like to delete?
                  </p>

                  {/* Batch (Always) */}
                  <div className="flex items-start gap-3 p-4 bg-zinc-100/50 dark:bg-white/5 border border-zinc-200 dark:border-white/10">
                    <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-sm uppercase tracking-wide text-black dark:text-white mb-1">
                        Batch
                      </p>
                      <p className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                        The batch record will be permanently deleted
                      </p>
                    </div>
                    <div className="flex items-center justify-center w-5 h-5 bg-red-500 border border-red-600 flex-shrink-0">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  </div>

                  {/* Assets (Optional) */}
                  <div
                    onClick={() => !isDeleting && setDeleteAssets(!deleteAssets)}
                    className={`flex items-start gap-3 p-4 border transition-all cursor-pointer ${
                      deleteAssets
                        ? 'bg-red-500/5 border-red-500/30'
                        : 'bg-zinc-50/50 dark:bg-white/[0.02] border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20'
                    } ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className={`w-10 h-10 border flex items-center justify-center flex-shrink-0 ${
                      deleteAssets
                        ? 'bg-red-500/10 border-red-500/20'
                        : 'bg-blue-500/10 border-blue-500/20'
                    }`}>
                      <Laptop className={`w-5 h-5 ${deleteAssets ? 'text-red-500' : 'text-blue-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-sm uppercase tracking-wide text-black dark:text-white mb-1">
                        Assets ({assetCount})
                      </p>
                      <p className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                        All {assetCount} assets in this batch will be deleted
                      </p>
                    </div>
                    <Checkbox
                      checked={deleteAssets}
                      onChange={(e) => !isDeleting && setDeleteAssets(e.target.checked)}
                      disabled={isDeleting}
                    />
                  </div>

                  {/* Sub-Users (Optional) */}
                  <div
                    onClick={() => !isDeleting && setDeleteSubUsers(!deleteSubUsers)}
                    className={`flex items-start gap-3 p-4 border transition-all cursor-pointer ${
                      deleteSubUsers
                        ? 'bg-red-500/5 border-red-500/30'
                        : 'bg-zinc-50/50 dark:bg-white/[0.02] border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20'
                    } ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className={`w-10 h-10 border flex items-center justify-center flex-shrink-0 ${
                      deleteSubUsers
                        ? 'bg-red-500/10 border-red-500/20'
                        : 'bg-purple-500/10 border-purple-500/20'
                    }`}>
                      <Users className={`w-5 h-5 ${deleteSubUsers ? 'text-red-500' : 'text-purple-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-sm uppercase tracking-wide text-black dark:text-white mb-1">
                        Sub-Users (Employees)
                      </p>
                      <p className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                        All employees/sub-users from this enterprise will be deleted
                      </p>
                    </div>
                    <Checkbox
                      checked={deleteSubUsers}
                      onChange={(e) => !isDeleting && setDeleteSubUsers(e.target.checked)}
                      disabled={isDeleting}
                    />
                  </div>
                </div>

                {/* Warning */}
                {(deleteAssets || deleteSubUsers) && (
                  <div className="bg-red-500/10 border border-red-500/30 p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="font-mono text-xs text-red-600 dark:text-red-400">
                      <strong>Warning:</strong> Deleting {deleteAssets && 'assets'}{deleteAssets && deleteSubUsers && ' and '}{deleteSubUsers && 'sub-users'} will permanently remove all related data. This cannot be undone.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02]">
                <button
                  onClick={handleClose}
                  disabled={isDeleting}
                  className="px-5 py-2.5 font-mono font-bold text-xs uppercase tracking-widest border border-zinc-300 dark:border-white/10 text-zinc-700 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isDeleting}
                  className="px-5 py-2.5 bg-red-500 border border-red-600 text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete {deleteAssets || deleteSubUsers ? 'All' : 'Batch'}
                    </>
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
