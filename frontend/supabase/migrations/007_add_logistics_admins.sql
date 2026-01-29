-- Migration: Add logistics_admins table and update logistics_users
-- This creates the two-tier logistics structure:
-- Main Admin assigns to Logistics Admin -> Logistics Admin assigns to Logistics User

-- ============================================================================
-- LOGISTICS ADMINS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS logistics_admins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Add updated_at trigger
CREATE TRIGGER update_logistics_admins_updated_at BEFORE UPDATE ON logistics_admins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add index on status
CREATE INDEX idx_logistics_admins_status ON logistics_admins(status);

-- ============================================================================
-- UPDATE LOGISTICS_USERS TABLE
-- ============================================================================

-- Add logistics_admin_id column to logistics_users to link users to their admin
ALTER TABLE logistics_users
ADD COLUMN IF NOT EXISTS logistics_admin_id TEXT REFERENCES logistics_admins(id) ON DELETE SET NULL;

-- Add index for the foreign key
CREATE INDEX IF NOT EXISTS idx_logistics_users_admin ON logistics_users(logistics_admin_id) WHERE logistics_admin_id IS NOT NULL;

-- ============================================================================
-- UPDATE PICKUP_REQUESTS TABLE
-- ============================================================================

-- Add logistics_admin_id column to pickup_requests for first-level assignment
ALTER TABLE pickup_requests
ADD COLUMN IF NOT EXISTS logistics_admin_id TEXT REFERENCES logistics_admins(id) ON DELETE SET NULL;

-- Add index for logistics_admin_id on pickup_requests
CREATE INDEX IF NOT EXISTS idx_pickup_requests_logistics_admin ON pickup_requests(logistics_admin_id) WHERE logistics_admin_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON TABLE logistics_admins IS 'Logistics partner companies/admins who manage field users';
COMMENT ON COLUMN logistics_users.logistics_admin_id IS 'The logistics admin this user belongs to';
COMMENT ON COLUMN pickup_requests.logistics_admin_id IS 'The logistics admin assigned to this pickup request (first-level assignment)';
