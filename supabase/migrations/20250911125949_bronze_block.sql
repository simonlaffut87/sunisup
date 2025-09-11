/*
  # Fix RLS policies for participants table

  1. Security Changes
    - Drop all existing policies to start fresh
    - Enable RLS on participants table
    - Create new policies for proper access control
    - Allow anonymous users to read participant data
    - Allow authenticated users full CRUD access

  2. Policies Created
    - "Allow anonymous read access" - SELECT for anon and authenticated roles
    - "Allow authenticated insert" - INSERT for authenticated role
    - "Allow authenticated update" - UPDATE for authenticated role  
    - "Allow authenticated delete" - DELETE for authenticated role
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Allow read access to all users" ON participants;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON participants;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON participants;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON participants;
DROP POLICY IF EXISTS "Enable read access for all users" ON participants;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON participants;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON participants;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON participants;

-- Ensure RLS is enabled
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- Create new policies with proper permissions
CREATE POLICY "Allow anonymous read access"
  ON participants
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert"
  ON participants
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update"
  ON participants
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete"
  ON participants
  FOR DELETE
  TO authenticated
  USING (true);