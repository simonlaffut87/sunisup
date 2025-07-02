/*
  # Create energy data tracking table

  1. New Tables
    - `energy_data`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `timestamp` (timestamptz)
      - `consumption` (numeric) - in kWh
      - `shared_energy` (numeric) - in kWh
      - `production` (numeric) - in kWh (optional, for producers)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `energy_data` table
    - Add policies for users to access only their own data
*/

CREATE TABLE energy_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL,
  consumption numeric NOT NULL DEFAULT 0,
  shared_energy numeric NOT NULL DEFAULT 0,
  production numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE energy_data ENABLE ROW LEVEL SECURITY;

-- Users can only access their own energy data
CREATE POLICY "Users can read own energy data"
  ON energy_data
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own energy data"
  ON energy_data
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own energy data"
  ON energy_data
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_energy_data_user_timestamp ON energy_data(user_id, timestamp DESC);