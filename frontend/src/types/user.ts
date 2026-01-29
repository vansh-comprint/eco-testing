// User types - V3 Updated

export type UserRole =
  | 'super_admin'
  | 'main_admin'
  | 'ops_admin'              // OPS Admin - reviews submissions, manages operations
  | 'technician'
  | 'it_admin'
  | 'org_admin'              // V3: Was 'cfo' - Organization Admin (enterprise level)
  | 'sub_user'               // Employee who submits devices
  | 'logistics_admin'        // Logistics Admin - assigns pickups to logistics users
  | 'logistics_user';        // Logistics User - performs pickups and on-site QC

export interface User {
  id: string;
  enterpriseId?: string;
  branchId?: string;         // V3: IT Admin belongs to a branch
  role: UserRole;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  department?: string;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface SubUser {
  id: string;
  enterpriseId: string;
  name?: string;
  email: string;
  phone?: string;
  department?: string;
  employeeId?: string;
  designation?: string;
  token: string;
  tokenExpiresAt: Date;
  createdAt: Date;
}

export interface CreateUserInput {
  enterpriseId?: string;
  branchId?: string;         // V3: Required for IT Admin
  role: UserRole;
  name: string;
  email: string;
  phone?: string;
  department?: string;
}

export interface CreateSubUserInput {
  enterprise_id: string;
  name?: string;
  email: string;
  phone?: string;
  department?: string;
  employee_id?: string;
  designation?: string;
}

// Role permissions - V3 Updated
export const rolePermissions: Record<UserRole, string[]> = {
  super_admin: ['*'],
  main_admin: ['view_all_enterprises', 'manage_technicians', 'handle_escalations', 'override_decisions', 'view_reports'],
  ops_admin: ['review_submissions', 'approve_for_pickup', 'view_all_assets', 'manage_remote_review_queue', 'manage_enterprise_applications'],
  technician: ['remote_review', 'facility_qc', 'handle_disputes'],
  it_admin: ['manage_assets', 'manage_batches', 'view_payouts', 'submit_disputes', 'manage_enterprise_settings', 'manage_pickup_locations', 'submit_pickup_for_approval'],
  org_admin: ['approve_pickups', 'manage_branches', 'manage_it_admins', 'view_financial_reports', 'approve_high_value', 'view_enterprise_analytics', 'view_epr_certificates', 'view_wallet'],
  sub_user: ['view_assigned_assets', 'submit_device_evaluation'],
  logistics_admin: ['view_pickup_requests', 'assign_pickups', 'manage_logistics_users', 'view_pickup_analytics'],
  logistics_user: ['view_assigned_pickups', 'perform_onsite_qc', 'collect_devices', 'upload_pickup_proof'],
};

// Role labels for display - V3 Updated
export const roleLabels: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  main_admin: 'Main Admin',
  ops_admin: 'OPS Admin',
  technician: 'Technician',
  it_admin: 'IT Admin',
  org_admin: 'Organization Admin',  // V3: Was CFO
  sub_user: 'Employee',
  logistics_admin: 'Logistics Admin',
  logistics_user: 'Logistics User',
};

// Role hierarchy for permission checks
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 5,
  main_admin: 4,
  ops_admin: 4,
  org_admin: 3,      // V3: Was cfo
  it_admin: 2,
  technician: 2,
  logistics_admin: 2,
  logistics_user: 1,
  sub_user: 0,
};

// Org Admin approval thresholds (V3 - was CFO)
export const orgAdminApprovalThresholds = {
  batchSize: 50,     // Batches with 50+ assets require Org Admin review
  batchValue: 500000, // Batches worth ₹5L+ require Org Admin review
};

// Deprecated: Use orgAdminApprovalThresholds instead
export const cfoApprovalThresholds = orgAdminApprovalThresholds;
