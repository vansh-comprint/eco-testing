import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Search,
  Plus,
  Eye,
  CheckCircle,
  Ban,
  Loader2,
} from 'lucide-react';
import { useInfiniteEnterprises } from '@/hooks';
import { useUserRole } from '@/stores/authStoreApi';
import { enterprisesApi } from '@/lib/api/enterprises';
import { useQueryClient } from '@tanstack/react-query';
import { dashboardStatsKeys } from '@/hooks/useDashboardStats';
import { ConfirmationModal, InfiniteScrollTrigger, InfiniteScrollInfo } from '@/components/ui';

export function EnterpriseList() {
  const navigate = useNavigate();
  const userRole = useUserRole();
  const isSuperAdmin = userRole === 'super_admin';
  const basePath = isSuperAdmin ? '/super' : '/ops';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Status change state (super admin only)
  const [statusChangeTarget, setStatusChangeTarget] = useState<{ id: string; name: string; newStatus: string } | null>(null);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const queryClient = useQueryClient();

  // Build server-side params
  const apiParams = useMemo(() => {
    const params: Record<string, string | undefined> = {};
    if (searchQuery.trim()) params.search = searchQuery.trim();
    if (statusFilter !== 'all') params.status = statusFilter;
    return params;
  }, [searchQuery, statusFilter]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteEnterprises(apiParams);

  // Flatten pages into a single enterprise list
  const enterprises = useMemo(
    () => data?.pages.flatMap(p => p.data ?? []) ?? [],
    [data]
  );

  const totalCount = data?.pages[0]?.pagination?.total ?? 0;

  const handleStatusChange = async () => {
    if (!statusChangeTarget) return;
    setIsChangingStatus(true);
    try {
      await enterprisesApi.update(statusChangeTarget.id, { status: statusChangeTarget.newStatus });
      queryClient.invalidateQueries({ queryKey: ['enterprises'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.all });
      refetch();
    } catch (error) {
      console.error('Failed to update enterprise status:', error);
    } finally {
      setIsChangingStatus(false);
      setStatusChangeTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-2">
            Enterprise Management
          </span>
          <h1 className="font-brand font-bold text-3xl text-slate-900 dark:text-white uppercase tracking-tight">
            Enterprises
          </h1>
          <p className="font-display text-slate-500 dark:text-white/50 text-sm mt-2 uppercase tracking-wide">
            {totalCount} registered enterprises
          </p>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => navigate(`${basePath}/enterprises/create`)}
          className="interactive px-5 py-2.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Enterprise
        </motion.button>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-white/50" />
          <input
            type="text"
            placeholder="Search by name, email, or GST..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none transition-colors"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {['all', 'active', 'inactive'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`interactive px-4 py-3 border font-mono font-bold text-xs uppercase tracking-widest transition-all ${
                statusFilter === status
                  ? 'border-ecotribe-primary bg-ecotribe-primary/10 text-ecotribe-primary'
                  : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-500 dark:text-white/50 hover:border-slate-300 dark:hover:border-white/20'
              }`}
            >
              {status === 'all' ? 'All' : status.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-ecotribe-primary mx-auto mb-4" />
            <p className="font-display font-bold uppercase tracking-wide text-slate-500 dark:text-white/50">Loading enterprises...</p>
          </div>
        </div>
      ) : enterprises.length > 0 ? (
        <>
          {/* List Table */}
          <div className="border border-black/10 dark:border-white/10 bg-white/40 dark:bg-black/40 divide-y divide-black/[0.06] dark:divide-white/[0.06]">
            {/* Table Header */}
            <div className="px-4 py-2.5 bg-black/[0.03] dark:bg-white/[0.03] grid grid-cols-12 gap-4">
              <div className="col-span-5 font-mono text-[10px] uppercase tracking-widest text-black/40 dark:text-white/40">
                Enterprise
              </div>
              <div className="col-span-2 font-mono text-[10px] uppercase tracking-widest text-black/40 dark:text-white/40 hidden md:block">
                Contact
              </div>
              <div className="col-span-2 font-mono text-[10px] uppercase tracking-widest text-black/40 dark:text-white/40 hidden lg:block">
                GST Number
              </div>
              <div className="col-span-2 font-mono text-[10px] uppercase tracking-widest text-black/40 dark:text-white/40">
                Status
              </div>
              <div className="col-span-1 font-mono text-[10px] uppercase tracking-widest text-black/40 dark:text-white/40 text-right">
              </div>
            </div>

            {/* Rows */}
            <AnimatePresence mode="popLayout">
              {enterprises.map((enterprise) => {
                const statusBadge =
                  enterprise.status === 'active'
                    ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-400'
                    : 'border-red-400/40 bg-red-400/10 text-red-400';

                const statusIcon =
                  enterprise.status === 'active'
                    ? <CheckCircle className="w-3 h-3 mr-1 inline" />
                    : null;

                return (
                  <motion.div
                    key={enterprise.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    layout
                    className="px-4 py-3 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02] grid grid-cols-12 gap-4 items-center"
                  >
                    {/* Enterprise Name */}
                    <div className="col-span-5 flex items-center gap-3 min-w-0">
                      <Building2 className={`w-4 h-4 flex-shrink-0 ${
                        enterprise.status === 'active' ? 'text-ecotribe-primary' : 'text-slate-400 dark:text-white/30'
                      }`} />
                      <div className="min-w-0">
                        <p className="font-display font-bold text-sm text-black dark:text-white truncate">
                          {enterprise.name}
                        </p>
                        {enterprise.contact_email && (
                          <p className="font-mono text-[11px] text-black/50 dark:text-white/50 truncate md:hidden">
                            {enterprise.contact_email}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Contact - Hidden on mobile */}
                    <div className="col-span-2 min-w-0 hidden md:block">
                      {enterprise.contact_person && (
                        <p className="font-mono text-[11px] text-black/70 dark:text-white/70 truncate">
                          {enterprise.contact_person}
                        </p>
                      )}
                      {enterprise.contact_email && (
                        <p className="font-mono text-[10px] text-black/40 dark:text-white/40 truncate">
                          {enterprise.contact_email}
                        </p>
                      )}
                    </div>

                    {/* GST - Hidden on md and below */}
                    <div className="col-span-2 hidden lg:block">
                      {enterprise.gst_number && (
                        <span className="font-mono text-[11px] text-black/50 dark:text-white/50">
                          {enterprise.gst_number}
                        </span>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className="col-span-2">
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest border ${statusBadge}`}>
                        {statusIcon}
                        {enterprise.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="col-span-1 flex items-center justify-end gap-2">
                      <button
                        onClick={() => navigate(`${basePath}/enterprises/${enterprise.id}`)}
                        className="p-1.5 border border-ecotribe-primary/40 bg-ecotribe-primary/10 text-ecotribe-primary hover:bg-ecotribe-primary/20 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {isSuperAdmin && enterprise.status === 'active' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setStatusChangeTarget({ id: enterprise.id, name: enterprise.name, newStatus: 'inactive' }); }}
                          className="p-1.5 border border-red-500/40 bg-red-500/10 text-red-500 dark:text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                      {isSuperAdmin && enterprise.status === 'inactive' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setStatusChangeTarget({ id: enterprise.id, name: enterprise.name, newStatus: 'active' }); }}
                          className="p-1.5 border border-emerald-500/40 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Infinite Scroll */}
          <div className="space-y-3">
            <InfiniteScrollInfo
              loadedCount={enterprises.length}
              totalCount={totalCount}
            />
            <InfiniteScrollTrigger
              hasNextPage={!!hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              fetchNextPage={fetchNextPage}
            />
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-black/50 dark:text-white/50 font-mono text-sm border border-black/10 dark:border-white/10 bg-white/40 dark:bg-black/40">
          {searchQuery ? 'No matching enterprises found' : 'No enterprises yet'}
        </div>
      )}

      {/* Status Change Confirmation Modal (Super Admin only) */}
      {statusChangeTarget && (
        <ConfirmationModal
          isOpen={!!statusChangeTarget}
          onClose={() => setStatusChangeTarget(null)}
          onConfirm={handleStatusChange}
          title={statusChangeTarget.newStatus === 'active' ? 'Activate Enterprise' : 'Deactivate Enterprise'}
          description={`Are you sure you want to ${statusChangeTarget.newStatus === 'active' ? 'activate' : 'deactivate'} "${statusChangeTarget.name}"? ${statusChangeTarget.newStatus === 'inactive' ? 'This will restrict access for all users in this enterprise.' : 'This will restore access for all users.'}`}
          confirmText={statusChangeTarget.newStatus === 'active' ? 'Activate' : 'Deactivate'}
          variant={statusChangeTarget.newStatus === 'active' ? 'info' : 'warning'}
          isLoading={isChangingStatus}
        />
      )}
    </div>
  );
}

export default EnterpriseList;
