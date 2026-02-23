import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Building2, Plus, Clock, Ban, ExternalLink, Search, CheckCircle, Eye } from 'lucide-react';
import { PageHeader, StatBox, Spinner, ConfirmationModal, InfiniteScrollTrigger, InfiniteScrollInfo, useToast } from '@/components/ui';
import { enterprisesApi } from '@/lib/api';
import { useInfiniteEnterprises, enterpriseKeys, useDashboardStats, dashboardStatsKeys } from '@/hooks';
import { useQueryClient } from '@tanstack/react-query';
import type { Enterprise } from '@/types';

export function Enterprises() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusChangeTarget, setStatusChangeTarget] = useState<{ enterprise: Enterprise; newStatus: 'active' | 'inactive' } | null>(null);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  // Server-side stats for accurate KPI counts (not affected by infinite scroll subset)
  const { stats: dashStats } = useDashboardStats();

  // Infinite scroll query for enterprises
  const { data: enterprisePages, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteEnterprises();

  // Flatten pages into enterprise list
  const allRawEnterprises = useMemo(() => {
    return enterprisePages?.pages.flatMap(p => p.data || []) ?? [];
  }, [enterprisePages]);

  const total = enterprisePages?.pages[0]?.pagination?.total ?? 0;

  // Map to Enterprise type
  const allEnterprises: Enterprise[] = useMemo(() => {
    return allRawEnterprises.map((row: any) => ({
      id: row.id,
      name: row.name,
      legalName: row.legal_name,
      gstNumber: row.gst_number,
      panNumber: row.pan_number,
      address: row.address,
      status: row.status,
      contactPerson: row.contact_person,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      industry: row.industry,
      companySize: row.company_size,
      logoUrl: row.logo_url,
      bankDetails: row.bank_details,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    }));
  }, [allRawEnterprises]);

  // Separate active and inactive
  const activeEnterprises = useMemo(() => allEnterprises.filter(e => e.status === 'active'), [allEnterprises]);
  const inactiveEnterprises = useMemo(() => allEnterprises.filter(e => e.status === 'inactive' || (e.status as any) === 'suspended'), [allEnterprises]);

  const handleStatusChange = async () => {
    if (!statusChangeTarget) return;
    setIsChangingStatus(true);
    try {
      const result = await enterprisesApi.update(statusChangeTarget.enterprise.id, {
        status: statusChangeTarget.newStatus,
      });
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: enterpriseKeys.all });
        queryClient.invalidateQueries({ queryKey: dashboardStatsKeys.all });
        setStatusChangeTarget(null);
      } else {
        addToast({ type: 'error', title: 'Status Change Failed', message: (result as any).error?.message || 'Failed to change enterprise status. Please try again.' });
      }
    } catch (error) {
      console.error('Error changing enterprise status:', error);
      addToast({ type: 'error', title: 'Status Change Failed', message: error instanceof Error ? error.message : 'Failed to change enterprise status. Please try again.' });
      setStatusChangeTarget(null);
    } finally {
      setIsChangingStatus(false);
    }
  };

  const filteredActive = useMemo(() => {
    if (!searchQuery.trim()) return activeEnterprises;
    const q = searchQuery.toLowerCase();
    return activeEnterprises.filter(e =>
      e.name?.toLowerCase().includes(q) ||
      e.contactEmail?.toLowerCase().includes(q) ||
      e.gstNumber?.toLowerCase().includes(q) ||
      e.contactPerson?.toLowerCase().includes(q) ||
      (e as any).industry?.toLowerCase().includes(q)
    );
  }, [activeEnterprises, searchQuery]);

  const filteredInactive = useMemo(() => {
    if (!searchQuery.trim()) return inactiveEnterprises;
    const q = searchQuery.toLowerCase();
    return inactiveEnterprises.filter(e =>
      e.name?.toLowerCase().includes(q) ||
      e.contactEmail?.toLowerCase().includes(q) ||
      e.gstNumber?.toLowerCase().includes(q) ||
      e.contactPerson?.toLowerCase().includes(q) ||
      (e as any).industry?.toLowerCase().includes(q)
    );
  }, [inactiveEnterprises, searchQuery]);

  const filteredEnterprises = activeTab === 'active' ? filteredActive : filteredInactive;

  // Detect base path for navigation
  const isOpsPath = location.pathname.startsWith('/ops');
  const basePath = isOpsPath ? '/ops' : '/super';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enterprise Management"
        subtitle="Manage enterprise registrations and approvals"
        actions={
          <button
            onClick={() => navigate(`${basePath}/enterprises/create`)}
            className="px-4 py-2 bg-ecotribe-primary text-black font-mono text-xs uppercase tracking-widest border border-ecotribe-primary/40 hover:bg-white transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create Enterprise
          </button>
        }
      />

      {/* Info Banner - Link to Applications */}
      <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300">
        <Clock className="w-5 h-5 flex-shrink-0" />
        <p className="font-mono text-xs">
          To review new enterprise registration applications, go to{' '}
          <button
            onClick={() => navigate(`${basePath}/applications`)}
            className="underline hover:text-blue-500 inline-flex items-center gap-1"
          >
            Applications <ExternalLink className="w-3 h-3" />
          </button>
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 dark:text-zinc-500" />
        <input
          type="text"
          placeholder="Search by name, email, GST, contact person, or industry..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white/40 dark:bg-black/40 border border-black/10 dark:border-white/10 font-mono text-xs focus:outline-none focus:border-ecotribe-primary pl-12 pr-4 py-3 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-zinc-600"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div onClick={() => setActiveTab('active')} className="cursor-pointer">
          <StatBox
            label="Active Enterprises"
            value={dashStats.enterprise_active ?? 0}
            icon={<Building2 className="w-5 h-5" />}
            accent="success"
          />
        </div>
        <div onClick={() => setActiveTab('inactive')} className="cursor-pointer">
          <StatBox
            label="Inactive/Suspended"
            value={dashStats.enterprise_inactive ?? 0}
            icon={<Ban className="w-5 h-5" />}
            accent="warning"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-black/10 dark:border-white/10">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors ${
            activeTab === 'active'
              ? 'border-b-2 border-ecotribe-primary text-ecotribe-primary'
              : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
          }`}
        >
          Active ({dashStats.enterprise_active ?? 0})
        </button>
        <button
          onClick={() => setActiveTab('inactive')}
          className={`px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors ${
            activeTab === 'inactive'
              ? 'border-b-2 border-ecotribe-primary text-ecotribe-primary'
              : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
          }`}
        >
          Inactive ({dashStats.enterprise_inactive ?? 0})
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {filteredEnterprises.length === 0 ? (
                <div className="text-center py-12 text-black/50 dark:text-white/50 font-mono text-sm border border-black/10 dark:border-white/10 bg-white/40 dark:bg-black/40">
                  {searchQuery ? `No matching ${activeTab} enterprises` : `No ${activeTab} enterprises`}
                </div>
              ) : (
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
                      Industry
                    </div>
                    <div className="col-span-2 font-mono text-[10px] uppercase tracking-widest text-black/40 dark:text-white/40">
                      Status
                    </div>
                    <div className="col-span-1 font-mono text-[10px] uppercase tracking-widest text-black/40 dark:text-white/40 text-right">
                    </div>
                  </div>
                  {/* Rows */}
                  {filteredEnterprises.map((enterprise) => (
                    <div
                      key={enterprise.id}
                      onDoubleClick={() => navigate(`${basePath}/enterprises/${enterprise.id}`)}
                      className="px-4 py-3 cursor-pointer transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02] grid grid-cols-12 gap-4 items-center"
                    >
                      {/* Enterprise Name & Email */}
                      <div className="col-span-5 flex items-center gap-3 min-w-0">
                        <Building2 className={`w-4 h-4 flex-shrink-0 ${
                          enterprise.status === 'active' ? 'text-ecotribe-primary' : 'text-red-500'
                        }`} />
                        <div className="min-w-0">
                          <p className="font-display font-bold text-sm text-black dark:text-white truncate">
                            {enterprise.name}
                          </p>
                          {enterprise.contactEmail && (
                            <p className="font-mono text-[11px] text-black/50 dark:text-white/50 truncate md:hidden">
                              {enterprise.contactEmail}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Contact - Hidden on mobile */}
                      <div className="col-span-2 min-w-0 hidden md:block">
                        {enterprise.contactEmail && (
                          <p className="font-mono text-[11px] text-black/50 dark:text-white/50 truncate">
                            {enterprise.contactEmail}
                          </p>
                        )}
                        {enterprise.contactPhone && (
                          <p className="font-mono text-[10px] text-black/40 dark:text-white/40 truncate">
                            {enterprise.contactPhone}
                          </p>
                        )}
                      </div>

                      {/* Industry - Hidden on md and below */}
                      <div className="col-span-2 hidden lg:block">
                        {(enterprise as any).industry && (
                          <span className="inline-block px-2 py-0.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 font-mono text-[10px] text-black/60 dark:text-white/60 uppercase">
                            {(enterprise as any).industry}
                          </span>
                        )}
                      </div>

                      {/* Status Badge */}
                      <div className="col-span-2">
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest border ${
                          enterprise.status === 'active'
                            ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-400'
                            : 'border-red-400/40 bg-red-400/10 text-red-400'
                        }`}>
                          {enterprise.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="col-span-1 flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`${basePath}/enterprises/${enterprise.id}`);
                          }}
                          className="p-1.5 border border-ecotribe-primary/40 bg-ecotribe-primary/10 text-ecotribe-primary hover:bg-ecotribe-primary/20 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {enterprise.status === 'active' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setStatusChangeTarget({ enterprise, newStatus: 'inactive' });
                            }}
                            className="p-1.5 border border-red-500/40 bg-red-500/10 text-red-500 dark:text-red-400 hover:bg-red-500/20 transition-colors"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setStatusChangeTarget({ enterprise, newStatus: 'active' });
                            }}
                            className="p-1.5 border border-emerald-500/40 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Infinite Scroll Trigger + Info */}
          <div className="space-y-3">
            <InfiniteScrollInfo
              loadedCount={allEnterprises.length}
              totalCount={total}
            />
            <InfiniteScrollTrigger
              hasNextPage={hasNextPage ?? false}
              isFetchingNextPage={isFetchingNextPage}
              fetchNextPage={fetchNextPage}
            />
          </div>
        </>
      )}

      {/* Status Change Confirmation */}
      <ConfirmationModal
        isOpen={!!statusChangeTarget}
        onClose={() => setStatusChangeTarget(null)}
        onConfirm={handleStatusChange}
        title={statusChangeTarget?.newStatus === 'active' ? 'Activate Enterprise' : 'Deactivate Enterprise'}
        description={
          statusChangeTarget?.newStatus === 'active'
            ? `Are you sure you want to activate "${statusChangeTarget?.enterprise.name}"? This will restore full access for all users under this enterprise.`
            : `Are you sure you want to deactivate "${statusChangeTarget?.enterprise.name}"? All users under this enterprise will lose access.`
        }
        confirmText={statusChangeTarget?.newStatus === 'active' ? 'Activate' : 'Deactivate'}
        variant={statusChangeTarget?.newStatus === 'active' ? 'info' : 'danger'}
        isLoading={isChangingStatus}
      />
    </div>
  );
}

