-- Migration: Move existing logistics admins and users from users table to correct tables
-- Run this to fix existing data created with the old approach

-- Step 1: Copy logistics_admin records from users table to logistics_admins table
INSERT INTO logistics_admins (id, name, email, phone, company_name, status, created_at)
SELECT
  id,
  name,
  email,
  phone,
  name as company_name, -- Use name as company_name if not set
  status,
  created_at
FROM users
WHERE role = 'logistics_admin'
ON CONFLICT (id) DO NOTHING; -- Skip if already exists

-- Step 2: Copy logistics_user records from users table to logistics_users table
-- Note: This sets logistics_admin_id to NULL since we don't know which admin they belong to
-- You'll need to manually assign them to admins after migration
INSERT INTO logistics_users (id, name, email, phone, status, created_at, logistics_admin_id)
SELECT
  id,
  name,
  email,
  phone,
  status,
  created_at,
  NULL as logistics_admin_id -- Will need to be assigned manually
FROM users
WHERE role = 'logistics_user'
ON CONFLICT (id) DO NOTHING; -- Skip if already exists

-- Step 3: Delete logistics records from users table (OPTIONAL - uncomment if you want to clean up)
-- DELETE FROM users WHERE role IN ('logistics_admin', 'logistics_user');

SELECT
  (SELECT COUNT(*) FROM logistics_admins) as logistics_admins_count,
  (SELECT COUNT(*) FROM logistics_users) as logistics_users_count,
  (SELECT COUNT(*) FROM users WHERE role IN ('logistics_admin', 'logistics_user')) as remaining_in_users_table;
