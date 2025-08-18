/*
  # Add monthly data column to participants table

  1. Changes
    - Add `monthly_data` JSONB column to store monthly energy data
    - Each month will be stored as: { "2025-04": { volume_partage: 123.45, volume_complementaire: 67.89, injection_partagee: 45.67, injection_residuelle: 23.45, updated_at: "2025-04-15T10:30:00Z" } }

  2. Security
    - No changes to existing RLS policies
*/

-- Add monthly_data column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'monthly_data'
  ) THEN
    ALTER TABLE participants ADD COLUMN monthly_data JSONB DEFAULT '{}';
  END IF;
END $$;

-- Add index for better performance on monthly data queries
CREATE INDEX IF NOT EXISTS idx_participants_monthly_data 
ON participants USING GIN (monthly_data);