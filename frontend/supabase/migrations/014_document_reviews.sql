-- =============================================
-- DOCUMENT REVIEWS MIGRATION
-- Version: 3.4
-- Description: Add per-document review status tracking for enterprise applications
-- =============================================

-- Add document_reviews JSONB column to store individual document review status
-- Structure: { "doc_gst_certificate": { "status": "pending|accepted|rejected", "notes": "...", "reviewed_at": "..." }, ... }
ALTER TABLE enterprise_applications
ADD COLUMN IF NOT EXISTS document_reviews JSONB DEFAULT '{}'::jsonb;

-- Comment explaining the structure
COMMENT ON COLUMN enterprise_applications.document_reviews IS 'Per-document review status. Keys: doc_gst_certificate, doc_pan_card, doc_incorporation_cert, doc_signatory_id, doc_address_proof. Each value: { status: pending|accepted|rejected, notes?: string, reviewed_at?: timestamp }';
