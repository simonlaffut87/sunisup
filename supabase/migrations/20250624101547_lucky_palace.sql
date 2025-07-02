/*
  # Add users table for member profiles

  1. New Tables
    - `users`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text)
      - `name` (text)
      - `member_type` (text) - either 'consumer' or 'producer'
      - `address` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `users` table
    - Add policies for users to manage their own profile
    - Add admin policies for full access

  3. Functions
    - Create trigger to auto-create user profile on auth signup
    - Update function for updated_at timestamp
*/

-- Create users table
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  member_type text NOT NULL DEFAULT 'consumer' CHECK (member_type IN ('consumer', 'producer')),
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read and update their own profile
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin can access all profiles
CREATE POLICY "Admin can read all profiles"
  ON users
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admin can update all profiles"
  ON users
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admin can insert profiles"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Trigger to update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, member_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    COALESCE(NEW.raw_user_meta_data->>'member_type', 'consumer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Insert existing users into the users table
INSERT INTO users (id, email, name, member_type)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', raw_user_meta_data->>'full_name', email),
  CASE 
    WHEN email = 'jean.dupont@example.com' THEN 'consumer'
    WHEN email = 'marie.martin@example.com' THEN 'consumer'
    WHEN email = 'pierre.durand@example.com' THEN 'producer'
    ELSE 'consumer'
  END as member_type
FROM auth.users
ON CONFLICT (id) DO NOTHING;