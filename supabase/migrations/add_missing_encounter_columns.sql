-- Add missing columns to encounters table
-- These columns were added to the schema but not migrated to existing databases

-- Add physicalExam column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'encounters' 
    AND column_name = 'physicalExam'
  ) THEN
    ALTER TABLE encounters ADD COLUMN "physicalExam" TEXT;
  END IF;
END $$;

-- Add investigations column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'encounters' 
    AND column_name = 'investigations'
  ) THEN
    ALTER TABLE encounters ADD COLUMN investigations TEXT;
  END IF;
END $$;

-- Verify columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'encounters' 
AND column_name IN ('cc', 'hpi', 'ros', 'physicalExam', 'investigations', 'summary')
ORDER BY column_name;

