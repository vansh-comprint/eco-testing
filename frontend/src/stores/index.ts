/**
 * Stores Index
 *
 * - authStoreApi and themeStore are primary (UI/session management)
 * - Legacy stores are deprecated - use React Query hooks from @/hooks instead
 */

// ============================================
// Auth & Theme
// ============================================
export {
  useAuthStoreApi,
  useUser,
  useEnterprise,
  useIsAuthenticated,
  useIsInitialized,
  useUserRole,
  useAuthError,
  useAuthLoading,
} from './authStoreApi';

export { useThemeStore } from './themeStore';

// ============================================
// Legacy Zustand stores (migrate to React Query hooks)
// ============================================

/** @deprecated Use useAssets from @/hooks instead */
export { useAssetStore } from './assetStore';

/** @deprecated Use useBatches from @/hooks instead */
export { useBatchStore } from './batchStore';

/** @deprecated Use @/hooks/useSubmissions instead */
export { useSubmissionStore } from './submissionStore';

/** @deprecated Notifications will use React Query */
export { useNotificationStore, triggerNotification } from './notificationStore';

/** @deprecated Use @/hooks/useReviews instead */
export { useReviewStore } from './reviewStore';

/** @deprecated Use @/hooks/useEnterprises instead */
export { useEnterpriseStore } from './enterpriseStore';

/** @deprecated Use @/hooks/useBulkUpload instead */
export { useBulkUploadStore } from './bulkUploadStore';

/** @deprecated Use usePickupRequests from @/hooks instead */
export { usePickupStore } from './pickupStore';

/** @deprecated No longer needed - database-first architecture */
export * from './mockData';

/** @deprecated Use @/hooks/useAuditLogs instead */
export { useAuditStore } from './auditStore';

/** @deprecated Use @/hooks/usePayouts instead */
export { usePayoutStore } from './payoutStore';
