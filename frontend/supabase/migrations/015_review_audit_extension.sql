-- Migration: 015_review_audit_extension.sql
-- Purpose: Extend audit_logs entity_type constraint to include review-related entities
-- and add index for efficient history queries

-- Extend audit_logs entity_type constraint to include review-related entities
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_entity_type_check;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_entity_type_check
  CHECK (entity_type IN (
    'asset', 'batch', 'pickup', 'user', 'enterprise', 'payout',
    'application', 'review', 'facility_qc', 'dispute', 'document'
  ));

-- Add index for efficient history queries by entity
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_lookup
  ON audit_logs(entity_type, entity_id, created_at DESC);

-- Add index for recent logs queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON audit_logs(created_at DESC);

-- Add index for actor-based queries (who did what)
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor
  ON audit_logs(actor_id, created_at DESC);
