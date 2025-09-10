/*
  # Fix anonymous access to participants table

  1. Security Changes
    - Drop conflicting policies that may be blocking anonymous access
    - Create a clear policy allowing anonymous users to read participants
    - Ensure RLS is properly enabled

  This migration resolves the "permission denied for table participants" error
  by ensuring anonymous users can read the participants table for the homepage display.
*/

-- Ensure RLS is enabled
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- Drop existing conflicting policies that might be blocking access
DROP POLICY IF EXISTS "Allow anonymous read participants" ON participants;
DROP POLICY IF EXISTS "participants_select_anon" ON participants;

-- Create a clear policy for anonymous read access
CREATE POLICY "participants_anonymous_read" 
ON participants 
FOR SELECT 
TO anon 
USING (true);

-- Also ensure authenticated users can read
DROP POLICY IF EXISTS "Allow authenticated read participants" ON participants;
CREATE POLICY "participants_authenticated_read" 
ON participants 
FOR SELECT 
TO authenticated 
USING (true);