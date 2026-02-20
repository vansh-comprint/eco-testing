/**
 * Branch Detail Page - Org Admin Portal
 * V3.2: Detailed view of a single branch with assets, batches, and IT Admin info
 */

import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Clock,
  User,
  Mail,
  Laptop,
  Package,
  Edit,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  FileText,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { useBranch, useBranchSummary, useAuth, useUpdateBranch, useActiveITAdmins } from '@/hooks';
import { PageHeader, Badge, Modal } from '@/components/ui';
import { text, iconSize } from '@/lib/design-tokens';
import { formatDistanceToNow, format } from 'date-fns';

interface ITAdmin {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export function BranchDetail() {
  const { branchId } = useParams<{ branchId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { enterprise, user } = useAuth();
  const enterpriseId = enterprise?.id || '';

  // Determine base path for navigation (IT Admin vs Org Admin)
  const isOrgAdmin = user?.role === 'org_admin' || location.pathname.startsWith('/org-admin');
  const basePath = isOrgAdmin ? '/org-admin' : '/admin';

  const { data: branch, isLoading, error } = useBranch(branchId || '');
  const { data: summaries = [] } = useBranchSummary(enterpriseId);
  const { data: itAdmins = [] } = useActiveITAdmins(isOrgAdmin ? enterpriseId : ''); // Only Org Admin can list IT admins
  const updateBranch = useUpdateBranch();

  const [isEditAdminModalOpen, setIsEditAdminModalOpen] = useState(false);
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);

  // Find summary for this branch
  const summary = summaries.find((s: any) => s.branch_id === branchId);

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'needs_admin': return 'warning';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'inactive': return 'Inactive';
      case 'needs_admin': return 'Needs Admin';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'inactive': return <XCircle className="w-4 h-4 text-slate-500" />;
      case 'needs_admin': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default: return null;
    }
  };

  const handleAssignAdmin = async () => {
    if (!branchId) return;

    await updateBranch.mutateAsync({
      branchId,
      updates: { it_admin_id: selectedAdminId || null },
    });
    setIsEditAdminModalOpen(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-lime-500 mx-auto mb-4" />
          <p className={`font-display font-bold uppercase tracking-wide ${text.muted}`}>Loading branch...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !branch) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className={`font-display font-bold text-lg mb-2 ${text.primary}`}>Branch not found</h2>
          <p className={`text-sm mb-6 ${text.muted}`}>The branch you're looking for doesn't exist or has been deleted.</p>
          <button
            type="button"
            onClick={() => navigate(`${basePath}/branches`)}
            className="flex items-center gap-2 mx-auto px-4 py-2.5 bg-lime-500 hover:bg-lime-400 text-black font-semibold text-sm uppercase tracking-wider transition-all"
          >
            <ArrowLeft className={iconSize.md} />
            Back to Branches
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate(`${basePath}/branches`)}
            className={`flex items-center gap-2 text-sm mb-4 ${text.muted} hover:text-lime-500 transition-colors`}
          >
            <ArrowLeft className={iconSize.sm} />
            Back to Branches
          </button>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-lime-500/10 border border-lime-500/20 flex items-center justify-center">
              <Building2 className="w-7 h-7 text-lime-600 dark:text-lime-400" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className={`font-brand font-bold text-2xl ${text.primary}`}>{branch.branch_name}</h1>
                <Badge variant={getStatusVariant(branch.status)} size="sm">
                  {getStatusLabel(branch.status)}
                </Badge>
              </div>
              <p className={`font-mono text-sm ${text.muted}`}>Code: {branch.branch_code}</p>
            </div>
          </div>
        </div>

        {isOrgAdmin && (
          <button
            type="button"
            onClick={() => navigate(`${basePath}/branches`, { state: { editBranch: branch.id } })}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-lime-500/50 text-slate-700 dark:text-zinc-300 font-semibold text-sm uppercase tracking-wider transition-all"
          >
            <Edit className={iconSize.md} />
            Edit Branch
          </button>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Branch Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* IT Admin Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
              <h2 className={`font-display font-bold text-sm uppercase tracking-wider ${text.muted}`}>IT Admin</h2>
              {isOrgAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAdminId(branch.it_admin_id || null);
                    setIsEditAdminModalOpen(true);
                  }}
                  className="text-xs font-semibold text-lime-600 dark:text-lime-400 hover:text-lime-700 dark:hover:text-lime-300 uppercase tracking-wider transition-colors"
                >
                  {branch.it_admin ? 'Change Admin' : 'Assign Admin'}
                </button>
              )}
            </div>
            <div className="p-5">
              {branch.it_admin ? (
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-lime-500/10 border border-lime-500/20 flex items-center justify-center">
                    <User className="w-6 h-6 text-lime-600 dark:text-lime-400" />
                  </div>
                  <div className="flex-1">
                    <p className={`font-display font-bold text-base ${text.primary}`}>{branch.it_admin.name}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className={`flex items-center gap-1.5 text-sm ${text.muted}`}>
                        <Mail className="w-3.5 h-3.5" />
                        {branch.it_admin.email}
                      </span>
                      {branch.it_admin.phone && (
                        <span className={`flex items-center gap-1.5 text-sm ${text.muted}`}>
                          <Phone className="w-3.5 h-3.5" />
                          {branch.it_admin.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                  <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className={`font-display font-bold text-sm text-amber-700 dark:text-amber-400`}>No IT Admin Assigned</p>
                    <p className={`text-sm ${text.muted}`}>Assign an IT Admin to activate this branch</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Address Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-zinc-800">
              <h2 className={`font-display font-bold text-sm uppercase tracking-wider ${text.muted}`}>Location & Contact</h2>
            </div>
            <div className="p-5 space-y-4">
              {/* Address */}
              <div className="flex items-start gap-3">
                <MapPin className={`${iconSize.md} ${text.muted} mt-0.5 flex-shrink-0`} />
                <div>
                  <p className={`text-sm font-medium ${text.primary}`}>{branch.address_line1}</p>
                  {branch.address_line2 && <p className={`text-sm ${text.secondary}`}>{branch.address_line2}</p>}
                  <p className={`text-sm ${text.secondary}`}>{branch.city}, {branch.state} - {branch.pin_code}</p>
                </div>
              </div>

              {/* Site Contact */}
              {(branch.site_contact_person || branch.site_contact_phone) && (
                <div className="flex items-start gap-3">
                  <Phone className={`${iconSize.md} ${text.muted} mt-0.5 flex-shrink-0`} />
                  <div>
                    <p className={`text-sm font-medium ${text.primary}`}>Site Contact</p>
                    {branch.site_contact_person && <p className={`text-sm ${text.secondary}`}>{branch.site_contact_person}</p>}
                    {branch.site_contact_phone && <p className={`text-sm ${text.muted}`}>{branch.site_contact_phone}</p>}
                  </div>
                </div>
              )}

              {/* Operating Hours */}
              {branch.operating_hours && (
                <div className="flex items-start gap-3">
                  <Clock className={`${iconSize.md} ${text.muted} mt-0.5 flex-shrink-0`} />
                  <div>
                    <p className={`text-sm font-medium ${text.primary}`}>Operating Hours</p>
                    <p className={`text-sm ${text.secondary}`}>{branch.operating_hours}</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Pickup Info Card */}
          {(branch.pickup_point_description || branch.special_instructions) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-slate-200 dark:border-zinc-800">
                <h2 className={`font-display font-bold text-sm uppercase tracking-wider ${text.muted}`}>Pickup Information</h2>
              </div>
              <div className="p-5 space-y-4">
                {branch.pickup_point_description && (
                  <div>
                    <p className={`text-xs font-mono uppercase tracking-wider mb-1.5 ${text.muted}`}>Pickup Point</p>
                    <p className={`text-sm ${text.secondary}`}>{branch.pickup_point_description}</p>
                  </div>
                )}
                {branch.special_instructions && (
                  <div>
                    <p className={`text-xs font-mono uppercase tracking-wider mb-1.5 ${text.muted}`}>Special Instructions</p>
                    <p className={`text-sm ${text.secondary}`}>{branch.special_instructions}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Column - Stats & Quick Actions */}
        <div className="space-y-6">
          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-zinc-800">
              <h2 className={`font-display font-bold text-sm uppercase tracking-wider ${text.muted}`}>Statistics</h2>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-zinc-800">
              <div className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Laptop className={`${iconSize.md} text-lime-600 dark:text-lime-400`} />
                  <span className={`text-sm ${text.secondary}`}>Total Assets</span>
                </div>
                <span className={`font-brand font-bold text-lg ${text.primary}`}>{summary?.asset_count || 0}</span>
              </div>
              <div className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className={`${iconSize.md} text-emerald-500`} />
                  <span className={`text-sm ${text.secondary}`}>Completed Assets</span>
                </div>
                <span className={`font-brand font-bold text-lg ${text.primary}`}>{summary?.completed_asset_count || 0}</span>
              </div>
              <div className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className={`${iconSize.md} text-blue-500`} />
                  <span className={`text-sm ${text.secondary}`}>Total Batches</span>
                </div>
                <span className={`font-brand font-bold text-lg ${text.primary}`}>{summary?.total_batch_count || 0}</span>
              </div>
              <div className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className={`${iconSize.md} text-amber-500`} />
                  <span className={`text-sm ${text.secondary}`}>Active Batches</span>
                </div>
                <span className={`font-brand font-bold text-lg ${text.primary}`}>{summary?.active_batch_count || 0}</span>
              </div>
            </div>
          </motion.div>

          {/* Status Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-zinc-800">
              <h2 className={`font-display font-bold text-sm uppercase tracking-wider ${text.muted}`}>Branch Status</h2>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                {getStatusIcon(branch.status)}
                <div>
                  <p className={`font-display font-bold text-base ${text.primary}`}>{getStatusLabel(branch.status)}</p>
                  <p className={`text-xs ${text.muted}`}>
                    {branch.status === 'active' && 'Branch is operational and accepting assets'}
                    {branch.status === 'inactive' && 'Branch is currently not operational'}
                    {branch.status === 'needs_admin' && 'Assign an IT Admin to activate'}
                  </p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className={`w-3.5 h-3.5 ${text.muted}`} />
                  <span className={text.muted}>Created:</span>
                  <span className={text.secondary}>
                    {format(new Date(branch.created_at), 'MMM d, yyyy')}
                  </span>
                </div>
                {branch.updated_at && (
                  <div className="flex items-center gap-2">
                    <Clock className={`w-3.5 h-3.5 ${text.muted}`} />
                    <span className={text.muted}>Updated:</span>
                    <span className={text.secondary}>
                      {formatDistanceToNow(new Date(branch.updated_at), { addSuffix: true })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-zinc-800">
              <h2 className={`font-display font-bold text-sm uppercase tracking-wider ${text.muted}`}>Quick Actions</h2>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-zinc-800">
              <button
                type="button"
                onClick={() => navigate(`${basePath}/assets?branch=${branchId}`)}
                className="w-full px-5 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Laptop className={`${iconSize.md} text-lime-600 dark:text-lime-400`} />
                  <span className={`text-sm ${text.primary}`}>View Assets</span>
                </div>
                <ChevronRight className={`${iconSize.sm} ${text.muted}`} />
              </button>
              <button
                type="button"
                onClick={() => navigate(`${basePath}/batches?branch=${branchId}`)}
                className="w-full px-5 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Package className={`${iconSize.md} text-blue-500`} />
                  <span className={`text-sm ${text.primary}`}>View Batches</span>
                </div>
                <ChevronRight className={`${iconSize.sm} ${text.muted}`} />
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Edit Admin Modal */}
      <Modal
        isOpen={isEditAdminModalOpen}
        onClose={() => setIsEditAdminModalOpen(false)}
        title={branch?.it_admin ? 'Change IT Admin' : 'Assign IT Admin'}
        size="sm"
      >
        <div className="space-y-4">
          <p className={`text-sm ${text.secondary}`}>
            Select an IT Admin to manage this branch. The admin will have access to create batches and manage assets.
          </p>

          <select
            value={selectedAdminId || ''}
            onChange={(e) => setSelectedAdminId(e.target.value || null)}
            className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm focus:outline-none focus:border-lime-500/50"
          >
            <option value="">No IT Admin (needs_admin status)</option>
            {(itAdmins as ITAdmin[]).map((admin) => (
              <option key={admin.id} value={admin.id}>
                {admin.name} ({admin.email})
              </option>
            ))}
          </select>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsEditAdminModalOpen(false)}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAssignAdmin}
              disabled={updateBranch.isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-lime-500 hover:bg-lime-400 disabled:opacity-50 text-black font-semibold text-sm uppercase tracking-wider transition-all"
            >
              {updateBranch.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {branch?.it_admin ? 'Update Admin' : 'Assign Admin'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default BranchDetail;
