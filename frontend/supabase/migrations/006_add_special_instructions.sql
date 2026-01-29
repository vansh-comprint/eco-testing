-- Migration: Add special_instructions column to pickup_requests
-- This column stores special instructions from IT Admin for the pickup team

ALTER TABLE pickup_requests
ADD COLUMN IF NOT EXISTS special_instructions TEXT;

-- Add comment for documentation
COMMENT ON COLUMN pickup_requests.special_instructions IS 'Special instructions from IT Admin for the logistics/pickup team';
