-- ============================================================================
-- EcoTribe Setup - SubUsers (Employees)
-- ============================================================================
-- Run this after setup-enterprise.sql

-- Create SubUsers (Employees) for TechCorp
INSERT INTO sub_users (
  id,
  enterprise_id,
  name,
  email,
  phone,
  department,
  status,
  created_at
)
VALUES
  (
    'sub-emp-001',
    'ent-techcorp-001',
    'Priya Sharma',
    'priya.sharma@techcorp.com',
    '+91-9876543220',
    'Engineering',
    'active',
    NOW()
  ),
  (
    'sub-emp-002',
    'ent-techcorp-001',
    'Amit Patel',
    'amit.patel@techcorp.com',
    '+91-9876543221',
    'Engineering',
    'active',
    NOW()
  ),
  (
    'sub-emp-003',
    'ent-techcorp-001',
    'Sneha Reddy',
    'sneha.reddy@techcorp.com',
    '+91-9876543222',
    'Marketing',
    'active',
    NOW()
  ),
  (
    'sub-emp-004',
    'ent-techcorp-001',
    'Rahul Verma',
    'rahul.verma@techcorp.com',
    '+91-9876543223',
    'Sales',
    'active',
    NOW()
  ),
  (
    'sub-emp-005',
    'ent-techcorp-001',
    'Ananya Singh',
    'ananya.singh@techcorp.com',
    '+91-9876543224',
    'HR',
    'active',
    NOW()
  )
ON CONFLICT (email, enterprise_id) DO UPDATE
  SET status = 'active',
      updated_at = NOW();

-- Verify the setup
SELECT
  id,
  name,
  email,
  department,
  status
FROM sub_users
WHERE enterprise_id = 'ent-techcorp-001'
ORDER BY name;

-- Count by department
SELECT
  department,
  COUNT(*) as employee_count
FROM sub_users
WHERE enterprise_id = 'ent-techcorp-001'
GROUP BY department
ORDER BY employee_count DESC;

-- ============================================================================
-- Next Steps:
-- ============================================================================
-- 1. ✅ SubUsers (employees) created
-- 2. ⏳ Create a Batch - run setup-batch.sql next
-- 3. ⏳ Create Assets and assign to SubUsers
