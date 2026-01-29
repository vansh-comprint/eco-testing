-- Migration 012: Self-Evaluation Feature
-- Allows IT Admins and Org Admins to assign assets to themselves for evaluation

-- Step 1: Add assigned_user_id to assets table (for admin self-assignment)
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS assigned_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;

-- Step 2: Add user_id to submissions table (for admin self-submissions)
-- This is optional - if user_id is set, sub_user_id can be null
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE SET NULL;

-- Step 3: Make sub_user_id nullable in submissions (since admin can submit)
ALTER TABLE submissions
  ALTER COLUMN sub_user_id DROP NOT NULL;

-- Step 4: Add check constraint - either sub_user_id OR user_id must be set
ALTER TABLE submissions
  ADD CONSTRAINT submission_evaluator_check
  CHECK (sub_user_id IS NOT NULL OR user_id IS NOT NULL);

-- Step 5: Create index for performance
CREATE INDEX IF NOT EXISTS idx_assets_assigned_user ON assets(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);

-- Step 6: Add is_self_assigned flag for clarity
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS is_self_assigned BOOLEAN DEFAULT FALSE;
