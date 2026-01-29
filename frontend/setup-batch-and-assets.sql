-- ============================================================================
-- EcoTribe Setup - Batch and Assets
-- ============================================================================
-- Run this after setup-subusers.sql

-- Step 1: Create a Batch
INSERT INTO batches (
  id,
  enterprise_id,
  name,
  description,
  status,
  asset_count,
  accepted_count,
  rejected_count,
  pending_count,
  estimated_value,
  total_payout,
  created_at
)
VALUES (
  'bat-techcorp-q1-2025',
  'ent-techcorp-001',
  'Q1 2025 - Laptop Refresh',
  'Annual laptop refresh program for engineering and sales teams',
  'active',
  0,  -- Will be updated as assets are added
  0,
  0,
  0,
  0,
  0,
  NOW()
)
ON CONFLICT (id) DO UPDATE
  SET status = 'active',
      updated_at = NOW();

-- Step 2: Create Assets
INSERT INTO assets (
  id,
  enterprise_id,
  batch_id,
  serial_number,
  brand,
  model,
  asset_tag,
  specs,
  purchase_date,
  status,
  base_price,
  created_at
)
VALUES
  -- Asset 1: Dell for Priya
  (
    'ast-laptop-001',
    'ent-techcorp-001',
    'bat-techcorp-q1-2025',
    'DL5420SN001234',
    'Dell',
    'Latitude 5420',
    'TC-LAP-001',
    jsonb_build_object(
      'processor', 'Intel Core i5-1135G7',
      'ram', '16GB DDR4',
      'storage', '512GB SSD',
      'storageType', 'SSD',
      'screenSize', '14 inch',
      'os', 'Windows 11 Pro'
    ),
    '2022-01-15',
    'pending_assignment',
    25000,
    NOW()
  ),
  -- Asset 2: Lenovo for Amit
  (
    'ast-laptop-002',
    'ent-techcorp-001',
    'bat-techcorp-q1-2025',
    'LNTP14SN005678',
    'Lenovo',
    'ThinkPad T14',
    'TC-LAP-002',
    jsonb_build_object(
      'processor', 'Intel Core i7-1165G7',
      'ram', '32GB DDR4',
      'storage', '1TB SSD',
      'storageType', 'SSD',
      'screenSize', '14 inch',
      'os', 'Windows 11 Pro'
    ),
    '2021-06-20',
    'pending_assignment',
    32000,
    NOW()
  ),
  -- Asset 3: HP for Sneha
  (
    'ast-laptop-003',
    'ent-techcorp-001',
    'bat-techcorp-q1-2025',
    'HPEB850SN009876',
    'HP',
    'EliteBook 850 G8',
    'TC-LAP-003',
    jsonb_build_object(
      'processor', 'Intel Core i5-1145G7',
      'ram', '16GB DDR4',
      'storage', '512GB SSD',
      'storageType', 'SSD',
      'screenSize', '15.6 inch',
      'os', 'Windows 11 Pro'
    ),
    '2022-03-10',
    'pending_assignment',
    28000,
    NOW()
  ),
  -- Asset 4: Dell for Rahul
  (
    'ast-laptop-004',
    'ent-techcorp-001',
    'bat-techcorp-q1-2025',
    'DL7420SN004321',
    'Dell',
    'Latitude 7420',
    'TC-LAP-004',
    jsonb_build_object(
      'processor', 'Intel Core i7-1185G7',
      'ram', '16GB DDR4',
      'storage', '512GB SSD',
      'storageType', 'SSD',
      'screenSize', '14 inch',
      'os', 'Windows 11 Pro'
    ),
    '2021-11-05',
    'pending_assignment',
    30000,
    NOW()
  ),
  -- Asset 5: Lenovo for Ananya
  (
    'ast-laptop-005',
    'ent-techcorp-001',
    'bat-techcorp-q1-2025',
    'LNTP14SN001122',
    'Lenovo',
    'ThinkPad T14s',
    'TC-LAP-005',
    jsonb_build_object(
      'processor', 'AMD Ryzen 7 PRO 5850U',
      'ram', '16GB DDR4',
      'storage', '512GB SSD',
      'storageType', 'SSD',
      'screenSize', '14 inch',
      'os', 'Windows 11 Pro'
    ),
    '2022-05-20',
    'pending_assignment',
    27000,
    NOW()
  )
ON CONFLICT (serial_number) DO UPDATE
  SET status = 'pending_assignment',
      batch_id = 'bat-techcorp-q1-2025',
      updated_at = NOW();

-- Step 3: Update batch metrics
UPDATE batches
SET
  asset_count = (SELECT COUNT(*) FROM assets WHERE batch_id = 'bat-techcorp-q1-2025'),
  pending_count = (SELECT COUNT(*) FROM assets WHERE batch_id = 'bat-techcorp-q1-2025' AND status = 'pending_assignment'),
  estimated_value = (SELECT COALESCE(SUM(base_price), 0) FROM assets WHERE batch_id = 'bat-techcorp-q1-2025'),
  updated_at = NOW()
WHERE id = 'bat-techcorp-q1-2025';

-- Verify the setup
SELECT '=== BATCH ===' as section;
SELECT
  id,
  name,
  status,
  asset_count,
  estimated_value
FROM batches
WHERE id = 'bat-techcorp-q1-2025';

SELECT '=== ASSETS ===' as section;
SELECT
  id,
  serial_number,
  brand,
  model,
  status,
  base_price
FROM assets
WHERE batch_id = 'bat-techcorp-q1-2025'
ORDER BY serial_number;

-- ============================================================================
-- Next Steps:
-- ============================================================================
-- 1. ✅ Batch created
-- 2. ✅ 5 Assets created (pending assignment)
-- 3. ⏳ Now IT Admin can log in and assign these assets to SubUsers!
--
-- To test the flow:
-- 1. Login as IT Admin (it@techcorp.com)
-- 2. Go to Batches → View batch → Assign assets to employees
-- 3. SubUsers can then log in and start device evaluation
