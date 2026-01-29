-- Make created_by nullable in batches table
-- This allows creating batches before IT Admin users are added

-- Drop the NOT NULL constraint
ALTER TABLE batches
ALTER COLUMN created_by DROP NOT NULL;

-- Verify the change
SELECT
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_name = 'batches'
  AND column_name = 'created_by';

SELECT 'created_by is now nullable' as status;
