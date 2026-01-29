-- EcoTribe Pricing Configuration Schema
-- Migration 016: Pricing configuration tables for device valuation

-- ============================================================================
-- PRICING CONFIGURATION TABLES
-- ============================================================================

-- Device Type Base Prices (Laptop, Desktop, Tablet, Phone, etc.)
CREATE TABLE IF NOT EXISTS device_type_pricing (
  id TEXT PRIMARY KEY DEFAULT 'dtp_' || substring(gen_random_uuid()::text from 1 for 8),
  device_type TEXT NOT NULL UNIQUE CHECK (device_type IN ('laptop', 'desktop', 'tablet', 'phone', 'monitor', 'other')),
  display_name TEXT NOT NULL,
  base_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- CPU Tier Pricing (Multipliers based on processor tier)
CREATE TABLE IF NOT EXISTS cpu_tier_pricing (
  id TEXT PRIMARY KEY DEFAULT 'cpu_' || substring(gen_random_uuid()::text from 1 for 8),
  tier_name TEXT NOT NULL UNIQUE, -- e.g., 'i3', 'i5', 'i7', 'i9', 'Ryzen 3', 'Ryzen 5', 'M1', 'M2'
  tier_level INTEGER NOT NULL, -- 1-10 scale for ordering
  multiplier DECIMAL(4, 2) NOT NULL DEFAULT 1.0, -- e.g., 1.0, 1.2, 1.5, 2.0
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- RAM Tier Pricing (Multipliers based on RAM size)
CREATE TABLE IF NOT EXISTS ram_tier_pricing (
  id TEXT PRIMARY KEY DEFAULT 'ram_' || substring(gen_random_uuid()::text from 1 for 8),
  ram_size_gb INTEGER NOT NULL UNIQUE, -- e.g., 4, 8, 16, 32, 64
  multiplier DECIMAL(4, 2) NOT NULL DEFAULT 1.0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Storage Tier Pricing (Multipliers based on storage type and capacity)
CREATE TABLE IF NOT EXISTS storage_tier_pricing (
  id TEXT PRIMARY KEY DEFAULT 'stg_' || substring(gen_random_uuid()::text from 1 for 8),
  storage_type TEXT NOT NULL CHECK (storage_type IN ('hdd', 'ssd', 'nvme')),
  storage_size_gb INTEGER NOT NULL, -- e.g., 128, 256, 512, 1024, 2048
  multiplier DECIMAL(4, 2) NOT NULL DEFAULT 1.0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  UNIQUE(storage_type, storage_size_gb)
);

-- Condition/Grade Multipliers
CREATE TABLE IF NOT EXISTS grade_pricing (
  id TEXT PRIMARY KEY DEFAULT 'grd_' || substring(gen_random_uuid()::text from 1 for 8),
  grade TEXT NOT NULL UNIQUE CHECK (grade IN ('A+', 'A', 'B', 'C', 'D', 'F')),
  condition_name TEXT NOT NULL, -- 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor', 'Failed'
  multiplier DECIMAL(4, 2) NOT NULL DEFAULT 1.0, -- 1.0, 0.85, 0.70, 0.50, 0.30, 0.10
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Depreciation Rules (Age-based depreciation)
CREATE TABLE IF NOT EXISTS depreciation_rules (
  id TEXT PRIMARY KEY DEFAULT 'dep_' || substring(gen_random_uuid()::text from 1 for 8),
  min_age_months INTEGER NOT NULL, -- 0, 12, 24, 36, 48, 60
  max_age_months INTEGER, -- NULL for no upper limit
  depreciation_rate DECIMAL(4, 2) NOT NULL DEFAULT 0, -- Percentage to reduce (0.05 = 5%, 0.10 = 10%)
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  UNIQUE(min_age_months, max_age_months)
);

-- Redemption Rates (Credit to Product conversion rates)
CREATE TABLE IF NOT EXISTS redemption_rates (
  id TEXT PRIMARY KEY DEFAULT 'rdm_' || substring(gen_random_uuid()::text from 1 for 8),
  redemption_type TEXT NOT NULL UNIQUE, -- 'cash', 'asus', 'comprint'
  display_name TEXT NOT NULL,
  rate DECIMAL(4, 2) NOT NULL DEFAULT 1.0, -- 1.0 = 1:1, 1.1 = 10% bonus
  description TEXT,
  min_amount DECIMAL(10, 2), -- Minimum redemption amount
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Brand Adjustments (Optional: Some brands may have premium/discount)
CREATE TABLE IF NOT EXISTS brand_adjustments (
  id TEXT PRIMARY KEY DEFAULT 'brd_' || substring(gen_random_uuid()::text from 1 for 8),
  brand_name TEXT NOT NULL UNIQUE, -- 'Apple', 'Dell', 'HP', 'Lenovo', etc.
  adjustment_multiplier DECIMAL(4, 2) NOT NULL DEFAULT 1.0, -- 1.2 for premium, 0.9 for budget
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_device_type_pricing_active ON device_type_pricing(is_active);
CREATE INDEX IF NOT EXISTS idx_cpu_tier_pricing_active ON cpu_tier_pricing(is_active, tier_level);
CREATE INDEX IF NOT EXISTS idx_ram_tier_pricing_active ON ram_tier_pricing(is_active);
CREATE INDEX IF NOT EXISTS idx_storage_tier_pricing_active ON storage_tier_pricing(is_active, storage_type);
CREATE INDEX IF NOT EXISTS idx_grade_pricing_active ON grade_pricing(is_active);
CREATE INDEX IF NOT EXISTS idx_depreciation_rules_active ON depreciation_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_redemption_rates_active ON redemption_rates(is_active);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_device_type_pricing_updated_at BEFORE UPDATE ON device_type_pricing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cpu_tier_pricing_updated_at BEFORE UPDATE ON cpu_tier_pricing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ram_tier_pricing_updated_at BEFORE UPDATE ON ram_tier_pricing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_storage_tier_pricing_updated_at BEFORE UPDATE ON storage_tier_pricing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grade_pricing_updated_at BEFORE UPDATE ON grade_pricing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_depreciation_rules_updated_at BEFORE UPDATE ON depreciation_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_redemption_rates_updated_at BEFORE UPDATE ON redemption_rates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brand_adjustments_updated_at BEFORE UPDATE ON brand_adjustments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Device Types
INSERT INTO device_type_pricing (id, device_type, display_name, base_price) VALUES
  ('dtp_laptop', 'laptop', 'Laptop', 25000),
  ('dtp_desktop', 'desktop', 'Desktop', 20000),
  ('dtp_tablet', 'tablet', 'Tablet', 15000),
  ('dtp_phone', 'phone', 'Phone', 12000),
  ('dtp_monitor', 'monitor', 'Monitor', 8000),
  ('dtp_other', 'other', 'Other', 5000)
ON CONFLICT (device_type) DO NOTHING;

-- CPU Tiers
INSERT INTO cpu_tier_pricing (id, tier_name, tier_level, multiplier, description) VALUES
  ('cpu_celeron', 'Celeron/Atom', 1, 0.60, 'Entry-level Intel processors'),
  ('cpu_i3', 'Core i3', 2, 0.80, 'Intel Core i3 processors'),
  ('cpu_ryzen3', 'Ryzen 3', 2, 0.80, 'AMD Ryzen 3 processors'),
  ('cpu_i5', 'Core i5', 3, 1.00, 'Intel Core i5 processors'),
  ('cpu_ryzen5', 'Ryzen 5', 3, 1.00, 'AMD Ryzen 5 processors'),
  ('cpu_i7', 'Core i7', 4, 1.30, 'Intel Core i7 processors'),
  ('cpu_ryzen7', 'Ryzen 7', 4, 1.30, 'AMD Ryzen 7 processors'),
  ('cpu_i9', 'Core i9', 5, 1.60, 'Intel Core i9 processors'),
  ('cpu_ryzen9', 'Ryzen 9', 5, 1.60, 'AMD Ryzen 9 processors'),
  ('cpu_m1', 'Apple M1', 4, 1.40, 'Apple M1 chip'),
  ('cpu_m2', 'Apple M2', 5, 1.60, 'Apple M2 chip'),
  ('cpu_m3', 'Apple M3', 6, 1.80, 'Apple M3 chip')
ON CONFLICT (tier_name) DO NOTHING;

-- RAM Tiers
INSERT INTO ram_tier_pricing (id, ram_size_gb, multiplier) VALUES
  ('ram_4', 4, 0.70),
  ('ram_8', 8, 1.00),
  ('ram_16', 16, 1.25),
  ('ram_32', 32, 1.50),
  ('ram_64', 64, 1.80)
ON CONFLICT (ram_size_gb) DO NOTHING;

-- Storage Tiers
INSERT INTO storage_tier_pricing (id, storage_type, storage_size_gb, multiplier) VALUES
  -- HDD
  ('stg_hdd_256', 'hdd', 256, 0.60),
  ('stg_hdd_500', 'hdd', 500, 0.70),
  ('stg_hdd_1000', 'hdd', 1024, 0.80),
  ('stg_hdd_2000', 'hdd', 2048, 0.90),
  -- SSD
  ('stg_ssd_128', 'ssd', 128, 0.80),
  ('stg_ssd_256', 'ssd', 256, 1.00),
  ('stg_ssd_512', 'ssd', 512, 1.15),
  ('stg_ssd_1000', 'ssd', 1024, 1.30),
  -- NVMe
  ('stg_nvme_256', 'nvme', 256, 1.10),
  ('stg_nvme_512', 'nvme', 512, 1.25),
  ('stg_nvme_1000', 'nvme', 1024, 1.45),
  ('stg_nvme_2000', 'nvme', 2048, 1.65)
ON CONFLICT (storage_type, storage_size_gb) DO NOTHING;

-- Grade Pricing
INSERT INTO grade_pricing (id, grade, condition_name, multiplier, description) VALUES
  ('grd_aplus', 'A+', 'Excellent', 1.00, 'Like new, no signs of wear'),
  ('grd_a', 'A', 'Very Good', 0.85, 'Minor cosmetic wear'),
  ('grd_b', 'B', 'Good', 0.70, 'Moderate wear, fully functional'),
  ('grd_c', 'C', 'Fair', 0.50, 'Significant wear, functional'),
  ('grd_d', 'D', 'Poor', 0.30, 'Heavy wear, parts only'),
  ('grd_f', 'F', 'Failed', 0.10, 'Non-functional or damaged')
ON CONFLICT (grade) DO NOTHING;

-- Depreciation Rules
INSERT INTO depreciation_rules (id, min_age_months, max_age_months, depreciation_rate, description) VALUES
  ('dep_0_12', 0, 12, 0.00, 'Less than 1 year - no depreciation'),
  ('dep_12_24', 12, 24, 0.10, '1-2 years - 10% depreciation'),
  ('dep_24_36', 24, 36, 0.20, '2-3 years - 20% depreciation'),
  ('dep_36_48', 36, 48, 0.30, '3-4 years - 30% depreciation'),
  ('dep_48_60', 48, 60, 0.40, '4-5 years - 40% depreciation'),
  ('dep_60_plus', 60, NULL, 0.50, '5+ years - 50% depreciation')
ON CONFLICT (min_age_months, max_age_months) DO NOTHING;

-- Redemption Rates
INSERT INTO redemption_rates (id, redemption_type, display_name, rate, description, min_amount) VALUES
  ('rdm_cash', 'cash', 'Cash Withdrawal', 1.00, 'Direct bank transfer at 1:1 rate', 1000),
  ('rdm_asus', 'asus', 'ASUS Products', 1.10, '10% bonus when redeeming for ASUS products', 5000),
  ('rdm_comprint', 'comprint', 'Comprint Products', 1.05, '5% bonus when redeeming for Comprint products', 2500)
ON CONFLICT (redemption_type) DO NOTHING;

-- Brand Adjustments
INSERT INTO brand_adjustments (id, brand_name, adjustment_multiplier) VALUES
  ('brd_apple', 'Apple', 1.25),
  ('brd_dell', 'Dell', 1.00),
  ('brd_hp', 'HP', 1.00),
  ('brd_lenovo', 'Lenovo', 1.00),
  ('brd_asus', 'ASUS', 0.95),
  ('brd_acer', 'Acer', 0.90),
  ('brd_samsung', 'Samsung', 1.10),
  ('brd_microsoft', 'Microsoft', 1.15),
  ('brd_other', 'Other', 0.85)
ON CONFLICT (brand_name) DO NOTHING;

-- Disable RLS for development (matches pattern in 004_disable_rls_for_dev.sql)
ALTER TABLE device_type_pricing DISABLE ROW LEVEL SECURITY;
ALTER TABLE cpu_tier_pricing DISABLE ROW LEVEL SECURITY;
ALTER TABLE ram_tier_pricing DISABLE ROW LEVEL SECURITY;
ALTER TABLE storage_tier_pricing DISABLE ROW LEVEL SECURITY;
ALTER TABLE grade_pricing DISABLE ROW LEVEL SECURITY;
ALTER TABLE depreciation_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE redemption_rates DISABLE ROW LEVEL SECURITY;
ALTER TABLE brand_adjustments DISABLE ROW LEVEL SECURITY;

SELECT 'Pricing configuration tables created successfully' as status;
