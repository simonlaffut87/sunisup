/*
  # Fix RLS permissions for participants table

  1. Security Updates
    - Drop existing restrictive policies
    - Add policy to allow anonymous users to read participants data
    - Keep authenticated user policies for write operations

  This allows the homepage to display participant data without requiring authentication.
*/

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "participants_allow_anonymous_read" ON participants;
DROP POLICY IF EXISTS "participants_allow_authenticated_read" ON participants;

-- Allow anonymous users to read all participants data
CREATE POLICY "participants_allow_anonymous_read"
  ON participants
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Keep existing authenticated policies for write operations
-- (These should already exist but we'll ensure they're correct)
DROP POLICY IF EXISTS "participants_allow_authenticated_insert" ON participants;
DROP POLICY IF EXISTS "participants_allow_authenticated_update" ON participants;
DROP POLICY IF EXISTS "participants_allow_authenticated_delete" ON participants;

CREATE POLICY "participants_allow_authenticated_insert"
  ON participants
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "participants_allow_authenticated_update"
  ON participants
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "participants_allow_authenticated_delete"
  ON participants
  FOR DELETE
  TO authenticated
  USING (true);