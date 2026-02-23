import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Laptop,
  Check,
  MapPin,
  Calendar,
  Clock,
  AlertCircle,
  ChevronLeft,
  Truck,
  Search,
  Loader2,
} from 'lucide-react';
import { useAuth, useBranches, useBranchesByITAdmin, useAssets, useAssetsByITAdmin, useCreatePickupRequest, usePickupRequests, usePickupsByITAdmin, useAllBatches, useApiError } from '@/hooks';
import type { PickupPriority } from '@/types';
import type { PickupTimeSlot } from '@/types/pickup';
import { pickupTimeSlotLabels } from '@/types/pickup';

const PRIORITIES: { value: PickupPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-slate-500' },
  { value: 'normal', label: 'Normal', color: 'bg-blue-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500' },
];

const TIME_SLOTS: { value: PickupTimeSlot; label: string }[] = [
  { value: 'morning', label: pickupTimeSlotLabels.morning },
  { value: 'afternoon', label: pickupTimeSlotLabels.afternoon },
  { value: 'evening', label: pickupTimeSlotLabels.evening },
];

export function InitiatePickup() {
  const navigate = useNavigate();
  const location = useLocation();
  // V3: Use React Query hook for auth
  const { user, enterprise } = useAuth();
  const enterpriseId = enterprise?.id || '';
  const userId = user?.id || '';

  // Determine if org admin context
  const isOrgAdmin = user?.role === 'org_admin' || location.pathname.startsWith('/org-admin');
  const basePath = isOrgAdmin ? '/org-admin' : '/admin';

  // V3.2: React Query hooks - use different hooks based on role
  const { data: orgBranches = [], isLoading: orgBranchesLoading } = useBranches(isOrgAdmin ? enterpriseId : '');
  const { data: itBranches = [], isLoading: itBranchesLoading } = useBranchesByITAdmin(isOrgAdmin ? '' : userId);
  const { data: orgAssets = [], isLoading: orgAssetsLoading } = useAssets(isOrgAdmin ? enterpriseId : '');
  const { data: itAssets = [], isLoading: itAssetsLoading } = useAssetsByITAdmin(isOrgAdmin ? '' : userId);
  const { data: orgPickups = [], isLoading: orgPickupsLoading } = usePickupRequests(isOrgAdmin ? enterpriseId : '');
  const { data: itPickups = [], isLoading: itPickupsLoading } = usePickupsByITAdmin(isOrgAdmin ? '' : userId);
  const { data: allBatches = [] } = useAllBatches();

  const branches = isOrgAdmin ? orgBranches : itBranches;
  const branchesLoading = isOrgAdmin ? orgBranchesLoading : itBranchesLoading;
  const assets = isOrgAdmin ? orgAssets : itAssets;
  const assetsLoading = isOrgAdmin ? orgAssetsLoading : itAssetsLoading;
  const pickupRequests = isOrgAdmin ? orgPickups : itPickups;
  const pickupsLoading = isOrgAdmin ? orgPickupsLoading : itPickupsLoading;

  const createPickupMutation = useCreatePickupRequest();
  const { handleError, showSuccess, showError } = useApiError();

  // V3.2: Get asset IDs that are already in active/pending pickup requests
  // This is a backup check in case asset status wasn't updated properly
  const assetsInActivePickups = useMemo(() => {
    const activeStatuses = ['pending', 'assigned_to_logistics_admin', 'assigned_to_logistics_user', 'scheduled', 'in_progress'];
    const assetIds = new Set<string>();
    pickupRequests
      .filter(pr => activeStatuses.includes(pr.status))
      .forEach(pr => {
        (pr.asset_ids || []).forEach((id: string) => assetIds.add(id));
      });
    return assetIds;
  }, [pickupRequests]);

  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [branchId, setBranchId] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [timeSlot, setTimeSlot] = useState<PickupTimeSlot>('morning');
  const [priority, setPriority] = useState<PickupPriority>('normal');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get assets that are ready for pickup (V3: use snake_case)
  // V3.2: Explicitly exclude any assets already in pickup flow to prevent double-selection
  // Also check against active pickup requests as a backup (in case status update failed)
  const PICKUP_FLOW_STATUSES = ['pickup_requested', 'pickup_scheduled', 'picked_up', 'in_transit'];
  const readyAssets = useMemo(() => {
    return assets.filter(a =>
      a.enterprise_id === enterpriseId &&
      (a.status === 'ready_for_pickup' || a.status === 'conditionally_accepted') &&
      !PICKUP_FLOW_STATUSES.includes(a.status) &&
      !assetsInActivePickups.has(a.id) // Backup check against pickup_requests table
    );
  }, [assets, enterpriseId, assetsInActivePickups]);

  // Filter by search (V3: use snake_case)
  const filteredAssets = useMemo(() => {
    if (!searchQuery) return readyAssets;
    const query = searchQuery.toLowerCase();
    return readyAssets.filter(a =>
      a.serial_number.toLowerCase().includes(query) ||
      (a.brand || '').toLowerCase().includes(query) ||
      (a.model || '').toLowerCase().includes(query)
    );
  }, [readyAssets, searchQuery]);

  // Check if selected assets have unapproved batches
  const unapprovedBatchAssets = useMemo(() => {
    const batchMap = new Map(allBatches.map(b => [b.id, b]));
    return selectedAssetIds.filter(assetId => {
      const asset = assets.find(a => a.id === assetId);
      if (!asset?.batch_id) return true; // No batch = not approved
      const batch = batchMap.get(asset.batch_id);
      return !batch || batch.status !== 'approved';
    });
  }, [selectedAssetIds, assets, allBatches]);

  const hasUnapprovedBatchWarning = unapprovedBatchAssets.length > 0;

  const toggleAssetSelection = (assetId: string) => {
    setSelectedAssetIds(prev =>
      prev.includes(assetId)
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedAssetIds.length === filteredAssets.length) {
      setSelectedAssetIds([]);
    } else {
      setSelectedAssetIds(filteredAssets.map(a => a.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedAssetIds.length === 0) {
      alert('Please select at least one asset');
      return;
    }

    if (!branchId) {
      alert('Please select a branch');
      return;
    }

    if (!preferredDate) {
      alert('Please select a preferred date');
      return;
    }

    if (!enterpriseId) {
      showError('Session Error', 'No enterprise associated with your account. Please contact support.');
      return;
    }

    if (!user?.id) {
      showError('Session Error', 'User session invalid. Please log out and log back in.');
      return;
    }

    setIsSubmitting(true);
    try {
      // V3.2: Use React Query mutation with branch_id instead of location_id
      await createPickupMutation.mutateAsync({
        enterprise_id: enterpriseId,
        branch_id: branchId,
        asset_ids: selectedAssetIds,
        preferred_date: preferredDate,
        preferred_time_slot: timeSlot,
        priority,
        notes: specialInstructions,
        created_by: user.id,
      } as any);

      showSuccess('Pickup Requested', `Pickup request for ${selectedAssetIds.length} asset${selectedAssetIds.length > 1 ? 's' : ''} created successfully`);
      navigate(`${basePath}/pickups`);
    } catch (error: unknown) {
      handleError(error, 'Creating pickup request');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (branchesLoading || assetsLoading || pickupsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-ecotribe-primary mx-auto mb-4" />
          <p className="font-display font-bold uppercase tracking-wide text-slate-500 dark:text-white/50">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-500 dark:text-white/50 hover:text-ecotribe-primary mb-3 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-xs font-mono font-bold uppercase tracking-widest">Back</span>
          </button>
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-2">
                Logistics
              </span>
              <h1 className="font-brand font-bold text-3xl text-slate-900 dark:text-white uppercase tracking-tight">
                Initiate Pickup Request
              </h1>
              <p className="font-display text-slate-500 dark:text-white/50 text-sm mt-2 uppercase tracking-wide">
                Select devices and schedule a pickup
              </p>
            </div>
            <div className="px-4 py-2 border border-ecotribe-primary/40 bg-ecotribe-primary/10">
              <span className="text-xs font-mono font-bold uppercase text-ecotribe-primary tracking-widest">
                {readyAssets.length} Devices Ready
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* No branches warning */}
      {branches.length === 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-amber-900 dark:text-amber-200 mb-1">No Branches Assigned</h3>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              You don't have any branches assigned. Contact your Org Admin to be assigned to a branch.
            </p>
          </div>
        </div>
      )}

      {/* No assets ready */}
      {readyAssets.length === 0 && (
        <div className="bg-white/85 dark:bg-black/50 border border-slate-200 dark:border-white/10 py-16 px-6 text-center shadow-sm">
          <div className="w-20 h-20 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-center mx-auto mb-6">
            <Laptop className="w-10 h-10 text-slate-500 dark:text-white/50" />
          </div>
          <h3 className="text-lg font-bold text-slate-500 dark:text-white/50 mb-2">No Devices Ready for Pickup</h3>
          <p className="text-sm text-slate-500 dark:text-white/50 max-w-xs mx-auto">
            Devices appear here after being approved for pickup by the OPS Manager.
          </p>
        </div>
      )}

      {/* Form */}
      {readyAssets.length > 0 && branches.length > 0 && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Pickup Details */}
        <div className="bg-white/85 dark:bg-black/50 border border-slate-200 dark:border-white/10 p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">
              Pickup Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Branch */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-white/60 mb-2">
                  <MapPin className="w-3 h-3 inline mr-1" />
                  Branch *
                </label>
                <select
                  required
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-ecotribe-primary focus:ring-1 focus:ring-ecotribe-primary transition-colors"
                >
                  <option value="">Select branch...</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>
                      {branch.branch_name} ({branch.branch_code}) - {branch.city}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-white/60 mb-2">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  Preferred Date *
                </label>
                <input
                  type="date"
                  required
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-ecotribe-primary focus:ring-1 focus:ring-ecotribe-primary transition-colors"
                />
              </div>

              {/* Time Slot */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-white/60 mb-2">
                  <Clock className="w-3 h-3 inline mr-1" />
                  Time Slot *
                </label>
                <select
                  required
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value as PickupTimeSlot)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-ecotribe-primary focus:ring-1 focus:ring-ecotribe-primary transition-colors"
                >
                  {TIME_SLOTS.map(slot => (
                    <option key={slot.value} value={slot.value}>{slot.label}</option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-white/60 mb-2">
                  <Truck className="w-3 h-3 inline mr-1" />
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as PickupPriority)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-ecotribe-primary focus:ring-1 focus:ring-ecotribe-primary transition-colors"
                >
                  {PRIORITIES.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Special Instructions */}
            <div className="mt-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-white/60 mb-2">
                Special Instructions
              </label>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                rows={2}
                placeholder="Any special instructions for the pickup team..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:border-ecotribe-primary focus:ring-1 focus:ring-ecotribe-primary resize-none transition-colors"
              />
            </div>
          </div>

          {/* Asset Selection */}
          <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Select Devices ({selectedAssetIds.length} selected)
              </h2>
              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search devices..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-3 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:border-ecotribe-primary focus:ring-1 focus:ring-ecotribe-primary w-64 transition-colors"
                  />
                </div>
                {/* Select All */}
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="interactive px-3 py-2 bg-slate-200 dark:bg-white/10 hover:bg-ecotribe-primary/20 border border-transparent hover:border-ecotribe-primary/30 font-mono font-bold text-xs uppercase tracking-wider transition-all"
                >
                  {selectedAssetIds.length === filteredAssets.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>

            {/* Assets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {filteredAssets.map(asset => {
                const isSelected = selectedAssetIds.includes(asset.id);
                return (
                  <motion.div
                    key={asset.id}
                    onClick={() => toggleAssetSelection(asset.id)}
                    className={`p-3 border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-ecotribe-primary/20 border-ecotribe-primary/30'
                        : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 hover:border-ecotribe-primary/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-ecotribe-primary' : 'bg-slate-200 dark:bg-white/10'
                      }`}>
                        {isSelected ? (
                          <Check className="w-4 h-4 text-black" />
                        ) : (
                          <Laptop className="w-4 h-4 text-slate-500 dark:text-white/50" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                          {asset.brand} {asset.model}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-white/50 font-mono truncate">
                          S/N: {asset.serial_number}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {filteredAssets.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-slate-500 dark:text-white/50">
                  No devices match your search
                </p>
              </div>
            )}
          </div>

          {/* Warning for unapproved batch assets */}
          {hasUnapprovedBatchWarning && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-500/10 border border-amber-500/30 p-4 flex gap-3"
            >
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-amber-900 dark:text-amber-200 mb-1">
                  Unapproved Batch Warning
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
                  {unapprovedBatchAssets.length} of {selectedAssetIds.length} selected device(s) are from batches that have not been approved by the Org Admin.
                  This means pricing has not been confirmed and pickups for these assets will bypass the standard approval workflow.
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-mono uppercase tracking-wide">
                  You can still proceed, but it's recommended to wait for batch approval first.
                </p>
              </div>
            </motion.div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate(`${basePath}/pickups`)}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-slate-300 dark:hover:bg-white/20 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedAssetIds.length === 0}
              className="flex-1 px-6 py-3 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>Creating...</>
              ) : (
                <>
                  <Truck className="w-4 h-4" />
                  Create Pickup Request ({selectedAssetIds.length} devices)
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default InitiatePickup;
