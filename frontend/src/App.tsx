import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/components/ui';
import { ProtectedRoute } from '@/components/auth';
import { DashboardLayout, OpsLayout } from '@/layouts';
import { AuthProviderApi } from '@/contexts/AuthContextApi';

// Create a client for React Query - database-first architecture
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Pages
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage, PendingApproval, EnterpriseRegister, ForgotPassword } from '@/pages/auth';
import { ITAdminDashboard, AddAsset, UploadAssets, AssetList, AssetDetail, BulkUploadDetail, SubUserList, SubUserDetail, SubUserInvite, BulkUserUpload, BatchList, BatchCreate, BatchDetail, DisputeList, DisputeDetail, PayoutView, Settings, PickupRequests, PickupRequestDetail, InitiatePickup, SubmissionDetail, MyEvaluations } from '@/pages/admin';
import { SubUserDashboard, DeviceSubmit, SubmissionSuccess } from '@/pages/check-in';
import { TechnicianDashboard, ReviewQueue, RemoteReview, QCQueue, FacilityQC } from '@/pages/tech';
import { MainAdminDashboard, EnterpriseList, EnterpriseDetail, OpsAssets, PayoutProcessing, OpsDisputes, RemoteReviewQueue, PickupQueue, OpsLogistics } from '@/pages/ops';
// V3: OPS Admin pages for enterprise registration review
import { EnterpriseApplications } from '@/pages/ops/EnterpriseApplications';
// V3: Org Admin pages (some still aliased from CFO during migration)
import { OrgAdminDashboard, PickupApprovals, FinancialReports, EPRCertificates, BranchManagement, BranchDetail, BulkBranchUpload, CreditsWallet, ITAdminManagement, BulkITAdminUpload, ITAdminInvite } from '@/pages/org-admin';
import { SuperAdminDashboard, CreateEnterprise, AllAssets, AllUsers, Enterprises, Admins, Logistics, Pickups as SuperPickups, Pricing, Analytics, Settings as SuperSettings } from '@/pages/super';
import { LogisticsAdminDashboard, LogisticsAssignmentQueue, LogisticsUserManagement } from '@/pages/logistics-admin';
import { LogisticsAssignments } from '@/pages/logistics-user';

// Nav Items for each portal
const itAdminNavItems = [
  { label: 'Dashboard', path: '/admin', icon: <DashboardIcon /> },
  { label: 'Branches', path: '/admin/branches', icon: <EnterpriseIcon /> },
  { label: 'Batches', path: '/admin/batches', icon: <BatchIcon /> },
  { label: 'Assets', path: '/admin/assets', icon: <AssetIcon /> },
  { label: 'My Evaluations', path: '/admin/my-evaluations', icon: <EvaluationIcon /> },
  { label: 'Pickups', path: '/admin/pickups', icon: <TruckIcon /> },
  { label: 'Sub-Users', path: '/admin/sub-users', icon: <UsersIcon /> },
  { label: 'Settings', path: '/admin/settings', icon: <SettingsIcon /> },
];

const subUserNavItems = [
  { label: 'My Submissions', path: '/check-in', icon: <DashboardIcon /> },
  { label: 'Submit Device', path: '/check-in/submit', icon: <SubmitIcon /> },
  { label: 'Help', path: '/check-in/help', icon: <HelpIcon /> },
];

const technicianNavItems = [
  { label: 'Dashboard', path: '/tech', icon: <DashboardIcon /> },
  { label: 'Review Queue', path: '/tech/review', icon: <ReviewIcon /> },
  { label: 'QC Queue', path: '/tech/qc', icon: <QCIcon /> },
  { label: 'Disputes', path: '/tech/disputes', icon: <DisputeIcon /> },
  { label: 'History', path: '/tech/history', icon: <HistoryIcon /> },
];

// OPS Admin - Admin Section (always visible, not enterprise-filtered)
const opsAdminNavItems = [
  { label: 'Dashboard', path: '/ops', icon: <DashboardIcon /> },
  { label: 'Applications', path: '/ops/applications', icon: <DocumentIcon /> },
  { label: 'Enterprises', path: '/ops/enterprises', icon: <EnterpriseIcon /> },
  { label: 'Logistics', path: '/ops/logistics', icon: <TruckIcon /> },
];

// OPS Admin - Enterprise Section (filtered when enterprise is selected)
const opsEnterpriseNavItems = [
  { label: 'Assets', path: '/ops/assets', icon: <AssetIcon /> },
  { label: 'QC Queue', path: '/ops/qc', icon: <QCIcon /> },
  { label: 'Reviews', path: '/ops/reviews', icon: <ReviewIcon /> },
  { label: 'Pickups', path: '/ops/pickups', icon: <TruckIcon /> },
  { label: 'Payouts', path: '/ops/payouts', icon: <PayoutIcon /> },
  { label: 'Disputes', path: '/ops/disputes', icon: <DisputeIcon /> },
];

// Org Admin nav items (V3 - was CFO)
const orgAdminNavItems = [
  { label: 'Dashboard', path: '/org-admin', icon: <DashboardIcon /> },
  { label: 'Branches', path: '/org-admin/branches', icon: <EnterpriseIcon /> },
  { label: 'IT Admins', path: '/org-admin/it-admins', icon: <UsersIcon /> },
  { label: 'Pickup Approvals', path: '/org-admin/approvals', icon: <BatchIcon /> },
  { label: 'Wallet', path: '/org-admin/wallet', icon: <PayoutIcon /> },
  { label: 'Reports', path: '/org-admin/reports', icon: <ReportIcon /> },
  { label: 'EPR Certificates', path: '/org-admin/epr', icon: <DocumentIcon /> },
];

// IT Admin nav items for Org Admin toggle view (Org Admin has ALL IT Admin capabilities)
const orgAdminITViewNavItems = [
  { label: 'All Assets', path: '/org-admin/assets', icon: <AssetIcon /> },
  { label: 'Batches', path: '/org-admin/batches', icon: <BatchIcon /> },
  { label: 'My Evaluations', path: '/org-admin/my-evaluations', icon: <EvaluationIcon /> },
  { label: 'Sub-Users', path: '/org-admin/sub-users', icon: <UsersIcon /> },
  { label: 'Pickup Requests', path: '/org-admin/pickups', icon: <TruckIcon /> },
  { label: 'Disputes', path: '/org-admin/disputes', icon: <DisputeIcon /> },
  { label: 'Payouts', path: '/org-admin/payouts', icon: <PayoutIcon /> },
];

const superAdminNavItems = [
  { label: 'Dashboard', path: '/super', icon: <DashboardIcon /> },
  { label: 'Applications', path: '/super/applications', icon: <DocumentIcon /> },
  { label: 'Enterprises', path: '/super/enterprises', icon: <EnterpriseIcon /> },
  { label: 'Admins', path: '/super/admins', icon: <UsersIcon /> },
  { label: 'Logistics', path: '/super/logistics', icon: <TruckIcon /> },
  { label: 'Pickups', path: '/super/pickups', icon: <PackageIcon /> },
  { label: 'Pricing', path: '/super/pricing', icon: <PricingIcon /> },
  { label: 'Analytics', path: '/super/analytics', icon: <AnalyticsIcon /> },
  { label: 'Settings', path: '/super/settings', icon: <SettingsIcon /> },
];

const logisticsAdminNavItems = [
  { label: 'Dashboard', path: '/logistics-admin', icon: <DashboardIcon /> },
  { label: 'Assignments', path: '/logistics-admin/assignments', icon: <TruckIcon /> },
  { label: 'Users', path: '/logistics-admin/users', icon: <UsersIcon /> },
];

const logisticsUserNavItems = [
  { label: 'My Pickups', path: '/logistics', icon: <TruckIcon /> },
];

function App() {
  // V3: Auth initialization is handled by AuthProviderApi
  // Enterprise data is auto-loaded during auth initialization

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProviderApi>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/signup" element={<EnterpriseRegister />} />
          <Route path="/signup/pending-approval" element={<PendingApproval />} />

          {/* IT Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['it_admin']}>
                <DashboardLayout role="it_admin" title="IT Admin Portal" navItems={itAdminNavItems} />
              </ProtectedRoute>
            }
          >
            <Route index element={<ITAdminDashboard />} />
            <Route path="branches" element={<BranchManagement />} />
            <Route path="branches/:branchId" element={<BranchDetail />} />
            <Route path="branches/upload" element={<BulkBranchUpload />} />
            <Route path="batches" element={<BatchList />} />
            <Route path="batches/new" element={<BatchCreate />} />
            <Route path="batches/:batchId" element={<BatchDetail />} />
            <Route path="assets" element={<AssetList />} />
            <Route path="assets/new" element={<AddAsset />} />
            <Route path="assets/add" element={<AddAsset />} /> {/* Alias for /new */}
            <Route path="assets/upload" element={<UploadAssets />} />
            <Route path="assets/:assetId" element={<AssetDetail />} />
            <Route path="my-evaluations" element={<MyEvaluations />} />
            <Route path="evaluate/:assetId" element={<DeviceSubmit />} />
            <Route path="submissions/:assetId" element={<SubmissionDetail />} />
            <Route path="bulk-uploads/:uploadId" element={<BulkUploadDetail />} />
            <Route path="sub-users" element={<SubUserList />} />
            <Route path="sub-users/:subUserId" element={<SubUserDetail />} />
            <Route path="sub-users/invite" element={<SubUserInvite />} />
            <Route path="sub-users/upload" element={<BulkUserUpload />} />
            <Route path="pickups" element={<PickupRequests />} />
            <Route path="pickups/initiate" element={<InitiatePickup />} />
            <Route path="pickups/:requestId" element={<PickupRequestDetail />} />
            <Route path="disputes" element={<DisputeList />} />
            <Route path="disputes/:disputeId" element={<DisputeDetail />} />
            <Route path="payouts" element={<PayoutView />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Sub-User Routes */}
          <Route
            path="/check-in"
            element={
              <ProtectedRoute allowedRoles={['sub_user']}>
                <DashboardLayout role="sub_user" title="Device Check-In" navItems={subUserNavItems} />
              </ProtectedRoute>
            }
          >
            <Route index element={<SubUserDashboard />} />
            <Route path="submit/:assetId" element={<DeviceSubmit />} />
            <Route path="success" element={<SubmissionSuccess />} />
            <Route path="help" element={<PlaceholderPage title="Help" />} />
          </Route>

          {/* Technician Routes */}
          <Route
            path="/tech"
            element={
              <ProtectedRoute allowedRoles={['main_admin']}>
                <DashboardLayout role="main_admin" title="Technician Portal" navItems={technicianNavItems} />
              </ProtectedRoute>
            }
          >
            <Route index element={<TechnicianDashboard />} />
            <Route path="review" element={<ReviewQueue />} />
            <Route path="review/:assetId" element={<RemoteReview />} />
            <Route path="qc" element={<QCQueue />} />
            <Route path="qc/:assetId" element={<FacilityQC />} />
            <Route path="disputes" element={<PlaceholderPage title="Disputes" />} />
            <Route path="history" element={<PlaceholderPage title="History" />} />
          </Route>

          {/* Main Admin Routes - V3: Uses OpsLayout with enterprise selector */}
          <Route
            path="/ops"
            element={
              <ProtectedRoute allowedRoles={['main_admin']}>
                <OpsLayout title="Operations Portal" adminNavItems={opsAdminNavItems} enterpriseNavItems={opsEnterpriseNavItems} />
              </ProtectedRoute>
            }
          >
            <Route index element={<MainAdminDashboard />} />
            <Route path="applications" element={<EnterpriseApplications />} />
            <Route path="reviews" element={<RemoteReviewQueue />} />
            <Route path="pickups" element={<PickupQueue />} />
            <Route path="submissions/:assetId" element={<SubmissionDetail />} />
            <Route path="enterprises" element={<EnterpriseList />} />
            <Route path="enterprises/:id" element={<EnterpriseDetail />} />
            <Route path="assets" element={<OpsAssets />} />
            <Route path="assets/:assetId" element={<AssetDetail />} />
            <Route path="payouts" element={<PayoutProcessing />} />
            <Route path="disputes" element={<OpsDisputes />} />
            <Route path="logistics" element={<OpsLogistics />} />
            <Route path="qc" element={<QCQueue />} />
            <Route path="qc/:assetId" element={<FacilityQC />} />
          </Route>

          {/* Org Admin Routes (V3 - was CFO) */}
          <Route
            path="/org-admin"
            element={
              <ProtectedRoute allowedRoles={['org_admin']}>
                <DashboardLayout role="org_admin" title="Organization Admin" navItems={orgAdminNavItems} itViewNavItems={orgAdminITViewNavItems} />
              </ProtectedRoute>
            }
          >
            <Route index element={<OrgAdminDashboard />} />
            <Route path="branches" element={<BranchManagement />} />
            <Route path="branches/:branchId" element={<BranchDetail />} />
            <Route path="branches/upload" element={<BulkBranchUpload />} />
            <Route path="it-admins" element={<ITAdminManagement />} />
            <Route path="it-admins/invite" element={<ITAdminInvite />} />
            <Route path="it-admins/upload" element={<BulkITAdminUpload />} />
            <Route path="approvals" element={<PickupApprovals />} />
            <Route path="wallet" element={<CreditsWallet />} />
            <Route path="reports" element={<FinancialReports />} />
            <Route path="epr" element={<EPRCertificates />} />
            {/* IT Admin View Routes (via toggle) - Org Admin has ALL IT Admin capabilities */}
            <Route path="assets" element={<AssetList />} />
            <Route path="assets/new" element={<AddAsset />} />
            <Route path="assets/add" element={<AddAsset />} /> {/* Alias for /new */}
            <Route path="assets/upload" element={<UploadAssets />} />
            <Route path="assets/:assetId" element={<AssetDetail />} />
            <Route path="batches" element={<BatchList />} />
            <Route path="batches/new" element={<BatchCreate />} />
            <Route path="batches/:batchId" element={<BatchDetail />} />
            <Route path="my-evaluations" element={<MyEvaluations />} />
            <Route path="evaluate/:assetId" element={<DeviceSubmit />} />
            <Route path="submissions/:assetId" element={<SubmissionDetail />} />
            <Route path="bulk-uploads/:uploadId" element={<BulkUploadDetail />} />
            <Route path="sub-users" element={<SubUserList />} />
            <Route path="sub-users/:subUserId" element={<SubUserDetail />} />
            <Route path="sub-users/invite" element={<SubUserInvite />} />
            <Route path="sub-users/upload" element={<BulkUserUpload />} />
            <Route path="pickups" element={<PickupRequests />} />
            <Route path="pickups/initiate" element={<InitiatePickup />} />
            <Route path="pickups/:requestId" element={<PickupRequestDetail />} />
            <Route path="disputes" element={<DisputeList />} />
            <Route path="disputes/:disputeId" element={<DisputeDetail />} />
            <Route path="payouts" element={<PayoutView />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Logistics Admin Routes */}
          <Route
            path="/logistics-admin"
            element={
              <ProtectedRoute allowedRoles={['logistics_admin', 'main_admin']}>
                <DashboardLayout role="logistics_admin" title="Logistics Admin" navItems={logisticsAdminNavItems} />
              </ProtectedRoute>
            }
          >
            <Route index element={<LogisticsAdminDashboard />} />
            <Route path="assignments" element={<LogisticsAssignmentQueue />} />
            <Route path="users" element={<LogisticsUserManagement />} />
            <Route path="pickups/:requestId" element={<PickupRequestDetail />} />
            <Route path="assets/:assetId" element={<AssetDetail />} />
          </Route>

          {/* Logistics User Routes */}
          <Route
            path="/logistics"
            element={
              <ProtectedRoute allowedRoles={['logistics_user']}>
                <DashboardLayout role="logistics_user" title="Logistics User" navItems={logisticsUserNavItems} />
              </ProtectedRoute>
            }
          >
            <Route index element={<LogisticsAssignments />} />
            <Route path="pickups/:requestId" element={<PickupRequestDetail />} />
            <Route path="assets/:assetId" element={<AssetDetail />} />
          </Route>

          {/* Super Admin Routes */}
          <Route
            path="/super"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'main_admin']}>
                <DashboardLayout role="super_admin" title="Super Admin" navItems={superAdminNavItems} />
              </ProtectedRoute>
            }
          >
            <Route index element={<SuperAdminDashboard />} />
            <Route path="applications" element={<EnterpriseApplications />} />
            <Route path="enterprises" element={<Enterprises />} />
            <Route path="enterprises/create" element={<CreateEnterprise />} />
            <Route path="assets" element={<AllAssets />} />
            <Route path="assets/:assetId" element={<AssetDetail />} />
            <Route path="users" element={<AllUsers />} />
            <Route path="admins" element={<Admins />} />
            <Route path="logistics" element={<Logistics />} />
            <Route path="pickups" element={<SuperPickups />} />
            <Route path="pricing" element={<Pricing />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<SuperSettings />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProviderApi>
    </QueryClientProvider>
  );
}

// Placeholder page for routes not yet implemented
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
        <p className="text-white/60">This page is coming soon</p>
      </div>
    </div>
  );
}

// Icon Components
function DashboardIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

function BatchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}

function AssetIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function SubmitIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ReviewIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function QCIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function DisputeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function EnterpriseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function PayoutIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function PricingIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  );
}

function AnalyticsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  );
}

function EvaluationIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function LogisticsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

export default App;
