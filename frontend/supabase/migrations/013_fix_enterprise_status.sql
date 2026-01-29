-- Migration: Fix enterprises status constraint
-- The V3 flow uses enterprise_applications table for registration workflow
-- However, SignupPage.tsx (legacy) uses pending_verification status
-- This migration adds pending_verification to maintain backward compatibility

-- Drop existing constraint and add new one with pending_verification
ALTER TABLE enterprises DROP CONSTRAINT IF EXISTS enterprises_status_check;

-- Add updated constraint that includes pending_verification for legacy support
ALTER TABLE enterprises ADD CONSTRAINT enterprises_status_check
  CHECK (status IN ('active', 'inactive', 'suspended', 'pending_verification'));

-- Add index for status if not exists
CREATE INDEX IF NOT EXISTS idx_enterprises_status_v2 ON enterprises(status);

-- Note: The preferred V3 flow is:
-- 1. New enterprise submits via EnterpriseRegister.tsx → creates enterprise_applications record
-- 2. Admin approves → creates enterprise with 'active' status
-- The pending_verification flow via SignupPage.tsx is legacy but supported
