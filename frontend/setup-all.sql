-- ============================================================================
-- EcoTribe Complete Setup - All in One
-- ============================================================================
-- Run this single file to set up everything from scratch
-- Time: ~5 minutes
-- ============================================================================

-- STEP 1: PLATFORM ADMINS
-- ============================================================================

INSERT INTO users (id, email, name, role, status, created_at)
VALUES
  ('usr-superadmin-001', 'superadmin@ecotribe.io', 'Super Admin', 'super_admin', 'active', NOW()),
  ('usr-mainadmin-001', 'admin@ecotribe.io', 'Main Admin', 'main_admin', 'active', NOW()),
  ('usr-logistics-admin-001', 'logistics-admin@ecotribe.io', 'Logistics Admin', 'logistics_admin', 'active', NOW())
ON CONFLICT (email) DO UPDATE SET status = 'active', updated_at = NOW();

-- STEP 2: ENTERPRISE
-- ============================================================================

INSERT INTO enterprises (
  id, name, legal_name, gst_number, pan_number, address, industry,
  employee_count, contact_person, contact_email, contact_phone, status, created_at
)
VALUES (
  'ent-techcorp-001',
  'TechCorp India',
  'TechCorp India Private Limited',
  'GST29AABCT1234H1ZM',
  'AABCT1234H',
  jsonb_build_object(
    'line1', '123 Tech Park',
    'line2', 'Electronic City Phase 1',
    'city', 'Bangalore',
    'state', 'Karnataka',
    'pinCode', '560100',
    'country', 'India'
  ),
  'IT Services',
  250,
  'Rajesh Kumar',
  'rajesh@techcorp.com',
  '+91-9876543210',
  'active',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET status = 'active', updated_at = NOW();

-- Enterprise Wallet
INSERT INTO enterprise_wallets (id, enterprise_id, available_balance, pending_balance, total_earned, total_redeemed, updated_at)
VALUES ('wal-techcorp-001', 'ent-techcorp-001', 0, 0, 0, 0, NOW())
ON CONFLICT (enterprise_id) DO NOTHING;

-- IT Admin
INSERT INTO users (id, enterprise_id, email, name, phone, role, status, created_at)
VALUES ('usr-it-admin-techcorp', 'ent-techcorp-001', 'it@techcorp.com', 'IT Admin - TechCorp', '+91-9876543211', 'it_admin', 'active', NOW())
ON CONFLICT (email) DO UPDATE SET enterprise_id = 'ent-techcorp-001', status = 'active', updated_at = NOW();

-- CFO
INSERT INTO users (id, enterprise_id, email, name, phone, role, status, created_at)
VALUES ('usr-cfo-techcorp', 'ent-techcorp-001', 'cfo@techcorp.com', 'CFO - TechCorp', '+91-9876543212', 'cfo', 'active', NOW())
ON CONFLICT (email) DO UPDATE SET enterprise_id = 'ent-techcorp-001', status = 'active', updated_at = NOW();

-- Default Pickup Location
INSERT INTO pickup_locations (
  id, enterprise_id, name, address, city, state, pin_code, country,
  contact_person, contact_phone, operating_hours, is_default, is_active, created_at
)
VALUES (
  'loc-techcorp-hq',
  'ent-techcorp-001',
  'TechCorp HQ - IT Office',
  '123 Tech Park, Electronic City Phase 1',
  'Bangalore',
  'Karnataka',
  '560100',
  'India',
  'Rajesh Kumar',
  '+91-9876543210',
  'Mon-Fri, 9 AM - 6 PM',
  true,
  true,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET is_active = true, updated_at = NOW();

-- STEP 3: SUB-USERS (EMPLOYEES)
-- ============================================================================

INSERT INTO sub_users (id, enterprise_id, name, email, phone, department, status, created_at)
VALUES
  ('sub-emp-001', 'ent-techcorp-001', 'Priya Sharma', 'priya.sharma@techcorp.com', '+91-9876543220', 'Engineering', 'active', NOW()),
  ('sub-emp-002', 'ent-techcorp-001', 'Amit Patel', 'amit.patel@techcorp.com', '+91-9876543221', 'Engineering', 'active', NOW()),
  ('sub-emp-003', 'ent-techcorp-001', 'Sneha Reddy', 'sneha.reddy@techcorp.com', '+91-9876543222', 'Marketing', 'active', NOW()),
  ('sub-emp-004', 'ent-techcorp-001', 'Rahul Verma', 'rahul.verma@techcorp.com', '+91-9876543223', 'Sales', 'active', NOW()),
  ('sub-emp-005', 'ent-techcorp-001', 'Ananya Singh', 'ananya.singh@techcorp.com', '+91-9876543224', 'HR', 'active', NOW())
ON CONFLICT (email, enterprise_id) DO UPDATE SET status = 'active', updated_at = NOW();

-- STEP 4: BATCH
-- ============================================================================

INSERT INTO batches (
  id, enterprise_id, name, description, status,
  asset_count, accepted_count, rejected_count, pending_count,
  estimated_value, total_payout, created_at
)
VALUES (
  'bat-techcorp-q1-2025',
  'ent-techcorp-001',
  'Q1 2025 - Laptop Refresh',
  'Annual laptop refresh program for engineering and sales teams',
  'active',
  0, 0, 0, 0, 0, 0,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET status = 'active', updated_at = NOW();

-- STEP 5: ASSETS
-- ============================================================================

INSERT INTO assets (
  id, enterprise_id, batch_id, serial_number, brand, model, asset_tag,
  specs, purchase_date, status, base_price, created_at
)
VALUES
  (
    'ast-laptop-001', 'ent-techcorp-001', 'bat-techcorp-q1-2025',
    'DL5420SN001234', 'Dell', 'Latitude 5420', 'TC-LAP-001',
    jsonb_build_object('processor', 'Intel Core i5-1135G7', 'ram', '16GB DDR4', 'storage', '512GB SSD', 'storageType', 'SSD', 'screenSize', '14 inch', 'os', 'Windows 11 Pro'),
    '2022-01-15', 'pending_assignment', 25000, NOW()
  ),
  (
    'ast-laptop-002', 'ent-techcorp-001', 'bat-techcorp-q1-2025',
    'LNTP14SN005678', 'Lenovo', 'ThinkPad T14', 'TC-LAP-002',
    jsonb_build_object('processor', 'Intel Core i7-1165G7', 'ram', '32GB DDR4', 'storage', '1TB SSD', 'storageType', 'SSD', 'screenSize', '14 inch', 'os', 'Windows 11 Pro'),
    '2021-06-20', 'pending_assignment', 32000, NOW()
  ),
  (
    'ast-laptop-003', 'ent-techcorp-001', 'bat-techcorp-q1-2025',
    'HPEB850SN009876', 'HP', 'EliteBook 850 G8', 'TC-LAP-003',
    jsonb_build_object('processor', 'Intel Core i5-1145G7', 'ram', '16GB DDR4', 'storage', '512GB SSD', 'storageType', 'SSD', 'screenSize', '15.6 inch', 'os', 'Windows 11 Pro'),
    '2022-03-10', 'pending_assignment', 28000, NOW()
  ),
  (
    'ast-laptop-004', 'ent-techcorp-001', 'bat-techcorp-q1-2025',
    'DL7420SN004321', 'Dell', 'Latitude 7420', 'TC-LAP-004',
    jsonb_build_object('processor', 'Intel Core i7-1185G7', 'ram', '16GB DDR4', 'storage', '512GB SSD', 'storageType', 'SSD', 'screenSize', '14 inch', 'os', 'Windows 11 Pro'),
    '2021-11-05', 'pending_assignment', 30000, NOW()
  ),
  (
    'ast-laptop-005', 'ent-techcorp-001', 'bat-techcorp-q1-2025',
    'LNTP14SN001122', 'Lenovo', 'ThinkPad T14s', 'TC-LAP-005',
    jsonb_build_object('processor', 'AMD Ryzen 7 PRO 5850U', 'ram', '16GB DDR4', 'storage', '512GB SSD', 'storageType', 'SSD', 'screenSize', '14 inch', 'os', 'Windows 11 Pro'),
    '2022-05-20', 'pending_assignment', 27000, NOW()
  )
ON CONFLICT (serial_number) DO UPDATE
  SET status = 'pending_assignment', batch_id = 'bat-techcorp-q1-2025', updated_at = NOW();

-- Update batch metrics
UPDATE batches
SET
  asset_count = (SELECT COUNT(*) FROM assets WHERE batch_id = 'bat-techcorp-q1-2025'),
  pending_count = (SELECT COUNT(*) FROM assets WHERE batch_id = 'bat-techcorp-q1-2025' AND status = 'pending_assignment'),
  estimated_value = (SELECT COALESCE(SUM(base_price), 0) FROM assets WHERE batch_id = 'bat-techcorp-q1-2025'),
  updated_at = NOW()
WHERE id = 'bat-techcorp-q1-2025';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT '✅ SETUP COMPLETE!' as status;

SELECT '=== PLATFORM ADMINS ===' as section;
SELECT id, email, role FROM users WHERE role IN ('super_admin', 'main_admin', 'logistics_admin');

SELECT '=== ENTERPRISE ===' as section;
SELECT id, name, contact_email, status FROM enterprises WHERE id = 'ent-techcorp-001';

SELECT '=== ENTERPRISE USERS ===' as section;
SELECT id, email, role FROM users WHERE enterprise_id = 'ent-techcorp-001';

SELECT '=== EMPLOYEES ===' as section;
SELECT id, name, email, department FROM sub_users WHERE enterprise_id = 'ent-techcorp-001';

SELECT '=== BATCH ===' as section;
SELECT id, name, status, asset_count, estimated_value FROM batches WHERE id = 'bat-techcorp-q1-2025';

SELECT '=== ASSETS ===' as section;
SELECT id, serial_number, brand, model, status, base_price FROM assets WHERE batch_id = 'bat-techcorp-q1-2025';

-- ============================================================================
-- NEXT STEPS
-- ============================================================================
-- 1. ✅ All data created!
-- 2. ⏳ Login as IT Admin: it@techcorp.com
-- 3. ⏳ Assign assets to employees
-- 4. ⏳ Test the complete workflow
--
-- See SETUP_GUIDE.md for login credentials and testing instructions
