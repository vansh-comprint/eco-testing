-- EcoTribe EPR Certificates Enhancement
-- Migration 017: Add missing fields to epr_certificates table for full functionality

-- Add status column
ALTER TABLE epr_certificates
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending_generation'
CHECK (status IN ('pending_generation', 'generated', 'pending_approval', 'approved', 'issued', 'rejected', 'expired'));

-- Add batch reference
ALTER TABLE epr_certificates
ADD COLUMN IF NOT EXISTS batch_id TEXT REFERENCES batches(id) ON DELETE SET NULL;

-- Add compliance year
ALTER TABLE epr_certificates
ADD COLUMN IF NOT EXISTS compliance_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE);

-- Add notes and rejection reason
ALTER TABLE epr_certificates
ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE epr_certificates
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add regulatory body
ALTER TABLE epr_certificates
ADD COLUMN IF NOT EXISTS regulatory_body TEXT DEFAULT 'CPCB';

-- Add updated_at for tracking changes
ALTER TABLE epr_certificates
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_epr_certificates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_epr_certificates_updated_at ON epr_certificates;
CREATE TRIGGER update_epr_certificates_updated_at
  BEFORE UPDATE ON epr_certificates
  FOR EACH ROW
  EXECUTE FUNCTION update_epr_certificates_updated_at();

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_epr_certificates_status ON epr_certificates(status);
CREATE INDEX IF NOT EXISTS idx_epr_certificates_enterprise_id ON epr_certificates(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_epr_certificates_compliance_year ON epr_certificates(compliance_year);

-- ============================================================================
-- RECYCLER PARTNERS TABLE (New)
-- ============================================================================

CREATE TABLE IF NOT EXISTS recycler_partners (
  id TEXT PRIMARY KEY DEFAULT 'rp_' || substring(gen_random_uuid()::text from 1 for 8),
  name TEXT NOT NULL,
  registration_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending_verification')),

  -- Contact info
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,

  -- Address (JSONB for flexibility)
  address JSONB NOT NULL DEFAULT '{}',

  -- Capabilities (array of treatment types)
  capabilities TEXT[] NOT NULL DEFAULT '{}',
  max_capacity_kg_per_month DECIMAL(12, 2),

  -- Certifications (JSONB array)
  certifications JSONB DEFAULT '[]',

  -- Stats
  total_assets_processed INTEGER NOT NULL DEFAULT 0,
  total_weight_processed DECIMAL(12, 3) NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Create trigger for recycler_partners updated_at
DROP TRIGGER IF EXISTS update_recycler_partners_updated_at ON recycler_partners;
CREATE TRIGGER update_recycler_partners_updated_at
  BEFORE UPDATE ON recycler_partners
  FOR EACH ROW
  EXECUTE FUNCTION update_epr_certificates_updated_at();

-- Index for recycler partners
CREATE INDEX IF NOT EXISTS idx_recycler_partners_status ON recycler_partners(status);

-- Add recycler_partner_id foreign key to epr_certificates
ALTER TABLE epr_certificates
ADD COLUMN IF NOT EXISTS recycler_partner_id TEXT REFERENCES recycler_partners(id) ON DELETE SET NULL;

-- Disable RLS for development
ALTER TABLE recycler_partners DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Seed some recycler partners
INSERT INTO recycler_partners (id, name, registration_number, status, contact_person, email, phone, address, capabilities, max_capacity_kg_per_month, certifications) VALUES
  ('rp_attero', 'Attero Recycling', 'CPCB/EP/2024/001', 'active', 'Rajesh Kumar', 'contact@attero.in', '+91-9876543210',
   '{"street": "Plot 47, Electronic City Phase 1", "city": "Bengaluru", "state": "Karnataka", "pincode": "560100", "country": "India"}',
   ARRAY['recycled', 'disposed'], 50000,
   '[{"type": "CPCB Authorization", "number": "CPCB/HW/AUTH/2024/001", "issuedBy": "CPCB", "validUntil": "2025-12-31"}]'),

  ('rp_ecoreco', 'EcoReco Solutions', 'CPCB/EP/2024/002', 'active', 'Priya Sharma', 'info@ecoreco.com', '+91-9876543211',
   '{"street": "Sector 18, Industrial Area", "city": "Gurugram", "state": "Haryana", "pincode": "122015", "country": "India"}',
   ARRAY['recycled', 'refurbished', 'resold'], 30000,
   '[{"type": "ISO 14001", "number": "ISO/14001/2024/0123", "issuedBy": "Bureau Veritas", "validUntil": "2026-06-30"}]'),

  ('rp_greencycle', 'GreenCycle India', 'CPCB/EP/2024/003', 'active', 'Amit Patel', 'hello@greencycle.in', '+91-9876543212',
   '{"street": "MIDC Industrial Area", "city": "Pune", "state": "Maharashtra", "pincode": "411018", "country": "India"}',
   ARRAY['recycled', 'refurbished', 'resold', 'disposed'], 75000,
   '[{"type": "R2 Certification", "number": "R2/2024/IN/0456", "issuedBy": "SERI", "validUntil": "2025-09-15"}]')
ON CONFLICT (registration_number) DO NOTHING;

SELECT 'EPR certificates enhancement completed' as status;
