/**
 * React Query Hooks Index
 * Central export for all data fetching hooks
 * These replace the old Zustand stores
 */

// Auth (wraps authStore - kept for session management)
export { useAuth } from './useAuth';

// API Error Handling
export { useApiError } from './useApiError';

// Assets
export {
  useAssets,
  useAllAssets,
  useAsset,
  useAssetsByBranch,
  useAssetsByBatch,
  useAssetsByITAdmin,
  useSelfAssignedAssets,
  usePendingSelfEvaluations,
  useCreateAsset,
  useUpdateAsset,
  useDeleteAsset,
  useAssignAssetToSubUser,
  useAssignAssetToSelf,
  useUnassignAsset,
  useUpdateAssetStatus,
  useBulkCreateAssets,
  assetKeys,
} from './useAssets';

// Batches
export {
  useBatches,
  useAllBatches,
  useBatch,
  useBatchesByBranch,
  useBatchesByITAdmin,
  usePickupApprovalQueue,
  useCreateBatch,
  useUpdateBatch,
  useDeleteBatch,
  useSubmitBatchForApproval,
  useApproveBatch,
  useApproveBatchWithPrices,
  useRejectBatch,
  useAddAssetToBatch,
  useRemoveAssetFromBatch,
  batchKeys,
} from './useBatches';

// Branches (V3.2 - 1 IT Admin → Multiple Branches)
export {
  useBranches,
  useBranch,
  useBranchSummary,
  useBranchesByITAdmin,
  useCheckBranchCodeExists,
  useITAdmins,
  useActiveITAdmins,
  useITAdminBranches,
  useCreateBranch,
  useUpdateBranch,
  useDeleteBranch,
  useUpdateBranchStatus,
  useBulkCreateBranches,
  useCreateITAdmin,
  useBulkCreateITAdmins,
  useUpdateITAdminStatus,
  branchKeys,
  itAdminKeys,
} from './useBranches';

// Sub Users
export {
  useSubUsers,
  useAllSubUsers,
  useSubUser,
  useCreateSubUser,
  useCreateSubUsers,
  useUpdateSubUser,
  useDeleteSubUser,
  useBulkCreateSubUsers,
  useAssignAsset,
  useSendSubUserInvitation,
  useBulkSendInvitations,
  subUserKeys,
} from './useSubUsers';

// Pickups (partially MIGRATED to REST API - pickup locations still use Supabase)
export {
  usePickupRequests,
  usePickupRequest,
  usePickupLocations, // Legacy: Supabase
  useAllPickupRequests,
  usePendingPickups,
  useMyAssignments,
  usePickupsByITAdmin,
  useCreatePickupRequest,
  useUpdatePickupRequest,
  useAssignToLogisticsAdmin,
  useAssignToLogisticsUser,
  useStartPickup,
  useUpdatePickupStatus,
  useCreatePickupLocation, // Legacy: Supabase
  useUpdatePickupLocation, // Legacy: Supabase
  useDeletePickupLocation, // Legacy: Supabase
  useSetDefaultPickupLocation, // Legacy: Supabase
  useCompletePickup,
  useCancelPickup,
  pickupKeys,
} from './usePickups';

// Logistics
export {
  useLogisticsAdmins,
  useLogisticsAdmin,
  useLogisticsUsers,
  useLogisticsUser,
  useAvailableLogisticsUsers,
  useCreateLogisticsAdmin,
  useUpdateLogisticsAdmin,
  useDeleteLogisticsAdmin,
  useCreateLogisticsUser,
  useUpdateLogisticsUser,
  useDeleteLogisticsUser,
  useUpdateLogisticsUserStatus,
  useLogisticsAdminPickups,
  useLogisticsUserPickups,
  logisticsKeys,
} from './useLogistics';

// Enterprise Applications (V3 new)
export {
  useEnterpriseApplications,
  usePendingApplications,
  useEnterpriseApplication,
  useCreateEnterpriseApplication,
  useApproveEnterpriseApplication,
  useRejectEnterpriseApplication,
  useRequestMoreInfo,
  useUpdateApplicationDocuments,
  useUploadDocument,
  useCheckGSTExists,
  useCheckEmailExists,
  applicationKeys,
} from './useEnterpriseApplications';

// Enterprises (V3 - for OPS Admin portal)
export {
  useEnterprises,
  useEnterprise,
  useUpdateEnterprise,
  useUpdateEnterpriseStatus,
  enterpriseKeys,
} from './useEnterprises';

// Disputes
export {
  useAllDisputes,
  useDisputesByEnterprise,
  useDispute,
  useDisputeByAsset,
  useCreateDispute,
  useResolveDispute,
  usePendingDisputes,
  disputeKeys,
} from './useDisputes';

// Payouts
export {
  usePayouts,
  useAllPayouts,
  usePayout,
  useCreatePayout,
  useUpdatePayoutStatus,
  useCompletePayout,
  payoutKeys,
} from './usePayouts';

// Types
export type { CreateAssetInput } from './useAssets';
export type { CreateBatchInput, SubmitForApprovalInput, ApproveBatchInput, ApproveBatchWithPricesInput, RejectBatchInput } from './useBatches';
export type { CreateBranchInput } from './useBranches';
export type { CreateSubUserInput } from './useSubUsers';
export type { CreatePickupRequestInput } from './usePickups';
export type { CreateLogisticsAdminInput, CreateLogisticsUserInput } from './useLogistics';
export type { CreateEnterpriseApplicationInput } from './useEnterpriseApplications';
