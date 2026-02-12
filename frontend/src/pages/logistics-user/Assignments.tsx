import React, { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, CheckCircle, Clock, MapPin, Phone, Truck, XCircle, Filter,
  ChevronDown, ChevronUp, AlertTriangle, Laptop, Image as ImageIcon, User, Package
} from 'lucide-react';
import { useAuth, useLogisticsUserPickups, useUpdatePickupStatus, useCompletePickup } from '@/hooks';
import { useToast } from '@/components/ui';

type Condition = 'good' | 'worse' | 'failed';
type StatusFilter = 'active' | 'all';

// Asset QC form state
interface AssetQCState {
  serialMatch: boolean;
  powersOn: boolean;
  condition: Condition;
  notes: string;
  pickupPhoto?: string;
  verified: boolean;
}

export function LogisticsAssignments() {
  const { user } = useAuth();
  const { data: pickupRequests = [] } = useLogisticsUserPickups(user?.id || '');
  const updateStatusMutation = useUpdatePickupStatus();
  const completePickupMutation = useCompletePickup();
  const { addToast } = useToast();
  const isLoading = updateStatusMutation.isPending || completePickupMutation.isPending;

  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);
  const [assetQC, setAssetQC] = useState<Record<string, AssetQCState>>({});
  const [finalProof, setFinalProof] = useState<{ signature?: string; packingPhoto?: string }>({});

  const photoInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const packingInputRef = useRef<HTMLInputElement | null>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const myRequests = useMemo(() => {
    if (statusFilter === 'active') {
      return pickupRequests.filter(r =>
        !['completed', 'cancelled', 'failed'].includes(r.status)
      );
    }
    return pickupRequests;
  }, [pickupRequests, statusFilter]);

  const activeRequest = myRequests.find(r => r.id === activeRequestId) || myRequests[0];
  const assetDetails = (activeRequest as any)?.assetDetails || [];

  const startPickup = async (id: string) => {
    try {
      await updateStatusMutation.mutateAsync({ requestId: id, status: 'in_progress' });
      setActiveRequestId(id);
    } catch (error) {
      console.error('Failed to start pickup:', error);
      addToast({ type: 'error', title: 'Start Failed', message: error instanceof Error ? error.message : 'Failed to start pickup. Please try again.' });
    }
  };

  // Initialize QC state for an asset
  const getAssetQC = (assetId: string): AssetQCState => {
    return assetQC[assetId] || {
      serialMatch: false,
      powersOn: false,
      condition: 'good',
      notes: '',
      verified: false,
    };
  };

  const updateAssetQC = (assetId: string, updates: Partial<AssetQCState>) => {
    setAssetQC(prev => ({
      ...prev,
      [assetId]: { ...getAssetQC(assetId), ...updates },
    }));
  };

  // Handle photo capture for asset
  const handleAssetPhoto = (assetId: string, file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      updateAssetQC(assetId, { pickupPhoto: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  // Mark asset as picked (verified)
  const markAssetPicked = async (assetId: string) => {
    const qc = getAssetQC(assetId);
    if (!qc.serialMatch || !qc.powersOn || !qc.pickupPhoto) {
      addToast({ type: 'warning', title: 'Incomplete', message: 'Please verify serial number, power-on status, and take a pickup photo before marking as picked.' });
      return;
    }
    updateAssetQC(assetId, { verified: true, condition: 'good' });
    // TODO: Update asset status in database when mutation is available
    console.log('Asset marked as picked:', assetId, qc);
  };

  // Mark asset as failed QC
  const markAssetFailed = async (assetId: string) => {
    updateAssetQC(assetId, { verified: true, condition: 'failed' });
    console.log('Asset marked as failed:', assetId);
  };

  // Mark asset as no-show
  const markNoShow = async (assetId: string) => {
    updateAssetQC(assetId, { verified: true, condition: 'failed', notes: 'No show' });
    console.log('Asset marked as no show:', assetId);
  };

  // Handle packing photo
  const handlePackingPhoto = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setFinalProof(prev => ({ ...prev, packingPhoto: reader.result as string }));
    reader.readAsDataURL(file);
  };

  // Signature handling
  const captureSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const signature = canvas.toDataURL();
    setFinalProof(prev => ({ ...prev, signature }));
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setFinalProof(prev => ({ ...prev, signature: undefined }));
  };

  // Check if all assets are processed
  const allAssetsProcessed = useMemo(() => {
    if (!activeRequest || assetDetails.length === 0) return false;
    return assetDetails.every((asset: any) => getAssetQC(asset.id).verified);
  }, [activeRequest, assetDetails, assetQC]);

  // Finish pickup
  const finishPickup = async () => {
    if (!activeRequest || !user) {
      console.error('finishPickup: No active request or user');
      return;
    }

    // Get picked (successful) asset IDs
    const pickedAssetIds = assetDetails
      .filter((a: any) => {
        const qc = getAssetQC(a.id);
        return qc.verified && qc.condition === 'good';
      })
      .map((a: any) => a.id);

    const pickedCount = pickedAssetIds.length;

    const failedCount = assetDetails.filter((a: any) => {
      const qc = getAssetQC(a.id);
      return qc.verified && qc.condition === 'failed';
    }).length;

    try {
      if (failedCount === assetDetails.length) {
        // All failed - mark as cancelled, no assets transition
        await updateStatusMutation.mutateAsync({
          requestId: activeRequest.id,
          status: 'cancelled',
          notes: `All ${failedCount} assets failed QC or no-show`,
        });
      } else if (failedCount > 0) {
        // Partial success - pass picked asset IDs so they transition to in_transit
        await updateStatusMutation.mutateAsync({
          requestId: activeRequest.id,
          status: 'failed',
          notes: `Picked: ${pickedCount}, Failed/No-show: ${failedCount}`,
          pickedAssetIds,
        } as any);
      } else {
        // Full success - all assets transition to in_transit
        await completePickupMutation.mutateAsync({
          requestId: activeRequest.id,
          completedBy: user.id,
        } as any);
      }
      // Reset local state after successful completion
      setAssetQC({});
      setFinalProof({});
      setActiveRequestId(null);
    } catch (error) {
      console.error('Failed to complete pickup:', error);
      addToast({ type: 'error', title: 'Completion Failed', message: error instanceof Error ? error.message : 'Failed to complete pickup. Please try again.' });
    }
  };

  // Get submission images from asset
  const getSubmissionImages = (asset: any) => {
    const submission = asset.submissions?.[0];
    if (!submission?.photos) return [];

    const photos = submission.photos;
    const images: { type: string; url: string }[] = [];

    // Collect all photo URLs from submission
    Object.entries(photos).forEach(([key, value]) => {
      if (value && typeof value === 'string' && value.startsWith('data:image')) {
        images.push({ type: key, url: value });
      }
    });

    return images;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
            <div>
              <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-2">
                Logistics User
              </span>
              <h1 className="font-brand font-bold text-3xl text-slate-900 dark:text-white uppercase tracking-tight">
                My Assignments
              </h1>
              <p className="font-display text-slate-500 dark:text-white/50 text-sm mt-2 uppercase tracking-wide">
                Verify assets, capture photos, complete pickups
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500 dark:text-white/50" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="px-4 py-2 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-sm text-slate-900 dark:text-white font-mono focus:outline-none focus:border-ecotribe-primary/50"
              >
                <option value="active">Active Only</option>
                <option value="all">All (with History)</option>
              </select>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Pickup Request Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {myRequests.length === 0 ? (
          <div className="p-6 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-500 dark:text-white/60 font-mono text-sm">
            No assignments yet.
          </div>
        ) : (
          myRequests.map((r) => {
            const location = (r as any).branches || r.pickup_locations;
            return (
              <div
                key={r.id}
                onClick={() => setActiveRequestId(r.id)}
                className={`p-4 border ${activeRequest?.id === r.id ? 'border-ecotribe-primary bg-ecotribe-primary/5' : 'border-slate-200 dark:border-white/10'} bg-slate-50 dark:bg-white/[0.02] cursor-pointer transition-all`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-ecotribe-primary" />
                    <p className="font-display font-bold text-sm text-slate-900 dark:text-white">
                      {location?.branch_name || location?.name || 'Pickup'}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <p className="font-mono text-xs text-slate-500 dark:text-white/60">
                  {r.asset_ids?.length || 0} assets · {r.preferred_time_slot} · {r.preferred_date ? new Date(r.preferred_date).toDateString() : 'TBD'}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Active Pickup Detail */}
      {activeRequest && (
        <div className="border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-black/40 backdrop-blur-md">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex-1">
              <p className="font-display font-bold text-lg text-slate-900 dark:text-white">
                {(activeRequest as any).branches?.branch_name || activeRequest.pickup_locations?.name || 'Pickup Location'}
              </p>
              <p className="font-mono text-xs text-slate-500 dark:text-white/60 mt-1">
                <MapPin className="w-3 h-3 inline mr-1" />
                {(activeRequest as any).branches?.address_line1 || activeRequest.pickup_locations?.address} · {(activeRequest as any).branches?.city || activeRequest.pickup_locations?.city} · {(activeRequest as any).branches?.pin_code || ''}
              </p>
              <p className="font-mono text-xs text-slate-500 dark:text-white/60 mt-1">
                <Phone className="w-3 h-3 inline mr-1" />
                {(activeRequest as any).branches?.site_contact_person || activeRequest.pickup_locations?.contact_person || 'Contact'} - {(activeRequest as any).branches?.site_contact_phone || ''}
              </p>
            </div>

            {['scheduled', 'assigned_to_logistics_user'].includes(activeRequest.status) && (
              <button
                onClick={() => startPickup(activeRequest.id)}
                disabled={isLoading}
                className="px-5 py-3 sm:px-4 sm:py-2 bg-ecotribe-primary text-black font-mono text-sm sm:text-xs font-bold uppercase tracking-widest border border-ecotribe-primary/40 hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                {isLoading ? 'Starting...' : 'Start Pickup'}
              </button>
            )}
            {['cancelled', 'completed', 'failed'].includes(activeRequest.status) && (
              <div className="px-4 py-2 border border-slate-400/40 bg-slate-400/10 text-slate-500 dark:text-white/50 font-mono text-xs uppercase tracking-widest">
                {activeRequest.status === 'cancelled' ? 'Cancelled' : 'Completed'}
              </div>
            )}
          </div>

          {/* Asset List */}
          <div className="divide-y divide-slate-200 dark:divide-white/10">
            {['cancelled', 'completed', 'failed'].includes(activeRequest.status) ? (
              <div className="p-6 text-center">
                <p className="font-mono text-sm text-slate-500 dark:text-white/50">
                  {activeRequest.status === 'cancelled'
                    ? 'This pickup has been cancelled.'
                    : 'This pickup has been completed.'}
                </p>
              </div>
            ) : assetDetails.length === 0 ? (
              <div className="p-6 text-center">
                <Package className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-white/20" />
                <p className="font-mono text-sm text-slate-500 dark:text-white/50">
                  No asset details available. Check back later.
                </p>
              </div>
            ) : (
              assetDetails.map((asset: any) => {
                const qc = getAssetQC(asset.id);
                const isExpanded = expandedAssetId === asset.id;
                const images = getSubmissionImages(asset);
                const submission = asset.submissions?.[0];

                return (
                  <div key={asset.id} className="border-b border-slate-100 dark:border-white/5 last:border-b-0">
                    {/* Asset Header - Always Visible */}
                    <div
                      className={`p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors ${qc.verified ? (qc.condition === 'good' ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : 'bg-red-50/50 dark:bg-red-900/10') : ''}`}
                      onClick={() => setExpandedAssetId(isExpanded ? null : asset.id)}
                    >
                      <div className="flex items-start gap-4">
                        {/* Asset Icon */}
                        <div className={`w-12 h-12 flex-shrink-0 flex items-center justify-center border ${qc.verified ? (qc.condition === 'good' ? 'border-emerald-400/40 bg-emerald-400/10' : 'border-red-400/40 bg-red-400/10') : 'border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.02]'}`}>
                          {qc.verified ? (
                            qc.condition === 'good' ? (
                              <CheckCircle className="w-6 h-6 text-emerald-500" />
                            ) : (
                              <XCircle className="w-6 h-6 text-red-500" />
                            )
                          ) : (
                            <Laptop className="w-6 h-6 text-slate-400 dark:text-white/40" />
                          )}
                        </div>

                        {/* Asset Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-display font-bold text-slate-900 dark:text-white">
                              {asset.brand} {asset.model}
                            </p>
                            {qc.verified && (
                              <span className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest ${qc.condition === 'good' ? 'bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 border border-emerald-400/30' : 'bg-red-400/10 text-red-600 dark:text-red-400 border border-red-400/30'}`}>
                                {qc.condition === 'good' ? 'Picked' : qc.notes === 'No show' ? 'No Show' : 'Failed'}
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-xs text-slate-500 dark:text-white/60">
                            S/N: {asset.serial_number}
                          </p>
                          {asset.sub_users && (
                            <p className="font-mono text-xs text-slate-400 dark:text-white/40 mt-1">
                              <User className="w-3 h-3 inline mr-1" />
                              {asset.sub_users.name} · {asset.sub_users.phone || asset.sub_users.email}
                            </p>
                          )}
                        </div>

                        {/* Expand Icon */}
                        <div className="flex-shrink-0">
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Asset Detail */}
                    <AnimatePresence>
                      {isExpanded && !qc.verified && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-4 bg-slate-50/50 dark:bg-white/[0.01]">
                            {/* Asset Details Section */}
                            <div className="grid grid-cols-2 gap-3 pt-4">
                              <div className="p-3 border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20">
                                <p className="font-mono text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/40 mb-1">Brand</p>
                                <p className="font-display font-bold text-sm text-slate-900 dark:text-white">{asset.brand}</p>
                              </div>
                              <div className="p-3 border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20">
                                <p className="font-mono text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/40 mb-1">Model</p>
                                <p className="font-display font-bold text-sm text-slate-900 dark:text-white">{asset.model}</p>
                              </div>
                              <div className="p-3 border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 col-span-2">
                                <p className="font-mono text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/40 mb-1">Serial Number</p>
                                <p className="font-display font-bold text-sm text-slate-900 dark:text-white font-mono">{asset.serial_number}</p>
                              </div>
                              {asset.specs?.processor && (
                                <div className="p-3 border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20">
                                  <p className="font-mono text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/40 mb-1">Processor</p>
                                  <p className="font-display text-sm text-slate-700 dark:text-white/80">{asset.specs.processor}</p>
                                </div>
                              )}
                              {asset.specs?.ram && (
                                <div className="p-3 border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20">
                                  <p className="font-mono text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/40 mb-1">RAM</p>
                                  <p className="font-display text-sm text-slate-700 dark:text-white/80">{asset.specs.ram}</p>
                                </div>
                              )}
                            </div>

                            {/* QC Images from Submission */}
                            {images.length > 0 && (
                              <div>
                                <p className="font-mono text-xs uppercase tracking-widest text-slate-500 dark:text-white/50 mb-2 flex items-center gap-2">
                                  <ImageIcon className="w-4 h-4" /> Check-in Photos ({images.length})
                                </p>
                                <div className="grid grid-cols-3 gap-2">
                                  {images.slice(0, 6).map((img, idx) => (
                                    <div key={idx} className="aspect-square border border-slate-200 dark:border-white/10 overflow-hidden bg-slate-100 dark:bg-black/20">
                                      <img
                                        src={img.url}
                                        alt={img.type}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Functional Checks from Submission */}
                            {submission?.functional_checks && (
                              <div>
                                <p className="font-mono text-xs uppercase tracking-widest text-slate-500 dark:text-white/50 mb-2">
                                  Employee Self-Assessment
                                </p>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {Object.entries(submission.functional_checks).map(([key, value]) => (
                                    <div key={key} className="flex items-center gap-2 p-2 border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20">
                                      {value ? (
                                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                                      ) : (
                                        <XCircle className="w-4 h-4 text-red-500" />
                                      )}
                                      <span className="text-slate-600 dark:text-white/70 capitalize">{key.replace(/_/g, ' ')}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Verification Section */}
                            <div className="border-t border-slate-200 dark:border-white/10 pt-4">
                              <p className="font-mono text-xs uppercase tracking-widest text-slate-500 dark:text-white/50 mb-3 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500" /> On-Site Verification
                              </p>

                              <div className="space-y-3">
                                {/* Serial Match */}
                                <label className="flex items-center gap-3 p-3 border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 cursor-pointer hover:border-ecotribe-primary/30 transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={qc.serialMatch}
                                    onChange={(e) => updateAssetQC(asset.id, { serialMatch: e.target.checked })}
                                    className="w-5 h-5 accent-ecotribe-primary"
                                  />
                                  <div>
                                    <p className="font-display font-bold text-sm text-slate-900 dark:text-white">Serial Number Matches</p>
                                    <p className="font-mono text-xs text-slate-500 dark:text-white/50">Verify: {asset.serial_number}</p>
                                  </div>
                                </label>

                                {/* Powers On */}
                                <label className="flex items-center gap-3 p-3 border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 cursor-pointer hover:border-ecotribe-primary/30 transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={qc.powersOn}
                                    onChange={(e) => updateAssetQC(asset.id, { powersOn: e.target.checked })}
                                    className="w-5 h-5 accent-ecotribe-primary"
                                  />
                                  <div>
                                    <p className="font-display font-bold text-sm text-slate-900 dark:text-white">Device Powers On</p>
                                    <p className="font-mono text-xs text-slate-500 dark:text-white/50">Turn on device and confirm it boots</p>
                                  </div>
                                </label>

                                {/* Pickup Photo */}
                                <div className="p-3 border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20">
                                  <div className="flex items-center justify-between mb-2">
                                    <div>
                                      <p className="font-display font-bold text-sm text-slate-900 dark:text-white">Pickup Photo</p>
                                      <p className="font-mono text-xs text-slate-500 dark:text-white/50">Take a photo of the device</p>
                                    </div>
                                    <button
                                      onClick={() => photoInputRefs.current[asset.id]?.click()}
                                      className="px-3 py-2 bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-white/80 flex items-center gap-2 hover:border-ecotribe-primary/30 transition-colors"
                                    >
                                      <Camera className="w-4 h-4" /> {qc.pickupPhoto ? 'Retake' : 'Capture'}
                                    </button>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      capture="environment"
                                      ref={(el) => { photoInputRefs.current[asset.id] = el; }}
                                      className="hidden"
                                      onChange={(e) => handleAssetPhoto(asset.id, e.target.files?.[0])}
                                    />
                                  </div>
                                  {qc.pickupPhoto && (
                                    <div className="mt-2 aspect-video border border-slate-200 dark:border-white/10 overflow-hidden bg-slate-100 dark:bg-black/20">
                                      <img src={qc.pickupPhoto} alt="Pickup" className="w-full h-full object-cover" />
                                    </div>
                                  )}
                                </div>

                                {/* Notes */}
                                <div className="p-3 border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20">
                                  <p className="font-display font-bold text-sm text-slate-900 dark:text-white mb-2">Notes (Optional)</p>
                                  <textarea
                                    value={qc.notes}
                                    onChange={(e) => updateAssetQC(asset.id, { notes: e.target.value })}
                                    placeholder="Any additional observations..."
                                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:border-ecotribe-primary/50 resize-none"
                                    rows={2}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons - Stack on mobile, row on desktop */}
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                              <button
                                onClick={() => markAssetPicked(asset.id)}
                                disabled={!qc.serialMatch || !qc.powersOn || !qc.pickupPhoto}
                                className={`w-full sm:flex-1 px-4 py-3 font-mono text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${qc.serialMatch && qc.powersOn && qc.pickupPhoto ? 'bg-emerald-500 text-white border border-emerald-400/50 hover:bg-emerald-600' : 'bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-white/30 border border-slate-300 dark:border-white/20 cursor-not-allowed'}`}
                              >
                                <CheckCircle className="w-4 h-4" /> Mark Picked
                              </button>
                              <div className="flex gap-2 w-full sm:w-auto">
                                <button
                                  onClick={() => markAssetFailed(asset.id)}
                                  className="flex-1 sm:flex-none px-3 sm:px-4 py-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[10px] sm:text-xs uppercase tracking-widest border border-amber-400/50 flex items-center justify-center gap-1.5 sm:gap-2 hover:bg-amber-500/20 transition-colors"
                                >
                                  <AlertTriangle className="w-4 h-4" /> Failed
                                </button>
                                <button
                                  onClick={() => markNoShow(asset.id)}
                                  className="flex-1 sm:flex-none px-3 sm:px-4 py-3 bg-red-500/10 text-red-600 dark:text-red-400 font-mono text-[10px] sm:text-xs uppercase tracking-widest border border-red-400/50 flex items-center justify-center gap-1.5 sm:gap-2 hover:bg-red-500/20 transition-colors"
                                >
                                  <XCircle className="w-4 h-4" /> No Show
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>

          {/* Final Proof Section - Shows when all assets processed */}
          {allAssetsProcessed && activeRequest.status === 'in_progress' && (
            <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-emerald-50/50 dark:bg-emerald-900/10 space-y-4">
              <div>
                <p className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" /> All assets verified
                </p>
                <p className="font-mono text-xs text-slate-500 dark:text-white/60 mt-1">
                  Capture final proof and complete pickup
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Packing Photo */}
                <div className="space-y-2">
                  <label className="font-mono text-xs text-slate-700 dark:text-white/70 uppercase tracking-widest">
                    Packing Photo
                  </label>
                  <button
                    onClick={() => packingInputRef.current?.click()}
                    className="w-full px-4 py-3 bg-white/70 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-sm text-slate-700 dark:text-white/80 flex items-center justify-center gap-2 hover:border-ecotribe-primary/30 transition-colors"
                  >
                    <Camera className="w-4 h-4" /> {finalProof.packingPhoto ? 'Retake' : 'Take Photo'}
                  </button>
                  <input
                    type="file"
                    ref={packingInputRef}
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handlePackingPhoto(e.target.files?.[0])}
                  />
                  {finalProof.packingPhoto && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono">✓ Photo captured</p>
                  )}
                </div>

                {/* Signature */}
                <div className="space-y-2">
                  <label className="font-mono text-xs text-slate-700 dark:text-white/70 uppercase tracking-widest">
                    Handover Signature
                  </label>
                  <SignatureCanvas ref={signatureCanvasRef} />
                  <div className="flex gap-2">
                    <button
                      onClick={captureSignature}
                      className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white text-xs font-mono uppercase tracking-widest border border-slate-300 dark:border-slate-600"
                    >
                      Save
                    </button>
                    <button
                      onClick={clearSignature}
                      className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 text-xs font-mono uppercase tracking-widest border border-slate-300 dark:border-slate-600"
                    >
                      Clear
                    </button>
                  </div>
                  {finalProof.signature && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono">✓ Signature captured</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={finishPickup}
                  className="w-full sm:w-auto px-6 py-4 sm:py-3 bg-ecotribe-primary text-black font-mono text-sm sm:text-xs font-bold uppercase tracking-widest border border-ecotribe-primary/40 hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Processing...' : 'Complete Pickup'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-400/10 border border-amber-400/40 text-amber-400',
    assigned_to_logistics_admin: 'bg-blue-400/10 border border-blue-400/40 text-blue-400',
    assigned_to_logistics_user: 'bg-blue-400/10 border border-blue-400/40 text-blue-400',
    scheduled: 'bg-purple-400/10 border border-purple-400/40 text-purple-400',
    in_progress: 'bg-amber-400/10 border border-amber-400/40 text-amber-400',
    completed: 'bg-emerald-400/10 border border-emerald-400/40 text-emerald-400',
    failed: 'bg-orange-400/10 border border-orange-400/40 text-orange-400',
    cancelled: 'bg-red-400/10 border border-red-400/40 text-red-400',
  };
  const cls = map[status] || 'bg-slate-400/10 border border-slate-400/40 text-slate-400';
  return (
    <span className={`px-3 py-1 text-[11px] font-mono uppercase tracking-widest ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

// Signature Canvas Component
const SignatureCanvas = React.forwardRef<HTMLCanvasElement>((props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  React.useImperativeHandle(ref, () => canvasRef.current!);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = document.documentElement.classList.contains('dark') ? '#fff' : '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={120}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={stopDrawing}
      className="border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 cursor-crosshair w-full"
      style={{ touchAction: 'none' }}
    />
  );
});
