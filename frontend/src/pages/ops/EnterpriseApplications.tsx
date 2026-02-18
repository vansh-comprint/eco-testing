/**
 * OPS Admin Enterprise Applications Page
 * V4: Full-width accordion list with collapsible detail rows
 * Enterprise registration flow: Submit documents → OPS Admin review → Approve/Reject
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Send,
  FileText,
  User,
  Phone,
  Mail,
  MapPin,
  Loader2,
  FileCheck,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  useAuth,
  useApiError,
  useInfiniteEnterpriseApplications,
  useApplicationStats,
  useApproveEnterpriseApplication,
  useRejectEnterpriseApplication,
  useRequestMoreInfo,
} from '@/hooks';
import { ConfirmationModal, useToast, InfiniteScrollTrigger, InfiniteScrollInfo } from '@/components/ui';
import { formatDistanceToNow } from 'date-fns';

type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'more_info_requested' | 'all';

interface EnterpriseApplication {
  id: string;
  company_name: string;
  gst_number: string;
  pan_number: string;
  registered_address: string;
  industry_type: string;
  company_size: string;
  org_admin_name: string;
  org_admin_email: string;
  org_admin_phone: string;
  org_admin_designation: string;
  doc_gst_certificate: string | null;
  doc_pan_card: string | null;
  doc_incorporation_cert: string | null;
  doc_signatory_id: string | null;
  doc_address_proof: string | null;
  doc_company_logo: string | null;
  status: string;
  application_ref: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  admin_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export function EnterpriseApplications() {
  // V4: Use React Query hooks for auth and data
  const { user } = useAuth();
  const { handleError, showSuccess } = useApiError();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilterRaw] = useState<ApplicationStatus>('pending');
  const [expandedApp, setExpandedApp] = useState<string | null>(null);

  // KPI stats from dedicated endpoint (always accurate regardless of filter/pagination)
  const { data: stats } = useApplicationStats();

  // V4: React Query hooks for data fetching and mutations
  // Pass status as server-side filter ('pending' includes more_info_requested client-side, 'all' = no filter)
  const apiStatus = statusFilter === 'all' || statusFilter === 'pending' ? undefined : statusFilter;
  const {
    data: infiniteData,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteEnterpriseApplications(apiStatus ? { status: apiStatus } : {});

  const applications = useMemo(() => infiniteData?.pages.flatMap(p => p.data || []) ?? [], [infiniteData]);
  const totalCount = infiniteData?.pages[0]?.pagination?.total ?? 0;
  const approveMutation = useApproveEnterpriseApplication();
  const rejectMutation = useRejectEnterpriseApplication();
  const requestInfoMutation = useRequestMoreInfo();
  const [decision, setDecision] = useState<'approve' | 'reject' | 'request_info' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [infoRequestMessage, setInfoRequestMessage] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Collapse expanded row when changing filter to avoid stale content
  const setStatusFilter = (newFilter: ApplicationStatus) => {
    setExpandedApp(null);
    setDecision(null);
    setRejectionReason('');
    setInfoRequestMessage('');
    setReviewNotes('');
    setStatusFilterRaw(newFilter);
  };

  const filteredApplications = applications
    .filter(app => {
      if (statusFilter === 'pending') return app.status === 'pending' || app.status === 'more_info_requested';
      if (statusFilter === 'approved') return app.status === 'approved';
      if (statusFilter === 'rejected') return app.status === 'rejected';
      if (statusFilter === 'more_info_requested') return app.status === 'more_info_requested';
      return true;
    })
    .filter(app =>
      app.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.org_admin_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.application_ref?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.gst_number || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

  const expandedApplication = expandedApp
    ? applications.find(app => app.id === expandedApp)
    : null;

  const handleSubmitDecision = async () => {
    if (!expandedApp || !decision || !user) return;

    setIsSubmitting(true);
    try {
      if (decision === 'request_info') {
        await requestInfoMutation.mutateAsync({
          applicationId: expandedApp,
          reviewedBy: user.id,
          notes: infoRequestMessage,
        });
      } else if (decision === 'approve') {
        await approveMutation.mutateAsync({
          applicationId: expandedApp,
          reviewedBy: user.id,
          notes: reviewNotes || undefined,
        });
      } else {
        await rejectMutation.mutateAsync({
          applicationId: expandedApp,
          reviewedBy: user.id,
          reason: rejectionReason || 'Application rejected',
        });
      }

      const actionLabel = decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'updated';
      showSuccess('Application Processed', `Application has been ${actionLabel} successfully`);

      // Switch filter to show the result of the action
      if (decision === 'approve') {
        setStatusFilter('approved');
      } else if (decision === 'reject') {
        setStatusFilter('rejected');
      }

      setExpandedApp(null);
      setDecision(null);
      setRejectionReason('');
      setInfoRequestMessage('');
      setReviewNotes('');
      setShowConfirmModal(false);
    } catch (error) {
      handleError(error, 'Processing application');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Detect base path for navigation
  const basePath = location.pathname.startsWith('/super') ? '/super' : '/ops';

  // KPI values from server-side stats (defaults to 0 while loading)
  const kpi = {
    pending: (stats?.pending ?? 0) + (stats?.more_info_requested ?? 0),
    approved: stats?.approved ?? 0,
    rejected: stats?.rejected ?? 0,
  };

  // Empty state message per filter
  const getEmptyStateMessage = () => {
    if (searchQuery) return 'Try adjusting your search.';
    switch (statusFilter) {
      case 'pending':
        return 'All caught up! No pending applications to review.';
      case 'approved':
        return 'No approved applications yet.';
      case 'rejected':
        return 'No rejected applications.';
      case 'more_info_requested':
        return 'No applications awaiting more information.';
      default:
        return 'No enterprise applications found.';
    }
  };

  // V4: Loading state (only initial load — subsequent pages show inline spinner)
  if (isLoading && !infiniteData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-ecotribe-primary animate-spin mx-auto mb-4" />
          <p className="font-mono text-xs text-slate-500 dark:text-zinc-500 uppercase tracking-widest">
            Loading applications...
          </p>
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
          <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-2">
            Operations
          </span>
          <h1 className="font-brand font-bold text-3xl text-slate-900 dark:text-white uppercase tracking-tight">
            Enterprise Applications
          </h1>
          <p className="font-display text-slate-500 dark:text-white/50 text-sm mt-2 uppercase tracking-wide">
            Review and approve new enterprise registrations
          </p>
        </motion.div>
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <div
          className={`border p-5 cursor-pointer transition-all ${
            statusFilter === 'pending'
              ? 'border-amber-400 bg-amber-400/10'
              : 'border-amber-400/30 bg-amber-400/5 hover:border-amber-400/50'
          }`}
          onClick={() => setStatusFilter('pending')}
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Pending Review</span>
          </div>
          <p className="font-brand font-bold text-3xl text-amber-400">
            {kpi.pending}
          </p>
        </div>

        <div
          className={`border p-5 cursor-pointer transition-all ${
            statusFilter === 'approved'
              ? 'border-emerald-400 bg-emerald-400/10'
              : 'border-emerald-400/30 bg-emerald-400/5 hover:border-emerald-400/50'
          }`}
          onClick={() => setStatusFilter('approved')}
        >
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Approved</span>
          </div>
          <p className="font-brand font-bold text-3xl text-emerald-400">
            {kpi.approved}
          </p>
        </div>

        <div
          className={`border p-5 cursor-pointer transition-all ${
            statusFilter === 'rejected'
              ? 'border-red-400 bg-red-400/10'
              : 'border-red-400/30 bg-red-400/5 hover:border-red-400/50'
          }`}
          onClick={() => setStatusFilter('rejected')}
        >
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-red-400" />
            <span className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Rejected</span>
          </div>
          <p className="font-brand font-bold text-3xl text-red-400">
            {kpi.rejected}
          </p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-white/50" />
          <input
            type="text"
            placeholder="Search by company name, email, GST, or application ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none transition-colors"
          />
        </div>
        <button
          onClick={() => setStatusFilter('all')}
          className={`interactive px-4 py-3 border font-mono font-bold text-xs uppercase tracking-widest transition-all ${
            statusFilter === 'all'
              ? 'border-ecotribe-primary bg-ecotribe-primary/10 text-ecotribe-primary'
              : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-500 dark:text-white/50 hover:border-slate-300 dark:hover:border-white/20'
          }`}
        >
          Show All
        </button>
      </motion.div>

      {/* Full-width Application List with Accordion */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        {filteredApplications.length > 0 ? (
          <div className="border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 divide-y divide-slate-200/60 dark:divide-white/[0.06]">
            {/* Table Header */}
            <div className="px-6 py-3 bg-slate-100/50 dark:bg-white/[0.03] grid grid-cols-12 gap-4 items-center">
              <span className="col-span-4 font-mono text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/40">Company</span>
              <span className="col-span-3 font-mono text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/40">Admin</span>
              <span className="col-span-2 font-mono text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/40">Ref</span>
              <span className="col-span-2 font-mono text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/40">Status</span>
              <span className="col-span-1 font-mono text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/40 text-right">Submitted</span>
            </div>

            {/* Accordion Rows */}
            {filteredApplications.map((app) => {
              const isExpanded = expandedApp === app.id;
              const isMoreInfoRequested = app.status === 'more_info_requested';
              const isPending = app.status === 'pending';

              const iconClass =
                app.status === 'approved' ? 'text-emerald-400' :
                app.status === 'rejected' ? 'text-red-400' :
                isMoreInfoRequested ? 'text-blue-400' : 'text-amber-400';

              const expandedBorderClass =
                app.status === 'approved' ? 'border-emerald-400' :
                app.status === 'rejected' ? 'border-red-400' :
                isMoreInfoRequested ? 'border-blue-400' : 'border-amber-400';

              const badgeClass =
                app.status === 'approved' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400' :
                app.status === 'rejected' ? 'border-red-400/30 bg-red-400/10 text-red-400' :
                isMoreInfoRequested ? 'border-blue-400/30 bg-blue-400/10 text-blue-400' :
                'border-amber-400/30 bg-amber-400/10 text-amber-400';

              return (
                <div key={app.id}>
                  {/* Compact Row */}
                  <div
                    onClick={() => {
                      if (expandedApp === app.id) {
                        setExpandedApp(null);
                        setDecision(null);
                        setRejectionReason('');
                        setInfoRequestMessage('');
                        setReviewNotes('');
                      } else {
                        setExpandedApp(app.id);
                        setDecision(null);
                        setRejectionReason('');
                        setInfoRequestMessage('');
                        setReviewNotes('');
                      }
                    }}
                    className={`px-6 py-4 cursor-pointer transition-colors grid grid-cols-12 gap-4 items-center ${
                      isExpanded
                        ? 'bg-slate-50 dark:bg-white/[0.03]'
                        : 'hover:bg-slate-50/50 dark:hover:bg-white/[0.015]'
                    }`}
                  >
                    {/* Company Name + Icon */}
                    <div className="col-span-4 flex items-center gap-3 min-w-0">
                      <Building2 className={`w-5 h-5 flex-shrink-0 ${iconClass}`} />
                      <div className="min-w-0">
                        <p className="font-display font-bold text-sm text-slate-900 dark:text-white truncate">
                          {app.company_name}
                        </p>
                        <p className="font-mono text-[10px] text-slate-400 dark:text-white/40 uppercase">
                          {app.industry_type}
                        </p>
                      </div>
                    </div>

                    {/* Admin Name */}
                    <div className="col-span-3 min-w-0">
                      <p className="font-display text-sm text-slate-900 dark:text-white truncate">
                        {app.org_admin_name}
                      </p>
                    </div>

                    {/* Application Ref */}
                    <div className="col-span-2">
                      {app.application_ref && (
                        <span className="font-mono text-xs text-slate-500 dark:text-white/50">
                          #{app.application_ref}
                        </span>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className="col-span-2">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 border font-mono font-bold text-[10px] uppercase tracking-widest ${badgeClass}`}>
                        {isMoreInfoRequested ? (
                          <><Info className="w-3 h-3" /> Info</>
                        ) : isPending ? (
                          <><Clock className="w-3 h-3" /> {app.status}</>
                        ) : app.status === 'approved' ? (
                          <><CheckCircle className="w-3 h-3" /> Approved</>
                        ) : app.status === 'rejected' ? (
                          <><XCircle className="w-3 h-3" /> Rejected</>
                        ) : (
                          app.status
                        )}
                      </span>
                    </div>

                    {/* Submitted Time + Chevron */}
                    <div className="col-span-1 flex items-center justify-end gap-2">
                      <span className="font-mono text-[10px] text-slate-400 dark:text-white/40">
                        {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 dark:text-white/40" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 dark:text-white/40" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Detail Section */}
                  <AnimatePresence>
                    {isExpanded && expandedApplication && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className={`border-l-4 ${expandedBorderClass} bg-slate-50/50 dark:bg-white/[0.02] px-6 py-4 space-y-4`}>
                          {/* Company + Tax + Admin — compact 3-column grid */}
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {/* Company Info */}
                            <div className="p-3 border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900">
                              <p className="font-mono font-bold text-[10px] text-ecotribe-primary uppercase tracking-widest mb-2">Company</p>
                              <div className="flex items-center gap-3">
                                {expandedApplication.doc_company_logo ? (
                                  <div className="w-10 h-10 flex-shrink-0 border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 overflow-hidden">
                                    <img src={expandedApplication.doc_company_logo} alt="" className="w-full h-full object-contain" />
                                  </div>
                                ) : (
                                  <div className="w-10 h-10 flex-shrink-0 border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                                    <Building2 className="w-5 h-5 text-slate-300 dark:text-white/20" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-display font-bold text-sm text-slate-900 dark:text-white truncate">{expandedApplication.company_name}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="font-mono text-[10px] text-slate-500 dark:text-white/50 uppercase">{expandedApplication.industry_type}</span>
                                    <span className="text-slate-300 dark:text-white/20">·</span>
                                    <span className="font-mono text-[10px] text-slate-500 dark:text-white/50 uppercase">{expandedApplication.company_size}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-start gap-1.5 mt-2">
                                <MapPin className="w-3 h-3 text-slate-400 dark:text-white/40 mt-0.5 flex-shrink-0" />
                                <p className="font-mono text-xs text-slate-500 dark:text-white/50 leading-relaxed">{expandedApplication.registered_address}</p>
                              </div>
                            </div>

                            {/* Tax Info */}
                            <div className="p-3 border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900">
                              <p className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2">Tax Details</p>
                              <div className="space-y-2">
                                <div>
                                  <p className="font-mono text-[10px] text-slate-400 dark:text-white/40 uppercase">GST</p>
                                  <p className="font-mono font-bold text-sm text-slate-900 dark:text-white">{expandedApplication.gst_number || '—'}</p>
                                </div>
                                <div>
                                  <p className="font-mono text-[10px] text-slate-400 dark:text-white/40 uppercase">PAN</p>
                                  <p className="font-mono font-bold text-sm text-slate-900 dark:text-white">{expandedApplication.pan_number || '—'}</p>
                                </div>
                              </div>
                            </div>

                            {/* Org Admin Contact */}
                            <div className="p-3 border border-blue-400/20 bg-blue-400/5">
                              <p className="font-mono font-bold text-[10px] text-blue-400 uppercase tracking-widest mb-2">Org Admin</p>
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <User className="w-3.5 h-3.5 text-blue-400" />
                                  <span className="font-display font-bold text-sm text-slate-900 dark:text-white">{expandedApplication.org_admin_name}</span>
                                  {expandedApplication.org_admin_designation && (
                                    <span className="font-mono text-[10px] text-slate-500 dark:text-white/50">({expandedApplication.org_admin_designation})</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                                  <span className="font-mono text-xs text-slate-900 dark:text-white">{expandedApplication.org_admin_email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Phone className="w-3.5 h-3.5 text-blue-400" />
                                  <span className="font-mono text-xs text-slate-500 dark:text-white/50">{expandedApplication.org_admin_phone}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Documents + Actions — side by side */}
                          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
                            {/* Documents */}
                            <div className="p-4 border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900">
                              <div className="flex items-center justify-between mb-3">
                                <p className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest">Uploaded Documents</p>
                                {(() => {
                                  const docs = [
                                    { key: 'doc_gst_certificate' }, { key: 'doc_pan_card' },
                                    { key: 'doc_incorporation_cert' }, { key: 'doc_signatory_id' }, { key: 'doc_address_proof' },
                                  ];
                                  const count = docs.filter(d => (expandedApplication as any)[d.key]).length;
                                  return (
                                    <span className={`px-2 py-0.5 font-mono text-[10px] font-bold uppercase border ${
                                      count === 5 ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5' : 'text-amber-400 border-amber-400/30 bg-amber-400/5'
                                    }`}>{count}/5</span>
                                  );
                                })()}
                              </div>
                              <div className="divide-y divide-slate-100 dark:divide-white/5">
                                {[
                                  { key: 'doc_gst_certificate', label: 'GST Certificate' },
                                  { key: 'doc_pan_card', label: 'PAN Card' },
                                  { key: 'doc_incorporation_cert', label: 'Certificate of Incorporation' },
                                  { key: 'doc_signatory_id', label: 'Signatory ID Proof' },
                                  { key: 'doc_address_proof', label: 'Address Proof' },
                                ].map(doc => {
                                  const docUrl = (expandedApplication as any)[doc.key] as string | null;
                                  return (
                                    <div key={doc.key} className="flex items-center justify-between py-2.5">
                                      <div className="flex items-center gap-2.5">
                                        {docUrl ? (
                                          <FileCheck className="w-4 h-4 text-emerald-400" />
                                        ) : (
                                          <FileText className="w-4 h-4 text-red-400" />
                                        )}
                                        <span className={`font-mono text-xs ${docUrl ? 'text-slate-900 dark:text-white' : 'text-red-400'}`}>
                                          {doc.label}
                                        </span>
                                      </div>
                                      {docUrl ? (
                                        <button
                                          type="button"
                                          onClick={() => window.open(docUrl, '_blank')}
                                          className="flex items-center gap-1.5 px-2.5 py-1 border border-ecotribe-primary/30 text-ecotribe-primary hover:bg-ecotribe-primary/10 transition-colors"
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                          <span className="font-mono text-[10px] font-bold uppercase tracking-wider">View</span>
                                        </button>
                                      ) : (
                                        <span className="font-mono text-[10px] font-bold text-red-400 uppercase tracking-wider">Missing</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="p-4 border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900">
                              {(expandedApplication.status === 'pending' || expandedApplication.status === 'more_info_requested') ? (
                                <div className="space-y-4 h-full flex flex-col">
                                  <p className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest">Review Decision</p>
                                  <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setDecision('approve')}
                                        className={`interactive flex items-center justify-center gap-2 py-3 border-2 transition-all ${
                                          decision === 'approve'
                                            ? 'border-emerald-400 bg-emerald-400/10'
                                            : 'border-slate-200 dark:border-white/10 hover:border-emerald-400/50'
                                        }`}
                                      >
                                        <CheckCircle className={`w-5 h-5 ${decision === 'approve' ? 'text-emerald-400' : 'text-slate-400 dark:text-white/40'}`} />
                                        <span className={`font-mono font-bold text-xs uppercase tracking-wider ${decision === 'approve' ? 'text-emerald-400' : 'text-slate-500 dark:text-white/50'}`}>Approve</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setDecision('reject')}
                                        className={`interactive flex items-center justify-center gap-2 py-3 border-2 transition-all ${
                                          decision === 'reject'
                                            ? 'border-red-400 bg-red-400/10'
                                            : 'border-slate-200 dark:border-white/10 hover:border-red-400/50'
                                        }`}
                                      >
                                        <XCircle className={`w-5 h-5 ${decision === 'reject' ? 'text-red-400' : 'text-slate-400 dark:text-white/40'}`} />
                                        <span className={`font-mono font-bold text-xs uppercase tracking-wider ${decision === 'reject' ? 'text-red-400' : 'text-slate-500 dark:text-white/50'}`}>Reject</span>
                                      </button>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setDecision('request_info')}
                                      className={`interactive w-full flex items-center justify-center gap-2 py-3 border-2 transition-all ${
                                        decision === 'request_info'
                                          ? 'border-amber-400 bg-amber-400/10'
                                          : 'border-slate-200 dark:border-white/10 hover:border-amber-400/50'
                                      }`}
                                    >
                                      <AlertTriangle className={`w-5 h-5 ${decision === 'request_info' ? 'text-amber-400' : 'text-slate-400 dark:text-white/40'}`} />
                                      <span className={`font-mono font-bold text-xs uppercase tracking-wider ${decision === 'request_info' ? 'text-amber-400' : 'text-slate-500 dark:text-white/50'}`}>Request More Info</span>
                                    </button>
                                  </div>

                                  <AnimatePresence mode="wait">
                                    {decision === 'request_info' && (
                                      <motion.div key="info" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="flex-1 flex flex-col">
                                        <textarea
                                          value={infoRequestMessage}
                                          onChange={(e) => setInfoRequestMessage(e.target.value)}
                                          placeholder="What information do you need from the applicant?"
                                          rows={3}
                                          className="flex-1 w-full px-3 py-2.5 border border-amber-400/30 bg-amber-400/5 text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-amber-400 focus:outline-none resize-none"
                                        />
                                      </motion.div>
                                    )}
                                    {decision === 'reject' && (
                                      <motion.div key="reject" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="flex-1 flex flex-col">
                                        <textarea
                                          value={rejectionReason}
                                          onChange={(e) => setRejectionReason(e.target.value)}
                                          placeholder="Provide the reason for rejection..."
                                          rows={3}
                                          className="flex-1 w-full px-3 py-2.5 border border-red-400/30 bg-red-400/5 text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-red-400 focus:outline-none resize-none"
                                        />
                                      </motion.div>
                                    )}
                                    {decision === 'approve' && (
                                      <motion.div key="approve" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="flex-1 flex flex-col">
                                        <textarea
                                          value={reviewNotes}
                                          onChange={(e) => setReviewNotes(e.target.value)}
                                          placeholder="Add review notes (optional)..."
                                          rows={3}
                                          className="flex-1 w-full px-3 py-2.5 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none resize-none"
                                        />
                                      </motion.div>
                                    )}
                                  </AnimatePresence>

                                  {decision && (
                                    <button
                                      type="button"
                                      onClick={() => setShowConfirmModal(true)}
                                      disabled={
                                        (decision === 'reject' && !rejectionReason) ||
                                        (decision === 'request_info' && !infoRequestMessage) ||
                                        isSubmitting
                                      }
                                      className={`w-full interactive py-3 font-mono font-bold text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                                        decision === 'approve'
                                          ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                                          : decision === 'request_info'
                                          ? 'bg-amber-500 text-white hover:bg-amber-400'
                                          : 'bg-red-500 text-white hover:bg-red-400'
                                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                                    >
                                      {isSubmitting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <>
                                          <Send className="w-4 h-4" />
                                          {decision === 'approve' ? 'Approve Application' :
                                           decision === 'request_info' ? 'Send Info Request' :
                                           'Reject Application'}
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>
                              ) : (
                                /* Already Decided */
                                <div className="space-y-4">
                                  <p className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest">Review Status</p>
                                  <div className={`p-4 border ${
                                    expandedApplication.status === 'approved' ? 'border-emerald-400/30 bg-emerald-400/5' : 'border-red-400/30 bg-red-400/5'
                                  }`}>
                                    <div className="flex items-center gap-3 mb-2">
                                      {expandedApplication.status === 'approved' ? (
                                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                                      ) : (
                                        <XCircle className="w-5 h-5 text-red-400" />
                                      )}
                                      <span className={`font-mono font-bold text-sm uppercase ${
                                        expandedApplication.status === 'approved' ? 'text-emerald-400' : 'text-red-400'
                                      }`}>
                                        {expandedApplication.status}
                                      </span>
                                      {expandedApplication.reviewed_at && (
                                        <span className="font-mono text-[10px] text-slate-500 dark:text-white/50 ml-auto">
                                          {formatDistanceToNow(new Date(expandedApplication.reviewed_at), { addSuffix: true })}
                                        </span>
                                      )}
                                    </div>
                                    {expandedApplication.rejection_reason && (
                                      <p className="font-mono text-xs text-slate-600 dark:text-zinc-300 mt-2">
                                        <span className="text-slate-400 dark:text-white/40 uppercase text-[10px]">Reason: </span>{expandedApplication.rejection_reason}
                                      </p>
                                    )}
                                    {expandedApplication.admin_notes && (
                                      <p className="font-mono text-xs text-slate-600 dark:text-zinc-300 mt-2">
                                        <span className="text-slate-400 dark:text-white/40 uppercase text-[10px]">Notes: </span>{expandedApplication.admin_notes}
                                      </p>
                                    )}
                                  </div>
                                  {expandedApplication.status === 'approved' && (
                                    <button
                                      type="button"
                                      onClick={() => navigate(`${basePath}/enterprises`)}
                                      className="w-full interactive py-3 border border-ecotribe-primary bg-ecotribe-primary/10 text-ecotribe-primary hover:bg-ecotribe-primary/20 transition-all font-mono font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2"
                                    >
                                      <Building2 className="w-4 h-4" /> View Enterprise
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] py-20 text-center">
            <div className="w-20 h-20 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-center mx-auto mb-5">
              <Building2 className="w-10 h-10 text-slate-500 dark:text-white/50" />
            </div>
            <h3 className="font-brand font-bold text-xl text-slate-500 dark:text-white/50 uppercase mb-2">
              {!searchQuery && statusFilter === 'pending' ? 'All Caught Up!' : 'No Applications Found'}
            </h3>
            <p className="font-display text-sm text-slate-500 dark:text-white/50">
              {getEmptyStateMessage()}
            </p>
          </div>
        )}

        {/* Infinite scroll */}
        <InfiniteScrollInfo loadedCount={applications.length} totalCount={totalCount} />
        <InfiniteScrollTrigger
          hasNextPage={hasNextPage ?? false}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
        />
      </motion.div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleSubmitDecision}
        isLoading={isSubmitting}
        variant={decision === 'approve' ? 'warning' : decision === 'reject' ? 'danger' : 'info'}
        title={
          decision === 'approve'
            ? 'Approve Application?'
            : decision === 'reject'
            ? 'Reject Application?'
            : 'Request More Information?'
        }
        description={
          decision === 'approve'
            ? 'This will create a new enterprise account and activate the Org Admin user. They can log in with the password they set during registration.'
            : decision === 'reject'
            ? 'This application will be permanently rejected.'
            : 'The applicant will need to provide the requested information and resubmit their application.'
        }
        confirmText={
          decision === 'approve'
            ? 'Approve'
            : decision === 'reject'
            ? 'Reject'
            : 'Send Request'
        }
        details={
          expandedApplication && (
            <div className="text-left space-y-1">
              <p className="font-mono text-xs text-slate-500 dark:text-white/60">
                <span className="text-slate-400 dark:text-white/40">Company:</span> {expandedApplication.company_name}
              </p>
              <p className="font-mono text-xs text-slate-500 dark:text-white/60">
                <span className="text-slate-400 dark:text-white/40">Org Admin:</span> {expandedApplication.org_admin_name}
              </p>
            </div>
          )
        }
      />
    </div>
  );
}

export default EnterpriseApplications;
