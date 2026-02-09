/**
 * OPS Admin Enterprise Applications Page
 * V3: Review and approve enterprise registration applications
 * Enterprise registration flow: Submit documents → OPS Admin review → Approve/Reject
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
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
  Calendar,
  Loader2,
  FileCheck,
  AlertTriangle,
  Shield
} from 'lucide-react';
import {
  useAuth,
  useApiError,
  useInfiniteEnterpriseApplications,
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
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export function EnterpriseApplications() {
  // V3: Use React Query hooks for auth and data
  const { user } = useAuth();
  const { handleError, showSuccess } = useApiError();
  const { addToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus>('pending');
  const [selectedApp, setSelectedApp] = useState<string | null>(null);

  // V3: React Query hooks for data fetching and mutations
  // Pass status as server-side filter ('pending' includes more_info_requested client-side, 'all' = no filter)
  const apiStatus = statusFilter === 'all' || statusFilter === 'pending' ? undefined : statusFilter;
  const {
    data: infiniteData,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteEnterpriseApplications(apiStatus ? { status: apiStatus } : {});

  const applications = infiniteData?.pages.flatMap(p => p.data || []) ?? [];
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

  const selectedApplication = selectedApp
    ? applications.find(app => app.id === selectedApp)
    : null;

  const handleSubmitDecision = async () => {
    if (!selectedApp || !decision || !user) return;

    setIsSubmitting(true);
    try {
      if (decision === 'request_info') {
        await requestInfoMutation.mutateAsync({
          applicationId: selectedApp,
          reviewedBy: user.id,
          notes: infoRequestMessage,
        });
      } else if (decision === 'approve') {
        await approveMutation.mutateAsync({
          applicationId: selectedApp,
          reviewedBy: user.id,
          notes: reviewNotes || undefined,
        });
      } else {
        await rejectMutation.mutateAsync({
          applicationId: selectedApp,
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

      setSelectedApp(null);
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

  // Stats
  const stats = {
    pending: applications.filter(app => app.status === 'pending').length,
    approved: applications.filter(app => app.status === 'approved').length,
    rejected: applications.filter(app => app.status === 'rejected').length,
  };

  // V3: Loading state (only initial load — subsequent pages show inline spinner)
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
            {stats.pending}
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
            {stats.approved}
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
            {stats.rejected}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Application List */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          {filteredApplications.length > 0 ? (
            filteredApplications.map((app, idx) => {
              const isSelected = selectedApp === app.id;
              const isPending = app.status === 'pending';

              return (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setSelectedApp(app.id)}
                  className={`border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-ecotribe-primary bg-ecotribe-primary/5'
                      : isPending
                      ? 'border-amber-400/30 bg-amber-400/5 hover:border-amber-400/50'
                      : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 border flex items-center justify-center flex-shrink-0 ${
                        app.status === 'approved'
                          ? 'border-emerald-400/30 bg-emerald-400/10'
                          : app.status === 'rejected'
                          ? 'border-red-400/30 bg-red-400/10'
                          : 'border-amber-400/30 bg-amber-400/10'
                      }`}>
                        <Building2 className={`w-7 h-7 ${
                          app.status === 'approved'
                            ? 'text-emerald-400'
                            : app.status === 'rejected'
                            ? 'text-red-400'
                            : 'text-amber-400'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white uppercase">
                              {app.company_name}
                            </h3>
                            <p className="font-mono text-xs text-slate-500 dark:text-white/50 flex items-center gap-1 mt-1">
                              <User className="w-3 h-3" />
                              {app.org_admin_name}
                            </p>
                          </div>
                          <span className={`flex-shrink-0 px-2 py-1 border font-mono font-bold text-[10px] uppercase tracking-widest ${
                            app.status === 'approved'
                              ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400'
                              : app.status === 'rejected'
                              ? 'border-red-400/30 bg-red-400/10 text-red-400'
                              : 'border-amber-400/30 bg-amber-400/10 text-amber-400'
                          }`}>
                            {app.status}
                          </span>
                        </div>

                        {/* Quick Info Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                          <div className="flex items-center gap-2">
                            <Shield className="w-3 h-3 text-slate-400 dark:text-white/30" />
                            <div>
                              <p className="font-mono text-xs text-slate-700 dark:text-white/80">
                                {app.gst_number}
                              </p>
                              <p className="font-mono text-[9px] text-slate-400 dark:text-white/40 uppercase">GST</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3 text-slate-400 dark:text-white/30" />
                            <div>
                              <p className="font-mono text-xs text-slate-500 dark:text-white/50">
                                {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                              </p>
                              <p className="font-mono text-[9px] text-slate-400 dark:text-white/40 uppercase">Submitted</p>
                            </div>
                          </div>
                        </div>
                        {/* Contact Quick View */}
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 dark:border-white/5 flex-wrap">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Mail className="w-3 h-3 text-slate-400 dark:text-white/30 flex-shrink-0" />
                            <span className="font-mono text-[10px] text-slate-500 dark:text-white/40 truncate max-w-[180px] sm:max-w-[120px]">
                              {app.org_admin_email}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-400 dark:text-white/30 flex-shrink-0" />
                            <span className="font-mono text-[10px] text-slate-500 dark:text-white/40">
                              {app.org_admin_phone}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] py-16 text-center">
              <div className="w-16 h-16 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-slate-500 dark:text-white/50" />
              </div>
              <h3 className="font-brand font-bold text-lg text-slate-500 dark:text-white/50 uppercase mb-2">
                No Applications Found
              </h3>
              <p className="font-display text-sm text-slate-500 dark:text-white/50">
                {searchQuery ? 'Try adjusting your search.' : 'No enterprise applications to review.'}
              </p>
            </div>
          )}
          {/* Infinite scroll */}
          <InfiniteScrollInfo loadedCount={applications.length} totalCount={totalCount} />
          <InfiniteScrollTrigger
            hasNextPage={!!hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
          />
        </motion.div>

        {/* Review Panel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:sticky lg:top-4 h-fit"
        >
          {selectedApplication ? (
            <div className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
              <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">
                  Application Details
                </h3>
                {selectedApplication.application_ref && (
                  <span className="px-2 py-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 font-mono text-[10px] text-slate-500 dark:text-white/50" title="Application tracking reference">
                    #{selectedApplication.application_ref}
                  </span>
                )}
              </div>

              <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Company Info with Logo */}
                <div className="p-4 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                  <p className="font-mono font-bold text-xs text-ecotribe-primary uppercase tracking-widest mb-3">
                    Company Information
                  </p>
                  <div className="flex gap-4">
                    {/* Company Logo */}
                    {selectedApplication.doc_company_logo ? (
                      <div className="w-20 h-20 flex-shrink-0 border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 flex items-center justify-center overflow-hidden">
                        <img 
                          src={selectedApplication.doc_company_logo} 
                          alt={`${selectedApplication.company_name} logo`}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 flex-shrink-0 border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-slate-300 dark:text-white/20" />
                      </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <div>
                        <p className="font-display font-bold text-lg text-slate-900 dark:text-white">{selectedApplication.company_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 font-mono text-[10px] text-slate-600 dark:text-white/60 uppercase">
                            {selectedApplication.industry_type}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 font-mono text-[10px] text-slate-600 dark:text-white/60 uppercase">
                            {selectedApplication.company_size}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3 h-3 text-slate-400 dark:text-white/40 mt-0.5 flex-shrink-0" />
                        <p className="font-mono text-xs text-slate-500 dark:text-white/50 leading-relaxed">{selectedApplication.registered_address}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tax Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                    <p className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase mb-1">GST Number</p>
                    <p className="font-mono font-bold text-sm text-slate-900 dark:text-white">{selectedApplication.gst_number}</p>
                  </div>
                  <div className="p-4 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                    <p className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase mb-1">PAN Number</p>
                    <p className="font-mono font-bold text-sm text-slate-900 dark:text-white">{selectedApplication.pan_number}</p>
                  </div>
                </div>

                {/* Org Admin Info */}
                <div className="p-4 border border-blue-400/20 bg-blue-400/5">
                  <p className="font-mono font-bold text-xs text-blue-400 uppercase tracking-widest mb-3">
                    Org Admin Contact
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-400" />
                      <span className="font-display text-sm text-slate-900 dark:text-white">{selectedApplication.org_admin_name}</span>
                      {selectedApplication.org_admin_designation && (
                        <span className="font-mono text-xs text-slate-500 dark:text-white/50">({selectedApplication.org_admin_designation})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-400" />
                      <span className="font-mono text-xs text-slate-900 dark:text-white">{selectedApplication.org_admin_email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-blue-400" />
                      <span className="font-mono text-xs text-slate-500 dark:text-white/50">{selectedApplication.org_admin_phone}</span>
                    </div>
                  </div>
                </div>

                {/* Documents */}
                <div>
                  {(() => {
                    const docs = [
                      { key: 'doc_gst_certificate', label: 'GST Certificate', required: true },
                      { key: 'doc_pan_card', label: 'PAN Card', required: true },
                      { key: 'doc_incorporation_cert', label: 'Incorporation Certificate', required: true },
                      { key: 'doc_signatory_id', label: 'Signatory ID', required: true },
                      { key: 'doc_address_proof', label: 'Address Proof', required: true },
                    ];
                    const uploadedCount = docs.filter(d => (selectedApplication as any)[d.key]).length;
                    const requiredMissing = docs.filter(d => d.required && !(selectedApplication as any)[d.key]);
                    
                    return (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <p className="font-mono font-bold text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest">
                            Documents
                          </p>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 font-mono text-[10px] uppercase ${
                              uploadedCount === docs.length 
                                ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/30' 
                                : 'bg-amber-400/10 text-amber-400 border border-amber-400/30'
                            }`}>
                              {uploadedCount}/{docs.length} uploaded
                            </span>
                          </div>
                        </div>
                        {requiredMissing.length > 0 && (
                          <div className="mb-3 p-2 bg-red-400/5 border border-red-400/20 flex items-center gap-2">
                            <AlertTriangle className="w-3 h-3 text-red-400" />
                            <span className="font-mono text-[10px] text-red-400">
                              Missing required: {requiredMissing.map(d => d.label).join(', ')}
                            </span>
                          </div>
                        )}
                        <div className="space-y-2">
                          {docs.map(doc => {
                            const docUrl = (selectedApplication as any)[doc.key] as string | null;
                            return (
                              <div key={doc.key} className={`flex items-center justify-between p-3 border transition-colors ${
                                docUrl 
                                  ? 'border-emerald-400/20 bg-emerald-400/5 hover:border-emerald-400/40' 
                                  : doc.required 
                                    ? 'border-red-400/20 bg-red-400/5' 
                                    : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]'
                              }`}>
                                <div className="flex items-center gap-2">
                                  {docUrl ? (
                                    <FileCheck className="w-4 h-4 text-emerald-400" />
                                  ) : (
                                    <FileText className={`w-4 h-4 ${doc.required ? 'text-red-400' : 'text-slate-400 dark:text-white/30'}`} />
                                  )}
                                  <span className={`font-mono text-xs ${docUrl ? 'text-slate-900 dark:text-white' : doc.required ? 'text-red-400' : 'text-slate-500 dark:text-white/30'}`}>
                                    {doc.label}
                                    {doc.required && <span className="text-red-400 ml-1">*</span>}
                                  </span>
                                </div>
                                {docUrl ? (
                                  <button
                                    type="button"
                                    onClick={() => addToast({ type: 'info', title: 'Coming Soon', message: 'Document viewer coming soon' })}
                                    className="flex items-center gap-1.5 px-2 py-1 bg-ecotribe-primary/10 border border-ecotribe-primary/30 text-ecotribe-primary hover:bg-ecotribe-primary/20 transition-colors"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span className="font-mono text-[10px] uppercase">View</span>
                                  </button>
                                ) : (
                                  <span className={`font-mono text-[10px] ${doc.required ? 'text-red-400' : 'text-slate-400 dark:text-white/30'}`}>
                                    {doc.required ? 'Missing' : 'Not uploaded'}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>

                {(selectedApplication.status === 'pending' || selectedApplication.status === 'more_info_requested') ? (
                  /* Decision Form */
                  <>
                    <div>
                      <p className="font-mono font-bold text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest mb-3">
                        Your Decision
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button
                          onClick={() => setDecision('approve')}
                          className={`interactive p-4 border transition-all ${
                            decision === 'approve'
                              ? 'border-emerald-400 bg-emerald-400/10'
                              : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-emerald-400/50'
                          }`}
                        >
                          <CheckCircle className={`w-6 h-6 mx-auto mb-2 ${
                            decision === 'approve' ? 'text-emerald-400' : 'text-slate-500 dark:text-white/50'
                          }`} />
                          <p className={`font-mono font-bold text-[10px] uppercase tracking-widest ${
                            decision === 'approve' ? 'text-emerald-400' : 'text-slate-500 dark:text-white/50'
                          }`}>
                            Approve
                          </p>
                        </button>
                        <button
                          onClick={() => setDecision('request_info')}
                          className={`interactive p-4 border transition-all ${
                            decision === 'request_info'
                              ? 'border-amber-400 bg-amber-400/10'
                              : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-amber-400/50'
                          }`}
                        >
                          <AlertTriangle className={`w-6 h-6 mx-auto mb-2 ${
                            decision === 'request_info' ? 'text-amber-400' : 'text-slate-500 dark:text-white/50'
                          }`} />
                          <p className={`font-mono font-bold text-[10px] uppercase tracking-widest ${
                            decision === 'request_info' ? 'text-amber-400' : 'text-slate-500 dark:text-white/50'
                          }`}>
                            More Info
                          </p>
                        </button>
                        <button
                          onClick={() => setDecision('reject')}
                          className={`interactive p-4 border transition-all ${
                            decision === 'reject'
                              ? 'border-red-400 bg-red-400/10'
                              : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-red-400/50'
                          }`}
                        >
                          <XCircle className={`w-6 h-6 mx-auto mb-2 ${
                            decision === 'reject' ? 'text-red-400' : 'text-slate-500 dark:text-white/50'
                          }`} />
                          <p className={`font-mono font-bold text-[10px] uppercase tracking-widest ${
                            decision === 'reject' ? 'text-red-400' : 'text-slate-500 dark:text-white/50'
                          }`}>
                            Reject
                          </p>
                        </button>
                      </div>
                    </div>

                    {decision === 'request_info' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                      >
                        <label className="block">
                          <span className="font-mono font-bold text-xs text-amber-400 uppercase tracking-widest">
                            What information do you need? *
                          </span>
                          <textarea
                            value={infoRequestMessage}
                            onChange={(e) => setInfoRequestMessage(e.target.value)}
                            placeholder="e.g., Please upload a clearer copy of your GST certificate, the current one is not legible..."
                            rows={3}
                            className="mt-2 w-full px-4 py-3 border border-amber-400/30 bg-amber-400/5 text-slate-900 dark:text-white font-display placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-amber-400 focus:outline-none transition-colors resize-none"
                          />
                        </label>
                      </motion.div>
                    )}

                    {decision === 'reject' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                      >
                        <label className="block">
                          <span className="font-mono font-bold text-xs text-red-400 uppercase tracking-widest">
                            Rejection Reason *
                          </span>
                          <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="e.g., Invalid GST number, documents do not match company details..."
                            rows={3}
                            className="mt-2 w-full px-4 py-3 border border-red-400/30 bg-red-400/5 text-slate-900 dark:text-white font-display placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-red-400 focus:outline-none transition-colors resize-none"
                          />
                        </label>
                      </motion.div>
                    )}

                    <div>
                      <label className="block">
                        <span className="font-mono font-bold text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest">
                          Review Notes (Optional)
                        </span>
                        <textarea
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          placeholder="Add any internal review notes..."
                          rows={2}
                          className="mt-2 w-full px-4 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none transition-colors resize-none"
                        />
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowConfirmModal(true)}
                      disabled={
                        !decision ||
                        (decision === 'reject' && !rejectionReason) ||
                        (decision === 'request_info' && !infoRequestMessage) ||
                        isSubmitting
                      }
                      className={`w-full interactive py-3 font-mono font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                        decision
                          ? decision === 'approve'
                            ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                            : decision === 'request_info'
                            ? 'bg-amber-500 text-white hover:bg-amber-400'
                            : 'bg-red-500 text-white hover:bg-red-400'
                          : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/50 cursor-not-allowed'
                      }`}
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          {decision === 'approve' ? 'Approve Application' :
                           decision === 'request_info' ? 'Send Info Request' :
                           decision === 'reject' ? 'Reject Application' : 'Submit Decision'}
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  /* Already Decided */
                  <div className={`p-4 border ${
                    selectedApplication.status === 'approved'
                      ? 'border-emerald-400/30 bg-emerald-400/10'
                      : 'border-red-400/30 bg-red-400/10'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {selectedApplication.status === 'approved' ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                      <span className={`font-mono font-bold text-sm uppercase ${
                        selectedApplication.status === 'approved' ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {selectedApplication.status}
                      </span>
                    </div>
                    {selectedApplication.rejection_reason && (
                      <p className="font-display text-sm text-slate-600 dark:text-zinc-300 mt-2">
                        {selectedApplication.rejection_reason}
                      </p>
                    )}
                    {selectedApplication.reviewed_at && (
                      <p className="font-mono text-xs text-slate-500 dark:text-white/50 mt-2">
                        Reviewed on {new Date(selectedApplication.reviewed_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] py-16 text-center">
              <Eye className="w-10 h-10 text-slate-500 dark:text-white/50 mx-auto mb-4" />
              <p className="font-display text-slate-500 dark:text-white/50">
                Select an application to review
              </p>
            </div>
          )}
        </motion.div>
      </div>

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
          selectedApplication && (
            <div className="text-left space-y-1">
              <p className="font-mono text-xs text-slate-500 dark:text-white/60">
                <span className="text-slate-400 dark:text-white/40">Company:</span> {selectedApplication.company_name}
              </p>
              <p className="font-mono text-xs text-slate-500 dark:text-white/60">
                <span className="text-slate-400 dark:text-white/40">Org Admin:</span> {selectedApplication.org_admin_name}
              </p>
            </div>
          )
        }
      />
    </div>
  );
}

export default EnterpriseApplications;
