import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardCheck,
  Laptop,
  Play,
  Clock,
  CheckCircle,
  Package,
  AlertCircle,
  Eye,
  Loader2,
  Search,
  ArrowRight,
} from 'lucide-react';
import { Badge } from '@/components/ui';
import { useAuth, useSelfAssignedAssets } from '@/hooks';
import { formatDistanceToNow } from 'date-fns';
import { getAssetStatusDisplay } from '@/lib/status-display';

type ViewFilter = 'pending' | 'all';

export function MyEvaluations() {
  const navigate = useNavigate();
  const location = useLocation();

  // Auth and data
  const { user, enterprise } = useAuth();
  const userId = user?.id || '';

  // V3.2: Fetch self-assigned assets
  const { data: allSelfAssets = [], isLoading: allLoading } = useSelfAssignedAssets(userId);

  const isLoading = allLoading;

  // Derive pending assets from allSelfAssets using the same status criteria as stats
  const pendingAssets = useMemo(() =>
    allSelfAssets.filter(a => ['assigned', 'check_in_started'].includes(a.status)),
    [allSelfAssets]
  );

  // Determine base path for navigation
  const isOrgAdmin = user?.role === 'org_admin' || location.pathname.startsWith('/org-admin');
  const basePath = isOrgAdmin ? '/org-admin' : '/admin';

  const [viewFilter, setViewFilter] = useState<ViewFilter>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter assets based on view and search
  const displayedAssets = useMemo(() => {
    const sourceAssets = viewFilter === 'pending' ? pendingAssets : allSelfAssets;

    if (!searchQuery.trim()) return sourceAssets;

    const query = searchQuery.toLowerCase();
    return sourceAssets.filter(asset =>
      asset.serial_number?.toLowerCase().includes(query) ||
      asset.brand?.toLowerCase().includes(query) ||
      asset.model?.toLowerCase().includes(query)
    );
  }, [viewFilter, pendingAssets, allSelfAssets, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    const pending = allSelfAssets.filter(a => ['assigned', 'check_in_started'].includes(a.status)).length;
    const submitted = allSelfAssets.filter(a => a.status === 'submitted').length;
    const reviewed = allSelfAssets.filter(a => ['conditionally_accepted', 'remote_rejected'].includes(a.status)).length;
    return { pending, submitted, reviewed, total: allSelfAssets.length };
  }, [allSelfAssets]);

  const handleStartEvaluation = (assetId: string) => {
    // Navigate to the self-evaluation flow
    navigate(`${basePath}/evaluate/${assetId}`);
  };

  const handleViewAsset = (assetId: string) => {
    navigate(`${basePath}/assets/${assetId}`);
  };

  // Get status badge variant
  const getStatusVariant = (status: string): 'default' | 'warning' | 'success' | 'destructive' | 'info' => {
    switch (status) {
      case 'assigned':
        return 'warning';
      case 'check_in_started':
        return 'info';
      case 'submitted':
        return 'default';
      case 'conditionally_accepted':
        return 'success';
      case 'remote_rejected':
        return 'destructive';
      default:
        return 'default';
    }
  };

  if (!enterprise) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="font-display text-zinc-500 uppercase tracking-wide">Enterprise not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 border border-ecotribe-primary/30 bg-ecotribe-primary/10 flex items-center justify-center">
            <ClipboardCheck className="w-6 h-6 text-ecotribe-primary" />
          </div>
          <div>
            <h1 className="font-brand font-bold text-2xl md:text-3xl text-slate-900 dark:text-white uppercase tracking-tight">
              My Evaluations
            </h1>
            <p className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest">
              Assets assigned to you for evaluation
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white">{stats.pending}</p>
              <p className="font-mono text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest">Pending</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white">{stats.submitted}</p>
              <p className="font-mono text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest">Submitted</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white">{stats.reviewed}</p>
              <p className="font-mono text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest">Reviewed</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-500/10 border border-slate-500/30 flex items-center justify-center">
              <Laptop className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
              <p className="font-mono text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest">Total</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setViewFilter('pending')}
            className={`px-4 py-2 font-mono text-xs uppercase tracking-widest border transition-all ${
              viewFilter === 'pending'
                ? 'bg-ecotribe-primary text-black border-ecotribe-primary'
                : 'bg-transparent text-slate-600 dark:text-white/60 border-slate-200 dark:border-white/10 hover:border-ecotribe-primary/50'
            }`}
          >
            Pending ({stats.pending})
          </button>
          <button
            onClick={() => setViewFilter('all')}
            className={`px-4 py-2 font-mono text-xs uppercase tracking-widest border transition-all ${
              viewFilter === 'all'
                ? 'bg-ecotribe-primary text-black border-ecotribe-primary'
                : 'bg-transparent text-slate-600 dark:text-white/60 border-slate-200 dark:border-white/10 hover:border-ecotribe-primary/50'
            }`}
          >
            All ({stats.total})
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by serial, brand, model..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-64 pl-10 pr-4 py-2 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 font-mono text-sm focus:border-ecotribe-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Asset List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-ecotribe-primary animate-spin" />
        </div>
      ) : displayedAssets.length === 0 ? (
        <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 p-12 text-center">
          <div className="w-16 h-16 border border-slate-200 dark:border-white/10 flex items-center justify-center mx-auto mb-4">
            <ClipboardCheck className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide mb-2">
            {viewFilter === 'pending' ? 'No Pending Evaluations' : 'No Self-Assigned Assets'}
          </h3>
          <p className="font-mono text-sm text-slate-500 dark:text-white/50">
            {viewFilter === 'pending'
              ? 'You have no devices pending evaluation.'
              : 'No assets have been assigned to you yet.'}
          </p>
          <button
            onClick={() => navigate(`${basePath}/assets/add`)}
            className="mt-6 px-6 py-3 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all"
          >
            Add Asset
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {displayedAssets.map((asset, index) => {
              const statusDisplay = getAssetStatusDisplay(asset.status);
              const isPending = ['assigned', 'check_in_started'].includes(asset.status);

              return (
                <motion.div
                  key={asset.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 hover:border-ecotribe-primary/30 transition-all"
                >
                  <div className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                    {/* Device Icon */}
                    <div className="w-12 h-12 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 flex items-center justify-center flex-shrink-0">
                      <Laptop className="w-6 h-6 text-slate-400 dark:text-white/40" />
                    </div>

                    {/* Device Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide">
                          {asset.brand} {asset.model}
                        </h3>
                        <Badge variant={getStatusVariant(asset.status)}>
                          {statusDisplay.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <p className="font-mono text-sm text-ecotribe-primary">
                          {asset.serial_number}
                        </p>
                        {asset.assigned_at && (
                          <p className="font-mono text-xs text-slate-400 dark:text-white/40">
                            Assigned {formatDistanceToNow(new Date(asset.assigned_at), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                      {asset.branches && (
                        <p className="font-mono text-xs text-slate-500 dark:text-white/50 mt-1">
                          Branch: {asset.branches.branch_name} ({asset.branches.branch_code})
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isPending ? (
                        <button
                          onClick={() => handleStartEvaluation(asset.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all"
                        >
                          <Play className="w-4 h-4" />
                          {asset.status === 'check_in_started' ? 'Continue' : 'Start'} Evaluation
                        </button>
                      ) : (
                        <button
                          onClick={() => handleViewAsset(asset.id)}
                          className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 font-mono text-xs uppercase tracking-widest hover:border-ecotribe-primary hover:text-ecotribe-primary transition-all"
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Info Section */}
      {stats.pending > 0 && (
        <div className="bg-blue-500/10 border border-blue-500/30 p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <div>
              <h4 className="font-display font-bold text-sm text-blue-900 dark:text-blue-200 uppercase tracking-wide mb-1">
                Self-Evaluation Tips
              </h4>
              <ul className="font-mono text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Click "Start Evaluation" to begin the device check-in process</li>
                <li>• You'll need to take photos and answer condition questions</li>
                <li>• Once submitted, the device will be reviewed by the tech team</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyEvaluations;
