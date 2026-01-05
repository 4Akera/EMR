-- Add discharge note column to encounters table

-- Add dischargeNote column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'encounters' 
    AND column_name = 'dischargeNote'
  ) THEN
    ALTER TABLE encounters ADD COLUMN "dischargeNote" TEXT;
  END IF;
END $$;

-- Add dischargeAt timestamp column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'encounters' 
    AND column_name = 'dischargeAt'
  ) THEN
    ALTER TABLE encounters ADD COLUMN "dischargeAt" TIMESTAMPTZ;
  END IF;
END $$;

-- Verify columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'encounters' 
AND column_name IN ('dischargeNote', 'dischargeAt')
ORDER BY column_name;

