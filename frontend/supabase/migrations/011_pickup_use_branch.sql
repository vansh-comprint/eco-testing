-- Migration: 011_pickup_use_branch.sql
-- Purpose: Replace pickup_locations with branches for pickup requests
-- IT Admins now select from their assigned branches instead of creating pickup locations

-- Step 1: Add branch_id to pickup_requests (allows null during transition)
ALTER TABLE pickup_requests
  ADD COLUMN IF NOT EXISTS branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL;

-- Step 2: Drop the foreign key constraint on location_id
-- This allows us to store branch_id in location_id temporarily for backwards compatibility
ALTER TABLE pickup_requests
  DROP CONSTRAINT IF EXISTS pickup_requests_location_id_fkey;

-- Step 3: Make location_id nullable (for backward compatibility with existing data)
ALTER TABLE pickup_requests
  ALTER COLUMN location_id DROP NOT NULL;

-- Step 4: Create index for performance on branch_id
CREATE INDEX IF NOT EXISTS idx_pickup_requests_branch ON pickup_requests(branch_id);

-- Note: The location_id column and its FK constraint are removed.
-- New pickup requests use branch_id, and location_id is set to null or branch_id value.
-- In the future, location_id column can be fully removed once all code is updated.
