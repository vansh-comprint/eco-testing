-- EcoTribe Database Schema - Initial Migration
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM (
  'super_admin',
  'main_admin',
  'it_admin',
  'cfo',
  'sub_user',
  'logistics_admin',
  'logistics_user'
);

CREATE TYPE asset_status AS ENUM (
  'pending_assignment',
  'assigned',
  'check_in_started',
  'submitted',
  'remote_review',
  'conditionally_accepted',
  'remote_rejected',
  'disputed',
  'ready_for_pickup',
  'pickup_requested',
  'pickup_scheduled',
  'pickup_failed_qc',
  'picked_up',
  'in_transit',
  'facility_qc',
  'final_accepted',
  'final_rejected',
  'payout_pending',
  'completed'
);

CREATE TYPE asset_grade AS ENUM ('A', 'B', 'C', 'D');

CREATE TYPE treatment_outcome AS ENUM ('recycled', 'refurbished', 'resold', 'disposed', 'pending');

CREATE TYPE batch_status AS ENUM (
  'draft',
  'active',
  'pending_cfo_approval',
  'approved',
  'completed',
  'cancelled'
);

CREATE TYPE pickup_time_slot AS ENUM ('morning', 'afternoon', 'evening');

CREATE TYPE pickup_request_status AS ENUM (
  'pending_assignment',
  'assigned',
  'scheduled',
  'in_progress',
  'completed',
  'partially_completed',
  'cancelled'
);

CREATE TYPE pickup_asset_status AS ENUM ('pending', 'picked_up', 'qc_failed', 'no_show', 'removed');

CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'whatsapp', 'sms');

CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'error');

CREATE TYPE notification_status AS ENUM ('sent', 'delivered', 'read', 'failed');

CREATE TYPE transaction_type AS ENUM ('credit', 'withdrawal', 'redemption', 'adjustment');

CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed');

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Enterprise Table
CREATE TABLE enterprises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  legal_name TEXT,
  gst_number TEXT UNIQUE,
  pan_number TEXT,

  -- Address (JSONB for flexibility)
  address JSONB,

  industry TEXT,
  employee_count INTEGER,

  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,

  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Users Table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  enterprise_id TEXT REFERENCES enterprises(id) ON DELETE CASCADE,

  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL,

  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),

  password_hash TEXT,
  last_login_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- SubUsers Table (Employees)
CREATE TABLE sub_users (
  id TEXT PRIMARY KEY,
  enterprise_id TEXT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  department TEXT,

  status TEXT NOT NULL DEFAULT 'pending_invite' CHECK (status IN ('pending_invite', 'active', 'inactive')),

  -- OTP Authentication
  token TEXT,
  token_expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,

  UNIQUE(email, enterprise_id)
);

-- ============================================================================
-- ASSET MANAGEMENT
-- ============================================================================

-- Batches Table
CREATE TABLE batches (
  id TEXT PRIMARY KEY,
  enterprise_id TEXT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  status batch_status NOT NULL DEFAULT 'draft',

  -- Computed metrics (denormalized for performance)
  asset_count INTEGER NOT NULL DEFAULT 0,
  accepted_count INTEGER NOT NULL DEFAULT 0,
  rejected_count INTEGER NOT NULL DEFAULT 0,
  pending_count INTEGER NOT NULL DEFAULT 0,
  estimated_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_payout DECIMAL(10, 2) NOT NULL DEFAULT 0,

  -- CFO Approval
  requires_cfo_approval BOOLEAN NOT NULL DEFAULT false,

  -- Tracking
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Assets Table
CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  enterprise_id TEXT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  batch_id TEXT REFERENCES batches(id) ON DELETE SET NULL,

  -- Device Identification
  serial_number TEXT UNIQUE NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  asset_tag TEXT,

  -- Specifications (JSONB for flexibility)
  specs JSONB,
  purchase_date DATE,

  -- Assignment
  assigned_sub_user_id TEXT REFERENCES sub_users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,

  -- Status & Grading
  status asset_status NOT NULL DEFAULT 'pending_assignment',
  grade asset_grade,

  -- Pricing
  base_price DECIMAL(10, 2),
  final_price DECIMAL(10, 2),

  -- Treatment/EPR
  treatment_outcome treatment_outcome,
  treatment_date TIMESTAMPTZ,
  recycler_partner_id TEXT,
  weight_kg DECIMAL(8, 3),
  epr_certificate_id TEXT,

  -- QC Data (denormalized)
  qc_report JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- ============================================================================
-- SUBMISSION & EVALUATION
-- ============================================================================

-- Submissions Table
CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  asset_id TEXT UNIQUE NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  sub_user_id TEXT NOT NULL REFERENCES sub_users(id) ON DELETE CASCADE,

  device_confirmed BOOLEAN NOT NULL,

  -- Photos (JSONB with URLs)
  photos JSONB NOT NULL DEFAULT '{}',

  -- Checklists
  functional_checks JSONB NOT NULL DEFAULT '{}',
  cosmetic_checklist JSONB,
  accessories JSONB,

  -- Location & Declaration
  location JSONB,
  declaration JSONB NOT NULL,

  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- REVIEW & QC
-- ============================================================================

-- Remote Reviews Table
CREATE TABLE remote_reviews (
  id TEXT PRIMARY KEY,
  asset_id TEXT UNIQUE NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  technician_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  decision TEXT NOT NULL CHECK (decision IN ('conditionally_accepted', 'rejected')),
  notes TEXT,
  reason TEXT,

  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Facility QC Table
CREATE TABLE facility_qc (
  id TEXT PRIMARY KEY,
  asset_id TEXT UNIQUE NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  technician_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  checklist_data JSONB NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('final_accept', 'final_reject')),
  grade asset_grade,
  discrepancies TEXT[],
  notes TEXT,

  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- On-Site QC Table (Logistics)
CREATE TABLE on_site_qc (
  id TEXT PRIMARY KEY,
  pickup_request_id TEXT NOT NULL,
  asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  logistics_user_id TEXT NOT NULL,

  serial_match BOOLEAN NOT NULL,
  powers_on BOOLEAN NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('good', 'worse', 'failed')),
  notes TEXT,

  photos JSONB,
  signature TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Disputes Table
CREATE TABLE disputes (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  raised_by TEXT NOT NULL,

  reason TEXT NOT NULL,
  description TEXT,
  evidence TEXT[],

  resolution TEXT CHECK (resolution IN ('upheld', 'overturned', 'partial')),
  resolved_by TEXT,
  resolver_notes TEXT,
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- LOGISTICS
-- ============================================================================

-- Pickup Locations Table
CREATE TABLE pickup_locations (
  id TEXT PRIMARY KEY,
  enterprise_id TEXT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  pin_code TEXT,
  country TEXT DEFAULT 'India',

  contact_person TEXT,
  contact_phone TEXT,
  operating_hours TEXT,
  special_instructions TEXT,

  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Logistics Users Table
CREATE TABLE logistics_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  company_id TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pickup Requests Table
CREATE TABLE pickup_requests (
  id TEXT PRIMARY KEY,
  enterprise_id TEXT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL REFERENCES pickup_locations(id) ON DELETE RESTRICT,

  -- Assets in this pickup (array of asset IDs)
  asset_ids TEXT[] NOT NULL,

  -- Asset pickup records (JSONB array)
  assets JSONB NOT NULL DEFAULT '[]',

  -- Scheduling
  preferred_date DATE,
  preferred_time_slot pickup_time_slot NOT NULL,
  scheduled_date TIMESTAMPTZ,

  -- Assignment
  logistics_user_id TEXT REFERENCES logistics_users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  assigned_by TEXT REFERENCES users(id) ON DELETE SET NULL,

  -- Status
  status pickup_request_status NOT NULL DEFAULT 'pending_assignment',
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent')),

  -- Results
  picked_asset_ids TEXT[] NOT NULL DEFAULT '{}',
  failed_asset_ids TEXT[] NOT NULL DEFAULT '{}',

  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_by TEXT,
  cancellation_reason TEXT,

  -- Notes
  it_admin_notes TEXT,
  logistics_notes TEXT,

  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- ============================================================================
-- FINANCIAL
-- ============================================================================

-- Enterprise Wallets Table
CREATE TABLE enterprise_wallets (
  id TEXT PRIMARY KEY,
  enterprise_id TEXT UNIQUE NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  available_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
  pending_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_earned DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_redeemed DECIMAL(10, 2) NOT NULL DEFAULT 0,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Credit Transactions Table
CREATE TABLE credit_transactions (
  id TEXT PRIMARY KEY,
  enterprise_id TEXT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  wallet_id TEXT NOT NULL REFERENCES enterprise_wallets(id) ON DELETE CASCADE,

  type transaction_type NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,

  reference_ids TEXT[],
  description TEXT,

  status transaction_status NOT NULL DEFAULT 'pending',
  processed_at TIMESTAMPTZ,

  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payouts Table
CREATE TABLE payouts (
  id TEXT PRIMARY KEY,
  enterprise_id TEXT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  batch_id TEXT REFERENCES batches(id) ON DELETE SET NULL,

  amount DECIMAL(10, 2) NOT NULL,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'completed', 'failed')),
  reference_id TEXT,
  items JSONB NOT NULL,

  processed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Product Orders Table
CREATE TABLE product_orders (
  id TEXT PRIMARY KEY,
  enterprise_id TEXT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  products JSONB NOT NULL,
  credits_used DECIMAL(10, 2) NOT NULL,
  cash_value DECIMAL(10, 2) NOT NULL,
  redemption_type TEXT NOT NULL CHECK (redemption_type IN ('asus', 'comprint')),

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  tracking_number TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- ============================================================================
-- EPR / COMPLIANCE
-- ============================================================================

-- EPR Certificates Table
CREATE TABLE epr_certificates (
  id TEXT PRIMARY KEY,
  enterprise_id TEXT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  certificate_number TEXT UNIQUE NOT NULL,
  asset_ids TEXT[] NOT NULL,

  issue_date DATE NOT NULL,
  expiry_date DATE,

  total_weight_kg DECIMAL(10, 3) NOT NULL,
  treatment_summary JSONB NOT NULL,

  recycler_partner TEXT,
  pdf_url TEXT,
  qr_code_url TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- AUDIT & NOTIFICATIONS
-- ============================================================================

-- Audit Logs Table
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,

  entity_type TEXT NOT NULL CHECK (entity_type IN ('asset', 'batch', 'pickup', 'user', 'enterprise', 'payout')),
  entity_id TEXT NOT NULL,

  action TEXT NOT NULL,

  from_status TEXT,
  to_status TEXT,

  actor_id TEXT,
  actor_type TEXT DEFAULT 'user' CHECK (actor_type IN ('user', 'system')),

  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications Table
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,

  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('user', 'enterprise', 'role')),
  recipient_id TEXT NOT NULL,

  channel notification_channel NOT NULL DEFAULT 'in_app',
  type notification_type NOT NULL,

  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,

  status notification_status NOT NULL DEFAULT 'sent',
  read_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Enterprise Indexes
CREATE INDEX idx_enterprises_status ON enterprises(status);

-- User Indexes
CREATE INDEX idx_users_enterprise_role ON users(enterprise_id, role);
CREATE INDEX idx_users_status ON users(status);

-- SubUser Indexes
CREATE INDEX idx_sub_users_enterprise ON sub_users(enterprise_id);
CREATE INDEX idx_sub_users_token ON sub_users(token) WHERE token IS NOT NULL;
CREATE INDEX idx_sub_users_status ON sub_users(status);

-- Asset Indexes
CREATE INDEX idx_assets_enterprise_status ON assets(enterprise_id, status);
CREATE INDEX idx_assets_batch ON assets(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX idx_assets_assigned_sub_user ON assets(assigned_sub_user_id) WHERE assigned_sub_user_id IS NOT NULL;
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_created_at ON assets(created_at);

-- Batch Indexes
CREATE INDEX idx_batches_enterprise_status ON batches(enterprise_id, status);
CREATE INDEX idx_batches_created_at ON batches(created_at);

-- Submission Indexes
CREATE INDEX idx_submissions_sub_user ON submissions(sub_user_id);
CREATE INDEX idx_submissions_submitted_at ON submissions(submitted_at);

-- Review Indexes
CREATE INDEX idx_remote_reviews_technician ON remote_reviews(technician_id);
CREATE INDEX idx_facility_qc_technician ON facility_qc(technician_id);

-- Pickup Indexes
CREATE INDEX idx_pickup_locations_enterprise_active ON pickup_locations(enterprise_id, is_active);
CREATE INDEX idx_pickup_requests_enterprise_status ON pickup_requests(enterprise_id, status);
CREATE INDEX idx_pickup_requests_logistics_user ON pickup_requests(logistics_user_id) WHERE logistics_user_id IS NOT NULL;
CREATE INDEX idx_pickup_requests_location ON pickup_requests(location_id);
CREATE INDEX idx_pickup_requests_created_at ON pickup_requests(created_at);

-- Financial Indexes
CREATE INDEX idx_credit_transactions_enterprise ON credit_transactions(enterprise_id);
CREATE INDEX idx_credit_transactions_wallet ON credit_transactions(wallet_id);
CREATE INDEX idx_payouts_enterprise ON payouts(enterprise_id);

-- Audit Indexes
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Notification Indexes
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_enterprises_updated_at BEFORE UPDATE ON enterprises
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sub_users_updated_at BEFORE UPDATE ON sub_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pickup_locations_updated_at BEFORE UPDATE ON pickup_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pickup_requests_updated_at BEFORE UPDATE ON pickup_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enterprise_wallets_updated_at BEFORE UPDATE ON enterprise_wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_orders_updated_at BEFORE UPDATE ON product_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Enable for multi-tenant security
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE enterprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE remote_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_qc ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies will be added based on authentication implementation
-- For now, disable RLS during development by granting full access to authenticated users

-- ============================================================================
-- INITIAL SEED DATA (Optional - comment out if not needed)
-- ============================================================================

-- Example Super Admin
INSERT INTO users (id, email, name, role, status, created_at)
VALUES ('usr-superadmin', 'superadmin@ecotribe.io', 'Super Admin', 'super_admin', 'active', NOW())
ON CONFLICT (id) DO NOTHING;

-- Example Main Admin
INSERT INTO users (id, email, name, role, status, created_at)
VALUES ('usr-mainadmin', 'admin@ecotribe.io', 'Main Admin', 'main_admin', 'active', NOW())
ON CONFLICT (id) DO NOTHING;

COMMIT;
