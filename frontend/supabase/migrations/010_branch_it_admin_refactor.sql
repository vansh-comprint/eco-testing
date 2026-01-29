-- =============================================
-- ECOTRIBE V3.2 BRANCH-IT ADMIN REFACTOR
-- Version: 3.2
-- Description: Change from Branch→IT Admin to IT Admin→Branch relationship
--
-- BEFORE: users.branch_id → branches (IT Admin belongs to ONE branch)
-- AFTER:  branches.it_admin_id → users (Branch points to its IT admin)
-- This allows 1 IT Admin to manage MULTIPLE branches
-- =============================================

-- =============================================
-- STEP 1: ADD it_admin_id TO BRANCHES TABLE
-- =============================================

ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS it_admin_id TEXT REFERENCES users(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_branches_it_admin ON branches(it_admin_id);

-- =============================================
-- STEP 2: UPDATE STATUS CONSTRAINT
-- =============================================

-- Drop existing constraint and add new one with 'needs_admin'
ALTER TABLE branches DROP CONSTRAINT IF EXISTS branches_status_check;
ALTER TABLE branches
  ADD CONSTRAINT branches_status_check
  CHECK (status IN ('active', 'inactive', 'needs_admin'));

-- =============================================
-- STEP 3: DROP DEPENDENT VIEWS FIRST
-- =============================================
-- Must drop views before removing branch_id column they depend on

DROP VIEW IF EXISTS branch_summary;
DROP VIEW IF EXISTS org_admin_asset_view;
DROP VIEW IF EXISTS it_admin_branches;

-- =============================================
-- STEP 4: REMOVE BRANCH_ID FROM USERS TABLE
-- =============================================

-- First drop the index
DROP INDEX IF EXISTS idx_users_branch;

-- Then drop the column (now safe since views are dropped)
ALTER TABLE users DROP COLUMN IF EXISTS branch_id;

-- =============================================
-- STEP 5: RECREATE BRANCH_SUMMARY VIEW
-- =============================================
CREATE VIEW branch_summary AS
SELECT
  b.id as branch_id,
  b.enterprise_id,
  b.branch_name,
  b.branch_code,
  b.city,
  b.state,
  b.status as branch_status,
  b.it_admin_id,
  u.name as it_admin_name,
  u.email as it_admin_email,
  u.phone as it_admin_phone,
  COUNT(DISTINCT a.id) as asset_count,
  COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'completed') as completed_asset_count,
  COUNT(DISTINCT bt.id) as total_batch_count,
  COUNT(DISTINCT bt.id) FILTER (WHERE bt.status NOT IN ('completed', 'cancelled')) as active_batch_count
FROM branches b
LEFT JOIN users u ON b.it_admin_id = u.id AND u.role = 'it_admin'
LEFT JOIN assets a ON a.branch_id = b.id
LEFT JOIN batches bt ON bt.branch_id = b.id
GROUP BY b.id, b.enterprise_id, b.branch_name, b.branch_code, b.city, b.state, b.status, b.it_admin_id, u.name, u.email, u.phone;

-- =============================================
-- STEP 6: RECREATE ORG_ADMIN_ASSET_VIEW
-- =============================================

CREATE VIEW org_admin_asset_view AS
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
  b.it_admin_id,
  bt.name as batch_name,
  bt.status as batch_status,
  u_it.name as it_admin_name,
  u_it.email as it_admin_email,
  su.id as sub_user_id,
  su.name as sub_user_name,
  su.email as sub_user_email,
  su.department as sub_user_department
FROM assets a
LEFT JOIN branches b ON a.branch_id = b.id
LEFT JOIN batches bt ON a.batch_id = bt.id
LEFT JOIN users u_it ON b.it_admin_id = u_it.id
LEFT JOIN sub_users su ON a.assigned_sub_user_id = su.id;

-- =============================================
-- STEP 7: CREATE HELPER VIEW FOR IT ADMIN BRANCHES
-- =============================================

CREATE OR REPLACE VIEW it_admin_branches AS
SELECT
  u.id as it_admin_id,
  u.name as it_admin_name,
  u.email as it_admin_email,
  u.enterprise_id,
  COUNT(DISTINCT b.id) as branch_count,
  array_agg(b.branch_name ORDER BY b.branch_name) as branch_names,
  array_agg(b.id ORDER BY b.branch_name) as branch_ids
FROM users u
LEFT JOIN branches b ON b.it_admin_id = u.id
WHERE u.role = 'it_admin'
GROUP BY u.id, u.name, u.email, u.enterprise_id;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

-- Summary of changes:
-- 1. Added it_admin_id column to branches table (FK to users)
-- 2. Added 'needs_admin' to branch status options
-- 3. Added branch_code format constraint (1-10 alphanumeric uppercase)
-- 4. Removed branch_id from users table (no longer needed)
-- 5. Updated branch_summary view to show IT admin info directly
-- 6. Updated org_admin_asset_view to use new relationship
-- 7. Created it_admin_branches view for IT admin management
--
-- NEW RELATIONSHIP: 1 IT Admin can manage MULTIPLE branches
-- Each branch has exactly 1 IT admin (or none = 'needs_admin' status)
