-- ============================================================================
-- EcoTribe Initial Setup - Super Admin
-- ============================================================================
-- Run this first to create the platform Super Admin account

-- Step 1: Create Super Admin User (Platform Owner)
INSERT INTO users (
  id,
  email,
  name,
  role,
  status,
  created_at
)
VALUES (
  'usr-superadmin-001',
  'superadmin@ecotribe.io',
  'Super Admin',
  'super_admin',
  'active',
  NOW()
)
ON CONFLICT (email) DO UPDATE
  SET status = 'active',
      updated_at = NOW();

-- Step 2: Create Main Admin User (OPS Manager / Technician)
INSERT INTO users (
  id,
  email,
  name,
  role,
  status,
  created_at
)
VALUES (
  'usr-mainadmin-001',
  'admin@ecotribe.io',
  'Main Admin',
  'main_admin',
  'active',
  NOW()
)
ON CONFLICT (email) DO UPDATE
  SET status = 'active',
      updated_at = NOW();

-- Step 3: Create Logistics Admin User
INSERT INTO users (
  id,
  email,
  name,
  role,
  status,
  created_at
)
VALUES (
  'usr-logistics-admin-001',
  'logistics-admin@ecotribe.io',
  'Logistics Admin',
  'logistics_admin',
  'active',
  NOW()
)
ON CONFLICT (email) DO UPDATE
  SET status = 'active',
      updated_at = NOW();

-- Verify the setup
SELECT
  id,
  email,
  name,
  role,
  status,
  created_at
FROM users
WHERE role IN ('super_admin', 'main_admin', 'logistics_admin')
ORDER BY created_at;

-- ============================================================================
-- Next Steps:
-- ============================================================================
-- 1. ✅ Super Admin created
-- 2. ⏳ Create an Enterprise (run setup-enterprise.sql next)
-- 3. ⏳ Create IT Admin for that Enterprise
-- 4. ⏳ Create CFO for that Enterprise
-- 5. ⏳ Create SubUsers (employees)
-- 6. ⏳ Create Assets and assign to SubUsers
