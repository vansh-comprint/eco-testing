/**
 * EcoTribe Database Schema
 *
 * This file documents the complete data model for the EcoTribe platform.
 * It serves as a reference for backend implementation and ensures consistency
 * across all frontend stores.
 *
 * ENTITY RELATIONSHIPS:
 * =====================
 *
 *   Enterprise (1) ───────< (N) User (IT Admin, Org Admin)
 *       │
 *       ├───────< (N) SubUser (Employees)
 *       │             │
 *       │             └──────< (1:N) Asset (via assignedSubUserId)
 *       │
 *       ├───────< (N) Asset
 *       │             │
 *       │             ├──────< (1) Submission (evaluation data)
 *       │             │
 *       │             ├──────< (1) RemoteReview
 *       │             │
 *       │             ├──────< (1) OnSiteQC (logistics QC)
 *       │             │
 *       │             ├──────< (1) FacilityQC (warehouse QC)
 *       │             │
 *       │             └──────< (N) AuditLog
 *       │
 *       ├───────< (N) Batch
 *       │             │
 *       │             └──────< (N) Asset (via batchId)
 *       │
 *       ├───────< (N) PickupLocation
 *       │
 *       ├───────< (N) PickupRequest
 *       │             │
 *       │             ├──────< (N) Asset (via assetIds)
 *       │             │
 *       │             └──────< (1) LogisticsUser (via logisticsUserId)
 *       │
 *       ├───────< (1) EnterpriseWallet
 *       │             │
 *       │             └──────< (N) CreditTransaction
 *       │
 *       └───────< (N) EPRCertificate
 *
 *   LogisticsCompany (1) ───────< (N) LogisticsUser
 *
 *
 * STATUS FLOWS:
 * =============
 *
 * Asset Status Flow:
 * pending_assignment → assigned → check_in_started → submitted → remote_review
 *                                                                      │
 *                        ┌─────────────────────────────────────────────┤
 *                        ↓                                             ↓
 *                 remote_rejected → disputed ──────────────┐   conditionally_accepted
 *                        ↑              │                  │           │
 *                        │              │                  │           ↓
 *                        └──────────────┴──────────────────┴───→ ready_for_pickup
 *                                                                      │
 *                                                                      ↓
 *                                                              pickup_requested
 *                                                                      │
 *                                                                      ↓
 *                                                              pickup_scheduled
 *                                                                   │    │
 *                                                   ┌───────────────┘    │
 *                                                   ↓                    ↓
 *                                           pickup_failed_qc      picked_up
 *                                                   │                    │
 *                                                   ↓                    ↓
 *                                           ready_for_pickup       in_transit
 *                                             (retry)                    │
 *                                                                        ↓
 *                                                                   facility_qc
 *                                                                     │    │
 *                                                   ┌─────────────────┘    │
 *                                                   ↓                      ↓
 *                                            final_rejected         final_accepted
 *                                                   │                      │
 *                                                   ↓                      ↓
 *                                               disputed            payout_pending
 *                                                                          │
 *                                                                          ↓
 *                                                                      completed
 *
 *
 * Pickup Request Status Flow:
 * pending_assignment → assigned → scheduled → in_progress → completed
 *                                    │             │              │
 *                                    └─────────────┴──────→ partially_completed
 *                                          │
 *                                          └──────────────→ cancelled
 */

// ============================================================================
// CORE ENTITIES
// ============================================================================

export interface DBEnterprise {
  id: string;                    // Primary Key: 'ent-{uuid}'
  name: string;
  legalName?: string;
  gstNumber?: string;
  panNumber?: string;
  address: DBAddress;
  industry?: string;
  employeeCount?: number;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  updatedAt?: Date;
}

export interface DBUser {
  id: string;                    // Primary Key: 'usr-{uuid}'
  enterpriseId: string;          // Foreign Key → Enterprise
  email: string;                 // Unique
  name: string;
  phone?: string;
  role: DBUserRole;
  status: 'active' | 'inactive';
  passwordHash?: string;         // For auth (not stored in frontend)
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

export type DBUserRole =
  | 'super_admin'       // Ecotribe platform admin
  | 'ops_admin'         // Ecotribe OPS manager
  | 'it_admin'          // Enterprise IT admin
  | 'org_admin'         // Organization Admin (enterprise level)
  | 'employee'          // Enterprise employee
  | 'logistics_admin'   // Logistics company admin
  | 'logistics_user';   // Field logistics personnel

export interface DBSubUser {
  id: string;                    // Primary Key: 'sub-{uuid}'
  enterpriseId: string;          // Foreign Key → Enterprise
  name?: string;
  email: string;                 // Unique within enterprise
  phone?: string;
  department?: string;
  status: 'pending' | 'active' | 'inactive';

  // OTP Authentication
  token?: string;                // One-time access token
  tokenExpiresAt?: Date;

  createdAt: Date;
  updatedAt?: Date;
}

// ============================================================================
// ASSET ENTITIES
// ============================================================================

export interface DBAsset {
  id: string;                    // Primary Key: 'ast-{uuid}'
  enterpriseId: string;          // Foreign Key → Enterprise
  batchId?: string;              // Foreign Key → Batch (optional grouping)

  // Device Identification
  serialNumber: string;          // Unique
  brand: string;
  model: string;
  assetTag?: string;             // Internal enterprise asset ID

  // Specifications
  specs?: DBAssetSpecs;
  purchaseDate?: Date;

  // Assignment
  assignedSubUserId?: string;    // Foreign Key → SubUser
  assignedAt?: Date;

  // Status & Grading
  status: DBAssetStatus;
  grade?: DBAssetGrade;          // Set after QC: A/B/C/D

  // Pricing
  basePrice?: number;            // Estimated value before QC
  finalPrice?: number;           // Final value after QC adjustments

  // Treatment/EPR
  treatmentOutcome?: DBTreatmentOutcome;
  treatmentDate?: Date;
  recyclerPartnerId?: string;
  weightKg?: number;
  eprCertificateId?: string;     // Foreign Key → EPRCertificate

  // QC Data (denormalized for quick access)
  qcReport?: DBQCReport;

  createdAt: Date;
  updatedAt?: Date;
}

export interface DBAssetSpecs {
  processor?: string;
  ram?: string;
  storage?: string;
  storageType?: 'SSD' | 'HDD' | 'NVMe';
  screenSize?: string;
  os?: string;
  gpu?: string;
}

export type DBAssetStatus =
  | 'pending_assignment'   // Uploaded, awaiting sub-user assignment
  | 'assigned'             // Sub-user assigned, awaiting evaluation
  | 'check_in_started'     // Sub-user started evaluation
  | 'submitted'            // Evaluation submitted
  | 'remote_review'        // Under reviewer assessment
  | 'conditionally_accepted' // Passed remote review
  | 'remote_rejected'      // Failed remote review
  | 'disputed'             // Sub-user/IT Admin disputed decision
  | 'ready_for_pickup'     // Approved, ready for IT Admin to request pickup
  | 'pickup_requested'     // Pickup request submitted
  | 'pickup_scheduled'     // Logistics assigned, date confirmed
  | 'pickup_failed_qc'     // Failed on-site QC
  | 'picked_up'            // Collected by logistics
  | 'in_transit'           // On way to warehouse
  | 'facility_qc'          // At warehouse, under QC
  | 'final_accepted'       // Passed facility QC
  | 'final_rejected'       // Failed facility QC
  | 'payout_pending'       // Awaiting credit release
  | 'completed';           // Process complete

export type DBAssetGrade = 'A' | 'B' | 'C' | 'D';

export type DBTreatmentOutcome = 'recycled' | 'refurbished' | 'resold' | 'disposed' | 'pending';

export interface DBQCReport {
  checklist: DBQCChecklistItem[];
  images: DBQCImage[];
  notes?: string;
  grade?: DBAssetGrade;
  reviewer?: string;
  completedAt?: Date;
}

export interface DBQCChecklistItem {
  id: string;
  label: string;
  passed: boolean;
  notes?: string;
}

export interface DBQCImage {
  id: string;
  url: string;
  type: 'front' | 'back' | 'left' | 'right' | 'screen' | 'keyboard' | 'ports' | 'damage' | 'other';
  caption?: string;
  uploadedAt: Date;
}

// ============================================================================
// BATCH ENTITY
// ============================================================================

export interface DBBatch {
  id: string;                    // Primary Key: 'bat-{uuid}'
  enterpriseId: string;          // Foreign Key → Enterprise
  name: string;
  description?: string;
  status: DBBatchStatus;

  // Computed metrics (denormalized)
  assetCount: number;
  acceptedCount: number;
  rejectedCount: number;
  pendingCount: number;
  estimatedValue: number;
  totalPayout: number;

  createdAt: Date;
  updatedAt?: Date;
}

export type DBBatchStatus =
  | 'draft'
  | 'active'
  | 'pending_approval'
  | 'approved'
  | 'completed'
  | 'cancelled';

// ============================================================================
// SUBMISSION / EVALUATION ENTITIES
// ============================================================================

export interface DBSubmission {
  id: string;                    // Primary Key: 'sub-{uuid}'
  assetId: string;               // Foreign Key → Asset (unique)
  subUserId: string;             // Foreign Key → SubUser

  // Device confirmation
  deviceConfirmed: boolean;

  // Photos
  photos: DBPhotoSet;

  // Checklists
  functionalChecks: DBFunctionalChecks;
  cosmeticChecklist?: DBCosmeticChecklist;
  accessories?: DBAccessories;

  // Location & Declaration
  location?: DBLocationData;
  declaration: DBDeclaration;

  submittedAt: Date;
}

export interface DBPhotoSet {
  topLid?: string;               // URL to stored image
  bottom?: string;
  leftSide?: string;
  rightSide?: string;
  screen?: string;
  keyboard?: string;
  trackpad?: string;
  portsCloseup?: string;
  charger?: string;
  damage?: string;
}

export interface DBFunctionalChecks {
  powersOn?: boolean;
  batteryLife?: '30min' | '1hr' | '2hr' | '3hr_plus';
  screenCondition?: 'good' | 'minor_issues' | 'major_issues';
  keyboardWorking?: boolean;
  trackpadWorking?: boolean;
  allPortsWorking?: boolean;
  hingesCondition?: 'stable' | 'wobbly' | 'broken';
  audioWorking?: boolean;
  cameraWorking?: boolean;
  micWorking?: boolean;
  wifiWorking?: boolean;
}

export interface DBCosmeticChecklist {
  bodyCondition?: 'excellent' | 'good' | 'fair' | 'poor';
  scratchSeverity?: 'none' | 'minor' | 'major';
  dentSeverity?: 'none' | 'minor' | 'major';
}

export interface DBAccessories {
  chargerIncluded?: boolean;
  originalBoxIncluded?: boolean;
  additionalItems?: string;
}

export interface DBLocationData {
  latitude?: number;
  longitude?: number;
  address?: string;
  capturedAt?: Date;
}

export interface DBDeclaration {
  accepted: boolean;
  signature?: string;            // Base64 or URL
  signedAt?: Date;
}

// ============================================================================
// REVIEW ENTITIES
// ============================================================================

export interface DBRemoteReview {
  id: string;                    // Primary Key: 'rev-{uuid}'
  assetId: string;               // Foreign Key → Asset (unique)
  reviewerId: string;            // Foreign Key → User

  decision: 'conditionally_accepted' | 'rejected';
  notes?: string;
  reason?: string;               // For rejections

  reviewedAt: Date;
}

export interface DBFacilityQC {
  id: string;                    // Primary Key: 'fqc-{uuid}'
  assetId: string;               // Foreign Key → Asset (unique)
  reviewerId: string;            // Foreign Key → User

  checklistData: DBFacilityQCChecklist;
  decision: 'final_accept' | 'final_reject';
  grade?: DBAssetGrade;
  discrepancies?: string[];
  notes?: string;

  completedAt: Date;
}

export interface DBFacilityQCChecklist {
  verifyPhotos: { name: string; items: DBQCChecklistItem[] };
  cosmeticInspection: { name: string; items: DBQCChecklistItem[] };
  functionalTests: { name: string; items: DBQCChecklistItem[] };
  portTesting: { name: string; items: DBQCChecklistItem[] };
  batteryHealth: { name: string; items: DBQCChecklistItem[] };
  storageCheck: { name: string; items: DBQCChecklistItem[] };
  biosAccess: { name: string; items: DBQCChecklistItem[] };
}

export interface DBDispute {
  id: string;                    // Primary Key: 'dis-{uuid}'
  assetId: string;               // Foreign Key → Asset
  raisedBy: string;              // Foreign Key → User/SubUser

  reason: string;
  description?: string;
  evidence?: string[];           // URLs to supporting docs

  resolution?: 'upheld' | 'overturned' | 'partial';
  resolvedBy?: string;           // Foreign Key → User
  resolverNotes?: string;
  resolvedAt?: Date;

  createdAt: Date;
}

// ============================================================================
// LOGISTICS ENTITIES
// ============================================================================

export interface DBPickupLocation {
  id: string;                    // Primary Key: 'loc-{uuid}'
  enterpriseId: string;          // Foreign Key → Enterprise

  name: string;                  // e.g., "Bangalore HQ - IT Office"
  address: string;
  city: string;
  state?: string;
  pinCode: string;
  country: string;

  contactPerson: string;
  contactPhone: string;
  operatingHours?: string;       // e.g., "Mon-Fri, 9 AM - 6 PM"
  specialInstructions?: string;

  isDefault: boolean;
  isActive: boolean;

  createdAt: Date;
  updatedAt?: Date;
}

export interface DBPickupRequest {
  id: string;                    // Primary Key: 'pickup-{uuid}'
  enterpriseId: string;          // Foreign Key → Enterprise
  locationId: string;            // Foreign Key → PickupLocation

  // Assets in this pickup
  assetIds: string[];            // Foreign Keys → Asset[]
  assets: DBAssetPickupRecord[]; // Detailed status per asset

  // Scheduling
  preferredDate?: Date;
  preferredTimeSlot: DBPickupTimeSlot;
  scheduledDate?: Date;

  // Assignment
  logisticsUserId?: string;      // Foreign Key → LogisticsUser
  assignedAt?: Date;
  assignedBy?: string;           // Foreign Key → User (logistics admin)

  // Status
  status: DBPickupRequestStatus;
  priority: 'normal' | 'urgent';

  // Results
  pickedAssetIds: string[];
  failedAssetIds: string[];

  // Timestamps
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelledBy?: string;
  cancellationReason?: string;

  // Notes
  itAdminNotes?: string;
  logisticsNotes?: string;

  createdBy: string;             // Foreign Key → User (IT Admin)
  createdAt: Date;
  updatedAt?: Date;
}

export interface DBAssetPickupRecord {
  assetId: string;               // Foreign Key → Asset
  subUserId: string;             // Foreign Key → SubUser (who to collect from)
  status: 'pending' | 'picked_up' | 'qc_failed' | 'no_show' | 'removed';

  pickedUpAt?: Date;
  notes?: string;
  qcResult?: DBOnSiteQCResult;
}

export interface DBOnSiteQCResult {
  serialMatch: boolean;
  powersOn: boolean;
  damageMatch: boolean;
  notes?: string;
}

export type DBPickupTimeSlot =
  | 'morning'     // 9 AM - 12 PM
  | 'afternoon'   // 12 PM - 3 PM
  | 'evening';    // 3 PM - 6 PM

export type DBPickupRequestStatus =
  | 'pending_assignment'   // Awaiting logistics admin
  | 'assigned'             // Logistics user assigned
  | 'scheduled'            // Date confirmed
  | 'in_progress'          // Pickup underway
  | 'completed'            // All assets processed
  | 'partially_completed'  // Some assets picked
  | 'cancelled';           // Request cancelled

export interface DBLogisticsUser {
  id: string;                    // Primary Key: 'logi-{uuid}'
  name: string;
  phone?: string;
  email?: string;
  status: 'active' | 'inactive';
  companyId?: string;            // Foreign Key → LogisticsCompany
  createdAt: Date;
}

export interface DBOnSiteQC {
  id: string;                    // Primary Key: 'osqc-{uuid}'
  pickupRequestId: string;       // Foreign Key → PickupRequest
  assetId: string;               // Foreign Key → Asset
  logisticsUserId: string;       // Foreign Key → LogisticsUser

  serialMatch: boolean;
  powersOn: boolean;
  condition: 'good' | 'worse' | 'failed';
  notes?: string;

  photos?: {
    device?: string;             // URL
    handover?: string;           // URL
  };
  signature?: string;            // Base64 or URL

  createdAt: Date;
}

// ============================================================================
// FINANCIAL ENTITIES
// ============================================================================

export interface DBEnterpriseWallet {
  id: string;                    // Primary Key: 'wal-{uuid}'
  enterpriseId: string;          // Foreign Key → Enterprise (unique)

  availableBalance: number;      // Credits ready for redemption
  pendingBalance: number;        // Credits from devices still in QC
  totalEarned: number;           // Lifetime credits earned
  totalRedeemed: number;         // Lifetime credits redeemed

  updatedAt: Date;
}

export interface DBCreditTransaction {
  id: string;                    // Primary Key: 'txn-{uuid}'
  enterpriseId: string;          // Foreign Key → Enterprise
  walletId: string;              // Foreign Key → EnterpriseWallet

  type: 'credit' | 'withdrawal' | 'redemption' | 'adjustment';
  amount: number;

  referenceIds?: string[];       // Asset IDs or Order ID
  description?: string;

  status: 'pending' | 'completed' | 'failed';
  processedAt?: Date;

  createdBy?: string;            // Foreign Key → User
  createdAt: Date;
}

export interface DBPayout {
  id: string;                    // Primary Key: 'pay-{uuid}'
  enterpriseId: string;          // Foreign Key → Enterprise

  assetIds: string[];            // Foreign Keys → Asset[]
  amount: number;

  status: 'pending' | 'processing' | 'completed' | 'failed';
  transactionId?: string;        // External payment reference

  processedBy?: string;          // Foreign Key → User
  processedAt?: Date;

  createdAt: Date;
}

export interface DBProductOrder {
  id: string;                    // Primary Key: 'ord-{uuid}'
  enterpriseId: string;          // Foreign Key → Enterprise

  products: DBOrderItem[];
  creditsUsed: number;
  cashValue: number;
  redemptionType: 'asus' | 'comprint';

  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  trackingNumber?: string;

  createdAt: Date;
  updatedAt?: Date;
}

export interface DBOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  creditCost: number;
}

// ============================================================================
// EPR / COMPLIANCE ENTITIES
// ============================================================================

export interface DBEPRCertificate {
  id: string;                    // Primary Key: 'epr-{uuid}'
  enterpriseId: string;          // Foreign Key → Enterprise

  certificateNumber: string;     // Unique, official number
  assetIds: string[];            // Foreign Keys → Asset[]

  issueDate: Date;
  expiryDate?: Date;

  totalWeightKg: number;
  treatmentSummary: {
    recycled: number;
    refurbished: number;
    disposed: number;
  };

  recyclerPartner?: string;
  pdfUrl?: string;               // URL to certificate PDF
  qrCodeUrl?: string;            // URL for verification

  createdAt: Date;
}

// ============================================================================
// AUDIT & NOTIFICATION ENTITIES
// ============================================================================

export interface DBAuditLog {
  id: string;                    // Primary Key: 'aud-{uuid}'

  entityType: 'asset' | 'batch' | 'pickup' | 'user' | 'enterprise' | 'payout';
  entityId: string;

  action: string;                // e.g., 'status_change', 'created', 'updated'

  fromStatus?: string;
  toStatus?: string;

  actorId?: string;              // Foreign Key → User
  actorType?: 'user' | 'system';

  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;

  createdAt: Date;
}

export interface DBNotification {
  id: string;                    // Primary Key: 'not-{uuid}'

  recipientType: 'user' | 'enterprise' | 'role';
  recipientId: string;           // Foreign Key based on type

  channel: 'in_app' | 'email' | 'whatsapp' | 'sms';
  type: 'info' | 'success' | 'warning' | 'error';

  title: string;
  message: string;
  actionUrl?: string;

  status: 'sent' | 'delivered' | 'read' | 'failed';
  readAt?: Date;

  createdAt: Date;
}

// ============================================================================
// COMMON TYPES
// ============================================================================

export interface DBAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  country?: string;
}

// ============================================================================
// INDEXES (for backend reference)
// ============================================================================

/**
 * Recommended Database Indexes:
 *
 * Enterprise:
 *   - id (PK)
 *   - gstNumber (unique)
 *
 * User:
 *   - id (PK)
 *   - email (unique)
 *   - enterpriseId, role (composite)
 *
 * SubUser:
 *   - id (PK)
 *   - email, enterpriseId (composite unique)
 *   - token (for OTP lookup)
 *
 * Asset:
 *   - id (PK)
 *   - serialNumber (unique)
 *   - enterpriseId, status (composite)
 *   - batchId (for batch operations)
 *   - assignedSubUserId (for sub-user queries)
 *
 * Batch:
 *   - id (PK)
 *   - enterpriseId, status (composite)
 *
 * PickupRequest:
 *   - id (PK)
 *   - enterpriseId, status (composite)
 *   - logisticsUserId, status (composite)
 *   - locationId
 *
 * PickupLocation:
 *   - id (PK)
 *   - enterpriseId, isActive (composite)
 *
 * Submission:
 *   - id (PK)
 *   - assetId (unique)
 *
 * RemoteReview:
 *   - id (PK)
 *   - assetId (unique)
 *
 * FacilityQC:
 *   - id (PK)
 *   - assetId (unique)
 *
 * AuditLog:
 *   - id (PK)
 *   - entityType, entityId (composite)
 *   - actorId
 *   - createdAt (for time-range queries)
 *
 * Notification:
 *   - id (PK)
 *   - recipientId, status (composite)
 *   - createdAt (for time-range queries)
 */

// ============================================================================
// CROSS-STORE UPDATE REQUIREMENTS
// ============================================================================

/**
 * When an asset's status changes, the following stores MUST be updated:
 *
 * 1. assigned:
 *    - assetStore: Update status
 *    - subUserStore: Track assignment (optional)
 *    - notificationStore: Notify SubUser
 *    - auditStore: Log transition
 *
 * 2. submitted:
 *    - assetStore: Update status
 *    - submissionStore: Create submission record
 *    - notificationStore: Notify IT Admin
 *    - auditStore: Log transition
 *
 * 3. conditionally_accepted / remote_rejected:
 *    - assetStore: Update status
 *    - reviewStore: Create remote review record
 *    - notificationStore: Notify IT Admin, SubUser
 *    - auditStore: Log transition
 *
 * 4. ready_for_pickup:
 *    - assetStore: Update status
 *    - notificationStore: Notify IT Admin
 *    - auditStore: Log transition
 *
 * 5. pickup_requested:
 *    - assetStore: Update status
 *    - pickupStore: Create pickup request
 *    - notificationStore: Notify Logistics Admin, SubUser
 *    - auditStore: Log transition
 *
 * 6. pickup_scheduled:
 *    - assetStore: Update status
 *    - pickupStore: Update request status
 *    - notificationStore: Notify IT Admin, SubUser, Logistics User
 *    - auditStore: Log transition
 *
 * 7. picked_up:
 *    - assetStore: Update status
 *    - pickupStore: Update asset pickup record
 *    - logisticsStore: Create on-site QC record
 *    - notificationStore: Notify IT Admin, SubUser, Logistics Admin
 *    - auditStore: Log transition
 *
 * 8. in_transit:
 *    - assetStore: Update status
 *    - notificationStore: Notify IT Admin
 *    - auditStore: Log transition
 *
 * 9. facility_qc → final_accepted:
 *    - assetStore: Update status, set grade
 *    - reviewStore: Create facility QC record
 *    - notificationStore: Notify IT Admin, OPS Manager
 *    - auditStore: Log transition
 *
 * 10. payout_pending:
 *    - assetStore: Update status
 *    - enterpriseStore: Update pending credits
 *    - notificationStore: Notify Org Admin
 *    - auditStore: Log transition
 *
 * 11. completed:
 *    - assetStore: Update status
 *    - payoutStore: Create payout record
 *    - enterpriseStore: Update wallet balance
 *    - notificationStore: Notify Org Admin
 *    - auditStore: Log transition
 */
