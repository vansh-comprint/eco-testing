/**
 * API Module - Barrel Export
 *
 * This file re-exports all API modules for backward compatibility.
 * Consumers can import from '@/lib/api' or from specific modules like '@/lib/api/auth'.
 */

// ============================================================================
// Core Client
// ============================================================================
export {
  fetchWithAuth,
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  DEFAULT_PAGE_SIZE,
  API_BASE_URL,
  type ApiError,
  type ApiResponse,
  type PaginationMeta,
} from './client';

// ============================================================================
// Error Handling
// ============================================================================
export {
  ApiError as ApiErrorClass,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
  ConflictError,
  BusinessLogicError,
  DatabaseError,
  ExternalServiceError,
  NetworkError,
  createApiError,
  isApiError,
  isAuthenticationError,
  isAuthorizationError,
  isNotFoundError,
  isValidationError,
  isNetworkError,
} from './errors';

export {
  getErrorDisplay,
  parseApiError,
  getErrorMessage,
  shouldReauthenticate,
  isRetryableError,
  logError,
  type ErrorDisplayConfig,
} from './error-handler';

// ============================================================================
// Domain APIs
// ============================================================================

// Auth
export { authApi } from './auth';
export type { LoginRequest, LoginResponse, UserResponse } from './auth';

// Users
export { usersApi } from './users';
export type { UserListParams, UserCreateRequest, UserUpdateRequest } from './users';

// Enterprises
export { enterprisesApi } from './enterprises';
export type {
  EnterpriseResponse,
  EnterpriseListParams,
  EnterpriseCreateRequest,
  EnterpriseUpdateRequest,
} from './enterprises';

// Assets
export { assetsApi } from './assets';
export type {
  AssetResponse,
  AssetListParams,
  AssetCreateRequest,
  AssetUpdateRequest,
  AssetBulkCreateRequest,
} from './assets';

// Batches
export { batchesApi } from './batches';
export type {
  BatchResponse,
  BatchListParams,
  BatchCreateRequest,
  BatchUpdateRequest,
  BatchSubmitForApprovalRequest,
} from './batches';

// Branches
export { branchesApi } from './branches';
export type {
  BranchResponse,
  BranchListParams,
  BranchCreateRequest,
  BranchUpdateRequest,
} from './branches';

// Sub-Users (Employees)
export { subUsersApi } from './sub-users';
export type {
  SubUserResponse,
  SubUserListParams,
  SubUserCreateRequest,
} from './sub-users';

// Pickups
export { pickupsApi, pickupLocationsApi } from './pickups';
export type {
  PickupResponse,
  PickupListParams,
  PickupLocationResponse,
  PickupLocationCreateRequest,
  PickupLocationUpdateRequest,
} from './pickups';

// Submissions
export { submissionsApi } from './submissions';
export type {
  SubmissionResponse,
  SubmissionCreateRequest,
  SubmissionListParams,
} from './submissions';

// Reviews
export { reviewsApi } from './reviews';
export type {
  RemoteReviewResponse,
  FacilityQCResponse,
  ReviewListParams,
  RemoteReviewCreateRequest,
} from './reviews';

// Enterprise Applications
export { enterpriseApplicationsApi } from './applications';
export type {
  EnterpriseApplicationResponse,
  EnterpriseApplicationListParams,
  EnterpriseApplicationCreateRequest,
} from './applications';

// Disputes
export { disputesApi } from './disputes';
export type {
  DisputeResponse,
  DisputeListParams,
  DisputeCreateRequest,
} from './disputes';

// Notifications
export { notificationsApi } from './notifications';
export type { NotificationResponse, NotificationListParams } from './notifications';

// Payouts & Wallet
export { payoutsApi, walletApi } from './payouts';
export type {
  WalletResponse,
  WalletTransactionResponse,
  PayoutResponse,
  PayoutListParams,
  PayoutCreateRequest,
} from './payouts';

// Analytics
export { analyticsApi } from './analytics';
export type { PlatformStats, AssetDistribution, MonthlyTrend } from './analytics';

// Pricing
export { pricingApi } from './pricing';
export type {
  PricingRule,
  ConditionModifier,
  PricingConfig,
  PriceCalculationRequest,
  PriceCalculationResponse,
} from './pricing';

// Logistics
export { logisticsApi } from './logistics';
export type {
  LogisticsAdminResponse,
  LogisticsUserResponse,
  LogisticsAdminListParams,
  LogisticsUserListParams,
} from './logistics';

// Files
export { filesApi } from './files';
export type { FileUploadResponse } from './files';
