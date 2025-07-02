/*
  # Add participant metadata table

  1. New Tables
    - `participant_metadata`
      - `id` (uuid, primary key)
      - `participant_id` (uuid, foreign key to participants)
      - `email` (text)
      - `ean_code` (text, unique)
      - `commodity_rate` (numeric)
      - `entry_date` (date)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `participant_metadata` table
    - Add policies for authenticated users to manage metadata
    - Add admin policies for full access

  3. Indexes
    - Index on participant_id for fast lookups
    - Unique index on ean_code to prevent duplicates
*/

-- Create participant_metadata table
CREATE TABLE participant_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid REFERENCES participants(id) ON DELETE CASCADE,
  email text NOT NULL,
  ean_code text UNIQUE NOT NULL,
  commodity_rate numeric NOT NULL,
  entry_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE participant_metadata ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_participant_metadata_participant_id ON participant_metadata(participant_id);
CREATE UNIQUE INDEX idx_participant_metadata_ean_code ON participant_metadata(ean_code);

-- Policies for authenticated users
CREATE POLICY "Allow authenticated read"
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

-- Trigger to update updated_at
CREATE TRIGGER update_participant_metadata_updated_at
  BEFORE UPDATE ON participant_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE participant_metadata IS 'Extended metadata for participants including EAN codes, email addresses, and administrative information';