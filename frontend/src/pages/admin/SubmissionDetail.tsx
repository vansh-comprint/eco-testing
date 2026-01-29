import { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Laptop,
  CheckCircle,
  XCircle,
  Camera,
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
} from 'lucide-react';
import { useSubmissionStore } from '@/stores';
import { useAuth, useAllAssets, useAllSubUsers, useUpdateAssetStatus } from '@/hooks';
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
import { format } from 'date-fns';

export function SubmissionDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { assetId } = useParams<{ assetId: string }>();
  // V3: Use React Query hooks for database data
  const { user } = useAuth();

  // V3.2: Detect if we're in Org Admin context
  const isOrgAdmin = user?.role === 'org_admin' || location.pathname.startsWith('/org-admin');
  const basePath = isOrgAdmin ? '/org-admin' : '/admin';
  const { data: assets = [] } = useAllAssets();
  const { data: subUsers = [] } = useAllSubUsers();
  const updateStatusMutation = useUpdateAssetStatus();
  // Keep submissionStore for now (UI form state)
  const { getSubmissionByAssetId } = useSubmissionStore();

  // Helper to get sub user by ID
  const getSubUserById = (id: string) => subUsers.find(u => u.id === id);

  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const asset = assets.find(a => a.id === assetId);
  const submission = getSubmissionByAssetId(assetId || '');
  // V3: Use snake_case field names from database
  const subUser = asset?.assigned_sub_user_id ? getSubUserById(asset.assigned_sub_user_id) : null;

  if (!asset || !submission) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-16 h-16 text-slate-500 dark:text-white/50 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Submission Not Found</h2>
        <p className="text-slate-500 dark:text-white/50 mb-6">This submission doesn't exist or hasn't been submitted yet.</p>
        <button
          onClick={() => navigate(-1)}
          className="interactive px-6 py-3 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all"
        >
          Go Back
        </button>
      </div>
    );
  }

  const handleApprove = async () => {
    if (!asset) return;
    setIsProcessing(true);
    try {
      await updateStatusMutation.mutateAsync({ assetId: asset.id, status: 'conditionally_accepted' });
      alert('Device conditionally accepted! Sub-user will be notified to schedule pickup.');
      navigate(`${basePath}/dashboard`);
    } catch (error) {
      console.error('Failed to approve:', error);
      alert('Failed to approve submission');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!asset) return;
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    setIsProcessing(true);
    try {
      await updateStatusMutation.mutateAsync({ assetId: asset.id, status: 'remote_rejected' });
      alert('Device rejected. Sub-user will be notified.');
      navigate(`${basePath}/dashboard`);
    } catch (error) {
      console.error('Failed to reject:', error);
      alert('Failed to reject submission');
    } finally {
      setIsProcessing(false);
    }
  };

  const uploadedPhotos = PHOTO_SLOTS.filter(
    s => submission.photos?.[s.key as keyof typeof submission.photos]
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
      </div>

      {/* Device & Sub-User Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 p-6"
      >
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-ecotribe-primary/20 flex items-center justify-center">
              <Laptop className="w-8 h-8 text-ecotribe-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {asset.brand} {asset.model}
              </h1>
              <p className="text-sm text-slate-500 dark:text-white/50 font-mono">S/N: {asset.serial_number}</p>
              <p className="text-xs text-slate-500 dark:text-white/50 mt-1">
                Submitted {format(new Date(submission.submittedAt), 'MMM dd, yyyy hh:mm a')}
              </p>
            </div>
          </div>

          {asset.status === 'submitted' && user?.role === 'it_admin' && (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider">
                Pending Review
              </span>
            </div>
          )}
        </div>

        {/* Sub-User Info */}
        {subUser && (
          <div className="border-t border-slate-200 dark:border-white/10 pt-4">
            <h3 className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider mb-3">
              Submitted By
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-500 dark:text-white/50" />
                <span className="text-sm text-slate-900 dark:text-white">{subUser.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-500 dark:text-white/50" />
                <span className="text-sm text-slate-900 dark:text-white">{subUser.email}</span>
              </div>
              {subUser.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-500 dark:text-white/50" />
                  <span className="text-sm text-slate-900 dark:text-white">{subUser.phone}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Photos */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 p-6"
      >
        <h3 className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider mb-4">
          Device Photos ({uploadedPhotos.length})
        </h3>
        {uploadedPhotos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {PHOTO_SLOTS.map((slot) => {
              const photoKey = slot.key as keyof typeof submission.photos;
              const photo = submission.photos?.[photoKey];
              if (!photo) return null;

              return (
                <div
                  key={slot.key}
                  onClick={() => setSelectedPhoto(photo)}
                  className="interactive relative aspect-square border border-ecotribe-primary bg-ecotribe-primary/10 cursor-pointer overflow-hidden"
                >
                  <img src={photo} alt={slot.label} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-xs text-white font-medium text-center px-2">{slot.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-white/50">No photos uploaded</p>
        )}
      </motion.div>

      {/* Functional Checks */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 p-6"
      >
        <h3 className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider mb-4">
          Condition Assessment
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Power On */}
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-yellow-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white">Powers On</p>
              <p className={`text-sm ${submission.functionalChecks?.powersOn ? 'text-ecotribe-primary' : 'text-red-400'}`}>
                {submission.functionalChecks?.powersOn ? 'Yes' : 'No'}
              </p>
            </div>
          </div>

          {/* Battery */}
          <div className="flex items-start gap-3">
            <Battery className="w-5 h-5 text-green-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white">Battery Backup</p>
              <p className="text-sm text-slate-500 dark:text-white/50">
                {batteryOptions.find(o => o.value === submission.functionalChecks?.batteryBackup)?.label || 'Not specified'}
              </p>
            </div>
          </div>

          {/* Screen */}
          <div className="flex items-start gap-3">
            <Monitor className="w-5 h-5 text-blue-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white">Screen Condition</p>
              <p className="text-sm text-slate-500 dark:text-white/50">
                {submission.functionalChecks?.screenCondition?.length
                  ? submission.functionalChecks.screenCondition
                      .map(v => screenConditionOptions.find(o => o.value === v)?.label)
                      .join(', ')
                  : 'Not specified'}
              </p>
            </div>
          </div>

          {/* Keyboard */}
          <div className="flex items-start gap-3">
            <Keyboard className="w-5 h-5 text-purple-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white">Keyboard</p>
              <p className="text-sm text-slate-500 dark:text-white/50">
                {keyboardConditionOptions.find(o => o.value === submission.functionalChecks?.keyboardCondition)?.label || 'Not specified'}
              </p>
            </div>
          </div>

          {/* Trackpad */}
          <div className="flex items-start gap-3">
            <MousePointer2 className="w-5 h-5 text-cyan-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white">Trackpad</p>
              <p className="text-sm text-slate-500 dark:text-white/50">
                {trackpadConditionOptions.find(o => o.value === submission.functionalChecks?.trackpadCondition)?.label || 'Not specified'}
              </p>
            </div>
          </div>

          {/* Ports */}
          <div className="flex items-start gap-3">
            <Usb className="w-5 h-5 text-orange-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white">Ports</p>
              <p className="text-sm text-slate-500 dark:text-white/50">
                {portsConditionOptions.find(o => o.value === submission.functionalChecks?.portsCondition)?.label || 'Not specified'}
              </p>
            </div>
          </div>

          {/* Hinges */}
          <div className="flex items-start gap-3">
            <Box className="w-5 h-5 text-pink-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white">Hinges</p>
              <p className="text-sm text-slate-500 dark:text-white/50">
                {hingeConditionOptions.find(o => o.value === submission.functionalChecks?.hingeCondition)?.label || 'Not specified'}
              </p>
            </div>
          </div>

          {/* Charger */}
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-lime-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white">Charger</p>
              <p className="text-sm text-slate-500 dark:text-white/50">
                {chargerStatusOptions.find(o => o.value === submission.functionalChecks?.chargerStatus)?.label || 'Not specified'}
              </p>
            </div>
          </div>

          {/* Body Condition */}
          {submission.functionalChecks?.bodyCondition && submission.functionalChecks.bodyCondition.length > 0 && (
            <div className="flex items-start gap-3 md:col-span-2">
              <Box className="w-5 h-5 text-amber-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-white">Body Condition</p>
                <p className="text-sm text-slate-500 dark:text-white/50">
                  {submission.functionalChecks.bodyCondition
                    .map(v => bodyConditionOptions.find(o => o.value === v)?.label)
                    .join(', ')}
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Actions */}
      {asset.status === 'submitted' && user?.role === 'it_admin' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-3 sticky bottom-4"
        >
          <button
            onClick={handleReject}
            disabled={isProcessing}
            className="interactive flex-1 py-3.5 bg-red-500 text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-red-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" />
            Reject
          </button>
          <button
            onClick={handleApprove}
            disabled={isProcessing}
            className="interactive flex-1 py-3.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            {isProcessing ? 'Processing...' : 'Approve'}
          </button>
        </motion.div>
      )}

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <img
            src={selectedPhoto}
            alt="Device photo"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 text-white hover:text-ecotribe-primary transition-colors"
          >
            <XCircle className="w-8 h-8" />
          </button>
        </div>
      )}
    </div>
  );
}

export default SubmissionDetail;
