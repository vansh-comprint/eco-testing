-- ============================================================================
-- EcoTribe Setup - First Enterprise (TechCorp India)
-- ============================================================================
-- Run this after setup-super-admin.sql

-- Step 1: Create Enterprise
INSERT INTO enterprises (
  id,
  name,
  legal_name,
  gst_number,
  pan_number,
  address,
  industry,
  employee_count,
  contact_person,
  contact_email,
  contact_phone,
  status,
  created_at
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
ON CONFLICT (id) DO UPDATE
  SET status = 'active',
      updated_at = NOW();

-- Step 2: Create Enterprise Wallet
INSERT INTO enterprise_wallets (
  id,
  enterprise_id,
  available_balance,
  pending_balance,
  total_earned,
  total_redeemed,
  updated_at
)
VALUES (
  'wal-techcorp-001',
  'ent-techcorp-001',
  0,
  0,
  0,
  0,
  NOW()
)
ON CONFLICT (enterprise_id) DO NOTHING;

-- Step 3: Create IT Admin for this Enterprise
INSERT INTO users (
  id,
  enterprise_id,
  email,
  name,
  phone,
  role,
  status,
  created_at
)
VALUES (
  'usr-it-admin-techcorp',
  'ent-techcorp-001',
  'it@techcorp.com',
  'IT Admin - TechCorp',
  '+91-9876543211',
  'it_admin',
  'active',
  NOW()
)
ON CONFLICT (email) DO UPDATE
  SET enterprise_id = 'ent-techcorp-001',
      status = 'active',
      updated_at = NOW();

-- Step 4: Create CFO for this Enterprise
INSERT INTO users (
  id,
  enterprise_id,
  email,
  name,
  phone,
  role,
  status,
  created_at
)
VALUES (
  'usr-cfo-techcorp',
  'ent-techcorp-001',
  'cfo@techcorp.com',
  'CFO - TechCorp',
  '+91-9876543212',
  'cfo',
  'active',
  NOW()
)
ON CONFLICT (email) DO UPDATE
  SET enterprise_id = 'ent-techcorp-001',
      status = 'active',
      updated_at = NOW();

-- Step 5: Create a default pickup location
INSERT INTO pickup_locations (
  id,
  enterprise_id,
  name,
  address,
  city,
  state,
  pin_code,
  country,
  contact_person,
  contact_phone,
  operating_hours,
  is_default,
  is_active,
  created_at
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
ON CONFLICT (id) DO UPDATE
  SET is_active = true,
      updated_at = NOW();

-- Verify the setup
SELECT '=== ENTERPRISE ===' as section;
SELECT id, name, status, contact_email FROM enterprises WHERE id = 'ent-techcorp-001';

SELECT '=== WALLET ===' as section;
SELECT id, enterprise_id, available_balance FROM enterprise_wallets WHERE enterprise_id = 'ent-techcorp-001';

SELECT '=== USERS ===' as section;
SELECT id, email, name, role FROM users WHERE enterprise_id = 'ent-techcorp-001' OR role IN ('super_admin', 'main_admin');

SELECT '=== PICKUP LOCATIONS ===' as section;
SELECT id, name, city, is_default FROM pickup_locations WHERE enterprise_id = 'ent-techcorp-001';

-- ============================================================================
-- Next Steps:
-- ============================================================================
-- 1. ✅ Enterprise created
-- 2. ✅ IT Admin created (login: it@techcorp.com)
-- 3. ✅ CFO created (login: cfo@techcorp.com)
-- 4. ⏳ Create SubUsers (employees) - run setup-subusers.sql next
-- 5. ⏳ Create a Batch and Assets
