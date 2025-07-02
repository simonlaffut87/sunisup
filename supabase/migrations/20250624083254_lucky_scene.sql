/*
  # Create test users with energy data

  1. New Users
    - Three test users with different consumption profiles
    - 2976 energy data points for each user (quarter-hourly data)

  2. Security
    - Uses secure password hashing
    - Creates realistic consumption patterns
*/

-- Function to create or update users with password
CREATE OR REPLACE FUNCTION upsert_test_user_with_password(email text, password text, user_name text)
RETURNS uuid AS $$
DECLARE
  user_id uuid;
  existing_user_id uuid;
BEGIN
  -- Check if user already exists
  SELECT id INTO existing_user_id FROM auth.users WHERE auth.users.email = upsert_test_user_with_password.email;
  
  IF existing_user_id IS NOT NULL THEN
    -- Update existing user
    UPDATE auth.users 
    SET 
      encrypted_password = crypt(password, gen_salt('bf')),
      updated_at = NOW(),
      raw_user_meta_data = jsonb_build_object('name', user_name)
    WHERE id = existing_user_id;
    
    RETURN existing_user_id;
  ELSE
    -- Create new user
    user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      user_id,
      'authenticated',
      'authenticated',
      email,
      crypt(password, gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider": "email", "providers": ["email"]}',
      jsonb_build_object('name', user_name),
      false,
      '',
      '',
      '',
      ''
    );
    
    RETURN user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create test users and generate energy data
DO $$
DECLARE
  user1_id uuid;
  user2_id uuid;
  user3_id uuid;
  current_date_iter date;
  current_timestamp_iter timestamp;
  hour_iter integer;
  quarter_iter integer;
  base_consumption numeric;
  consumption_value numeric;
  shared_energy_value numeric;
  timestamp_value timestamptz;
  random_factor numeric;
  day_of_week integer;
  is_weekend boolean;
  is_business_hours boolean;
BEGIN
  -- Create test users
  user1_id := upsert_test_user_with_password('jean.dupont@example.com', 'password123', 'Jean Dupont');
  user2_id := upsert_test_user_with_password('marie.martin@example.com', 'password123', 'Marie Martin');
  user3_id := upsert_test_user_with_password('pierre.durand@example.com', 'password123', 'Pierre Durand');
  
  -- Delete existing energy data for these users
  DELETE FROM energy_data WHERE user_id IN (user1_id, user2_id, user3_id);
  
  -- Generate energy data for the last 31 days (quarter-hourly = 96 points per day * 31 days = 2976 points)
  current_date_iter := CURRENT_DATE - INTERVAL '31 days';
  
  WHILE current_date_iter <= CURRENT_DATE LOOP
    -- Get day of week (1-7, where 1 is Monday)
    day_of_week := EXTRACT(DOW FROM current_date_iter);
    is_weekend := day_of_week = 0 OR day_of_week = 6; -- Sunday or Saturday
    
    -- For each day, generate 96 points (24 hours * 4 quarters)
    hour_iter := 0;
    WHILE hour_iter < 24 LOOP
      is_business_hours := hour_iter BETWEEN 8 AND 18;
      
      quarter_iter := 0;
      WHILE quarter_iter < 4 LOOP
        timestamp_value := current_date_iter + (hour_iter || ' hours')::interval + (quarter_iter * 15 || ' minutes')::interval;
        
        -- Random factor for natural variation
        random_factor := 0.8 + random() * 0.4; -- Between 0.8 and 1.2
        
        -- USER 1: Jean Dupont - Residential profile
        -- Higher consumption in mornings and evenings, lower during day, very low at night
        IF hour_iter BETWEEN 6 AND 9 THEN -- Morning peak
          base_consumption := 0.8 * random_factor;
        ELSIF hour_iter BETWEEN 17 AND 22 THEN -- Evening peak
          base_consumption := 1.2 * random_factor;
        ELSIF hour_iter BETWEEN 10 AND 16 THEN -- Day
          base_consumption := 0.4 * random_factor;
        ELSE -- Night
          base_consumption := 0.2 * random_factor;
        END IF;
        
        -- Weekend adjustment
        IF is_weekend THEN
          base_consumption := base_consumption * 1.3; -- More consumption on weekends
        END IF;
        
        consumption_value := base_consumption;
        shared_energy_value := consumption_value * (0.25 + random() * 0.15); -- 25-40% shared
        
        INSERT INTO energy_data (user_id, timestamp, consumption, shared_energy)
        VALUES (user1_id, timestamp_value, consumption_value, shared_energy_value);
        
        -- USER 2: Marie Martin - Office profile
        -- Higher consumption during business hours, very low at night and weekends
        IF is_weekend THEN
          base_consumption := 0.2 * random_factor; -- Very low on weekends
        ELSIF is_business_hours THEN
          base_consumption := 1.5 * random_factor; -- High during business hours
        ELSIF hour_iter BETWEEN 6 AND 8 OR hour_iter BETWEEN 18 AND 20 THEN -- Transition periods
          base_consumption := 0.7 * random_factor;
        ELSE -- Night
          base_consumption := 0.1 * random_factor;
        END IF;
        
        consumption_value := base_consumption;
        shared_energy_value := consumption_value * (0.35 + random() * 0.15); -- 35-50% shared
        
        INSERT INTO energy_data (user_id, timestamp, consumption, shared_energy)
        VALUES (user2_id, timestamp_value, consumption_value, shared_energy_value);
        
        -- USER 3: Pierre Durand - Café/Restaurant profile
        -- Multiple peaks during meal times, moderate otherwise during opening hours
        IF hour_iter BETWEEN 7 AND 10 THEN -- Breakfast
          base_consumption := 1.2 * random_factor;
        ELSIF hour_iter BETWEEN 11 AND 14 THEN -- Lunch
          base_consumption := 1.8 * random_factor;
        ELSIF hour_iter BETWEEN 18 AND 22 THEN -- Dinner
          base_consumption := 1.6 * random_factor;
        ELSIF hour_iter BETWEEN 6 AND 23 THEN -- Open hours
          base_consumption := 0.8 * random_factor;
        ELSE -- Closed (night)
          base_consumption := 0.3 * random_factor; -- Base equipment still running
        END IF;
        
        -- Weekend adjustment - busier on weekends
        IF is_weekend THEN
          base_consumption := base_consumption * 1.4;
        END IF;
        
        consumption_value := base_consumption;
        shared_energy_value := consumption_value * (0.30 + random() * 0.20); -- 30-50% shared
        
        INSERT INTO energy_data (user_id, timestamp, consumption, shared_energy)
        VALUES (user3_id, timestamp_value, consumption_value, shared_energy_value);
        
        quarter_iter := quarter_iter + 1;
      END LOOP;
      
      hour_iter := hour_iter + 1;
    END LOOP;
    
    current_date_iter := current_date_iter + INTERVAL '1 day';
  END LOOP;
  
  RAISE NOTICE 'Created test users:';
  RAISE NOTICE '- Jean Dupont (jean.dupont@example.com / password123) - Residential profile';
  RAISE NOTICE '- Marie Martin (marie.martin@example.com / password123) - Office profile';
  RAISE NOTICE '- Pierre Durand (pierre.durand@example.com / password123) - Café/Restaurant profile';
  RAISE NOTICE 'Generated 2976 energy data points for each user (quarter-hourly data for 31 days)';
END $$;

-- Clean up
DROP FUNCTION upsert_test_user_with_password(text, text, text);