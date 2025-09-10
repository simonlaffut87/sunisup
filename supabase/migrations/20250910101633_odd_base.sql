/*
  # Fix anonymous access to participants table

  1. Security Changes
    - Drop conflicting anonymous policies
    - Add clear policy for anonymous EAN validation
    - Ensure anonymous users can read participants for registration validation

  2. Changes
    - Remove duplicate/conflicting anonymous policies
    - Add single clear policy for anonymous SELECT access
    - Maintain existing authenticated user policies
*/

-- Drop existing conflicting anonymous policies
DROP POLICY IF EXISTS "Allow anonymous EAN validation" ON participants;
DROP POLICY IF EXISTS "Allow anonymous read for EAN validation" ON participants;

-- Create a single clear policy for anonymous access to validate EAN codes
CREATE POLICY "Anonymous can read participants for EAN validation"
  ON participants
  FOR SELECT
  TO anon
  USING (true);