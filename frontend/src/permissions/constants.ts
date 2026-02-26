/**
 * STATUS: COMPLETE
 * Permission constants mirroring backend/app/core/permissions.py
 * Single source of truth for frontend permission checks.
 */

// All available permissions in the system, organized by domain
export const Permission = {
  // Special permission
  ALL: '*',

  // Enterprise Management
  VIEW_ALL_ENTERPRISES: 'view_all_enterprises',
  MANAGE_ENTERPRISES: 'manage_enterprises',
  MANAGE_ENTERPRISE_APPLICATIONS: 'manage_enterprise_applications',
  MANAGE_ENTERPRISE_SETTINGS: 'manage_enterprise_settings',

  // Branch Management
  MANAGE_BRANCHES: 'manage_branches',
  VIEW_BRANCH_ANALYTICS: 'view_branch_analytics',

  // User Management
  USER_READ: 'user_read',
  USER_CREATE: 'user_create',
  USER_UPDATE: 'user_update',
  USER_DELETE: 'user_delete',
  MANAGE_REVIEWERS: 'manage_reviewers',
  MANAGE_IT_ADMINS: 'manage_it_admins',
  MANAGE_LOGISTICS_USERS: 'manage_logistics_users',
  LOGISTICS_MANAGE: 'logistics_manage',

  // Employee Management
  EMPLOYEE_READ: 'employee_read',
  EMPLOYEE_CREATE: 'employee_create',
  EMPLOYEE_UPDATE: 'employee_update',
  EMPLOYEE_DELETE: 'employee_delete',
  MANAGE_EMPLOYEES: 'manage_employees',

  // Asset Management
  ASSET_READ: 'asset_read',
  ASSET_CREATE: 'asset_create',
  ASSET_UPDATE: 'asset_update',
  ASSET_DELETE: 'asset_delete',
  MANAGE_ASSETS: 'manage_assets',
  VIEW_ALL_ASSETS: 'view_all_assets',
  VIEW_ASSIGNED_ASSETS: 'view_assigned_assets',

  // Batch Management
  BATCH_READ: 'batch_read',
  BATCH_CREATE: 'batch_create',
  BATCH_UPDATE: 'batch_update',
  BATCH_DELETE: 'batch_delete',
  BATCH_APPROVE: 'batch_approve',
  MANAGE_BATCHES: 'manage_batches',
  SUBMIT_PICKUP_FOR_APPROVAL: 'submit_pickup_for_approval',

  // Branch CRUD
  BRANCH_READ: 'branch_read',
  BRANCH_CREATE: 'branch_create',
  BRANCH_UPDATE: 'branch_update',
  BRANCH_DELETE: 'branch_delete',

  // Enterprise CRUD
  ENTERPRISE_READ: 'enterprise_read',
  ENTERPRISE_CREATE: 'enterprise_create',
  ENTERPRISE_UPDATE: 'enterprise_update',
  ENTERPRISE_DELETE: 'enterprise_delete',

  // Submission
  SUBMISSION_VIEW: 'submission_view',
  SUBMISSION_CREATE: 'submission_create',
  SUBMISSION_UPDATE: 'submission_update',
  SUBMIT_DEVICE_EVALUATION: 'submit_device_evaluation',
  VIEW_SUBMISSIONS: 'view_submissions',

  // Review
  REVIEW_VIEW: 'review_view',
  REVIEW_CREATE: 'review_create',
  REVIEW_UPDATE: 'review_update',
  REVIEW_SUBMISSIONS: 'review_submissions',
  REMOTE_REVIEW: 'remote_review',
  FACILITY_QC: 'facility_qc',
  MANAGE_REMOTE_REVIEW_QUEUE: 'manage_remote_review_queue',

  // Pickup
  PICKUP_VIEW: 'pickup_view',
  PICKUP_CREATE: 'pickup_create',
  PICKUP_UPDATE: 'pickup_update',
  PICKUP_ASSIGN: 'pickup_assign',
  APPROVE_PICKUPS: 'approve_for_pickup',
  APPROVE_HIGH_VALUE: 'approve_high_value',
  MANAGE_PICKUP_LOCATIONS: 'manage_pickup_locations',
  VIEW_PICKUP_REQUESTS: 'view_pickup_requests',
  ASSIGN_PICKUPS: 'assign_pickups',
  VIEW_ASSIGNED_PICKUPS: 'view_assigned_pickups',
  PERFORM_ONSITE_QC: 'perform_onsite_qc',
  COLLECT_DEVICES: 'collect_devices',
  UPLOAD_PICKUP_PROOF: 'upload_pickup_proof',
  VIEW_PICKUP_ANALYTICS: 'view_pickup_analytics',

  // Financial / Payouts
  PAYOUT_VIEW: 'payout_view',
  PAYOUT_CREATE: 'payout_create',
  PAYOUT_PROCESS: 'payout_process',
  VIEW_PAYOUTS: 'view_payouts',
  PROCESS_PAYOUTS: 'process_payouts',
  VIEW_FINANCIAL_REPORTS: 'view_financial_reports',
  VIEW_WALLET: 'view_wallet',
  VIEW_ENTERPRISE_ANALYTICS: 'view_enterprise_analytics',

  // Notifications
  NOTIFICATION_CREATE: 'notification_create',

  // Disputes
  DISPUTE_VIEW: 'dispute_view',
  DISPUTE_CREATE: 'dispute_create',
  DISPUTE_MANAGE: 'dispute_manage',
  SUBMIT_DISPUTES: 'submit_disputes',
  HANDLE_DISPUTES: 'handle_disputes',
  HANDLE_ESCALATIONS: 'handle_escalations',
  OVERRIDE_DECISIONS: 'override_decisions',

  // Reports & Analytics
  VIEW_REPORTS: 'view_reports',
  VIEW_EPR_CERTIFICATES: 'view_epr_certificates',
  MANAGE_EPR_CERTIFICATES: 'manage_epr_certificates',

  // Pricing & Analytics
  PRICING_READ: 'pricing_read',
  PRICING_MANAGE: 'pricing_manage',
  ANALYTICS_READ: 'analytics_read',
} as const;

export type PermissionValue = (typeof Permission)[keyof typeof Permission];
