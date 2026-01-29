/**
 * Stores Index
 *
 * V3 MIGRATION NOTE:
 * - authStore and themeStore are KEPT (UI/session management only)
 * - All other stores are DEPRECATED - use React Query hooks from @/hooks instead
 * - See @/hooks/index.ts for the new data fetching layer
 *
 * Example migration:
 * OLD: const { assets, fetchAssets } = useAssetStore();
 * NEW: const { data: assets, isLoading } = useAssets(enterpriseId);
 */

// ============================================
// KEPT: Auth & Theme (UI-only stores)
// ============================================
// API-based auth store (REST API migration)
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

// Legacy Supabase auth store (kept for backward compatibility during migration)
export { useAuthStore } from './authStore';

export { useThemeStore } from './themeStore';

// ============================================
// DEPRECATED: Use React Query hooks instead
// These exports are kept for backward compatibility
// during migration. Will be removed in future version.
// ============================================

/** @deprecated Use useAssets from @/hooks instead */
export { useAssetStore } from './assetStore';

/** @deprecated Use useBatches from @/hooks instead */
export { useBatchStore } from './batchStore';

/** @deprecated Use useSubUsers from @/hooks instead */
export { useSubUserStore } from './subUserStore';

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

/** @deprecated Use useLogisticsAdmins/useLogisticsUsers from @/hooks instead */
export { useLogisticsStore } from './logisticsStore';

/** @deprecated No longer needed - database-first architecture */
export * from './mockData';

/** @deprecated Use @/hooks/useAuditLogs instead */
export { useAuditStore } from './auditStore';

/** @deprecated Use @/hooks/usePayouts instead */
export { usePayoutStore } from './payoutStore';
