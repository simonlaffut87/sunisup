/*
  # Add purchase rate column for producers

  1. New Columns
    - `purchase_rate` (numeric) - Tarif de rachat pour les producteurs en €/MWh
  
  2. Changes
    - Add purchase_rate column to participants table
    - Set default value to 70 €/MWh for all participants
    - Add check constraint to ensure positive values
*/

-- Add purchase_rate column with default value
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'purchase_rate'
  ) THEN
    ALTER TABLE participants ADD COLUMN purchase_rate numeric DEFAULT 70;
  END IF;
END $$;

-- Add check constraint for positive values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'participants_purchase_rate_positive'
  ) THEN
    ALTER TABLE participants ADD CONSTRAINT participants_purchase_rate_positive CHECK (purchase_rate >= 0);
  END IF;
END $$;

-- Update existing participants to have the default value if null
UPDATE participants 
SET purchase_rate = 70 
WHERE purchase_rate IS NULL;