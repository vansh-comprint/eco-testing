import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Eye,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Laptop,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { useAuth, useAllAssets, useUpdateAsset } from '@/hooks';
import type { RemoteReviewDecision } from '@/types/review';
import { ConfirmationModal } from '@/components/ui';

const REJECTION_REASONS = [
  'Photos do not match device description',
  'Significant undisclosed damage visible',
  'Serial number mismatch or unclear',
  'Missing required photos',
  'Device appears non-functional',
  'Suspected counterfeit or modified device',
  'Other (specify in notes)',
];

export function RemoteReview() {
  const { assetId } = useParams<{ assetId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: assets = [] } = useAllAssets();
  const updateAssetMutation = useUpdateAsset();
  const isLoading = updateAssetMutation.isPending;

  const asset = assets.find(a => a.id === assetId);

  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [decision, setDecision] = useState<RemoteReviewDecision | null>(null);
  const [grade, setGrade] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');
  const [showZoom, setShowZoom] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Mock photos - in real app these would come from the asset submission
  const photos = [
    { label: 'Front View', url: '/placeholder-laptop-front.jpg' },
    { label: 'Back View', url: '/placeholder-laptop-back.jpg' },
    { label: 'Screen Close-up', url: '/placeholder-laptop-screen.jpg' },
    { label: 'Keyboard', url: '/placeholder-laptop-keyboard.jpg' },
    { label: 'Ports (Left)', url: '/placeholder-laptop-ports-left.jpg' },
    { label: 'Ports (Right)', url: '/placeholder-laptop-ports-right.jpg' },
    { label: 'Serial Number', url: '/placeholder-laptop-serial.jpg' },
    { label: 'Any Damage', url: '/placeholder-laptop-damage.jpg' },
  ];

  if (!asset) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="font-brand font-bold text-xl text-slate-900 dark:text-white uppercase mb-2">Asset Not Found</h2>
          <p className="font-display text-zinc-500 mb-6">The asset you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate(-1)}
            className="interactive px-6 py-2.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  const handleSubmitReview = async () => {
    if (!decision || !user || !asset) return;

    if (decision === 'rejected' && !rejectionReason) {
      return; // Show validation error
    }

    if (decision === 'conditionally_accepted' && !grade) {
      return; // Grade is required for acceptance
    }

    // TODO: Add createRemoteReview when reviews hook is available
    console.log('Creating remote review:', {
      assetId: asset.id,
      reviewerId: user.id,
      decision,
      grade: decision === 'conditionally_accepted' ? grade : undefined,
      reason: decision === 'rejected' ? rejectionReason : undefined,
      notes: notes || undefined,
    });

    // Update asset status (include grade for acceptance)
    await updateAssetMutation.mutateAsync({
      assetId: asset.id,
      updates: {
        status: decision === 'conditionally_accepted' ? 'conditionally_accepted' : 'remote_rejected',
        ...(decision === 'conditionally_accepted' && grade ? { grade } : {}),
      },
    });

    setShowConfirmModal(false);
    navigate('/review/queue');
  };

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="interactive w-10 h-10 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-slate-900 dark:text-white" />
        </button>
        <div>
          <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-1">
            Remote Review
          </span>
          <h1 className="font-brand font-bold text-2xl text-slate-900 dark:text-white uppercase tracking-tight">
            {asset.brand} {asset.model}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Photo Viewer */}
        <div className="lg:col-span-2 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]"
          >
            {/* Main Photo */}
            <div className="relative aspect-video bg-black flex items-center justify-center">
              <div className="absolute inset-0 flex items-center justify-center">
                <Laptop className="w-32 h-32 text-zinc-700" />
              </div>

              {/* Photo Navigation */}
              <button
                onClick={prevPhoto}
                className="absolute left-4 w-10 h-10 border border-white/20 bg-black/50 flex items-center justify-center hover:bg-black/70 transition-all"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={nextPhoto}
                className="absolute right-4 w-10 h-10 border border-white/20 bg-black/50 flex items-center justify-center hover:bg-black/70 transition-all"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>

              {/* Zoom Button */}
              <button
                onClick={() => setShowZoom(true)}
                className="absolute top-4 right-4 w-10 h-10 border border-white/20 bg-black/50 flex items-center justify-center hover:bg-black/70 transition-all"
              >
                <ZoomIn className="w-5 h-5 text-white" />
              </button>

              {/* Photo Label */}
              <div className="absolute bottom-4 left-4 px-3 py-1.5 border border-white/20 bg-black/70">
                <span className="font-mono font-bold text-xs text-white uppercase">
                  {photos[currentPhotoIndex].label}
                </span>
              </div>

              {/* Photo Counter */}
              <div className="absolute bottom-4 right-4 px-3 py-1.5 border border-white/20 bg-black/70">
                <span className="font-mono text-xs text-white">
                  {currentPhotoIndex + 1} / {photos.length}
                </span>
              </div>
            </div>

            {/* Photo Thumbnails */}
            <div className="p-4 border-t border-slate-200 dark:border-white/10">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {photos.map((photo, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPhotoIndex(idx)}
                    className={`flex-shrink-0 w-16 h-16 border ${
                      idx === currentPhotoIndex
                        ? 'border-ecotribe-primary bg-ecotribe-primary/10'
                        : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-slate-300 dark:hover:border-white/20'
                    } flex items-center justify-center transition-all`}
                  >
                    <Laptop className={`w-6 h-6 ${idx === currentPhotoIndex ? 'text-ecotribe-primary' : 'text-zinc-500'}`} />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Device Details */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]"
          >
            <div className="p-4 border-b border-slate-200 dark:border-white/10">
              <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">
                Device Information
              </h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4">
              <div>
                <p className="font-mono text-xs text-zinc-500 uppercase mb-1">Brand</p>
                <p className="font-display font-bold text-slate-900 dark:text-white">{asset.brand}</p>
              </div>
              <div>
                <p className="font-mono text-xs text-zinc-500 uppercase mb-1">Model</p>
                <p className="font-display font-bold text-slate-900 dark:text-white">{asset.model}</p>
              </div>
              <div>
                <p className="font-mono text-xs text-zinc-500 uppercase mb-1">Serial Number</p>
                <p className="font-mono text-slate-900 dark:text-white">{asset.serial_number}</p>
              </div>
              <div>
                <p className="font-mono text-xs text-zinc-500 uppercase mb-1">Processor</p>
                <p className="font-display text-slate-900 dark:text-white">{asset.processor || 'Not specified'}</p>
              </div>
              <div>
                <p className="font-mono text-xs text-zinc-500 uppercase mb-1">RAM</p>
                <p className="font-display text-slate-900 dark:text-white">{asset.ram || 'Not specified'}</p>
              </div>
              <div>
                <p className="font-mono text-xs text-zinc-500 uppercase mb-1">Storage</p>
                <p className="font-display text-slate-900 dark:text-white">{asset.storage || 'Not specified'}</p>
              </div>
            </div>
          </motion.div>

          {/* Submission Checklist */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]"
          >
            <div className="p-4 border-b border-slate-200 dark:border-white/10">
              <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">
                User Reported Condition
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-white/5">
                <span className="font-display text-sm text-zinc-400">Screen condition</span>
                <span className="font-mono font-bold text-xs text-emerald-400 uppercase">Good</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-white/5">
                <span className="font-display text-sm text-zinc-400">Body condition</span>
                <span className="font-mono font-bold text-xs text-amber-400 uppercase">Minor Scratches</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-white/5">
                <span className="font-display text-sm text-zinc-400">Keyboard functional</span>
                <span className="font-mono font-bold text-xs text-emerald-400 uppercase">Yes</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-white/5">
                <span className="font-display text-sm text-zinc-400">All ports working</span>
                <span className="font-mono font-bold text-xs text-emerald-400 uppercase">Yes</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="font-display text-sm text-zinc-400">Accessories included</span>
                <span className="font-mono font-bold text-xs text-zinc-400 uppercase">Charger only</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Decision Panel */}
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] sticky top-4"
          >
            <div className="p-4 border-b border-slate-200 dark:border-white/10">
              <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">
                Review Decision
              </h3>
            </div>

            <div className="p-4 space-y-4">
              {/* Decision Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDecision('conditionally_accepted')}
                  className={`interactive p-4 border ${
                    decision === 'conditionally_accepted'
                      ? 'border-emerald-400 bg-emerald-400/10'
                      : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-emerald-400/50'
                  } transition-all`}
                >
                  <CheckCircle className={`w-8 h-8 mx-auto mb-2 ${
                    decision === 'conditionally_accepted' ? 'text-emerald-400' : 'text-zinc-500'
                  }`} />
                  <p className={`font-mono font-bold text-xs uppercase tracking-widest ${
                    decision === 'conditionally_accepted' ? 'text-emerald-400' : 'text-zinc-400'
                  }`}>
                    Accept
                  </p>
                </button>
                <button
                  onClick={() => setDecision('rejected')}
                  className={`interactive p-4 border ${
                    decision === 'rejected'
                      ? 'border-red-400 bg-red-400/10'
                      : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-red-400/50'
                  } transition-all`}
                >
                  <XCircle className={`w-8 h-8 mx-auto mb-2 ${
                    decision === 'rejected' ? 'text-red-400' : 'text-zinc-500'
                  }`} />
                  <p className={`font-mono font-bold text-xs uppercase tracking-widest ${
                    decision === 'rejected' ? 'text-red-400' : 'text-zinc-400'
                  }`}>
                    Reject
                  </p>
                </button>
              </div>

              {/* Grade Selection (required for acceptance) */}
              {decision === 'conditionally_accepted' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-3"
                >
                  <label className="block">
                    <span className="font-mono font-bold text-xs text-zinc-400 uppercase tracking-widest">
                      Asset Grade *
                    </span>
                    <div className="mt-2 grid grid-cols-4 gap-2">
                      {['A', 'B', 'C', 'D'].map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGrade(g)}
                          className={`interactive py-3 border font-mono font-bold text-sm uppercase tracking-widest transition-all ${
                            grade === g
                              ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400'
                              : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-600 dark:text-zinc-400 hover:border-emerald-400/50'
                          }`}
                        >
                          Grade {g}
                        </button>
                      ))}
                    </div>
                  </label>
                </motion.div>
              )}

              {/* Rejection Reason */}
              {decision === 'rejected' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-3"
                >
                  <label className="block">
                    <span className="font-mono font-bold text-xs text-zinc-400 uppercase tracking-widest">
                      Rejection Reason *
                    </span>
                    <select
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="mt-2 w-full px-4 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display focus:border-ecotribe-primary focus:outline-none transition-colors"
                    >
                      <option value="" className="bg-zinc-900">Select a reason...</option>
                      {REJECTION_REASONS.map((reason) => (
                        <option key={reason} value={reason} className="bg-zinc-900">
                          {reason}
                        </option>
                      ))}
                    </select>
                  </label>
                </motion.div>
              )}

              {/* Notes */}
              <div>
                <label className="block">
                  <span className="font-mono font-bold text-xs text-zinc-400 uppercase tracking-widest">
                    Additional Notes
                  </span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes about the device condition..."
                    rows={4}
                    className="mt-2 w-full px-4 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:border-ecotribe-primary focus:outline-none transition-colors resize-none"
                  />
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={!decision || (decision === 'rejected' && !rejectionReason) || (decision === 'conditionally_accepted' && !grade) || isLoading}
                className={`w-full interactive py-4 sm:py-3 font-mono font-bold text-sm sm:text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                  decision
                    ? decision === 'conditionally_accepted'
                      ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                      : 'bg-red-500 text-white hover:bg-red-400'
                    : 'bg-slate-100 dark:bg-white/10 text-zinc-500 cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <Clock className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Submit Review
                    <Eye className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Skip Button */}
              <button
                onClick={() => navigate('/review/queue')}
                className="w-full interactive py-2.5 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-zinc-400 font-mono font-bold text-xs uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-all"
              >
                Skip to Next
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Zoom Modal */}
      {showZoom && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => setShowZoom(false)}
        >
          <div className="relative w-full h-full flex items-center justify-center p-8">
            <Laptop className="w-96 h-96 text-zinc-700" />
            <button
              onClick={() => setShowZoom(false)}
              className="absolute top-4 right-4 w-12 h-12 border border-white/20 bg-black/50 flex items-center justify-center hover:bg-black/70 transition-all"
            >
              <XCircle className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleSubmitReview}
        isLoading={isLoading}
        variant={decision === 'conditionally_accepted' ? 'warning' : 'danger'}
        title={decision === 'conditionally_accepted' ? 'Accept Asset?' : 'Reject Asset?'}
        description={
          decision === 'conditionally_accepted'
            ? 'This asset will be marked as conditionally accepted and proceed to pickup scheduling.'
            : `This asset will be permanently rejected. Reason: ${rejectionReason}`
        }
        confirmText={decision === 'conditionally_accepted' ? 'Accept' : 'Reject'}
        details={
          asset && (
            <div className="text-left space-y-1">
              <p className="font-mono text-xs text-slate-500 dark:text-white/60">
                <span className="text-slate-400 dark:text-white/40">Device:</span> {asset.brand} {asset.model}
              </p>
              <p className="font-mono text-xs text-slate-500 dark:text-white/60">
                <span className="text-slate-400 dark:text-white/40">Serial:</span> {asset.serial_number}
              </p>
            </div>
          )
        }
      />
    </div>
  );
}

export default RemoteReview;
