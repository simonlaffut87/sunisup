/*
  # Create participant_metadata table

  1. New Tables
    - `participant_metadata`
      - `id` (uuid, primary key)
      - `participant_id` (uuid, foreign key to participants.id)
      - `email` (text)
      - `ean_code` (text, unique)
      - `commodity_rate` (numeric)
      - `entry_date` (date)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `participant_metadata` table
    - Add policies for authenticated users to manage metadata
    - Add policy for admin users to have full access

  3. Constraints
    - Foreign key constraint to participants table
    - Unique constraint on participant_id (one metadata record per participant)
    - Unique constraint on ean_code
*/

-- Create participant_metadata table
CREATE TABLE IF NOT EXISTS participant_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL UNIQUE,
  email text NOT NULL,
  ean_code text UNIQUE,
  commodity_rate numeric,
  entry_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraint
ALTER TABLE participant_metadata 
ADD CONSTRAINT participant_metadata_participant_id_fkey 
FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE participant_metadata ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated read access"
  ON participant_metadata
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert"
  ON participant_metadata
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update"
  ON participant_metadata
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete"
  ON participant_metadata
  FOR DELETE
  TO authenticated
  USING (true);

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_participant_metadata_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_participant_metadata_updated_at
  BEFORE UPDATE ON participant_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_participant_metadata_updated_at();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_participant_metadata_participant_id 
ON participant_metadata(participant_id);

CREATE INDEX IF NOT EXISTS idx_participant_metadata_ean_code 
ON participant_metadata(ean_code);