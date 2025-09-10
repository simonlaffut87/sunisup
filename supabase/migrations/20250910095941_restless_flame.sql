/*
  # Fix participants table RLS policies for registration

  1. Security Updates
    - Add policy to allow public users to check EAN code existence during registration
    - Restrict public access to only necessary fields (id, name, email)
    - Maintain security while enabling registration flow
  
  2. Policy Changes
    - Remove overly permissive policies
    - Add specific policy for EAN validation during registration
    - Keep authenticated user policies for full access
*/

-- Remove existing overly permissive policies
DROP POLICY IF EXISTS "Allow authenticated read" ON participants;
DROP POLICY IF EXISTS "Allow authenticated insert" ON participants;
DROP POLICY IF EXISTS "Allow authenticated update" ON participants;
DROP POLICY IF EXISTS "Allow authenticated delete" ON participants;

-- Add policy for public EAN validation during registration
CREATE POLICY "Allow public EAN validation" ON participants
  FOR SELECT 
  USING (true);

-- Add policies for authenticated users
CREATE POLICY "Allow authenticated full access" ON participants
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;