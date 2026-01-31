import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Laptop,
  Clock,
  Search,
  ArrowRight,
  User,
  Calendar,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import { useSubmissionStore } from '@/stores';
import { useOpsEnterprise } from '@/contexts/OpsEnterpriseContext';
import { useAllAssets, useAllSubUsers } from '@/hooks';
import { formatDistanceToNow } from 'date-fns';

export function RemoteReviewQueue() {
  const navigate = useNavigate();
  // V3: Use React Query hooks for database data
  const { data: assets = [] } = useAllAssets();
  const { data: subUsers = [] } = useAllSubUsers();
  // TODO: Submissions are in the database but fetchSubmissions doesn't query it.
  // Currently uses Zustand store (per-session). Falls back to asset.updated_at for timestamps.
  // Enhancement: Add useAllSubmissions hook to fetch from DB instead.
  const { submissions } = useSubmissionStore();
  const { selectedEnterpriseId, isAllEnterprises, enterprises, selectedEnterprise } = useOpsEnterprise();

  // Helper to get sub user by ID
  const getSubUserById = (id: string) => subUsers.find(u => u.id === id);

  const getEnterpriseById = (id?: string) => enterprises.find(e => e.id === id);

  const [searchQuery, setSearchQuery] = useState('');

  // Get all assets pending review (respects global enterprise filter)
  const pendingReviewAssets = useMemo(() => {
    return assets.filter(a => {
      if (!isAllEnterprises && a.enterprise_id !== selectedEnterpriseId) return false;
      if (!['submitted', 'remote_review', 'disputed'].includes(a.status)) return false;

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
      const subUser = asset.assigned_to_user_id ? getSubUserById(asset.assigned_to_user_id) : null;
      const enterprise = getEnterpriseById(asset.enterprise_id);

      return {
        ...asset,
        submission,
        subUser,
        enterprise,
      };
    }).sort((a, b) => {
      // Disputed items first
      if (a.status === 'disputed' && b.status !== 'disputed') return -1;
      if (b.status === 'disputed' && a.status !== 'disputed') return 1;
      // Then by submission time (newest first)
      const timeA = a.submission?.submittedAt || a.updated_at;
      const timeB = b.submission?.submittedAt || b.updated_at;
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    });
  }, [assets, submissions, searchQuery, subUsers, isAllEnterprises, selectedEnterpriseId, enterprises]);

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

      {/* Stats + Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4 items-stretch"
      >
        <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 p-4 flex items-center gap-4 sm:min-w-[180px]">
          <div className="w-12 h-12 bg-amber-400/10 border border-amber-400/30 flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <p className="text-xs font-mono font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider">
              Pending
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{pendingReviewAssets.length}</p>
          </div>
        </div>

        {pendingReviewAssets.filter(a => a.status === 'disputed').length > 0 && (
          <div className="bg-amber-50/50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 p-4 flex items-center gap-4 sm:min-w-[180px]">
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Disputed
              </p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {pendingReviewAssets.filter(a => a.status === 'disputed').length}
              </p>
            </div>
          </div>
        )}

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-white/50" />
          <input
            type="text"
            placeholder="Search by brand, model, or serial number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-white/50 font-mono text-sm focus:outline-none focus:border-ecotribe-primary"
          />
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
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-ecotribe-primary/20 border border-ecotribe-primary/30 flex items-center justify-center flex-shrink-0">
                  <Laptop className="w-7 h-7 text-ecotribe-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-ecotribe-primary transition-colors truncate mb-1">
                    {item.brand} {item.model}
                  </h3>
                  <p className="text-xs font-mono text-slate-500 dark:text-white/50 mb-2">
                    S/N: {item.serial_number}
                  </p>

                  <div className="flex items-center gap-4 flex-wrap">
                    {item.subUser && (
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400 dark:text-white/30" />
                        <span className="text-sm text-slate-700 dark:text-white/70 truncate">
                          {item.subUser.name}
                        </span>
                      </div>
                    )}

                    {item.enterprise && (
                      <div className="flex items-center gap-1.5">
                        <Laptop className="w-3.5 h-3.5 text-slate-400 dark:text-white/30" />
                        <span className="text-sm text-slate-700 dark:text-white/70 truncate">
                          {item.enterprise.name}
                        </span>
                      </div>
                    )}

                    {item.submission && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-white/30" />
                        <span className="text-xs text-slate-500 dark:text-white/40">
                          {formatDistanceToNow(new Date(item.submission.submittedAt), { addSuffix: true })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {item.status === 'disputed' && (
                    <span className="px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-mono text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Disputed
                    </span>
                  )}
                  <span className="px-3 py-2 bg-ecotribe-primary/10 border border-ecotribe-primary/30 text-ecotribe-primary font-mono text-[11px] font-bold uppercase tracking-widest">
                    Review
                  </span>
                  <ArrowRight className="w-5 h-5 text-slate-500 dark:text-white/50 group-hover:text-ecotribe-primary transition-colors" />
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
