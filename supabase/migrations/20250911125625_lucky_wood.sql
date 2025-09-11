/*
  # Add missing columns to participants table

  1. New Columns
    - `annual_consumption` (numeric) - Annual energy consumption in kWh
    - `annual_production` (numeric) - Annual energy production in kWh  
    - `peak_power` (numeric) - Peak power capacity in kW
    - `lat` (numeric) - Latitude coordinate
    - `lng` (numeric) - Longitude coordinate

  2. Security
    - Columns are nullable to maintain compatibility with existing data
    - No additional RLS policies needed as they inherit from table policies
*/

-- Add missing columns to participants table
DO $$
BEGIN
  -- Add annual_consumption column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'annual_consumption'
  ) THEN
    ALTER TABLE participants ADD COLUMN annual_consumption numeric;
  END IF;

  -- Add annual_production column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'annual_production'
  ) THEN
    ALTER TABLE participants ADD COLUMN annual_production numeric;
  END IF;

  -- Add peak_power column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'peak_power'
  ) THEN
    ALTER TABLE participants ADD COLUMN peak_power numeric;
  END IF;

  -- Add lat column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'lat'
  ) THEN
    ALTER TABLE participants ADD COLUMN lat numeric;
  END IF;

  -- Add lng column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'lng'
  ) THEN
    ALTER TABLE participants ADD COLUMN lng numeric;
  END IF;
END $$;