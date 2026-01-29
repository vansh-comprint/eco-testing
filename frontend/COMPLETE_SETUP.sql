-- ============================================================================
-- COMPLETE DATABASE SETUP - Run this entire file in Supabase SQL Editor
-- ============================================================================

-- Step 1: Disable RLS for development
ALTER TABLE enterprises DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE sub_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE remote_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE facility_qc DISABLE ROW LEVEL SECURITY;
ALTER TABLE on_site_qc DISABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE logistics_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE payouts DISABLE ROW LEVEL SECURITY;
ALTER TABLE disputes DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE epr_certificates DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_orders DISABLE ROW LEVEL SECURITY;

SELECT 'RLS disabled for development' as status;

-- Step 2: Add missing columns to batches
ALTER TABLE batches
ADD COLUMN IF NOT EXISTS requires_cfo_approval BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE batches
ADD COLUMN IF NOT EXISTS created_by TEXT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE batches
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

ALTER TABLE batches
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE batches
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

SELECT 'Batches table updated' as status;

-- Step 3: Update pickup_locations (make fields nullable)
ALTER TABLE pickup_locations
ALTER COLUMN city DROP NOT NULL;

ALTER TABLE pickup_locations
ALTER COLUMN pin_code DROP NOT NULL;

ALTER TABLE pickup_locations
ALTER COLUMN country DROP NOT NULL;

ALTER TABLE pickup_locations
ALTER COLUMN contact_person DROP NOT NULL;

ALTER TABLE pickup_locations
ALTER COLUMN contact_phone DROP NOT NULL;

SELECT 'Pickup locations table updated' as status;

-- Step 4: Update payouts table
ALTER TABLE payouts
ADD COLUMN IF NOT EXISTS batch_id TEXT REFERENCES batches(id) ON DELETE SET NULL;

ALTER TABLE payouts
ADD COLUMN IF NOT EXISTS reference_id TEXT;

ALTER TABLE payouts
ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]';

-- Fix status constraint
ALTER TABLE payouts
DROP CONSTRAINT IF EXISTS payouts_status_check;

ALTER TABLE payouts
ADD CONSTRAINT payouts_status_check
CHECK (status IN ('pending', 'processing', 'processed', 'completed', 'failed'));

SELECT 'Payouts table updated' as status;

-- Step 5: Seed Enterprise
INSERT INTO enterprises (id, name, legal_name, gst_number, industry, employee_count, contact_person, contact_email, contact_phone, status, created_at)
VALUES ('ent-001', 'TechCorp India', 'TechCorp India Private Limited', '29ABCDE1234F1Z5', 'Technology', 150, 'Rajesh Kumar', 'contact@techcorp.in', '+91 98765 43210', 'active', NOW())
ON CONFLICT (id) DO NOTHING;

SELECT 'Enterprise created' as status;

-- Step 6: Seed Users
INSERT INTO users (id, enterprise_id, email, name, role, status, created_at)
VALUES
  ('usr-superadmin', NULL, 'superadmin@ecotribe.io', 'Super Admin', 'super_admin', 'active', NOW()),
  ('usr-mainadmin', NULL, 'admin@ecotribe.io', 'Main Admin', 'main_admin', 'active', NOW()),
  ('usr-it-admin-1', 'ent-001', 'it@techcorp.com', 'Priya Sharma', 'it_admin', 'active', NOW()),
  ('usr-cfo-1', 'ent-001', 'cfo@techcorp.com', 'Amit Patel', 'cfo', 'active', NOW()),
  ('usr-logistics-admin', NULL, 'logistics-admin@ecotribe.io', 'Logistics Admin', 'logistics_admin', 'active', NOW()),
  ('usr-logistics-user', NULL, 'logistics-user@ecotribe.io', 'Logistics User', 'logistics_user', 'active', NOW())
ON CONFLICT (id) DO NOTHING;

SELECT 'Users created' as status;

-- Step 7: Verify setup
SELECT 'SETUP COMPLETE!' as status;
SELECT '==================' as separator;
SELECT 'Users in database:' as info, COUNT(*) as count FROM users;
SELECT 'Enterprises in database:' as info, COUNT(*) as count FROM enterprises;
SELECT '==================' as separator;
SELECT 'All users:' as info;
SELECT id, email, name, role FROM users ORDER BY created_at;
