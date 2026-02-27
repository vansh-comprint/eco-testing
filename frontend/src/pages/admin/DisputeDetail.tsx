/**
 * Dispute Detail Page
 * Shows the disputed asset with all details, QC report, and dispute message
 * Used by IT Admin / Org Admin to view dispute status
 */

import { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  AlertTriangle,
  Laptop,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  MessageSquare,
  ClipboardCheck,
  Camera,
  FileText,
  Cpu,
  HardDrive,
  Monitor,
} from 'lucide-react';
import { Badge, useToast } from '@/components/ui';
import { useDispute, useAuth } from '@/hooks';
import { format, formatDistanceToNow } from 'date-fns';
import { getAssetStatusDisplay } from '@/lib/status-display';
import type { QCImage, AssetStatus } from '@/types';

// Image type labels
const IMAGE_TYPE_LABELS: Record<QCImage['type'], string> = {
  front: 'Front View',
  back: 'Back View',
  left: 'Left Side',
  right: 'Right Side',
  screen: 'Screen',
  keyboard: 'Keyboard',
  ports: 'Ports',
  damage: 'Damage',
  other: 'Other',
};

export function DisputeDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { disputeId } = useParams<{ disputeId: string }>();
  const { user } = useAuth();
  const { addToast } = useToast();

  // Determine base path based on current location
  const isOrgAdmin = user?.role === 'org_admin' || location.pathname.startsWith('/org-admin');
  const basePath = isOrgAdmin ? '/org-admin' : '/admin';
  const assetsPath = isOrgAdmin ? '/org-admin/enterprise-assets' : `${basePath}/assets`;

  // Fetch dispute with asset details
  const { data: dispute, isLoading, error } = useDispute(disputeId || '');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-ecotribe-primary/30 border-t-ecotribe-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="font-mono text-sm text-slate-500 dark:text-white/50">Loading dispute...</p>
        </div>
      </div>
    );
  }

  if (error || !dispute) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
        <AlertTriangle className="w-12 h-12 text-amber-400 mb-4" />
        <p className="font-display font-bold text-slate-900 dark:text-white uppercase tracking-wide mb-1">Dispute not found</p>
        <p className="font-mono text-xs text-slate-500 dark:text-white/50 mb-6">The dispute you're looking for doesn't exist</p>
        <button
          onClick={() => navigate(-1)}
          className="interactive px-5 py-2.5 bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>
    );
  }

  const asset = dispute.assets;
  const isResolved = !!dispute.resolved_at;
  const statusConfig = asset ? getAssetStatusDisplay(asset.status as AssetStatus) : null;
  const qcReport = asset?.qc_report as {
    grade?: string;
    checklist?: Array<{ id: string; label: string; passed: boolean; notes?: string }>;
    images?: Array<{ id: string; url: string; type: QCImage['type']; caption?: string }>;
    notes?: string;
    reviewer?: string;
    completedAt?: string;
  } | undefined;

  const getResolutionConfig = (resolution?: string) => {
    switch (resolution) {
      case 'upheld':
        return { label: 'Upheld', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/30', description: 'Dispute was valid - device will be re-reviewed' };
      case 'overturned':
        return { label: 'Overturned', color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/30', description: 'Original rejection stands' };
      case 'partial':
        return { label: 'Partial', color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/30', description: 'Partial resolution - device will be re-evaluated' };
      default:
        return { label: 'Pending', color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/30', description: 'Awaiting review by QC team' };
    }
  };

  const resolutionConfig = getResolutionConfig(dispute.resolution);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={() => navigate(-1)}
            className="interactive flex items-center gap-2 text-slate-500 dark:text-white/50 hover:text-ecotribe-primary transition-colors font-mono text-xs uppercase tracking-widest mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className={`w-16 h-16 border flex items-center justify-center ${
                isResolved
                  ? dispute.resolution === 'upheld' ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-red-500/30 bg-red-500/10'
                  : 'border-amber-500/30 bg-amber-500/10'
              }`}>
                <AlertTriangle className={`w-8 h-8 ${
                  isResolved
                    ? dispute.resolution === 'upheld' ? 'text-emerald-400' : 'text-red-400'
                    : 'text-amber-400'
                }`} />
              </div>
              <div>
                <span className="font-mono font-bold text-xs text-amber-400 tracking-[0.3em] uppercase block mb-1">Dispute</span>
                <h1 className="font-brand font-bold text-2xl md:text-3xl text-slate-900 dark:text-white uppercase tracking-tight">
                  {asset?.brand} {asset?.model}
                </h1>
                <p className="font-mono text-sm text-slate-500 dark:text-white/50 mt-1">{asset?.serial_number}</p>
              </div>
            </div>

            <div className={`px-4 py-3 border ${resolutionConfig.bgColor}`}>
              <p className={`font-mono font-bold text-xs uppercase tracking-widest ${resolutionConfig.color}`}>
                {resolutionConfig.label}
              </p>
              <p className="font-mono text-[10px] text-slate-500 dark:text-white/50 mt-1">
                {resolutionConfig.description}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Dispute & Asset Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dispute Reason */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="border border-amber-500/20 bg-amber-500/5"
          >
            <div className="p-6 border-b border-amber-500/20 flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-amber-400" />
              <h2 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide">Dispute Reason</h2>
            </div>
            <div className="p-6">
              <p className="font-mono font-bold text-xs text-amber-400 uppercase tracking-widest mb-2">{dispute.reason}</p>
              {dispute.description && (
                <p className="font-display text-sm text-slate-700 dark:text-white/70 mt-4">{dispute.description}</p>
              )}
              <div className="mt-4 pt-4 border-t border-amber-500/10 flex items-center gap-4 text-xs">
                <span className="font-mono text-slate-500 dark:text-white/50">
                  Submitted {formatDistanceToNow(new Date(dispute.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Resolution (if resolved) */}
          {isResolved && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className={`border ${resolutionConfig.bgColor}`}
            >
              <div className="p-6 border-b border-current/10 flex items-center gap-3">
                {dispute.resolution === 'upheld' ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <h2 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide">Resolution</h2>
              </div>
              <div className="p-6">
                <p className={`font-mono font-bold text-sm uppercase tracking-widest mb-2 ${resolutionConfig.color}`}>
                  {resolutionConfig.label}
                </p>
                {dispute.resolver_notes && (
                  <p className="font-display text-sm text-slate-700 dark:text-white/70 mt-4">{dispute.resolver_notes}</p>
                )}
                <div className="mt-4 pt-4 border-t border-current/10 flex items-center gap-4 text-xs">
                  <span className="font-mono text-slate-500 dark:text-white/50">
                    Resolved {dispute.resolved_at && formatDistanceToNow(new Date(dispute.resolved_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Asset Information */}
          {asset && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 shadow-sm"
            >
              <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Laptop className="w-5 h-5 text-ecotribe-primary" />
                  <h2 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide">Asset Information</h2>
                </div>
                {statusConfig && (
                  <Badge variant={statusConfig.variant} size="sm">
                    {statusConfig.label}
                  </Badge>
                )}
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <InfoRow label="Brand" value={asset.brand} />
                <InfoRow label="Model" value={asset.model} />
                <InfoRow label="Serial Number" value={asset.serial_number} mono />
                <InfoRow label="Status" value={statusConfig?.label || asset.status} />
              </div>
            </motion.div>
          )}

          {/* QC Report */}
          {qcReport && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="border border-emerald-500/20 bg-emerald-500/5"
            >
              <div className="p-6 border-b border-emerald-500/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ClipboardCheck className="w-5 h-5 text-emerald-400" />
                  <h2 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide">QC Report</h2>
                </div>
                {qcReport.grade && (
                  <div className="px-4 py-2 border border-emerald-400/30 bg-emerald-400/10">
                    <p className="font-mono font-bold text-xs text-emerald-400 uppercase tracking-widest">
                      Grade: {qcReport.grade}
                    </p>
                  </div>
                )}
              </div>

              {/* QC Checklist */}
              {qcReport.checklist && qcReport.checklist.length > 0 && (
                <div className="p-6 border-b border-emerald-500/10">
                  <h3 className="font-mono font-bold text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest mb-4">Inspection Checklist</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {qcReport.checklist.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 border flex items-center gap-3 ${
                          item.passed
                            ? 'border-emerald-500/20 bg-emerald-500/5'
                            : 'border-red-500/20 bg-red-500/5'
                        }`}
                      >
                        {item.passed ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        )}
                        <div>
                          <p className={`font-display text-sm ${item.passed ? 'text-emerald-600 dark:text-emerald-300' : 'text-red-600 dark:text-red-300'}`}>
                            {item.label}
                          </p>
                          {item.notes && (
                            <p className="font-mono text-xs text-slate-500 dark:text-white/50 mt-0.5">{item.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* QC Images */}
              {qcReport.images && qcReport.images.length > 0 && (
                <div className="p-6 border-b border-emerald-500/10">
                  <div className="flex items-center gap-2 mb-4">
                    <Camera className="w-4 h-4 text-slate-500 dark:text-white/50" />
                    <h3 className="font-mono font-bold text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest">QC Photos</h3>
                    <span className="text-xs text-slate-500 dark:text-white/50">({qcReport.images.length})</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {qcReport.images.map((image) => (
                      <div
                        key={image.id}
                        className="relative aspect-square border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] overflow-hidden group cursor-pointer"
                      >
                        <img
                          src={image.url}
                          alt={IMAGE_TYPE_LABELS[image.type]}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="absolute bottom-0 left-0 right-0 p-2">
                            <p className="font-mono font-bold text-[10px] text-white uppercase tracking-widest">
                              {IMAGE_TYPE_LABELS[image.type]}
                            </p>
                            {image.caption && (
                              <p className="font-mono text-[10px] text-zinc-400 truncate">{image.caption}</p>
                            )}
                          </div>
                        </div>
                        <div className="absolute top-2 left-2">
                          <span className="px-2 py-0.5 bg-black/60 font-mono text-[9px] text-white uppercase tracking-widest">
                            {IMAGE_TYPE_LABELS[image.type]}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* QC Notes */}
              {qcReport.notes && (
                <div className="p-6 border-b border-emerald-500/10">
                  <h3 className="font-mono font-bold text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2">Reviewer Notes</h3>
                  <p className="font-display text-sm text-slate-700 dark:text-white/70">{qcReport.notes}</p>
                </div>
              )}

              {/* QC Meta */}
              <div className="p-6 flex items-center justify-between text-xs">
                {qcReport.reviewer && (
                  <span className="font-mono text-slate-500 dark:text-white/50">
                    Reviewed by: <span className="text-slate-700 dark:text-white/70">{qcReport.reviewer}</span>
                  </span>
                )}
                {qcReport.completedAt && (
                  <span className="font-mono text-slate-500 dark:text-white/50">
                    {format(new Date(qcReport.completedAt), 'MMM d, yyyy h:mm a')}
                  </span>
                )}
              </div>
            </motion.div>
          )}

          {/* Evidence */}
          {dispute.evidence && dispute.evidence.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02]"
            >
              <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center gap-3">
                <FileText className="w-5 h-5 text-slate-500 dark:text-white/50" />
                <h2 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide">Supporting Evidence</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {dispute.evidence.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative aspect-square border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] overflow-hidden hover:border-ecotribe-primary/50 transition-colors"
                    >
                      <img
                        src={url}
                        alt={`Evidence ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2">
                        <span className="px-2 py-0.5 bg-black/60 font-mono text-[9px] text-white uppercase tracking-widest">
                          Evidence {index + 1}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Column - Meta Info */}
        <div className="space-y-6">
          {/* Status Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 shadow-sm"
          >
            <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center gap-3">
              <Clock className="w-5 h-5 text-slate-500 dark:text-white/50" />
              <h2 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide">Timeline</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {/* Submitted */}
                <TimelineItem
                  icon={<AlertTriangle className="w-4 h-4" />}
                  status="Dispute Submitted"
                  description={`Reason: ${dispute.reason}`}
                  date={new Date(dispute.created_at)}
                  isFirst
                  isLast={!isResolved}
                />

                {/* Resolved */}
                {isResolved && dispute.resolved_at && (
                  <TimelineItem
                    icon={dispute.resolution === 'upheld' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    status={`Dispute ${dispute.resolution === 'upheld' ? 'Upheld' : dispute.resolution === 'overturned' ? 'Overturned' : 'Partially Resolved'}`}
                    description={dispute.resolver_notes || 'No notes provided'}
                    date={new Date(dispute.resolved_at)}
                    isLast
                  />
                )}
              </div>
            </div>
          </motion.div>

          {/* Quick Info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-6 shadow-sm"
          >
            <div className="space-y-4">
              {/* Dispute ID and Asset ID hidden for cleaner UX */}
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest">Submitted</span>
                <span className="font-display text-sm text-slate-700 dark:text-white/70">
                  {format(new Date(dispute.created_at), 'MMM d, yyyy')}
                </span>
              </div>
              {isResolved && dispute.resolved_at && (
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest">Resolved</span>
                  <span className="font-display text-sm text-slate-700 dark:text-white/70">
                    {format(new Date(dispute.resolved_at), 'MMM d, yyyy')}
                  </span>
                </div>
              )}
            </div>
          </motion.div>

          {/* View Asset Button */}
          {asset && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <button
                onClick={() => navigate(`${assetsPath}/${asset.id}`)}
                className="w-full interactive px-5 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-2"
              >
                <Laptop className="w-4 h-4" />
                View Full Asset Details
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-1">{label}</p>
      <p className={`font-display text-sm text-slate-900 dark:text-white ${mono ? 'font-mono' : 'uppercase'}`}>{value}</p>
    </div>
  );
}

function TimelineItem({
  icon,
  status,
  description,
  date,
  isFirst,
  isLast,
}: {
  icon: React.ReactNode;
  status: string;
  description: string;
  date: Date;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] flex items-center justify-center text-ecotribe-primary">
          {icon}
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-slate-200 dark:bg-white/10 mt-2" />
        )}
      </div>
      <div className="flex-1 pb-6">
        <p className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase">{status}</p>
        <p className="font-mono text-xs text-slate-600 dark:text-white/60 mt-1 line-clamp-2">{description}</p>
        <p className="font-mono text-[10px] text-slate-400 dark:text-white/40 mt-2">
          {format(date, 'MMM d, yyyy h:mm a')}
        </p>
      </div>
    </div>
  );
}

export default DisputeDetail;
