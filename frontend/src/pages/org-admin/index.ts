/**
 * Org Admin Pages Index
 * V3: Replaces CFO pages with new Org Admin portal
 */

export { BranchManagement } from './BranchManagement';
export { BranchDetail } from './BranchDetail';
export { BulkBranchUpload } from './BulkBranchUpload';
export { CreditsWallet } from './CreditsWallet';
export { PickupApprovals } from './PickupApprovals';
export { EPRCertificates } from './EPRCertificates';
export { ITAdminManagement } from './ITAdminManagement';
export { BulkITAdminUpload } from './BulkITAdminUpload';
export { ITAdminInvite } from './ITAdminInvite';
// Re-export CFO pages that are still being migrated
export { CFODashboard as OrgAdminDashboard } from '../cfo/CFODashboard';
export { FinancialReports } from '../cfo/FinancialReports';
