/*
  # Configure authentication settings for password reset

  1. Configuration
    - Set up proper redirect URLs for password reset
    - Configure email templates
    - Set authentication flow settings

  2. Security
    - Ensure proper token validation
    - Set appropriate session timeouts

  3. Email Configuration
    - Configure password reset email template
    - Set proper redirect URLs
*/

-- Configure authentication settings
-- Note: These settings are typically configured in the Supabase dashboard
-- This migration serves as documentation of required settings

-- Create a function to check EAN exists and is available for linking
CREATE OR REPLACE FUNCTION check_ean_exists(p_ean text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  participant_record participants%ROWTYPE;
  result json;
BEGIN
  -- Check if EAN exists
  SELECT * INTO participant_record
  FROM participants
  WHERE ean_code = p_ean;
  
  IF NOT FOUND THEN
    -- EAN doesn't exist
    result := json_build_object(
      'exists', false,
      'link_available', false,
      'participant_id', null,
      'name', null
    );
  ELSE
    -- EAN exists, check if email is already linked
    IF participant_record.email IS NULL OR participant_record.email = '' THEN
      -- Available for linking
      result := json_build_object(
        'exists', true,
        'link_available', true,
        'participant_id', participant_record.id,
        'name', participant_record.name
      );
    ELSE
      -- Already linked
      result := json_build_object(
        'exists', true,
        'link_available', false,
        'participant_id', participant_record.id,
        'name', participant_record.name
      );
    END IF;
  END IF;
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_ean_exists(text) TO anon;
GRANT EXECUTE ON FUNCTION check_ean_exists(text) TO authenticated;

-- Create a trigger function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function can be used to handle post-registration logic
  -- Currently just logs the new user creation
  RAISE LOG 'New user created: %', NEW.email;
  RETURN NEW;
END;
$$;

-- Note: The following settings need to be configured in the Supabase dashboard:
-- 
-- Authentication > URL Configuration:
-- - Site URL: http://localhost:5173 (development) / https://sunisup.be (production)
-- - Redirect URLs: 
--   * http://localhost:5173/reset-password
--   * https://sunisup.be/reset-password
--
-- Authentication > Email Templates:
-- - Use the custom template in supabase/templates/reset_password.html
-- - Subject: "Réinitialisation de votre mot de passe - Sun Is Up"
--
-- Authentication > Settings:
-- - Enable email confirmations: false (unless specifically needed)
-- - JWT expiry: 3600 (1 hour)
-- - Refresh token rotation: enabled
-- - Session timeout: 604800 (1 week)

COMMENT ON FUNCTION check_ean_exists IS 'Checks if an EAN code exists and is available for account linking';
COMMENT ON FUNCTION handle_new_user IS 'Handles post-registration logic for new users';