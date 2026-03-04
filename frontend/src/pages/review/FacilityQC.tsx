import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ClipboardCheck,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Laptop,
  AlertTriangle,
  Clock,
  Camera
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth, useAsset } from '@/hooks';
import { assetKeys } from '@/hooks/useAssets';
import { reviewsApi } from '@/lib/api/reviews';
import { useToast, BackButton } from '@/components/ui';
import { facilityQCTemplate, type FacilityQCChecklist, type FacilityQCDecision } from '@/types/review';
import type { AssetGrade } from '@/types/asset';

const GRADES: { value: AssetGrade; label: string; color: string }[] = [
  { value: 'A', label: 'Grade A - Excellent', color: 'emerald' },
  { value: 'B', label: 'Grade B - Good', color: 'blue' },
  { value: 'C', label: 'Grade C - Fair', color: 'amber' },
  { value: 'D', label: 'Grade D - Poor', color: 'orange' },
  { value: 'F', label: 'Grade F - Fail', color: 'red' },
];

export function FacilityQC() {
  const { assetId } = useParams<{ assetId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const qcQueuePath = location.pathname.startsWith('/super') ? '/super/qc' : location.pathname.startsWith('/ops') ? '/ops/qc' : '/review/qc';
  const { user } = useAuth();
  const { data: asset, isLoading: assetLoading } = useAsset(assetId || '');
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const createFacilityQCMutation = useMutation({
    mutationFn: (data: { asset_id: string; decision: string; grade?: string; notes?: string; functional_tests?: Record<string, unknown> }) =>
      reviewsApi.createFacility(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
      queryClient.invalidateQueries({ queryKey: ['facility-qc'] });
    },
  });

  const isLoading = createFacilityQCMutation.isPending;

  const [checklist, setChecklist] = useState<FacilityQCChecklist>(facilityQCTemplate);
  const [expandedSections, setExpandedSections] = useState<string[]>(['verifyPhotos']);
  const [grade, setGrade] = useState<AssetGrade | null>(null);
  const [decision, setDecision] = useState<FacilityQCDecision | null>(null);
  const [notes, setNotes] = useState('');

  if (assetLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Clock className="w-12 h-12 text-zinc-400 mx-auto mb-4 animate-spin" />
          <p className="font-display text-zinc-500">Loading asset...</p>
        </div>
      </div>
    );
  }

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

  // Guard: asset already QC'd — show read-only completed summary
  const isQCCompleted = asset.status === 'final_accepted' || asset.status === 'final_rejected';

  if (isQCCompleted) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <BackButton />
          <div className="flex-1">
            <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-1">
              Facility QC — Completed
            </span>
            <h1 className="font-brand font-bold text-2xl text-slate-900 dark:text-white uppercase tracking-tight">
              {asset.brand} {asset.model}
            </h1>
          </div>
        </div>

        {/* Status Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 border ${
            asset.status === 'final_accepted'
              ? 'border-emerald-400/30 bg-emerald-400/10'
              : 'border-red-400/30 bg-red-400/10'
          }`}
        >
          <div className="flex items-center gap-4">
            {asset.status === 'final_accepted' ? (
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            ) : (
              <XCircle className="w-10 h-10 text-red-400" />
            )}
            <div>
              <h2 className={`font-brand font-bold text-xl uppercase tracking-tight ${
                asset.status === 'final_accepted' ? 'text-emerald-400' : 'text-red-400'
              }`}>
                QC {asset.status === 'final_accepted' ? 'Accepted' : 'Rejected'}
              </h2>
              <p className="font-mono text-xs text-zinc-500 mt-1">
                This asset has already been reviewed
              </p>
            </div>
          </div>
        </motion.div>

        {/* Device Info + Grade */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Device Info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]"
          >
            <div className="p-4 border-b border-slate-200 dark:border-white/10">
              <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">
                Device Info
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-center">
                  <Laptop className="w-8 h-8 text-zinc-400" />
                </div>
                <div>
                  <p className="font-display font-bold text-slate-900 dark:text-white uppercase">
                    {asset.brand} {asset.model}
                  </p>
                  <p className="font-mono text-xs text-zinc-500">S/N: {asset.serial_number}</p>
                </div>
              </div>
              <div className="border-t border-slate-200 dark:border-white/10 pt-3 space-y-2">
                <div className="flex justify-between">
                  <span className="font-mono text-xs text-zinc-500">Processor</span>
                  <span className="font-mono text-xs text-slate-900 dark:text-white">{asset.processor || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-xs text-zinc-500">RAM</span>
                  <span className="font-mono text-xs text-slate-900 dark:text-white">{asset.ram || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-xs text-zinc-500">Storage</span>
                  <span className="font-mono text-xs text-slate-900 dark:text-white">{asset.storage || 'N/A'}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* QC Result */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]"
          >
            <div className="p-4 border-b border-slate-200 dark:border-white/10">
              <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">
                QC Result
              </h3>
            </div>
            <div className="p-4 space-y-4">
              {asset.grade && (
                <div>
                  <span className="font-mono font-bold text-xs text-zinc-500 uppercase tracking-widest">Grade</span>
                  <p className="font-brand font-bold text-3xl text-slate-900 dark:text-white mt-1">{asset.grade}</p>
                </div>
              )}
              <div>
                <span className="font-mono font-bold text-xs text-zinc-500 uppercase tracking-widest">Decision</span>
                <p className={`font-display font-bold text-lg uppercase mt-1 ${
                  asset.status === 'final_accepted' ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {asset.status === 'final_accepted' ? 'Accepted' : 'Rejected'}
                </p>
              </div>
              {asset.final_price != null && (
                <div>
                  <span className="font-mono font-bold text-xs text-zinc-500 uppercase tracking-widest">Final Price</span>
                  <p className="font-brand font-bold text-xl text-slate-900 dark:text-white mt-1">
                    ₹{Number(asset.final_price).toLocaleString('en-IN')}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Back to Queue */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={() => navigate(qcQueuePath)}
            className="interactive px-6 py-3 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all"
          >
            Back to QC Queue
          </button>
        </motion.div>
      </div>
    );
  }

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionKey)
        ? prev.filter(s => s !== sectionKey)
        : [...prev, sectionKey]
    );
  };

  const toggleItem = (sectionKey: keyof FacilityQCChecklist, itemIndex: number) => {
    setChecklist(prev => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        items: prev[sectionKey].items.map((item, idx) =>
          idx === itemIndex ? { ...item, passed: !item.passed } : item
        ),
      },
    }));
  };

  const updateItemNotes = (sectionKey: keyof FacilityQCChecklist, itemIndex: number, notes: string) => {
    setChecklist(prev => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        items: prev[sectionKey].items.map((item, idx) =>
          idx === itemIndex ? { ...item, notes } : item
        ),
      },
    }));
  };

  const getSectionProgress = (sectionKey: keyof FacilityQCChecklist) => {
    const section = checklist[sectionKey];
    const passed = section.items.filter(i => i.passed).length;
    return { passed, total: section.items.length };
  };

  const getTotalProgress = () => {
    let passed = 0;
    let total = 0;
    Object.keys(checklist).forEach(key => {
      const progress = getSectionProgress(key as keyof FacilityQCChecklist);
      passed += progress.passed;
      total += progress.total;
    });
    return { passed, total };
  };

  // Check if all checklist items are completed
  const isChecklistComplete = () => {
    const progress = getTotalProgress();
    return progress.passed === progress.total;
  };

  const handleSubmitQC = async () => {
    if (!decision || !user) return;

    // Require all checklist items to be checked
    if (!isChecklistComplete()) {
      addToast({ type: 'warning', title: 'Incomplete', message: 'Please complete all checklist items before submitting.' });
      return;
    }

    // Map frontend decision to backend enum: 'final_accept' → 'accepted', 'final_reject' → 'rejected'
    const backendDecision = decision === 'final_accept' ? 'accepted' : 'rejected';

    try {
      await createFacilityQCMutation.mutateAsync({
        asset_id: asset.id,
        decision: backendDecision,
        grade: grade || undefined,
        notes: notes || undefined,
        functional_tests: checklist as unknown as Record<string, unknown>,
      });

      navigate(qcQueuePath);
    } catch (error) {
      console.error('Failed to submit facility QC:', error);
      addToast({ type: 'error', title: 'QC Failed', message: 'Failed to submit QC. Please try again.' });
    }
  };

  const totalProgress = getTotalProgress();
  const progressPercentage = (totalProgress.passed / totalProgress.total) * 100;

  const sectionKeys = Object.keys(checklist) as (keyof FacilityQCChecklist)[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <BackButton />
        <div className="flex-1">
          <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-1">
            Facility QC
          </span>
          <h1 className="font-brand font-bold text-2xl text-slate-900 dark:text-white uppercase tracking-tight">
            {asset.brand} {asset.model}
          </h1>
        </div>
        <div className="text-right">
          <p className="font-mono text-xs text-zinc-500 uppercase">Progress</p>
          <p className="font-brand font-bold text-xl text-ecotribe-primary">
            {totalProgress.passed}/{totalProgress.total}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono font-bold text-xs text-zinc-400 uppercase tracking-widest">
            Inspection Progress
          </span>
          <span className="font-mono font-bold text-xs text-ecotribe-primary">
            {Math.round(progressPercentage)}%
          </span>
        </div>
        <div className="h-2 bg-slate-200 dark:bg-white/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            className="h-full bg-ecotribe-primary"
            transition={{ duration: 0.5 }}
          />
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Checklist Sections */}
        <div className="lg:col-span-2 space-y-4">
          {sectionKeys.map((sectionKey, sectionIdx) => {
            const section = checklist[sectionKey];
            const progress = getSectionProgress(sectionKey);
            const isExpanded = expandedSections.includes(sectionKey);
            const isComplete = progress.passed === progress.total;

            return (
              <motion.div
                key={sectionKey}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: sectionIdx * 0.05 }}
                className={`border ${isComplete ? 'border-emerald-400/30' : 'border-slate-200 dark:border-white/10'} bg-slate-50 dark:bg-white/[0.02]`}
              >
                <button
                  onClick={() => toggleSection(sectionKey)}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 border flex items-center justify-center ${
                      isComplete
                        ? 'border-emerald-400/30 bg-emerald-400/10'
                        : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5'
                    }`}>
                      {isComplete ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <ClipboardCheck className="w-5 h-5 text-zinc-400" />
                      )}
                    </div>
                    <div className="text-left">
                      <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">
                        {section.name}
                      </h3>
                      <p className="font-mono text-xs text-zinc-500">
                        {progress.passed}/{progress.total} completed
                      </p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-zinc-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-zinc-400" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-200 dark:border-white/10">
                    {section.items.map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        className="p-4 border-b border-slate-200 dark:border-white/5 last:border-0"
                      >
                        <div className="flex items-start gap-4">
                          <button
                            onClick={() => toggleItem(sectionKey, itemIdx)}
                            className={`flex-shrink-0 w-10 h-10 sm:w-8 sm:h-8 border flex items-center justify-center transition-all ${
                              item.passed
                                ? 'border-emerald-400 bg-emerald-400/20 text-emerald-400'
                                : 'border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-white/5 text-zinc-500 hover:border-slate-400 dark:hover:border-white/30'
                            }`}
                          >
                            {item.passed && <CheckCircle className="w-4 h-4" />}
                          </button>
                          <div className="flex-1">
                            <p className={`font-display text-sm ${item.passed ? 'text-slate-900 dark:text-white' : 'text-zinc-400'}`}>
                              {item.question}
                            </p>
                            <input
                              type="text"
                              placeholder="Add notes (optional)..."
                              value={item.notes || ''}
                              onChange={(e) => updateItemNotes(sectionKey, itemIdx, e.target.value)}
                              className="mt-2 w-full px-3 py-2 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white text-sm font-mono placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:border-ecotribe-primary focus:outline-none transition-colors"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}

          {/* Photo Evidence Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]"
          >
            <div className="p-4 border-b border-slate-200 dark:border-white/10">
              <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">
                Photo Evidence (Optional)
              </h3>
            </div>
            <div className="p-4">
              <div className="border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 transition-colors p-8 text-center cursor-pointer">
                <Camera className="w-10 h-10 text-zinc-500 mx-auto mb-3" />
                <p className="font-display text-sm text-zinc-400">
                  Click to capture or upload photos
                </p>
                <p className="font-mono text-xs text-zinc-600 mt-1">
                  Document any issues found during inspection
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Decision Panel */}
        <div className="space-y-4">
          {/* Device Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]"
          >
            <div className="p-4 border-b border-slate-200 dark:border-white/10">
              <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">
                Device Info
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-center">
                  <Laptop className="w-8 h-8 text-zinc-400" />
                </div>
                <div>
                  <p className="font-display font-bold text-slate-900 dark:text-white uppercase">
                    {asset.brand} {asset.model}
                  </p>
                  <p className="font-mono text-xs text-zinc-500">S/N: {asset.serial_number}</p>
                </div>
              </div>
              <div className="border-t border-slate-200 dark:border-white/10 pt-3 space-y-2">
                <div className="flex justify-between">
                  <span className="font-mono text-xs text-zinc-500">Processor</span>
                  <span className="font-mono text-xs text-slate-900 dark:text-white">{asset.processor || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-xs text-zinc-500">RAM</span>
                  <span className="font-mono text-xs text-slate-900 dark:text-white">{asset.ram || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-xs text-zinc-500">Storage</span>
                  <span className="font-mono text-xs text-slate-900 dark:text-white">{asset.storage || 'N/A'}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Grade Selection */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]"
          >
            <div className="p-4 border-b border-slate-200 dark:border-white/10">
              <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">
                Assign Grade
              </h3>
            </div>
            <div className="p-4 space-y-2">
              {GRADES.map((g) => (
                <button
                  key={g.value}
                  onClick={() => setGrade(g.value)}
                  className={`w-full p-3 border flex items-center gap-3 transition-all ${
                    grade === g.value
                      ? `border-${g.color}-400 bg-${g.color}-400/10`
                      : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                >
                  <div className={`w-8 h-8 border flex items-center justify-center font-brand font-bold ${
                    grade === g.value
                      ? `border-${g.color}-400 text-${g.color}-400`
                      : 'border-white/20 text-zinc-500'
                  }`}>
                    {g.value}
                  </div>
                  <span className={`font-display text-sm ${
                    grade === g.value ? 'text-slate-900 dark:text-white' : 'text-zinc-400'
                  }`}>
                    {g.label}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Final Decision */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] sticky top-4"
          >
            <div className="p-4 border-b border-slate-200 dark:border-white/10">
              <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">
                Final Decision
              </h3>
            </div>

            <div className="p-4 space-y-4">
              {/* Decision Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDecision('final_accept')}
                  className={`interactive p-4 border ${
                    decision === 'final_accept'
                      ? 'border-emerald-400 bg-emerald-400/10'
                      : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-emerald-400/50'
                  } transition-all`}
                >
                  <CheckCircle className={`w-8 h-8 mx-auto mb-2 ${
                    decision === 'final_accept' ? 'text-emerald-400' : 'text-zinc-500'
                  }`} />
                  <p className={`font-mono font-bold text-xs uppercase tracking-widest ${
                    decision === 'final_accept' ? 'text-emerald-400' : 'text-zinc-400'
                  }`}>
                    Accept
                  </p>
                </button>
                <button
                  onClick={() => setDecision('final_reject')}
                  className={`interactive p-4 border ${
                    decision === 'final_reject'
                      ? 'border-red-400 bg-red-400/10'
                      : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-red-400/50'
                  } transition-all`}
                >
                  <XCircle className={`w-8 h-8 mx-auto mb-2 ${
                    decision === 'final_reject' ? 'text-red-400' : 'text-zinc-500'
                  }`} />
                  <p className={`font-mono font-bold text-xs uppercase tracking-widest ${
                    decision === 'final_reject' ? 'text-red-400' : 'text-zinc-400'
                  }`}>
                    Reject
                  </p>
                </button>
              </div>

              {/* Notes */}
              <div>
                <label className="block">
                  <span className="font-mono font-bold text-xs text-zinc-400 uppercase tracking-widest">
                    QC Notes
                  </span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add inspection notes..."
                    rows={3}
                    className="mt-2 w-full px-4 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:border-ecotribe-primary focus:outline-none transition-colors resize-none"
                  />
                </label>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmitQC}
                disabled={!decision || isLoading || !isChecklistComplete()}
                className={`w-full interactive py-4 sm:py-3 font-mono font-bold text-sm sm:text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                  decision
                    ? decision === 'final_accept'
                      ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                      : 'bg-red-500 text-white hover:bg-red-400'
                    : 'bg-slate-100 dark:bg-white/10 text-zinc-500 cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <Clock className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Complete QC
                    <ClipboardCheck className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Back Button */}
              <button
                onClick={() => navigate(-1)}
                className="w-full interactive py-2.5 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-zinc-400 font-mono font-bold text-xs uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-all"
              >
                Back
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default FacilityQC;
