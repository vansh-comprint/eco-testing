-- Seed Initial Data
-- Run this in Supabase SQL Editor to populate initial users and enterprises

-- Insert Enterprise
INSERT INTO enterprises (id, name, legal_name, gst_number, industry, employee_count, contact_person, contact_email, contact_phone, status, created_at)
VALUES
  ('ent-001', 'TechCorp India', 'TechCorp India Private Limited', '29ABCDE1234F1Z5', 'Technology', 150, 'Rajesh Kumar', 'contact@techcorp.in', '+91 98765 43210', 'active', NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert Users
INSERT INTO users (id, enterprise_id, email, name, role, status, created_at)
VALUES
  ('usr-superadmin', NULL, 'superadmin@ecotribe.io', 'Super Admin', 'super_admin', 'active', NOW()),
  ('usr-mainadmin', NULL, 'admin@ecotribe.io', 'Main Admin', 'main_admin', 'active', NOW()),
  ('usr-it-admin-1', 'ent-001', 'it@techcorp.com', 'Priya Sharma', 'it_admin', 'active', NOW()),
  ('usr-cfo-1', 'ent-001', 'cfo@techcorp.com', 'Amit Patel', 'cfo', 'active', NOW()),
  ('usr-logistics-admin', NULL, 'logistics-admin@ecotribe.io', 'Logistics Admin', 'logistics_admin', 'active', NOW()),
  ('usr-logistics-user', NULL, 'logistics-user@ecotribe.io', 'Logistics User', 'logistics_user', 'active', NOW())
ON CONFLICT (id) DO NOTHING;

-- Verify
SELECT 'Users created:' as status, COUNT(*) as count FROM users;
SELECT 'Enterprises created:' as status, COUNT(*) as count FROM enterprises;

-- Show created users
SELECT id, email, name, role FROM users ORDER BY created_at;
