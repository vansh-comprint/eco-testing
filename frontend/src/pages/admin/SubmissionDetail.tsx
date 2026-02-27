import { useState, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Laptop,
  CheckCircle,
  XCircle,
  Zap,
  Battery,
  Monitor,
  Keyboard,
  MousePointer2,
  Usb,
  Box,
  User,
  Mail,
  Phone,
  Calendar,
  AlertCircle,
  Building2,
  Star,
  IndianRupee,
  FileText,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  MessageSquare,
  ShieldAlert,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth, useAllAssets, useAllSubUsers, assetKeys, useCreateDispute, useDisputeByAsset, disputeKeys } from '@/hooks';
import { usersApi } from '@/lib/api/users';
import { reviewsApi } from '@/lib/api/reviews';
import { submissionsApi } from '@/lib/api/submissions';
import {
  batteryOptions,
  screenConditionOptions,
  keyboardConditionOptions,
  trackpadConditionOptions,
  portsConditionOptions,
  hingeConditionOptions,
  bodyConditionOptions,
  chargerStatusOptions,
  PHOTO_SLOTS,
} from '@/types/submission';
import { format, formatDistanceToNow } from 'date-fns';
import { Badge, StatusBadge, Modal, ModalFooter, StatusTimeline, BackButton, useToast } from '@/components/ui';
import { TERMINAL_ASSET_STATUSES } from '@/lib/constants';

// Grade options for OPS review
const GRADE_OPTIONS = [
  { value: 'A', label: 'Grade A', description: 'Excellent condition, minimal wear' },
  { value: 'B', label: 'Grade B', description: 'Good condition, light cosmetic wear' },
  { value: 'C', label: 'Grade C', description: 'Fair condition, visible wear' },
  { value: 'D', label: 'Grade D', description: 'Poor condition, significant damage' },
];

// Status flow for timeline
const WORKFLOW_STEPS = [
  { key: 'assigned', label: 'Assigned' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'conditionally_accepted', label: 'Verified' },
  { key: 'ready_for_pickup', label: 'Ready' },
  { key: 'picked_up', label: 'Picked Up' },
  { key: 'facility_qc', label: 'QC' },
  { key: 'completed', label: 'Done' },
];

// Map actual asset statuses to the nearest timeline step key
const STATUS_TO_TIMELINE_KEY: Record<string, string> = {
  pending_assignment: 'assigned',
  assigned: 'assigned',
  check_in_started: 'assigned',
  submitted: 'submitted',
  remote_review: 'submitted',
  conditionally_accepted: 'conditionally_accepted',
  remote_rejected: 'submitted', // rejected stays at submitted step
  disputed: 'submitted',
  ready_for_pickup: 'ready_for_pickup',
  pickup_requested: 'ready_for_pickup',
  pickup_scheduled: 'ready_for_pickup',
  pickup_failed_qc: 'ready_for_pickup',
  picked_up: 'picked_up',
  in_transit: 'picked_up',
  facility_qc: 'facility_qc',
  final_accepted: 'completed',
  final_rejected: 'facility_qc',
  payout_pending: 'completed',
  completed: 'completed',
};

// Condition check scoring helper
function getConditionScore(checks: Record<string, unknown> | undefined): { score: number; label: string; variant: 'success' | 'warning' | 'error' } {
  if (!checks) return { score: 0, label: 'No data', variant: 'error' };

  let good = 0;
  let total = 0;

  if (checks.powersOn !== undefined) { total++; if (checks.powersOn) good++; }
  if (checks.batteryBackup) { total++; if (['1_2hrs', 'more_2hrs'].includes(checks.batteryBackup as string)) good++; }
  if (checks.screenCondition) {
    total++;
    const sc = checks.screenCondition as string[];
    if (sc.length === 0 || (sc.length === 1 && sc[0] === 'none')) good++;
  }
  if (checks.keyboardCondition) { total++; if (checks.keyboardCondition === 'all_working') good++; }
  if (checks.trackpadCondition) { total++; if (checks.trackpadCondition === 'functional') good++; }
  if (checks.portsCondition) { total++; if (checks.portsCondition === 'all_working') good++; }
  if (checks.hingeCondition) { total++; if (checks.hingeCondition === 'stable') good++; }
  if (checks.chargerStatus) { total++; if (checks.chargerStatus === 'present') good++; }
  if (checks.bodyCondition) {
    total++;
    const bc = checks.bodyCondition as string[];
    if (bc.length === 0 || (bc.length === 1 && bc[0] === 'none')) good++;
  }

  if (total === 0) return { score: 0, label: 'No data', variant: 'error' };

  const pct = Math.round((good / total) * 100);
  if (pct >= 80) return { score: pct, label: `${pct}% Good`, variant: 'success' };
  if (pct >= 50) return { score: pct, label: `${pct}% Fair`, variant: 'warning' };
  return { score: pct, label: `${pct}% Poor`, variant: 'error' };
}

export function SubmissionDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { assetId } = useParams<{ assetId: string }>();
  const { user } = useAuth();

  // Context detection
  const isSuperAdmin = user?.role === 'super_admin' || location.pathname.startsWith('/super');
  const isOpsAdmin = user?.role === 'ops_admin' || location.pathname.startsWith('/ops');
  const isOrgAdmin = user?.role === 'org_admin' || location.pathname.startsWith('/org-admin');
  const isEmployee = user?.role === 'employee' || location.pathname.startsWith('/check-in');
  const basePath = isEmployee ? '/check-in' : isSuperAdmin ? '/super' : isOpsAdmin ? '/ops' : isOrgAdmin ? '/org-admin' : '/admin';
  const backTo = undefined; // Use browser back
  const backLabel = 'Back';

  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { data: assets = [] } = useAllAssets();
  // Employees don't have EMPLOYEE_READ permission — skip sub-users fetch for them
  const { data: subUsers = [] } = useAllSubUsers({ enabled: !isEmployee });

  const getSubUserById = (id: string) => subUsers.find(u => u.id === id);

  const asset = assets.find(a => a.id === assetId);
  const assignedUserId = asset?.assigned_to_user_id;
  const subUserFromList = assignedUserId ? getSubUserById(assignedUserId) : null;

  // Fallback: fetch user by ID if not found in sub-users list (e.g. IT Admin self-assigned)
  // Skip for employees — they are the submitter themselves
  const { data: fallbackUserResponse } = useQuery({
    queryKey: ['users', 'detail', assignedUserId],
    queryFn: () => usersApi.get(assignedUserId!),
    enabled: !!assignedUserId && !subUserFromList && !isEmployee,
    staleTime: 60000,
  });

  // For employees, show their own info; for admins, resolve from sub-users or fallback
  const subUser = isEmployee && user ? {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: (user as any).phone,
    department: (user as any).department,
  } : subUserFromList || (fallbackUserResponse?.data ? {
    id: fallbackUserResponse.data.id,
    name: fallbackUserResponse.data.name,
    email: fallbackUserResponse.data.email,
    phone: fallbackUserResponse.data.phone,
    department: fallbackUserResponse.data.role?.replace('_', ' '),
  } : null);

  // Dispute hooks
  const createDisputeMutation = useCreateDispute();
  const { data: existingDispute } = useDisputeByAsset(assetId || '');

  // State
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('B');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [disputeType, setDisputeType] = useState('grading_dispute');
  const [disputeDescription, setDisputeDescription] = useState('');

  // Fetch submission from backend API (not Zustand - submissions must survive across sessions/users)
  const { data: submission, isLoading: isLoadingSubmission } = useQuery({
    queryKey: ['submissions', 'by-asset', assetId],
    queryFn: async () => {
      const result = await submissionsApi.getByAsset(assetId!);
      if (!result.success || !result.data) return null;
      const d = result.data;
      return {
        id: d.id,
        assetId: d.asset_id,
        deviceConfirmed: d.device_confirmed,
        photos: d.photos as Record<string, string> | undefined,
        functionalChecks: d.functional_checks as Record<string, unknown> | undefined,
        submittedBy: d.user_id,
        submittedAt: d.submitted_at ? new Date(d.submitted_at) : new Date(d.created_at),
      };
    },
    enabled: !!assetId,
    staleTime: 30000,
  });

  // Photo navigation
  const uploadedPhotos = useMemo(() => {
    if (!submission?.photos) return [];
    return PHOTO_SLOTS
      .filter(s => submission.photos?.[s.key as keyof typeof submission.photos])
      .map(s => ({
        key: s.key,
        label: s.label,
        url: submission.photos![s.key as keyof typeof submission.photos] as string,
      }));
  }, [submission]);

  // Condition score
  const conditionScore = useMemo(
    () => getConditionScore(submission?.functionalChecks as Record<string, unknown> | undefined),
    [submission]
  );

  // Can this user take action on this submission?
  // Only OPS Admin (and Super Admin) can create remote reviews — IT Admin cannot
  const canReview = (user?.role === 'ops_admin' || user?.role === 'super_admin') &&
    ['submitted', 'remote_review', 'disputed'].includes(asset?.status || '');

  // Can IT Admin / Org Admin dispute a rejected submission?
  const canDispute = (user?.role === 'it_admin' || user?.role === 'org_admin') &&
    asset?.status === 'remote_rejected' && !existingDispute;

  const isDisputed = asset?.status === 'disputed';

  if (!asset || isLoadingSubmission) {
    return (
      <div className="text-center py-16">
        {isLoadingSubmission ? (
          <>
            <div className="w-8 h-8 border-2 border-ecotribe-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500 dark:text-white/50">Loading submission...</p>
          </>
        ) : (
          <>
            <AlertCircle className="w-16 h-16 text-slate-500 dark:text-white/50 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Asset Not Found</h2>
            <p className="text-slate-500 dark:text-white/50 mb-6">This asset doesn't exist.</p>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="interactive px-6 py-3 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all"
            >
              {backLabel}
            </button>
          </>
        )}
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-16 h-16 text-slate-500 dark:text-white/50 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Submission Not Found</h2>
        <p className="text-slate-500 dark:text-white/50 mb-6">This device hasn't been submitted yet.</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="interactive px-6 py-3 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all"
        >
          {backLabel}
        </button>
      </div>
    );
  }

  const handleApprove = async () => {
    if (!asset) return;
    setIsProcessing(true);
    try {
      const result = await reviewsApi.createRemote({
        asset_id: asset.id,
        decision: 'conditionally_accepted',
        grade: selectedGrade,
        ...(estimatedValue ? { estimated_value: Number(estimatedValue) } : {}),
        ...(reviewNotes.trim() ? { notes: reviewNotes.trim() } : {}),
      });
      if (!result.success) {
        addToast({ type: 'error', title: 'Approval Failed', message: result.error?.message || 'Failed to approve submission.' });
        return;
      }
      // Invalidate asset queries so UI reflects new status
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
      setShowApproveModal(false);
      addToast({ type: 'success', title: 'Submission Accepted', message: 'The device has been conditionally accepted.' });
      navigate(`${basePath}${(isOpsAdmin || isSuperAdmin) ? '/reviews' : '/dashboard'}`);
    } catch (error) {
      console.error('Failed to approve:', error);
      addToast({ type: 'error', title: 'Approval Failed', message: error instanceof Error ? error.message : 'Failed to approve submission.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!asset || !rejectionReason.trim()) return;
    setIsProcessing(true);
    try {
      const result = await reviewsApi.createRemote({
        asset_id: asset.id,
        decision: 'rejected',
        rejection_reason: rejectionReason.trim(),
      });
      if (!result.success) {
        addToast({ type: 'error', title: 'Rejection Failed', message: result.error?.message || 'Failed to reject submission.' });
        return;
      }
      // Invalidate asset queries so UI reflects new status
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
      setShowRejectModal(false);
      addToast({ type: 'success', title: 'Submission Rejected', message: 'The employee will be notified.' });
      navigate(`${basePath}${(isOpsAdmin || isSuperAdmin) ? '/reviews' : '/dashboard'}`);
    } catch (error) {
      console.error('Failed to reject:', error);
      addToast({ type: 'error', title: 'Rejection Failed', message: error instanceof Error ? error.message : 'Failed to reject submission.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDispute = async () => {
    if (!asset || !disputeDescription.trim() || !user) return;
    setIsProcessing(true);
    try {
      await createDisputeMutation.mutateAsync({
        asset_id: asset.id,
        raised_by: user.id,
        reason: disputeType,
        description: disputeDescription.trim(),
      });
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
      queryClient.invalidateQueries({ queryKey: disputeKeys.all });
      setShowDisputeModal(false);
      setDisputeDescription('');
      addToast({ type: 'success', title: 'Dispute Submitted', message: 'Your dispute has been sent for re-evaluation.' });
    } catch (error) {
      console.error('Failed to create dispute:', error);
      addToast({ type: 'error', title: 'Dispute Failed', message: error instanceof Error ? error.message : 'Failed to submit dispute. Please try again.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const openPhotoViewer = (url: string) => {
    const idx = uploadedPhotos.findIndex(p => p.url === url);
    setPhotoIndex(idx >= 0 ? idx : 0);
    setSelectedPhoto(url);
  };

  const navigatePhoto = (dir: 1 | -1) => {
    const newIdx = (photoIndex + dir + uploadedPhotos.length) % uploadedPhotos.length;
    setPhotoIndex(newIdx);
    setSelectedPhoto(uploadedPhotos[newIdx].url);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <BackButton to={backTo} label={backLabel} />
      </div>

      {/* Device Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 p-6"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-ecotribe-primary/20 flex items-center justify-center">
              <Laptop className="w-8 h-8 text-ecotribe-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {asset.brand} {asset.model}
              </h1>
              <p className="text-sm text-slate-500 dark:text-white/50 font-mono">S/N: {asset.serial_number}</p>
              {asset.asset_tag && (
                <p className="text-xs text-slate-400 dark:text-white/30 font-mono mt-0.5">Tag: {asset.asset_tag}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={asset.status as any} size="md" showDot />
            {asset.grade && (
              <Badge variant="primary" size="sm">Grade {asset.grade}</Badge>
            )}
          </div>
        </div>

        {/* Submission time & condition score */}
        <div className="flex items-center gap-6 text-sm border-t border-slate-200 dark:border-white/10 pt-4">
          <div className="flex items-center gap-2 text-slate-500 dark:text-white/50">
            <Calendar className="w-4 h-4" />
            <span>Submitted {format(new Date(submission.submittedAt), 'MMM dd, yyyy hh:mm a')}</span>
            <span className="text-xs text-slate-400 dark:text-white/30">
              ({formatDistanceToNow(new Date(submission.submittedAt), { addSuffix: true })})
            </span>
          </div>
          <Badge variant={conditionScore.variant} size="sm">
            <ClipboardCheck className="w-3 h-3" />
            {conditionScore.label}
          </Badge>
        </div>

        {/* Workflow Timeline */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
          <StatusTimeline
            statuses={WORKFLOW_STEPS}
            currentStatus={STATUS_TO_TIMELINE_KEY[asset.status] || asset.status}
            isFlowComplete={(TERMINAL_ASSET_STATUSES as readonly string[]).includes(asset.status)}
          />
        </div>
      </motion.div>

      {/* Two-column layout: Employee Info + Asset Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employee Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 p-5"
        >
          <h3 className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
            <User className="w-3.5 h-3.5" />
            Submitted By
          </h3>
          {subUser ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-ecotribe-primary/10 border border-ecotribe-primary/20 flex items-center justify-center text-ecotribe-primary font-bold text-sm">
                  {subUser.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{subUser.name}</p>
                  {subUser.department && (
                    <p className="text-xs text-slate-400 dark:text-white/30">{subUser.department}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2 pl-1">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-white/30" />
                  <span className="text-sm text-slate-700 dark:text-white/70">{subUser.email}</span>
                </div>
                {subUser.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-white/30" />
                    <span className="text-sm text-slate-700 dark:text-white/70">{subUser.phone}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400 dark:text-white/30">Employee info unavailable</p>
          )}
        </motion.div>

        {/* Asset Details / Enterprise Context */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 p-5"
        >
          <h3 className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5" />
            Asset Details
          </h3>
          <div className="space-y-3">
            {asset.enterprise_name && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-white/40 uppercase tracking-wider">Enterprise</span>
                <span className="text-sm text-slate-900 dark:text-white font-medium">{asset.enterprise_name}</span>
              </div>
            )}
            {asset.branch_name && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-white/40 uppercase tracking-wider">Branch</span>
                <span className="text-sm text-slate-900 dark:text-white">{asset.branch_name}</span>
              </div>
            )}
            {asset.device_type && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-white/40 uppercase tracking-wider">Type</span>
                <span className="text-sm text-slate-900 dark:text-white capitalize">{asset.device_type}</span>
              </div>
            )}
            {asset.purchase_date && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-white/40 uppercase tracking-wider">Purchased</span>
                <span className="text-sm text-slate-900 dark:text-white">
                  {format(new Date(asset.purchase_date), 'MMM dd, yyyy')}
                </span>
              </div>
            )}
            {(isOpsAdmin || isSuperAdmin || isOrgAdmin) && asset.base_price != null && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-white/40 uppercase tracking-wider">Base Price</span>
                <span className="text-sm text-slate-900 dark:text-white font-mono">
                  ₹{asset.base_price.toLocaleString()}
                </span>
              </div>
            )}
            {(isOpsAdmin || isSuperAdmin || isOrgAdmin) && asset.estimated_value != null && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-white/40 uppercase tracking-wider">Est. Value</span>
                <span className="text-sm text-ecotribe-primary font-mono font-bold">
                  ₹{asset.estimated_value.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Photos */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider">
            Device Photos ({uploadedPhotos.length}/{PHOTO_SLOTS.length})
          </h3>
          {uploadedPhotos.length < PHOTO_SLOTS.length && (
            <Badge variant="warning" size="xs">
              {PHOTO_SLOTS.length - uploadedPhotos.length} missing
            </Badge>
          )}
        </div>
        {uploadedPhotos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {uploadedPhotos.map((photo) => (
              <div
                key={photo.key}
                onClick={() => openPhotoViewer(photo.url)}
                className="interactive relative aspect-square border border-slate-200 dark:border-white/10 hover:border-ecotribe-primary cursor-pointer overflow-hidden group"
              >
                <img src={photo.url} alt={photo.label} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-end justify-center">
                  <span className="text-[10px] text-white font-mono uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity pb-2">
                    {photo.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-white/50">No photos uploaded</p>
        )}
      </motion.div>

      {/* Condition Assessment */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider">
            Condition Assessment
          </h3>
          <Badge variant={conditionScore.variant} size="sm">
            {conditionScore.label}
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Power On */}
          <ConditionItem
            icon={<Zap className="w-4 h-4 text-yellow-500" />}
            label="Powers On"
            value={submission.functionalChecks?.powersOn ? 'Yes' : 'No'}
            good={!!submission.functionalChecks?.powersOn}
          />

          {/* Battery */}
          <ConditionItem
            icon={<Battery className="w-4 h-4 text-green-500" />}
            label="Battery"
            value={batteryOptions.find(o => o.value === submission.functionalChecks?.batteryBackup)?.label || 'N/A'}
            good={['1_2hrs', 'more_2hrs'].includes((submission.functionalChecks?.batteryBackup as any) || '')}
          />

          {/* Screen */}
          <ConditionItem
            icon={<Monitor className="w-4 h-4 text-blue-500" />}
            label="Screen"
            value={
              (submission.functionalChecks?.screenCondition as any)?.length
                ? (submission.functionalChecks?.screenCondition as any)
                    .map((v: any) => screenConditionOptions.find(o => o.value === v)?.label)
                    .join(', ')
                : 'N/A'
            }
            good={
              !(submission.functionalChecks?.screenCondition as any)?.length ||
              ((submission.functionalChecks?.screenCondition as any)?.length === 1 && (submission.functionalChecks?.screenCondition as any)[0] === 'none')
            }
          />

          {/* Keyboard */}
          <ConditionItem
            icon={<Keyboard className="w-4 h-4 text-purple-500" />}
            label="Keyboard"
            value={keyboardConditionOptions.find(o => o.value === submission.functionalChecks?.keyboardCondition)?.label || 'N/A'}
            good={submission.functionalChecks?.keyboardCondition === 'all_working'}
          />

          {/* Trackpad */}
          <ConditionItem
            icon={<MousePointer2 className="w-4 h-4 text-cyan-500" />}
            label="Trackpad"
            value={trackpadConditionOptions.find(o => o.value === submission.functionalChecks?.trackpadCondition)?.label || 'N/A'}
            good={submission.functionalChecks?.trackpadCondition === 'functional'}
          />

          {/* Ports */}
          <ConditionItem
            icon={<Usb className="w-4 h-4 text-orange-500" />}
            label="Ports"
            value={portsConditionOptions.find(o => o.value === submission.functionalChecks?.portsCondition)?.label || 'N/A'}
            good={submission.functionalChecks?.portsCondition === 'all_working'}
          />

          {/* Hinges */}
          <ConditionItem
            icon={<Box className="w-4 h-4 text-pink-500" />}
            label="Hinges"
            value={hingeConditionOptions.find(o => o.value === submission.functionalChecks?.hingeCondition)?.label || 'N/A'}
            good={submission.functionalChecks?.hingeCondition === 'stable'}
          />

          {/* Charger */}
          <ConditionItem
            icon={<Zap className="w-4 h-4 text-lime-500" />}
            label="Charger"
            value={chargerStatusOptions.find(o => o.value === submission.functionalChecks?.chargerStatus)?.label || 'N/A'}
            good={submission.functionalChecks?.chargerStatus === 'present'}
          />

          {/* Body Condition */}
          <ConditionItem
            icon={<Box className="w-4 h-4 text-amber-500" />}
            label="Body"
            value={
              (submission.functionalChecks?.bodyCondition as any)?.length
                ? (submission.functionalChecks?.bodyCondition as any)
                    .map((v: any) => bodyConditionOptions.find(o => o.value === v)?.label)
                    .join(', ')
                : 'N/A'
            }
            good={
              !(submission.functionalChecks?.bodyCondition as any)?.length ||
              ((submission.functionalChecks?.bodyCondition as any)?.length === 1 && (submission.functionalChecks?.bodyCondition as any)[0] === 'none')
            }
          />
        </div>
      </motion.div>

      {/* Dispute Context - shown to OPS admin when re-reviewing a disputed asset */}
      {isOpsAdmin && isDisputed && existingDispute && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="bg-amber-50/50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 p-5"
        >
          <div className="flex items-start gap-3 mb-3">
            <ShieldAlert className="w-5 h-5 text-amber-500 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300">
                This submission has been disputed
              </h3>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                The IT Admin / Org Admin has challenged the previous rejection. Please re-review and make a final decision.
              </p>
            </div>
            <Badge variant="warning" size="sm">Disputed</Badge>
          </div>

          <div className="ml-8 space-y-2 mt-3 pt-3 border-t border-amber-200 dark:border-amber-500/20">
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wider font-bold">Type</span>
              <span className="text-sm text-slate-900 dark:text-white capitalize">
                {existingDispute.reason?.replace(/_/g, ' ') || 'General'}
              </span>
            </div>
            {existingDispute.description && (
              <div>
                <span className="text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wider font-bold block mb-1">Dispute Notes</span>
                <p className="text-sm text-slate-700 dark:text-white/70 bg-white/50 dark:bg-white/[0.02] border border-amber-100 dark:border-amber-500/10 p-3">
                  {existingDispute.description}
                </p>
              </div>
            )}
            <p className="text-xs text-amber-500 dark:text-amber-500/70">
              Filed {format(new Date(existingDispute.created_at), 'MMM dd, yyyy hh:mm a')}
            </p>
          </div>
        </motion.div>
      )}

      {/* Review Actions - Only for authorized reviewers */}
      {canReview && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="sticky bottom-4 z-10"
        >
          <div className="bg-white/95 dark:bg-black/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-xl p-4 flex items-center gap-3">
            <div className="flex-1 text-sm text-slate-500 dark:text-white/50">
              <span className="font-medium text-slate-900 dark:text-white">{asset.brand} {asset.model}</span>
              {' '}&middot; {isDisputed ? 'Re-review this disputed submission' : 'Review this submission'}
            </div>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={isProcessing}
              className="interactive px-5 py-2.5 bg-red-500 text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-red-600 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              Reject
            </button>
            <button
              onClick={() => setShowApproveModal(true)}
              disabled={isProcessing}
              className="interactive px-5 py-2.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              Accept
            </button>
          </div>
        </motion.div>
      )}

      {/* Already reviewed info */}
      {asset.status === 'conditionally_accepted' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="border p-4 bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20"
        >
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">This submission has been accepted</p>
              <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5">
                The device is verified and ready for the next step in the workflow.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Rejected - with dispute option for IT Admin / Org Admin */}
      {asset.status === 'remote_rejected' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="border p-4 bg-red-50/50 dark:bg-red-500/5 border-red-200 dark:border-red-500/20"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">This submission was rejected</p>
                <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5">
                  {canDispute
                    ? 'You can dispute this decision if you believe it was incorrect.'
                    : existingDispute
                      ? 'A dispute has already been filed for this submission.'
                      : 'The employee has been notified of this decision.'}
                </p>
              </div>
            </div>
            {canDispute && (
              <button
                onClick={() => setShowDisputeModal(true)}
                className="interactive px-4 py-2 bg-amber-500 text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-amber-600 transition-all flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Dispute
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Disputed status - waiting for OPS re-review (shown to IT Admin / Org Admin) */}
      {asset.status === 'disputed' && !isOpsAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="border p-4 bg-amber-50/50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/20"
        >
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Dispute submitted - awaiting review</p>
              <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5">
                Your dispute has been sent to the operations team for re-evaluation.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Approve Modal */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title="Accept Submission"
        description="Review and confirm device acceptance"
        size="lg"
      >
        <div className="space-y-5">
          {/* Device summary */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10">
            <Laptop className="w-5 h-5 text-ecotribe-primary" />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{asset.brand} {asset.model}</p>
              <p className="text-xs text-slate-500 dark:text-white/50 font-mono">S/N: {asset.serial_number}</p>
            </div>
            <Badge variant={conditionScore.variant} size="xs" className="ml-auto">
              {conditionScore.label}
            </Badge>
          </div>

          {/* Grade Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider mb-2">
              <Star className="w-3.5 h-3.5 inline mr-1" />
              Assign Grade
            </label>
            <div className="grid grid-cols-2 gap-2">
              {GRADE_OPTIONS.map(g => (
                <button
                  key={g.value}
                  onClick={() => setSelectedGrade(g.value)}
                  className={`p-3 border text-left transition-all ${
                    selectedGrade === g.value
                      ? 'border-ecotribe-primary bg-ecotribe-primary/10'
                      : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                >
                  <span className={`text-sm font-bold ${selectedGrade === g.value ? 'text-ecotribe-primary' : 'text-slate-900 dark:text-white'}`}>
                    {g.label}
                  </span>
                  <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">{g.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Estimated Value */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider mb-2">
              <IndianRupee className="w-3.5 h-3.5 inline mr-1" />
              Estimated Value (optional)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30 text-sm">₹</span>
              <input
                type="number"
                value={estimatedValue}
                onChange={e => setEstimatedValue(e.target.value)}
                placeholder="Enter estimated value"
                className="w-full pl-7 pr-4 py-2.5 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30 text-sm focus:outline-none focus:border-ecotribe-primary"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider mb-2">
              <FileText className="w-3.5 h-3.5 inline mr-1" />
              Review Notes (optional)
            </label>
            <textarea
              value={reviewNotes}
              onChange={e => setReviewNotes(e.target.value)}
              placeholder="Add any notes about this device..."
              rows={3}
              className="w-full px-4 py-2.5 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30 text-sm focus:outline-none focus:border-ecotribe-primary resize-none"
            />
          </div>
        </div>

        <ModalFooter>
          <button
            onClick={() => setShowApproveModal(false)}
            className="px-4 py-2 text-sm text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApprove}
            disabled={isProcessing}
            className="interactive px-6 py-2.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            {isProcessing ? 'Processing...' : 'Confirm Acceptance'}
          </button>
        </ModalFooter>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Submission"
        description="Provide a reason for rejection"
        size="md"
      >
        <div className="space-y-5">
          <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-400">
              The employee will be notified and can dispute this decision.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider mb-2">
              Rejection Reason *
            </label>
            <textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="Explain why this submission is being rejected..."
              rows={4}
              className="w-full px-4 py-2.5 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30 text-sm focus:outline-none focus:border-red-400 resize-none"
              autoFocus
            />

            {/* Quick rejection reasons */}
            <div className="flex flex-wrap gap-2 mt-3">
              {[
                'Photos are unclear or insufficient',
                'Device condition does not match description',
                'Missing charger or accessories',
                'Serial number mismatch',
              ].map(reason => (
                <button
                  key={reason}
                  onClick={() => setRejectionReason(reason)}
                  className="px-2.5 py-1 text-xs border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/50 hover:border-red-300 dark:hover:border-red-500/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>
        </div>

        <ModalFooter>
          <button
            onClick={() => setShowRejectModal(false)}
            className="px-4 py-2 text-sm text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleReject}
            disabled={isProcessing || !rejectionReason.trim()}
            className="interactive px-6 py-2.5 bg-red-500 text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-red-600 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" />
            {isProcessing ? 'Processing...' : 'Confirm Rejection'}
          </button>
        </ModalFooter>
      </Modal>

      {/* Dispute Modal */}
      <Modal
        isOpen={showDisputeModal}
        onClose={() => setShowDisputeModal(false)}
        title="Dispute Rejection"
        description="Challenge this rejection with supporting details"
        size="md"
      >
        <div className="space-y-5">
          <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              This will send the submission back to the operations team for re-evaluation.
            </p>
          </div>

          {/* Dispute Type */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider mb-2">
              Dispute Reason *
            </label>
            <select
              value={disputeType}
              onChange={e => setDisputeType(e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-amber-400"
            >
              <option value="grading_dispute">Grading Dispute</option>
              <option value="condition_dispute">Condition Dispute</option>
              <option value="pricing_dispute">Pricing Dispute</option>
              <option value="missing_item">Missing Item</option>
              <option value="damage_dispute">Damage Dispute</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider mb-2">
              Details *
            </label>
            <textarea
              value={disputeDescription}
              onChange={e => setDisputeDescription(e.target.value)}
              placeholder="Explain why you believe this rejection was incorrect. Include any relevant details about the device condition..."
              rows={5}
              className="w-full px-4 py-2.5 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30 text-sm focus:outline-none focus:border-amber-400 resize-none"
              autoFocus
            />

            {/* Quick dispute reasons */}
            <div className="flex flex-wrap gap-2 mt-3">
              {[
                'Device condition is better than assessed',
                'Photos were taken in poor lighting',
                'Minor cosmetic issues should not affect grading',
                'Functionality was not properly tested',
              ].map(reason => (
                <button
                  key={reason}
                  onClick={() => setDisputeDescription(reason)}
                  className="px-2.5 py-1 text-xs border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/50 hover:border-amber-300 dark:hover:border-amber-500/30 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>
        </div>

        <ModalFooter>
          <button
            onClick={() => setShowDisputeModal(false)}
            className="px-4 py-2 text-sm text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDispute}
            disabled={isProcessing || !disputeDescription.trim()}
            className="interactive px-6 py-2.5 bg-amber-500 text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-amber-600 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <MessageSquare className="w-4 h-4" />
            {isProcessing ? 'Submitting...' : 'Submit Dispute'}
          </button>
        </ModalFooter>
      </Modal>

      {/* Photo Lightbox Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
          onClick={() => setSelectedPhoto(null)}
        >
          {/* Photo counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 font-mono text-sm">
            {photoIndex + 1} / {uploadedPhotos.length}
            <span className="ml-2 text-white/40">{uploadedPhotos[photoIndex]?.label}</span>
          </div>

          {/* Close button */}
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
          >
            <XCircle className="w-8 h-8" />
          </button>

          {/* Navigation */}
          {uploadedPhotos.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); navigatePhoto(-1); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 transition-colors text-white"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); navigatePhoto(1); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 transition-colors text-white"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <img
            src={selectedPhoto}
            alt={uploadedPhotos[photoIndex]?.label || 'Device photo'}
            className="max-w-[90vw] max-h-[85vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

// Reusable condition check display item
function ConditionItem({
  icon,
  label,
  value,
  good,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  good: boolean;
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-white dark:bg-white/[0.01] border border-slate-100 dark:border-white/5">
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider">{label}</p>
        <p className={`text-sm font-medium mt-0.5 ${good ? 'text-slate-900 dark:text-white' : 'text-amber-600 dark:text-amber-400'}`}>
          {value}
        </p>
      </div>
      <div className={`w-2 h-2 rounded-full mt-2 ${good ? 'bg-emerald-500' : 'bg-amber-500'}`} />
    </div>
  );
}

export default SubmissionDetail;
