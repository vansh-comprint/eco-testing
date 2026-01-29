-- =============================================
-- ECOTRIBE V3 RESTRUCTURE MIGRATION
-- Version: 3.1
-- Description: Major restructure for branches, org_admin role, and new approval flow
-- =============================================

-- =============================================
-- PART 1: CREATE NEW TABLES
-- =============================================

-- 1.1 ENTERPRISE APPLICATIONS (Registration with document upload)
CREATE TABLE IF NOT EXISTS enterprise_applications (
  id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  gst_number TEXT NOT NULL,
  pan_number TEXT NOT NULL,
  registered_address TEXT NOT NULL,
  industry_type TEXT,
  company_size TEXT,

  -- Org Admin details
  org_admin_name TEXT NOT NULL,
  org_admin_email TEXT NOT NULL,
  org_admin_phone TEXT NOT NULL,
  org_admin_designation TEXT,
  password_hash TEXT NOT NULL,

  -- Documents (Supabase Storage paths)
  doc_gst_certificate TEXT,
  doc_pan_card TEXT,
  doc_incorporation_cert TEXT,
  doc_signatory_id TEXT,
  doc_address_proof TEXT,
  doc_company_logo TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'info_requested')),
  application_ref TEXT UNIQUE,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  rejection_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2 BRANCHES (New hierarchical structure)
CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  enterprise_id TEXT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  branch_name TEXT NOT NULL,
  branch_code TEXT NOT NULL,

  -- Address
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pin_code TEXT NOT NULL,

  -- Pickup Location Details (default pickup point for this branch)
  pickup_point_description TEXT,
  site_contact_person TEXT,
  site_contact_phone TEXT,
  operating_hours TEXT,
  special_instructions TEXT,

  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(enterprise_id, branch_code)
);

-- 1.3 CREDIT WALLETS (separate from enterprise_wallets for V3)
-- Note: enterprise_wallets already exists, we'll use that

-- =============================================
-- PART 2: ALTER EXISTING TABLES
-- =============================================

-- 2.1 Add branch_id to users table (for IT Admin assignment to branches)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL;

-- 2.2 Update users role: cfo → org_admin
UPDATE users SET role = 'org_admin' WHERE role = 'cfo';

-- 2.3 Add branch_id and pickup details to batches table
ALTER TABLE batches
  ADD COLUMN IF NOT EXISTS branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pickup_location_override TEXT,
  ADD COLUMN IF NOT EXISTS preferred_pickup_date DATE,
  ADD COLUMN IF NOT EXISTS preferred_pickup_slot TEXT CHECK (preferred_pickup_slot IN ('morning', 'afternoon', 'evening')),
  ADD COLUMN IF NOT EXISTS pickup_priority TEXT DEFAULT 'normal' CHECK (pickup_priority IN ('normal', 'urgent')),
  ADD COLUMN IF NOT EXISTS it_admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS logistics_instructions TEXT,
  ADD COLUMN IF NOT EXISTS submitted_for_approval_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS org_admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS rejected_by TEXT,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2.4 Rename batch status: pending_cfo_approval → pending_approval
UPDATE batches SET status = 'pending_approval' WHERE status = 'pending_cfo_approval';

-- 2.5 Add branch_id to assets table
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS it_admin_id TEXT REFERENCES users(id) ON DELETE SET NULL;

-- 2.6 Add batch_id to pickup_requests for linking
ALTER TABLE pickup_requests
  ADD COLUMN IF NOT EXISTS batch_id TEXT REFERENCES batches(id) ON DELETE SET NULL;

-- =============================================
-- PART 3: CREATE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_branches_enterprise ON branches(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_branches_status ON branches(status);
CREATE INDEX IF NOT EXISTS idx_users_branch ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_batches_branch ON batches(branch_id);
CREATE INDEX IF NOT EXISTS idx_batches_status_v3 ON batches(status);
CREATE INDEX IF NOT EXISTS idx_assets_branch ON assets(branch_id);
CREATE INDEX IF NOT EXISTS idx_assets_it_admin ON assets(it_admin_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_applications_status ON enterprise_applications(status);
CREATE INDEX IF NOT EXISTS idx_enterprise_applications_ref ON enterprise_applications(application_ref);
CREATE INDEX IF NOT EXISTS idx_pickup_requests_batch ON pickup_requests(batch_id);

-- =============================================
-- PART 4: CREATE DATABASE VIEWS
-- =============================================

-- 4.1 Org Admin: Nested asset view (Branch → IT Admin → Batch → Asset)
CREATE OR REPLACE VIEW org_admin_asset_view AS
SELECT
  a.id,
  a.enterprise_id,
  a.branch_id,
  a.batch_id,
  a.serial_number,
  a.brand,
  a.model,
  a.asset_tag,
  a.status as asset_status,
  a.assigned_sub_user_id,
  a.created_at as asset_created_at,
  b.branch_name,
  b.branch_code,
  b.city as branch_city,
  bt.id as batch_id,
  bt.name as batch_name,
  bt.status as batch_status,
  u_it.id as it_admin_id,
  u_it.name as it_admin_name,
  u_it.email as it_admin_email,
  su.id as sub_user_id,
  su.name as sub_user_name,
  su.email as sub_user_email,
  su.department as sub_user_department
FROM assets a
LEFT JOIN branches b ON a.branch_id = b.id
LEFT JOIN batches bt ON a.batch_id = bt.id
LEFT JOIN users u_it ON a.it_admin_id = u_it.id
LEFT JOIN sub_users su ON a.assigned_sub_user_id = su.id;

-- 4.2 Branch summary for Org Admin dashboard
CREATE OR REPLACE VIEW branch_summary AS
SELECT
  b.id as branch_id,
  b.enterprise_id,
  b.branch_name,
  b.branch_code,
  b.city,
  b.state,
  b.status as branch_status,
  COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'it_admin') as it_admin_count,
  COUNT(DISTINCT a.id) as asset_count,
  COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'completed') as completed_asset_count,
  COUNT(DISTINCT bt.id) as total_batch_count,
  COUNT(DISTINCT bt.id) FILTER (WHERE bt.status NOT IN ('completed', 'cancelled')) as active_batch_count
FROM branches b
LEFT JOIN users u ON u.branch_id = b.id AND u.role = 'it_admin'
LEFT JOIN assets a ON a.branch_id = b.id
LEFT JOIN batches bt ON bt.branch_id = b.id
GROUP BY b.id, b.enterprise_id, b.branch_name, b.branch_code, b.city, b.state, b.status;

-- 4.3 Pickup approval queue for Org Admin
CREATE OR REPLACE VIEW pickup_approval_queue AS
SELECT
  bt.id as batch_id,
  bt.name as batch_name,
  bt.enterprise_id,
  bt.branch_id,
  bt.status as batch_status,
  bt.preferred_pickup_date,
  bt.preferred_pickup_slot,
  bt.pickup_priority,
  bt.it_admin_notes,
  bt.submitted_for_approval_at,
  bt.created_by as it_admin_id,
  u.name as it_admin_name,
  b.branch_name,
  b.city as branch_city,
  COUNT(DISTINCT a.id) as asset_count,
  COUNT(DISTINCT a.id) FILTER (WHERE a.status IN ('evaluation_completed', 'ready_for_pickup')) as ready_asset_count
FROM batches bt
JOIN users u ON bt.created_by = u.id
LEFT JOIN branches b ON bt.branch_id = b.id
LEFT JOIN assets a ON a.batch_id = bt.id
WHERE bt.status = 'pending_approval'
GROUP BY bt.id, bt.name, bt.enterprise_id, bt.branch_id, bt.status,
         bt.preferred_pickup_date, bt.preferred_pickup_slot, bt.pickup_priority,
         bt.it_admin_notes, bt.submitted_for_approval_at, bt.created_by,
         u.name, b.branch_name, b.city;

-- =============================================
-- PART 5: UPDATE ROLE ENUM (if using enum type)
-- =============================================

-- Note: If user_role is an enum, this won't work directly.
-- The application code handles role as TEXT, so this is safe.
-- If you have a strict enum, run this separately:
-- ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'org_admin';

-- =============================================
-- PART 6: CREATE HELPER FUNCTIONS
-- =============================================

-- Function to generate application reference
CREATE OR REPLACE FUNCTION generate_application_ref()
RETURNS TEXT AS $$
DECLARE
  ref TEXT;
  year TEXT;
  seq INT;
BEGIN
  year := to_char(NOW(), 'YYYY');

  SELECT COALESCE(MAX(CAST(SUBSTRING(application_ref FROM 10) AS INTEGER)), 0) + 1
  INTO seq
  FROM enterprise_applications
  WHERE application_ref LIKE 'ENT-' || year || '-%';

  ref := 'ENT-' || year || '-' || LPAD(seq::TEXT, 5, '0');
  RETURN ref;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-create wallet on enterprise approval
CREATE OR REPLACE FUNCTION create_enterprise_wallet()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' AND NOT EXISTS (
    SELECT 1 FROM enterprise_wallets WHERE enterprise_id = NEW.id
  ) THEN
    INSERT INTO enterprise_wallets (id, enterprise_id, available_balance, pending_balance, total_earned, total_redeemed, updated_at)
    VALUES (
      'wal-' || NEW.id,
      NEW.id,
      0,
      0,
      0,
      0,
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-wallet creation
DROP TRIGGER IF EXISTS trigger_create_enterprise_wallet ON enterprises;
CREATE TRIGGER trigger_create_enterprise_wallet
  AFTER INSERT OR UPDATE ON enterprises
  FOR EACH ROW
  EXECUTE FUNCTION create_enterprise_wallet();

-- =============================================
-- PART 7: DISABLE RLS FOR DEVELOPMENT
-- =============================================

ALTER TABLE enterprise_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE branches DISABLE ROW LEVEL SECURITY;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

-- Summary of changes:
-- 1. Created enterprise_applications table for registration workflow
-- 2. Created branches table for hierarchical structure
-- 3. Added branch_id to users, batches, assets tables
-- 4. Added pickup approval fields to batches table
-- 5. Renamed CFO role to org_admin
-- 6. Created database views for org_admin portal
-- 7. Added indexes for performance
-- 8. Created helper functions for reference generation
