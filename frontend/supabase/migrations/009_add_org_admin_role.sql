-- =============================================
-- MIGRATION 009: Add org_admin role to user_role enum
-- =============================================
-- This migration adds 'org_admin' to the user_role enum and migrates
-- all existing 'cfo' users to 'org_admin'
--
-- IMPORTANT: PostgreSQL requires new enum values to be committed
-- before they can be used. Run these in TWO SEPARATE executions:
-- =============================================

-- =============================================
-- PART 1: Run this FIRST (then commit)
-- =============================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'org_admin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'ops_admin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'technician';

-- =============================================
-- PART 2: Run this SECOND (in a new query after Part 1 commits)
-- =============================================

-- UPDATE users SET role = 'org_admin' WHERE role = 'cfo';

-- =============================================
-- Note: PostgreSQL doesn't support removing enum values.
-- The 'cfo' value will remain in the enum but won't be used.
-- =============================================
