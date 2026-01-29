-- =============================================
-- ECOTRIBE DATABASE CLEANUP SCRIPT
-- Clears all data EXCEPT super_admin and main_admin users
-- Run this in Supabase SQL Editor
-- =============================================

-- IMPORTANT: Run this in a transaction for safety
BEGIN;

-- =============================================
-- STEP 1: Clear audit and notification tables (no dependencies)
-- =============================================
DELETE FROM audit_logs;
DELETE FROM notifications;

-- =============================================
-- STEP 2: Clear QC and review tables
-- =============================================
DELETE FROM on_site_qc;
DELETE FROM facility_qc;
DELETE FROM remote_reviews;
DELETE FROM submissions;
DELETE FROM disputes;

-- =============================================
-- STEP 3: Clear financial tables
-- =============================================
DELETE FROM credit_transactions;
DELETE FROM product_orders;
DELETE FROM payouts;

-- =============================================
-- STEP 4: Clear EPR certificates
-- =============================================
DELETE FROM epr_certificates;

-- =============================================
-- STEP 5: Clear pickup-related tables
-- =============================================
DELETE FROM pickup_requests;
DELETE FROM pickup_locations;

-- =============================================
-- STEP 6: Clear assets and batches
-- =============================================
DELETE FROM assets;
DELETE FROM batches;

-- =============================================
-- STEP 7: Clear sub_users
-- =============================================
DELETE FROM sub_users;

-- =============================================
-- STEP 8: Clear wallets
-- =============================================
DELETE FROM enterprise_wallets;

-- =============================================
-- STEP 9: Clear branches
-- =============================================
DELETE FROM branches;

-- =============================================
-- STEP 10: Clear enterprise applications
-- =============================================
DELETE FROM enterprise_applications;

-- =============================================
-- STEP 11: Clear logistics tables
-- =============================================
DELETE FROM logistics_users;
DELETE FROM logistics_admins;

-- =============================================
-- STEP 12: Clear users EXCEPT super_admin and main_admin
-- =============================================
DELETE FROM users
WHERE role NOT IN ('super_admin', 'main_admin');

-- =============================================
-- STEP 13: Clear enterprises
-- =============================================
DELETE FROM enterprises;

-- =============================================
-- STEP 14: Verify preserved users
-- =============================================
SELECT 'Remaining users after cleanup:' as info;
SELECT id, email, name, role, status FROM users ORDER BY role;

-- =============================================
-- COMMIT the transaction
-- =============================================
COMMIT;

-- =============================================
-- SUMMARY
-- =============================================
-- After running this script:
-- - All enterprises and their data are deleted
-- - All branches, assets, batches are deleted
-- - All sub_users (employees) are deleted
-- - All pickup requests and logistics data deleted
-- - All financial transactions deleted
-- - All audit logs and notifications deleted
-- - ONLY super_admin and main_admin users remain
-- =============================================
