import { useState, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Laptop,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Package,
  Calendar,
  Cpu,
  HardDrive,
  Monitor,
  AlertTriangle,
  UserPlus,
  UserMinus,
  ArrowRight,
  Edit,
  Save,
  X,
  Image,
  ClipboardCheck,
  Camera,
  MessageSquare,
  Truck,
  MapPin,
  FileText,
  PlayCircle,
  CheckSquare,
  Plus,
  ArrowRightLeft
} from 'lucide-react';
import { Badge, Button, Input, Dropdown, useToast } from '@/components/ui';
import { useAuditStore, useSubmissionStore, useReviewStore, useNotificationStore } from '@/stores';
import { useAuth, useAsset, useAssets, useAssetsByITAdmin, useBatches, useBatchesByITAdmin, useBranches, useBranchesByITAdmin, useSubUsers, usePickupRequests, useUpdateAsset, useUpdateAssetStatus, useAssignAssetToSubUser, useUnassignAsset, useCreateSubUser, useCreateDispute, useCreateBatch, usePortalBasePath } from '@/hooks';
import { format, formatDistanceToNow } from 'date-fns';
import type { AssetStatus, QCImage } from '@/types';
import { getAssetStatusDisplay } from '@/lib/status-display';

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

export function AssetDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { assetId } = useParams<{ assetId: string }>();

  // V3: Use React Query hooks for auth
  const { enterprise, user } = useAuth();
  const enterpriseId = enterprise?.id || '';
  const userId = user?.id || '';

  // Determine context
  const isSuperAdmin = user?.role === 'super_admin' || location.pathname.startsWith('/super');
  const isOrgAdmin = user?.role === 'org_admin' || location.pathname.startsWith('/org-admin');
  const isOpsAdmin = user?.role === 'ops_admin' || location.pathname.startsWith('/ops');

  // Fetch single asset by ID (works for all portal contexts including OPS Admin)
  const { data: directAsset } = useAsset(assetId || '');

  // V3.2: React Query hooks - use different hooks based on role
  const { data: orgAssets = [] } = useAssets(isOrgAdmin ? enterpriseId : '');
  const { data: itAssets = [] } = useAssetsByITAdmin(!isOrgAdmin && !isOpsAdmin ? userId : '');
  const { data: orgBatches = [] } = useBatches(isOrgAdmin ? enterpriseId : '');
  const { data: itBatches = [] } = useBatchesByITAdmin(!isOrgAdmin && !isOpsAdmin ? userId : '');
  const { data: subUsers = [] } = useSubUsers(enterpriseId);

  // Branches for transfer
  const { data: orgBranches = [] } = useBranches(isOrgAdmin ? enterpriseId : '');
  const { data: itBranches = [] } = useBranchesByITAdmin(!isOrgAdmin && !isOpsAdmin ? userId : '');
  const availableBranches = (isOrgAdmin ? orgBranches : itBranches).filter((b: { status: string }) => b.status === 'active');

  const assets = isOrgAdmin ? orgAssets : itAssets;
  const batches = isOrgAdmin ? orgBatches : itBatches;

  // Mutations
  const updateAssetMutation = useUpdateAsset();
  const updateStatusMutation = useUpdateAssetStatus();
  const assignMutation = useAssignAssetToSubUser();
  const unassignMutation = useUnassignAsset();
  const createSubUserMutation = useCreateSubUser();
  const createDisputeMutation = useCreateDispute();
  const createBatchMutation = useCreateBatch();

  // Stores still needed for audit, submissions, reviews
  const { getByEntity } = useAuditStore();
  // V3: Use React Query hook for pickup requests
  const { data: pickupRequests = [] } = usePickupRequests(enterpriseId);
  const { submissions } = useSubmissionStore();
  const { remoteReviews, facilityQCs } = useReviewStore();
  const { addNotification } = useNotificationStore();
  const { addToast } = useToast();

  // Determine navigation based on user role and current path
  const isLogisticsAdmin = user?.role === 'logistics_admin';
  const portalBase = usePortalBasePath();
  const basePath = isSuperAdmin ? '/super' : isOpsAdmin ? '/ops' : isOrgAdmin ? '/org-admin' : '/admin';
  const assetsListPath = isSuperAdmin ? '/super/enterprise-assets' : isLogisticsAdmin ? `${portalBase}` : `${basePath}/assets`;

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showBatchSelectModal, setShowBatchSelectModal] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [isAddingToBatch, setIsAddingToBatch] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeType, setDisputeType] = useState('condition_dispute');
  const [showNewBatchForm, setShowNewBatchForm] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);
  const [selectedSubUserId, setSelectedSubUserId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [isUnassigning, setIsUnassigning] = useState(false);
  const [isDisputing, setIsDisputing] = useState(false);
  const [assignMode, setAssignMode] = useState<'self' | 'select' | 'create'>('self');
  const [newUserForm, setNewUserForm] = useState({ name: '', email: '', phone: '', department: '' });
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferBranchId, setTransferBranchId] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    brand: '',
    model: '',
    processor: '',
    ram: '',
    storage: '',
    screenSize: '',
    os: '',
    gpu: '',
  });

  // Sub-users are already filtered by enterpriseId from the hook
  const enterpriseSubUsers = subUsers;

  // Find asset from React Query data (using snake_case from database)
  // Use direct fetch as primary for OPS Admin, fallback to list-based lookup for IT/Org Admin
  const asset = assets.find(a => a.id === assetId) || directAsset || null;
  const batch = asset?.batch_id ? batches.find(b => b.id === asset.batch_id) : null;

  // Resolve assigned user from sub-users list or current user (for self-assignment)
  const assignedUser = useMemo(() => {
    if (!asset?.assigned_to_user_id) return null;
    const fromSubUsers = subUsers.find((u: { id: string }) => u.id === asset.assigned_to_user_id);
    if (fromSubUsers) return { name: fromSubUsers.name, email: fromSubUsers.email };
    if (user && user.id === asset.assigned_to_user_id) return { name: user.name || user.email, email: user.email };
    return null;
  }, [asset?.assigned_to_user_id, subUsers, user]);

  // Build comprehensive timeline from all sources
  // IMPORTANT: This useMemo must be called before any early return to maintain
  // consistent hook ordering across renders (React Rules of Hooks)
  const timeline = useMemo(() => {
    if (!asset) return [];

    const events: Array<{
      type: string;
      status: string;
      date: Date;
      description: string;
      icon?: any;
      metadata?: any;
    }> = [];

    // Add creation event (use snake_case from database)
    events.push({
      type: 'created',
      status: 'Asset Created',
      date: new Date(asset.created_at || Date.now()),
      description: 'Asset added to inventory',
      icon: Package,
    });

    // Add audit events
    const auditEvents = getByEntity('asset', asset.id);
    auditEvents.forEach(event => {
      events.push({
        type: event.action,
        status: event.toStatus ? `Status: ${event.toStatus}` : event.action,
        date: event.createdAt,
        description: event.metadata?.reason || `${event.action} - ${event.fromStatus || ''} → ${event.toStatus || ''}`,
        metadata: event.metadata,
      });
    });

    // Add assignment event (use snake_case from database)
    if (asset.assigned_to_user_id && asset.assigned_at) {
      events.push({
        type: 'assigned',
        status: 'Assigned to User',
        date: new Date(asset.assigned_at),
        description: `Assigned to ${assignedUser?.name || assignedUser?.email || 'user'}`,
        icon: UserPlus,
      });
    }

    // Add submission event
    const submission = submissions.find(s => s.assetId === asset.id);
    if (submission) {
      events.push({
        type: 'submitted',
        status: 'Device Submitted',
        date: submission.submittedAt,
        description: 'Sub-user completed device evaluation and submitted details',
        icon: FileText,
        metadata: { submissionId: submission.id },
      });
    }

    // Add remote review event
    const review = remoteReviews.find(r => r.assetId === asset.id);
    if (review) {
      events.push({
        type: 'remote_review',
        status: review.decision === 'conditionally_accepted' ? 'Remote Review: Accepted' : 'Remote Review: Rejected',
        date: review.reviewedAt,
        description: review.notes || review.reason || `Reviewed by reviewer - ${review.decision}`,
        icon: ClipboardCheck,
        metadata: review,
      });
    }

    // Add pickup events (V3: Use snake_case field names from database)
    const assetPickups = pickupRequests.filter(pr =>
      pr.asset_ids?.includes(asset.id)
    );
    assetPickups.forEach(pickup => {
      events.push({
        type: 'pickup_requested',
        status: 'Pickup Requested',
        date: new Date(pickup.created_at || Date.now()),
        description: `Pickup request created for ${pickup.asset_ids?.length || 0} asset(s)`,
        icon: Truck,
        metadata: { pickupId: pickup.id },
      });

      if (pickup.scheduled_date) {
        events.push({
          type: 'pickup_scheduled',
          status: 'Pickup Scheduled',
          date: new Date(pickup.assigned_at || pickup.created_at || Date.now()),
          description: `Scheduled for ${format(new Date(pickup.scheduled_date), 'MMM d, yyyy')} - ${pickup.preferred_time_slot || 'TBD'}`,
          icon: Calendar,
          metadata: { pickupId: pickup.id },
        });
      }

      if (pickup.completed_at) {
        // V3: Access location via joined relation
        const locationName = pickup.pickup_locations?.name || 'location';
        events.push({
          type: 'picked_up',
          status: 'Picked Up',
          date: new Date(pickup.completed_at),
          description: `Collected from ${locationName}`,
          icon: CheckSquare,
          metadata: { pickupId: pickup.id },
        });
      }
    });

    // Add facility QC event
    const facilityQC = facilityQCs.find(qc => qc.assetId === asset.id);
    if (facilityQC) {
      events.push({
        type: 'facility_qc',
        status: facilityQC.decision === 'final_accept' ? 'QC: Accepted' : 'QC: Rejected',
        date: facilityQC.completedAt,
        description: `Physical QC completed - Grade: ${facilityQC.grade || 'N/A'}`,
        icon: ClipboardCheck,
        metadata: facilityQC,
      });
    }

    // Sort by date descending (newest first)
    // Handle both Date objects and string timestamps from database
    return events.sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date : new Date(a.date);
      const dateB = b.date instanceof Date ? b.date : new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
  }, [asset, getByEntity, assignedUser, submissions, remoteReviews, pickupRequests, facilityQCs]);

  if (!asset) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] border border-white/10 bg-slate-50 dark:bg-white/[0.02]">
        <Laptop className="w-12 h-12 text-zinc-700 mb-4" />
        <p className="font-display font-bold text-zinc-500 uppercase tracking-wide mb-1">Asset not found</p>
        <p className="font-mono text-xs text-slate-500 dark:text-white/50 mb-6">The asset you're looking for doesn't exist</p>
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

  // V3: Use centralized status display
  const statusConfig = getAssetStatusDisplay(asset.status as any);

  // Handle assignment using React Query mutation
  const handleAssign = async () => {
    if (!asset || !enterprise) return;

    setIsAssigning(true);
    try {
      // Handle self-assignment
      if (assignMode === 'self') {
        if (!user?.id) {
          addToast({ type: 'error', title: 'Authentication Error', message: 'User not authenticated. Please login again.' });
          setIsAssigning(false);
          return;
        }

        // Update asset with self-assignment fields
        await updateAssetMutation.mutateAsync({
          assetId: asset.id,
          updates: {
            assigned_to_user_id: user.id,
            status: 'assigned' as any,
          },
        });

        addToast({
          type: 'success',
          title: 'Asset Self-Assigned',
          message: 'The asset has been assigned to you and will appear in My Evaluations.',
        });
        addNotification({
          recipientType: 'user',
          recipientId: user.id,
          channel: 'in_app',
          type: 'asset_assigned',
          title: 'Asset Self-Assigned',
          message: `${asset.brand} ${asset.model} (${asset.serial_number}) has been assigned to you.`,
        });
        setShowAssignModal(false);
        setAssignMode('self');
        return;
      }

      let userIdToAssign = selectedSubUserId;

      // If in create mode, create the new user first
      if (assignMode === 'create') {
        if (!newUserForm.email.trim() || !newUserForm.name.trim()) {
          addToast({ type: 'error', title: 'Validation Error', message: 'Name and email are required.' });
          setIsAssigning(false);
          return;
        }

        const newUser = await createSubUserMutation.mutateAsync({
          enterprise_id: enterprise.id,
          branch_id: asset.branch_id || undefined,
          name: newUserForm.name.trim(),
          email: newUserForm.email.trim(),
          phone: newUserForm.phone.trim() || undefined,
          department: newUserForm.department.trim() || undefined,
        });

        userIdToAssign = newUser?.id || '';
      }

      // Assign the asset to the user (existing or newly created)
      if (!userIdToAssign) {
        addToast({ type: 'error', title: 'Assignment Failed', message: 'Could not identify the user to assign. Please try again.' });
        setIsAssigning(false);
        return;
      }

      await assignMutation.mutateAsync({ assetId: asset.id, subUserId: userIdToAssign });
      addToast({
        type: 'success',
        title: assignMode === 'create' ? 'User Created & Asset Assigned' : 'Asset Assigned',
        message: 'The asset has been successfully assigned to the user.',
      });
      addNotification({
        recipientType: 'user',
        recipientId: user?.id || '',
        channel: 'in_app',
        type: 'asset_assigned',
        title: 'Asset Assigned',
        message: `${asset.brand} ${asset.model} (${asset.serial_number}) has been assigned successfully.`,
      });
      setShowAssignModal(false);
      setSelectedSubUserId('');
      setNewUserForm({ name: '', email: '', phone: '', department: '' });
      setAssignMode('self');
    } catch (error) {
      console.error('Failed to assign asset:', error);
      addToast({
        type: 'error',
        title: 'Assignment Failed',
        message: 'Could not assign the asset. Please try again.',
      });
    } finally {
      setIsAssigning(false);
    }
  };

  // Handle unassign using React Query mutation
  const handleUnassign = async () => {
    if (!asset) return;
    setIsUnassigning(true);
    try {
      await unassignMutation.mutateAsync(asset.id);
      addToast({
        type: 'success',
        title: 'Asset Unassigned',
        message: 'The asset has been unassigned from the user.',
      });
      addNotification({
        recipientType: 'user',
        recipientId: user?.id || '',
        channel: 'in_app',
        type: 'asset_assigned',
        title: 'Asset Unassigned',
        message: `${asset.brand} ${asset.model} (${asset.serial_number}) has been unassigned.`,
      });
    } catch (error) {
      console.error('Failed to unassign asset:', error);
      addToast({
        type: 'error',
        title: 'Unassignment Failed',
        message: 'Could not unassign the asset. Please try again.',
      });
    } finally {
      setIsUnassigning(false);
    }
  };

  // Handle dispute using React Query mutation
  const handleDispute = async () => {
    if (!asset || !disputeReason.trim() || !user) return;
    setIsDisputing(true);
    try {
      // Create dispute record in database (this also updates asset status to 'disputed')
      await createDisputeMutation.mutateAsync({
        asset_id: asset.id,
        raised_by: user.id,
        reason: disputeType,
        description: disputeReason.trim(),
      });

      addToast({
        type: 'success',
        title: 'Dispute Submitted',
        message: 'Your dispute has been submitted for review.',
      });
      addNotification({
        recipientType: 'user',
        recipientId: user.id,
        channel: 'in_app',
        type: 'dispute_submitted',
        title: 'Dispute Submitted',
        message: `Dispute for ${asset.brand} ${asset.model} has been submitted and is under review.`,
      });
      setShowDisputeModal(false);
      setDisputeReason('');
    } catch (error) {
      console.error('Failed to dispute asset:', error);
      addToast({
        type: 'error',
        title: 'Dispute Failed',
        message: 'Could not submit the dispute. Please try again.',
      });
    } finally {
      setIsDisputing(false);
    }
  };

  // Initialize edit form when entering edit mode
  const startEditing = () => {
    if (!asset) return;
    const specs = asset.specs as Record<string, string> | undefined;
    setEditForm({
      brand: asset.brand || '',
      model: asset.model || '',
      processor: specs?.processor || '',
      ram: specs?.ram || '',
      storage: specs?.storage || '',
      screenSize: specs?.screenSize || specs?.screen_size || '',
      os: specs?.os || '',
      gpu: specs?.gpu || '',
    });
    setIsEditing(true);
  };

  // Save edit changes using React Query mutation
  const handleSaveEdit = async () => {
    if (!asset) return;
    try {
      await updateAssetMutation.mutateAsync({
        assetId: asset.id,
        updates: {
          brand: editForm.brand,
          model: editForm.model,
          specs: {
            processor: editForm.processor || undefined,
            ram: editForm.ram || undefined,
            storage: editForm.storage || undefined,
            screenSize: editForm.screenSize || undefined,
            os: editForm.os || undefined,
            gpu: editForm.gpu || undefined,
          },
        },
      });
      addToast({
        type: 'success',
        title: 'Asset Updated',
        message: 'Asset details have been updated successfully.',
      });
      addNotification({
        recipientType: 'user',
        recipientId: user?.id || '',
        channel: 'in_app',
        type: 'asset_assigned',
        title: 'Asset Updated',
        message: `${editForm.brand} ${editForm.model} details have been updated.`,
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update asset:', error);
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: 'Could not update the asset. Please try again.',
      });
    }
  };

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
              <div className="w-16 h-16 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] flex items-center justify-center">
                <Laptop className="w-8 h-8 text-slate-500 dark:text-white/50" />
              </div>
              <div>
                <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-1">Asset</span>
                <h1 className="font-brand font-bold text-2xl md:text-3xl text-slate-900 dark:text-white uppercase tracking-tight">
                  {asset.brand} {asset.model}
                </h1>
                <p className="font-mono text-sm text-slate-500 dark:text-white/50 mt-1">{asset.serial_number}</p>
                {batch && (
                  <p className="font-display text-xs text-slate-500 dark:text-white/50 mt-2 uppercase tracking-wide">
                    Batch: {batch.name}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              {!isEditing && (
                <button
                  onClick={startEditing}
                  className="interactive px-5 py-2.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white/5 transition-all flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
              )}
              {isEditing && (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="interactive px-5 py-2.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white/5 transition-all flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="interactive px-5 py-2.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                </>
              )}
              {asset.status === 'pending_assignment' && !isEditing && (
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="interactive px-5 py-2.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Assign
                </button>
              )}
              {!isEditing && ['pending_assignment', 'assigned', 'check_in_started', 'submitted', 'remote_review', 'conditionally_accepted', 'ready_for_pickup'].includes(asset.status) && (
                <button
                  onClick={() => setShowBatchSelectModal(true)}
                  className="interactive px-5 py-2.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono font-bold text-xs uppercase tracking-widest hover:bg-blue-500/20 transition-all flex items-center gap-2"
                >
                  <Package className="w-4 h-4" />
                  {asset.batch_id ? 'Change Batch' : 'Add to Batch'}
                </button>
              )}
              {!isEditing && ['pending_assignment', 'assigned'].includes(asset.status) && availableBranches.length > 1 && (
                <button
                  onClick={() => { setTransferBranchId(''); setShowTransferModal(true); }}
                  className="interactive px-5 py-2.5 bg-purple-500/10 border border-purple-500/30 text-purple-400 font-mono font-bold text-xs uppercase tracking-widest hover:bg-purple-500/20 transition-all flex items-center gap-2"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  Transfer Branch
                </button>
              )}
              {['remote_rejected', 'final_rejected'].includes(asset.status) && !isEditing && (
                <button
                  onClick={() => setShowDisputeModal(true)}
                  className="interactive px-5 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 font-mono font-bold text-xs uppercase tracking-widest hover:bg-red-500/20 transition-all flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Dispute
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Status Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-6 flex items-center gap-6 shadow-sm shadow-slate-900/[0.03] dark:shadow-none"
      >
        <Badge variant={statusConfig.variant} size="lg">
          {statusConfig.label}
        </Badge>
        <p className="font-display text-sm text-slate-700 dark:text-white/60">
          {asset.status === 'assigned' && assignedUser
            ? `Assigned to ${assignedUser.name || assignedUser.email} for check-in`
            : statusConfig.description}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Device Info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 shadow-sm shadow-slate-900/[0.03] dark:shadow-none"
          >
            <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center gap-3">
              <Laptop className="w-5 h-5 text-ecotribe-primary" />
              <h2 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide">Device Information</h2>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {isEditing ? (
                <>
                  <div>
                    <label className="font-mono font-bold text-[10px] text-slate-600 dark:text-white/50 uppercase tracking-widest mb-2 block">Brand</label>
                    <input
                      type="text"
                      value={editForm.brand}
                      onChange={(e) => setEditForm(prev => ({ ...prev, brand: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-display text-sm focus:outline-none focus:border-ecotribe-primary/50"
                    />
                  </div>
                  <div>
                    <label className="font-mono font-bold text-[10px] text-slate-600 dark:text-white/50 uppercase tracking-widest mb-2 block">Model</label>
                    <input
                      type="text"
                      value={editForm.model}
                      onChange={(e) => setEditForm(prev => ({ ...prev, model: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-display text-sm focus:outline-none focus:border-ecotribe-primary/50"
                    />
                  </div>
                </>
              ) : (
                <>
                  <InfoRow label="Brand" value={asset.brand || ''} />
                  <InfoRow label="Model" value={asset.model || ''} />
                </>
              )}
              <InfoRow label="Serial Number" value={asset.serial_number || ''} mono />
              <InfoRow
                label="Purchase Date"
                value={asset.purchase_date ? format(new Date(asset.purchase_date), 'MMM d, yyyy') : '—'}
              />
            </div>
          </motion.div>

          {/* Specifications */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 shadow-sm shadow-slate-900/[0.03] dark:shadow-none"
          >
            <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center gap-3">
              <Cpu className="w-5 h-5 text-slate-500 dark:text-white/50" />
              <h2 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide">Specifications</h2>
            </div>
            <div className="p-6">
              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-mono font-bold text-[10px] text-slate-600 dark:text-white/50 uppercase tracking-widest mb-2 block">Processor</label>
                    <input
                      type="text"
                      value={editForm.processor}
                      onChange={(e) => setEditForm(prev => ({ ...prev, processor: e.target.value }))}
                      placeholder="e.g., Intel Core i7-12700H"
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-display text-sm focus:outline-none focus:border-ecotribe-primary/50 placeholder:text-slate-400 dark:placeholder:text-white/30"
                    />
                  </div>
                  <div>
                    <label className="font-mono font-bold text-[10px] text-slate-600 dark:text-white/50 uppercase tracking-widest mb-2 block">RAM</label>
                    <input
                      type="text"
                      value={editForm.ram}
                      onChange={(e) => setEditForm(prev => ({ ...prev, ram: e.target.value }))}
                      placeholder="e.g., 16GB"
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-display text-sm focus:outline-none focus:border-ecotribe-primary/50 placeholder:text-slate-400 dark:placeholder:text-white/30"
                    />
                  </div>
                  <div>
                    <label className="font-mono font-bold text-[10px] text-slate-600 dark:text-white/50 uppercase tracking-widest mb-2 block">Storage</label>
                    <input
                      type="text"
                      value={editForm.storage}
                      onChange={(e) => setEditForm(prev => ({ ...prev, storage: e.target.value }))}
                      placeholder="e.g., 512GB SSD"
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-display text-sm focus:outline-none focus:border-ecotribe-primary/50 placeholder:text-slate-400 dark:placeholder:text-white/30"
                    />
                  </div>
                  <div>
                    <label className="font-mono font-bold text-[10px] text-slate-600 dark:text-white/50 uppercase tracking-widest mb-2 block">Screen Size</label>
                    <input
                      type="text"
                      value={editForm.screenSize}
                      onChange={(e) => setEditForm(prev => ({ ...prev, screenSize: e.target.value }))}
                      placeholder="e.g., 15.6 inch"
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-display text-sm focus:outline-none focus:border-ecotribe-primary/50 placeholder:text-slate-400 dark:placeholder:text-white/30"
                    />
                  </div>
                  <div>
                    <label className="font-mono font-bold text-[10px] text-slate-600 dark:text-white/50 uppercase tracking-widest mb-2 block">Operating System</label>
                    <input
                      type="text"
                      value={editForm.os}
                      onChange={(e) => setEditForm(prev => ({ ...prev, os: e.target.value }))}
                      placeholder="e.g., Windows 11 Pro"
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-display text-sm focus:outline-none focus:border-ecotribe-primary/50 placeholder:text-slate-400 dark:placeholder:text-white/30"
                    />
                  </div>
                  <div>
                    <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2 block">GPU</label>
                    <input
                      type="text"
                      value={editForm.gpu}
                      onChange={(e) => setEditForm(prev => ({ ...prev, gpu: e.target.value }))}
                      placeholder="e.g., NVIDIA GeForce RTX 3060"
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-display text-sm focus:outline-none focus:border-ecotribe-primary/50 placeholder:text-slate-400 dark:placeholder:text-white/30"
                    />
                  </div>
                </div>
              ) : asset.specs && Object.keys(asset.specs as object).length > 0 ? (
                (() => {
                  const specs = asset.specs as Record<string, string>;
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {specs.processor && (
                        <SpecRow icon={<Cpu className="w-4 h-4" />} label="Processor" value={specs.processor} />
                      )}
                      {specs.ram && (
                        <SpecRow icon={<HardDrive className="w-4 h-4" />} label="RAM" value={specs.ram} />
                      )}
                      {specs.storage && (
                        <SpecRow icon={<HardDrive className="w-4 h-4" />} label="Storage" value={specs.storage} />
                      )}
                      {(specs.screenSize || specs.screen_size) && (
                        <SpecRow icon={<Monitor className="w-4 h-4" />} label="Screen" value={specs.screenSize || specs.screen_size} />
                      )}
                      {specs.os && (
                        <SpecRow icon={<Laptop className="w-4 h-4" />} label="OS" value={specs.os} />
                      )}
                      {specs.gpu && (
                        <SpecRow icon={<Monitor className="w-4 h-4" />} label="GPU" value={specs.gpu} />
                      )}
                    </div>
                  );
                })()
              ) : (
                <p className="font-display text-slate-500 dark:text-white/50 text-sm text-center py-6">
                  No specifications provided
                </p>
              )}
            </div>
          </motion.div>

          {/* Valuation — only visible to Org Admin, OPS Admin, Super Admin */}
          {(isOpsAdmin || isSuperAdmin || isOrgAdmin) && (asset.base_price || asset.final_price) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="border border-white/10 bg-slate-50 dark:bg-white/[0.02]"
            >
              <div className="p-6 border-b border-slate-200 dark:border-white/10">
                <h2 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide">Valuation</h2>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                {asset.base_price && (
                  <div className="p-5 border border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                    <p className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2">Base Price</p>
                    <p className="font-brand font-bold text-3xl text-slate-900 dark:text-white">
                      ₹{Number(asset.base_price).toLocaleString()}
                    </p>
                    {asset.grade && (
                      <p className="font-mono text-xs text-slate-500 dark:text-white/50 mt-2">
                        Grade: {asset.grade}
                      </p>
                    )}
                  </div>
                )}
                {asset.final_price && (
                  <div className="p-5 border border-ecotribe-primary/30 bg-ecotribe-primary/5">
                    <p className="font-mono font-bold text-[10px] text-ecotribe-primary/60 uppercase tracking-widest mb-2">Final Price</p>
                    <p className="font-brand font-bold text-3xl text-ecotribe-primary">
                      ₹{Number(asset.final_price).toLocaleString()}
                    </p>
                    {asset.condition_grade && (
                      <p className="font-mono text-xs text-zinc-500 mt-2">
                        Condition: {asset.condition_grade}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* QC Report - Shown for accepted/reviewed assets
              Note: qc_report exists as a JSON column on the backend model but is not yet
              included in the API response schema. This section will render when added. */}
          {(asset as any).qc_report && ['conditionally_accepted', 'final_accepted', 'payout_pending', 'completed'].includes(asset.status) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="border border-emerald-500/20 bg-emerald-500/5"
            >
              <div className="p-6 border-b border-emerald-500/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ClipboardCheck className="w-5 h-5 text-emerald-400" />
                  <h2 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide">QC Report</h2>
                </div>
                {(asset as any).qc_report.grade && (
                  <div className="px-4 py-2 border border-emerald-400/30 bg-emerald-400/10">
                    <p className="font-mono font-bold text-xs text-emerald-400 uppercase tracking-widest">
                      Grade: {(asset as any).qc_report.grade}
                    </p>
                  </div>
                )}
              </div>

              {/* QC Checklist */}
              {(asset as any).qc_report.checklist && (asset as any).qc_report.checklist.length > 0 && (
                <div className="p-6 border-b border-emerald-500/10">
                  <h3 className="font-mono font-bold text-xs text-zinc-500 uppercase tracking-widest mb-4">Inspection Checklist</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(asset as any).qc_report.checklist.map((item: any) => (
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
                          <p className={`font-display text-sm ${item.passed ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                            {item.label}
                          </p>
                          {item.notes && (
                            <p className="font-mono text-xs text-zinc-500 mt-0.5">{item.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* QC Images */}
              {(asset as any).qc_report.images && (asset as any).qc_report.images.length > 0 && (
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Camera className="w-4 h-4 text-zinc-500" />
                    <h3 className="font-mono font-bold text-xs text-zinc-500 uppercase tracking-widest">QC Photos</h3>
                    <span className="text-xs text-slate-500 dark:text-white/50">({(asset as any).qc_report.images.length})</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(asset as any).qc_report.images.map((image: any) => (
                      <div
                        key={image.id}
                        className="relative aspect-square border border-white/10 bg-slate-50 dark:bg-white/[0.02] overflow-hidden group cursor-pointer"
                      >
                        <img
                          src={image.url}
                          alt={IMAGE_TYPE_LABELS[image.type as keyof typeof IMAGE_TYPE_LABELS]}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="absolute bottom-0 left-0 right-0 p-2">
                            <p className="font-mono font-bold text-[10px] text-white uppercase tracking-widest">
                              {IMAGE_TYPE_LABELS[image.type as keyof typeof IMAGE_TYPE_LABELS]}
                            </p>
                            {image.caption && (
                              <p className="font-mono text-[10px] text-zinc-400 truncate">{image.caption}</p>
                            )}
                          </div>
                        </div>
                        <div className="absolute top-2 left-2">
                          <span className="px-2 py-0.5 bg-black/60 font-mono text-[9px] text-white uppercase tracking-widest">
                            {IMAGE_TYPE_LABELS[image.type as keyof typeof IMAGE_TYPE_LABELS]}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* QC Notes */}
              {(asset as any).qc_report.notes && (
                <div className="p-6 border-t border-emerald-500/10">
                  <h3 className="font-mono font-bold text-xs text-zinc-500 uppercase tracking-widest mb-2">Reviewer Notes</h3>
                  <p className="font-display text-sm text-zinc-400">{(asset as any).qc_report.notes}</p>
                </div>
              )}

              {/* QC Meta */}
              <div className="p-6 border-t border-emerald-500/10 flex items-center justify-between text-xs">
                {(asset as any).qc_report.reviewer && (
                  <span className="font-mono text-slate-500 dark:text-white/50">
                    Reviewed by: <span className="text-zinc-400">{(asset as any).qc_report.reviewer}</span>
                  </span>
                )}
                {(asset as any).qc_report.completedAt && (
                  <span className="font-mono text-slate-500 dark:text-white/50">
                    {format(new Date((asset as any).qc_report.completedAt), 'MMM d, yyyy h:mm a')}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Column - Timeline & Meta */}
        <div className="space-y-6">
          {/* Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 shadow-sm shadow-slate-900/[0.03] dark:shadow-none"
          >
            <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center gap-3 bg-white/70 dark:bg-transparent">
              <Clock className="w-5 h-5 text-slate-600 dark:text-zinc-500" />
              <h2 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide">Activity</h2>
            </div>
            <div className="p-6">
              {timeline.length > 0 ? (
                <div className="space-y-4">
                  {timeline.map((event, index) => {
                    const Icon = event.icon || Clock;
                    return (
                      <div key={index} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] flex items-center justify-center">
                            <Icon className="w-4 h-4 text-ecotribe-primary" />
                          </div>
                          {index < timeline.length - 1 && (
                            <div className="w-px flex-1 bg-slate-200 dark:bg-white/10 mt-2" />
                          )}
                        </div>
                        <div className="flex-1 pb-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <p className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase">{event.status}</p>
                              <p className="font-mono text-xs text-slate-600 dark:text-white/60 mt-1">{event.description}</p>
                              {/* Pickup ID hidden for cleaner UX */}
                            </div>
                            <p className="font-mono text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-widest whitespace-nowrap">
                              {formatDistanceToNow(event.date, { addSuffix: true })}
                            </p>
                          </div>
                          <p className="font-mono text-[10px] text-slate-400 dark:text-zinc-600 mt-1">
                            {format(event.date, 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-slate-400 dark:text-zinc-700 mx-auto mb-3" />
                  <p className="font-display text-sm text-slate-500 dark:text-zinc-600">No activity yet</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Assignment Info */}
          {asset.assigned_to_user_id && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 shadow-sm shadow-slate-900/[0.03] dark:shadow-none"
            >
              <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-white/70 dark:bg-transparent">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-slate-600 dark:text-zinc-500" />
                  <h2 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide">Assignment</h2>
                </div>
                {['assigned'].includes(asset.status) && (
                  <button
                    onClick={handleUnassign}
                    disabled={isUnassigning}
                    className="interactive px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 font-mono font-bold text-[10px] uppercase tracking-widest hover:bg-red-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <UserMinus className="w-3 h-3" />
                    {isUnassigning ? 'Unassigning...' : 'Unassign'}
                  </button>
                )}
              </div>
              <div className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 flex items-center justify-center">
                    <User className="w-6 h-6 text-slate-600 dark:text-zinc-500" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase">
                      {assignedUser?.name || 'Assigned User'}
                    </p>
                    <p className="font-mono text-xs text-slate-500 dark:text-white/50">
                      {assignedUser?.email || 'No email available'}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Quick Info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="border border-slate-200 dark:border-white/10 bg-white/85 dark:bg-white/[0.02] p-6 shadow-sm"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-slate-600 dark:text-white/60 uppercase tracking-widest">Created</span>
                <span className="font-display text-sm text-slate-700 dark:text-zinc-400">
                  {asset.created_at ? format(new Date(asset.created_at), 'MMM d, yyyy') : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-slate-600 dark:text-white/60 uppercase tracking-widest">Updated</span>
                <span className="font-display text-sm text-slate-700 dark:text-zinc-400">
                  {asset.updated_at ? format(new Date(asset.updated_at), 'MMM d, yyyy') : '—'}
                </span>
              </div>
              {/* Asset ID hidden for cleaner UX */}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Assignment Modal */}
      {/* Add to Batch Modal */}
      {showBatchSelectModal && asset && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a]"
          >
            <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <h3 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide">Add to Batch</h3>
              <button
                onClick={() => { setShowBatchSelectModal(false); setSelectedBatchId(''); setShowNewBatchForm(false); setNewBatchName(''); }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="font-display text-sm text-slate-600 dark:text-white/60">
                Select a draft batch to add <span className="font-bold text-slate-900 dark:text-white">{asset.brand} {asset.model}</span> to:
              </p>

              {(() => {
                const eligibleBatches = batches.filter((b: any) =>
                  b.status === 'draft' && b.branch_id === asset.branch_id
                );

                return (
                  <div className="space-y-3">
                    {eligibleBatches.length > 0 && (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {eligibleBatches.map((b: any) => (
                          <button
                            key={b.id}
                            onClick={() => { setSelectedBatchId(b.id); setShowNewBatchForm(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 border transition-all text-left ${
                              selectedBatchId === b.id && !showNewBatchForm
                                ? 'border-ecotribe-primary bg-ecotribe-primary/10'
                                : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/20'
                            }`}
                          >
                            <Package className={`w-5 h-5 ${selectedBatchId === b.id && !showNewBatchForm ? 'text-ecotribe-primary' : 'text-zinc-400'}`} />
                            <div className="flex-1 min-w-0">
                              <p className={`font-display font-bold text-sm truncate ${selectedBatchId === b.id && !showNewBatchForm ? 'text-ecotribe-primary' : 'text-slate-900 dark:text-white'}`}>
                                {b.name}
                              </p>
                              <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-wide">
                                {b.asset_count || 0} assets
                              </p>
                            </div>
                            {selectedBatchId === b.id && !showNewBatchForm && <CheckCircle className="w-4 h-4 text-ecotribe-primary" />}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="border-t border-slate-200 dark:border-white/10 pt-3">
                      {!showNewBatchForm ? (
                        <button
                          onClick={() => { setShowNewBatchForm(true); setSelectedBatchId(''); }}
                          className="w-full flex items-center gap-3 px-4 py-3 border border-dashed border-slate-300 dark:border-white/20 hover:border-ecotribe-primary/50 hover:bg-ecotribe-primary/5 transition-all text-left"
                        >
                          <Plus className="w-5 h-5 text-ecotribe-primary" />
                          <div className="flex-1 min-w-0">
                            <p className="font-display font-bold text-sm text-ecotribe-primary">Create New Batch</p>
                            <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-wide">Add a new draft batch for this branch</p>
                          </div>
                        </button>
                      ) : (
                        <div className="space-y-3 p-4 border border-ecotribe-primary/30 bg-ecotribe-primary/5">
                          <p className="font-mono font-bold text-[10px] text-ecotribe-primary uppercase tracking-widest">New Batch</p>
                          <input
                            type="text"
                            value={newBatchName}
                            onChange={(e) => setNewBatchName(e.target.value)}
                            placeholder="Batch name (e.g. Q1 2026 Laptops)"
                            className="w-full px-4 py-2.5 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 placeholder:text-slate-400 dark:placeholder:text-white/30"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setShowNewBatchForm(false); setNewBatchName(''); }}
                              className="px-3 py-1.5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 font-mono text-xs uppercase tracking-wide hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={async () => {
                                if (!newBatchName.trim() || !enterprise) return;
                                setIsCreatingBatch(true);
                                try {
                                  const newBatch = await createBatchMutation.mutateAsync({
                                    name: newBatchName.trim(),
                                    enterprise_id: enterprise.id,
                                    branch_id: asset.branch_id || '',
                                  });
                                  if (newBatch) {
                                    setSelectedBatchId(newBatch.id);
                                  }
                                  setShowNewBatchForm(false);
                                  setNewBatchName('');
                                  addToast({ type: 'success', title: 'Batch Created', message: `"${newBatchName.trim()}" created successfully` });
                                } catch (error) {
                                  addToast({ type: 'error', title: 'Error', message: 'Failed to create batch' });
                                } finally {
                                  setIsCreatingBatch(false);
                                }
                              }}
                              disabled={!newBatchName.trim() || isCreatingBatch}
                              className="px-3 py-1.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-wide hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                              {isCreatingBatch ? 'Creating...' : 'Create'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-white/10 flex gap-3">
              <button
                onClick={() => { setShowBatchSelectModal(false); setSelectedBatchId(''); setShowNewBatchForm(false); setNewBatchName(''); }}
                className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!selectedBatchId) return;
                  setIsAddingToBatch(true);
                  try {
                    await updateAssetMutation.mutateAsync({
                      assetId: asset.id,
                      updates: { batch_id: selectedBatchId } as any,
                    });
                    addToast({ type: 'success', title: 'Added to Batch', message: `Asset added to batch successfully` });
                    setShowBatchSelectModal(false);
                    setSelectedBatchId('');
                  } catch (error) {
                    addToast({ type: 'error', title: 'Error', message: 'Failed to add asset to batch' });
                  } finally {
                    setIsAddingToBatch(false);
                  }
                }}
                disabled={!selectedBatchId || isAddingToBatch}
                className="flex-1 px-4 py-2.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isAddingToBatch ? 'Adding...' : 'Add to Batch'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showAssignModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a]"
          >
            <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <h3 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide">Assign Asset</h3>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setAssignMode('self');
                  setNewUserForm({ name: '', email: '', phone: '', department: '' });
                }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            {/* Mode Toggle */}
            <div className="p-6 pb-0">
              <div className="flex gap-1 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-1">
                <button
                  onClick={() => setAssignMode('self')}
                  className={`flex-1 px-3 py-2 font-mono font-bold text-xs uppercase tracking-widest transition-all ${
                    assignMode === 'self'
                      ? 'bg-ecotribe-primary text-black'
                      : 'text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Self
                </button>
                <button
                  onClick={() => setAssignMode('select')}
                  className={`flex-1 px-3 py-2 font-mono font-bold text-xs uppercase tracking-widest transition-all ${
                    assignMode === 'select'
                      ? 'bg-ecotribe-primary text-black'
                      : 'text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Employee
                </button>
                <button
                  onClick={() => setAssignMode('create')}
                  className={`flex-1 px-3 py-2 font-mono font-bold text-xs uppercase tracking-widest transition-all ${
                    assignMode === 'create'
                      ? 'bg-ecotribe-primary text-black'
                      : 'text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  New User
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {assignMode === 'self' ? (
                <div className="p-4 border border-ecotribe-primary/30 bg-ecotribe-primary/5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 border border-ecotribe-primary/30 bg-ecotribe-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-ecotribe-primary" />
                    </div>
                    <div>
                      <p className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase">Assign to Myself</p>
                      <p className="font-mono text-xs text-slate-500 dark:text-white/50">{user?.email}</p>
                    </div>
                  </div>
                  <p className="font-mono text-xs text-slate-500 dark:text-white/60">
                    This asset will be assigned to you and appear in your "My Evaluations" section where you can complete the device check-in.
                  </p>
                </div>
              ) : assignMode === 'select' ? (
                <>
                  <div>
                    <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2 block">
                      Select Employee
                    </label>
                    {enterpriseSubUsers.length > 0 ? (
                      <select
                        value={selectedSubUserId}
                        onChange={(e) => setSelectedSubUserId(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 appearance-none select-themed cursor-pointer"
                      >
                        <option value="" className="bg-white dark:bg-[#0a0a0a]">Select an employee...</option>
                        {enterpriseSubUsers.map(user => (
                          <option key={user.id} value={user.id} className="bg-white dark:bg-[#0a0a0a]">
                            {user.name || user.email} {user.department ? `(${user.department})` : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-center py-4 border border-white/10 bg-white/[0.02]">
                        <p className="font-display text-zinc-500 text-sm mb-3">No employees found</p>
                        <button
                          onClick={() => setAssignMode('create')}
                          className="text-xs text-ecotribe-primary hover:underline font-mono uppercase tracking-widest"
                        >
                          Create New Employee
                        </button>
                      </div>
                    )}
                  </div>
                  {selectedSubUserId && (
                    <div className="p-4 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                      <p className="font-mono text-xs text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-2">Selected User</p>
                      <p className="font-display text-sm text-slate-900 dark:text-white">
                        {enterpriseSubUsers.find(u => u.id === selectedSubUserId)?.name ||
                         enterpriseSubUsers.find(u => u.id === selectedSubUserId)?.email}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2 block">
                      Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={newUserForm.name}
                      onChange={(e) => setNewUserForm(prev => ({ ...prev, name: e.target.value.replace(/[^a-zA-Z\s'.\-]/g, '') }))}
                      placeholder="Employee name"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 placeholder:text-slate-400 dark:placeholder:text-white/30"
                    />
                  </div>
                  <div>
                    <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2 block">
                      Email <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      value={newUserForm.email}
                      onChange={(e) => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@company.com"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 placeholder:text-slate-400 dark:placeholder:text-white/30"
                    />
                  </div>
                  <div>
                    <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2 block">
                      Phone
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={newUserForm.phone}
                      onChange={(e) => setNewUserForm(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                      maxLength={10}
                      placeholder="9876543210"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 placeholder:text-slate-400 dark:placeholder:text-white/30"
                    />
                  </div>
                  <div>
                    <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2 block">
                      Department <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={newUserForm.department}
                      onChange={(e) => setNewUserForm(prev => ({ ...prev, department: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 appearance-none select-themed cursor-pointer"
                    >
                      <option value="" className="bg-white dark:bg-[#0a0a0a]">Select department</option>
                      <option value="Engineering" className="bg-white dark:bg-[#0a0a0a]">Engineering</option>
                      <option value="Marketing" className="bg-white dark:bg-[#0a0a0a]">Marketing</option>
                      <option value="HR" className="bg-white dark:bg-[#0a0a0a]">HR</option>
                      <option value="Finance" className="bg-white dark:bg-[#0a0a0a]">Finance</option>
                      <option value="Operations" className="bg-white dark:bg-[#0a0a0a]">Operations</option>
                      <option value="Sales" className="bg-white dark:bg-[#0a0a0a]">Sales</option>
                      <option value="IT" className="bg-white dark:bg-[#0a0a0a]">IT</option>
                      <option value="Legal" className="bg-white dark:bg-[#0a0a0a]">Legal</option>
                      <option value="Other" className="bg-white dark:bg-[#0a0a0a]">Other</option>
                    </select>
                  </div>
                </>
              )}
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-white/10 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setAssignMode('self');
                  setNewUserForm({ name: '', email: '', phone: '', department: '' });
                }}
                className="px-5 py-2.5 bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={
                  isAssigning ||
                  (assignMode === 'select' && !selectedSubUserId) ||
                  (assignMode === 'create' && (!newUserForm.name.trim() || !newUserForm.email.trim() || !newUserForm.department))
                }
                className="px-5 py-2.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isAssigning ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    {assignMode === 'self' ? 'Self-Assigning...' : assignMode === 'create' ? 'Creating & Assigning...' : 'Assigning...'}
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    {assignMode === 'self' ? 'Assign to Me' : assignMode === 'create' ? 'Create & Assign' : 'Assign'}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Transfer Branch Modal */}
      {showTransferModal && asset && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a]"
          >
            <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ArrowRightLeft className="w-5 h-5 text-purple-400" />
                <h3 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide">Transfer Branch</h3>
              </div>
              <button
                onClick={() => setShowTransferModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 border border-purple-500/20 bg-purple-500/5">
                <p className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase mb-1">
                  {asset.brand} {asset.model}
                </p>
                <p className="font-mono text-xs text-zinc-500">
                  Current branch: {asset.branch_name || availableBranches.find((b: { id: string }) => b.id === asset.branch_id)?.branch_name || 'Unknown'}
                </p>
              </div>

              <div>
                <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2 block">
                  Transfer to Branch <span className="text-red-400">*</span>
                </label>
                <select
                  value={transferBranchId}
                  onChange={(e) => setTransferBranchId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 appearance-none select-themed cursor-pointer"
                >
                  <option value="" className="bg-white dark:bg-[#0a0a0a]">Select a branch...</option>
                  {availableBranches
                    .filter((b: { id: string }) => b.id !== asset.branch_id)
                    .map((b: { id: string; branch_name: string; branch_code: string }) => (
                      <option key={b.id} value={b.id} className="bg-white dark:bg-[#0a0a0a]">
                        {b.branch_name} ({b.branch_code})
                      </option>
                    ))}
                </select>
              </div>

              {transferBranchId && (
                <div className="p-3 border border-amber-500/20 bg-amber-500/5">
                  <p className="font-mono text-xs text-amber-400">
                    This will move the asset to a different branch. The asset must not be in an active batch.
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-white/10 flex gap-3 justify-end">
              <button
                onClick={() => setShowTransferModal(false)}
                className="px-5 py-2.5 bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!transferBranchId) return;
                  setIsTransferring(true);
                  try {
                    await updateAssetMutation.mutateAsync({
                      assetId: asset.id,
                      updates: { branch_id: transferBranchId } as any,
                    });
                    const targetBranch = availableBranches.find((b: { id: string }) => b.id === transferBranchId);
                    addToast({
                      type: 'success',
                      title: 'Branch Transferred',
                      message: `Asset moved to ${targetBranch?.branch_name || 'new branch'}`,
                    });
                    setShowTransferModal(false);
                    setTransferBranchId('');
                  } catch (error: any) {
                    addToast({
                      type: 'error',
                      title: 'Transfer Failed',
                      message: error?.message || 'Could not transfer asset. It may be in an active batch.',
                    });
                  } finally {
                    setIsTransferring(false);
                  }
                }}
                disabled={!transferBranchId || isTransferring}
                className="px-5 py-2.5 bg-purple-500 text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-purple-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isTransferring ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin" />
                    Transferring...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="w-4 h-4" />
                    Transfer
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Dispute Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a]"
          >
            <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide">Dispute Decision</h3>
              </div>
              <button
                onClick={() => setShowDisputeModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 border border-amber-500/20 bg-amber-500/5">
                <p className="font-display font-bold text-sm text-amber-400 uppercase mb-1">
                  {asset.brand} {asset.model}
                </p>
                <p className="font-mono text-xs text-zinc-500">
                  Status: {getAssetStatusDisplay(asset.status as any).label}
                </p>
              </div>
              <div>
                <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2 block">
                  Dispute Type <span className="text-red-400">*</span>
                </label>
                <select
                  value={disputeType}
                  onChange={(e) => setDisputeType(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50"
                >
                  <option value="condition_dispute">Condition Dispute</option>
                  <option value="grading_dispute">Grading Dispute</option>
                  <option value="pricing_dispute">Pricing Dispute</option>
                  <option value="missing_item">Missing Item</option>
                  <option value="damage_dispute">Damage Dispute</option>
                </select>
              </div>
              <div>
                <label className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2 block">
                  Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Explain why you believe this decision should be reviewed..."
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 placeholder:text-slate-400 dark:placeholder:text-white/30 resize-none"
                />
              </div>
              <p className="font-mono text-xs text-slate-500 dark:text-white/50">
                Your dispute will be reviewed by our QC team. You will be notified of the outcome.
              </p>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-white/10 flex gap-3 justify-end">
              <button
                onClick={() => setShowDisputeModal(false)}
                className="px-5 py-2.5 bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDispute}
                disabled={!disputeReason.trim() || isDisputing}
                className="px-5 py-2.5 bg-amber-500 text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDisputing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4" />
                    Submit Dispute
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
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

function SpecRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 p-4 border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.02]">
      <div className="w-10 h-10 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-zinc-500">
        {icon}
      </div>
      <div>
        <p className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest">{label}</p>
        <p className="font-display text-sm text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

export default AssetDetail;
