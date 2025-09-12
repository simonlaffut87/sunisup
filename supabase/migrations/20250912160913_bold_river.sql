/*
  # Fix RLS permissions for admin access

  1. Security Updates
    - Add admin policy for participants table
    - Ensure admin can read/write all participant data
    - Fix RLS policies for authenticated users

  2. Admin Access
    - Grant full access to info@sunisup.be
    - Allow authenticated users to access their own participant data
*/

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Admin full access" ON participants;
DROP POLICY IF EXISTS "Users can access own participant data" ON participants;

-- Create admin policy for full access
CREATE POLICY "Admin full access"
  ON participants
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'info@sunisup.be'
  )
  WITH CHECK (
    auth.jwt() ->> 'email' = 'info@sunisup.be'
  );

-- Create policy for users to access their own participant data
CREATE POLICY "Users can access own participant data"
  ON participants
  FOR SELECT
  TO authenticated
  USING (
    email = auth.jwt() ->> 'email'
    OR auth.jwt() ->> 'email' = 'info@sunisup.be'
  );

-- Update existing policies to be less restrictive for authenticated users
DROP POLICY IF EXISTS "Allow authenticated insert" ON participants;
DROP POLICY IF EXISTS "Allow authenticated update" ON participants;
DROP POLICY IF EXISTS "Allow authenticated delete" ON participants;

CREATE POLICY "Allow authenticated insert"
  ON participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'email' = 'info@sunisup.be'
  );

CREATE POLICY "Allow authenticated update"
  ON participants
  FOR UPDATE
  TO authenticated
  USING (
    email = auth.jwt() ->> 'email'
    OR auth.jwt() ->> 'email' = 'info@sunisup.be'
  )
  WITH CHECK (
    email = auth.jwt() ->> 'email'
    OR auth.jwt() ->> 'email' = 'info@sunisup.be'
  );

CREATE POLICY "Allow authenticated delete"
  ON participants
  FOR DELETE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'info@sunisup.be'
  );