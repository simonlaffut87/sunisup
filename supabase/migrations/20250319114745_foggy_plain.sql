/*
  # Fix RLS policies for participants table

  1. Changes
    - Drop existing policies
    - Create new, more specific policies for each operation
    - Ensure authenticated users have proper access

  2. Security
    - Public users can only read
    - Authenticated users can perform all operations
    - Each operation has its own policy for better control
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access" ON participants;
DROP POLICY IF EXISTS "Allow authenticated users full access" ON participants;

-- Create specific policies for each operation
-- Allow public read access
CREATE POLICY "Allow public read access"
  ON participants
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Allow authenticated insert"
  ON participants
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update
CREATE POLICY "Allow authenticated update"
  ON participants
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete
CREATE POLICY "Allow authenticated delete"
  ON participants
  FOR DELETE
  TO authenticated
  USING (true);