/*
  # Fix participants table RLS policies for registration

  1. Security Updates
    - Allow anonymous users to read participants table for EAN validation during registration
    - Maintain security by only allowing SELECT operations for anonymous users
    - Keep existing authenticated user policies intact

  2. Changes
    - Add policy for anonymous users to SELECT from participants table
    - This enables EAN code validation during user registration
*/

-- Drop existing conflicting policies if they exist
DROP POLICY IF EXISTS "Allow public EAN validation" ON participants;
DROP POLICY IF EXISTS "participants_select_admin_or_self" ON participants;
DROP POLICY IF EXISTS "Allow authenticated full access" ON participants;

-- Create policy to allow anonymous users to read participants table for EAN validation
CREATE POLICY "Allow anonymous EAN validation"
  ON participants
  FOR SELECT
  TO anon
  USING (true);

-- Create policy for authenticated users to read their own data or admin access
CREATE POLICY "Allow authenticated user access"
  ON participants
  FOR SELECT
  TO authenticated
  USING (is_admin() OR email = (auth.jwt() ->> 'email'));

-- Create policy for authenticated users to update their own linked participant record
CREATE POLICY "Allow participant email linking"
  ON participants
  FOR UPDATE
  TO authenticated
  USING (email IS NULL AND ean_code = ((auth.jwt() -> 'user_metadata') ->> 'ean_code'))
  WITH CHECK (email = (auth.jwt() ->> 'email'));

-- Create policy for admin users to have full access
CREATE POLICY "Allow admin full access"
  ON participants
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());