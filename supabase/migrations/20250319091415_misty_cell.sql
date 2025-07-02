/*
  # Create participants management tables

  1. New Tables
    - `participants`
      - `id` (uuid, primary key)
      - `name` (text)
      - `address` (text)
      - `type` (text) - either 'producer' or 'consumer'
      - `peak_power` (numeric) - in kWp, for producers
      - `annual_production` (numeric) - in kWh, for producers
      - `annual_consumption` (numeric) - in kWh
      - `lat` (numeric)
      - `lng` (numeric)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `participants` table
    - Add policies for authenticated users to manage participants
*/

CREATE TABLE participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  type text NOT NULL CHECK (type IN ('producer', 'consumer')),
  peak_power numeric DEFAULT 0,
  annual_production numeric DEFAULT 0,
  annual_consumption numeric DEFAULT 0,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone
CREATE POLICY "Allow public read access"
  ON participants
  FOR SELECT
  TO public
  USING (true);

-- Allow full access to authenticated users
CREATE POLICY "Allow authenticated users full access"
  ON participants
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update the updated_at column
CREATE TRIGGER update_participants_updated_at
  BEFORE UPDATE ON participants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();