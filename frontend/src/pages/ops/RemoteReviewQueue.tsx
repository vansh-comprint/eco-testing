import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Eye,
  Laptop,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  ArrowRight,
  User,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { useSubmissionStore } from '@/stores';
import { useOpsEnterprise } from '@/contexts/OpsEnterpriseContext';
import { useAllAssets, useAllSubUsers, useUpdateAssetStatus } from '@/hooks';
import { formatDistanceToNow } from 'date-fns';

export function RemoteReviewQueue() {
  const navigate = useNavigate();
  // V3: Use React Query hooks for database data
  const { data: assets = [] } = useAllAssets();
  const { data: subUsers = [] } = useAllSubUsers();
  const updateStatusMutation = useUpdateAssetStatus();
  // TODO: Submissions are in the database but fetchSubmissions doesn't query it.
  // Currently uses Zustand store (per-session). Falls back to asset.updated_at for timestamps.
  // Enhancement: Add useAllSubmissions hook to fetch from DB instead.
  const { submissions } = useSubmissionStore();
  const { selectedEnterpriseId, isAllEnterprises, enterprises, selectedEnterprise } = useOpsEnterprise();

  // Helper to get sub user by ID
  const getSubUserById = (id: string) => subUsers.find(u => u.id === id);

  const getEnterpriseById = (id?: string) => enterprises.find(e => e.id === id);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'new'>('all');

  // Get all assets pending review (respects global enterprise filter)
  // V3: Use snake_case field names from database
  const pendingReviewAssets = useMemo(() => {
    return assets.filter(a => {
      // Apply global enterprise filter
      if (!isAllEnterprises && a.enterprise_id !== selectedEnterpriseId) return false;
      // Filter: 'all' shows both submitted and remote_review, 'new' shows only submitted
      if (filterStatus === 'new' && a.status !== 'submitted') return false;
      if (!['submitted', 'remote_review'].includes(a.status)) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          a.brand?.toLowerCase().includes(query) ||
          a.model?.toLowerCase().includes(query) ||
          a.serial_number?.toLowerCase().includes(query)
        );
      }
      return true;
    }).map(asset => {
      const submission = submissions.find(s => s.assetId === asset.id);
      const subUser = asset.assigned_sub_user_id ? getSubUserById(asset.assigned_sub_user_id) : null;
      const enterprise = getEnterpriseById(asset.enterprise_id);

      return {
        ...asset,
        submission,
        subUser,
        enterprise,
      };
    }).sort((a, b) => {
      const timeA = a.submission?.submittedAt || a.updated_at;
      const timeB = b.submission?.submittedAt || b.updated_at;
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    });
  }, [assets, submissions, searchQuery, filterStatus, subUsers, isAllEnterprises, selectedEnterpriseId, enterprises]);

  const stats = {
    total: pendingReviewAssets.length,
    submitted: pendingReviewAssets.filter(a => a.status === 'submitted').length,
    inReview: pendingReviewAssets.filter(a => a.status === 'remote_review').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-2">
            Remote Review
          </span>
          <h1 className="font-brand font-bold text-3xl md:text-4xl text-slate-900 dark:text-white uppercase tracking-tight">
            Review Queue
          </h1>
          <p className="font-display text-slate-500 dark:text-white/50 text-sm mt-2 uppercase tracking-wide">
            {isAllEnterprises ? 'Assess submitted devices remotely' : `Reviewing ${selectedEnterprise?.name || 'selected enterprise'}`}
          </p>
        </motion.div>
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider">
                Total Pending
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-amber-400/10 border border-amber-400/30 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider">
                New Submissions
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.submitted}</p>
            </div>
            <div className="w-12 h-12 bg-blue-400/10 border border-blue-400/30 flex items-center justify-center">
              <Eye className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider">
                In Review
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.inReview}</p>
            </div>
            <div className="w-12 h-12 bg-purple-400/10 border border-purple-400/30 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Search & Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-white/50" />
          <input
            type="text"
            placeholder="Search by brand, model, or serial number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-white/50 font-mono text-sm focus:outline-none focus:border-ecotribe-primary"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`interactive px-4 py-2.5 font-mono font-bold text-xs uppercase tracking-widest transition-all ${
              filterStatus === 'all'
                ? 'bg-ecotribe-primary text-black'
                : 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white'
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setFilterStatus('new')}
            className={`interactive px-4 py-2.5 font-mono font-bold text-xs uppercase tracking-widest transition-all ${
              filterStatus === 'new'
                ? 'bg-ecotribe-primary text-black'
                : 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white'
            }`}
          >
            New ({stats.submitted})
          </button>
        </div>
      </motion.div>

      {/* Review Queue */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        {pendingReviewAssets.length === 0 ? (
          <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 p-12 text-center">
            <AlertCircle className="w-12 h-12 text-slate-500 dark:text-white/50 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              No Pending Reviews
            </h3>
            <p className="text-sm text-slate-500 dark:text-white/50">
              {searchQuery ? 'No submissions match your search.' : 'All submissions have been reviewed.'}
            </p>
          </div>
        ) : (
          pendingReviewAssets.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
              onClick={() => navigate(`/ops/submissions/${item.id}`)}
              className="interactive bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 p-5 hover:border-ecotribe-primary dark:hover:border-ecotribe-primary transition-all cursor-pointer group"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-ecotribe-primary/20 border border-ecotribe-primary/30 flex items-center justify-center flex-shrink-0">
                  <Laptop className="w-7 h-7 text-ecotribe-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-ecotribe-primary transition-colors">
                        {item.brand} {item.model}
                      </h3>
                      <p className="text-xs font-mono text-slate-500 dark:text-white/50">
                        S/N: {item.serial_number}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-mono font-bold uppercase tracking-wider ${
                        item.status === 'submitted'
                          ? 'bg-blue-400/10 border border-blue-400/30 text-blue-400'
                          : 'bg-purple-400/10 border border-purple-400/30 text-purple-400'
                      }`}
                    >
                      {item.status === 'submitted' ? 'New' : 'In Review'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                    {item.subUser && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-500 dark:text-white/50" />
                        <span className="text-sm text-slate-900 dark:text-white truncate">
                          {item.subUser.name}
                        </span>
                      </div>
                    )}

                    {item.enterprise && (
                      <div className="flex items-center gap-2">
                        <Laptop className="w-4 h-4 text-slate-500 dark:text-white/50" />
                        <span className="text-sm text-slate-900 dark:text-white truncate">
                          {item.enterprise.name}
                        </span>
                      </div>
                    )}

                    {item.submission && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-500 dark:text-white/50" />
                        <span className="text-sm text-slate-500 dark:text-white/50">
                          {formatDistanceToNow(new Date(item.submission.submittedAt), { addSuffix: true })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await updateStatusMutation.mutateAsync({ assetId: item.id, status: 'conditionally_accepted' });
                    }}
                    disabled={updateStatusMutation.isPending}
                    className="px-3 py-2 bg-emerald-500 text-black font-mono text-[11px] uppercase tracking-widest border border-emerald-400/60 hover:bg-emerald-400 transition-colors disabled:opacity-50"
                  >
                    {updateStatusMutation.isPending ? 'Updating...' : 'Mark Accepted'}
                  </button>
                  <ArrowRight className="w-5 h-5 text-slate-500 dark:text-white/50 group-hover:text-ecotribe-primary transition-colors flex-shrink-0" />
                </div>
              </div>
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
}

export default RemoteReviewQueue;
