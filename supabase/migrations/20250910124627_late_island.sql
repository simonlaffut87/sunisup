/*
  # Fix anonymous access to participants table

  1. Security Changes
    - Ensure RLS is enabled on participants table
    - Drop any conflicting policies
    - Create clear policy for anonymous SELECT access
    - Maintain existing authenticated user policies

  2. Changes
    - Enable RLS on participants table
    - Add policy for anonymous users to read participants table
    - This is needed for EAN validation during registration and homepage display
*/

-- Ensure RLS is enabled on participants table
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anonymous can read participants for EAN validation" ON participants;
DROP POLICY IF EXISTS "Allow anonymous EAN validation" ON participants;
DROP POLICY IF EXISTS "Allow anonymous read for EAN validation" ON participants;
DROP POLICY IF EXISTS "Allow authenticated user access" ON participants;
DROP POLICY IF EXISTS "Allow participant email linking" ON participants;
DROP POLICY IF EXISTS "Allow admin full access" ON participants;
DROP POLICY IF EXISTS "Allow authenticated read" ON participants;
DROP POLICY IF EXISTS "Allow authenticated insert" ON participants;
DROP POLICY IF EXISTS "Allow authenticated update" ON participants;
DROP POLICY IF EXISTS "Allow authenticated delete" ON participants;
DROP POLICY IF EXISTS "Allow public read access" ON participants;

-- Create policy for anonymous users to read participants table
CREATE POLICY "Allow anonymous read participants"
  ON participants
  FOR SELECT
  TO anon
  USING (true);

-- Create policy for authenticated users to read participants
CREATE POLICY "Allow authenticated read participants"
  ON participants
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy for authenticated users to insert participants
CREATE POLICY "Allow authenticated insert participants"
  ON participants
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policy for authenticated users to update participants
CREATE POLICY "Allow authenticated update participants"
  ON participants
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policy for authenticated users to delete participants
CREATE POLICY "Allow authenticated delete participants"
  ON participants
  FOR DELETE
  TO authenticated
  USING (true);