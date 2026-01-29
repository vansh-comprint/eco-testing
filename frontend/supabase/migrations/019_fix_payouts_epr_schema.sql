-- Migration: Fix payouts and EPR certificates schema mismatches
-- Adds missing columns that the frontend code expects

-- ============================================================================
-- PAYOUTS TABLE FIX
-- ============================================================================

-- Add asset_ids column (TEXT array) - code expects this
ALTER TABLE payouts
ADD COLUMN IF NOT EXISTS asset_ids TEXT[] DEFAULT '{}';

-- Add transaction_id column - code expects this for completed payouts
ALTER TABLE payouts
ADD COLUMN IF NOT EXISTS transaction_id TEXT;

-- ============================================================================
-- EPR CERTIFICATES TABLE FIX
-- ============================================================================

-- Rename total_weight_kg to weight_kg if it exists (code expects weight_kg)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'epr_certificates' AND column_name = 'total_weight_kg'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'epr_certificates' AND column_name = 'weight_kg'
  ) THEN
    ALTER TABLE epr_certificates RENAME COLUMN total_weight_kg TO weight_kg;
  END IF;
END $$;

-- Add weight_kg if it doesn't exist
ALTER TABLE epr_certificates
ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(10, 3) NOT NULL DEFAULT 0;

-- Add category column - code expects this
ALTER TABLE epr_certificates
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'IT Equipment';

-- Add treatment_type column - code expects this enum
ALTER TABLE epr_certificates
ADD COLUMN IF NOT EXISTS treatment_type TEXT DEFAULT 'recycled'
CHECK (treatment_type IN ('recycled', 'refurbished', 'resold', 'disposed'));

-- ============================================================================
-- INDEX UPDATES
-- ============================================================================

-- Index for payouts by enterprise
CREATE INDEX IF NOT EXISTS idx_payouts_enterprise_id ON payouts(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);

SELECT 'Schema fixes for payouts and EPR certificates completed' as status;
