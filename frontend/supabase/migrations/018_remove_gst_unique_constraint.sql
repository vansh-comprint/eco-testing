-- Migration: Remove unique constraint on gst_number
-- Reason: Allow enterprises to be created without GST numbers or with duplicate empty values
-- Only email should be validated as unique for org_admin users

-- Drop the unique constraint on gst_number in enterprises table
ALTER TABLE enterprises DROP CONSTRAINT IF EXISTS enterprises_gst_number_key;

-- Also drop any unique index that might exist
DROP INDEX IF EXISTS enterprises_gst_number_key;
DROP INDEX IF EXISTS idx_enterprises_gst_number;

-- Make gst_number nullable (if not already)
ALTER TABLE enterprises ALTER COLUMN gst_number DROP NOT NULL;

-- Add a comment explaining the change
COMMENT ON COLUMN enterprises.gst_number IS 'GST number - optional, not required to be unique';
