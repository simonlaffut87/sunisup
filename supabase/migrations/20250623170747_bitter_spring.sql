/*
  # Fix admin access to energy data

  1. Changes
    - Add admin policy to allow access to all energy data for admin user
    - Create function to check if user is admin
    - Update RLS policies to allow admin access

  2. Security
    - Admin (info@sunisup.be) can access all energy data
    - Regular users can only access their own data
    - Maintain existing security for non-admin users
*/

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT email = 'info@sunisup.be' 
    FROM auth.users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own energy data" ON energy_data;
DROP POLICY IF EXISTS "Users can insert own energy data" ON energy_data;
DROP POLICY IF EXISTS "Users can update own energy data" ON energy_data;

-- Create new policies with admin access
CREATE POLICY "Users can read energy data"
  ON energy_data
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR is_admin()
  );

CREATE POLICY "Users can insert energy data"
  ON energy_data
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id OR is_admin()
  );

CREATE POLICY "Users can update energy data"
  ON energy_data
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR is_admin()
  )
  WITH CHECK (
    auth.uid() = user_id OR is_admin()
  );

CREATE POLICY "Admin can delete energy data"
  ON energy_data
  FOR DELETE
  TO authenticated
  USING (is_admin());