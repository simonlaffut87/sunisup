/*
  # Create users table and related functions

  1. New Tables
    - `users` - Stores user profiles linked to auth.users
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `name` (text)
      - `member_type` (enum: admin, producer, consumer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `users` table
    - Add policies for users to manage their own profiles
    - Add policies for admin access
  
  3. Functions
    - Create update_updated_at_column() function
    - Create handle_new_user() function for auto-creating profiles
*/

-- Create enum for member types (with proper error handling)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_member_type') THEN
    CREATE TYPE public.user_member_type AS ENUM ('admin', 'producer', 'consumer');
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END$$;

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  name text,
  member_type public.user_member_type DEFAULT 'consumer',
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$
BEGIN
  -- Users can read own profile
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can read own profile') THEN
    CREATE POLICY "Users can read own profile" ON public.users
      FOR SELECT USING (auth.uid() = id);
  END IF;

  -- Users can insert own profile
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can insert own profile') THEN
    CREATE POLICY "Users can insert own profile" ON public.users
      FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;

  -- Users can update own profile
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can update own profile') THEN
    CREATE POLICY "Users can update own profile" ON public.users
      FOR UPDATE USING (auth.uid() = id);
  END IF;

  -- Users can delete own profile
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can delete own profile') THEN
    CREATE POLICY "Users can delete own profile" ON public.users
      FOR DELETE USING (auth.uid() = id);
  END IF;

  -- Admin can read all users
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Admin can read all users') THEN
    CREATE POLICY "Admin can read all users" ON public.users
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM auth.users 
          WHERE auth.users.id = auth.uid() 
          AND auth.users.email = 'info@sunisup.be'
        )
      );
  END IF;

  -- Admin can insert users
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Admin can insert users') THEN
    CREATE POLICY "Admin can insert users" ON public.users
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM auth.users 
          WHERE auth.users.id = auth.uid() 
          AND auth.users.email = 'info@sunisup.be'
        )
      );
  END IF;

  -- Admin can update all users
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Admin can update all users') THEN
    CREATE POLICY "Admin can update all users" ON public.users
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM auth.users 
          WHERE auth.users.id = auth.uid() 
          AND auth.users.email = 'info@sunisup.be'
        )
      );
  END IF;

  -- Admin can delete users
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Admin can delete users') THEN
    CREATE POLICY "Admin can delete users" ON public.users
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM auth.users 
          WHERE auth.users.id = auth.uid() 
          AND auth.users.email = 'info@sunisup.be'
        )
      );
  END IF;
END$$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to insert the new user
  BEGIN
    INSERT INTO public.users (id, email, name, member_type)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', ''),
      COALESCE((NEW.raw_user_meta_data->>'member_type')::public.user_member_type, 'consumer')
    );
  EXCEPTION
    -- Handle unique constraint violations gracefully
    WHEN unique_violation THEN
      RAISE NOTICE 'User with ID % or email % already exists', NEW.id, NEW.email;
  END;
  RETURN NEW;
END;
$$ language 'plpgsql' security definer;

-- Create trigger to automatically create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_member_type ON public.users(member_type);