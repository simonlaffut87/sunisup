/*
  # Allow anonymous access to participants table for EAN validation

  1. Security
    - Add policy to allow anonymous users to read from participants table
    - This is required for EAN code validation during user registration
    - Only SELECT operations are allowed for anonymous users
    - Maintains existing security for other operations
*/

-- Create policy to allow anonymous users to read participants table
-- This is necessary for EAN code validation during registration
CREATE POLICY "Allow anonymous read for EAN validation"
  ON participants
  FOR SELECT
  TO anon
  USING (true);