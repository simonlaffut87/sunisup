/*
  # Update RLS policies for participants table

  1. Security Changes
    - Remove all existing policies
    - Admin (info@sunisup.be) has full access (SELECT, INSERT, UPDATE, DELETE)
    - Anonymous users have no access
    - Authenticated users can only SELECT their own data (matching email)

  2. Policy Details
    - Admin full access: All operations for info@sunisup.be
    - User read own data: Authenticated users can only read records where email matches their JWT email
    - No anonymous access
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Admin full access" ON participants;
DROP POLICY IF EXISTS "Allow anonymous read access" ON participants;
DROP POLICY IF EXISTS "Allow authenticated delete" ON participants;
DROP POLICY IF EXISTS "Allow authenticated insert" ON participants;
DROP POLICY IF EXISTS "Allow authenticated update" ON participants;
DROP POLICY IF EXISTS "Users can access own participant data" ON participants;

-- Admin policy: Full access for info@sunisup.be
CREATE POLICY "Admin full access"
  ON participants
  FOR ALL
  TO authenticated
  USING ((jwt() ->> 'email'::text) = 'info@sunisup.be'::text)
  WITH CHECK ((jwt() ->> 'email'::text) = 'info@sunisup.be'::text);

-- Authenticated users can only read their own data
CREATE POLICY "Users can read own data"
  ON participants
  FOR SELECT
  TO authenticated
  USING ((email = (jwt() ->> 'email'::text)) OR ((jwt() ->> 'email'::text) = 'info@sunisup.be'::text));

-- No policies for anonymous users (they have no access)
-- No policies for INSERT/UPDATE/DELETE for regular users (only admin can do these operations)