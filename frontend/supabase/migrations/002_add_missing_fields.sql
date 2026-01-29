-- Migration: Add missing fields to existing tables
-- Run this in your Supabase SQL Editor to update the database

-- ============================================================================
-- ADD MISSING FIELDS TO BATCHES TABLE
-- ============================================================================

-- Add CFO approval field
ALTER TABLE batches
ADD COLUMN IF NOT EXISTS requires_cfo_approval BOOLEAN NOT NULL DEFAULT false;

-- Add tracking fields (nullable to allow batch creation before users exist)
ALTER TABLE batches
ADD COLUMN IF NOT EXISTS created_by TEXT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE batches
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

ALTER TABLE batches
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE batches
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- ============================================================================
-- UPDATE PICKUP_LOCATIONS TABLE (Make fields nullable)
-- ============================================================================

-- Make fields nullable since the code doesn't always provide them
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

-- ============================================================================
-- UPDATE PAYOUTS TABLE
-- ============================================================================

-- Add batch_id reference
ALTER TABLE payouts
ADD COLUMN IF NOT EXISTS batch_id TEXT REFERENCES batches(id) ON DELETE SET NULL;

-- Add reference_id for tracking
ALTER TABLE payouts
ADD COLUMN IF NOT EXISTS reference_id TEXT;

-- Add items JSONB to store payout items details
ALTER TABLE payouts
ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]';

-- Remove old asset_ids column if it exists
-- Note: This will drop the column - backup data first if needed!
-- ALTER TABLE payouts DROP COLUMN IF EXISTS asset_ids;

-- Add 'processed' to status check constraint
ALTER TABLE payouts
DROP CONSTRAINT IF EXISTS payouts_status_check;

ALTER TABLE payouts
ADD CONSTRAINT payouts_status_check
CHECK (status IN ('pending', 'processing', 'processed', 'completed', 'failed'));

-- ============================================================================
-- VERIFY CHANGES
-- ============================================================================

-- Verify batches table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'batches'
ORDER BY ordinal_position;

-- Verify payouts table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'payouts'
ORDER BY ordinal_position;

COMMIT;
