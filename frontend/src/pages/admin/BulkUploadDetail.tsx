import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileSpreadsheet,
  Laptop,
  Users,
  UserPlus,
  Clock,
  CheckCircle,
  Eye
} from 'lucide-react';
import { useBulkUploadStore } from '@/stores';
import { useAllAssets, useAllSubUsers, useAuth, usePortalBasePath } from '@/hooks';
import { BackButton } from '@/components/ui';
import { format } from 'date-fns';
import { Badge } from '@/components/ui';
import type { AssetStatus } from '@/types';

export function BulkUploadDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { uploadId } = useParams<{ uploadId: string }>();
  const portalBase = usePortalBasePath();

  // V3: Use React Query hooks for auth
  const { user } = useAuth();

  // V3.2: Detect if we're in Org Admin context
  const isOrgAdmin = user?.role === 'org_admin' || location.pathname.startsWith('/org-admin');
  const basePath = isOrgAdmin ? '/org-admin' : '/admin';

  // V3: Use React Query hooks for database data
  const { getBulkUploadById } = useBulkUploadStore();
  const { data: assets = [] } = useAllAssets();
  const { data: subUsers = [] } = useAllSubUsers();

  // Helper to get sub user by ID
  const getSubUserById = (id: string) => subUsers.find(u => u.id === id);

  const bulkUpload = uploadId ? getBulkUploadById(uploadId) : undefined;

  if (!bulkUpload) {
    return (
      <div className="flex items-center justify-center min-h-[400px] border border-white/10 bg-slate-50 dark:bg-white/[0.02]">
        <div className="text-center">
          <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
          <p className="font-display font-bold text-zinc-500 uppercase tracking-wide">Bulk Upload Not Found</p>
          <button
            onClick={() => navigate(`${basePath}/assets`)}
            className="mt-4 text-ecotribe-primary font-mono text-xs uppercase tracking-widest hover:underline"
          >
            Back to Assets
          </button>
        </div>
      </div>
    );
  }

  // Get assets from this bulk upload
  const uploadedAssets = assets.filter(a => bulkUpload.assetIds.includes(a.id));

  // Group assets by status
  const assetsByStatus = uploadedAssets.reduce((acc, asset) => {
    (acc as any)[asset.status] = (acc as any)[asset.status] || [];
    (acc as any)[asset.status].push(asset);
    return acc;
  }, {} as Record<AssetStatus, typeof uploadedAssets>);

  const getStatusConfig = (status: AssetStatus) => {
    const configs: Partial<Record<AssetStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }>> = {
      pending_assignment: { label: 'Pending', variant: 'warning' },
      assigned: { label: 'Assigned', variant: 'info' },
      check_in_started: { label: 'Check-in Started', variant: 'info' },
      submitted: { label: 'Submitted', variant: 'info' },
      remote_review: { label: 'In Review', variant: 'info' },
      conditionally_accepted: { label: 'Accepted', variant: 'success' },
      remote_rejected: { label: 'Rejected', variant: 'error' },
      disputed: { label: 'Disputed', variant: 'warning' },
      in_transit: { label: 'In Transit', variant: 'info' },
      facility_qc: { label: 'Facility QC', variant: 'info' },
      final_accepted: { label: 'Final Accepted', variant: 'success' },
      final_rejected: { label: 'Final Rejected', variant: 'error' },
      payout_pending: { label: 'Payout Pending', variant: 'success' },
      completed: { label: 'Completed', variant: 'success' },
    };
    return configs[status] || { label: status, variant: 'default' };
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <BackButton to={`${portalBase}/assets`} label="Back to Assets" className="mb-6" />

          <div className="flex items-start gap-5">
            <div className="w-14 h-14 border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center">
              <FileSpreadsheet className="w-7 h-7 text-emerald-400" />
            </div>
            <div className="flex-1">
              <span className="font-mono font-bold text-xs text-emerald-400 tracking-[0.3em] uppercase block mb-1">Bulk Upload</span>
              <h1 className="font-brand font-bold text-2xl md:text-3xl text-slate-900 dark:text-white uppercase tracking-tight">
                {bulkUpload.fileName}
              </h1>
              <p className="font-display text-zinc-500 text-sm mt-1 uppercase tracking-wide">
                Uploaded {format(new Date(bulkUpload.uploadedAt), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 border-l border-t border-slate-200 dark:border-white/10"
      >
        <div className="p-6 border-r border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-2 mb-2">
            <Laptop className="w-4 h-4 text-ecotribe-primary" />
          </div>
          <p className="font-brand font-bold text-3xl text-slate-900 dark:text-white">{bulkUpload.totalAssets}</p>
          <p className="font-mono font-bold text-[10px] text-zinc-600 uppercase tracking-widest mt-1">Total Assets</p>
        </div>
        <div className="p-6 border-r border-b border-slate-200 dark:border-white/10 bg-blue-500/5">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus className="w-4 h-4 text-blue-400" />
          </div>
          <p className="font-brand font-bold text-3xl text-blue-400">{bulkUpload.assignedAssets}</p>
          <p className="font-mono font-bold text-[10px] text-zinc-600 uppercase tracking-widest mt-1">Pre-Assigned</p>
        </div>
        <div className="p-6 border-r border-b border-slate-200 dark:border-white/10 bg-amber-500/5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="font-brand font-bold text-3xl text-amber-400">{bulkUpload.unassignedAssets}</p>
          <p className="font-mono font-bold text-[10px] text-zinc-600 uppercase tracking-widest mt-1">Unassigned</p>
        </div>
        <div className="p-6 border-r border-b border-slate-200 dark:border-white/10 bg-emerald-500/5">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="font-brand font-bold text-3xl text-emerald-400">{bulkUpload.usersCreated}</p>
          <p className="font-mono font-bold text-[10px] text-zinc-600 uppercase tracking-widest mt-1">New Users Created</p>
        </div>
      </motion.div>

      {/* Status Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="border border-white/10 bg-slate-50 dark:bg-white/[0.02]"
      >
        <div className="p-6 border-b border-slate-200 dark:border-white/10">
          <h2 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide">Status Summary</h2>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap gap-3">
            {Object.entries(assetsByStatus).map(([status, statusAssets]) => {
              const config = getStatusConfig(status as AssetStatus);
              return (
                <div
                  key={status}
                  className="px-4 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]"
                >
                  <Badge variant={config.variant} size="sm">{config.label}</Badge>
                  <p className="font-brand font-bold text-xl text-slate-900 dark:text-white mt-2">{statusAssets.length}</p>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Assets List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="border border-white/10 bg-slate-50 dark:bg-white/[0.02]"
      >
        <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <h2 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide">Uploaded Assets</h2>
          <span className="font-mono font-bold text-xs text-zinc-500 uppercase tracking-widest">
            {uploadedAssets.length} assets
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10">
                <th className="text-left py-4 px-6 font-mono font-bold text-xs text-zinc-500 uppercase tracking-widest">
                  Device
                </th>
                <th className="text-left py-4 px-6 font-mono font-bold text-xs text-zinc-500 uppercase tracking-widest">
                  Serial
                </th>
                <th className="text-left py-4 px-6 font-mono font-bold text-xs text-zinc-500 uppercase tracking-widest">
                  Assigned To
                </th>
                <th className="text-left py-4 px-6 font-mono font-bold text-xs text-zinc-500 uppercase tracking-widest">
                  Status
                </th>
                <th className="text-left py-4 px-6 font-mono font-bold text-xs text-zinc-500 uppercase tracking-widest">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {uploadedAssets.map((asset, index) => {
                const statusConfig = getStatusConfig(asset.status as any);
                // V3: Use snake_case field names
                const subUser = asset.assigned_to_user_id ? getSubUserById(asset.assigned_to_user_id) : null;

                return (
                  <motion.tr
                    key={asset.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.02 * Math.min(index, 10) }}
                    className="hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center">
                          <Laptop className="w-5 h-5 text-zinc-500" />
                        </div>
                        <div>
                          <p className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase">{asset.brand}</p>
                          <p className="font-mono text-xs text-zinc-600">{asset.model}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono text-sm text-zinc-400">
                      {asset.serial_number}
                    </td>
                    <td className="py-4 px-6">
                      {subUser ? (
                        <div>
                          <p className="font-display text-sm text-slate-900 dark:text-white">{subUser.name || subUser.email}</p>
                          {subUser.department && (
                            <p className="font-mono text-xs text-zinc-600">{subUser.department}</p>
                          )}
                        </div>
                      ) : (
                        <span className="font-mono text-xs text-zinc-600">Unassigned</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <Badge variant={statusConfig.variant} size="sm">{statusConfig.label}</Badge>
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => navigate(`${basePath}/assets/${asset.id}`)}
                        className="interactive p-2 border border-white/10 hover:border-ecotribe-primary/30 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-all"
                      >
                        <Eye className="w-4 h-4 text-zinc-500 hover:text-ecotribe-primary" />
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

export default BulkUploadDetail;
